import { Hero } from "../components/Hero";
import { NavTabs } from "../components/NavTabs";
import { PaperCard } from "../components/PaperCard";
import { Pagination } from "../components/Pagination";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { DatePicker } from "../components/DatePicker";
import { FeedHotkeys } from "../components/FeedHotkeys";
import { ArxivSidebar } from "../components/ArxivSidebar";
import { apiList, apiCategoryCounts } from "../lib/api";

const PAGE_SIZE = 20;

export const revalidate = 600;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { page?: string; cat?: string; date?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const cat = searchParams?.cat ?? "cs.AI";
  const date = searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : undefined;

  let feed;
  let error: string | null = null;
  try {
    feed = await apiList({ cat, page, pageSize: PAGE_SIZE, date });
  } catch (e) {
    error = (e as Error).message;
  }

  // Category sidebar — best-effort; page still renders if backend is down
  let categoryCounts = null;
  try {
    categoryCounts = await apiCategoryCounts(7);
  } catch {
    // sidebar degrades gracefully
  }

  const totalPages = feed ? Math.min(50, Math.ceil(feed.total / PAGE_SIZE)) : 1;

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    sp.set("cat", cat);
    sp.set("page", String(p));
    if (date) sp.set("date", date);
    return `/?${sp.toString()}`;
  };

  return (
    <>
      <Hero />
      <NavTabs />
      <div className="mx-auto max-w-7xl flex">
        {/* chatpaper-style left sidebar */}
        {categoryCounts && categoryCounts.length > 0 && (
          <ArxivSidebar
            counts={categoryCounts}
            selectedCat={cat}
            selectedDate={date}
          />
        )}

        {/* Main feed */}
        <section className="flex-1 min-w-0">
          <div className="px-6 py-3 flex items-center justify-between gap-3">
            <DatePicker basePath="/" />
            <ViewModeToggle />
          </div>
          {error && (
            <div className="m-6 p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
              Failed to load arXiv feed: {error}
            </div>
          )}
          <div className="bg-white border-x border-ink-200">
            {feed?.items.map((a, i) => (
              <PaperCard key={a.id} article={a} index={(page - 1) * PAGE_SIZE + i + 1} from="home" />
            ))}
            {feed && feed.items.length === 0 && (
              <div className="px-6 py-16 text-center text-ink-400">No papers found.</div>
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
        </section>
      </div>
      <FeedHotkeys />
    </>
  );
}
