use axum::routing::{delete, get, post};
use axum::Router;

use crate::state::AppState;

pub mod articles;
pub mod bookmarks;
pub mod chat;
pub mod clicks;
pub mod interests;
pub mod meta;
pub mod search;
pub mod summarize;
pub mod translate;
pub mod venues;

pub const HEADER_USER: &str = "x-user-id";

pub fn router(st: AppState) -> Router {
    Router::new()
        .route("/api/v1/health", get(meta::health))
        .route("/api/v1/whoami", get(meta::whoami))
        .route("/api/v1/providers", get(meta::providers))
        .route("/api/v1/articles", get(articles::list))
        .route("/api/v1/article", get(articles::get_one))
        .route("/api/v1/search", get(search::search))
        .route("/api/v1/interests", get(interests::list).post(interests::create))
        .route("/api/v1/interests/:id", delete(interests::remove).put(interests::set_paused))
        .route(
            "/api/v1/interests/:id/recommendations",
            get(interests::recommendations),
        )
        .route("/api/v1/interests/:id/matches", get(interests::matches))
        .route(
            "/api/v1/bookmarks",
            get(bookmarks::list).post(bookmarks::create).delete(bookmarks::remove),
        )
        .route("/api/v1/bookmarks/check", post(bookmarks::check))
        .route("/api/v1/summarize", post(summarize::summarize))
        .route("/api/v1/deep-qa", post(summarize::deep_qa))
        .route("/api/v1/questions", post(summarize::questions))
        .route("/api/v1/translate", post(translate::translate))
        .route("/api/v1/chat", post(chat::chat))
        .route("/api/v1/chat-history", get(chat::history))
        .route("/api/v1/clicks", post(clicks::record))
        .route("/api/v1/categories/counts", get(articles::category_counts))
        .route("/api/v1/venues", get(venues::list_venues))
        .route("/api/v1/venues/:id/papers", get(venues::list_venue_papers))
        .route("/api/v1/venues/:id/import", post(venues::import_venue))
        .with_state(st)
}

/// Read the anonymous user id from the `X-User-Id` header. Falls back to
/// `"anon"` if missing — every legitimate client sets it via lib/user.ts.
pub fn user_id_from(headers: &axum::http::HeaderMap) -> String {
    let raw = headers
        .get(HEADER_USER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if raw.len() >= 8
        && raw.len() <= 64
        && raw
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | ':' | '.'))
    {
        raw.to_string()
    } else {
        "anon".to_string()
    }
}
