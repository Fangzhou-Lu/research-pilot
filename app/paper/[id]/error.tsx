"use client";

import Link from "next/link";

export default function PaperError({ error, reset }: { error: Error; reset: () => void }) {
  const isRateLimit = /429|rate/i.test(error.message);
  return (
    <section className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load this paper</h1>
      <p className="mt-3 text-ink-500 text-sm">
        {isRateLimit
          ? "arXiv rate-limited the request. Wait a few seconds and try again — the cache will warm up after one successful fetch."
          : `The paper service returned an error: ${error.message}`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent-500 text-white px-4 py-1.5 text-sm hover:bg-accent-600"
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-sm hover:bg-ink-50"
        >
          Back to feed
        </Link>
      </div>
    </section>
  );
}
