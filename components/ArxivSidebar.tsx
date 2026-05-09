"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Sigma,
} from "lucide-react";
import type { CategoryCount } from "../lib/types";

type Group = {
  id: string;
  label: string;
  prefix: string;
  icon: React.ReactNode;
};

const GROUPS: Group[] = [
  { id: "cs", label: "Computer Science", prefix: "cs.", icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: "stat", label: "Statistics", prefix: "stat.", icon: <Sigma className="h-3.5 w-3.5" /> },
];

function fmtDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export function ArxivSidebar({
  counts,
  selectedCat,
  selectedDate,
}: {
  counts: CategoryCount[];
  selectedCat: string;
  selectedDate?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    cs: true,
    stat: true,
  });
  const [openCat, setOpenCat] = useState<string | null>(selectedCat);

  // Keep openCat in sync if selection changes from outside
  useEffect(() => {
    setOpenCat(selectedCat);
  }, [selectedCat]);

  const totalUpdate = counts.reduce((acc, c) => acc + (c.counts[0]?.count ?? 0), 0);
  const todayLabel = counts[0]?.counts[0]?.date
    ? fmtDateShort(counts[0].counts[0].date)
    : "";

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-10 shrink-0 border-r border-ink-200 sticky top-0 h-screen flex-col items-center pt-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          className="p-1.5 rounded hover:bg-ink-100 text-ink-500"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-ink-200 sticky top-0 h-screen overflow-y-auto py-4">
      {/* Update header with date */}
      <div className="px-4 mb-3 flex items-start gap-2">
        <div className="flex-1">
          <div className="text-xs text-ink-500">
            Update <span className="font-mono text-ink-400">: {totalUpdate}</span>
          </div>
          <div className="mt-0.5 text-sm font-medium text-ink-800">
            {todayLabel || "Today"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          className="p-1.5 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-600"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Groups */}
      {GROUPS.map((g) => {
        const groupCats = counts.filter((c) => c.cat.startsWith(g.prefix));
        if (groupCats.length === 0) return null;
        const groupOpen = openGroups[g.id] ?? true;
        return (
          <div key={g.id} className="mb-3">
            <button
              type="button"
              onClick={() =>
                setOpenGroups((s) => ({ ...s, [g.id]: !groupOpen }))
              }
              className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[11px] uppercase tracking-wider text-ink-400 hover:text-ink-600"
            >
              {g.icon}
              <span className="flex-1 text-left">{g.label}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${groupOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {groupOpen && (
              <ul>
                {groupCats.map((c) => {
                  const isOpen = openCat === c.cat;
                  const isActiveCat = selectedCat === c.cat;
                  return (
                    <li key={c.cat}>
                      <button
                        type="button"
                        onClick={() => setOpenCat(isOpen ? null : c.cat)}
                        className={`w-full flex items-center gap-1 px-4 py-1.5 text-sm text-left hover:bg-ink-50 transition-colors ${
                          isActiveCat ? "text-accent-700 font-medium" : "text-ink-700"
                        }`}
                      >
                        <ChevronRight
                          className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                        <span className="flex-1 truncate">{c.label}</span>
                      </button>
                      {isOpen && c.counts.length > 0 && (
                        <ul className="pl-9 pr-3 py-1 space-y-0.5">
                          {c.counts.map(({ date, count }) => {
                            const active =
                              selectedCat === c.cat && selectedDate === date;
                            return (
                              <li key={date}>
                                <Link
                                  href={`/?cat=${c.cat}&date=${date}`}
                                  className={`flex justify-between text-xs px-2 py-1 rounded transition-colors ${
                                    active
                                      ? "bg-accent-50 text-accent-700 font-medium"
                                      : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
                                  }`}
                                >
                                  <span>{fmtDateShort(date)}</span>
                                  <span className="font-mono text-ink-400">
                                    ({count})
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
}
