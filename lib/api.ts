// Typed wrappers for the Rust backend API.
// Server-safe (no user identity needed): apiList, apiArticle, apiSearch.
// Client-only (needs X-User-Id): use lib/user.ts authedFetch + the path consts.

import { BACKEND_URL, authedFetch } from "./user";
import type { Article, CategoryCount, Interest, Paginated, VenueApi } from "./types";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${text.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

// ─── server-safe (no user header needed) ─────────────────────────────────────

export async function apiList(opts: {
  cat?: string;
  page?: number;
  pageSize?: number;
  date?: string;
}): Promise<Paginated<Article>> {
  const u = new URL(`${BACKEND_URL}/api/v1/articles`);
  if (opts.cat) u.searchParams.set("cat", opts.cat);
  if (opts.page) u.searchParams.set("page", String(opts.page));
  if (opts.pageSize) u.searchParams.set("page_size", String(opts.pageSize));
  if (opts.date) u.searchParams.set("date", opts.date);
  return getJson<Paginated<Article>>(u.toString(), { next: { revalidate: 600 } });
}

export async function apiArticle(id: string): Promise<Article | null> {
  const u = `${BACKEND_URL}/api/v1/article?id=${encodeURIComponent(id)}`;
  try {
    return await getJson<Article>(u, { next: { revalidate: 3600 } });
  } catch {
    return null;
  }
}

export async function apiSearch(opts: {
  q: string;
  page?: number;
  pageSize?: number;
  type?: string;
}): Promise<Paginated<Article>> {
  const u = new URL(`${BACKEND_URL}/api/v1/search`);
  u.searchParams.set("q", opts.q);
  if (opts.page) u.searchParams.set("page", String(opts.page));
  if (opts.pageSize) u.searchParams.set("page_size", String(opts.pageSize));
  if (opts.type) u.searchParams.set("type", opts.type);
  return getJson<Paginated<Article>>(u.toString(), { cache: "no-store" });
}

export async function apiVenues(): Promise<VenueApi[]> {
  const u = `${BACKEND_URL}/api/v1/venues`;
  return getJson<VenueApi[]>(u, { next: { revalidate: 3600 } });
}

export async function apiVenuePapers(
  id: string,
  opts: { page?: number; pageSize?: number; track?: string } = {}
): Promise<Paginated<Article>> {
  const u = new URL(`${BACKEND_URL}/api/v1/venues/${encodeURIComponent(id)}/papers`);
  if (opts.page) u.searchParams.set("page", String(opts.page));
  if (opts.pageSize) u.searchParams.set("page_size", String(opts.pageSize));
  if (opts.track) u.searchParams.set("track", opts.track);
  return getJson<Paginated<Article>>(u.toString(), { next: { revalidate: 300 } });
}

export async function apiCategoryCounts(days = 3): Promise<CategoryCount[]> {
  const u = `${BACKEND_URL}/api/v1/categories/counts?days=${days}`;
  return getJson<CategoryCount[]>(u, { next: { revalidate: 600 } });
}

// ─── client-only constants (route paths) ─────────────────────────────────────

export const PATHS = {
  whoami: "/api/v1/whoami",
  providers: "/api/v1/providers",
  interests: "/api/v1/interests",
  interest: (id: string) => `/api/v1/interests/${encodeURIComponent(id)}`,
  interestMatches: (id: string, limit = 3) =>
    `/api/v1/interests/${encodeURIComponent(id)}/matches?limit=${limit}`,
  recommendations: (id: string) =>
    `/api/v1/interests/${encodeURIComponent(id)}/recommendations`,
  bookmarks: "/api/v1/bookmarks",
  bookmarksCheck: "/api/v1/bookmarks/check",
  summarize: "/api/v1/summarize",
  deepQa: "/api/v1/deep-qa",
  translate: "/api/v1/translate",
  chat: "/api/v1/chat",
  chatHistory: (articleId: string) =>
    `/api/v1/chat-history?article_id=${encodeURIComponent(articleId)}`,
};

// ─── client-only helpers (require X-User-Id, call from components) ───────────

export async function apiPauseInterest(id: string, paused: boolean): Promise<Interest> {
  const r = await authedFetch(PATHS.interest(id), {
    method: "PUT",
    body: JSON.stringify({ paused }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${text.slice(0, 200)}`);
  }
  return (await r.json()) as Interest;
}

export async function apiInterestMatches(id: string, limit = 3): Promise<Article[]> {
  const r = await authedFetch(PATHS.interestMatches(id, limit));
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${text.slice(0, 200)}`);
  }
  return (await r.json()) as Article[];
}
