use crate::config::Config;
use crate::models::*;
use mongodb::bson::doc;
use mongodb::options::IndexOptions;
use mongodb::{Client, Database, IndexModel};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub cfg: Arc<Config>,
    pub db: Database,
    pub http: reqwest::Client,
}

impl AppState {
    pub async fn new(cfg: Config) -> anyhow::Result<Self> {
        let mongo = Client::with_uri_str(&cfg.mongodb_uri).await?;
        let db = mongo.database(&cfg.mongodb_db);
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .user_agent("ResearchPilot-Server/0.1")
            .build()?;
        Ok(Self {
            cfg: Arc::new(cfg),
            db,
            http,
        })
    }

    pub async fn ensure_indexes(&self) -> anyhow::Result<()> {
        self.db
            .collection::<InterestDoc>("interests")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"user_id": 1, "_id": 1})
                    .build(),
            )
            .await?;

        self.db
            .collection::<BookmarkDoc>("bookmarks")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"user_id": 1, "article_id": 1})
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
            )
            .await?;

        self.db
            .collection::<ArticleDoc>("articles_cache")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"article_id": 1})
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
            )
            .await?;

        self.db
            .collection::<SummaryDoc>("summaries_cache")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"article_id": 1, "language": 1})
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
            )
            .await?;

        self.db
            .collection::<TranslationDoc>("translations_cache")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"article_id": 1, "language": 1})
                    .options(IndexOptions::builder().unique(true).build())
                    .build(),
            )
            .await?;

        self.db
            .collection::<ChatDoc>("chat_messages")
            .create_index(
                IndexModel::builder()
                    .keys(doc! {"user_id": 1, "article_id": 1, "created_at": 1})
                    .build(),
            )
            .await?;

        Ok(())
    }
}
