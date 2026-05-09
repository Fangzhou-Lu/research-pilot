"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ChevronRight,
  ExternalLink,
  FileDown,
  MessageSquare,
  Share2,
  Sparkles,
} from "lucide-react";

import type {
  Article,
  AISummary as AISummaryType,
  DeepQa,
} from "../lib/types";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { useBookmarked } from "../lib/use-bookmark";

type CoreTab = "core_points" | "methods" | "experiments";

const SECTION_ANCHOR_PREFIX = "ai-summary-section-";

const TAB_LABELS: Record<CoreTab, string> = {
  core_points: "Core Points",
  methods: "Methods",
  experiments: "Experiments",
};

export function PaperRightRail({ article }: { article: Article }) {
  const [summary, setSummary] = useState<AISummaryType | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [tab, setTab] = useState<CoreTab>("core_points");
  const [qa, setQa] = useState<DeepQa | null>(null);
  const { bookmarked, ready } = useBookmarked(article.id);

  useEffect(() => {
    if (!ready) return; // wait until we know whether to ask the LLM to generate
    let alive = true;
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
      .then((r) => {
        if (r.status === 204) return null; // cache miss + not bookmarked
        return r.ok ? r.json() : null;
      })
      .then((j: AISummaryType | null) => {
        if (alive && j) setSummary(j);
        else if (alive) setSummary(null);
      })
      .catch(() => {});
    authedFetch(PATHS.deepQa, {
      method: "POST",
      body: JSON.stringify({
        article_id: article.id,
        title: article.title,
        abstract: article.abstract,
        generate: bookmarked,
      }),
    })
      .then((r) => {
        if (r.status === 204) return null;
        return r.ok ? r.json() : null;
      })
      .then((j) => {
        if (alive && j && j.core_points) setQa(j as DeepQa);
        else if (alive) setQa(null);
      })
      .catch(() => {});
    authedFetch("/api/v1/questions", {
      method: "POST",
      body: JSON.stringify({
        article_id: article.id,
        title: article.title,
        abstract: article.abstract,
        generate: bookmarked,
      }),
    })
      .then((r) => {
        if (r.status === 204) return { items: null };
        return r.ok ? r.json() : { items: null };
      })
      .then((j) => {
        if (alive && Array.isArray(j.items)) setQuestions(j.items.slice(0, 5));
        else if (alive) setQuestions(null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [article.id, article.title, article.abstract, article.authors, bookmarked, ready]);

  const tabPayload = qa?.[tab];

  return (
    <div className="space-y-3">
      {/* Top action row — small icon buttons + Chat with AI CTA (chatpaper.com style) */}
      <div className="flex items-center gap-2">
        <a
          href={article.pdf_url}
          target="_blank"
          rel="noreferrer"
          title="Download PDF"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-accent-600 transition-colors"
        >
          <FileDown className="h-4 w-4" />
        </a>
        <a
          href={article.abs_url}
          target="_blank"
          rel="noreferrer"
          title="View on arXiv"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-accent-600 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          title="Copy link"
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
            }
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-accent-600 transition-colors"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <Link
          href={`/paper/${article.id}/chat`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 text-white text-sm font-medium px-4 h-9 shadow shadow-accent-500/20 transition-all"
        >
          <MessageSquare className="h-4 w-4" />
          Chat with AI
        </Link>
      </div>

      {/* Combined TOC: Abstract + AI Summary (chatpaper.com style) */}
      <div className="rounded-lg border border-zinc-200 bg-white p-2">
        <a
          href="#paper-abstract"
          className="block text-xs font-medium text-zinc-700 hover:text-accent-600 px-2 py-1.5 rounded hover:bg-zinc-50 transition-colors"
        >
          Abstract
        </a>
        <div className="mt-1">
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-700 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent-500" /> AI Summary
          </div>
          {summary ? (
            <ul className="space-y-0.5 pl-2">
              {summary.sections.map((s, i) => (
                <li key={i}>
                  <a
                    href={`#${SECTION_ANCHOR_PREFIX}${i}`}
                    className="block text-xs text-zinc-600 hover:text-accent-600 px-2 py-1.5 rounded hover:bg-zinc-50 transition-colors line-clamp-1"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-zinc-400 px-2 py-1">
              {bookmarked
                ? "Generating summary…"
                : "Bookmark this paper to generate an AI summary."}
            </div>
          )}
        </div>
      </div>

      {/* Core Points / Methods / Experiments tabs */}
      {summary && (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="px-4 pt-3 border-b border-zinc-200 flex gap-4">
            {(Object.keys(TAB_LABELS) as CoreTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`pb-2.5 text-xs border-b-2 transition-colors ${
                  tab === t
                    ? "border-accent-500 text-accent-600 font-medium"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="px-4 py-3 max-h-96 overflow-y-auto scrollbar-thin">
            {!tabPayload && (
              <div className="text-[11px] text-zinc-400">
                {bookmarked
                  ? "Generating Q&A…"
                  : "Bookmark this paper to generate Q&A."}
              </div>
            )}
            {tabPayload && (
              <div>
                <div className="text-[12px] font-medium text-zinc-800 mb-2 flex items-start gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500 mt-1.5 shrink-0" />
                  <span>{tabPayload.question}</span>
                </div>
                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-p:text-zinc-700 prose-p:text-xs prose-li:my-0.5 prose-li:text-zinc-700 prose-li:text-xs prose-strong:text-zinc-900 prose-ul:my-1.5">
                  <ReactMarkdown>{tabPayload.answer_md}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommended Q&A items */}
      {questions && (
        <div className="rounded-lg border border-zinc-200 bg-white p-2">
          <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            Suggested Questions
          </div>
          <ul className="space-y-0.5">
            {questions.map((q, i) => (
              <li key={i}>
                <Link
                  href={`/paper/${article.id}/chat?q=${encodeURIComponent(q)}`}
                  className="flex items-start gap-2 px-2 py-2 rounded hover:bg-zinc-100 group"
                >
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-mono shrink-0">
                    Q{i + 1}
                  </span>
                  <span className="flex-1 text-xs text-zinc-700 leading-relaxed group-hover:text-zinc-900">
                    {q}
                  </span>
                  <ChevronRight className="h-3 w-3 text-zinc-400 group-hover:text-accent-600 mt-0.5 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

