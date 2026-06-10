import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { fullName, sortRoster } from "../../../../lib/players";
import { METRICS, tierFor, TIER_BADGE, VERIFICATION_LABEL } from "../../../../lib/metrics";
import { Card } from "../../../../components/ui";

export const metadata = { title: "Team baselines" };

export default async function BaselinesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");
  const repos = getRepos();
  const [team, players] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
  ]);
  if (!team) notFound();
  const roster = sortRoster(players);

  // Latest per (player, metric) — single query, grouped in memory.
  const allEntries = await repos.metricEntries.list({
    playerIds: roster.map((p) => p.id),
  });
  const entriesByPlayer = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const arr = entriesByPlayer.get(e.playerId) ?? [];
    arr.push(e);
    entriesByPlayer.set(e.playerId, arr);
  }
  const entries = roster.map((p) => entriesByPlayer.get(p.id) ?? []);
  const latest: Map<string, Map<string, { value: number; verificationState: string; recordedAt: string }>> = new Map();
  roster.forEach((p, i) => {
    const map = new Map<string, { value: number; verificationState: string; recordedAt: string }>();
    const list = (entries[i] ?? []).slice().sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    for (const e of list) {
      if (!map.has(e.metricKey)) {
        map.set(e.metricKey, {
          value: e.value,
          verificationState: e.verificationState,
          recordedAt: e.recordedAt,
        });
      }
    }
    latest.set(p.id, map);
  });

  // Pick a stable column order: baseline measurables for this age band
  const cols = METRICS.filter((m) => m.cls === "measurable").slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Baselines</h1>
        <p className="mt-1 text-sm text-slate-500">
          Latest measurement per player. Click a row to record a new entry or attach video. Tier
          chips use age band <code>{team.ageBand}</code> directional thresholds.
        </p>
      </header>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Player</th>
              {cols.map((m) => (
                <th key={m.key} className="px-2 py-3 text-center">
                  {m.short ?? m.label}
                  <div className="text-[10px] font-normal text-slate-400">{m.unit}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((p) => {
              const map = latest.get(p.id) ?? new Map();
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <span className="inline-block w-8 text-right text-xs font-bold tabular-nums text-slate-600">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}
                    </span>{" "}
                    <Link
                      href={`/coach/teams/${id}/baselines/${p.id}`}
                      className="no-underline hover:underline"
                    >
                      {fullName(p)}
                    </Link>
                  </td>
                  {cols.map((m) => {
                    const v = map.get(m.key);
                    if (!v) {
                      return (
                        <td key={m.key} className="px-2 py-3 text-center text-slate-300">
                          -
                        </td>
                      );
                    }
                    const tier = tierFor(m.key, team.ageBand, v.value);
                    const verif = VERIFICATION_LABEL[v.verificationState];
                    return (
                      <td key={m.key} className="px-2 py-3 text-center">
                        <div className="text-base font-semibold text-slate-800">{v.value}</div>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {tier ? <span className={TIER_BADGE[tier]}>{tier}</span> : null}
                          {verif ? <span className={verif.cls}>{verif.label}</span> : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {roster.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-6 text-center text-sm text-slate-500">
                  No players on this team yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
