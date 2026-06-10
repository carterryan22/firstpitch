import type { CSSProperties } from "react";
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

  // Fairness metrics. Verdicts use deviation from the roster mean of field
  // innings (game-day ref §9.2 wording: "Sitting more than most" / "Even" / "Playing
  // more than most"). A player is flagged when they're more than ~15% off the
  // mean, so a balanced roster reads "Even" across the board.
  const innings = rows.map((r) => r.fieldInnings);
  const totalField = innings.reduce((a, b) => a + b, 0);
  const meanField = innings.length ? totalField / innings.length : 0;
  const band = Math.max(1, meanField * 0.15);
  const maxPos = Math.max(
    1,
    ...rows.flatMap((r) => POSITIONS.map((pos) => r.positions[pos] ?? 0)),
  );

  function verdict(field: number): { label: string; cls: string } {
    if (meanField === 0) return { label: "-", cls: "badge" };
    if (field < meanField - band) return { label: "Sitting more than most", cls: "badge-warn" };
    if (field > meanField + band) return { label: "Playing more than most", cls: "badge-info" };
    return { label: "Even", cls: "badge-ok" };
  }

  // Heat-map cell shading — deeper green the more innings logged at a position.
  function heatStyle(n: number): CSSProperties | undefined {
    if (!n) return undefined;
    const t = Math.min(1, n / maxPos);
    // emerald-ish: lighten toward white as t→0
    const alpha = 0.12 + t * 0.55;
    return { backgroundColor: `rgba(16, 122, 87, ${alpha.toFixed(2)})`, color: t > 0.6 ? "white" : undefined };
  }

  // Surface the single biggest imbalance as a coach nudge (the "Improve" the
  // game-day reference calls out — explain *why* + who to move).
  const sorted = rows.slice().sort((a, b) => a.fieldInnings - b.fieldInnings);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const nudge =
    lowest && highest && considered.length > 0 && highest.fieldInnings - lowest.fieldInnings >= 3
      ? `${fullName(lowest.player)} has ${lowest.fieldInnings} field innings vs ${fullName(highest.player)}'s ${highest.fieldInnings}. Start ${lowest.player.firstName} a couple extra innings next game to even it out.`
      : null;

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
          Innings played at each field position across {considered.length} game(s). Cells shade
          darker the more a player has logged at a spot; the verdict pill flags who is sitting or
          playing more than the rest of the roster.
        </p>
      </header>

      {nudge ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="m-0 text-sm text-amber-900">
            <span className="font-semibold">Balance tip:</span> {nudge}
          </p>
        </Card>
      ) : null}

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
              <th className="px-3 py-3 text-center">Playing time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = verdict(r.fieldInnings);
              return (
                <tr key={r.player.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <span className="inline-block w-7 text-right text-xs font-bold tabular-nums text-slate-600">
                      {r.player.jerseyNumber ? `#${r.player.jerseyNumber}` : ""}
                    </span>{" "}
                    {fullName(r.player)}
                    {r.player.injured ? <span className="ml-1 badge-danger text-[10px]">INJ</span> : null}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800">
                    {r.fieldInnings}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">{r.benchInnings}</td>
                  {POSITIONS.map((pos) => {
                    const n = r.positions[pos] ?? 0;
                    return (
                      <td
                        key={pos}
                        className="px-2 py-2 text-center text-slate-700"
                        style={heatStyle(n)}
                      >
                        {n || <span className="text-slate-300">·</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center text-slate-700">{r.pitches}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`${v.cls} whitespace-nowrap`}>{v.label}</span>
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
