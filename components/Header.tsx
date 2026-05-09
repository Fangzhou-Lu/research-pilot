"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { MobileNavDrawer } from "./MobileNavDrawer";

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur transition-shadow duration-200 ease-in-out-quart">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden -ml-2 flex items-center justify-center h-9 w-9 rounded-md text-ink-600 hover:bg-ink-100 transition-colors duration-150"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 font-display font-semibold tracking-tight text-ink-900 transition-colors duration-150 ease-in-out-quart hover:text-accent-600"
          >
            <span className="inline-block h-7 w-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 shadow-xs" aria-hidden />
            <span>ResearchPilot</span>
          </Link>
          <div className="hidden md:flex flex-1 max-w-2xl">
            <SearchBar variant="compact" />
          </div>
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
