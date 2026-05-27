import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { fullName, sortRoster } from "../../../../lib/players";
import { Card } from "../../../../components/ui";
import { summarize, POSITIONS, type Inning } from "@platform/lineup";

export const metadata = { title: "Fairness" };

export default async function FairnessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ window?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const windowParam = sp.window ?? "season"; // "season" | "last5"
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");
  const repos = getRepos();
  const [team, players, allGames] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
    repos.games.list({ teamId: id }),
  ]);
  if (!team) notFound();
  const roster = sortRoster(players);

  // Order games chronologically, pick window
  const games = allGames
    .slice()
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  const considered = windowParam === "last5" ? games.slice(-5) : games;

  // Aggregate
  const totals: Record<string, { fieldInnings: number; benchInnings: number; pitchInnings: number; catchInnings: number; positions: Partial<Record<string, number>>; pitches: number }> = {};
  for (const p of roster) {
    totals[p.id] = { fieldInnings: 0, benchInnings: 0, pitchInnings: 0, catchInnings: 0, positions: {}, pitches: 0 };
  }
  for (const g of considered) {
    const stats = summarize(((g.lineup ?? []) as unknown as Inning[]), roster.map((p) => p.id));
    for (const s of stats) {
      const t = totals[s.playerId];
      if (!t) continue;
      t.fieldInnings += s.fieldInnings;
      t.benchInnings += s.benchInnings;
      t.pitchInnings += s.pitchInnings;
      t.catchInnings += s.catchInnings;
      for (const [pos, n] of Object.entries(s.positions)) {
        t.positions[pos] = (t.positions[pos] ?? 0) + (n ?? 0);
      }
    }
    for (const [playerId, entry] of Object.entries(g.pitchCounts ?? {})) {
      const t = totals[playerId];
      if (t) t.pitches += entry?.pitches ?? 0;
    }
  }

  const rows = roster.map((p) => ({
    player: p,
    ...totals[p.id]!,
  }));

  // Fairness metrics
  const innings = rows.map((r) => r.fieldInnings);
  const benches = rows.map((r) => r.benchInnings);
  const maxField = Math.max(0, ...innings);
  const minField = innings.length ? Math.min(...innings) : 0;
  const benchMax = Math.max(0, ...benches);

  function rowFairness(field: number, bench: number): string {
    if (maxField === 0) return "—";
    if (field === minField && bench === benchMax) return "low";
    if (field === maxField) return "high";
    return "ok";
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="m-0">Fairness</h1>
          <div className="flex gap-1 text-sm">
            <Link
              href={`/coach/teams/${id}/fairness?window=season`}
              className={
                windowParam === "season"
                  ? "rounded bg-teal-600 px-3 py-1 text-white no-underline"
                  : "rounded border border-slate-200 px-3 py-1 text-slate-600 no-underline hover:border-slate-400"
              }
            >
              Season
            </Link>
            <Link
              href={`/coach/teams/${id}/fairness?window=last5`}
              className={
                windowParam === "last5"
                  ? "rounded bg-teal-600 px-3 py-1 text-white no-underline"
                  : "rounded border border-slate-200 px-3 py-1 text-slate-600 no-underline hover:border-slate-400"
              }
            >
              Last 5 games
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Innings played at each field position across {considered.length} game(s). The chips flag
          the player with the fewest field innings (and the most bench) versus the most field
          innings.
        </p>
      </header>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Player</th>
              <th className="px-3 py-3 text-center">F</th>
              <th className="px-3 py-3 text-center">BN</th>
              {POSITIONS.map((pos) => (
                <th key={pos} className="px-2 py-3 text-center">{pos}</th>
              ))}
              <th className="px-3 py-3 text-center">Pitches</th>
              <th className="px-3 py-3 text-center">Equity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const flag = rowFairness(r.fieldInnings, r.benchInnings);
              const cls =
                flag === "low" ? "badge-warn" : flag === "high" ? "badge-info" : "badge-ok";
              return (
                <tr key={r.player.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <span className="inline-block w-7 text-right text-xs font-bold tabular-nums text-slate-600">
                      {r.player.jerseyNumber ? `#${r.player.jerseyNumber}` : ""}
                    </span>{" "}
                    {fullName(r.player)}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800">
                    {r.fieldInnings}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">{r.benchInnings}</td>
                  {POSITIONS.map((pos) => (
                    <td key={pos} className="px-2 py-2 text-center text-slate-700">
                      {r.positions[pos] ?? ""}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-slate-700">{r.pitches}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={cls}>{flag}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={POSITIONS.length + 5} className="px-4 py-6 text-center text-slate-500">
                  No players or games yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
