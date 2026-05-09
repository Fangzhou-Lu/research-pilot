"use client";

import { useEffect, useState } from "react";
import { Send, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Article, ChatMessage } from "../lib/types";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";

const STARTER_QUESTIONS: { label: string; q: string }[] = [
  { label: "Core points", q: "What is the paper's main contribution and why does it matter?" },
  { label: "Methods", q: "Walk me through the methodology and the key technical ideas." },
  { label: "Experiments", q: "What experiments were run and what were the headline results?" },
  { label: "Limitations", q: "What are the limitations or open questions left by this paper?" },
];

export function ChatPanel({ article, variant }: { article: Article; variant?: "compact" | "full" }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const isFull = variant === "full";

  // Hydrate prior history on mount.
  useEffect(() => {
    let alive = true;
    authedFetch(PATHS.chatHistory(article.id))
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (alive && Array.isArray(j.items)) {
          const ms: ChatMessage[] = j.items.map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }));
          setMessages(ms);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [article.id]);

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
        }),
      });
      if (!r.ok || !r.body) {
        const errText = await r.text();
        setMessages([...next, { role: "assistant", content: `_(error: ${errText || r.status})_` }]);
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
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } finally {
      setBusy(false);
    }
  };

  const send = () => sendText(input.trim());

  return (
    <div className={`rounded-md border border-ink-200 bg-white ${isFull ? "h-full flex flex-col" : ""}`}>
      <div className="px-4 py-3 border-b border-ink-200 text-xs text-ink-500">
        Chatting about <span className="font-medium text-ink-800">{article.title}</span>
      </div>
      <div className={`${isFull ? "flex-1" : "max-h-[60vh]"} overflow-y-auto scrollbar-thin px-4 py-4 space-y-4`}>
        {messages.length === 0 && (
          <div className="py-6">
            <p className="text-center text-ink-500 text-sm mb-5">
              Ask anything about this paper — its methods, results, or limitations.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {STARTER_QUESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setInput("");
                    void sendText(s.q);
                  }}
                  disabled={busy}
                  className="text-left px-3 py-2 rounded-md border border-ink-200 bg-white hover:border-accent-300 hover:bg-accent-50 text-xs text-ink-700 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-ink-800">{s.label}</div>
                  <div className="mt-0.5 text-ink-500 line-clamp-2">{s.q}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
          const showThinking = isLastAssistant && busy && !m.content;
          return (
            <div key={i} className="flex gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-ink-100 inline-flex items-center justify-center">
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-accent-600" />}
              </span>
              <div className="flex-1 prose-paper text-sm">
                {showThinking ? (
                  <div className="flex items-center gap-2 text-ink-400 text-xs animate-pulse">
                    <span className="inline-block h-2 w-2 rounded-full bg-accent-500" />
                    Thinking — reasoning models can take 10–20s before the answer streams in.
                  </div>
                ) : (
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-ink-200 p-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
          placeholder="Ask about this paper…"
          className="flex-1 rounded-full border border-ink-200 px-4 py-2 text-sm outline-none focus:border-accent-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-full bg-accent-500 disabled:bg-ink-200 disabled:text-ink-400 text-white p-2 hover:bg-accent-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
