"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Article } from "../lib/types";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";

export function BookmarkButton({
  articleId,
  article,
}: {
  articleId: string;
  article?: Article;
}) {
  const [marked, setMarked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    authedFetch(PATHS.bookmarksCheck, {
      method: "POST",
      body: JSON.stringify({ ids: [articleId] }),
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, boolean>) => {
        if (alive) setMarked(Boolean(m?.[articleId]));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [articleId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !marked;
    setMarked(next);
    try {
      if (next) {
        let payload = article ?? null;
        if (!payload) {
          // Need full article to insert into bookmarks. Pull from backend.
          const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"}/api/v1/article?id=${encodeURIComponent(articleId)}`);
          payload = (await r.json().catch(() => null)) as Article | null;
          if (!payload) throw new Error("could not load article");
        }
        await authedFetch(PATHS.bookmarks, {
          method: "POST",
          body: JSON.stringify({ article: payload }),
        });
      } else {
        await authedFetch(`${PATHS.bookmarks}?id=${encodeURIComponent(articleId)}`, {
          method: "DELETE",
        });
      }
    } catch {
      setMarked(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={marked ? "Remove bookmark" : "Bookmark"}
      className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500 disabled:opacity-50"
    >
      {marked ? (
        <BookmarkCheck className="h-4 w-4 text-accent-600" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </button>
  );
}
