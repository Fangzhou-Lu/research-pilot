use axum::extract::{Query, State};
use axum::Json;
use chrono::{Duration, Utc};
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use serde::Deserialize;

use crate::arxiv;
use crate::error::{AppError, AppResult};
use crate::models::{Article, CategoryCount, DayCount, Paginated};
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default = "default_cat")]
    pub cat: String,
    #[serde(default = "one")]
    pub page: u64,
    #[serde(default = "twenty")]
    pub page_size: u64,
    #[serde(default)]
    pub date: Option<String>,
}

fn default_cat() -> String {
    "cs.AI".into()
}
fn one() -> u64 {
    1
}
fn twenty() -> u64 {
    20
}

pub async fn list(
    State(st): State<AppState>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Paginated<Article>>> {
    let p = arxiv::list_by_category(
        &st.http,
        &q.cat,
        q.page.max(1),
        q.page_size.clamp(1, 50),
        q.date.as_deref(),
    )
    .await?;
    let db = st.db.clone();
    let items = p.items.clone();
    tokio::spawn(async move {
        let _ = repo::put_cached_articles_many(&db, &items).await;
    });
    Ok(Json(p))
}

#[derive(Debug, Deserialize)]
pub struct OneQuery {
    pub id: String,
}

pub async fn get_one(
    State(st): State<AppState>,
    Query(q): Query<OneQuery>,
) -> AppResult<Json<Article>> {
    if q.id.is_empty() {
        return Err(AppError::Bad("missing id".into()));
    }
    if let Some(a) = repo::get_cached_article(&st.db, &q.id).await? {
        return Ok(Json(a));
    }
    match arxiv::get_by_id(&st.http, &q.id).await {
        Ok(Some(a)) => {
            repo::put_cached_article(&st.db, &a).await.ok();
            Ok(Json(a))
        }
        Ok(None) => Err(AppError::NotFound),
        Err(e) => {
            // arXiv unreachable / rate-limited — fall back to a bookmarked copy
            // (any user who has bookmarked this article preserves enough to
            // render the detail page).
            if let Some(a) = repo::get_bookmarked_article_any(&st.db, &q.id).await? {
                return Ok(Json(a));
            }
            Err(e)
        }
    }
}

// ─── GET /api/v1/categories/counts ───────────────────────────────────────────

/// The 10 canonical categories with human-readable labels.
const CATEGORIES: &[(&str, &str)] = &[
    ("cs.AI",   "Artificial Intelligence"),
    ("cs.LG",   "Machine Learning"),
    ("cs.CL",   "Computation & Language"),
    ("cs.CV",   "Computer Vision"),
    ("cs.RO",   "Robotics"),
    ("cs.NE",   "Neural & Evolutionary Computing"),
    ("cs.IR",   "Information Retrieval"),
    ("stat.ML", "Statistics - ML"),
    ("cs.CR",   "Cryptography & Security"),
    ("cs.DC",   "Distributed Computing"),
];

#[derive(Debug, Deserialize)]
pub struct CountsQuery {
    #[serde(default = "three")]
    pub days: u32,
}

fn three() -> u32 { 3 }

/// GET /api/v1/categories/counts?days=3
/// Returns per-category paper counts bucketed by date for the last N days.
pub async fn category_counts(
    State(st): State<AppState>,
    Query(q): Query<CountsQuery>,
) -> AppResult<Json<Vec<CategoryCount>>> {
    let days = q.days.clamp(1, 30) as i64;
    let now = Utc::now();

    // Build the date strings we want (YYYY-MM-DD, descending)
    let dates: Vec<String> = (0..days)
        .map(|i| {
            let d = now - Duration::days(i);
            d.format("%Y-%m-%d").to_string()
        })
        .collect();

    // Aggregate articles_cache grouped by (primary_category, published[0..10])
    // Only look back `days` days.
    let earliest = (now - Duration::days(days)).format("%Y-%m-%d").to_string();

    let pipeline = vec![
        doc! {
            "$match": {
                "published": { "$gte": earliest }
            }
        },
        doc! {
            "$group": {
                "_id": {
                    "cat": "$primary_category",
                    "date": { "$substr": ["$published", 0, 10] }
                },
                "count": { "$sum": 1 }
            }
        },
    ];

    // Use a generic Document collection for the aggregation result
    use mongodb::bson::Document;
    let coll = st.db.collection::<Document>("articles_cache");
    let mut cursor = coll.aggregate(pipeline).await?;

    // Collect into map: cat -> date -> count
    let mut map: std::collections::HashMap<String, std::collections::HashMap<String, i64>> =
        std::collections::HashMap::new();

    while let Some(doc) = cursor.try_next().await? {
        let id_doc = match doc.get_document("_id") {
            Ok(d) => d,
            Err(_) => continue,
        };
        let cat = id_doc.get_str("cat").unwrap_or("").to_string();
        let date = id_doc.get_str("date").unwrap_or("").to_string();
        let count = doc
            .get_i32("count").map(i64::from)
            .or_else(|_| doc.get_i64("count"))
            .or_else(|_| doc.get_f64("count").map(|f| f as i64))
            .unwrap_or(0);
        if cat.is_empty() || date.is_empty() {
            continue;
        }
        map.entry(cat).or_default().insert(date, count);
    }

    let result: Vec<CategoryCount> = CATEGORIES
        .iter()
        .map(|(cat, label)| {
            let date_map = map.get(*cat);
            let counts: Vec<DayCount> = dates
                .iter()
                .map(|d| DayCount {
                    date: d.clone(),
                    count: date_map.and_then(|m| m.get(d)).copied().unwrap_or(0),
                })
                .collect();
            CategoryCount {
                cat: cat.to_string(),
                label: label.to_string(),
                counts,
            }
        })
        .collect();

    Ok(Json(result))
}
