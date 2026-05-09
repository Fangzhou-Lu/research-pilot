# ResearchPilot — Site Design Document

> **Scope:** A functionally-equivalent reimagining of the ChatPaper research-paper discovery + AI-chat site, implemented with original UI design, copy, and branding ("ResearchPilot"). This document captures the information architecture and the public/internal API surface.
>
> **Architecture (as of 2026-05-08):** Front-end / back-end separation. Next.js 14 (App Router) handles only rendering. A Rust backend (axum + tokio) owns persistence (MongoDB), arXiv ingestion, and the LLM aggregator. Frontend talks to backend over `/api/v1/...` using JSON; identity is anonymous via a `X-User-Id` header echoing a uuid the browser mints into `localStorage`.

---

## 1. Product summary

1. Onboard by describing research interests in natural language.
2. Browse a daily feed of arXiv preprints; each card shows title, primary category, authors, affiliations, expandable abstract.
3. Open a paper for an AI-generated structured summary (Problem · Approach · Key results · Why it matters · Open questions), the abstract, or a streaming chat panel grounded in the paper.
4. Bookmark papers into a personal collection.
5. Drill into venue categories (cs.AI, cs.LG, cs.CL, …); each is its own arXiv-cat-backed feed.
6. Per-interest recommendations: list of recent arXiv preprints relevance-ranked against the saved interest text, grouped by published date.
7. On-demand bilingual translation of the title + abstract.

---

## 2. Topology

```
┌─────────────────────┐    fetch /api/v1/...     ┌─────────────────────────┐
│  Next.js 14         │ ───────────────────────► │  Rust backend (axum)    │
│  :3000              │  X-User-Id header        │  :8000                  │
│  • SSR pages        │ ◄─────────────────────── │  • arXiv ingest         │
│  • Client React     │       JSON / SSE         │  • LLM aggregator       │
│  • Tailwind         │                          │  • Mongo persistence    │
└─────────────────────┘                          └────────────┬────────────┘
                                                              │
                                                ┌─────────────┴────────────┐
                                                │  MongoDB :27017          │
                                                │  rp database             │
                                                └──────────────────────────┘
```

The frontend is **stateless server-side** (RSC pages call `apiList`, `apiArticle`, `apiSearch` over HTTP). All user-scoped state (interests, bookmarks, summary cache, chat history) is owned by the backend and accessed only from the client via `authedFetch` which sets the `X-User-Id` header.

LLM provider keys live exclusively on the backend (`server-rs/.env` or the inherited `.env.local`). The frontend never sees them.

---

## 3. URL structure & page inventory (frontend)

| Route                       | Render | Purpose                                                                                  |
|-----------------------------|--------|------------------------------------------------------------------------------------------|
| `/`                         | RSC    | Home — daily arXiv feed (`?cat=` switches category, default `cs.AI`).                    |
| `/interests`                | RSC + client | Manage tracked interests; client-side CRUD via `authedFetch`.                       |
| `/interests/[id]`           | RSC shell + client | Recommended papers for one tracked interest, grouped by published date.    |
| `/venues?id=&page=`         | RSC    | Same shape as home, with a left sidebar of arXiv categories (cs.AI, cs.LG, …).           |
| `/search?q=&type=&page=`    | RSC    | Search results. `type` (all / arxiv / venue / institution) is shown as tab strip.        |
| `/paper/[id]`               | RSC + client | Bilingual title + abstract slot, AI Summary tab, Abstract tab, Chat tab.           |
| `/collection`               | client | Bookmarked papers. Loads via `GET /api/v1/bookmarks`.                                    |

---

## 4. Component architecture

```
app/
├── layout.tsx                 # html shell, fonts
├── page.tsx                   # home — calls apiList()
├── interests/
│   ├── page.tsx
│   └── [id]/page.tsx          # per-interest recs (client component does the fetch)
├── venues/page.tsx
├── search/page.tsx            # tabs for search-type filter
├── paper/[id]/page.tsx
└── collection/page.tsx

components/
├── Header.tsx, Footer.tsx, Hero.tsx
├── SearchBar.tsx              # filter + Search/Track (Track posts to /interests)
├── NavTabs.tsx
├── PaperCard.tsx
├── Pagination.tsx
├── BookmarkButton.tsx         # POST/DELETE /bookmarks, POST /bookmarks/check
├── PaperWorkspace.tsx         # tabs: AI Summary | Abstract | Chat
├── AISummary.tsx              # POST /summarize
├── ChatPanel.tsx              # POST /chat (text/plain stream); GET /chat-history
├── InterestEditor.tsx         # GET/POST /interests, DELETE /interests/:id
├── CollectionView.tsx         # GET /bookmarks
└── RecommendationsView.tsx    # GET /interests/:id/recommendations

lib/
├── types.ts                   # Article, Paginated<T>, Interest, ChatMessage, AISummary, VENUES
├── api.ts                     # apiList, apiArticle, apiSearch + PATHS map
├── user.ts                    # BACKEND_URL, getUserId, authedFetch (sets X-User-Id)
├── storage.ts                 # browser preferences only (language, view mode, translation toggle)
└── utils.ts                   # classNames, fmtDate (UTC, hydration-safe)
```

```
server-rs/
├── Cargo.toml                 # axum, tokio, mongodb, reqwest, quick-xml, …
├── src/
│   ├── main.rs                # bootstrap, CORS, tracing
│   ├── config.rs              # env loading
│   ├── state.rs               # AppState + ensure_indexes
│   ├── error.rs               # AppError, IntoResponse
│   ├── models.rs              # wire types + storage docs
│   ├── repo.rs                # MongoDB CRUD
│   ├── arxiv.rs               # Atom-feed client (quick-xml, retry/backoff, version stripping)
│   ├── llm.rs                 # OpenAI-compat aggregator (sync + streaming)
│   └── routes/
│       ├── mod.rs             # router + user_id_from(headers)
│       ├── meta.rs            # /health, /whoami, /providers
│       ├── articles.rs        # /articles, /article
│       ├── search.rs          # /search
│       ├── interests.rs       # CRUD + recommendations
│       ├── bookmarks.rs       # CRUD + /bookmarks/check
│       ├── summarize.rs       # /summarize (cache-then-LLM)
│       ├── translate.rs       # /translate (cache-then-LLM)
│       └── chat.rs            # /chat (mpsc + ReceiverStream + persist on done), /chat-history
```

---

## 5. Backend API surface (`/api/v1/...`)

| Method | Path                                  | Auth   | Purpose                                                                 |
|--------|---------------------------------------|--------|-------------------------------------------------------------------------|
| GET    | `/health`                             | —      | Liveness probe.                                                         |
| GET    | `/whoami`                             | header | Echoes the `X-User-Id`, plus mongo ping + default model.                |
| GET    | `/providers`                          | —      | LLM diagnostic: configured providers + default model.                   |
| GET    | `/articles?cat=&page=&page_size=`     | —      | arXiv feed, paginated. Default `cat=cs.AI`, `page_size=20`.             |
| GET    | `/article?id=`                        | —      | One paper. Mongo cache fall-through to arXiv.                           |
| GET    | `/search?q=&page=&page_size=&type=`   | —      | arXiv search; `type` is echoed for UI but routes to arxiv corpus.       |
| GET    | `/interests`                          | header | List tracked interests for the user.                                    |
| POST   | `/interests`                          | header | `{ text, type? }` → returns the new interest.                           |
| DELETE | `/interests/:id`                      | header | Remove one.                                                             |
| GET    | `/interests/:id/recommendations`      | header | arXiv search by interest text, grouped by published date.               |
| GET    | `/bookmarks`                          | header | List bookmarks (full article payload embedded).                         |
| POST   | `/bookmarks`                          | header | `{ article }` upserts.                                                  |
| DELETE | `/bookmarks?id=`                      | header | Remove.                                                                 |
| POST   | `/bookmarks/check`                    | header | `{ ids: [...] }` → `{ [id]: bool }`.                                   |
| POST   | `/summarize`                          | —      | `{ article_id, title, abstract, authors?, language? }` — Mongo-cached.  |
| POST   | `/translate`                          | —      | `{ article_id, language, title, abstract }` — Mongo-cached.             |
| POST   | `/chat`                               | header | `{ article, messages }` → `text/plain` stream of assistant deltas.      |
| GET    | `/chat-history?article_id=`           | header | Replay prior turns for this user+article.                               |

### 5.1 Identity

Anonymous: `lib/user.ts` mints a uuid into `localStorage('rp:uid')` on first use and sends it on every authed request. The backend validates shape (8–64 chars, restricted character set) and falls back to `"anon"` only when the header is missing or malformed. No accounts, no passwords, no OAuth. Documented as a deliberate departure from the live ChatPaper site (which uses ChatDOC OAuth).

### 5.2 LLM aggregator (`server-rs/src/llm.rs`)

Two providers configured by env:
- `LLM_BASE_URL` + `LLM_API_KEY` — local OpenAI-compat proxy.
- `OPENCODE_BASE_URL` + `OPENCODE_API_KEY` — opencode-go (`https://opencode.ai/zen/go/v1`).

Routing: a provider whitelist is honoured first (`models: Vec<String>`), then any provider with an empty list acts as a wildcard fallback. Iterate in declaration order, fall through on any non-success. `complete()` is non-streaming; `stream_complete()` parses OpenAI-style SSE (`data: {…}` / `data: [DONE]`) and forwards `choices[0].delta.content` to an `mpsc::Sender`.

### 5.3 arXiv client (`server-rs/src/arxiv.rs`)

Direct queries to `http://export.arxiv.org/api/query`, parsed imperatively with `quick-xml`. Retries 429/503 up to three times with linear backoff. The canonical `id` is the arxiv id with `vN` stripped (`"2410.07073v2"` → `"2410.07073"`); the full versioned form is preserved as `arxiv_id`. This makes URLs like `/paper/2410.07073` keyable identically to bookmarked entries.

**Cache-warming.** Both `/articles` (list) and `/search` write every returned `Article` into `articles_cache` via a fire-and-forget `tokio::spawn` (no latency cost on the response). This means the very next click on a list item resolves from Mongo without touching arXiv — important when arXiv is rate-limiting the server. `/article?id=…` first checks `articles_cache`; on a cache miss it queries arXiv; if arXiv is unreachable it falls back to any matching `bookmarks` row before returning `NotFound`.

---

## 6. Data models

### 6.1 Wire types (JSON returned to frontend)

```ts
type Article = {
  id: string;                  // canonical arxiv id, no version
  arxiv_id: string;            // full versioned id (e.g. "2410.07073v2")
  title: string;
  abstract: string;            // serialized as "abstract" (Rust field is `abs`)
  authors: string[];
  organizations: string[];
  categories: string[];
  primary_category: string;
  published: string;           // ISO-8601 from arXiv
  updated: string;
  pdf_url: string;
  abs_url: string;
};

type Paginated<T> = { total: number; page: number; size: number; items: T[] };

type Interest = { id: string; text: string; created_at: number };

type AISummarySection = { heading: string; body_md: string };
type AISummary = { article_id: string; language: string; sections: AISummarySection[]; generated_at: number };
```

### 6.2 MongoDB collections (`db = researchpilot`)

| Collection            | Indexes                                              | Engine notes                       |
|-----------------------|------------------------------------------------------|------------------------------------|
| `interests`           | `{user_id:1, _id:1}`                                 | `_id` = uuid string.               |
| `bookmarks`           | unique `{user_id:1, article_id:1}`                   | full article payload denormalized. |
| `articles_cache`      | unique `{article_id:1}`                              | shared, warmed on every list/search and on `/article` miss. |
| `summaries_cache`     | unique `{article_id:1, language:1}`                  | shared.                            |
| `translations_cache`  | unique `{article_id:1, language:1}`                  | shared.                            |
| `chat_messages`       | `{user_id:1, article_id:1, created_at:1}`            | append-only.                       |

ReplacingMergeTree-style upsert for shared caches via `replace_one(..., upsert(true))`. Bookmarks/interests use straight `insert_one` / `delete_one`.

---

## 7. Key UI flows

### 7.1 First visit (unauthenticated, anonymous user_id minted)

1. `/` SSR fetches `GET /api/v1/articles?cat=cs.AI&page=1` (revalidated 600s). 20 cards rendered.
2. Click a paper → `/paper/[id]` SSR fetches `GET /api/v1/article?id=…`. Bookmark icon and AI summary tab are client components.
3. AI summary tab POSTs `/api/v1/summarize`. Backend hits the Mongo cache; on miss, calls the aggregator and persists.
4. The page renders the 5 sections (Problem · Approach · Key results · Why it matters · Open questions).

### 7.2 Track an interest

1. Type a keyword in the header search bar → click **Track** → POST `/api/v1/interests` → redirect to `/interests`.
2. `/interests` lists the new interest. Click the interest text → `/interests/[id]`.
3. The detail view fetches `/api/v1/interests/:id/recommendations` and renders papers grouped by published date.

### 7.3 Bookmark

1. Click the bookmark icon on any card or on the paper-detail header.
2. Optimistic toggle. On bookmark, POST `/api/v1/bookmarks { article }`; on unbookmark, DELETE `/api/v1/bookmarks?id=…`.
3. `/collection` lists from `GET /api/v1/bookmarks`.

### 7.4 Chat with paper

1. POST `/api/v1/chat { article, messages }`. Backend:
   - Persists the latest user turn (best-effort spawn).
   - Builds the prompt: `CHAT_SYSTEM` + paper context + history.
   - Streams provider deltas through an `mpsc` channel into the response body.
   - When the stream completes, persists the accumulated assistant turn.
2. The component reads the stream and renders incrementally.

### 7.5 Bilingual translation

The paper-detail header (`<PaperHeader>`) has a **Translate to 中文** toggle. Click triggers `POST /api/v1/translate { article_id, language, title, abstract }`; response is `{ title, abstract }` in the target language. Cache key is `(article_id, language)`; subsequent toggles render from Mongo without re-hitting the LLM. The toggle persists in `localStorage` so the preference carries across paper navigations.

### 7.6 View-mode (Simple / Detailed)

The home / venue feed has a `<ViewModeToggle>` in the operation bar. `<PaperCard>` reads `getViewMode()` and listens for `storage` events; switching collapses/expands authors, organizations, and the abstract toggle. Persisted in `localStorage`.

### 7.7 Date-cursor archive

The home page accepts `?date=YYYY-MM-DD`. Threaded through `apiList` → backend `/articles?date=…` → arxiv search query `cat:X AND submittedDate:[YYYYMMDD0000 TO YYYYMMDD2359]`. The `<DatePicker>` component on `/` writes this param into the URL; pagination preserves it. Empty `date` falls back to the descending recent feed.

---

## 8. Tech stack

| Concern         | Choice                                    | Why                                                                |
|-----------------|-------------------------------------------|--------------------------------------------------------------------|
| Frontend        | Next.js 14 (App Router) + TypeScript      | RSC + streaming + good DX.                                         |
| Frontend styling| Tailwind CSS, custom ink/accent palette    | rapid, consistent, original.                                       |
| Frontend state  | localStorage for prefs + user_id; no global store | small surface; per-page hooks fetch from backend.            |
| Backend         | Rust 1.95, axum 0.7, tokio                | strong type safety, async, single static binary.                   |
| Backend HTTP    | reqwest 0.12 (rustls)                     | upstream LLM + arXiv calls.                                        |
| Backend XML     | quick-xml 0.36                            | streaming Atom parse, namespace-tolerant.                          |
| Storage         | MongoDB 7 (local mongod on :27017)        | document-friendly, bulk denormalization, no migrations during dev. |
| LLM             | OpenAI-compat: local proxy + opencode-go fallback | declarative routing, default model `deepseek-v4-flash`.    |
| Logging         | tracing + tracing-subscriber              | structured, env-filtered.                                          |
| CORS            | tower-http permissive (dev)               | tighten on deploy.                                                 |

---

## 9. Run locally

```sh
# 1. one-shot — mongod + Rust backend + Next.js frontend
./scripts/dev.sh

# or piecewise:
./scripts/mongo-start.sh
( cd server-rs && cargo run )         # :8000
npm run dev                            # :3000

./scripts/mongo-stop.sh                # tears down mongod
```

Env knobs (combined `.env.local` + `server-rs/.env`):

```
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=...           LLM_API_KEY=...
OPENCODE_BASE_URL=...      OPENCODE_API_KEY=...
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=researchpilot
BIND_ADDR=127.0.0.1:8000
```

---

## 10. Notable differences from the live site

- No ChatDOC OAuth or Google OAuth — anonymous `user_id` instead.
- No locales; planned per-paper on-demand translation via `/translate`.
- arXiv-only corpus (no curated venue list with Oral/Poster sub-track yet — modeled functionally as recent papers in a category).
- AI summary and chat are first-party (no ChatDOC handoff).
- All UI copy, branding, color palette, illustrations are original to ResearchPilot.

---

## 11. What's intentionally not implemented

- Anti-abuse fingerprint endpoints, push tokens, ProductHunt badge — out of scope for a self-hosted dev stack.
- Per-locale prefixed routes (`/{locale}/…`). Replaced by a per-paper translate toggle.
- Curated venue catalog with Oral / Poster sub-tracks — modeled functionally as the arXiv-category browser in `/venues`.

---

## 12. Pivot history (for posterity)

1. v1 — Next.js full-stack with Anthropic SDK; localStorage persistence.
2. v2 — Multi-provider OpenAI-compat aggregator (local proxy + opencode-go).
3. v3 — Brief ClickHouse spike (rolled back; ReplacingMergeTree complexity not justified at this scale).
4. **v4 (current) — Rust backend + MongoDB, full front-end / back-end separation.**

---

## 13. Visual design system

The visual layer was tuned by running [`designlang`](https://github.com/Manavarya09/design-extract) against `https://chatpaper.com` and adopting the parts of its design language that are content-neutral. The full extraction lives under `.design-extract-output/` (gitignored — regenerate with `npx designlang https://chatpaper.com --full --out .design-extract-output`).

### 13.1 Tokens we adopted

| Token | Source | Where it lives |
|---|---|---|
| **Display face = Poppins** (400/500/600/700) | chatpaper.com runs Poppins for ≈ 2.4k DOM nodes | `app/layout.tsx` via `next/font/google`; `--font-display` CSS var |
| **Body face = Inter** | ResearchPilot pick, paired with Poppins for body legibility | `app/layout.tsx`; `--font-sans` CSS var |
| **Mono face = JetBrains Mono** | unchanged | `--font-mono` |
| **Type scale** `display-1: 48/56/600`, `display-2: 36/44/600`, `display-3: 24/32/500`, `display-4: 20/28/500` | mirrors chatpaper.com h1–h4 | `tailwind.config.ts` `fontSize` |
| **Body size = 15px** | midpoint between chatpaper.com's 14px and Tailwind's 16px default | `body` class in `layout.tsx` |
| **Easing = `cubic-bezier(0.645, 0.045, 0.355, 1)`** (in-out-quart) | chatpaper.com signature curve | `tailwind.config.ts` `transitionTimingFunction.in-out-quart`; `--ease-in-out-quart` CSS var |
| **Durations = 100/150/200/300 ms** | chatpaper.com motion tokens | `tailwind.config.ts` `transitionDuration`; `--duration-{xs,sm,md}` CSS vars |
| **Shadow scale** `xs / soft / glow / lift` | chatpaper.com's flat-soft elevation language | `tailwind.config.ts` `boxShadow` |
| **`rounded-pill` = 27px** | chatpaper.com's signature search-bar corner | `tailwind.config.ts` `borderRadius.pill` — used by `<SearchBar>` |

### 13.2 Tokens we kept (ResearchPilot original)

- **`ink` neutral palette** (50–900, cool gray) — preferred over chatpaper.com's irregular n100–n1200.
- **`accent` blue** (#3b6dff base) — distinct from chatpaper.com's #6576db indigo.
- All copy, brand name, illustrations.

### 13.3 Anti-patterns the extractor flagged (and we avoid)

- **221 `!important` rules** on chatpaper.com — we keep specificity flat via Tailwind utilities.
- **85% unused CSS / 9 011 duplicate declarations** — we ship only utility classes; no dead CSS.
- **1 WCAG contrast failure** — we score every accent on the `ink` palette in code review.
- **22 z-index layers** — we cap at sticky-header (`z-40`).

### 13.4 Regenerating

```bash
npx -y designlang https://chatpaper.com --full --out .design-extract-output
```

Outputs `*-design-language.md` (90 KB, 19-section reference), DTCG tokens, Tailwind/Figma/shadcn/WordPress/iOS/Android/Flutter exports, screenshots at 4 viewports, motion / voice / page-intent / icon-system JSONs, and an MCP-ready payload. Re-run when chatpaper.com refreshes its visual identity.
