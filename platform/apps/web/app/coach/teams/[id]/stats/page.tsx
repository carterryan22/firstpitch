import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { StatsImportForm } from "./StatsImportForm";

export const metadata = { title: "Import stats" };

export default async function TeamStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const team = await repos.teams.byId(id);
  if (!team) notFound();
  const allPlayers = await repos.players.list();
  const roster = allPlayers
    .filter((p) => p.teamId === id && !p.archivedAt)
    .map((p) => ({
      playerId: p.id,
      displayName: `${p.firstName} ${p.lastName}`.trim(),
      jerseyNumber: p.jerseyNumber,
    }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href="/coach" className="no-underline hover:underline">Coach dashboard</Link> /
          <Link href={`/coach/teams/${team.id}`} className="ml-1 no-underline hover:underline">{team.name}</Link> /
          Import stats
        </p>
        <h1 className="mt-1">Import GameChanger stats</h1>
        <p className="mt-1 text-slate-600">
          Upload a filtered-stats CSV export. We&rsquo;ll fuzzy-match names against your roster
          ({roster.length} players) and flag anything that needs review.
        </p>
      </header>

      {roster.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-700">
            No players on this team yet.{" "}
            <Link href={`/coach/teams/${team.id}/roster/new`} className="underline">Add players</Link>{" "}
            before importing stats.
          </p>
        </div>
      ) : (
        <StatsImportForm roster={roster} />
      )}
    </div>
  );
}
