"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Article, DeepQa } from "../lib/types";
import { fmtDate } from "../lib/utils";
import { getViewMode } from "../lib/storage";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { BookmarkButton } from "./BookmarkButton";

type Lang = "en" | "zh";

type CardTab = "abstract" | "core_points" | "methods" | "experiments";

export function PaperCard({
  article,
  index,
  from,
}: {
  article: Article;
  index: number;
  from?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"simple" | "detailed">("detailed");
  const [lang, setLang] = useState<Lang>("en");
  const [trans, setTrans] = useState<{ title: string; abstract: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Tabs: "abstract" | "core_points" | "methods" | "experiments". Default abstract.
  const [tab, setTab] = useState<CardTab>("abstract");
  const [qa, setQa] = useState<DeepQa | null>(null);
  const [qaBusy, setQaBusy] = useState(false);

  useEffect(() => {
    setMode(getViewMode());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "rp:view-mode") setMode(getViewMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isSimple = mode === "simple";

  const ensureTranslation = async () => {
    if (trans || busy) return;
    setBusy(true);
    try {
      const r = await authedFetch(PATHS.translate, {
        method: "POST",
        body: JSON.stringify({
          article_id: article.id,
          language: "zh-CN",
          title: article.title,
          abstract: article.abstract,
        }),
      });
      if (r.ok) {
        setTrans((await r.json()) as { title: string; abstract: string });
      }
    } finally {
      setBusy(false);
    }
  };

  const ensureQa = async () => {
    if (qa || qaBusy) return;
    setQaBusy(true);
    try {
      const r = await authedFetch(PATHS.deepQa, {
        method: "POST",
        body: JSON.stringify({
          article_id: article.id,
          title: article.title,
          abstract: article.abstract,
          language: lang === "zh" ? "zh" : "en",
        }),
      });
      if (r.ok) setQa((await r.json()) as DeepQa);
    } finally {
      setQaBusy(false);
    }
  };

  const onToggleLang = (next: Lang) => {
    setLang(next);
    if (next === "zh") void ensureTranslation();
  };

  const onPickTab = (next: CardTab) => {
    setTab(next);
    if (next !== "abstract") void ensureQa();
    if (!open) setOpen(true);
  };

  const showTitle = lang === "zh" && trans ? trans.title : article.title;
  const showAbstract = lang === "zh" && trans ? trans.abstract : article.abstract;

  const tabPayload = tab === "abstract" || !qa ? null : qa[tab];

  return (
    <article
      data-feed-index={index}
      className={`border-b border-ink-200 hover:bg-ink-50/50 transition-colors ${
        isSimple ? "px-6 py-3" : "px-6 py-5"
      }`}
    >
      <div className="flex gap-4">
        <span className="shrink-0 w-7 text-right text-ink-300 font-mono text-sm pt-0.5">
          {index}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <Link
              href={`/paper/${article.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`}
              className={`font-medium text-ink-900 hover:text-accent-600 line-clamp-2 ${
                isSimple ? "text-sm" : "text-base"
              }`}
            >
              {showTitle}
            </Link>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <a
                href={article.pdf_url}
                target="_blank"
                rel="noreferrer"
                title="Open PDF"
                className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500"
              >
                <FileText className="h-4 w-4" />
              </a>
              <Link
                href={`/paper/${article.id}/chat`}
                title="Chat with paper"
                className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
              <BookmarkButton articleId={article.id} article={article} />
            </div>
          </div>

          {lang === "zh" && trans && !isSimple && (
            <p className="mt-1 text-xs text-ink-400 italic line-clamp-1">
              {article.title}
            </p>
          )}

          <div className="mt-1 text-xs text-ink-500 flex flex-wrap gap-x-3 gap-y-1">
            {article.primary_category && (
              <span className="font-mono">{article.primary_category}</span>
            )}
            {fmtDate(article.published) && (
              <span>{fmtDate(article.published)}</span>
            )}
            {!isSimple && article.authors.length > 0 && (
              <span className="truncate max-w-md">
                {article.authors.slice(0, 4).join(", ")}
                {article.authors.length > 4 && ` +${article.authors.length - 4}`}
              </span>
            )}
          </div>

          {!isSimple && article.organizations.length > 0 && (
            <div className="mt-1 text-xs text-ink-400 truncate">
              {article.organizations.join(" · ")}
            </div>
          )}

          {!isSimple && (
            <>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-700"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                  Abstract
                </button>
                {/* EN / ZH switch */}
                <div className="inline-flex rounded-md border border-ink-200 overflow-hidden text-[11px] leading-none">
                  <button
                    type="button"
                    onClick={() => onToggleLang("en")}
                    className={`px-2 py-0.5 ${
                      lang === "en"
                        ? "bg-ink-900 text-white"
                        : "text-ink-500 hover:bg-ink-50"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLang("zh")}
                    disabled={busy}
                    className={`px-2 py-0.5 ${
                      lang === "zh"
                        ? "bg-ink-900 text-white"
                        : "text-ink-500 hover:bg-ink-50"
                    } disabled:opacity-50`}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "中"}
                  </button>
                </div>
              </div>

              {open && (
                <>
                  {/* In-card tabs: Abstract | Core Points | Methods | Experiments */}
                  <div className="mt-2 flex items-center gap-1 border-b border-ink-200 text-xs">
                    <CardTabBtn
                      active={tab === "abstract"}
                      onClick={() => onPickTab("abstract")}
                      label="Abstract"
                    />
                    <CardTabBtn
                      active={tab === "core_points"}
                      onClick={() => onPickTab("core_points")}
                      label="Core Points"
                      icon={<Lightbulb className="h-3 w-3" />}
                    />
                    <CardTabBtn
                      active={tab === "methods"}
                      onClick={() => onPickTab("methods")}
                      label="Methods"
                    />
                    <CardTabBtn
                      active={tab === "experiments"}
                      onClick={() => onPickTab("experiments")}
                      label="Experiments"
                    />
                  </div>

                  {tab === "abstract" && (
                    <p className="mt-3 text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                      {showAbstract}
                    </p>
                  )}

                  {tab !== "abstract" && (
                    <div className="mt-3 text-sm text-ink-600 leading-relaxed">
                      {qaBusy && !qa && (
                        <div className="flex items-center gap-2 text-ink-400 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating Q&amp;A…
                        </div>
                      )}
                      {tabPayload && (
                        <>
                          <div className="text-[13px] font-medium text-ink-800 mb-2 flex items-start gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500 mt-1.5 shrink-0" />
                            <span>{tabPayload.question}</span>
                          </div>
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-p:text-ink-700 prose-li:my-0.5 prose-li:text-ink-700 prose-strong:text-ink-900 prose-ul:my-1.5">
                            <ReactMarkdown>{tabPayload.answer_md}</ReactMarkdown>
                          </div>
                        </>
                      )}
                      {!qaBusy && !tabPayload && qa === null && (
                        <div className="text-xs text-ink-400">
                          No Q&amp;A available for this tab.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function CardTabBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1 px-3 py-1.5 border-b-2 transition-colors ${
        active
          ? "border-accent-500 text-accent-600 font-medium"
          : "border-transparent text-ink-500 hover:text-ink-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
