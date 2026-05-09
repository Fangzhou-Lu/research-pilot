use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::Response;
use axum::Json;
use bytes::Bytes;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::error::AppResult;
use crate::llm::{self, ChatMsg};
use crate::repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ChatBody {
    pub article: ArticleRef,
    pub messages: Vec<ClientMsg>,
}

#[derive(Debug, Deserialize)]
pub struct ArticleRef {
    pub id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ClientMsg {
    pub role: String,
    pub content: String,
}

pub async fn chat(
    State(st): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ChatBody>,
) -> Result<Response, (StatusCode, String)> {
    let uid = super::user_id_from(&headers);
    if body.article.id.is_empty() || body.messages.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing fields".into()));
    }
    if st.cfg.providers.is_empty() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "no LLM provider configured".into(),
        ));
    }

    // Persist the latest user turn before streaming.
    if let Some(last_user) = body
        .messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .cloned()
    {
        let db = st.db.clone();
        let aid = body.article.id.clone();
        let uid_c = uid.clone();
        tokio::spawn(async move {
            let _ = repo::append_chat_message(&db, &uid_c, &aid, "user", &last_user.content).await;
        });
    }

    let paper_context = format!(
        "You are discussing the paper:\n\nTitle: {}\nArxiv ID: {}\n\nAbstract:\n{}",
        body.article.title, body.article.id, body.article.abs
    );
    let mut prompt: Vec<ChatMsg> = vec![ChatMsg {
        role: "system".into(),
        content: format!("{}\n\n{}", llm::CHAT_SYSTEM, paper_context),
    }];
    for m in &body.messages {
        prompt.push(ChatMsg {
            role: m.role.clone(),
            content: m.content.clone(),
        });
    }

    let providers = st.cfg.providers.clone();
    let model = st.cfg.default_model.clone();
    let http = st.http.clone();

    // LLM task → llm_tx; forwarder task → out_tx (response body).
    let (llm_tx, mut llm_rx) = mpsc::channel::<Result<String, String>>(64);
    let (out_tx, out_rx) = mpsc::channel::<Result<Bytes, std::io::Error>>(64);

    tokio::spawn(async move {
        // 4096: reasoning models (deepseek-v4-flash, qwen3.6-plus) can spend
        // 1500–2000 tokens on chain-of-thought before emitting `delta.content`;
        // a smaller cap exhausts the budget mid-thought and the user sees a
        // blank reply.
        llm::stream_complete(http, providers, model, prompt, 4096, llm_tx).await;
    });

    {
        let db = st.db.clone();
        let aid = body.article.id.clone();
        let uid_c = uid.clone();
        tokio::spawn(async move {
            let mut buf = String::new();
            while let Some(item) = llm_rx.recv().await {
                match item {
                    Ok(s) => {
                        buf.push_str(&s);
                        if out_tx.send(Ok(Bytes::from(s))).await.is_err() {
                            return;
                        }
                    }
                    Err(e) => {
                        let msg = format!("\n\n_(error: {})_", e);
                        let _ = out_tx.send(Ok(Bytes::from(msg))).await;
                    }
                }
            }
            if !buf.trim().is_empty() {
                let _ = repo::append_chat_message(&db, &uid_c, &aid, "assistant", &buf).await;
            }
        });
    }

    let stream = ReceiverStream::new(out_rx);
    let resp = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from_stream(stream))
        .unwrap();
    Ok(resp)
}

// ─── chat history ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub article_id: String,
}

pub async fn history(
    State(st): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<HistoryQuery>,
) -> AppResult<Json<Value>> {
    let uid = super::user_id_from(&headers);
    if q.article_id.is_empty() {
        return Ok(Json(json!({"items": []})));
    }
    let items = repo::list_chat_messages(&st.db, &uid, &q.article_id, 200).await?;
    Ok(Json(json!({"items": items})))
}
