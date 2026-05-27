import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { sortRoster, fullName } from "../../../../lib/players";
import { Card } from "../../../../components/ui";

export const metadata = { title: "Roster" };

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const team = await repos.teams.byId(id);
  if (!team) notFound();
  const players = sortRoster(await repos.players.byTeam(id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            <Link href="/coach" className="no-underline hover:underline">Coach</Link> /
            <Link href={`/coach/teams/${id}`} className="ml-1 no-underline hover:underline">{team.name}</Link> /
            Roster
          </p>
          <h1 className="mt-1">Roster ({players.length})</h1>
        </div>
        <Link href={`/coach/teams/${id}/roster/new`} className="btn-primary no-underline hover:no-underline">
          + Add player
        </Link>
      </header>

      {players.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No players yet. Add your first player to start building lineups and tracking baselines.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/coach/teams/${id}/roster/${p.id}`}
              className="card flex flex-col gap-2 no-underline hover:no-underline hover:ring-2 hover:ring-teal-200"
            >
              <header className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  #{p.jerseyNumber || "—"}
                </span>
                <span className="truncate text-base font-medium text-slate-800">
                  {fullName(p)}
                </span>
              </header>
              <div className="text-xs text-slate-500">
                {p.bats || "?"}/{p.throws || "?"} · {p.ageBand}
              </div>
              <div className="flex flex-wrap gap-1">
                {p.canPitch ? <span className="badge-info">Can pitch</span> : null}
                {p.canCatch ? <span className="badge-info">Can catch</span> : null}
                {p.injured ? <span className="badge-danger">Injured</span> : null}
                {Object.entries(p.positionRatings ?? {})
                  .filter(([, r]) => r === "preferred")
                  .slice(0, 4)
                  .map(([pos]) => (
                    <span key={pos} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {pos}
                    </span>
                  ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
