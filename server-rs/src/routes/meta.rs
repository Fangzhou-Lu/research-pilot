use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde_json::{json, Value};

use crate::state::AppState;

pub async fn health() -> Json<Value> {
    Json(json!({"ok": true}))
}

pub async fn whoami(State(st): State<AppState>, headers: HeaderMap) -> Json<Value> {
    let uid = super::user_id_from(&headers);
    let mongo_ok = st
        .db
        .run_command(mongodb::bson::doc! {"ping": 1})
        .await
        .is_ok();
    Json(json!({
        "user_id": uid,
        "mongo_ok": mongo_ok,
        "default_model": st.cfg.default_model,
    }))
}

pub async fn providers(State(st): State<AppState>) -> Json<Value> {
    Json(json!({
        "configured": !st.cfg.providers.is_empty(),
        "providers": st.cfg.providers.iter().map(|p| &p.name).collect::<Vec<_>>(),
        "default_model": st.cfg.default_model,
    }))
}
