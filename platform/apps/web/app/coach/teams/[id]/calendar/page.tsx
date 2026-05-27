import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanReadTeam } from "../../../../lib/teams";
import { formatGameWhen } from "../../../../lib/games";

export const metadata = { title: "Team calendar" };

function startOfMonth(y: number, m: number): Date {
  return new Date(Date.UTC(y, m, 1));
}

function parseYm(s: string | undefined): { y: number; m: number } {
  const now = new Date();
  if (!s) return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
  const [ys, ms] = s.split("-");
  const y = Number(ys);
  const m = Number(ms) - 1;
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) {
    return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
  }
  return { y, m };
}

function ymString(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanReadTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, games, plans] = await Promise.all([
    repos.teams.byId(id),
    repos.games.list({ teamId: id }),
    repos.plans.list({ teamId: id, scheduled: true }),
  ]);
  if (!team) notFound();

  const { y, m } = parseYm(sp.ym);
  const first = startOfMonth(y, m);
  const next = startOfMonth(y, m + 1);
  const prev = startOfMonth(y, m - 1);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const startWeekday = first.getUTCDay();

  type CalendarItem =
    | { kind: "game"; id: string; href: string; label: string; title: string }
    | { kind: "practice"; id: string; href: string; label: string; title: string };

  const buckets = new Map<string, CalendarItem[]>();
  for (const g of games) {
    const d = new Date(g.startsAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m) continue;
    const key = d.toISOString().slice(0, 10);
    const arr = buckets.get(key) ?? [];
    arr.push({
      kind: "game",
      id: g.id,
      href: `/coach/teams/${id}/games/${g.id}`,
      label: `${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}`,
      title: formatGameWhen(g.startsAt),
    });
    buckets.set(key, arr);
  }
  for (const p of plans) {
    if (!p.scheduledAt) continue;
    const d = new Date(p.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m) continue;
    const key = d.toISOString().slice(0, 10);
    const arr = buckets.get(key) ?? [];
    arr.push({
      kind: "practice",
      id: p.id,
      href: `/plans/${p.id}`,
      label: `🏟 ${p.name}`,
      title: `${p.durationMin} min${p.location ? ` · ${p.location}` : ""}`,
    });
    buckets.set(key, arr);
  }

  const cells: Array<{ day: number | null; key?: string }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="m-0">
            {MONTH_NAMES[m]} {y}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/coach/teams/${id}/calendar?ym=${ymString(prev.getUTCFullYear(), prev.getUTCMonth())}`}
              className="btn-ghost no-underline hover:no-underline"
            >
              ← Prev
            </Link>
            <Link
              href={`/coach/teams/${id}/calendar`}
              className="btn-ghost no-underline hover:no-underline"
            >
              Today
            </Link>
            <Link
              href={`/coach/teams/${id}/calendar?ym=${ymString(next.getUTCFullYear(), next.getUTCMonth())}`}
              className="btn-ghost no-underline hover:no-underline"
            >
              Next →
            </Link>
            <a
              href={`/api/teams/${id}/calendar.ics`}
              className="btn-ghost no-underline hover:no-underline"
            >
              Subscribe (.ics)
            </a>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-1 font-semibold text-slate-600">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const list = c.key ? buckets.get(c.key) ?? [] : [];
          const isToday = c.key === todayKey;
          return (
            <div
              key={i}
              className={`min-h-[96px] bg-white px-2 py-1 ${
                c.day === null ? "opacity-40" : ""
              } ${isToday ? "ring-2 ring-inset ring-teal-500" : ""}`}
            >
              {c.day ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-700">{c.day}</span>
                </div>
              ) : null}
              <ul className="mt-1 space-y-1">
                {list.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={it.href}
                      className={`block truncate rounded px-1.5 py-0.5 text-[11px] no-underline hover:no-underline ${
                        it.kind === "game"
                          ? "bg-teal-50 text-teal-800 hover:bg-teal-100"
                          : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                      title={it.title}
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
