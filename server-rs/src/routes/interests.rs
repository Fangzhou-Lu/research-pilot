use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::arxiv;
use crate::error::{AppError, AppResult};
use crate::models::{Article, Interest};
use crate::repo;
use crate::state::AppState;

pub async fn list(
    State(st): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    let items = repo::list_interests(&st.db, &uid).await?;
    Ok(Json(json!({"items": items})))
}

#[derive(Debug, Deserialize)]
pub struct CreateBody {
    pub text: String,
    #[serde(default)]
    pub r#type: Option<String>,
}

pub async fn create(
    State(st): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateBody>,
) -> AppResult<Json<Interest>> {
    let uid = super::user_id_from(&headers);
    let text = body.text.trim();
    if text.is_empty() {
        return Err(AppError::Bad("missing text".into()));
    }
    if text.len() > 500 {
        return Err(AppError::Bad("text too long".into()));
    }
    let typ = body.r#type.unwrap_or_else(|| "exploratory".into());
    let item = repo::add_interest(&st.db, &uid, text, &typ).await?;
    Ok(Json(item))
}

pub async fn remove(
    State(st): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    repo::remove_interest(&st.db, &uid, &id).await?;
    Ok(Json(json!({"ok": true})))
}

#[derive(Debug, Deserialize)]
pub struct PauseBody {
    pub paused: bool,
}

pub async fn set_paused(
    State(st): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<PauseBody>,
) -> AppResult<Json<Interest>> {
    let uid = super::user_id_from(&headers);
    let updated = repo::set_interest_paused(&st.db, &uid, &id, body.paused)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

#[derive(Debug, Deserialize)]
pub struct MatchesQuery {
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    3
}

pub async fn matches(
    State(st): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(q): Query<MatchesQuery>,
) -> AppResult<Json<Vec<Article>>> {
    let uid = super::user_id_from(&headers);
    let interest = repo::get_interest(&st.db, &uid, &id)
        .await?
        .ok_or(AppError::NotFound)?;

    // Tokenise the interest text: split on whitespace + punctuation, lowercase,
    // keep tokens ≥ 3 chars. Then filter articles_cache for docs whose title OR
    // abstract contains all tokens (case-insensitive).
    let tokens: Vec<String> = interest
        .text
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() >= 3)
        .map(|t| t.to_lowercase())
        .collect();

    let limit = q.limit.clamp(1, 20);
    let feed = arxiv::search(&st.http, &interest.text, 1, (limit * 5).max(30) as u64).await?;

    let matched: Vec<Article> = if tokens.is_empty() {
        feed.items.into_iter().take(limit).collect()
    } else {
        feed.items
            .into_iter()
            .filter(|a| {
                let haystack = format!("{} {}", a.title, a.abs).to_lowercase();
                tokens.iter().all(|t| haystack.contains(t.as_str()))
            })
            .take(limit)
            .collect()
    };

    Ok(Json(matched))
}

#[derive(Debug, Serialize)]
pub struct RecGroup {
    pub date: String,
    pub articles: Vec<Article>,
}

pub async fn recommendations(
    State(st): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    let interest = repo::get_interest(&st.db, &uid, &id)
        .await?
        .ok_or(AppError::NotFound)?;

    let feed = arxiv::search(&st.http, &interest.text, 1, 30).await?;
    let mut by_day: std::collections::BTreeMap<String, Vec<Article>> =
        std::collections::BTreeMap::new();
    for a in feed.items {
        let day = a.published.chars().take(10).collect::<String>();
        by_day.entry(day).or_default().push(a);
    }
    let mut groups: Vec<RecGroup> = by_day
        .into_iter()
        .map(|(date, articles)| RecGroup { date, articles })
        .collect();
    groups.sort_by(|a, b| b.date.cmp(&a.date));

    Ok(Json(json!({"interest": interest, "groups": groups})))
}
