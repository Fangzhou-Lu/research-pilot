// MongoDB CRUD over the collections defined in models.rs.

use crate::error::AppResult;
use crate::models::*;
use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::Database;
use std::collections::HashMap;

// ─── interests ───────────────────────────────────────────────────────────────

pub async fn list_interests(db: &Database, user_id: &str) -> AppResult<Vec<Interest>> {
    let coll = db.collection::<InterestDoc>("interests");
    let cursor = coll
        .find(doc! {"user_id": user_id})
        .sort(doc! {"created_at": -1})
        .limit(500)
        .await?;
    let docs: Vec<InterestDoc> = cursor.try_collect().await?;
    Ok(docs
        .into_iter()
        .map(interest_from_doc)
        .collect())
}

pub async fn add_interest(
    db: &Database,
    user_id: &str,
    text: &str,
    interest_type: &str,
) -> AppResult<Interest> {
    let coll = db.collection::<InterestDoc>("interests");
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();
    let d = InterestDoc {
        id: id.clone(),
        user_id: user_id.into(),
        text: text.into(),
        interest_type: interest_type.into(),
        created_at: now,
        paused: false,
        last_match_at: None,
        match_count_7d: 0,
    };
    coll.insert_one(&d).await?;
    Ok(Interest {
        id,
        text: text.into(),
        created_at: now.timestamp_millis(),
        paused: false,
        last_match_at: None,
        match_count_7d: 0,
    })
}

pub async fn remove_interest(db: &Database, user_id: &str, id: &str) -> AppResult<()> {
    let coll = db.collection::<InterestDoc>("interests");
    coll.delete_one(doc! {"_id": id, "user_id": user_id}).await?;
    Ok(())
}

pub async fn get_interest(
    db: &Database,
    user_id: &str,
    id: &str,
) -> AppResult<Option<Interest>> {
    let coll = db.collection::<InterestDoc>("interests");
    let doc = coll.find_one(doc! {"_id": id, "user_id": user_id}).await?;
    Ok(doc.map(interest_from_doc))
}

pub async fn set_interest_paused(
    db: &Database,
    user_id: &str,
    id: &str,
    paused: bool,
) -> AppResult<Option<Interest>> {
    let coll = db.collection::<InterestDoc>("interests");
    let opts = mongodb::options::FindOneAndUpdateOptions::builder()
        .return_document(mongodb::options::ReturnDocument::After)
        .build();
    let updated = coll
        .find_one_and_update(
            doc! {"_id": id, "user_id": user_id},
            doc! {"$set": {"paused": paused}},
        )
        .with_options(opts)
        .await?;
    Ok(updated.map(interest_from_doc))
}

fn interest_from_doc(d: InterestDoc) -> Interest {
    Interest {
        id: d.id,
        text: d.text,
        created_at: d.created_at.timestamp_millis(),
        paused: d.paused,
        last_match_at: d.last_match_at.map(|t| t.timestamp_millis()),
        match_count_7d: d.match_count_7d,
    }
}

// ─── bookmarks ───────────────────────────────────────────────────────────────

pub async fn list_bookmarks(db: &Database, user_id: &str) -> AppResult<Vec<BookmarkOut>> {
    let coll = db.collection::<BookmarkDoc>("bookmarks");
    let cursor = coll
        .find(doc! {"user_id": user_id})
        .sort(doc! {"bookmarked_at": -1})
        .limit(500)
        .await?;
    let docs: Vec<BookmarkDoc> = cursor.try_collect().await?;
    Ok(docs
        .into_iter()
        .map(|d| BookmarkOut {
            article_id: d.article_id,
            bookmarked_at: d.bookmarked_at.timestamp_millis(),
            arxiv_id: d.arxiv_id,
            title: d.title,
            abs: d.abs,
            authors: d.authors,
            organizations: d.organizations,
            primary_category: d.primary_category,
            pdf_url: d.pdf_url,
            abs_url: d.abs_url,
        })
        .collect())
}

pub async fn add_bookmark(db: &Database, user_id: &str, a: &Article) -> AppResult<()> {
    let coll = db.collection::<BookmarkDoc>("bookmarks");
    let d = BookmarkDoc {
        user_id: user_id.into(),
        article_id: a.id.clone(),
        arxiv_id: a.arxiv_id.clone(),
        title: a.title.clone(),
        abs: a.abs.clone(),
        authors: a.authors.clone(),
        organizations: a.organizations.clone(),
        primary_category: a.primary_category.clone(),
        pdf_url: a.pdf_url.clone(),
        abs_url: a.abs_url.clone(),
        bookmarked_at: Utc::now(),
    };
    coll.replace_one(doc! {"user_id": user_id, "article_id": &a.id}, &d)
        .upsert(true)
        .await?;
    Ok(())
}

pub async fn remove_bookmark(db: &Database, user_id: &str, article_id: &str) -> AppResult<()> {
    let coll = db.collection::<BookmarkDoc>("bookmarks");
    coll.delete_one(doc! {"user_id": user_id, "article_id": article_id})
        .await?;
    Ok(())
}

pub async fn bookmarks_for(
    db: &Database,
    user_id: &str,
    ids: &[String],
) -> AppResult<HashMap<String, bool>> {
    let mut out: HashMap<String, bool> = ids.iter().map(|id| (id.clone(), false)).collect();
    if ids.is_empty() {
        return Ok(out);
    }
    let coll = db.collection::<BookmarkDoc>("bookmarks");
    let cursor = coll
        .find(doc! {"user_id": user_id, "article_id": {"$in": ids}})
        .await?;
    let docs: Vec<BookmarkDoc> = cursor.try_collect().await?;
    for d in docs {
        out.insert(d.article_id, true);
    }
    Ok(out)
}

// ─── clicks ──────────────────────────────────────────────────────────────────

pub async fn insert_click(
    db: &Database,
    user_id: &str,
    article_id: &str,
    from: &str,
) -> AppResult<()> {
    let coll = db.collection::<crate::models::ClickDoc>("clicks");
    let d = crate::models::ClickDoc {
        user_id: user_id.into(),
        article_id: article_id.into(),
        from: from.into(),
        ts: Utc::now(),
    };
    coll.insert_one(&d).await?;
    Ok(())
}

// ─── article cache ───────────────────────────────────────────────────────────

pub async fn get_cached_article(db: &Database, id: &str) -> AppResult<Option<Article>> {
    let coll = db.collection::<ArticleDoc>("articles_cache");
    let d = coll.find_one(doc! {"article_id": id}).await?;
    Ok(d.map(|d| Article {
        id: d.article_id,
        arxiv_id: d.arxiv_id,
        title: d.title,
        abs: d.abs,
        authors: d.authors,
        organizations: d.organizations,
        categories: d.categories,
        primary_category: d.primary_category,
        published: d.published,
        updated: d.updated,
        pdf_url: d.pdf_url,
        abs_url: d.abs_url,
    }))
}

pub async fn put_cached_article(db: &Database, a: &Article) -> AppResult<()> {
    let coll = db.collection::<ArticleDoc>("articles_cache");
    let d = ArticleDoc {
        article_id: a.id.clone(),
        arxiv_id: a.arxiv_id.clone(),
        title: a.title.clone(),
        abs: a.abs.clone(),
        authors: a.authors.clone(),
        organizations: a.organizations.clone(),
        categories: a.categories.clone(),
        primary_category: a.primary_category.clone(),
        published: a.published.clone(),
        updated: a.updated.clone(),
        pdf_url: a.pdf_url.clone(),
        abs_url: a.abs_url.clone(),
        fetched_at: Utc::now(),
    };
    coll.replace_one(doc! {"article_id": &a.id}, &d)
        .upsert(true)
        .await?;
    Ok(())
}

pub async fn put_cached_articles_many(db: &Database, articles: &[Article]) -> AppResult<()> {
    for a in articles {
        let _ = put_cached_article(db, a).await;
    }
    Ok(())
}

pub async fn get_bookmarked_article_any(
    db: &Database,
    article_id: &str,
) -> AppResult<Option<Article>> {
    let coll = db.collection::<BookmarkDoc>("bookmarks");
    let d = coll.find_one(doc! {"article_id": article_id}).await?;
    Ok(d.map(|d| Article {
        id: d.article_id,
        arxiv_id: d.arxiv_id,
        title: d.title,
        abs: d.abs,
        authors: d.authors,
        organizations: d.organizations,
        categories: vec![d.primary_category.clone()],
        primary_category: d.primary_category,
        published: String::new(),
        updated: String::new(),
        pdf_url: d.pdf_url,
        abs_url: d.abs_url,
    }))
}

// ─── summaries ───────────────────────────────────────────────────────────────

pub async fn get_summary(
    db: &Database,
    article_id: &str,
    language: &str,
) -> AppResult<Option<Vec<SummarySection>>> {
    let coll = db.collection::<SummaryDoc>("summaries_cache");
    let d = coll
        .find_one(doc! {"article_id": article_id, "language": language})
        .await?;
    // Cache invalidation: if the cached summary uses the legacy 5-section
    // template (Problem / Approach / Key results / Why it matters / Open
    // questions), drop it so the next request regenerates with the
    // chatpaper-style four-section template (see llm::SUMMARY_HEADINGS_V2).
    if let Some(ref doc_v) = d {
        let first = doc_v.sections.first().map(|s| s.heading.as_str()).unwrap_or("");
        if first != crate::llm::SUMMARY_HEADINGS_V2[0] {
            let _ = coll
                .delete_one(doc! {"article_id": article_id, "language": language})
                .await;
            return Ok(None);
        }
    }
    Ok(d.map(|d| d.sections))
}

pub async fn put_summary(
    db: &Database,
    article_id: &str,
    language: &str,
    sections: &[SummarySection],
) -> AppResult<()> {
    let coll = db.collection::<SummaryDoc>("summaries_cache");
    let d = SummaryDoc {
        article_id: article_id.into(),
        language: language.into(),
        sections: sections.to_vec(),
        generated_at: Utc::now(),
    };
    coll.replace_one(
        doc! {"article_id": article_id, "language": language},
        &d,
    )
    .upsert(true)
    .await?;
    Ok(())
}

// ─── translations ────────────────────────────────────────────────────────────

pub async fn get_translation(
    db: &Database,
    article_id: &str,
    language: &str,
) -> AppResult<Option<Translation>> {
    let coll = db.collection::<TranslationDoc>("translations_cache");
    let d = coll
        .find_one(doc! {"article_id": article_id, "language": language})
        .await?;
    Ok(d.map(|d| Translation {
        title: d.title_translated,
        abs: d.abstract_translated,
    }))
}

pub async fn put_translation(
    db: &Database,
    article_id: &str,
    language: &str,
    title: &str,
    abs: &str,
) -> AppResult<()> {
    let coll = db.collection::<TranslationDoc>("translations_cache");
    let d = TranslationDoc {
        article_id: article_id.into(),
        language: language.into(),
        title_translated: title.into(),
        abstract_translated: abs.into(),
        generated_at: Utc::now(),
    };
    coll.replace_one(
        doc! {"article_id": article_id, "language": language},
        &d,
    )
    .upsert(true)
    .await?;
    Ok(())
}

// ─── chat history ────────────────────────────────────────────────────────────

pub async fn list_chat_messages(
    db: &Database,
    user_id: &str,
    article_id: &str,
    limit: i64,
) -> AppResult<Vec<ChatMessageOut>> {
    let coll = db.collection::<ChatDoc>("chat_messages");
    let cursor = coll
        .find(doc! {"user_id": user_id, "article_id": article_id})
        .sort(doc! {"created_at": 1})
        .limit(limit.clamp(1, 1000))
        .await?;
    let docs: Vec<ChatDoc> = cursor.try_collect().await?;
    Ok(docs
        .into_iter()
        .map(|d| ChatMessageOut {
            role: d.role,
            content: d.content,
            created_at: d.created_at.timestamp_millis(),
        })
        .collect())
}

pub async fn append_chat_message(
    db: &Database,
    user_id: &str,
    article_id: &str,
    role: &str,
    content: &str,
) -> AppResult<()> {
    let coll = db.collection::<ChatDoc>("chat_messages");
    let d = ChatDoc {
        user_id: user_id.into(),
        article_id: article_id.into(),
        message_id: uuid::Uuid::new_v4().to_string(),
        role: role.into(),
        content: content.into(),
        created_at: Utc::now(),
    };
    coll.insert_one(&d).await?;
    Ok(())
}

