"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, Inbox } from "lucide-react";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";

type BookmarkOut = {
  article_id: string;
  bookmarked_at: number;
  arxiv_id: string;
  title: string;
  abstract: string;
  authors: string[];
  organizations: string[];
  primary_category: string;
  pdf_url: string;
  abs_url: string;
};

export function CollectionView() {
  const [items, setItems] = useState<BookmarkOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    authedFetch(PATHS.bookmarks)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (alive) setItems(j.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="mt-10 text-center text-ink-400">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="mt-12 rounded-lg border border-dashed border-ink-200 bg-white px-8 py-16 text-center">
        <Inbox className="h-10 w-10 mx-auto text-ink-300" />
        <p className="mt-4 text-ink-500 text-sm">
          No papers yet. Tap the bookmark icon on any paper to save it here.
        </p>
      </div>
    );
  }
  return (
    <ul className="mt-6 space-y-2">
      {items.map((a) => (
        <li
          key={a.article_id}
          className="rounded-md border border-ink-200 bg-white px-4 py-3 hover:border-ink-300"
        >
          <div className="flex items-start gap-3">
            <BookmarkCheck className="h-4 w-4 mt-1 shrink-0 text-accent-600" />
            <div className="flex-1 min-w-0">
              <Link
                href={`/paper/${a.article_id}?from=collection`}
                className="text-sm font-medium hover:text-accent-600 line-clamp-2"
              >
                {a.title}
              </Link>
              <div className="mt-1 text-xs text-ink-500">
                {a.authors.slice(0, 4).join(", ")} · {a.primary_category}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
