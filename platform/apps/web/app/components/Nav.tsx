import Link from "next/link";

export interface NavItem { href: string; label: string; roles?: string[] }

export const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/coach", label: "Dashboard", roles: ["coach", "admin"] },
  { href: "/parent", label: "Dashboard", roles: ["parent", "player"] },
  { href: "/practice/new", label: "New practice", roles: ["coach", "admin"] },
  { href: "/drills", label: "Drills" },
  { href: "/missions", label: "Missions" },
  { href: "/safety", label: "Safety" },
  { href: "/coach/chat", label: "Coach chat", roles: ["coach", "admin"] },
];

export function Nav({ role }: { role?: string | null }) {
  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className="rounded-md px-3 py-1.5 text-slate-700 no-underline hover:bg-slate-100 hover:text-slate-900"
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
