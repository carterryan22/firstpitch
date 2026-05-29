import Link from "next/link";
import { redirect } from "next/navigation";
import { missionsForAge, tailoredHomework, MISSIONS } from "@platform/missions";
import { homeMission } from "@platform/compiler";
import { summarizeForParents, skillsForPositions, type Inning, type LineupPlayer } from "@platform/lineup";
import { getRepos } from "@platform/storage";
import { getSession } from "../lib/session";
import { getTeamsForUser } from "../lib/teams";
import { fullName } from "../lib/players";
import { metricByKey } from "../lib/metrics";
import { computeGoalProgress, GOAL_STATUS_BADGE } from "../lib/goals";
import { formatGameWhen } from "../lib/games";
import { Card } from "../components/ui";
import { RsvpButtons } from "../components/RsvpButtons";
import { CompleteAssignmentButton } from "./CompleteAssignmentButton";

export const metadata = { title: "Family dashboard" };

const AGE_FROM_BAND: Record<string, number> = {
  "6-8": 7,
  "9-12": 11,
  "13-15": 14,
  "16+": 16,
};

type UpcomingItem = {
  kind: "game" | "practice";
  when: string;
  teamName: string;
  label: string;
  href: string;
  id: string;
  teamId: string;
  rsvp?: Record<string, "yes" | "no" | "maybe">;
};

export default async function ParentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const repos = getRepos();
  const [teams, kids] = await Promise.all([
    getTeamsForUser(session.user.id),
    repos.players.byParent(session.user.id),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  // Ensure kids' teams are loaded too even if the parent isn't a member.
  for (const k of kids) {
    if (k.teamId && !teamById.has(k.teamId)) {
      const t = await repos.teams.byId(k.teamId);
      if (t) teamById.set(t.id, t);
    }
  }

  const teamIds = Array.from(teamById.keys());
  const [allGames, allPlans] = await Promise.all([
    Promise.all(teamIds.map((tid) => repos.games.list({ teamId: tid }))),
    Promise.all(teamIds.map((tid) => repos.plans.list({ teamId: tid, scheduled: true }))),
  ]);

  const nowMs = Date.now();
  const upcoming: UpcomingItem[] = [];
  allGames.flat().forEach((g) => {
    const t = teamById.get(g.teamId);
    if (!t) return;
    const at = new Date(g.startsAt).getTime();
    if (Number.isNaN(at) || at < nowMs - 1000 * 60 * 60 * 6) return;
    upcoming.push({
      kind: "game",
      when: g.startsAt,
      teamName: t.name,
      label: `${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}`,
      href: `/coach/teams/${g.teamId}/games/${g.id}`,
      id: g.id,
      teamId: g.teamId,
      rsvp: g.rsvp,
    });
  });
  allPlans.flat().forEach((p) => {
    if (!p.scheduledAt || !p.teamId) return;
    const t = teamById.get(p.teamId);
    if (!t) return;
    const at = new Date(p.scheduledAt).getTime();
    if (Number.isNaN(at) || at < nowMs - 1000 * 60 * 60 * 6) return;
    upcoming.push({
      kind: "practice",
      when: p.scheduledAt,
      teamName: t.name,
      label: p.name,
      href: `/plans/${p.id}`,
      id: p.id,
      teamId: p.teamId,
      rsvp: p.rsvp,
    });
  });
  upcoming.sort((a, b) => (a.when < b.when ? -1 : 1));
  const upcomingNext = upcoming.slice(0, 8);

  const childData = await Promise.all(
    kids.map(async (k) => {
      const [entries, goals, teamGames] = await Promise.all([
        repos.metricEntries.list({ playerId: k.id }),
        repos.goals.list({ playerId: k.id, status: "active" }),
        k.teamId ? repos.games.list({ teamId: k.teamId }) : Promise.resolve([]),
      ]);
      const sorted = entries.slice().sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
      const latestByMetric = new Map<string, (typeof sorted)[number]>();
      for (const e of sorted) if (!latestByMetric.has(e.metricKey)) latestByMetric.set(e.metricKey, e);
      const goalProgress = goals.map((g) => computeGoalProgress(g, entries));

      // Pick the most relevant game: next upcoming with a lineup, else most
      // recent past game with a lineup. Used to surface why this player is
      // being placed in particular positions.
      const withLineup = teamGames.filter(
        (g) => Array.isArray(g.lineup) && (g.lineup as unknown[]).length > 0,
      );
      const upcomingWithLineup = withLineup
        .filter((g) => new Date(g.startsAt).getTime() >= Date.now() - 1000 * 60 * 60 * 6)
        .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
      const pastWithLineup = withLineup
        .filter((g) => new Date(g.startsAt).getTime() < Date.now() - 1000 * 60 * 60 * 6)
        .sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
      const focusGame = upcomingWithLineup[0] ?? pastWithLineup[0];
      let positionPlan: ReturnType<typeof summarizeForParents> | null = null;
      let homework: ReturnType<typeof tailoredHomework> | null = null;
      if (focusGame) {
        const lineupPlayer: LineupPlayer = {
          id: k.id,
          canPitch: !!k.canPitch,
          canCatch: !!k.canCatch,
          positionRatings: k.positionRatings,
        };
        positionPlan = summarizeForParents(
          (focusGame.lineup ?? []) as unknown as Inning[],
          lineupPlayer,
        );
        const focusPositions =
          positionPlan.improvementAreas.length > 0
            ? positionPlan.improvementAreas
            : positionPlan.positions;
        const skills = skillsForPositions(focusPositions);
        const age = k.dob
          ? Math.max(6, Math.min(18, Math.floor((Date.now() - new Date(k.dob).getTime()) / (1000 * 60 * 60 * 24 * 365))))
          : AGE_FROM_BAND[k.ageBand] ?? 11;
        homework = tailoredHomework({ age, targetCategories: skills, maxDrills: 3 });
      }

      // Game notes shared with this parent's account.
      const notes = (await repos.gameNotes.list({ playerId: k.id })).filter(
        (n) => n.shareWithParents,
      );
      const recentNotes = notes
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5);
      return { player: k, latestByMetric, goalProgress, focusGame, positionPlan, homework, recentNotes };
    })
  );

  const ageRef = kids[0]?.dob
    ? Math.max(6, Math.min(18, Math.floor((Date.now() - new Date(kids[0].dob).getTime()) / (1000 * 60 * 60 * 24 * 365))))
    : teams[0]
    ? AGE_FROM_BAND[teams[0].ageBand] ?? 11
    : 11;
  const missions = missionsForAge(ageRef);
  const home = homeMission({ age: ageRef, focus: ["mental_recovery", "speed"] });

  // Coach-issued mission assignments across all kids (open + recently completed).
  const kidIds = kids.map((k) => k.id);
  const allAssignments = kidIds.length
    ? await repos.missionAssignments.list({ playerIds: kidIds })
    : [];
  const openAssignments = allAssignments.filter((a) => !a.completedAt);
  const missionById = new Map(MISSIONS.map((m) => [m.id, m] as const));
  const kidById = new Map(kids.map((k) => [k.id, k] as const));

  return (
    <div className="space-y-10">
      <header>
        <h1>Family dashboard</h1>
        <p className="mt-2 text-slate-600">
          Upcoming events, your kids' progress, and a short home mission to do between sessions.
        </p>
      </header>

      {home ? (
        <section
          aria-label="Today's mission"
          className="border-2 border-ink bg-dirt-100 p-5 md:flex md:items-center md:justify-between md:gap-6"
        >
          <div className="min-w-0">
            <p className="quote text-xs uppercase tracking-[0.18em] text-dirt-700">Today&apos;s mission</p>
            <h2 className="m-0 mt-1 text-xl">{home.name}</h2>
            <p className="mt-1 text-sm text-ink/80">{home.short_description}</p>
          </div>
          <Link
            href={`/missions?age=${ageRef}`}
            className="btn-primary mt-4 inline-flex min-h-[44px] items-center no-underline hover:no-underline md:mt-0"
          >
            Start — {home.duration_minutes ?? 5} min
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="m-0">Upcoming</h2>
        {upcomingNext.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No games or practices scheduled. As soon as the coach adds one it'll appear here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {upcomingNext.map((it) => {
              const kidsOnThisTeam = kids.filter((k) => k.teamId === it.teamId);
              return (
                <li key={`${it.kind}-${it.id}`}>
                  <Card>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className={it.kind === "game" ? "badge-info" : "badge-warn"}>
                          {it.kind === "game" ? "Game" : "Practice"}
                        </span>{" "}
                        <Link
                          href={it.href}
                          className="font-medium text-slate-900 no-underline hover:underline"
                        >
                          {it.label}
                        </Link>
                        <span className="ml-2 text-xs text-slate-500">{it.teamName}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {it.kind === "game" ? formatGameWhen(it.when) : new Date(it.when).toLocaleString()}
                      </span>
                    </div>
                    {kidsOnThisTeam.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        {kidsOnThisTeam.map((k) => (
                          <div key={k.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-700">{fullName(k)}</span>
                            <RsvpButtons
                              kind={it.kind}
                              id={it.id}
                              playerId={k.id}
                              initial={it.rsvp?.[k.id]}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {childData.length > 0 ? (
        <section className="space-y-4">
          <h2 className="m-0">Your players</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {childData.map(({ player, latestByMetric, goalProgress, focusGame, positionPlan, homework, recentNotes }) => {
              const team = player.teamId ? teamById.get(player.teamId) : undefined;
              return (
                <Card key={player.id}>
                  <header className="flex items-baseline justify-between gap-2">
                    <h3 className="m-0 text-base">{fullName(player)}</h3>
                    {team ? <span className="badge-info">{team.name}</span> : null}
                  </header>

                  {positionPlan && focusGame ? (
                    <div className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="m-0 text-xs uppercase tracking-wide text-emerald-700">
                          Position plan
                        </h4>
                        <span className="text-xs text-slate-500">
                          {focusGame.homeAway === "home" ? "vs" : "@"} {focusGame.opponent}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-800">{positionPlan.parentSummary}</p>
                    </div>
                  ) : null}

                  {homework && homework.drills.length > 0 ? (
                    <div className="mt-3">
                      <h4 className="m-0 text-xs uppercase tracking-wide text-slate-500">
                        Home training plan
                        <span className="ml-1 text-slate-400">
                          (~{homework.totalMinutes} min · targets {homework.targetCategories.join(", ")})
                        </span>
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {homework.drills.map((d) => (
                          <li key={d.drillId} className="rounded bg-slate-50 px-2 py-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <strong className="text-slate-800">{d.name}</strong>
                              <span className="text-xs text-slate-500">{d.durationMinutes} min</span>
                            </div>
                            <p className="text-slate-600">{d.shortDescription}</p>
                            <p className="text-xs text-slate-500">{d.rationale}</p>
                            {d.kidFriendly ? (
                              <details className="mt-1.5 rounded bg-white p-2 text-xs text-slate-700">
                                <summary className="cursor-pointer font-medium text-brand-700">
                                  How to explain it
                                </summary>
                                <p className="mt-1">
                                  <strong>Say this:</strong> {d.kidFriendly.explain}
                                </p>
                                <p className="mt-1">
                                  <strong>Goal:</strong> {d.kidFriendly.goal}
                                </p>
                                <p className="mt-1">
                                  <strong>Why it matters:</strong> {d.kidFriendly.why}
                                </p>
                              </details>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {recentNotes.length > 0 ? (
                    <div className="mt-3">
                      <h4 className="m-0 text-xs uppercase tracking-wide text-slate-500">
                        Coach notes
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {recentNotes.map((n) => (
                          <li key={n.id} className="rounded bg-amber-50 px-2 py-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              {n.playLabel ? (
                                <strong className="text-slate-800">{n.playLabel}</strong>
                              ) : (
                                <strong className="text-slate-800">Coach note</strong>
                              )}
                              <span className="text-xs text-slate-500">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-700">{n.body}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <h4 className="m-0 text-xs uppercase tracking-wide text-slate-500">
                      Active goals ({goalProgress.length})
                    </h4>
                    {goalProgress.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-500">No goals set yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {goalProgress.map((p) => {
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
                            <li key={p.goal.id} className="text-sm">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-slate-700">
                                  {def?.label ?? p.goal.metricKey}
                                  <span className="ml-1 font-mono text-xs text-slate-500">
                                    {p.goal.baseline} → {p.targetValue} {def?.unit}
                                  </span>
                                </span>
                                <span className={badge.cls}>{badge.label}</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {latestByMetric.size > 0 ? (
                    <div className="mt-4">
                      <h4 className="m-0 text-xs uppercase tracking-wide text-slate-500">
                        Recent baselines
                      </h4>
                      <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {Array.from(latestByMetric.values())
                          .slice(0, 6)
                          .map((e) => {
                            const def = metricByKey(e.metricKey);
                            return (
                              <li key={e.id} className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <div className="text-slate-500">{def?.label ?? e.metricKey}</div>
                                <div className="font-mono text-sm text-slate-800">
                                  {e.value} {def?.unit}
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {openAssignments.length > 0 ? (
        <section className="space-y-3">
          <h2 className="m-0">Assigned by coach</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {openAssignments.map((a) => {
              const m = missionById.get(a.missionId);
              const kid = kidById.get(a.playerId);
              if (!m || !kid) return null;
              return (
                <li key={a.id}>
                  <Card>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="m-0 text-base">{m.title}</h3>
                      <span className="badge-info">{kid.firstName}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                    {a.notes ? (
                      <p className="mt-2 text-xs italic text-slate-500">Note from coach: {a.notes}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <CompleteAssignmentButton assignmentId={a.id} />
                      {a.dueAt ? <span>Due {new Date(a.dueAt).toLocaleDateString()}</span> : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {home ? (
        <section>
          <h2 className="m-0">Home mission</h2>
          <Card className="mt-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <span className="badge-info">{home.duration_minutes ?? 5} min</span>
            </div>
            <h3 className="mt-1 text-base">{home.name}</h3>
            <p className="mt-1 text-slate-600">{home.short_description}</p>
            {home.coaching_cues?.length ? (
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                {home.coaching_cues.slice(0, 3).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : null}
          </Card>
        </section>
      ) : null}

      {missions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="m-0">Missions for age {ageRef}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {missions.map((m) => (
              <li key={m.id}>
                <Card>
                  <h3 className="m-0 text-base">{m.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        Only coach-verified or device-verified data is shown. No diagnoses are inferred from
        self-entered values.
      </p>
    </div>
  );
}
