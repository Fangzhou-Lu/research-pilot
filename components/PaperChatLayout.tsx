"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sparkles,
} from "lucide-react";
import { PaperChatPanel } from "./PaperChatPanel";
import type { Article } from "../lib/types";
import {
  getChatLayout,
  pushRecentChat,
  setChatLayout,
  type ChatLayout,
  type RecentChat,
} from "../lib/storage";

const LEFT_MIN = 180;
const LEFT_MAX = 360;
const RIGHT_MIN = 320;
const RIGHT_MAX = 600;

export function PaperChatLayout({ article }: { article: Article }) {
  // Layout state — hydrated from localStorage on mount.
  const [layout, setLayout] = useState<ChatLayout>({
    leftVisible: true,
    rightVisible: true,
    leftWidth: 240,
    rightWidth: 420,
  });
  const [hydrated, setHydrated] = useState(false);

  // Drag state for the two gutters.
  const draggingRef = useRef<null | "left" | "right">(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Recent chats list.
  const [recents, setRecents] = useState<RecentChat[]>([]);
  const [filter, setFilter] = useState("");

  // Hydrate layout + record this article as recent.
  useEffect(() => {
    setLayout(getChatLayout());
    setHydrated(true);
    const updated = pushRecentChat({
      id: article.id,
      title: article.title,
      category: article.primary_category,
    });
    setRecents(updated);
  }, [article.id, article.title, article.primary_category]);

  // Persist layout changes after hydration.
  useEffect(() => {
    if (hydrated) setChatLayout(layout);
  }, [layout, hydrated]);

  // Drag handlers.
  const onMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = "left";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);
  const onMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = "right";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (draggingRef.current === "left") {
        const w = Math.max(LEFT_MIN, Math.min(LEFT_MAX, e.clientX - rect.left));
        setLayout((l) => ({ ...l, leftWidth: w }));
      } else {
        const w = Math.max(
          RIGHT_MIN,
          Math.min(RIGHT_MAX, rect.right - e.clientX)
        );
        setLayout((l) => ({ ...l, rightWidth: w }));
      }
    };
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const filteredRecents = filter
    ? recents.filter((r) =>
        r.title.toLowerCase().includes(filter.toLowerCase())
      )
    : recents;

  const gridCols = (() => {
    const parts: string[] = [];
    if (layout.leftVisible) parts.push(`${layout.leftWidth}px`, "6px");
    parts.push("minmax(0,1fr)");
    if (layout.rightVisible) parts.push("6px", `${layout.rightWidth}px`);
    return parts.join(" ");
  })();

  const containerStyle: CSSProperties = { gridTemplateColumns: gridCols };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-zinc-900">
      {/* Top toolbar */}
      <header className="shrink-0 border-b border-zinc-200 px-3 h-12 flex items-center gap-2 bg-white">
        <Link
          href={`/paper/${article.id}`}
          className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-accent-600 transition-colors px-2"
          title="Back to paper"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="h-4 w-px bg-zinc-200" />
        <button
          type="button"
          onClick={() =>
            setLayout((l) => ({ ...l, leftVisible: !l.leftVisible }))
          }
          title={layout.leftVisible ? "Hide files panel" : "Show files panel"}
          className={`p-1.5 rounded hover:bg-zinc-100 ${
            layout.leftVisible ? "text-zinc-700" : "text-zinc-400"
          }`}
        >
          {layout.leftVisible ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            setLayout((l) => ({ ...l, rightVisible: !l.rightVisible }))
          }
          title={layout.rightVisible ? "Hide chat panel" : "Show chat panel"}
          className={`p-1.5 rounded hover:bg-zinc-100 ${
            layout.rightVisible ? "text-zinc-700" : "text-zinc-400"
          }`}
        >
          {layout.rightVisible ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>
        <div className="h-4 w-px bg-zinc-200" />
        <div className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-5 w-5 rounded bg-gradient-to-br from-accent-500 to-accent-700"
            aria-hidden
          />
          <span className="font-medium tracking-tight">ResearchPilot Chat</span>
        </div>
        <div className="h-4 w-px bg-zinc-200" />
        <h1
          className="flex-1 truncate text-sm text-zinc-700"
          title={article.title}
        >
          {article.title}
        </h1>
        <a
          href={article.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-accent-600 px-2"
          title="Open PDF in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open PDF
        </a>
      </header>

      {/* 3-pane body — grid with optional gutters between visible panes */}
      <div
        ref={containerRef}
        className="flex-1 grid overflow-hidden min-h-0"
        style={containerStyle}
      >
        {/* Left files panel */}
        {layout.leftVisible && (
          <>
            <aside className="flex flex-col bg-zinc-50 border-r border-zinc-200 min-h-0 overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-zinc-200">
                <div className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search papers"
                    className="flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 outline-none"
                  />
                </div>
              </div>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
                Recent papers
              </div>
              <ul className="flex-1 overflow-y-auto scrollbar-thin">
                {filteredRecents.length === 0 && (
                  <li className="px-3 py-4 text-xs text-zinc-400">
                    No recent papers yet.
                  </li>
                )}
                {filteredRecents.map((r) => {
                  const active = r.id === article.id;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/paper/${r.id}/chat`}
                        className={`flex items-start gap-2 px-3 py-2.5 border-l-2 transition-colors ${
                          active
                            ? "border-accent-500 bg-white"
                            : "border-transparent hover:bg-white"
                        }`}
                      >
                        <FileText
                          className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                            active ? "text-accent-600" : "text-zinc-400"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs leading-snug line-clamp-2 ${
                              active
                                ? "text-zinc-900 font-medium"
                                : "text-zinc-700"
                            }`}
                          >
                            {r.title}
                          </div>
                          <div className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                            {r.category}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-zinc-200 px-3 py-2 text-[10px] text-zinc-400">
                <Sparkles className="h-3 w-3 inline-block mr-1 text-accent-500" />
                Powered by ResearchPilot · LLM via opencode-go
              </div>
            </aside>
            {/* Left gutter */}
            <Gutter side="left" onMouseDown={onMouseDownLeft} />
          </>
        )}

        {/* Center PDF */}
        <div className="bg-zinc-100 min-h-0 relative">
          {!layout.leftVisible && (
            <button
              type="button"
              onClick={() =>
                setLayout((l) => ({ ...l, leftVisible: true }))
              }
              title="Show files panel"
              className="absolute left-2 top-2 z-10 p-1.5 rounded bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {!layout.rightVisible && (
            <button
              type="button"
              onClick={() =>
                setLayout((l) => ({ ...l, rightVisible: true }))
              }
              title="Show chat panel"
              className="absolute right-2 top-2 z-10 p-1.5 rounded bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <iframe
            src={article.pdf_url}
            title={article.title}
            className="w-full h-full border-0"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right chat panel */}
        {layout.rightVisible && (
          <>
            <Gutter side="right" onMouseDown={onMouseDownRight} />
            <div className="min-h-0 border-l border-zinc-200">
              <PaperChatPanel article={article} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Gutter({
  side,
  onMouseDown,
}: {
  side: "left" | "right";
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      onMouseDown={onMouseDown}
      className="cursor-col-resize bg-zinc-100 hover:bg-accent-300/40 transition-colors min-h-0"
    />
  );
}
