use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ClickBody {
    pub article_id: String,
    pub from: String,
}

pub async fn record(
    State(st): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ClickBody>,
) -> AppResult<Json<Value>> {
    if body.article_id.is_empty() {
        return Err(AppError::Bad("missing article_id".into()));
    }
    let uid = super::user_id_from(&headers);
    let from = body.from.chars().take(64).collect::<String>();
    repo::insert_click(&st.db, &uid, &body.article_id, &from).await?;
    Ok(Json(json!({"ok": true})))
}
