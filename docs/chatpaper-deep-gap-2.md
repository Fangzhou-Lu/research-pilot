# ChatPaper Deep-Gap Audit (Round 2)

> Generated: 2026-05-09 - Logged in as `stevejob007@outlook.com` (cookie session active)
> Method: Playwright MCP DOM inspection across 9 navigations, 14 evaluate calls.
> Scope: surfaces NOT covered by `docs/feature-gap-comparison.md` (search, collection, auth/paywall, digest, related, authors, sort/filter, paper sub-tabs, notifications, API/extension).

---

## 1. Search SERP behavior

**What chatpaper does** - `https://chatpaper.com/search?q=diffusion+models` does **not** render a SERP. The route is silently ignored - the user is shown the marketing landing (`H1=AI-Powered Library for Researchers`) with the same "Why ChatPaper" cards and footer. There are no result rows, no facets, no related queries, no sort. Forms (4 of them) all submit `GET https://chatpaper.com/search?q=...` but the route never resolves to a results component. The only client-side discovery affordance is the search-scope dropdown (`el-dropdown.search-option-dropdown`) with options: **All Papers / arXiv Papers / Venues Papers / Institution Papers** - but these scopes only re-target the same broken `/search` URL.

**ResearchPilot today** - unknown - not yet inspected for SERP behavior in this round, but the parent comparison report indicates RP intends to ship real results.

**Recommendation** - This is a major chatpaper weakness. RP should ship a true SERP with: per-result card identical to feed card, scope toggle (Papers / Venues / Institutions / Authors), and at minimum year + venue facets. Even a primitive ranked list beats chatpaper's blank page.

---

## 2. Collection / bookmarks page (`/collection`)

**What chatpaper does** - Renders a single-column reverse-chronological list of bookmarked papers. Each row mirrors the feed card: numbered title link, category chip (`cs.AI`), bookmark date ("08 May 2026 collect"), authors, institution chips. Bottom shows el-pagination with prev/next (both disabled when only 1 page). **No folders, no tags, no sort dropdown, no filter, no bulk-select, no multi-delete, no export to BibTeX/CSV/RIS, no search-within-collection.** The page heading is just the marketing "AI-Powered Library for Researchers" banner - there is no "My Collection (N)" header. Direct ChatDOC link on every row enables 1-click chat.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Cheap wins over chatpaper: add (a) collection-scoped search box, (b) sort by date-saved / date-published / venue, (c) tag chips with multi-select filter, (d) BibTeX/RIS export, (e) bulk-select + bulk-delete. Folders are nice-to-have but tags are higher leverage.

---

## 3. Account / login / paywall

**What chatpaper does** - `/login`, `/account`, `/pricing` all redirect to `/interests` (no dedicated routes). Auth is handled via a popover dropdown attached to the avatar in the header - menu reads literally `stevejob007 / stevejob007@outlook.com / My Collections / Sign out`. **No pricing tier, no paywall message, no upgrade CTA, no plan selector, no usage limits surfaced.** The sole monetization touchpoint is the deep-link from each paper to ChatDOC (separate product) via `chat_url=&chat_source=chat_paper`. Login providers were not surfaced (cookie was already set), but there is no visible Google/GitHub/email button on the public site.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Chatpaper offers no paid surface at all on the chatpaper.com domain - the business model is funneling to ChatDOC. RP can differentiate cleanly by either (a) staying free with a clear "no paywall" footer note, or (b) shipping an honest pricing page with researcher / team tiers. Either way, expose `/account` with theme + email-digest preferences.

---

## 4. Daily digest / email subscription

**What chatpaper does** - **Not present.** Zero hits for "digest", "subscribe", "email", "notify" anywhere on `/`, `/interests`, `/collection`, or `/paper/*`. No newsletter form, no email-capture modal, no unsubscribe link. The "Interest-Driven Paper Curation" copy claims "you'll get relevant papers every day" but only via the on-site interests feed - there is no out-of-product delivery channel. No RSS feed link in the head either.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Quick differentiator. Add a "Subscribe to digest" CTA on `/interests` and on each Track-button popover with: frequency (daily / weekly), delivery channel (email, RSS, ICS), preview, and one-click unsubscribe token. This is genuinely missing from chatpaper.

---

## 5. Related papers / recommendations

**What chatpaper does** - **Not present** on the paper detail page. Inspected `/paper/276679`: no "Related Papers" rail, no "Cited by" list, no citation graph, no "More from this author", no "Similar in this venue". The right-rail container is empty. The only outbound discovery is the category chip `cs.AI` (jumps to category feed) and the venue text. Word "related" appears only inside the AI-summary body text, not as a section.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - High-leverage gap. RP should add at minimum: (a) "Related papers" rail (semantic similarity, 5-10 items), (b) "Cited by" count + list when arxiv/SemanticScholar data available, (c) "More from these authors" once author pages exist (see #6).

---

## 6. Author pages

**What chatpaper does** - **No author pages.** Author names render as a single concatenated text node inside `.doc-author.special` (e.g. `"Daniel Zheng, Ingrid von Glehn, Yori Zwols, Iuliya Beloshapka, Lars Buesing, Dan..."`). There is no `<a href="/author/*">` link, no h-index, no publication list, no co-author graph. Institution names ARE shown as text (`Google DeepMind; Google`) but also unlinked.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Build `/author/{slug}` and `/institution/{slug}` pages. Even a simple stub (papers list + venue distribution) is more than chatpaper offers. Linkify author and institution chips on cards and on paper detail.

---

## 7. Sort / filter on home feed

**What chatpaper does** - **No sort dropdown, no time-window chips ("Last 24h / Week / Month"), no "Trending" or "Hottest" tab.** The feed is grouped by category (sidebar id parameter, e.g. `?id=2&date=1778169600&page=1`) and within category by date, with paper counts shown per day - e.g. `"08 May 2026 (355) / 07 May 2026 (188) / 06 May 2026 (186)"`. That's it. Pagination is per category-day. Order within a day appears to be ingestion order (no "most cited today").

**ResearchPilot today** - unknown - not yet inspected; comparison report mentions a 50-page paginator.

**Recommendation** - Add sort dropdown: `Newest / Trending today / Most cited / Most discussed`, plus time-window chips. This becomes a clear product wedge - chatpaper is purely chronological-by-category.

---

## 8. Paper detail tabs / sub-sections beyond AI Summary

**What chatpaper does** - Top-level tabs: **`AI Summary` | `Paper`**. Inside `AI Summary`, secondary segmented control: **`Core Points` / `Methods` / `Experiments`**. The `Paper` tab loads the full HTML/MD body. There is **no References tab, no Citations tab, no Comments tab, no Code/Datasets tab, no Figures tab.** Only the first arxiv PDF link (`arxiv.org/pdf/2605.06651`) and a ChatDOC deep-link sit in the right margin. No GitHub link, no HuggingFace link, no YouTube/podcast.

**ResearchPilot today** - unknown - parent report doesn't enumerate tabs.

**Recommendation** - The `Core Points / Methods / Experiments` triad is a strong UX pattern - mirror it. Then leapfrog by adding `References` (resolved via arXiv/SS), `Code` (auto-detected GitHub from PDF), `Figures` (extracted), and `Comments`. Use Element-Plus segmented control (`el-radio-group` with `is-button`) for visual parity.

---

## 9. Notifications / activity

**What chatpaper does** - **No bell icon, no notification center, no activity feed.** Header contains: logo, search bar, "All" scope, language dropdown (EN), preview-mode dropdown (Simple/Detailed), avatar dropdown. The avatar dropdown is the only personalized surface and contains no badge/unread state. No "what's new since you last visited", no toast for newly-matched-interests papers.

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Low priority for v1, but a small win: a bell with "N new papers match your interests since last visit" is differentiating and fits the daily-feed metaphor. Tie to the digest in #4.

---

## 10. Browser extension / API offerings

**What chatpaper does** - **None on chatpaper.com.** Footer contains: `Disclaim - Policy - Terms - Twitter - Discord - Blog - Changelog`. Blog and Changelog point to `chatdoc.com` (sister product). No `/api`, no `/docs`, no `/extension`, no Chrome Web Store badge, no public API documentation, no Zotero/Obsidian integration mentioned. Body text was scanned for `\bapi\b`, `extension`, `chrome`, `firefox` - zero matches. (Note: `chatdoc.com/log/` errored with `ERR_CONNECTION_CLOSED` so I couldn't verify the changelog itself, but no surface on chatpaper.com promotes an extension/API.)

**ResearchPilot today** - unknown - not yet inspected.

**Recommendation** - Even a stub `/api` page documenting one endpoint (`GET /papers?q=...`) plus an "Open in Zotero" / "Add to Obsidian" link on each paper card would put RP ahead of chatpaper on power-user hooks. Browser extension can wait, but advertise it as "coming soon" if planned.

---

## Top-5 prioritized things RP should add

1. **Real SERP for `/search?q=`** with scope toggle (Papers/Venues/Institutions/Authors) + year/venue facets - chatpaper's `/search` route is broken; this is a free win.
2. **Related papers + Cited-by rails on paper detail** - chatpaper has zero discovery once you land on a paper; semantic-similar + citation list is high leverage.
3. **Author + Institution pages** (`/author/{slug}`, `/institution/{slug}`) with linkified chips on cards - chatpaper renders authors as plain text dead-ends.
4. **Email digest / RSS subscription** with frequency + unsubscribe - chatpaper's "daily papers" promise has no out-of-product delivery; RP can own this channel.
5. **Collection power-user features**: collection-scoped search, sort, tags, BibTeX/RIS export, bulk-select - chatpaper's `/collection` is a flat list with zero affordances.

Honorable mentions: paper detail `References` + `Code` tabs (mirror chatpaper's Core/Methods/Experiments segmented control, then extend); pricing/account page (chatpaper has neither); sort dropdown on home feed.
