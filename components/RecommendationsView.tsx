"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { authedFetch } from "../lib/user";
import { PATHS } from "../lib/api";
import { PaperCard } from "./PaperCard";
import type { Article, Interest } from "../lib/types";

type Group = { date: string; articles: Article[] };

export function RecommendationsView({ interestId }: { interestId: string }) {
  const [interest, setInterest] = useState<Interest | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    authedFetch(PATHS.recommendations(interestId))
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j: { interest: Interest; groups: Group[] }) => {
        if (alive) {
          setInterest(j.interest);
          setGroups(j.groups ?? []);
        }
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [interestId]);

  return (
    <>
      <Link href="/interests" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-3 w-3" /> Back to interests
      </Link>
      {loading && (
        <div className="mt-6 rounded-md border border-ink-200 bg-white p-6 text-sm text-ink-500">
          <Sparkles className="h-4 w-4 inline-block mr-2 text-accent-500 animate-pulse" />
          Pulling recommendations…
        </div>
      )}
      {error && (
        <div className="mt-6 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}
      {interest && (
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{interest.text}</h1>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="mt-6 rounded-md border border-dashed border-ink-200 bg-white px-6 py-12 text-center text-sm text-ink-500">
          No recent papers matching this interest yet.
        </div>
      )}
      {groups.map((g) => (
        <div key={g.date} className="mt-6">
          <div className="text-xs uppercase tracking-wide text-ink-400 mb-2 font-mono">{g.date}</div>
          <div className="bg-white border border-ink-200 rounded-md overflow-hidden">
            {g.articles.map((a, i) => (
              <PaperCard key={a.id} article={a} index={i + 1} from="interest" />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
