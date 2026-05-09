#[derive(Clone, Debug)]
pub struct Config {
    pub mongodb_uri: String,
    pub mongodb_db: String,
    pub bind_addr: String,
    pub default_model: String,
    pub providers: Vec<LlmProvider>,
    /// Optional admin token for protected endpoints (e.g. venue import).
    /// If empty, the endpoint is open (dev convenience).
    pub admin_token: String,
}

#[derive(Clone, Debug)]
pub struct LlmProvider {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    /// Empty = wildcard fallback (handles any model the owners list doesn't claim).
    pub models: Vec<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let mongodb_uri =
            std::env::var("MONGODB_URI").unwrap_or_else(|_| "mongodb://127.0.0.1:27017".into());
        let mongodb_db =
            std::env::var("MONGODB_DB").unwrap_or_else(|_| "researchpilot".into());
        let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8000".into());
        let default_model =
            std::env::var("LLM_MODEL").unwrap_or_else(|_| "deepseek-v4-flash".into());

        let mut providers = Vec::new();
        if let (Ok(url), Ok(key)) = (std::env::var("LLM_BASE_URL"), std::env::var("LLM_API_KEY")) {
            if !url.is_empty() && !key.is_empty() {
                providers.push(LlmProvider {
                    name: "local".into(),
                    base_url: url.trim_end_matches('/').into(),
                    api_key: key,
                    models: vec![],
                });
            }
        }
        if let (Ok(url), Ok(key)) = (
            std::env::var("OPENCODE_BASE_URL"),
            std::env::var("OPENCODE_API_KEY"),
        ) {
            if !url.is_empty() && !key.is_empty() {
                providers.push(LlmProvider {
                    name: "opencode_go".into(),
                    base_url: url.trim_end_matches('/').into(),
                    api_key: key,
                    models: vec![],
                });
            }
        }

        // Numbered fallback providers: LLM_PROVIDER_<N>_BASE_URL / _API_KEY
        // (optional _NAME, _MODELS=comma,separated). Iterates N=1..16 and
        // appends every provider whose URL+KEY are both set. Empty _MODELS
        // means wildcard fallback for any model.
        for n in 1..=16 {
            let url = std::env::var(format!("LLM_PROVIDER_{}_BASE_URL", n)).unwrap_or_default();
            let key = std::env::var(format!("LLM_PROVIDER_{}_API_KEY", n)).unwrap_or_default();
            if url.is_empty() || key.is_empty() {
                continue;
            }
            let name = std::env::var(format!("LLM_PROVIDER_{}_NAME", n))
                .ok()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| format!("provider_{}", n));
            let models: Vec<String> = std::env::var(format!("LLM_PROVIDER_{}_MODELS", n))
                .ok()
                .map(|s| {
                    s.split(',')
                        .map(|m| m.trim().to_string())
                        .filter(|m| !m.is_empty())
                        .collect()
                })
                .unwrap_or_default();
            providers.push(LlmProvider {
                name,
                base_url: url.trim_end_matches('/').into(),
                api_key: key,
                models,
            });
        }

        let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();

        Ok(Self {
            mongodb_uri,
            mongodb_db,
            bind_addr,
            default_model,
            providers,
            admin_token,
        })
    }
}
