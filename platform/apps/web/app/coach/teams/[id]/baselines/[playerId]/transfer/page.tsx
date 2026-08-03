import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanManageTeam } from "../../../../../../lib/teams";
import { fullName } from "../../../../../../lib/players";
import { Card } from "../../../../../../components/ui";
import {
  analyzeTransfer,
  type TransferGame,
  type TransferRole,
  type TransferConfidence,
} from "../../../../../../lib/transfer";

export const metadata = { title: "Transfer Score" };

const ROLES: Array<{ value: TransferRole; label: string }> = [
  { value: "hitting", label: "Hitting" },
  { value: "pitching", label: "Pitching" },
  { value: "fielding", label: "Fielding" },
];

const CONFIDENCE_BADGE: Record<TransferConfidence, string> = {
  low: "badge-warn",
  medium: "badge-info",
  strong: "badge-ok",
  very_strong: "badge-ok",
};

function isRole(v: string | undefined): v is TransferRole {
  return v === "hitting" || v === "pitching" || v === "fielding";
}

/** YYYY-MM-DD for an offset from today. */
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtVal(format: "pct" | "rate3", v: number): string {
  return format === "pct" ? `${v}%` : v.toFixed(3).replace(/^0/, "");
}

export default async function TransferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; playerId: string }>;
  searchParams: Promise<{ role?: string; start?: string; end?: string }>;
}) {
  const { id, playerId } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, player, games, stats] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byId(playerId),
    repos.games.list({ teamId: id }),
    repos.playerGameStats.list({ playerId }),
  ]);
  if (!team || !player || player.teamId !== id) notFound();

  const role: TransferRole = isRole(sp.role) ? sp.role : "hitting";
  const blockStart = sp.start ?? dayOffset(-28);
  const blockEnd = sp.end ?? dayOffset(0);

  // Join each stats record to its game date.
  const dateByGameId = new Map(games.map((g) => [g.id, g.startsAt]));
  const transferGames: TransferGame[] = [];
  for (const s of stats) {
    const date = dateByGameId.get(s.gameId);
    if (!date) continue;
    const g: TransferGame = { date };
    if (s.batting) g.batting = s.batting;
    if (s.pitching) g.pitching = s.pitching;
    if (s.fielding) g.fielding = s.fielding;
    transferGames.push(g);
  }

  const analysis = analyzeTransfer({
    role,
    blockStart,
    blockEnd,
    games: transferGames,
    playerName: fullName(player),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link
            href={`/coach/teams/${id}/baselines/${playerId}`}
            className="no-underline hover:underline"
          >
            ← {fullName(player)} baselines
          </Link>
        </p>
        <h1 className="mt-1">Transfer Score</h1>
        <p className="mt-1 text-sm text-slate-500">
          Is the training showing up in games? Pick a training-block window and we compare game
          stats before vs. during the block, never concluding from too small a sample.
        </p>
      </header>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Role</span>
            <select name="role" defaultValue={role} className="select mt-1">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Block start</span>
            <input type="date" name="start" defaultValue={blockStart} className="input mt-1" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Block end</span>
            <input type="date" name="end" defaultValue={blockEnd} className="input mt-1" />
          </label>
          <button type="submit" className="btn-primary">
            Analyze transfer
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-base">Result</h2>
          <span className={CONFIDENCE_BADGE[analysis.confidence]}>{analysis.confidenceReason}</span>
        </div>
        <p className="mt-2 text-sm text-slate-700">{analysis.insight}</p>

        <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <div>
            Pre-block: {analysis.pre.games} {analysis.pre.games === 1 ? "game" : "games"} ·{" "}
            {analysis.pre.sampleLabel}
          </div>
          <div>
            Post-block: {analysis.post.games} {analysis.post.games === 1 ? "game" : "games"} ·{" "}
            {analysis.post.sampleLabel}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Game metrics</h2>
        {analysis.metrics.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No metrics for this role.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-1">Metric</th>
                <th className="pb-1">Pre</th>
                <th className="pb-1">Post</th>
                <th className="pb-1">Change</th>
              </tr>
            </thead>
            <tbody>
              {analysis.metrics.map((m) => (
                <tr key={m.key} className="border-t border-slate-100">
                  <td className="py-1">
                    {m.label}{" "}
                    <span className="text-xs text-dirt-700">
                      ({m.better === "up" ? "higher better" : "lower better"})
                    </span>
                  </td>
                  <td className="py-1">{fmtVal(m.format, m.pre)}</td>
                  <td className="py-1">{fmtVal(m.format, m.post)}</td>
                  <td className="py-1">
                    <span className={m.delta === 0 ? "text-dirt-700" : m.improved ? "text-field-700" : "text-rose-600"}>
                      {m.delta > 0 ? "+" : ""}
                      {fmtVal(m.format, m.delta)}
                      {m.delta !== 0 ? (m.improved ? " ✓" : " ✗") : " -"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">For the family</h2>
          <p className="mt-2 text-sm text-slate-700">{analysis.parentInsight}</p>
        </Card>
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">For the player</h2>
          <p className="mt-2 text-sm text-slate-700">{analysis.kidInsight}</p>
        </Card>
      </div>
    </div>
  );
}
