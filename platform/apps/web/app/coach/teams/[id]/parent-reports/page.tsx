import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos, type ParentReportRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { sortRoster, fullName } from "../../../../lib/players";
import { previousMonthWindow, isEditedSinceApproval } from "../../../../lib/monthlyReport";
import { ParentReportsManager, type ReportVM } from "./ParentReportsManager";

export const metadata = { title: "Parent reports" };
export const dynamic = "force-dynamic";

export default async function ParentReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login?next=" + encodeURIComponent(`/coach/teams/${id}/parent-reports`));
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, players, reports] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
    repos.parentReports.list({ teamId: id }),
  ]);
  if (!team) notFound();

  const roster = sortRoster(players);
  const nameById = new Map(roster.map((p) => [p.id, fullName(p)]));

  const toVM = (r: ParentReportRecord): ReportVM => ({
    id: r.id,
    playerId: r.playerId,
    playerName: nameById.get(r.playerId) ?? "Unknown player",
    periodStart: r.periodStart,
    periodLabel: r.periodLabel,
    status: r.status,
    editedSinceApproval: isEditedSinceApproval(r),
    sharedVia: r.sharedVia ?? [],
    content: r.content,
  });

  // Group by period, newest first. The roster order is preserved within a period.
  const byPeriod = new Map<string, { label: string; reports: ReportVM[] }>();
  for (const r of reports) {
    const bucket = byPeriod.get(r.periodStart) ?? { label: r.periodLabel, reports: [] };
    bucket.reports.push(toVM(r));
    byPeriod.set(r.periodStart, bucket);
  }
  const rosterIndex = new Map(roster.map((p, i) => [p.id, i]));
  const periods = Array.from(byPeriod.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([periodStart, bucket]) => ({
      periodStart,
      label: bucket.label,
      reports: bucket.reports.sort(
        (a, b) => (rosterIndex.get(a.playerId) ?? 0) - (rosterIndex.get(b.playerId) ?? 0),
      ),
    }));

  const nextPeriod = previousMonthWindow(new Date());

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1>Parent reports</h1>
        <p className="max-w-2xl text-ink/70">
          Monthly, parent-safe progress updates. The app drafts them; you review, edit, and
          approve before anything is shared. <strong>Nothing reaches a family until you share it.</strong>
        </p>
      </header>

      <ParentReportsManager
        teamId={id}
        rosterCount={roster.length}
        nextPeriodLabel={nextPeriod.periodLabel}
        nextPeriodStart={nextPeriod.periodStart}
        periods={periods}
      />
    </div>
  );
}
