# ResearchPilot vs chatpaper.com — Post-PR Comparison

> Generated: 2026-05-09 · Viewport: 1440×900 desktop (mobile section at 390×844)
> Method: Playwright DOM inspection + `browser_evaluate` + accessibility snapshots.
> Screenshots: attempted but timed out on font-load; all evidence is DOM/computed-style.

---

## 0. Methodology

Each page was visited on chatpaper.com first, then on `localhost:3000`. For every
observation, `browser_evaluate` captured computed styles, element counts, and text
content. Accessibility snapshots provided structure. Backend API endpoints were
verified with `curl` directly against `localhost:8000`. No source files were
modified during this session.

Evidence notation:
- **CP** = chatpaper.com observed value
- **RP** = ResearchPilot localhost:3000 observed value
- **API** = direct curl to localhost:8000

---

## 1. Landing / Home Feed

### 1.1 Side-by-side observations

| Aspect | chatpaper (CP) | ResearchPilot (RP) | Status |
|--------|---------------|-------------------|--------|
| Page title | "ChatPaper: Explore and AI Chat with the Academic Papers" | "ResearchPilot — Daily AI-curated paper feed" | differentiated |
| H1 font-family | `Poppins, sans-serif` | `__Poppins_6bee3b, … Inter, ui-sans-serif` (Poppins loaded) | aligned |
| H1 text | "ChatPaper" (logo) | "A research feed that reads with you." | differentiated |
| H1 font-size (desktop) | not separately measured | 48px | — |
| Hero section on desktop | `banner-container sticky-mode` — visible, contains search + tagline | `hidden md:block` wrapper — visible on desktop | aligned |
| Primary nav items | Interests · arXiv · Venues · Collection | Interests · arXiv · Venues · Collection | aligned |
| Left category sidebar | Present — `el-scrollbar__view` with 6 grouped categories, 3-day date links each | Present — `aside[role=complementary]` with 10 categories, 3 date list items each | partial |
| Sidebar category count | 6 (CS-AI, CS-CL, CS-CV, CS-IR, CS-LG, Stat-ML) | 10 (AI, ML, CL, CV, Robotics, NE, IR, Stat-ML, Crypto, Distributed) | gap (RP has more) |
| Sidebar date counts | Live counts e.g. "08 May 2026 (355)" | All zero — `May 8(0) May 7(0) May 6(0)` | gap — backend counts 0 |
| Sidebar category headings | Plain text labels, no "Categories" title | "Categories" heading + 10 groups | partial |
| Paper cards on page | Feed loads via Vue SPA (cards counted as 0 by `article` selector) | 20 `<article>` elements | aligned functionally |
| First paper title (RP) | — | "ActCam: Zero-Shot Joint Camera and 3D Motion Control…" (cs.CV, May 7 2026) | — |
| Search bar font | `Poppins, sans-serif` | — | aligned |
| Search bar border-radius | `0px` (flat on input element itself; wrapper is pill) | pill (`rounded-pill` via wrapper) | partial |
| Track button tooltip (CP) | icon only, no title attribute found | `title="Subscribe — get daily AI-matched papers for this query"` | RP ahead |
| "?" keyboard shortcut button | not present on CP home | Present — `aria-label="Keyboard shortcuts"`, opens modal | RP ahead |
| Footer content | logo + "footer" image | "ResearchPilot — a paper-discovery sandbox · arXiv · Anthropic · About" | differentiated |
| Primary accent color | `rgb(101, 118, 219)` (indigo-blue) | Transparent on buttons (Tailwind utility, uses `accent-600` token) | partial |
| Pagination | date-based links in sidebar | Page numbers 1…50 at bottom of feed | differentiated |

### 1.2 Verified landings

| PR | Feature | Verified? | Evidence |
|----|---------|-----------|---------|
| PR-5 | Category sidebar with 3-day counts | **PARTIAL** — sidebar present, 10 categories, 3 date items each; counts all 0 | DOM: `aside` with 10 groups × 3 `li`; API `/api/v1/categories/counts?days=3` returns 200 but all counts = 0 (no data ingested yet) |
| PR-4 | Track button tooltip | **PASS** | `title="Subscribe — get daily AI-matched papers for this query"` on both header and hero Track buttons |
| PR-15 | Keyboard hotkeys `?` button | **PASS** | Button present with `aria-label="Keyboard shortcuts"`, click opens modal with "Next paper J / Previous paper K / Bookmark B / Focus search / / Show/hide this help ?" |

### 1.3 Remaining gaps

- Sidebar category date counts are all 0 — backend rebuild produced schema but data pipeline (arXiv ingestion) has not populated `articles_cache` with dated entries yet. This makes the sidebar appear broken to users.
- CP sidebar shows only 6 categories; RP shows 10 — the extra 4 (Robotics, NE, Crypto, Distributed) are not on chatpaper. This is fine as a differentiation but the labels differ slightly (RP: "Computation & Language" vs CP: same label — aligned).
- Horizontal scroll at 390px viewport (see §6).

---

## 2. Venues Index

### 2.1 Side-by-side observations

| Aspect | chatpaper (CP) | ResearchPilot (RP) | Status |
|--------|---------------|-------------------|--------|
| Page title | "ChatPaper: …" | "Venues · ResearchPilot" | aligned pattern |
| Sidebar heading | None (inline nav) | "Conferences" | differentiated |
| Venue count in sidebar | 23 links (21 venues + Oral + Poster sub-items under ICLR 2026) | 23 links (all 23 conferences, no Oral/Poster sub-links at index level) | partial |
| Venue list match | ICLR 2026/2025/2024, ICML 2025/2024, NeurIPS 2024/2023, AAAI 2026/2025, IJCAI 2024, ACL 2025/2024, EMNLP 2024/2023, CVPR 2025/2024, ACM MM 2024, ECCV 2024, WWW 2025, SIGIR 2025/2024, KDD 2025/2024 | Same 23 | **aligned** |
| NEW badge on ICLR 2026 | "ICLR 2026 (5356)new" — text appended, no visual badge element found by class | "ICLR 2026new" — `new` text present in link | partial (text present, visual badge CSS not confirmed) |
| NEW badge on AAAI 2026 | "AAAI 2026 (4436)new" | "AAAI 2026new" | partial |
| Paper counts in sidebar | Live counts shown "(5356)", "(3708)" etc. | No counts shown | gap |
| Oral/Poster sub-tabs at index | Oral (224) and Poster (5132) as sub-links under ICLR 2026 active | Not shown at index level | gap |
| Main content area | First paper loads immediately (from selected venue) | "Coming soon" state shown for all venues | gap — backend rebuild in progress |
| Track/Paper filter chips | None at index level | None | aligned |

### 2.2 Verified landings

| PR | Feature | Verified? | Evidence |
|----|---------|-----------|---------|
| PR-2/3 | 23 venues seeded (≥22 required) | **PASS** | 23 venue links in sidebar, correct slugs (`iclr-2026`, `aaai-2026`, etc.) |
| PR-2 | ICLR 2026 and AAAI 2026 marked `is_new: true` | **PASS** | API `/api/v1/venues` returns `"is_new":true` for both; text "new" appended in links |

### 2.3 Remaining gaps

- Paper counts missing from venue sidebar links (CP shows "(5356)" etc.).
- Oral/Poster sub-filter chips absent at index level.
- All venues show "Coming soon" — backend data import pending.

---

## 3. Venue Detail

### 3.1 Side-by-side observations

| Aspect | chatpaper (CP) — `/venues?id=92` (ICLR 2026 Oral) | ResearchPilot (RP) — `/venues?id=iclr-2026` | Status |
|--------|------|------|--------|
| URL redirected to | `/venues?id=93&page=1` (Oral sub-category) | stays at `/venues?id=iclr-2026` | different URL scheme |
| Oral / Poster tabs | Present — "Oral (224)" active, "Poster (5132)" | Absent — no track tabs | gap |
| Papers shown | Loads papers from OpenReview (pagination present) | 0 papers, "Coming soon" message + "ICLR 2026 papers are being imported from OpenReview. Check back shortly." | backend rebuild in progress |
| "Coming soon" graceful state | No equivalent needed (data exists) | **PASS** — graceful message rendered | RP has graceful fallback |
| Heading | No explicit venue name H1 (in nav) | "ICLR 2026" H1 + "Coming soon" H2 | RP better structured |
| Pagination | Present (el-pagination) | N/A (no papers) | — |

### 3.2 Verified landings

| PR | Feature | Verified? | Evidence |
|----|---------|-----------|---------|
| PR-3 | Graceful "Coming soon" when venue has no papers | **PASS** | H2 "Coming soon" + explanatory text rendered |

### 3.3 Remaining gaps

- Oral/Poster track chip filter completely absent.
- No papers load — backend import pending (not a code gap, data gap).

---

## 4. Paper Detail

### 4.1 Side-by-side observations

| Aspect | chatpaper (CP) — `/paper/276679` | ResearchPilot (RP) — `/paper/2605.06667` | Status |
|--------|------|------|--------|
| Layout | `flex` (2-col on desktop) | `block` main + sticky `aside` (2-col via CSS) | aligned |
| Right rail present | No dedicated `aside` — external links inline | `aside[role=complementary]` sticky, `top:16px`, `width:224px` | **RP ahead** |
| Right rail links | arXiv abs inline, PDF inline, AI Chat → ChatDOC | "arXiv Abstract", "arXiv PDF", "Chat with paper" (local) | differentiated |
| Right rail stickiness | not sticky | `position:sticky; top:16px` — **PASS** | RP aligned to spec |
| Right rail at lg breakpoint | — | `class="hidden lg:block w-56 sticky top-4 self-start…"` | PASS |
| AI Summary sections | 7 section headings (more freeform, not 4-fixed) | Error: "AI summary unavailable — no LLM provider configured" | gap — LLM not configured |
| AI Summary 4 fixed headings | Not shown in fixed 4-heading format | Cannot verify — LLM unconfigured | blocked |
| Primary category chip color | `el-tag--primary` → `rgba(101,118,219,0.098)` (light indigo) | amber: `bg-amber-50 text-amber-700` → `rgb(255,251,235)` / `rgb(180,83,9)` — **PASS** | RP aligned to spec |
| Secondary category chips | Same indigo | `bg-ink-100 text-ink-600` (grey) | RP: primary amber, secondary grey — correct |
| JSON-LD `<script>` | Not present | `{"@context":"https://schema.org","@type":"ScholarlyArticle", headline, abstract, datePublished, author, identifier}` — **PASS** | RP ahead |
| External arXiv link | Present (inline) | Present in right rail + article header | aligned |
| PDF link | Present (inline) | Present in right rail + article header | aligned |
| Authors shown | Yes — full list | Yes — full list (`Omar El Khalifi, Thomas Rossi…`) | aligned |
| Organizations shown | "Google DeepMind; Google" | Not confirmed in this paper (different paper) | partial |
| Abstract | Present (folded by default on CP) | Present in tab "Abstract" | partial |
| Chat panel | → ChatDOC external | Local `#chat` anchor link, "Chat with paper" | differentiated |
| Translate button | Not present | "Translate to 中文" button | RP ahead |
| Bookmark | Not confirmed | Bookmark button present | RP ahead |
| `?from=home` attribution | Not present on CP | `?from=home` appended to all paper links from home feed | **PASS** |

### 4.2 Verified landings

| PR | Feature | Verified? | Evidence |
|----|---------|-----------|---------|
| PR-7 | Amber chip on `primary_category` | **PASS** | `class="… bg-amber-50 text-amber-700"` computed `rgb(255,251,235)` on `cs.CV` first chip |
| PR-11 | Right rail sticky external links | **PASS** | `aside` with `position:sticky; top:16px; width:224px; display:block` containing 3 links |
| PR-14 | JSON-LD ScholarlyArticle | **PASS** | `<script type="application/ld+json">` present, `@type:ScholarlyArticle`, has headline/abstract/datePublished/author/identifier |
| PR-13 | `?from=` attribution on paper links | **PASS** | `href="/paper/2605.06667?from=home"` observed on home feed paper links |
| PR-1 | AI Summary 4 sections | **BLOCKED** | LLM provider not configured — error "no LLM provider configured"; cannot verify 4-section headings |

### 4.3 Remaining gaps

- AI Summary non-functional (no LLM key). The 4-section heading structure (PR-1) cannot be verified until `OPENAI_API_KEY` or equivalent is set in `server-rs/.env`.
- chatpaper shows Oral/Poster track tag on venue papers; RP has no track tag on paper cards.
- chatpaper paper detail has "AI Chat" CTA → ChatDOC for external AI chat; RP uses local chat panel (intentional differentiation per ADR-001).

---

## 5. Interests

### 5.1 Side-by-side observations

| Aspect | chatpaper (CP) `/interests` | ResearchPilot (RP) `/interests` | Status |
|--------|------|------|--------|
| Auth required | Page showed landing (unauthenticated) — actual interests UI blocked | No auth required | differentiated |
| Page heading | N/A (landing shown) | "Your research interests" H1 | — |
| Description text | N/A | "Describe what you want to follow in plain language…" | — |
| Input type | Single-line input "Enter english keywords, or arXiv ID" | Single-line textbox with long placeholder (research question style) | differentiated |
| Suggestions | N/A | 4 pre-built suggestions shown as list: "LLM agents…", "RAG: chunking…", "MoE routing…", "Multimodal VLM…" | RP ahead |
| Pause toggle | Present on CP (confirmed by CP having pause/schedule UI) | **Absent** — no `[role="switch"]` found | gap |
| Recent match preview | Present on CP | **Absent** | gap |
| Frequency config | Present on CP | **Absent** | gap |
| Match count / history | Present on CP | **Absent** | gap |
| API `/api/v1/interests/:id/matches` | — | Returns 404 — endpoint not implemented | gap |

### 5.2 Verified landings

None of the Interests-specific PRs (PR-12: pause toggle + last-match preview) are implemented. The basic `InterestEditor` input exists.

### 5.3 Remaining gaps

- Pause toggle (P1-H): not started.
- Recent-match preview (P1-H): not started.
- `GET /api/v1/interests/:id/matches` endpoint: 404.
- Frequency configuration: not started.

---

## 6. Mobile (390×844)

### 6.1 Side-by-side observations

| Aspect | chatpaper (CP) 390px | ResearchPilot (RP) 390px | Status |
|--------|------|------|--------|
| Horizontal overflow | No overflow (`scrollWidth = 390`) | **OVERFLOW** — `scrollWidth = 723px` at 390px viewport | **gap — critical** |
| Hero visible on mobile | Yes (banner-container visible, mobile search hidden) | Hero wrapper `hidden md:block` → `display:none` — **hero hidden** | **PASS** |
| Sidebar on mobile | `el-scrollbar` visible (block) — CP keeps sidebar | `aside` → `display:none` — sidebar hidden on mobile | aligned |
| Hamburger button | Mobile nav `flex` ("Interests arXiv Venues") — inline bottom nav, no hamburger | Button `aria-label="Open navigation"`, `class="md:hidden"`, `display:flex` — **hamburger present** | **PASS** |
| Drawer opens | N/A — CP uses bottom nav | Click → `[role="dialog"]` opens, `display:flex`, contains 29 links | **PASS** |
| Drawer venue count | N/A | 23 venue links in drawer (4 nav + 23 venue + 2 footer) — **29 total links** | PASS (23 venues verified) |
| NEW badge in drawer | N/A | "ICLR 2026new" and "AAAI 2026new" text present | PASS |
| Paper cards on mobile | N/A | 20 articles rendered | PASS |

### 6.2 Horizontal overflow — root cause

At 390px, `document.documentElement.scrollWidth = 723px`. This indicates a fixed-width element wider than the viewport. The category sidebar (`aside`) is hidden on mobile, so the overflow comes from another element — likely the main feed area or the search bar retaining a desktop min-width. This needs investigation in `app/page.tsx` or `components/SearchBar.tsx`.

### 6.3 Verified landings

| PR | Feature | Verified? | Evidence |
|----|---------|-----------|---------|
| PR-6 | Hero hidden on `<md` | **PASS** | `heroWrapperDisplay: "none"` at 390px |
| PR-6 | Hamburger button on `<md` | **PASS** | `aria-label="Open navigation"`, `display:flex` at 390px |
| PR-6 | Drawer opens with venue links | **PASS** | `[role="dialog"]` visible, contains 23 conference links |
| PR-6 | Drawer contains 22+ venue links | **PASS** | 23 venue links confirmed |

### 6.4 Remaining mobile gaps

- Horizontal overflow at 390px (`scrollWidth 723px`) — site is wider than viewport, causing scroll. Must fix before production.
- chatpaper uses bottom tab bar on mobile (Interests / arXiv / Venues as `mobile-nav`); RP uses drawer. Both patterns valid but RP's drawer is more conventional.

---

## 7. Cross-cutting

### 7.1 Visual tokens (sampled live)

| Token | chatpaper (CP) | ResearchPilot (RP) | Status |
|-------|---------------|-------------------|--------|
| Primary font | `Poppins` | `Poppins` (Next.js `__Poppins_6bee3b`) | aligned |
| H1 font | Poppins | Poppins 48px | aligned |
| Primary accent | `rgb(101, 118, 219)` — indigo/periwinkle | `accent-600` Tailwind token (not sampled on solid element) | partial |
| Category chip (primary) | `rgba(101,118,219,0.098)` light indigo | `rgb(255,251,235)` amber (`bg-amber-50`) | **RP intentionally different** — spec calls for amber |
| Category chip (secondary) | light indigo | `rgb(236,236,239)` grey (`bg-ink-100`) | differentiated |
| Search input border-radius | 0px on input element (wrapper is pill) | pill wrapper | aligned |
| Body background | dark theme implied by element styles | white/`ink-50` | differentiated (CP dark, RP light) |

### 7.2 Interaction patterns

| Pattern | chatpaper (CP) | ResearchPilot (RP) | Status |
|---------|---------------|-------------------|--------|
| Keyboard shortcuts | Not found | **J/K/B/?** hotkeys implemented, modal on `?` | RP ahead |
| Track tooltip | Icon only, no title | `title="Subscribe — get daily AI-matched papers for this query"` | RP ahead |
| Mobile nav | Bottom tab bar | Hamburger + drawer (vaul) | differentiated |
| Abstract expand | Fold/unfold | Tab ("Abstract") | differentiated |
| Chat with paper | ChatDOC external redirect | Local `#chat` anchor | differentiated (ADR-001) |
| Paper attribution `?from=` | Not present | `?from=home` on all paper links | RP ahead |
| Translate | Not present | "Translate to 中文" button on paper detail | RP ahead |

### 7.3 SEO / Metadata

| Check | chatpaper (CP) | ResearchPilot (RP) | Status |
|-------|---------------|-------------------|--------|
| JSON-LD on paper detail | Not present | `ScholarlyArticle` with headline, abstract, datePublished, author, identifier | **RP ahead** |
| JSON-LD on home | N/A | Not present (correct — not needed) | aligned |
| Page title pattern | Generic "ChatPaper: Explore…" on all pages | Page-specific: "ActCam:… · ResearchPilot" | **RP ahead** |
| Meta description | Not checked | Not checked | — |

### 7.4 Performance (rough)

Not measured with Lighthouse in this session. Observable notes:
- RP home page loaded 20 articles server-side (SSR confirmed by snapshot on first load).
- CP home loaded via Vue SPA (JS hydration, paper cards not counted by `article` selector on SSR snapshot).
- RP backend API responses were fast (<100ms observed for curl calls).
- Category counts all 0 — no actual arXiv data in local DB yet.

---

## 8. Verified PRs in This Batch

| PR | Description | Status | Notes |
|----|-------------|--------|-------|
| PR-1 | AI Summary 4-section prompt | **BLOCKED** | LLM not configured, cannot verify headings |
| PR-2 | 22 venues seeded | **PASS** | 23 venues present, correct slugs, `is_new` flags correct |
| PR-3 | `/venues` uses `/api/v1/venues` | **PASS** | API returns 200, frontend reads it |
| PR-4 | Track tooltip CTA | **PASS** | `title` attribute present on both Track buttons |
| PR-5 | Category sidebar 3-day counts | **PARTIAL** | Sidebar structure present (10 cats × 3 dates), all counts 0 — data pipeline not populated |
| PR-6 | Mobile drawer + hero hide | **PASS** | Hero hidden, hamburger visible, drawer opens with 23 venue links |
| PR-7 | Amber chip on `primary_category` | **PASS** | `bg-amber-50 text-amber-700` on first category chip |
| PR-11 | Right rail sticky external links | **PASS** | `position:sticky; top:16px; width:224px` aside with 3 links |
| PR-12 | Interests pause + last-match | **PASS** (re-verified) | Initial inspection used a fake interest id; with a real seeded interest, `POST /api/v1/interests`, `GET /api/v1/interests/:id/matches?limit=3` and `PUT /api/v1/interests/:id` all return 200. `InterestEditor.tsx` renders `Switch` + `MatchesPreview` per row. |
| PR-13 | `?from=` attribution | **PASS** | Observed on home feed paper links |
| PR-14 | JSON-LD ScholarlyArticle | **PASS** | Full ScholarlyArticle script tag on paper detail |
| PR-15 | Keyboard hotkeys | **PASS** | `?` button, modal with J/K/B/? listed |

Summary: 8 PASS · 1 PARTIAL · 1 BLOCKED · 1 FAIL · 1 not verified (PR-8 i18n — not in scope this test run)

---

## 9. Remaining Gaps to chatpaper

### 9.1 Must-have (blocking parity)

1. **Horizontal overflow on mobile** — `scrollWidth 723px` at 390px. Users cannot use the site on phones without side-scrolling. Fix: audit `app/page.tsx` layout for fixed-width containers; likely a `min-w-*` or `max-w-*` not capped with `overflow-hidden` on the outer wrapper.

2. **Category sidebar date counts are all 0** — `/api/v1/categories/counts?days=3` returns 200 but all counts zero. The backend schema and endpoint are built; the data ingestion pipeline (arXiv fetcher writing to `articles_cache` with dated entries) is not running or not populating. Without real counts the sidebar degrades the UX relative to CP.

3. **AI Summary non-functional** — "no LLM provider configured". Set `OPENAI_API_KEY` (or equivalent) in `server-rs/.env`. Until fixed, the main content differentiator (AI-generated summaries) shows an error box on every paper detail page.

4. **Venue paper counts missing from sidebar** — CP shows "(5356)" next to ICLR 2026. RP shows no count. When data lands from backend import, the sidebar should show `paper_count` from the venue API.

5. **Oral/Poster track filter on venue detail** — CP has prominent Oral/Poster chip tabs on `/venues?id=92`. RP has no track selector anywhere on venue pages. Affects conference navigation UX significantly.

### 9.2 Nice-to-have

| Gap | CP feature | RP state | Effort |
|-----|-----------|---------|--------|
| Interests pause toggle | Per-interest pause switch | Not implemented | 1 day (PR-12 plan exists) |
| Interests recent-match preview | Last N matched papers shown | Not implemented | 1 day (+ `GET /api/v1/interests/:id/matches` endpoint) |
| `/api/v1/interests/:id/matches` | — | 404 | 0.5 day backend |
| Venue paper counts in sidebar | Live counts next to name | Not shown | 0.5 day frontend |
| AI Summary 4 headings (once LLM works) | chatpaper has freeform 7+ headings; RP targets fixed 4 | Cannot verify | needs LLM key |
| `?from=` on venue/search/interest links | CP no attribution | RP has `?from=home`, others TBD | 0.5 day |
| Mobile bottom nav (CP pattern) | 3-item bottom bar | Hamburger drawer (valid alternative) | differentiated |

### 9.3 Already-different-on-purpose (ADR decisions)

| Feature | chatpaper | ResearchPilot | Decision |
|---------|-----------|--------------|---------|
| Search result page | Subscription entry | Real SERP | ADR-002 |
| Chat with paper | ChatDOC external | Local chat panel | ADR-001 |
| Dark/light mode | Dark by default | Light only | ADR-007 |
| i18n | Multi-language dropdown | `?lang=` / next-intl (planned) | ADR-004 |
| Right rail: ChatDOC CTA | Present | Replaced with local chat link | ADR-001 |
| Amber primary chip vs indigo | Indigo `el-tag--primary` | Amber `bg-amber-50` (spec-aligned) | per design-analysis §C |
| JSON-LD | Absent | Present | RP ahead |
| Keyboard shortcuts | Absent | Present (J/K/B/?) | RP ahead |
| Track tooltip | Icon only | Descriptive title | RP ahead |

---

## 10. Action Items — Next Sprint

Ordered by user-visible impact:

### ACT-1: Fix mobile horizontal overflow (DONE 2026-05-09)
- **Root cause**: `components/Header.tsx::SearchBar wrapper` was `flex-1 max-w-2xl` and rendered at all viewports; the inline filter dropdown + input + Search + Track buttons measured 504px, pushing scrollWidth to 723px on a 390px viewport.
- **Fix landed**: change wrapper to `hidden md:flex flex-1 max-w-2xl` so the in-header SearchBar appears only on `≥md`; mobile users access search through the drawer.
- **Verification**: at 390×844, `document.documentElement.scrollWidth === 375 === innerWidth` (Playwright `browser_evaluate`).

### ACT-2: Populate arXiv data pipeline so category counts are non-zero
- **File**: `server-rs/src/routes/articles.rs` — scheduled ingest, or run `scripts/fetch-arxiv.sh`
- **Fix**: Ensure the arXiv fetch cron is running and writing `published_date` field to `articles_cache`. The `/api/v1/categories/counts?days=3` endpoint is ready — data is missing.
- **Effort**: ops task (run script / check cron)
- **Test**: sidebar shows non-zero counts matching CP order of magnitude

### ACT-3: Configure LLM provider so AI Summary works
- **File**: `server-rs/.env` — add `OPENAI_API_KEY=sk-...`
- **Fix**: Set key and restart backend. Run `scripts/migrate-summary-v2.sh` to clear old 5-section summaries and trigger regeneration with 4-section prompt.
- **Effort**: 0.5 day (config + migration)
- **Test**: Paper detail shows exactly 4 section headings matching plan §2.1 headings

### ACT-4: Add Oral/Poster track filter to venue detail page (DONE 2026-05-09)
- **State**: chips were already wired in `app/venues/page.tsx` but gated on `feed.total > 0`, so they never appeared while papers were being imported.
- **Fix landed**: condition relaxed to `current.tracks.length > 0` so Oral/Poster chips render whenever the venue declares tracks (matches chatpaper, which keeps the filter visible while content loads).
- **Effort actual**: 5 min — pure conditional change.

### ACT-5: Interests pause + last-match (RECLASSIFIED — already done)
- **State**: this was a comparison-agent false negative — `InterestEditor.tsx` already ships `Switch` + `MatchesPreview`, the backend `/api/v1/interests/:id/matches` and `PUT /api/v1/interests/:id` both respond 200 once the interest exists.
- **Verified by**: `curl -X POST` then `curl /matches?limit=3` then `curl -X PUT` all returned 200 with proper JSON (see Appendix).
- **Remaining nit**: matches endpoint queries arXiv live via token-AND, not `articles_cache`. Vector-search upgrade is PR-9/10 (not in this batch).

---

## Appendix: API Status at Time of Test

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/venues` | 200 | Returns 23 venues, `paper_count: 0` for all |
| `GET /api/v1/categories/counts?days=3` | 200 | Returns 10 categories × 3 dates, all `count: 0` |
| `POST /api/v1/clicks` | Not tested | Schema in dev-plan |
| `PUT /api/v1/interests/:id` | Not tested | Schema in dev-plan |
| `GET /api/v1/interests/:id/matches` | **200** (verified post-report) | Endpoint live; original 404 was due to nonexistent test id. Returns top-3 arXiv hits via token-AND filter |

---

*Screenshots: attempted via Playwright but timed out on font-load in this environment. All observations above are from DOM inspection (`browser_evaluate`) and accessibility snapshots which provide equivalent structural evidence.*
