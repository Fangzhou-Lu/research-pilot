"use client";

import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Bot,
  Lightbulb,
  Send,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { Article, ChatMessage } from "../lib/types";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";

type Tab = "recommend" | "custom";

function isUpstreamError(text: string): boolean {
  return (
    text.includes("all providers failed") ||
    text.includes("Insufficient balance") ||
    text.startsWith("_(error:")
  );
}

function friendlyChatError(raw: string): string {
  const t = raw || "";
  if (/Insufficient balance/i.test(t)) {
    return [
      "> ⚠️ **LLM provider is out of credits.**",
      ">",
      "> The configured `opencode-go` account returned `401 Insufficient balance`.",
      "> Refill credits at https://opencode.ai/workspace/billing or set",
      "> a different `LLM_BASE_URL` / `LLM_API_KEY` in `server-rs/.env`,",
      "> then restart the backend.",
    ].join("\n");
  }
  if (t.includes("all providers failed")) {
    return `> ⚠️ **No LLM provider reachable.**\n>\n> ${t.replace(/\n/g, "\n> ")}`;
  }
  return `_(error: ${t})_`;
}

const FALLBACK_QUESTIONS = [
  "What is the paper's main contribution and why does it matter?",
  "Walk me through the methodology and the key technical ideas.",
  "What experiments were run and what were the headline results?",
  "What are the limitations or open questions left by this paper?",
  "How does this work compare to closely related prior approaches?",
];

const MODELS = [
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { id: "qwen3.6-plus", label: "qwen3.6-plus" },
  { id: "glm-5", label: "glm-5" },
  { id: "kimi-k2.6", label: "kimi-k2.6" },
];

export function PaperChatPanel({ article }: { article: Article }) {
  const [tab, setTab] = useState<Tab>("recommend");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [model, setModel] = useState("deepseek-v4-flash");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [stickToFile, setStickToFile] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Hydrate prior history. After hydration, auto-send the prompt from `?q=`
  // (deep-linked from PaperRightRail) if it isn't already the last user turn.
  useEffect(() => {
    let alive = true;
    authedFetch(PATHS.chatHistory(article.id))
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (!alive) return;
        const items: ChatMessage[] = Array.isArray(j.items)
          ? j.items.map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }))
          : [];
        setMessages(items);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const q = params.get("q");
          if (q) {
            const lastUser = [...items].reverse().find((m) => m.role === "user");
            if (lastUser?.content !== q) {
              // Hand off to send below; small timeout lets state flush.
              setTimeout(() => sendText(q), 50);
            }
            // Clean URL so refresh doesn't re-send.
            const cleanUrl = window.location.pathname;
            window.history.replaceState(null, "", cleanUrl);
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  // Fetch recommended questions when language changes (or first load).
  useEffect(() => {
    let alive = true;
    setQuestions(null);
    authedFetch("/api/v1/questions", {
      method: "POST",
      body: JSON.stringify({
        article_id: article.id,
        title: article.title,
        abstract: article.abstract,
        language,
      }),
    })
      .then((r) => (r.ok ? r.json() : { items: null }))
      .then((j) => {
        if (alive) {
          const items = Array.isArray(j.items) ? j.items.filter(Boolean) : null;
          setQuestions(items && items.length >= 3 ? items.slice(0, 5) : null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [article.id, article.title, article.abstract, language]);

  // Auto-scroll on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendText = async (text: string) => {
    if (!text || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await authedFetch(PATHS.chat, {
        method: "POST",
        body: JSON.stringify({
          article: { id: article.id, title: article.title, abstract: article.abstract },
          messages: next,
          model,
          language,
          stick_to_file: stickToFile,
        }),
      });
      if (!r.ok || !r.body) {
        const errText = await r.text();
        setMessages([
          ...next,
          { role: "assistant", content: friendlyChatError(errText || `${r.status}`) },
        ]);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        const display = isUpstreamError(acc) ? friendlyChatError(acc) : acc;
        setMessages([...next, { role: "assistant", content: display }]);
      }
    } finally {
      setBusy(false);
    }
  };

  const send = () => sendText(input.trim());

  const displayQuestions = questions ?? FALLBACK_QUESTIONS;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white text-zinc-900">
      {/* Article header */}
      <div className="px-5 py-4 border-b border-zinc-200 shrink-0">
        <h2 className="text-sm font-medium leading-snug text-zinc-900 line-clamp-2">
          {article.title}
        </h2>
        <details className="mt-2 group">
          <summary className="text-xs text-accent-600 cursor-pointer select-none flex items-center gap-1 hover:text-accent-700">
            <Sparkles className="h-3 w-3" />
            Abstract
            <span className="text-zinc-400 group-open:hidden">— click to expand</span>
          </summary>
          <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
            {article.abstract}
          </p>
        </details>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-zinc-200 flex gap-6 shrink-0">
        <TabBtn active={tab === "recommend"} onClick={() => setTab("recommend")}>
          Recommend
        </TabBtn>
        <TabBtn active={tab === "custom"} onClick={() => setTab("custom")}>
          Custom
        </TabBtn>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
        {isEmpty && tab === "recommend" && (
          <ol className="space-y-1.5">
            {displayQuestions.map((q, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => sendText(q)}
                  disabled={busy}
                  className="w-full text-left flex items-start gap-3 px-2 py-2.5 rounded-md hover:bg-zinc-50 disabled:opacity-50 group"
                >
                  <span className="text-xs text-zinc-500 font-mono mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-sm text-zinc-800 leading-relaxed group-hover:text-zinc-950">
                    {q}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-accent-600 mt-1 shrink-0" />
                </button>
              </li>
            ))}
            {!questions && (
              <li className="px-2 py-2 text-[11px] text-zinc-400">
                Loading paper-specific questions…
              </li>
            )}
          </ol>
        )}

        {isEmpty && tab === "custom" && (
          <div className="mt-12 text-center text-sm text-zinc-500">
            Ask anything about this paper.
            <div className="mt-1 text-xs text-zinc-400">
              Type your question in the box below ↓
            </div>
          </div>
        )}

        {!isEmpty && (
          <div className="space-y-5">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isLastAssistant = m.role === "assistant" && isLast;
              const showThinking = isLastAssistant && busy && !m.content;
              return (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 h-7 w-7 rounded-full bg-zinc-100 inline-flex items-center justify-center">
                    {m.role === "user" ? (
                      <User className="h-3.5 w-3.5 text-zinc-700" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-accent-600" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    {showThinking ? (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                        Thinking — reasoning models can take 10–20s before the answer streams in.
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-pre:bg-zinc-50 prose-code:text-accent-700">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input + bottom controls */}
      <div className="border-t border-zinc-200 p-3 shrink-0 bg-white">
        <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2 ring-1 ring-zinc-200 focus-within:ring-accent-500/40">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={busy}
            placeholder='Type a question or type "/" to select a prompt.'
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            title="Idea (toggle Recommend)"
            onClick={() => setTab("recommend")}
            className="text-zinc-500 hover:text-amber-500 p-1"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
          <button type="button" title="Settings" className="text-zinc-500 hover:text-zinc-700 p-1">
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="bg-accent-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-md p-1.5 hover:bg-accent-600 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-white text-zinc-700 px-2 py-1 rounded ring-1 ring-zinc-200 hover:ring-zinc-300 cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "zh")}
            className="bg-white text-zinc-700 px-2 py-1 rounded ring-1 ring-zinc-200 hover:ring-zinc-300 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="zh">简体中文</option>
          </select>
          <label className="flex items-center gap-1.5 ml-auto text-zinc-600 cursor-pointer select-none">
            <span>Stick to file</span>
            <span
              role="switch"
              aria-checked={stickToFile}
              tabIndex={0}
              onClick={() => setStickToFile((v) => !v)}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setStickToFile((v) => !v)}
              className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
                stickToFile ? "bg-accent-500" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                  stickToFile ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pt-3 pb-3 text-sm border-b-2 transition-colors ${
        active
          ? "border-accent-500 text-accent-600 font-medium"
          : "border-transparent text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
