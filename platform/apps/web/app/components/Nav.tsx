import Link from "next/link";

export interface NavItem { href: string; label: string; roles?: string[] }

export const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/for/coach", label: "Coaches" },
  { href: "/for/parent", label: "Parents" },
  { href: "/for/athlete", label: "Athletes" },
  { href: "/coach", label: "Dashboard", roles: ["coach", "admin"] },
  { href: "/parent", label: "Dashboard", roles: ["parent", "player"] },
  { href: "/practice/new", label: "New practice", roles: ["coach", "admin"] },
  { href: "/drills", label: "Drills" },
  { href: "/gear", label: "Gear" },
  { href: "/fields", label: "Fields" },
  { href: "/learn", label: "Learn" },
  { href: "/safety", label: "Safety" },
  { href: "/favorites", label: "★ Saved" },
  { href: "/coach/chat", label: "Coach chat", roles: ["coach", "admin"] },
];

export function Nav({ role }: { role?: string | null }) {
  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
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
