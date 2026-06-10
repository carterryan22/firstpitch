"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { key: string; label: string; href: string; icon: string };

/**
 * 5-tab team navigation (game-day-competitor §2.3 parity): Home · Games · Roster ·
 * Pitching · More. Renders inline under the team header on desktop and as a
 * fixed bottom tab bar on mobile — the same 5 tabs in both, so muscle memory
 * carries between web and the Capacitor iOS shell.
 */
export function TeamTabs({ teamId }: { teamId: string }) {
  const pathname = usePathname() ?? "";
  const base = `/coach/teams/${teamId}`;
  const tabs: Tab[] = [
    { key: "home", label: "Home", href: base, icon: "⚾" },
    { key: "games", label: "Games", href: `${base}/games`, icon: "📋" },
    { key: "roster", label: "Roster", href: `${base}/roster`, icon: "👥" },
    { key: "pitching", label: "Pitching", href: `${base}/pitching`, icon: "🥎" },
    { key: "more", label: "More", href: `${base}/more`, icon: "⋯" },
  ];

  function isActive(tab: Tab): boolean {
    if (tab.key === "home") return pathname === base || pathname === `${base}/`;
    // "More" owns every secondary surface that isn't its own top-level tab.
    if (tab.key === "more") {
      const ownedByTab = tabs.some(
        (t) => t.key !== "more" && t.key !== "home" && pathname.startsWith(t.href),
      );
      return pathname.startsWith(`${base}/more`) || (!ownedByTab && pathname !== base);
    }
    return pathname.startsWith(tab.href);
  }

  return (
    <>
      {/* Desktop / tablet: inline tab strip */}
      <nav
        aria-label="Team sections"
        data-tour="team-nav"
        className="hidden gap-1 border-b-2 border-dirt-300/40 sm:flex"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-0.5 border-b-2 px-4 py-2 text-sm font-type uppercase tracking-wide no-underline transition ${
                active
                  ? "border-field-700 text-field-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label="Team sections"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-2 border-dirt-300/50 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-type uppercase tracking-wide no-underline ${
                active ? "text-field-700" : "text-slate-500"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
