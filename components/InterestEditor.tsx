"use client";

import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authedFetch } from "../lib/user";
import { PATHS, apiInterestMatches, apiPauseInterest } from "../lib/api";
import type { Article, Interest } from "../lib/types";

const SUGGESTIONS = [
  "LLM agents that plan, call tools, and self-reflect over multi-step tasks",
  "Retrieval-augmented generation: chunking, re-ranking, and hallucination mitigation",
  "Mixture-of-experts routing and sparsity in language models",
  "Multimodal vision-language models and image-to-text reasoning",
];

// ─── simple toggle switch (no Radix dependency) ──────────────────────────────

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out-quart focus:outline-none disabled:opacity-50 ${
        checked ? "bg-accent-500" : "bg-ink-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out-quart ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── per-interest matches expander ───────────────────────────────────────────

function MatchesPreview({ interestId }: { interestId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Article[] | null>(null);

  const load = async () => {
    if (matches !== null) return;
    setLoading(true);
    try {
      const results = await apiInterestMatches(interestId, 3);
      setMatches(results);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) load();
    setOpen((v) => !v);
  };

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1 text-xs text-ink-400 hover:text-accent-600 transition-colors duration-150"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>
          {loading
            ? "加载中…"
            : matches !== null
            ? `最近匹配 ${matches.length} 篇 ›`
            : "最近匹配 › "}
        </span>
      </button>

      {open && matches !== null && (
        <ul className="mt-1.5 space-y-1 pl-4 border-l border-ink-100">
          {matches.length === 0 ? (
            <li className="text-xs text-ink-400">暂无匹配论文</li>
          ) : (
            matches.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/paper/${a.id}`}
                  className="text-xs text-ink-600 hover:text-accent-600 line-clamp-2 transition-colors duration-150"
                >
                  {a.title}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function InterestEditor() {
  const [items, setItems] = useState<Interest[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pausingId, setPausingId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const r = await authedFetch(PATHS.interests);
      if (!r.ok) return;
      const j = (await r.json()) as { items: Interest[] };
      setItems(j.items ?? []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleAdd = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await authedFetch(PATHS.interests, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setDraft("");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await authedFetch(PATHS.interest(id), { method: "DELETE" });
    } catch {
      reload();
    }
  };

  const handlePause = async (id: string, paused: boolean) => {
    // Optimistic update
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, paused } : x)));
    setPausingId(id);
    try {
      await apiPauseInterest(id, paused);
    } catch {
      // Roll back on error
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, paused: !paused } : x)));
    } finally {
      setPausingId(null);
    }
  };

  return (
    <div>
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. how to evaluate the factual reliability of code-generation models in real-world repos"
          rows={3}
          className="w-full text-sm outline-none resize-none placeholder:text-ink-300"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => handleAdd(draft)}
            disabled={!draft.trim() || busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 disabled:bg-ink-200 disabled:text-ink-400 text-white px-4 py-1.5 text-sm hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" /> Track this
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-ink-400 mb-2">Tracked</div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-md border border-ink-200 bg-white px-3 py-2"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/interests/${it.id}`}
                    className={`flex-1 text-sm hover:text-accent-600 transition-colors duration-150 ${
                      it.paused ? "text-ink-400 line-through" : "text-ink-800"
                    }`}
                  >
                    {it.text}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <Switch
                      checked={!it.paused}
                      onChange={(active) => handlePause(it.id, !active)}
                      disabled={pausingId === it.id}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(it.id)}
                      className="text-ink-400 hover:text-red-500"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <MatchesPreview interestId={it.id} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-8">
          <div className="text-xs uppercase tracking-wide text-ink-400 mb-2">Try one of these</div>
          <ul className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-md border border-dashed border-ink-200 bg-ink-50/40 px-3 py-2 cursor-pointer hover:bg-white"
                onClick={() => handleAdd(s)}
              >
                <Plus className="h-4 w-4 mt-0.5 text-ink-400" />
                <span className="flex-1 text-sm text-ink-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
