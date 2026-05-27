import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { fullName } from "../../../../lib/players";
import { metricByKey } from "../../../../lib/metrics";
import { computeGoalProgress, GOAL_STATUS_BADGE } from "../../../../lib/goals";
import { Card } from "../../../../components/ui";

export const metadata = { title: "Team goals" };

export default async function TeamGoalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status: statusParam } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, players, goals, entries] = await Promise.all([
    repos.teams.byId(id),
    repos.players.list({ teamId: id }),
    repos.goals.list({ teamId: id }),
    repos.metricEntries.list(),
  ]);
  if (!team) notFound();

  const statusFilter = (statusParam === "all" ? "all" : statusParam) ?? "active";
  const filtered = goals.filter((g) => statusFilter === "all" || g.status === statusFilter);
  const byPlayer = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byPlayer.get(e.playerId) ?? [];
    arr.push(e);
    byPlayer.set(e.playerId, arr);
  }
  const playerNameById = new Map(players.map((p) => [p.id, fullName(p)]));
  const rows = filtered
    .map((g) => ({
      progress: computeGoalProgress(g, byPlayer.get(g.playerId) ?? []),
      playerName: playerNameById.get(g.playerId) ?? "Unknown",
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));

  // Summary counts
  const counts = {
    active: goals.filter((g) => g.status === "active").length,
    achieved: goals.filter((g) => g.status === "achieved").length,
    archived: goals.filter((g) => g.status === "archived").length,
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Team goals</h1>
        <p className="mt-1 text-sm text-slate-500">
          {counts.active} active · {counts.achieved} achieved · {counts.archived} archived
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["active", "achieved", "archived", "all"] as const).map((s) => (
          <Link
            key={s}
            href={`/coach/teams/${id}/goals${s === "active" ? "" : `?status=${s}`}`}
            className={
              statusFilter === s
                ? "rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white no-underline"
                : "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 no-underline hover:bg-slate-50"
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No goals in this view. Open a player from{" "}
            <Link href={`/coach/teams/${id}/baselines`}>baselines</Link> and add one.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Baseline → Target</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ progress: p, playerName }) => {
                const def = metricByKey(p.goal.metricKey);
                const badge = GOAL_STATUS_BADGE[p.status];
                const pct = Math.round(Math.max(0, Math.min(1, p.fraction)) * 100);
                const barCls =
                  p.status === "achieved"
                    ? "bg-emerald-500"
                    : p.status === "regression"
                    ? "bg-red-500"
                    : p.status === "behind"
                    ? "bg-amber-500"
                    : "bg-teal-600";
                return (
                  <tr key={p.goal.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link href={`/coach/teams/${id}/baselines/${p.goal.playerId}`}>{playerName}</Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{def?.label ?? p.goal.metricKey}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">
                      {p.goal.baseline} → {p.targetValue} {def?.unit}
                    </td>
                    <td className="px-4 py-2 font-mono">{p.currentValue ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={badge.cls}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {p.goal.targetDate ? new Date(p.goal.targetDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
