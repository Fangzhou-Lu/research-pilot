import { NavTabs } from "../../components/NavTabs";
import { PaperCard } from "../../components/PaperCard";
import { Pagination } from "../../components/Pagination";
import { apiSearch } from "../../lib/api";
import Link from "next/link";

export const metadata = { title: "Search · ResearchPilot" };

const PAGE_SIZE = 20;

const SEARCH_TYPES = [
  { value: "all", label: "All" },
  { value: "arxiv", label: "arXiv" },
  { value: "venue", label: "Venues" },
  { value: "institution", label: "Institutions" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string; type?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const type = (searchParams?.type ?? "all").trim();

  let feed;
  let error: string | null = null;
  if (q) {
    try {
      feed = await apiSearch({ q, page, pageSize: PAGE_SIZE, type });
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const totalPages = feed ? Math.min(25, Math.ceil(feed.total / PAGE_SIZE)) : 1;

  return (
    <>
      <NavTabs />
      <section className="mx-auto max-w-4xl px-6 py-6">
        <h1 className="text-xl font-semibold">
          {q ? (
            <>
              Search results for <span className="font-mono text-accent-600">{q}</span>
            </>
          ) : (
            "Search"
          )}
        </h1>

        {q && (
          <div className="mt-3 flex gap-1 border-b border-ink-200">
            {SEARCH_TYPES.map((t) => {
              const active = t.value === type || (!type && t.value === "all");
              return (
                <Link
                  key={t.value}
                  href={`/search?q=${encodeURIComponent(q)}&type=${t.value}`}
                  className={`-mb-px inline-flex items-center px-4 py-2 text-sm border-b-2 ${
                    active
                      ? "border-accent-500 text-accent-600 font-medium"
                      : "border-transparent text-ink-500 hover:text-ink-800"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        )}

        {feed && (
          <div className="mt-2 text-xs text-ink-400">{feed.total.toLocaleString()} matches</div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mt-4 bg-white border border-ink-200 rounded-md overflow-hidden">
          {feed?.items.map((a, i) => (
            <PaperCard key={a.id} article={a} index={(page - 1) * PAGE_SIZE + i + 1} from="search" />
          ))}
          {feed && feed.items.length === 0 && (
            <div className="px-6 py-16 text-center text-ink-400">No matches.</div>
          )}
          {!q && (
            <div className="px-6 py-16 text-center text-ink-400">
              Enter a query above to search arXiv.
            </div>
          )}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => `/search?q=${encodeURIComponent(q)}&type=${type}&page=${p}`}
        />
      </section>
    </>
  );
}
