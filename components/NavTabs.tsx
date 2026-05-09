"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "../lib/utils";

const TABS = [
  { href: "/interests", label: "Interests" },
  { href: "/", label: "arXiv" },
  { href: "/venues", label: "Venues" },
  { href: "/collection", label: "Collection" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 flex gap-6 text-sm">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={classNames(
                "py-3 border-b-2 -mb-px transition-colors duration-150 ease-in-out-quart",
                active
                  ? "border-accent-500 text-accent-600 font-medium"
                  : "border-transparent text-ink-500 hover:text-ink-800",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
