use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

use crate::arxiv;
use crate::error::AppResult;
use crate::models::{Article, Paginated};
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    #[serde(default)]
    pub q: String,
    #[serde(default = "one")]
    pub page: u64,
    #[serde(default = "twenty")]
    pub page_size: u64,
    #[serde(default)]
    pub r#type: Option<String>,
}

fn one() -> u64 {
    1
}
fn twenty() -> u64 {
    20
}

pub async fn search(
    State(st): State<AppState>,
    Query(q): Query<SearchQuery>,
) -> AppResult<Json<Paginated<Article>>> {
    let term = q.q.trim();
    if term.is_empty() {
        return Ok(Json(Paginated {
            total: 0,
            page: 1,
            size: q.page_size,
            items: vec![],
        }));
    }
    // For now arxiv backs all search types. The `type` parameter is preserved
    // and echoed by the frontend as a tab label; refining the corpus per-type
    // is out of scope for this revision.
    let p = arxiv::search(&st.http, term, q.page.max(1), q.page_size.clamp(1, 50)).await?;
    let db = st.db.clone();
    let items = p.items.clone();
    tokio::spawn(async move {
        let _ = repo::put_cached_articles_many(&db, &items).await;
    });
    Ok(Json(p))
}
