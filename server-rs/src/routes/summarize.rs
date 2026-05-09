use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use chrono::Utc;
use mongodb::bson::doc;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::AppError;
use crate::llm::{self, ChatMsg};
use crate::models::{AISummary, SummarySection};
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct Body {
    pub article_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    #[serde(default)]
    pub authors: Vec<String>,
    #[serde(default)]
    pub language: Option<String>,
    /// Whether the caller is willing to pay for fresh LLM generation on a
    /// cache miss. The frontend sends `true` only when the paper is in the
    /// user's bookmarks; anonymous browsing always sends `false` so cold
    /// papers do not silently bill the LLM provider.
    #[serde(default)]
    pub generate: bool,
}

pub async fn summarize(
    State(st): State<AppState>,
    Json(body): Json<Body>,
) -> Result<Response, AppError> {
    if body.article_id.is_empty() || body.title.is_empty() || body.abs.is_empty() {
        return Err(AppError::Bad("missing fields".into()));
    }
    let language = body.language.clone().unwrap_or_else(|| "en".into());

    if let Some(sections) = repo::get_summary(&st.db, &body.article_id, &language).await? {
        return Ok(Json(AISummary {
            article_id: body.article_id,
            language,
            sections,
            generated_at: Utc::now().timestamp_millis(),
        })
        .into_response());
    }

    // Cache miss: only generate when the caller opts in (bookmarked papers).
    if !body.generate {
        return Ok(StatusCode::NO_CONTENT.into_response());
    }

    if st.cfg.providers.is_empty() {
        return Err(AppError::Bad("no LLM provider configured".into()));
    }

    let lang_label = if language.starts_with("zh") {
        "Simplified Chinese (Chinese)"
    } else {
        "English"
    };
    let user_content = format!(
        "Title: {}\nAuthors: {}\n\nAbstract:\n{}\n\nLanguage: {}",
        body.title,
        body.authors.join(", "),
        body.abs,
        lang_label,
    );
    let messages = vec![
        ChatMsg {
            role: "system".into(),
            content: llm::SUMMARY_SYSTEM.into(),
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
        6000,
    )
    .await
    .map_err(|e| AppError::Upstream(e.to_string()))?;

    let sections = parse_sections(&text)
        .ok_or_else(|| AppError::Upstream("model returned no parseable sections".into()))?;

    repo::put_summary(&st.db, &body.article_id, &language, &sections)
        .await
        .ok();

    Ok(Json(AISummary {
        article_id: body.article_id,
        language,
        sections,
        generated_at: Utc::now().timestamp_millis(),
    })
    .into_response())
}

// ─── deep Q&A (Core Points / Methods / Experiments) ─────────────────────────

#[derive(Debug, Deserialize)]
pub struct DeepQaBody {
    pub article_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    #[serde(default)]
    pub language: Option<String>,
    /// See `Body::generate`.
    #[serde(default)]
    pub generate: bool,
}

pub async fn deep_qa(
    State(st): State<AppState>,
    Json(body): Json<DeepQaBody>,
) -> Result<Response, AppError> {
    if body.article_id.is_empty() || body.title.is_empty() || body.abs.is_empty() {
        return Err(AppError::Bad("missing fields".into()));
    }
    let language = body.language.clone().unwrap_or_else(|| "en".into());

    let coll = st.db.collection::<mongodb::bson::Document>("deep_qa_cache");
    if let Ok(Some(d)) = coll
        .find_one(doc! {"article_id": &body.article_id, "language": &language})
        .await
    {
        if let Ok(payload) = d.get_document("payload") {
            return Ok(
                Json(serde_json::to_value(payload).unwrap_or(json!({}))).into_response(),
            );
        }
    }

    if !body.generate {
        return Ok(StatusCode::NO_CONTENT.into_response());
    }

    if st.cfg.providers.is_empty() {
        return Err(AppError::Bad("no LLM provider configured".into()));
    }

    let lang_label = if language.starts_with("zh") {
        "Simplified Chinese (Chinese)"
    } else {
        "English"
    };
    let prompt_user = format!(
        "Title: {}\n\nAbstract:\n{}\n\nLanguage: {}",
        body.title, body.abs, lang_label,
    );
    let messages = vec![
        ChatMsg {
            role: "system".into(),
            content: llm::DEEP_QA_SYSTEM.into(),
        },
        ChatMsg {
            role: "user".into(),
            content: prompt_user,
        },
    ];

    let text = llm::complete(
        &st.http,
        &st.cfg.providers,
        &st.cfg.default_model,
        &messages,
        6000,
    )
    .await
    .map_err(|e| AppError::Upstream(e.to_string()))?;

    let parsed = parse_deep_qa(&text)
        .ok_or_else(|| AppError::Upstream("model returned no parseable deep QA".into()))?;

    let bson_payload = mongodb::bson::to_document(&parsed).unwrap_or_default();
    let _ = coll
        .replace_one(
            doc! {"article_id": &body.article_id, "language": &language},
            doc! {
                "article_id": &body.article_id,
                "language": &language,
                "payload": bson_payload,
                "generated_at_ms": Utc::now().timestamp_millis(),
            },
        )
        .upsert(true)
        .await;

    Ok(Json(parsed).into_response())
}

fn parse_deep_qa(text: &str) -> Option<Value> {
    let stripped = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let v: Value = serde_json::from_str(stripped).ok().or_else(|| {
        let s = text;
        let start = s.find('{')?;
        let end = s.rfind('}')?;
        if end <= start {
            return None;
        }
        serde_json::from_str(&s[start..=end]).ok()
    })?;
    let core = v.get("core_points")?;
    let methods = v.get("methods")?;
    let experiments = v.get("experiments")?;
    Some(json!({
        "core_points": core,
        "methods": methods,
        "experiments": experiments,
    }))
}

// ─── recommended questions ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct QuestionsBody {
    pub article_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    #[serde(default)]
    pub language: Option<String>,
    /// See `Body::generate`.
    #[serde(default)]
    pub generate: bool,
}

const QUESTIONS_SYSTEM: &str =
    "You generate research-oriented suggested questions for a paper-chat UI.\n\
Given a paper's title and abstract, produce EXACTLY 5 specific, paper-grounded questions \
a researcher would actually ask. Questions must reference concrete elements from the abstract \
(methods, claims, datasets, scaling, limitations) — no generic prompts like \"summarize this\". \
Each question is one sentence, ends with '?', and is self-contained.\n\n\
Output STRICT JSON only:\n\
{ \"questions\": [\"q1\", \"q2\", \"q3\", \"q4\", \"q5\"] }";

pub async fn questions(
    State(st): State<AppState>,
    Json(body): Json<QuestionsBody>,
) -> Result<Response, AppError> {
    if body.article_id.is_empty() || body.title.is_empty() || body.abs.is_empty() {
        return Err(AppError::Bad("missing fields".into()));
    }
    let language = body.language.clone().unwrap_or_else(|| "en".into());

    // Cache hit?
    let coll = st.db.collection::<mongodb::bson::Document>("questions_cache");
    if let Ok(Some(d)) = coll
        .find_one(doc! {"article_id": &body.article_id, "language": &language})
        .await
    {
        if let Ok(arr) = d.get_array("questions") {
            let qs: Vec<String> = arr
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();
            if qs.len() >= 3 {
                return Ok(Json(json!({"items": qs})).into_response());
            }
        }
    }

    if !body.generate {
        return Ok(StatusCode::NO_CONTENT.into_response());
    }

    if st.cfg.providers.is_empty() {
        return Err(AppError::Bad("no LLM provider configured".into()));
    }

    let prompt_user = format!(
        "Title: {}\n\nAbstract:\n{}\n\nLanguage: {}",
        body.title,
        body.abs,
        if language == "zh" { "Simplified Chinese" } else { "English" }
    );
    let messages = vec![
        ChatMsg {
            role: "system".into(),
            content: QUESTIONS_SYSTEM.into(),
        },
        ChatMsg {
            role: "user".into(),
            content: prompt_user,
        },
    ];

    let text = llm::complete(
        &st.http,
        &st.cfg.providers,
        &st.cfg.default_model,
        &messages,
        4096,
    )
    .await
    .map_err(|e| AppError::Upstream(e.to_string()))?;

    let qs = parse_questions(&text)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| AppError::Upstream("model returned no parseable questions".into()))?;

    // Cache (best-effort)
    let _ = coll
        .replace_one(
            doc! {"article_id": &body.article_id, "language": &language},
            doc! {
                "article_id": &body.article_id,
                "language": &language,
                "questions": &qs,
                "generated_at_ms": Utc::now().timestamp_millis(),
            },
        )
        .upsert(true)
        .await;

    Ok(Json(json!({"items": qs})).into_response())
}

fn parse_questions(text: &str) -> Option<Vec<String>> {
    let stripped = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let v: Value = serde_json::from_str(stripped).ok().or_else(|| {
        let s = text;
        let start = s.find('{')?;
        let end = s.rfind('}')?;
        if end <= start {
            return None;
        }
        serde_json::from_str(&s[start..=end]).ok()
    })?;
    let arr = v.get("questions")?.as_array()?;
    let mut out = Vec::new();
    for item in arr {
        if let Some(s) = item.as_str() {
            let t = s.trim();
            if !t.is_empty() {
                out.push(t.to_string());
            }
        }
    }
    Some(out)
}

fn parse_sections(text: &str) -> Option<Vec<SummarySection>> {
    let stripped = text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let v: Value = serde_json::from_str(stripped)
        .ok()
        .or_else(|| {
            // Find first {…} balanced run
            let s = text;
            let start = s.find('{')?;
            let end = s.rfind('}')?;
            if end <= start {
                return None;
            }
            serde_json::from_str(&s[start..=end]).ok()
        })?;
    let arr = v.get("sections")?.as_array()?;
    let mut out = Vec::new();
    for item in arr {
        let h = item.get("heading")?.as_str()?.to_string();
        let b = item.get("body_md")?.as_str()?.to_string();
        out.push(SummarySection {
            heading: h,
            body_md: b,
        });
    }
    Some(out)
}
