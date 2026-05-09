// arXiv Atom-feed client. Imperative quick-xml parse — robust against
// arXiv's odd namespace usage (e.g. `arxiv:primary_category`,
// `opensearch:totalResults`).

use crate::error::AppError;
use crate::models::{Article, Paginated};
use quick_xml::events::Event;
use quick_xml::Reader;

const ARXIV_API: &str = "http://export.arxiv.org/api/query";

#[derive(Default, Debug)]
struct EntryRaw {
    id: String,
    title: String,
    summary: String,
    published: String,
    updated: String,
    authors: Vec<String>,
    affiliations: Vec<String>,
    categories: Vec<String>,
    primary_category: String,
    pdf_url: String,
    abs_url: String,
}

pub async fn list_by_category(
    http: &reqwest::Client,
    cat: &str,
    page: u64,
    page_size: u64,
    date: Option<&str>,
) -> Result<Paginated<Article>, AppError> {
    let start = (page.saturating_sub(1)) * page_size;
    let mut search = format!("cat:{}", cat);
    if let Some(d) = date {
        // Accept YYYY-MM-DD; arXiv wants `YYYYMMDDHHMM`. Range = full UTC day.
        if let Some((y, m, day)) = parse_date(d) {
            let lo = format!("{:04}{:02}{:02}0000", y, m, day);
            let hi = format!("{:04}{:02}{:02}2359", y, m, day);
            search = format!("{}+AND+submittedDate:[{}+TO+{}]", search, lo, hi);
        }
    }
    let url = format!(
        "{}?search_query={}&start={}&max_results={}&sortBy=submittedDate&sortOrder=descending",
        ARXIV_API,
        search,
        start,
        page_size
    );
    fetch_arxiv(http, &url).await
}

fn parse_date(s: &str) -> Option<(i32, u32, u32)> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let y: i32 = parts[0].parse().ok()?;
    let m: u32 = parts[1].parse().ok()?;
    let d: u32 = parts[2].parse().ok()?;
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    Some((y, m, d))
}

pub async fn search(
    http: &reqwest::Client,
    q: &str,
    page: u64,
    page_size: u64,
) -> Result<Paginated<Article>, AppError> {
    if is_arxiv_id(q.trim()) {
        let url = format!(
            "{}?id_list={}&max_results=1",
            ARXIV_API,
            urlencoding::encode(q.trim())
        );
        return fetch_arxiv(http, &url).await;
    }
    let start = (page.saturating_sub(1)) * page_size;
    let url = format!(
        "{}?search_query=all:{}&start={}&max_results={}&sortBy=relevance",
        ARXIV_API,
        urlencoding::encode(q),
        start,
        page_size
    );
    fetch_arxiv(http, &url).await
}

pub async fn get_by_id(
    http: &reqwest::Client,
    id: &str,
) -> Result<Option<Article>, AppError> {
    let url = format!(
        "{}?id_list={}&max_results=1",
        ARXIV_API,
        urlencoding::encode(id)
    );
    let p = fetch_arxiv(http, &url).await?;
    Ok(p.items.into_iter().next())
}

async fn fetch_arxiv(
    http: &reqwest::Client,
    url: &str,
) -> Result<Paginated<Article>, AppError> {
    let mut last: Option<AppError> = None;
    for attempt in 0..3u32 {
        match http.get(url).send().await {
            Ok(res) => {
                let status = res.status();
                if status == reqwest::StatusCode::TOO_MANY_REQUESTS
                    || status == reqwest::StatusCode::SERVICE_UNAVAILABLE
                {
                    let wait = std::time::Duration::from_millis(
                        1000 * (u64::from(attempt) + 1) * 2,
                    );
                    tokio::time::sleep(wait).await;
                    last = Some(AppError::Upstream(format!(
                        "arxiv {} (rate-limited)",
                        status
                    )));
                    continue;
                }
                if !status.is_success() {
                    return Err(AppError::Upstream(format!("arxiv http {}", status)));
                }
                let xml = res.text().await?;
                let (total, start, per_page, items) = parse_atom(&xml)
                    .map_err(|e| AppError::Other(anyhow::anyhow!("atom parse: {e}")))?;
                let page = if per_page == 0 { 1 } else { start / per_page + 1 };
                return Ok(Paginated {
                    total,
                    page,
                    size: per_page,
                    items,
                });
            }
            Err(e) => {
                last = Some(AppError::Upstream(e.to_string()));
                if attempt == 2 {
                    break;
                }
            }
        }
    }
    Err(last.unwrap_or_else(|| AppError::Upstream("arxiv unreachable".into())))
}

fn parse_atom(xml: &str) -> anyhow::Result<(u64, u64, u64, Vec<Article>)> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut total = 0u64;
    let mut start = 0u64;
    let mut per_page = 20u64;
    let mut entries: Vec<EntryRaw> = Vec::new();
    let mut cur: Option<EntryRaw> = None;
    let mut in_author = false;
    let mut cur_author_name: Option<String> = None;
    let mut cur_aff: Option<String> = None;
    let mut text = String::new();

    fn handle_attr_only(name: &str, e: &quick_xml::events::BytesStart, cur: &mut Option<EntryRaw>) {
        if cur.is_none() {
            return;
        }
        let entry = cur.as_mut().unwrap();
        if name == "link" {
            let mut href = String::new();
            let mut title_attr = String::new();
            let mut rel = String::new();
            let mut typ = String::new();
            for attr in e.attributes().flatten() {
                let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("").to_string();
                let val = attr.unescape_value().unwrap_or_default().to_string();
                match key.as_str() {
                    "href" => href = val,
                    "title" => title_attr = val,
                    "rel" => rel = val,
                    "type" => typ = val,
                    _ => {}
                }
            }
            if title_attr == "pdf" || typ == "application/pdf" {
                entry.pdf_url = href;
            } else if rel == "alternate" {
                entry.abs_url = href;
            }
        } else if name == "category" {
            for attr in e.attributes().flatten() {
                let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                if key == "term" {
                    let val = attr.unescape_value().unwrap_or_default().to_string();
                    if !entry.categories.contains(&val) {
                        entry.categories.push(val);
                    }
                }
            }
        } else if name == "arxiv:primary_category" {
            for attr in e.attributes().flatten() {
                let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                if key == "term" {
                    entry.primary_category =
                        attr.unescape_value().unwrap_or_default().to_string();
                }
            }
        }
    }

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = std::str::from_utf8(e.name().as_ref())?.to_string();
                match name.as_str() {
                    "entry" => cur = Some(EntryRaw::default()),
                    "author" => {
                        in_author = true;
                        cur_author_name = None;
                        cur_aff = None;
                    }
                    _ => {}
                }
                handle_attr_only(&name, &e, &mut cur);
            }
            Ok(Event::Empty(e)) => {
                let name = std::str::from_utf8(e.name().as_ref())?.to_string();
                handle_attr_only(&name, &e, &mut cur);
            }
            Ok(Event::Text(t)) => {
                text.push_str(&t.unescape().unwrap_or_default());
            }
            Ok(Event::CData(c)) => {
                text.push_str(std::str::from_utf8(c.as_ref()).unwrap_or(""));
            }
            Ok(Event::End(e)) => {
                let name = std::str::from_utf8(e.name().as_ref())?.to_string();
                match name.as_str() {
                    "opensearch:totalResults" => total = text.trim().parse().unwrap_or(0),
                    "opensearch:startIndex" => start = text.trim().parse().unwrap_or(0),
                    "opensearch:itemsPerPage" => per_page = text.trim().parse().unwrap_or(20),
                    "title" => {
                        if let Some(entry) = cur.as_mut() {
                            if entry.title.is_empty() {
                                entry.title = normalize_ws(&text);
                            }
                        }
                    }
                    "summary" => {
                        if let Some(entry) = cur.as_mut() {
                            entry.summary = normalize_ws(&text);
                        }
                    }
                    "id" => {
                        if let Some(entry) = cur.as_mut() {
                            if entry.id.is_empty() {
                                entry.id = text.trim().to_string();
                            }
                        }
                    }
                    "published" => {
                        if let Some(entry) = cur.as_mut() {
                            entry.published = text.trim().to_string();
                        }
                    }
                    "updated" => {
                        if let Some(entry) = cur.as_mut() {
                            if entry.updated.is_empty() {
                                entry.updated = text.trim().to_string();
                            }
                        }
                    }
                    "name" => {
                        if in_author {
                            cur_author_name = Some(text.trim().to_string());
                        }
                    }
                    "arxiv:affiliation" => {
                        if in_author {
                            cur_aff = Some(text.trim().to_string());
                        }
                    }
                    "author" => {
                        in_author = false;
                        if let Some(entry) = cur.as_mut() {
                            if let Some(n) = cur_author_name.take() {
                                if !n.is_empty() {
                                    entry.authors.push(n);
                                }
                            }
                            if let Some(a) = cur_aff.take() {
                                if !a.is_empty() && !entry.affiliations.contains(&a) {
                                    entry.affiliations.push(a);
                                }
                            }
                        }
                    }
                    "entry" => {
                        if let Some(entry) = cur.take() {
                            entries.push(entry);
                        }
                    }
                    _ => {}
                }
                text.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow::anyhow!("xml: {e}")),
            _ => {}
        }
        buf.clear();
    }

    let articles = entries
        .into_iter()
        .map(|e| {
            let arxiv_id = e
                .id
                .split("/abs/")
                .nth(1)
                .map(str::to_string)
                .unwrap_or(e.id.clone());
            // Canonical id has the `vN` suffix stripped so URLs like
            // /paper/2410.07073 resolve to the same key as a bookmarked entry,
            // regardless of which version arXiv served at ingest time.
            let canonical_id = strip_version(&arxiv_id);
            let primary = if e.primary_category.is_empty() {
                e.categories.first().cloned().unwrap_or_else(|| "cs.AI".into())
            } else {
                e.primary_category.clone()
            };
            let pdf = if e.pdf_url.is_empty() {
                format!("https://arxiv.org/pdf/{}", canonical_id)
            } else {
                e.pdf_url
            };
            let abs_url = if e.abs_url.is_empty() {
                format!("https://arxiv.org/abs/{}", canonical_id)
            } else {
                e.abs_url
            };
            Article {
                id: canonical_id,
                arxiv_id,
                title: e.title,
                abs: e.summary,
                authors: e.authors,
                organizations: e.affiliations,
                categories: e.categories,
                primary_category: primary,
                published: e.published,
                updated: e.updated,
                pdf_url: pdf,
                abs_url,
            }
        })
        .collect();

    Ok((total, start, per_page, articles))
}

fn normalize_ws(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn strip_version(id: &str) -> String {
    // Strip a trailing `v<digits>` from arxiv ids (e.g. "2410.07073v2" → "2410.07073").
    if let Some(idx) = id.rfind('v') {
        let suffix = &id[idx + 1..];
        if !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()) {
            return id[..idx].to_string();
        }
    }
    id.to_string()
}

fn is_arxiv_id(s: &str) -> bool {
    // Matches NNNN.NNNN(N)?(vN)? — arXiv post-2007 ids.
    let mut chars = s.chars().peekable();
    for _ in 0..4 {
        match chars.next() {
            Some(c) if c.is_ascii_digit() => {}
            _ => return false,
        }
    }
    if chars.next() != Some('.') {
        return false;
    }
    let mut digits = 0;
    while let Some(&c) = chars.peek() {
        if c.is_ascii_digit() {
            chars.next();
            digits += 1;
            if digits > 5 {
                return false;
            }
        } else {
            break;
        }
    }
    if digits < 4 {
        return false;
    }
    if let Some(c) = chars.next() {
        if c != 'v' {
            return false;
        }
        let mut vd = 0;
        while let Some(&c) = chars.peek() {
            if c.is_ascii_digit() {
                chars.next();
                vd += 1;
            } else {
                break;
            }
        }
        if vd == 0 {
            return false;
        }
    }
    chars.next().is_none()
}
