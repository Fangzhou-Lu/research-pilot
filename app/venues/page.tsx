import { NavTabs } from "../../components/NavTabs";
import { PaperCard } from "../../components/PaperCard";
import { Pagination } from "../../components/Pagination";
import { VENUES } from "../../lib/types";
import { apiVenues, apiVenuePapers } from "../../lib/api";
import Link from "next/link";
import { Construction } from "lucide-react";

export const metadata = { title: "Venues · ResearchPilot" };

const PAGE_SIZE = 20;

// ICLR/ICML/NeurIPS are wired for OpenReview import in v1
const WIRED_VENUES = new Set([
  "iclr-2026", "iclr-2025", "iclr-2024",
  "icml-2025", "icml-2024",
  "neurips-2024", "neurips-2023",
]);

export default async function VenuesPage({
  searchParams,
}: {
  searchParams?: { id?: string; page?: string; track?: string };
}) {
  const id = searchParams?.id ?? VENUES[0].id;
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const track = searchParams?.track;

  // Fetch live venue list from backend (with paper_count filled)
  let liveVenues = null;
  try {
    liveVenues = await apiVenues();
  } catch {
    // fall back to static VENUES if backend is unavailable
  }

  // Build sidebar list: use live counts where available, fallback to static
  const sidebarVenues = VENUES.map((v) => {
    const live = liveVenues?.find((lv) => lv.id === v.id);
    return {
      id: v.id,
      label: v.label,
      year: v.year,
      isNew: "isNew" in v ? v.isNew : false,
      paper_count: live?.paper_count ?? 0,
      display: live?.display ?? `${v.label} ${v.year}`,
      tracks: live?.track ?? [],
    };
  });

  const current = sidebarVenues.find((v) => v.id === id) ?? sidebarVenues[0];
  const isWired = WIRED_VENUES.has(id);

  // Fetch papers for wired venues
  let feed = null;
  let feedError: string | null = null;
  if (isWired) {
    try {
      feed = await apiVenuePapers(id, { page, pageSize: PAGE_SIZE, track });
    } catch (e) {
      feedError = (e as Error).message;
    }
  }

  const totalPages = feed ? Math.min(50, Math.ceil(feed.total / PAGE_SIZE)) : 1;
  const hasPapers = feed && feed.items.length > 0;
  // Show Oral/Poster chips whenever the venue declares tracks, even before
  // papers are imported — matches chatpaper.com which keeps the filter UI
  // visible while content is still loading.
  const showTrackFilter = current.tracks.length > 0;

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    sp.set("id", id);
    sp.set("page", String(p));
    if (track) sp.set("track", track);
    return `/venues?${sp.toString()}`;
  };

  const trackHref = (t: string | undefined) => {
    const sp = new URLSearchParams();
    sp.set("id", id);
    sp.set("page", "1");
    if (t) sp.set("track", t);
    return `/venues?${sp.toString()}`;
  };

  return (
    <>
      <NavTabs />
      <section className="mx-auto max-w-6xl flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-ink-200 min-h-[80vh] py-6 px-4">
          <div className="text-xs uppercase tracking-wide text-ink-400 mb-3">Conferences</div>
          <ul className="space-y-1">
            {sidebarVenues.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/venues?id=${v.id}`}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ease-in-out-quart ${
                    v.id === current.id
                      ? "bg-accent-50 text-accent-700 font-medium"
                      : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  <span>
                    {v.label} {v.year}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {v.paper_count > 0 && (
                      <span className="text-xs text-ink-400 font-mono">
                        {v.paper_count.toLocaleString()}
                      </span>
                    )}
                    {v.isNew && (
                      <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        new
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="border-b border-ink-200 px-6 py-4 bg-white">
            <h1 className="text-lg font-semibold">{current.display}</h1>
            <div className="text-xs text-ink-400 font-mono">{current.id}</div>
          </div>

          {/* Track chip filter — only show when papers exist */}
          {showTrackFilter && (
            <div className="px-6 py-3 flex items-center gap-2 border-b border-ink-100 bg-white">
              <Link
                href={trackHref(undefined)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !track
                    ? "bg-accent-500 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                All
              </Link>
              <Link
                href={trackHref("oral")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  track === "oral"
                    ? "bg-accent-500 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                Oral
              </Link>
              <Link
                href={trackHref("poster")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  track === "poster"
                    ? "bg-accent-500 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                Poster
              </Link>
            </div>
          )}

          {/* Error state */}
          {feedError && (
            <div className="m-6 p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
              Failed to load papers: {feedError}
            </div>
          )}

          {/* Paper list */}
          {hasPapers && (
            <>
              <div className="bg-white border-x border-ink-200">
                {feed!.items.map((a, i) => (
                  <PaperCard
                    key={a.id}
                    article={a}
                    index={(page - 1) * PAGE_SIZE + i + 1}
                    from="venue"
                  />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
            </>
          )}

          {/* Coming soon / empty state */}
          {!hasPapers && !feedError && (
            <div className="bg-white px-6 py-16 text-center">
              <Construction className="h-10 w-10 mx-auto text-ink-300" />
              <h2 className="mt-4 text-base font-medium text-ink-700">Coming soon</h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-ink-500 leading-relaxed">
                {isWired
                  ? `${current.display} papers are being imported from OpenReview. Check back shortly.`
                  : `${current.display} papers will be imported from OpenReview / official proceedings. In the meantime, browse the `}
                {!isWired && (
                  <Link href="/" className="text-accent-600 hover:underline">
                    arXiv feed
                  </Link>
                )}
                {!isWired && " for daily preprints."}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
