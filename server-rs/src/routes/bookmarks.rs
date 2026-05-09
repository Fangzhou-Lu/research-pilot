use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::models::Article;
use crate::repo;
use crate::state::AppState;

pub async fn list(
    State(st): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    let items = repo::list_bookmarks(&st.db, &uid).await?;
    Ok(Json(json!({"items": items})))
}

#[derive(Debug, Deserialize)]
pub struct CreateBody {
    pub article: Article,
}

pub async fn create(
    State(st): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateBody>,
) -> AppResult<Json<Value>> {
    if body.article.id.is_empty() {
        return Err(AppError::Bad("missing article".into()));
    }
    let uid = super::user_id_from(&headers);
    repo::add_bookmark(&st.db, &uid, &body.article).await?;
    Ok(Json(json!({"ok": true})))
}

#[derive(Debug, Deserialize)]
pub struct RemoveQuery {
    pub id: String,
}

pub async fn remove(
    State(st): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<RemoveQuery>,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    repo::remove_bookmark(&st.db, &uid, &q.id).await?;
    Ok(Json(json!({"ok": true})))
}

#[derive(Debug, Deserialize)]
pub struct CheckBody {
    pub ids: Vec<String>,
}

pub async fn check(
    State(st): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CheckBody>,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    let ids: Vec<String> = body.ids.into_iter().take(200).collect();
    let map = repo::bookmarks_for(&st.db, &uid, &ids).await?;
    Ok(Json(serde_json::to_value(map).unwrap_or(json!({}))))
}
