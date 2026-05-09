// Wire types (returned to the frontend) and storage docs (Mongo collections).
// Wire types use `abstract` (renamed) so the JSON contract matches the
// JS-side `Article` type exactly. Storage docs mirror them with a couple of
// extra metadata fields.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ─── wire ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: String,
    pub arxiv_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    pub authors: Vec<String>,
    pub organizations: Vec<String>,
    pub categories: Vec<String>,
    pub primary_category: String,
    pub published: String,
    pub updated: String,
    pub pdf_url: String,
    pub abs_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paginated<T> {
    pub total: u64,
    pub page: u64,
    pub size: u64,
    pub items: Vec<T>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Interest {
    pub id: String,
    pub text: String,
    pub created_at: i64,
    #[serde(default)]
    pub paused: bool,
    #[serde(default)]
    pub last_match_at: Option<i64>,
    #[serde(default)]
    pub match_count_7d: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkOut {
    pub article_id: String,
    pub bookmarked_at: i64,
    pub arxiv_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    pub authors: Vec<String>,
    pub organizations: Vec<String>,
    pub primary_category: String,
    pub pdf_url: String,
    pub abs_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AISummary {
    pub article_id: String,
    pub language: String,
    pub sections: Vec<SummarySection>,
    pub generated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummarySection {
    pub heading: String,
    pub body_md: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Translation {
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessageOut {
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

// ─── venues ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Venue {
    pub id: String,        // e.g. "iclr-2026"
    pub display: String,   // e.g. "ICLR 2026"
    pub year: i32,
    pub track: Vec<String>, // ["oral", "poster"]
    pub paper_count: i64,
    pub is_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VenuePaperDoc {
    pub venue_id: String,
    pub article_id: String,   // references articles_cache.article_id
    pub track: String,        // "oral" / "poster"
    pub openreview_id: Option<String>,
}

// ─── category counts ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayCount {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub cat: String,
    pub label: String,
    pub counts: Vec<DayCount>,
}

// ─── clicks ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClickDoc {
    pub user_id: String,
    pub article_id: String,
    pub from: String,
    pub ts: DateTime<Utc>,
}

// ─── storage ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterestDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub user_id: String,
    pub text: String,
    pub interest_type: String,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub paused: bool,
    #[serde(default)]
    pub last_match_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub match_count_7d: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkDoc {
    pub user_id: String,
    pub article_id: String,
    pub arxiv_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    pub authors: Vec<String>,
    pub organizations: Vec<String>,
    pub primary_category: String,
    pub pdf_url: String,
    pub abs_url: String,
    pub bookmarked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleDoc {
    pub article_id: String,
    pub arxiv_id: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abs: String,
    pub authors: Vec<String>,
    pub organizations: Vec<String>,
    pub categories: Vec<String>,
    pub primary_category: String,
    pub published: String,
    pub updated: String,
    pub pdf_url: String,
    pub abs_url: String,
    pub fetched_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryDoc {
    pub article_id: String,
    pub language: String,
    pub sections: Vec<SummarySection>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationDoc {
    pub article_id: String,
    pub language: String,
    pub title_translated: String,
    pub abstract_translated: String,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatDoc {
    pub user_id: String,
    pub article_id: String,
    pub message_id: String,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}
