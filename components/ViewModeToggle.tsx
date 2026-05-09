"use client";

import { useEffect, useState } from "react";
import { LayoutList, Rows } from "lucide-react";
import { getViewMode, setViewMode } from "../lib/storage";

export function ViewModeToggle() {
  const [mode, setMode] = useState<"simple" | "detailed">("detailed");

  useEffect(() => {
    setMode(getViewMode());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "rp:view-mode") setMode(getViewMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const swap = (next: "simple" | "detailed") => {
    setViewMode(next);
    setMode(next);
  };

  return (
    <div className="inline-flex items-center rounded-full border border-ink-200 bg-white text-xs">
      <button
        type="button"
        onClick={() => swap("detailed")}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
          mode === "detailed" ? "bg-ink-900 text-white" : "text-ink-500"
        }`}
      >
        <Rows className="h-3.5 w-3.5" /> Detailed
      </button>
      <button
        type="button"
        onClick={() => swap("simple")}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
          mode === "simple" ? "bg-ink-900 text-white" : "text-ink-500"
        }`}
      >
        <LayoutList className="h-3.5 w-3.5" /> Simple
      </button>
    </div>
  );
}
