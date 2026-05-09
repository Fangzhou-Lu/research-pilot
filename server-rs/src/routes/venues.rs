use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Json;
use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

use crate::error::{AppError, AppResult};
use crate::models::{Article, ArticleDoc, Paginated, Venue, VenuePaperDoc};
use crate::state::AppState;

// ─── seed data ────────────────────────────────────────────────────────────────

fn seed_venues() -> Vec<Venue> {
    vec![
        Venue { id: "iclr-2026".into(), display: "ICLR 2026".into(), year: 2026, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: true },
        Venue { id: "iclr-2025".into(), display: "ICLR 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "iclr-2024".into(), display: "ICLR 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "icml-2025".into(), display: "ICML 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "icml-2024".into(), display: "ICML 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "neurips-2024".into(), display: "NeurIPS 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "neurips-2023".into(), display: "NeurIPS 2023".into(), year: 2023, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "aaai-2026".into(), display: "AAAI 2026".into(), year: 2026, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: true },
        Venue { id: "aaai-2025".into(), display: "AAAI 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "ijcai-2024".into(), display: "IJCAI 2024".into(), year: 2024, track: vec![], paper_count: 0, is_new: false },
        Venue { id: "acl-2025".into(), display: "ACL 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "acl-2024".into(), display: "ACL 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "emnlp-2024".into(), display: "EMNLP 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "emnlp-2023".into(), display: "EMNLP 2023".into(), year: 2023, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "cvpr-2025".into(), display: "CVPR 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "cvpr-2024".into(), display: "CVPR 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "acmmm-2024".into(), display: "ACM MM 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "eccv-2024".into(), display: "ECCV 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "www-2025".into(), display: "WWW 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "sigir-2025".into(), display: "SIGIR 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "sigir-2024".into(), display: "SIGIR 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "kdd-2025".into(), display: "KDD 2025".into(), year: 2025, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
        Venue { id: "kdd-2024".into(), display: "KDD 2024".into(), year: 2024, track: vec!["oral".into(), "poster".into()], paper_count: 0, is_new: false },
    ]
}

/// Map a venue id to the OpenReview invitation string.
/// Only ICLR, ICML, NeurIPS are wired in v1 (full OpenReview API coverage).
fn openreview_invitation(venue_id: &str) -> Option<&'static str> {
    match venue_id {
        "iclr-2026" => Some("ICLR.cc/2026/Conference/-/Submission"),
        "iclr-2025" => Some("ICLR.cc/2025/Conference/-/Submission"),
        "iclr-2024" => Some("ICLR.cc/2024/Conference/-/Submission"),
        "icml-2025" => Some("ICML.cc/2025/Conference/-/Submission"),
        "icml-2024" => Some("ICML.cc/2024/Conference/-/Submission"),
        "neurips-2024" => Some("NeurIPS.cc/2024/Conference/-/Submission"),
        "neurips-2023" => Some("NeurIPS.cc/2023/Conference/-/Submission"),
        _ => None,
    }
}

// ─── GET /api/v1/venues ───────────────────────────────────────────────────────

pub async fn list_venues(State(st): State<AppState>) -> AppResult<Json<Vec<Venue>>> {
    let vp_coll = st.db.collection::<VenuePaperDoc>("venue_papers");
    let mut venues = seed_venues();

    // Count venue_papers per venue_id via aggregation
    let pipeline = vec![
        doc! { "$group": { "_id": "$venue_id", "count": { "$sum": 1 } } },
    ];
    let mut cursor = vp_coll.aggregate(pipeline).await?;
    let mut counts: HashMap<String, i64> = HashMap::new();
    while let Some(doc) = cursor.try_next().await? {
        let vid = doc.get_str("_id").map(String::from).unwrap_or_default();
        // $sum:1 produces Int32 in BSON; fall through to i64/f64 for portability.
        let cnt = doc
            .get_i32("count").map(i64::from)
            .or_else(|_| doc.get_i64("count"))
            .or_else(|_| doc.get_f64("count").map(|f| f as i64))
            .unwrap_or(0);
        if !vid.is_empty() {
            counts.insert(vid, cnt);
        }
    }

    for v in &mut venues {
        if let Some(&c) = counts.get(&v.id) {
            v.paper_count = c;
        }
    }

    Ok(Json(venues))
}

// ─── GET /api/v1/venues/:id/papers ───────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PapersQuery {
    #[serde(default = "one")]
    pub page: u64,
    #[serde(default = "twenty")]
    pub page_size: u64,
    pub track: Option<String>,
}

fn one() -> u64 { 1 }
fn twenty() -> u64 { 20 }

pub async fn list_venue_papers(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Query(q): Query<PapersQuery>,
) -> AppResult<Json<Paginated<Article>>> {
    let page = q.page.max(1);
    let size = q.page_size.clamp(1, 50);
    let skip = (page - 1) * size;

    let vp_coll = st.db.collection::<VenuePaperDoc>("venue_papers");

    let mut filter = doc! { "venue_id": &id };
    if let Some(ref t) = q.track {
        let t_lower = t.to_lowercase();
        if t_lower == "oral" || t_lower == "poster" {
            filter.insert("track", t_lower);
        }
    }

    let total = vp_coll.count_documents(filter.clone()).await? as u64;

    if total == 0 {
        return Ok(Json(Paginated { total: 0, page, size, items: vec![] }));
    }

    let vp_docs: Vec<VenuePaperDoc> = vp_coll
        .find(filter)
        .skip(skip)
        .limit(size as i64)
        .await?
        .try_collect()
        .await?;

    let article_ids: Vec<String> = vp_docs.iter().map(|d| d.article_id.clone()).collect();

    let art_coll = st.db.collection::<ArticleDoc>("articles_cache");
    let art_docs: Vec<ArticleDoc> = art_coll
        .find(doc! { "article_id": { "$in": &article_ids } })
        .await?
        .try_collect()
        .await?;

    let art_map: HashMap<String, ArticleDoc> =
        art_docs.into_iter().map(|a| (a.article_id.clone(), a)).collect();

    let items: Vec<Article> = vp_docs
        .iter()
        .filter_map(|vp| art_map.get(&vp.article_id))
        .map(|d| Article {
            id: d.article_id.clone(),
            arxiv_id: d.arxiv_id.clone(),
            title: d.title.clone(),
            abs: d.abs.clone(),
            authors: d.authors.clone(),
            organizations: d.organizations.clone(),
            categories: d.categories.clone(),
            primary_category: d.primary_category.clone(),
            published: d.published.clone(),
            updated: d.updated.clone(),
            pdf_url: d.pdf_url.clone(),
            abs_url: d.abs_url.clone(),
        })
        .collect();

    Ok(Json(Paginated { total, page, size, items }))
}

// ─── POST /api/v1/venues/:id/import ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ImportQuery {
    pub token: Option<String>,
}

pub async fn import_venue(
    State(st): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Query(q): Query<ImportQuery>,
) -> AppResult<Json<Value>> {
    // Auth: accept token from query param or Authorization: Bearer header
    if !st.cfg.admin_token.is_empty() {
        let from_header = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .map(String::from);
        let provided = q.token.clone().or(from_header).unwrap_or_default();
        if provided != st.cfg.admin_token {
            return Err(AppError::Bad("unauthorized".into()));
        }
    }

    let Some(invitation) = openreview_invitation(&id) else {
        return Err(AppError::Bad(format!(
            "venue '{}' is not wired for OpenReview import in v1",
            id
        )));
    };

    let upserted = fetch_and_upsert(&st, &id, invitation).await?;

    Ok(Json(serde_json::json!({
        "venue_id": id,
        "upserted": upserted,
    })))
}

/// Fetch all OpenReview submissions (paginated 1000/page) and upsert into
/// `venue_papers` + `articles_cache`.
async fn fetch_and_upsert(st: &AppState, venue_id: &str, invitation: &str) -> AppResult<usize> {
    let vp_coll = st.db.collection::<VenuePaperDoc>("venue_papers");
    let art_coll = st.db.collection::<ArticleDoc>("articles_cache");

    let mut offset = 0usize;
    let limit = 1000usize;
    let mut total_upserted = 0usize;
    let now = Utc::now();

    loop {
        let url = format!(
            "https://api2.openreview.net/notes?invitation={}&limit={}&offset={}",
            urlencoding::encode(invitation),
            limit,
            offset
        );

        let resp: Value = st
            .http
            .get(&url)
            .send()
            .await?
            .json()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))?;

        let notes = resp
            .get("notes")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let fetched = notes.len();

        for note in &notes {
            let content = match note.get("content").and_then(|c| c.as_object()) {
                Some(c) => c,
                None => continue,
            };

            let openreview_id = note
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Extract title (OpenReview v2 nests value under {"value": "..."},
            // older API returns the string directly)
            let title = content
                .get("title")
                .and_then(|v| v.get("value").or(Some(v)))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if title.is_empty() {
                continue;
            }

            let abstract_text = content
                .get("abstract")
                .and_then(|v| v.get("value").or(Some(v)))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let authors: Vec<String> = content
                .get("authors")
                .and_then(|v| v.get("value").or(Some(v)))
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|a| a.as_str())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default();

            let keywords: Vec<String> = content
                .get("keywords")
                .and_then(|v| v.get("value").or(Some(v)))
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|k| k.as_str())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default();

            let venue_str = content
                .get("venue")
                .and_then(|v| v.get("value").or(Some(v)))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();
            let track = if venue_str.contains("oral") { "oral" } else { "poster" };

            let article_id = format!("or:{}", openreview_id);
            let pdf_url = format!("https://openreview.net/pdf?id={}", openreview_id);
            let abs_url = format!("https://openreview.net/forum?id={}", openreview_id);

            let art_doc = ArticleDoc {
                article_id: article_id.clone(),
                arxiv_id: String::new(),
                title,
                abs: abstract_text,
                authors,
                organizations: vec![],
                categories: keywords,
                primary_category: String::new(),
                published: String::new(),
                updated: String::new(),
                pdf_url,
                abs_url,
                fetched_at: now,
            };
            let _ = art_coll
                .replace_one(doc! { "article_id": &article_id }, &art_doc)
                .upsert(true)
                .await;

            let vp_doc = VenuePaperDoc {
                venue_id: venue_id.to_string(),
                article_id: article_id.clone(),
                track: track.to_string(),
                openreview_id: Some(openreview_id),
            };
            let _ = vp_coll
                .replace_one(
                    doc! { "venue_id": venue_id, "article_id": &article_id },
                    &vp_doc,
                )
                .upsert(true)
                .await;

            total_upserted += 1;
        }

        offset += fetched;
        if fetched < limit {
            break;
        }

        // Respect OpenReview rate limit (~4 req/s)
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    Ok(total_upserted)
}
