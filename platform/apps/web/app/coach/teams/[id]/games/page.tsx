import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { gamesForTeam, splitUpcomingPast, statusLabel, formatGameWhen } from "../../../../lib/games";
import { Card } from "../../../../components/ui";
import { ScheduleImport } from "./ScheduleImport";

export const metadata = { title: "Games" };

export default async function GamesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const team = await getRepos().teams.byId(id);
  if (!team) notFound();
  const { upcoming, past } = splitUpcomingPast(await gamesForTeam(id));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            <Link href="/coach" className="no-underline hover:underline">Coach</Link> /
            <Link href={`/coach/teams/${id}`} className="ml-1 no-underline hover:underline">{team.name}</Link> /
            Games
          </p>
          <h1 className="mt-1">Games</h1>
        </div>
        <Link href={`/coach/teams/${id}/games/new`} className="btn-primary no-underline hover:no-underline">
          + New game
        </Link>
      </header>

      <ScheduleImport teamId={id} />

      <section className="space-y-3">
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No upcoming games scheduled.</p></Card>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/coach/teams/${id}/games/${g.id}`}
                  className="card flex flex-wrap items-baseline justify-between gap-2 no-underline hover:no-underline hover:ring-2 hover:ring-teal-200"
                >
                  <div>
                    <div className="text-base font-medium text-slate-900">
                      {g.homeAway === "home" ? "vs" : "@"} {g.opponent}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatGameWhen(g.startsAt)}{g.venue ? ` · ${g.venue}` : ""} · {g.innings} innings
                    </div>
                  </div>
                  <span className={statusLabel(g.status).cls}>{statusLabel(g.status).label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Past ({past.length})</h2>
        {past.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No completed games yet.</p></Card>
        ) : (
          <ul className="space-y-2">
            {past.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/coach/teams/${id}/games/${g.id}`}
                  className="card flex flex-wrap items-baseline justify-between gap-2 no-underline hover:no-underline hover:ring-2 hover:ring-slate-200"
                >
                  <div>
                    <div className="text-base font-medium text-slate-900">
                      {g.homeAway === "home" ? "vs" : "@"} {g.opponent}
                      {g.finalScore ? (
                        <span className="ml-2 text-sm text-slate-500">
                          {g.finalScore.us}–{g.finalScore.them}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">{formatGameWhen(g.startsAt)}</div>
                  </div>
                  <span className={statusLabel(g.status).cls}>{statusLabel(g.status).label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
