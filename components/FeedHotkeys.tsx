"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { useHotkey } from "../lib/use-hotkey";

const KEYBINDS = [
  { key: "J", description: "Next paper" },
  { key: "K", description: "Previous paper" },
  { key: "B", description: "Bookmark current paper" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Show / hide this help" },
];

function getCurrentArticleIndex(): number {
  const articles = Array.from(document.querySelectorAll("article[data-feed-index]"));
  if (articles.length === 0) return -1;
  const mid = window.innerHeight / 2;
  let closest = 0;
  let closestDist = Infinity;
  articles.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const dist = Math.abs(center - mid);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  });
  return closest;
}

function scrollToIndex(idx: number) {
  const articles = Array.from(document.querySelectorAll("article[data-feed-index]"));
  if (idx < 0 || idx >= articles.length) return;
  articles[idx].scrollIntoView({ behavior: "smooth", block: "center" });
}

export function FeedHotkeys() {
  const [helpOpen, setHelpOpen] = useState(false);

  const map = useCallback(() => ({
    j: () => {
      const i = getCurrentArticleIndex();
      scrollToIndex(i + 1);
    },
    J: () => {
      const i = getCurrentArticleIndex();
      scrollToIndex(i + 1);
    },
    k: () => {
      const i = getCurrentArticleIndex();
      scrollToIndex(Math.max(0, i - 1));
    },
    K: () => {
      const i = getCurrentArticleIndex();
      scrollToIndex(Math.max(0, i - 1));
    },
    b: () => {
      const articles = Array.from(document.querySelectorAll("article[data-feed-index]"));
      const i = getCurrentArticleIndex();
      const el = articles[i];
      if (el) {
        const btn = el.querySelector<HTMLButtonElement>("button[title='Bookmark'], button[title='Remove bookmark']");
        btn?.focus();
        btn?.click();
      }
    },
    B: () => {
      const articles = Array.from(document.querySelectorAll("article[data-feed-index]"));
      const i = getCurrentArticleIndex();
      const el = articles[i];
      if (el) {
        const btn = el.querySelector<HTMLButtonElement>("button[title='Bookmark'], button[title='Remove bookmark']");
        btn?.focus();
        btn?.click();
      }
    },
    "/": () => {
      const input = document.querySelector<HTMLInputElement>("input[type='search'], input[placeholder*='earch']");
      input?.focus();
    },
    "?": () => setHelpOpen((v) => !v),
  }), []);

  useHotkey(map());

  return (
    <>
      {/* Floating ? badge */}
      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-label="Keyboard shortcuts"
        className="fixed bottom-6 right-6 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-medium text-ink-500 shadow-sm hover:border-accent-300 hover:text-accent-600 transition-colors"
      >
        ?
      </button>

      {/* Help dialog */}
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="relative w-80 rounded-xl border border-ink-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="absolute right-4 top-4 text-ink-400 hover:text-ink-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-ink-900 mb-4">Keyboard shortcuts</h2>
            <ul className="space-y-2">
              {KEYBINDS.map(({ key, description }) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{description}</span>
                  <kbd className="ml-4 rounded border border-ink-200 bg-ink-50 px-2 py-0.5 font-mono text-xs text-ink-700">
                    {key}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
