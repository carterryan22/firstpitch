import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { canPitchToday } from "@platform/safety";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { ageFromDob, fullName, sortRoster } from "../../../../lib/players";
import { Card } from "../../../../components/ui";

export const metadata = { title: "Pitching board" };

function ageBandCenter(band: string): number {
  if (band.startsWith("6-8")) return 8;
  if (band.startsWith("9-12")) return 11;
  if (band.startsWith("13-15")) return 14;
  return 16;
}

export default async function PitchingBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, players, games] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
    repos.games.list({ teamId: id }),
  ]);
  if (!team) notFound();

  const today = new Date();
  const fallbackAge = ageBandCenter(team.ageBand);
  const pitchers = sortRoster(players).filter((p) => p.canPitch);

  const rows = pitchers.map((p) => {
    const outingsByDate: Record<string, number> = {};
    let lastDate: string | null = null;
    let lastCount = 0;
    for (const g of games) {
      const entry = g.pitchCounts?.[p.id];
      if (!entry || !entry.pitches) continue;
      const day = (g.startsAt ?? "").slice(0, 10);
      if (!day) continue;
      outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
      if (!lastDate || day > lastDate) {
        lastDate = day;
        lastCount = entry.pitches;
      }
    }
    const age = p.dob ? ageFromDob(p.dob) : fallbackAge;
    const check = canPitchToday({
      age,
      date: today,
      plannedPitches: 1,
      history: {
        outingsByDate,
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    // 7-day total
    let week = 0;
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() - 7);
    for (const [d, n] of Object.entries(outingsByDate)) {
      if (new Date(d + "T00:00:00Z") >= cutoff) week += n;
    }
    return { player: p, age, lastDate, lastCount, week, check };
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Pitching board</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pitch Smart-aware availability for every pitcher on this team. Daily max comes from the
          age table; rest comes from each player&apos;s last outing.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No players are marked as &ldquo;Can pitch&rdquo;. Toggle the flag on the{" "}
            <Link href={`/coach/teams/${id}/roster`}>roster</Link>.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Last outing</th>
                <th className="px-4 py-3">7-day</th>
                <th className="px-4 py-3">Daily max</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ player, age, lastDate, lastCount, week, check }) => {
                const status = check.allowed
                  ? check.warnings.length > 0
                    ? { label: "Available • warn", cls: "badge-warn" }
                    : { label: "Available", cls: "badge-ok" }
                  : check.requiredRestDaysRemaining > 0
                  ? {
                      label: `Rest ${check.requiredRestDaysRemaining}d`,
                      cls: "badge-danger",
                    }
                  : { label: "Blocked", cls: "badge-danger" };
                return (
                  <tr key={player.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <span className="inline-block w-8 text-right text-xs font-bold tabular-nums text-slate-600">
                        {player.jerseyNumber ? `#${player.jerseyNumber}` : ""}
                      </span>{" "}
                      <Link href={`/coach/teams/${id}/roster/${player.id}`} className="no-underline hover:underline">
                        {fullName(player)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{age}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {lastDate ? `${lastDate} · ${lastCount}p` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{week}p</td>
                    <td className="px-4 py-3 text-slate-600">{check.effectiveDailyMax}</td>
                    <td className="px-4 py-3">
                      <span className={status.cls}>{status.label}</span>
                      {check.reasons.length > 0 ? (
                        <ul className="mt-1 list-disc pl-4 text-xs text-slate-500">
                          {check.reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      ) : null}
                      {check.warnings.length > 0 ? (
                        <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
                          {check.warnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      ) : null}
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
