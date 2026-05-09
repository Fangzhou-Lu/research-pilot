import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaperHeader } from "../../../components/PaperHeader";
import { PaperWorkspace } from "../../../components/PaperWorkspace";
import { PaperRightRail } from "../../../components/PaperRightRail";
import { apiArticle } from "../../../lib/api";
import { BACKEND_URL } from "../../../lib/user";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const a = await apiArticle(params.id).catch(() => null);
  return { title: a ? `${a.title} · ResearchPilot` : "Paper · ResearchPilot" };
}

async function recordClick(articleId: string, from: string) {
  try {
    await fetch(`${BACKEND_URL}/api/v1/clicks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "server" },
      body: JSON.stringify({ article_id: articleId, from }),
      cache: "no-store",
    });
  } catch {
    // non-blocking
  }
}

export default async function PaperPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { from?: string };
}) {
  const article = await apiArticle(params.id);
  if (!article) notFound();

  if (searchParams?.from) {
    void recordClick(article.id, searchParams.from);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: article.title,
    abstract: article.abstract,
    datePublished: article.published,
    author: article.authors.map((name) => ({ "@type": "Person", name })),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "arxiv",
      value: article.arxiv_id,
    },
    url: article.abs_url,
  };

  return (
    <div className="bg-white text-zinc-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Body — 2 columns: article left, right rail (chatpaper proportions ~ 730 / 380) */}
      <div className="mx-auto max-w-[1232px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-x-8 gap-y-6">
        {/* Main article column */}
        <article className="min-w-0">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
            <div className="flex items-center gap-1.5">
              <Link
                href="/"
                className="inline-flex items-center gap-1 hover:text-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
              <span className="mx-1 text-zinc-300">/</span>
              <Link href="/" className="hover:text-zinc-800">arXiv</Link>
              <span className="mx-1 text-zinc-300">/</span>
              <span className="font-mono text-zinc-600">{article.primary_category}</span>
            </div>
            <span className="font-mono text-zinc-400 truncate">{article.id}</span>
          </div>
          <PaperHeader article={article} />
          <PaperWorkspace article={article} />
        </article>

        {/* Right rail */}
        <aside className="hidden lg:block self-start sticky top-20">
          <PaperRightRail article={article} />
        </aside>
      </div>
    </div>
  );
}
