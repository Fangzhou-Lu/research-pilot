"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, FileText } from "lucide-react";
import { AISummary } from "./AISummary";
import { ChatPanel } from "./ChatPanel";
import type { Article } from "../lib/types";

type Tab = "summary" | "chat" | "abstract";

export function PaperWorkspace({ article }: { article: Article }) {
  const [tab, setTab] = useState<Tab>("summary");
  return (
    <div className="mt-8">
      <div className="border-b border-zinc-200 flex gap-1">
        <TabBtn active={tab === "summary"} onClick={() => setTab("summary")} icon={<Sparkles className="h-4 w-4" />} label="AI Summary" />
        <TabBtn active={tab === "abstract"} onClick={() => setTab("abstract")} icon={<FileText className="h-4 w-4" />} label="Paper" />
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
      </div>
      <div className="mt-5">
        {tab === "summary" && <AISummary article={article} />}
        {tab === "abstract" && (
          <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
            {article.abstract}
          </div>
        )}
        {tab === "chat" && <ChatPanel article={article} />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors ${
        active
          ? "border-accent-500 text-accent-600 font-medium"
          : "border-transparent text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
