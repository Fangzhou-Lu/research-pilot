import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const window = pagesAround(page, totalPages);
  return (
    <div className="flex items-center justify-center gap-1 py-6">
      <PageBtn disabled={page <= 1} href={hrefFor(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </PageBtn>
      {window.map((p, i) =>
        p === -1 ? (
          <span key={`dots-${i}`} className="px-2 text-ink-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            className={`min-w-[2rem] h-8 inline-flex items-center justify-center rounded-md text-sm ${
              p === page
                ? "bg-accent-500 text-white"
                : "text-ink-600 hover:bg-ink-100"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      <PageBtn disabled={page >= totalPages} href={hrefFor(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </PageBtn>
    </div>
  );
}

function PageBtn({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-300">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-600 hover:bg-ink-100">
      {children}
    </Link>
  );
}

function pagesAround(page: number, total: number): number[] {
  const out: number[] = [];
  const add = (n: number) => out.push(n);
  add(1);
  if (page - 2 > 2) add(-1);
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) add(p);
  if (page + 2 < total - 1) add(-1);
  if (total > 1) add(total);
  return out;
}
