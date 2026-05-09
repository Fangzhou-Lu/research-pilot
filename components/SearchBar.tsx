"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, BellRing } from "lucide-react";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { classNames } from "../lib/utils";

const FILTERS = [
  { value: "all", label: "All papers" },
  { value: "arxiv", label: "arXiv" },
  { value: "venue", label: "Venues" },
  { value: "institution", label: "Institutions" },
] as const;

export function SearchBar({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const compact = variant === "compact";

  const handleSearch = () => {
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}&type=${filter}`);
  };

  const handleTrack = async () => {
    const term = q.trim();
    if (!term) return;
    try {
      await authedFetch(PATHS.interests, {
        method: "POST",
        body: JSON.stringify({ text: term }),
      });
    } catch {
      /* ignore — let interests page show empty */
    }
    router.push("/interests");
  };

  return (
    <div
      className={classNames(
        "flex items-stretch w-full overflow-hidden rounded-pill border border-ink-200 bg-white transition-all duration-200 ease-in-out-quart focus-within:border-accent-300 focus-within:shadow-soft",
        compact ? "h-10 shadow-xs" : "h-12 shadow-soft",
      )}
    >
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as typeof filter)}
        className={classNames(
          "border-r border-ink-200 bg-ink-50 px-3 text-sm text-ink-600 outline-none",
          compact ? "" : "px-4",
        )}
      >
        {FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder={compact ? "Keywords or arXiv ID" : "Enter keywords, an arXiv ID, or a research question…"}
        className="flex-1 px-4 outline-none text-sm bg-transparent placeholder:text-ink-300"
      />
      <button
        type="button"
        onClick={handleSearch}
        className="flex items-center gap-1.5 px-4 text-sm text-ink-700 hover:bg-ink-50 border-l border-ink-200"
      >
        <Search className="h-4 w-4" /> Search
      </button>
      <button
        type="button"
        onClick={handleTrack}
        title="Subscribe — get daily AI-matched papers for this query"
        className="flex items-center gap-1.5 px-4 text-sm text-accent-600 hover:bg-accent-50 border-l border-ink-200"
      >
        <BellRing className="h-4 w-4" /> Track
      </button>
    </div>
  );
}
