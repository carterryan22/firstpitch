import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { fullName } from "../../../../../lib/players";
import {
  METRICS,
  metricByKey,
  tierFor,
  TIER_BADGE,
  VERIFICATION_LABEL,
} from "../../../../../lib/metrics";
import { Card } from "../../../../../components/ui";
import { Sparkline } from "../../../../../components/Sparkline";
import { MetricEntryForm } from "./MetricEntryForm";

export const metadata = { title: "Player baselines" };

export default async function PlayerBaselinePage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");
  const repos = getRepos();
  const [team, player, entries] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byId(playerId),
    repos.metricEntries.list({ playerId }),
  ]);
  if (!team || !player || player.teamId !== id) notFound();

  const sorted = entries.slice().sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  const latestByMetric = new Map<string, (typeof sorted)[number]>();
  for (const e of sorted) if (!latestByMetric.has(e.metricKey)) latestByMetric.set(e.metricKey, e);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/baselines`} className="no-underline hover:underline">
            ← {team.name} baselines
          </Link>
        </p>
        <h1 className="mt-1">{fullName(player)}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Age band {team.ageBand} · {entries.length} total entries
        </p>
      </header>

      <Card>
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Record new entry</h2>
        <div className="mt-3">
          <MetricEntryForm playerId={player.id} />
        </div>
      </Card>

      <section>
        <h2>Progress</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => {
            const series = sorted
              .filter((e) => e.metricKey === m.key)
              .slice()
              .reverse() // oldest first for the chart
              .map((e) => ({ x: new Date(e.recordedAt).getTime(), y: e.value }));
            if (series.length === 0) return null;
            const first = series[0]!;
            const last = series[series.length - 1]!;
            const delta = last.y - first.y;
            const deltaPct = first.y ? (delta / first.y) * 100 : 0;
            const improved = m.lowerIsBetter ? delta < 0 : delta > 0;
            return (
              <div key={m.key} className="card">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{m.label}</div>
                  <div className="text-xs text-slate-400">{series.length} entries</div>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-800">
                    {last.y} <span className="text-sm font-normal text-slate-500">{m.unit}</span>
                  </span>
                  <span
                    className={
                      delta === 0
                        ? "text-xs text-slate-400"
                        : improved
                        ? "text-xs font-semibold text-emerald-700"
                        : "text-xs font-semibold text-amber-700"
                    }
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(2)} {m.unit}
                    {first.y !== last.y && first.y
                      ? ` (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
                      : ""}
                  </span>
                </div>
                <div className="mt-2">
                  <Sparkline points={series} lowerIsBetter={m.lowerIsBetter} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Latest by metric</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => {
            const e = latestByMetric.get(m.key);
            const tier = e ? tierFor(m.key, team.ageBand, e.value) : null;
            const verif = e ? VERIFICATION_LABEL[e.verificationState] : null;
            return (
              <div key={m.key} className="card">
                <div className="text-xs uppercase tracking-wide text-slate-500">{m.label}</div>
                {e ? (
                  <>
                    <div className="mt-1 text-2xl font-bold text-slate-800">
                      {e.value} <span className="text-base font-normal text-slate-500">{m.unit}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {tier ? <span className={TIER_BADGE[tier]}>{tier}</span> : null}
                      {verif ? <span className={verif.cls}>{verif.label}</span> : null}
                      <span>{new Date(e.recordedAt).toLocaleDateString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-400">No data</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>History</h2>
        {sorted.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No entries yet.</p></Card>
        ) : (
          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => {
                  const def = metricByKey(e.metricKey);
                  const tier = tierFor(e.metricKey, team.ageBand, e.value);
                  const verif = VERIFICATION_LABEL[e.verificationState];
                  return (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-600">
                        {new Date(e.recordedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{def?.label ?? e.metricKey}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">
                        {e.value} <span className="text-xs font-normal text-slate-500">{def?.unit}</span>
                      </td>
                      <td className="px-4 py-2">
                        {verif ? <span className={verif.cls}>{verif.label}</span> : e.verificationState}
                      </td>
                      <td className="px-4 py-2">
                        {tier ? <span className={TIER_BADGE[tier]}>{tier}</span> : null}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{e.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
