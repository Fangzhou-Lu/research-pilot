// Multi-provider OpenAI-compatible aggregator. Iterate providers in order:
// owners (those that whitelist this model) first, then wildcard fallbacks.
// Falls through on any non-success response.

use crate::config::LlmProvider;
use bytes::Bytes;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMsg {
    pub role: String,
    pub content: String,
}

pub async fn complete(
    http: &reqwest::Client,
    providers: &[LlmProvider],
    model: &str,
    messages: &[ChatMsg],
    max_tokens: u32,
) -> anyhow::Result<String> {
    if providers.is_empty() {
        anyhow::bail!("no LLM provider configured");
    }
    let chosen = pick_providers(providers, model);
    let mut errors = Vec::new();
    for p in chosen {
        match try_complete(http, p, model, messages, max_tokens).await {
            Ok(s) => return Ok(s),
            Err(e) => errors.push(format!("{}: {}", p.name, e)),
        }
    }
    Err(anyhow::anyhow!(
        "all providers failed: {}",
        errors.join(" | ")
    ))
}

async fn try_complete(
    http: &reqwest::Client,
    p: &LlmProvider,
    model: &str,
    messages: &[ChatMsg],
    max_tokens: u32,
) -> anyhow::Result<String> {
    let url = format!("{}/chat/completions", p.base_url);
    let body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": false,
    });
    let res = http
        .post(&url)
        .bearer_auth(&p.api_key)
        .json(&body)
        .send()
        .await?;
    if !res.status().is_success() {
        let s = res.status();
        let text = res.text().await.unwrap_or_default();
        anyhow::bail!("{} {}", s, truncate(&text, 200));
    }
    let v: serde_json::Value = res.json().await?;
    let content = v
        .pointer("/choices/0/message/content")
        .and_then(|c| c.as_str())
        .unwrap_or("");
    Ok(content.to_string())
}

pub async fn stream_complete(
    http: reqwest::Client,
    providers: Vec<LlmProvider>,
    model: String,
    messages: Vec<ChatMsg>,
    max_tokens: u32,
    tx: mpsc::Sender<Result<String, String>>,
) {
    if providers.is_empty() {
        let _ = tx.send(Err("no LLM provider configured".into())).await;
        return;
    }
    let chosen: Vec<LlmProvider> = pick_providers(&providers, &model)
        .into_iter()
        .cloned()
        .collect();
    let mut errors = Vec::new();
    for p in &chosen {
        match try_stream(&http, p, &model, &messages, max_tokens, &tx).await {
            Ok(()) => return,
            Err(e) => errors.push(format!("{}: {}", p.name, e)),
        }
    }
    let _ = tx
        .send(Err(format!(
            "all providers failed: {}",
            errors.join(" | ")
        )))
        .await;
}

async fn try_stream(
    http: &reqwest::Client,
    p: &LlmProvider,
    model: &str,
    messages: &[ChatMsg],
    max_tokens: u32,
    tx: &mpsc::Sender<Result<String, String>>,
) -> anyhow::Result<()> {
    let url = format!("{}/chat/completions", p.base_url);
    let body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": true,
    });
    let res = http
        .post(&url)
        .bearer_auth(&p.api_key)
        .json(&body)
        .send()
        .await?;
    if !res.status().is_success() {
        let s = res.status();
        let text = res.text().await.unwrap_or_default();
        anyhow::bail!("{} {}", s, truncate(&text, 200));
    }
    let mut buf = String::new();
    let mut stream = res.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk: Bytes = chunk?;
        buf.push_str(std::str::from_utf8(&chunk).unwrap_or(""));
        loop {
            let line_end = match buf.find('\n') {
                Some(i) => i,
                None => break,
            };
            let line = buf[..line_end].trim_end_matches('\r').to_string();
            buf.replace_range(..line_end + 1, "");
            let line = line.trim();
            if !line.starts_with("data:") {
                continue;
            }
            let payload = line.trim_start_matches("data:").trim();
            if payload == "[DONE]" {
                return Ok(());
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) {
                // Reasoning models on opencode-go (DeepSeek/Qwen3) emit a long
                // chain-of-thought into `delta.reasoning_content` before the
                // final answer arrives in `delta.content`. We forward only
                // `delta.content` to keep the visible chat clean; the frontend
                // shows a "Thinking…" spinner while reasoning runs.
                if let Some(s) = v
                    .pointer("/choices/0/delta/content")
                    .and_then(|c| c.as_str())
                {
                    if !s.is_empty() && tx.send(Ok(s.to_string())).await.is_err() {
                        return Ok(()); // receiver gone
                    }
                }
            }
        }
    }
    Ok(())
}

fn pick_providers<'a>(providers: &'a [LlmProvider], model: &str) -> Vec<&'a LlmProvider> {
    let m = model.to_lowercase();
    let owners: Vec<&LlmProvider> = providers
        .iter()
        .filter(|p| p.models.iter().any(|x| x.to_lowercase() == m))
        .collect();
    let fallbacks: Vec<&LlmProvider> = providers.iter().filter(|p| p.models.is_empty()).collect();
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for p in owners.into_iter().chain(fallbacks.into_iter()) {
        if seen.insert(p.name.clone()) {
            out.push(p);
        }
    }
    out
}

fn truncate(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

// SUMMARY_HEADINGS_V2 — chatpaper-style fixed four-section template.
// Order is load-bearing: get_summary() invalidates cached docs whose first
// Sections are now paper-specific (chatpaper.com style) instead of fixed
// generic headings. Kept const around for any legacy callers; first heading
// is canonical-case for the V1 layout.
pub const SUMMARY_HEADINGS_V2: [&str; 4] = [
    "Introduction and Problem Statement",
    "Methodology and Framework Design",
    "Scaling Laws and Training Dynamics",
    "Downstream Transfer and Expressiveness Impact",
];

pub const SUMMARY_SYSTEM: &str = "You are a senior research analyst writing an in-depth AI summary of an arXiv paper, in the style of chatpaper.com.\n\
You receive a paper's title, authors, and abstract. Produce a DEEP, paper-specific summary as STRICT JSON:\n\
{ \"sections\": [ { \"heading\": \"...\", \"body_md\": \"...\" }, ... ] }\n\n\
Rules:\n\
- 4 to 6 sections, each one specific to THIS paper's content (NOT generic templates). Headings should name the actual topic discussed (e.g., 'Introduction and Overview of <Method>', 'Design Principles for <X>', 'Evaluation on <Benchmark>', 'Case Studies', 'Challenges and Systemic Impact', 'Conclusion and Future Directions').\n\
- Each body_md is 150-250 words (Chinese: 250-400 characters) of structured prose. Use clear, technical, paragraph-form writing. No bullet points, no numbered lists, no nested headings. Inline emphasis with **bold** for key terms is allowed.\n\
- Cover, in order: motivation/problem, core technique or framework, key design choices/insights, experiments or results, broader implications/limitations/future work.\n\
- Write in the requested LANGUAGE (English by default; Simplified Chinese if user requests 'zh' or 'Simplified Chinese'). Preserve original technical terms (e.g. 'Transformer', 'NeRF') untranslated when natural.\n\
- Be precise, faithful to the abstract; do NOT invent results, datasets, numbers, or claims that aren't in the abstract. When the abstract is silent on a topic, briefly note that and pivot to what the abstract DOES say.\n\
- Output STRICT JSON only — no markdown fences, no prose around the JSON object.";

pub const DEEP_QA_SYSTEM: &str = "You produce structured research-grade Q&A about an arXiv paper, in the chatpaper.com 'Core Points / Methods / Experiments' tab format.\n\
Given a paper's title and abstract, output STRICT JSON:\n\
{\n  \"core_points\":  { \"question\": \"...\", \"answer_md\": \"...\" },\n  \"methods\":      { \"question\": \"...\", \"answer_md\": \"...\" },\n  \"experiments\":  { \"question\": \"...\", \"answer_md\": \"...\" }\n}\n\n\
Question-text conventions (use these exact forms unless user requests another language):\n\
- core_points  → 'What problem does this paper address?'   (zh: '论文试图解决什么问题？')\n\
- methods      → 'What method does this paper propose?'    (zh: '论文提出的方法是什么？')\n\
- experiments  → 'How are the experiments designed?'       (zh: '实验设计是怎样的？')\n\n\
answer_md formatting:\n\
- 1-2 sentence intro paragraph that frames the answer (e.g. 'The paper addresses three interrelated problems...').\n\
- Then a nested markdown bullet list. Top-level bullets use **bold** sub-headings (e.g. '**The task addressed:**', '**Current difficulties:**', '**Research motivation:**'). Each sub-heading expands into 2-4 indented bullet items, one short concrete claim per bullet (≤25 words each).\n\
- Total length per answer_md: 200-350 words in English, 350-550 characters in Chinese.\n\
- Stay rigorously grounded in the abstract — never invent datasets, numbers, baselines, or claims not present.\n\
- Write in the requested LANGUAGE ('en' or 'zh' / Simplified Chinese). Keep technical terms (Transformer, RAG, etc.) untranslated when conventional.\n\
- Output STRICT JSON only — no fences, no prose around the JSON object.";

pub const CHAT_SYSTEM: &str = "You are a research assistant chatting about a single arXiv paper.\n\
Be precise, technical, and cite specifics from the abstract when you can.\n\
If the user asks about content beyond the abstract, say so plainly and offer to summarize what is known from the abstract.\n\
Respond in concise markdown.";

pub const TRANSLATE_SYSTEM: &str = "You translate academic-paper metadata. Output strict JSON only:\n\
{\"title\":\"...\",\"abstract\":\"...\"}\n\
Translate the given title and abstract into the requested language. Preserve technical terms accurately. No commentary.";
