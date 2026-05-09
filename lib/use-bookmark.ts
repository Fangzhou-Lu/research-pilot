"use client";

// Subscribe to a paper's bookmark state. The hook seeds itself from
// /api/v1/bookmarks/check, then listens for the "rp:bookmark-changed"
// CustomEvent that BookmarkButton dispatches whenever the user toggles
// a bookmark — so AISummary / PaperRightRail / PaperCard can decide
// whether to send `generate: true` to the LLM endpoints.

import { useEffect, useState } from "react";
import { authedFetch } from "./user";
import { PATHS } from "./api";

export const BOOKMARK_EVENT = "rp:bookmark-changed";

export type BookmarkChangeDetail = { articleId: string; marked: boolean };

export function emitBookmarkChange(detail: BookmarkChangeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BOOKMARK_EVENT, { detail }));
}

export function useBookmarked(articleId: string): {
  bookmarked: boolean;
  ready: boolean;
} {
  const [bookmarked, setBookmarked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    setReady(false);
    authedFetch(PATHS.bookmarksCheck, {
      method: "POST",
      body: JSON.stringify({ ids: [articleId] }),
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, boolean>) => {
        if (alive) {
          setBookmarked(Boolean(m?.[articleId]));
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });

    const onChange = (e: Event) => {
      const ev = e as CustomEvent<BookmarkChangeDetail>;
      if (ev.detail?.articleId === articleId) {
        setBookmarked(ev.detail.marked);
      }
    };
    window.addEventListener(BOOKMARK_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(BOOKMARK_EVENT, onChange);
    };
  }, [articleId]);

  return { bookmarked, ready };
}
