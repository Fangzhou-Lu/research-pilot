"use client";

import { useEffect, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import type { Article } from "../lib/types";
import { fmtDate } from "../lib/utils";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { getShowTranslation, setShowTranslation } from "../lib/storage";
import { BookmarkButton } from "./BookmarkButton";

const TARGET_LANG = "zh-CN";

export function PaperHeader({ article }: { article: Article }) {
  const [showTrans, setShowTrans] = useState(false);
  const [trans, setTrans] = useState<{ title: string; abstract: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowTrans(getShowTranslation());
  }, []);

  const toggle = async () => {
    if (busy) return;
    const next = !showTrans;
    setShowTrans(next);
    setShowTranslation(next);
    if (next && !trans) {
      setBusy(true);
      setError(null);
      try {
        const r = await authedFetch(PATHS.translate, {
          method: "POST",
          body: JSON.stringify({
            article_id: article.id,
            language: TARGET_LANG,
            title: article.title,
            abstract: article.abstract,
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as { title: string; abstract: string };
        setTrans(j);
      } catch (e) {
        setError((e as Error).message);
        setShowTrans(false);
        setShowTranslation(false);
      } finally {
        setBusy(false);
      }
    }
  };

  const title = showTrans && trans ? trans.title : article.title;

  return (
    <>
      <h1
        id="paper-abstract"
        className="text-2xl sm:text-3xl font-semibold leading-tight text-zinc-900 scroll-mt-20"
      >
        {title}
      </h1>
      {showTrans && trans && (
        <p className="mt-2 text-sm text-zinc-500 italic">{article.title}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span className="font-mono">{article.arxiv_id}</span>
        <span>{fmtDate(article.published)}</span>
        {article.categories.slice(0, 4).map((c) => (
          <span
            key={c}
            className={`rounded px-2 py-0.5 font-mono font-medium ${
              c === article.primary_category
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {c}
          </span>
        ))}
      </div>
      {article.authors.length > 0 && (
        <p className="mt-4 text-sm text-zinc-700 leading-relaxed">{article.authors.join(", ")}</p>
      )}
      {article.organizations.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500">{article.organizations.join(" · ")}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
            showTrans
              ? "border-accent-300 bg-accent-50 text-accent-700"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
          } disabled:opacity-50`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
          {showTrans ? "中文 ✓" : "Translate to 中文"}
        </button>
        <BookmarkButton articleId={article.id} article={article} />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {showTrans && trans && (
        <div className="mt-6 rounded-md border border-accent-200 bg-accent-50 p-4 text-sm text-zinc-800 leading-relaxed whitespace-pre-line">
          {trans.abstract}
        </div>
      )}
    </>
  );
}
