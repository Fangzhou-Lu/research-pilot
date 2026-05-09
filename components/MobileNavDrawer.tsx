"use client";

import { Drawer } from "vaul";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VENUES } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("rp:uid");
      setUid(stored ? stored.slice(0, 8) : null);
    } catch {
      // ignore
    }
  }, []);

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <Drawer.Root direction="left" open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-white shadow-xl rounded-r-xl"
          style={{ width: "80vw", maxWidth: "360px" }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* User identity */}
            <div className="px-5 py-5 border-b border-ink-100">
              <div className="flex items-center gap-2.5">
                <span className="inline-block h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 shadow-xs shrink-0" aria-hidden />
                <div>
                  <div className="text-sm font-semibold text-ink-900 leading-tight">ResearchPilot</div>
                  <div className="text-xs text-ink-400 mt-0.5 font-mono">
                    {uid ? `uid:${uid}` : "anonymous"}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary nav */}
            <nav className="px-3 py-4 border-b border-ink-100">
              <div className="text-[10px] uppercase tracking-wide text-ink-400 px-2 mb-2">Navigation</div>
              {[
                { href: "/interests", label: "My Interests" },
                { href: "/", label: "Home Feed" },
                { href: "/venues", label: "Venues" },
                { href: "/collection", label: "Collection" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className="flex items-center rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 hover:text-accent-600 transition-colors duration-150"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Venues list */}
            <div className="px-3 py-4 border-b border-ink-100">
              <div className="text-[10px] uppercase tracking-wide text-ink-400 px-2 mb-2">Conferences</div>
              <ul className="space-y-0.5">
                {VENUES.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/venues?id=${v.id}`}
                      onClick={handleLinkClick}
                      className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-accent-600 transition-colors duration-150"
                    >
                      <span>{v.label} {v.year}</span>
                      {"isNew" in v && v.isNew && (
                        <span className="ml-2 rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          new
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ink-100 shrink-0">
            <div className="flex gap-3 text-xs text-ink-400">
              <Link href="/disclaimer" onClick={handleLinkClick} className="hover:text-ink-700">
                Disclaim
              </Link>
              <span>·</span>
              <Link href="/about" onClick={handleLinkClick} className="hover:text-ink-700">
                About
              </Link>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
