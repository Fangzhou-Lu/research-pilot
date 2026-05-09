use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

mod arxiv;
mod config;
mod error;
mod llm;
mod models;
mod repo;
mod routes;
mod state;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename("../.env.local").ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "server_rs=info,tower_http=info,axum=info".into()),
        )
        .init();

    let cfg = config::Config::from_env()?;
    let bind: SocketAddr = cfg.bind_addr.parse()?;
    tracing::info!(
        "LLM providers configured: {:?}",
        cfg.providers.iter().map(|p| &p.name).collect::<Vec<_>>()
    );
    tracing::info!("MongoDB: {}", cfg.mongodb_uri);

    let st = state::AppState::new(cfg).await?;
    st.ensure_indexes().await?;

    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    let app = routes::router(st)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    tracing::info!("listening on http://{}", bind);
    let listener = tokio::net::TcpListener::bind(bind).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
