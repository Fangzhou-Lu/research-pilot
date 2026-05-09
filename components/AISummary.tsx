"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, AlertCircle, Bookmark } from "lucide-react";
import type { AISummary as AISummaryType, Article } from "../lib/types";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { useBookmarked } from "../lib/use-bookmark";

export function AISummary({ article }: { article: Article }) {
  const [data, setData] = useState<AISummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsBookmark, setNeedsBookmark] = useState(false);
  const { bookmarked, ready } = useBookmarked(article.id);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    setNeedsBookmark(false);
    authedFetch(PATHS.summarize, {
      method: "POST",
      body: JSON.stringify({
        article_id: article.id,
        title: article.title,
        abstract: article.abstract,
        authors: article.authors,
        generate: bookmarked,
      }),
    })
      .then(async (r) => {
        if (r.status === 204) {
          setNeedsBookmark(true);
          return null;
        }
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j: AISummaryType | null) => {
        if (j) setData(j);
        else setData(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [article.id, article.title, article.abstract, article.authors, bookmarked, ready]);

  if (loading) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        <Sparkles className="h-4 w-4 inline-block mr-2 text-accent-500 animate-pulse" />
        {bookmarked ? "Generating an AI summary…" : "Checking cache…"}
      </div>
    );
  }
  if (needsBookmark) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700 flex gap-3">
        <Bookmark className="h-4 w-4 shrink-0 mt-0.5 text-accent-600" />
        <div>
          <div className="font-medium text-zinc-900">
            Bookmark to generate an AI summary
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            We only run the LLM for papers you collect. Click the bookmark icon
            on this paper to generate Core Points, Methods, Experiments, and
            the structured summary.
          </div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">AI summary unavailable</div>
          <div className="mt-1 text-xs opacity-80">{error || "Unknown error."}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-6">
      {data.sections.map((s, i) => (
        <section
          key={i}
          id={`ai-summary-section-${i}`}
          className="mb-6 last:mb-0 scroll-mt-20"
        >
          <h2 className="text-base font-semibold text-zinc-900 mb-2">{s.heading}</h2>
          <div className="prose prose-sm max-w-none prose-p:text-zinc-700 prose-p:leading-relaxed prose-strong:text-zinc-900 prose-em:text-zinc-800 prose-code:text-accent-700 prose-li:text-zinc-700">
            <ReactMarkdown>{s.body_md}</ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  );
}
