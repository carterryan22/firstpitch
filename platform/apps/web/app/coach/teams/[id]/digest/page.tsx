import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { buildTeamDigest } from "../../../../lib/digest";
import { Card } from "../../../../components/ui";
import { ShareDigestButton } from "./ShareDigestButton";

export const metadata = { title: "Weekly digest" };
export const dynamic = "force-dynamic";

export default async function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const team = await repos.teams.byId(id);
  if (!team) notFound();
  const players = await repos.players.byTeam(id);
  const [games, plans, goals, teamMetricEntries] = await Promise.all([
    repos.games.list({ teamId: id }),
    repos.plans.list({ teamId: id }),
    repos.goals.list({ teamId: id }),
    repos.metricEntries.list({ playerIds: players.map((p) => p.id) }),
  ]);

  const digest = buildTeamDigest({
    team,
    players,
    games,
    plans,
    goals,
    metricEntries: teamMetricEntries,
  });

  const has =
    digest.upcomingGames.length +
      digest.upcomingPractices.length +
      digest.pitcherReturns.length +
      digest.staleBaselines.length +
      digest.goalsAtRisk.length +
      digest.goalsAchievedThisWeek.length >
    0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Weekly digest</h1>
        <p className="mt-1 text-sm text-slate-500">
          Window: {new Date(digest.windowStart).toLocaleDateString()} →{" "}
          {new Date(digest.windowEnd).toLocaleDateString()}
        </p>
        <div className="mt-3">
          <ShareDigestButton
            url={`/coach/teams/${id}/digest`}
            digest={{
              teamName: team.name,
              windowStart: digest.windowStart,
              windowEnd: digest.windowEnd,
              upcomingGames: digest.upcomingGames.map((g) => ({
                opponent: g.opponent,
                homeAway: g.homeAway,
                startsAt: g.startsAt,
              })),
              upcomingPractices: digest.upcomingPractices.map((p) => ({
                name: p.name,
                scheduledAt: p.scheduledAt,
              })),
              pitcherReturns: digest.pitcherReturns.map((p) => ({
                name: p.name,
                availableOn: p.availableOn,
              })),
              goalsAchievedThisWeek: digest.goalsAchievedThisWeek.map((g) => ({
                name: g.name,
                metricKey: g.metricKey,
              })),
              goalsAtRisk: digest.goalsAtRisk.map((g) => ({
                name: g.name,
                metricKey: g.metricKey,
              })),
            }}
          />
        </div>
      </header>

      {!has ? (
        <Card>
          <p className="text-sm text-slate-500">
            Nothing notable in the next 7 days. Check back after games or new baselines.
          </p>
        </Card>
      ) : null}

      {digest.upcomingGames.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Upcoming games</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.upcomingGames.map((g) => (
              <li key={g.id} className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {g.homeAway === "home" ? "vs" : "@"} {g.opponent}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(g.startsAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-500">
                  RSVPs · ✓ {g.rsvpYes} · ✕ {g.rsvpNo} · ? {g.rsvpMaybe} · — {g.rsvpUnknown}
                  {g.venue ? ` · ${g.venue}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {digest.upcomingPractices.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Upcoming practices</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.upcomingPractices.map((p) => (
              <li key={p.id} className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(p.scheduledAt).toLocaleString()} · {p.durationMin}m
                  </span>
                </div>
                {p.location ? <p className="text-xs text-slate-500">{p.location}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {digest.pitcherReturns.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Pitchers returning</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.pitcherReturns.map((p) => (
              <li key={p.playerId} className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-teal-700">Available {p.availableOn}</span>
                </div>
                <p className="text-xs text-slate-500">{p.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {digest.goalsAchievedThisWeek.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Goals achieved this week</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.goalsAchievedThisWeek.map((g) => (
              <li key={g.goalId} className="flex justify-between py-2">
                <span>
                  <span className="font-medium">{g.name}</span>{" "}
                  <span className="text-xs text-slate-500">— {g.metricKey}</span>
                </span>
                <span className="badge-ok">🎉 achieved</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {digest.goalsAtRisk.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Goals at risk</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.goalsAtRisk.map((g) => (
              <li key={g.goalId} className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium">{g.name}</span>
                  <span className={g.status === "regression" ? "badge-danger" : "badge-warn"}>
                    {g.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {g.metricKey} · progress {Math.round(g.fraction * 100)}%
                  {g.targetDate ? ` · due ${g.targetDate.slice(0, 10)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {digest.staleBaselines.length > 0 ? (
        <Card>
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Players without recent baselines</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {digest.staleBaselines.map((s) => (
              <li key={s.playerId} className="flex justify-between py-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-slate-500">
                  {s.lastRecordedAt
                    ? `Last ${new Date(s.lastRecordedAt).toLocaleDateString()} (${s.daysSince}d ago)`
                    : "Never"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
