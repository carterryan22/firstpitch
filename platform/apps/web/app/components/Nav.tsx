import Link from "next/link";

export interface NavItem { href: string; label: string; roles?: string[]; flag?: keyof typeof FEATURE_FLAGS }

// Menu items tagged with `flag` are temporarily hidden from the nav. The pages
// stay reachable by direct URL; set the matching env var to "1" (or "true") to
// show the item in the menu again.
const FEATURE_FLAGS = {
  gear: process.env.NEXT_PUBLIC_FEATURE_GEAR,
  fields: process.env.NEXT_PUBLIC_FEATURE_FIELDS,
  safety: process.env.NEXT_PUBLIC_FEATURE_SAFETY,
} as const;

function flagOn(flag: keyof typeof FEATURE_FLAGS): boolean {
  const v = FEATURE_FLAGS[flag];
  return v === "1" || v === "true";
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/for/coach", label: "Coaches" },
  { href: "/for/parent", label: "Parents" },
  { href: "/for/athlete", label: "Athletes" },
  { href: "/coach", label: "Dashboard", roles: ["coach", "admin"] },
  { href: "/parent", label: "Dashboard", roles: ["parent", "player"] },
  { href: "/practice/new", label: "New practice", roles: ["coach", "admin"] },
  { href: "/drills", label: "Drills" },
  { href: "/gear", label: "Gear", flag: "gear" },
  { href: "/fields", label: "Fields", flag: "fields" },
  { href: "/learn", label: "Learn" },
  { href: "/safety", label: "Safety", flag: "safety" },
  { href: "/favorites", label: "★ Saved" },
  { href: "/coach/chat", label: "Coach chat", roles: ["coach", "admin"] },
];

export function Nav({ role }: { role?: string | null }) {
  const items = NAV.filter((n) => {
    if (n.roles && !(role && n.roles.includes(role))) return false;
    if (n.flag && !flagOn(n.flag)) return false;
    return true;
  });
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-type)" }}>
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className="inline-flex min-h-[44px] items-center rounded-none border border-transparent px-3 py-2 text-cream/80 no-underline hover:border-cream hover:text-cream"
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
