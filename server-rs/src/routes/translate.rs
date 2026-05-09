use axum::extract::State;
use axum::Json;
use serde::Deserialize;
use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::llm::{self, ChatMsg};
use crate::models::Translation;
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct Body {
    pub article_id: String,
    pub language: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
}

pub async fn translate(
    State(st): State<AppState>,
    Json(body): Json<Body>,
) -> AppResult<Json<Translation>> {
    if body.article_id.is_empty()
        || body.language.is_empty()
        || body.title.is_empty()
        || body.abs.is_empty()
    {
        return Err(AppError::Bad("missing fields".into()));
    }

    if let Some(t) = repo::get_translation(&st.db, &body.article_id, &body.language).await? {
        return Ok(Json(t));
    }

    if st.cfg.providers.is_empty() {
        return Err(AppError::Bad("no LLM provider configured".into()));
    }

    let user_content = format!(
        "Target language: {}\n\nTitle: {}\n\nAbstract:\n{}",
        body.language, body.title, body.abs
    );
    let messages = vec![
        ChatMsg {
            role: "system".into(),
            content: llm::TRANSLATE_SYSTEM.into(),
        },
        ChatMsg {
            role: "user".into(),
            content: user_content,
        },
    ];

    let text = llm::complete(
        &st.http,
        &st.cfg.providers,
        &st.cfg.default_model,
        &messages,
        1500,
    )
    .await
    .map_err(|e| AppError::Upstream(e.to_string()))?;

    let parsed = parse_pair(&text).ok_or_else(|| AppError::Upstream("translation parse".into()))?;
    repo::put_translation(
        &st.db,
        &body.article_id,
        &body.language,
        &parsed.title,
        &parsed.abs,
    )
    .await
    .ok();
    Ok(Json(parsed))
}

fn parse_pair(text: &str) -> Option<Translation> {
    let stripped = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let v: Value = serde_json::from_str(stripped)
        .ok()
        .or_else(|| {
            let s = text;
            let start = s.find('{')?;
            let end = s.rfind('}')?;
            if end <= start {
                return None;
            }
            serde_json::from_str(&s[start..=end]).ok()
        })?;
    let title = v.get("title")?.as_str()?.to_string();
    let abs = v
        .get("abstract")
        .or_else(|| v.get("abs"))?
        .as_str()?
        .to_string();
    Some(Translation { title, abs })
}
