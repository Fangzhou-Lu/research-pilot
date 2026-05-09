# ResearchPilot

A daily AI-curated paper feed inspired by ChatPaper. Browses live arXiv preprints, generates structured AI summaries with Anthropic Claude, and lets you chat with any paper.

See `DESIGN.md` for the full architectural write-up (page inventory, API contract, data models, UI flows).

## Quick start

```bash
npm install
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Stack

- Next.js 14 App Router · TypeScript · Tailwind CSS
- arXiv Atom API for paper data (no key needed)
- Anthropic Claude (`@anthropic-ai/sdk`) for AI summary + chat, with prompt caching
- localStorage for interests + bookmarks (no DB)

## Routes

| Route | Description |
|---|---|
| `/` | Daily arXiv feed, paginated, category-filterable |
| `/interests` | Track research interests in plain language |
| `/venues` | Browse by arXiv subject area |
| `/search?q=…` | Full-text search across arXiv |
| `/paper/[id]` | Paper detail with AI Summary / Abstract / Chat tabs |
| `/collection` | Locally-bookmarked papers |

## API routes

| Endpoint | Purpose |
|---|---|
| `GET /api/article?id=…` | Fetch a single arXiv paper |
| `POST /api/summarize` | Generate structured AI summary |
| `POST /api/chat` | Stream Anthropic chat about a paper (SSE-style text stream) |

If `ANTHROPIC_API_KEY` is unset, AI summary and chat return 503 with a helpful message; the rest of the app works.
