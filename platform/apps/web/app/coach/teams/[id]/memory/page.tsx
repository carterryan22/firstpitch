import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { sortRoster } from "../../../../lib/players";
import { Card } from "../../../../components/ui";
import { QuickTagAdder } from "../../../../components/QuickTagAdder";
import {
  buildCoachMemory,
  type MemoryGame,
  type MemorySignal,
} from "../../../../lib/coachMemory";

export const metadata = { title: "Coach Memory" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TONE_CLASS: Record<MemorySignal["tone"], string> = {
  positive: "badge-ok",
  watch: "badge-warn",
  neutral: "badge",
  danger: "badge-danger",
};

export default async function CoachMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const [team, players, games, tags, plans] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
    repos.games.list({ teamId: id }),
    repos.quickTags.list({ teamId: id, since }),
    repos.plans.list({ teamId: id, scheduled: true }),
  ]);
  if (!team) notFound();
  const roster = sortRoster(players);

  // Past-practice absences feed the "missed practice" signal.
  const now = Date.now();
  const practiceAbsencesByPlayer: Record<string, number> = {};
  for (const pl of plans) {
    if (pl.scheduledAt && new Date(pl.scheduledAt).getTime() <= now && pl.attendance) {
      for (const [pid, st] of Object.entries(pl.attendance)) {
        if (st === "absent") practiceAbsencesByPlayer[pid] = (practiceAbsencesByPlayer[pid] ?? 0) + 1;
      }
    }
  }

  const memGames: MemoryGame[] = games.map((g) => ({
    id: g.id,
    startsAt: g.startsAt,
    opponent: g.opponent,
    lineup: g.lineup,
    attendance: g.attendance,
    pitchCounts: g.pitchCounts
      ? Object.fromEntries(Object.entries(g.pitchCounts).map(([k, v]) => [k, { pitches: v.pitches }]))
      : undefined,
  }));

  const memory = buildCoachMemory({
    players: roster.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      canPitch: p.canPitch,
      canCatch: p.canCatch,
      injured: p.injured,
      injuryNote: p.injuryNote,
    })),
    games: memGames,
    tags: tags.map((t) => ({ code: t.code, playerId: t.playerId, createdAt: t.createdAt })),
    practiceAbsencesByPlayer,
  });

  // Order players: most things to remember first.
  const cards = memory.players
    .slice()
    .sort((a, b) => b.watchCount - a.watchCount || a.name.localeCompare(b.name));

  // Top team focuses → deep-link into the compiler.
  const topFocus = Array.from(
    new Set(memory.team.slice(0, 3).flatMap((s) => s.focus ?? [])),
  );
  const fixHref =
    topFocus.length > 0
      ? `/practice/new?teamId=${id}&focus=${topFocus.join(",")}`
      : `/practice/new?teamId=${id}`;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="m-0">Coach Memory</h1>
        <p className="mt-1 text-sm text-slate-600">
          Never lose track of what each player needs. Synthesized from your last{" "}
          {memory.playedGames} game{memory.playedGames === 1 ? "" : "s"}, pitch counts, attendance
          and the notes you tap. Coach-only, never shown to parents.
        </p>
      </header>

      {/* Recurring team mistakes */}
      {memory.team.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-amber-900">Recurring team mistakes</h2>
              <p className="mb-2 mt-1 text-sm text-amber-800">
                What you&apos;ve tagged most across recent games. Turn it into your next practice.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {memory.team.slice(0, 6).map((s) => (
                  <span key={s.code} className="badge-warn text-xs">
                    {s.label} · {s.count}
                  </span>
                ))}
              </div>
            </div>
            <Link href={fixHref} className="btn-primary min-h-[44px] whitespace-nowrap no-underline">
              Build a practice →
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Per-player memory cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((pm) => {
          const player = roster.find((p) => p.id === pm.playerId);
          const otherNeeds = pm.needs.filter((n) => n !== pm.topNeed);
          return (
            <Card key={pm.playerId} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="m-0 text-base font-semibold text-slate-900">
                  {player?.jerseyNumber ? (
                    <span className="mr-1 text-xs font-bold tabular-nums text-slate-500">
                      #{player.jerseyNumber}
                    </span>
                  ) : null}
                  {pm.name}
                </h3>
                {pm.watchCount === 0 ? (
                  <span className="badge-ok text-[10px]">All good</span>
                ) : (
                  <span className="badge-warn text-[10px]">
                    {pm.watchCount} to watch
                  </span>
                )}
              </div>

              {pm.topNeed ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                  <p className="m-0 flex items-center gap-2">
                    <span className={`${TONE_CLASS[pm.topNeed.tone]} text-[10px]`}>Top focus</span>
                    <span className="text-sm font-semibold text-slate-800">{pm.topNeed.label}</span>
                  </p>
                  {pm.topNeed.detail ? (
                    <p className="m-0 mt-1 text-xs text-slate-600">{pm.topNeed.detail}</p>
                  ) : null}
                </div>
              ) : (
                <p className="m-0 text-sm text-slate-500">
                  Nothing flagged. Getting fair reps and staying healthy.
                </p>
              )}

              {otherNeeds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {otherNeeds.map((n, i) => (
                    <span
                      key={`${n.kind}-${i}`}
                      className={`${TONE_CLASS[n.tone]} text-[11px]`}
                      title={n.detail}
                    >
                      {n.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {pm.strengths.length > 0 ? (
                <p className="m-0 text-xs text-slate-600">
                  <span className="font-semibold text-field-700">Remember:</span>{" "}
                  {pm.strengths.map((s) => s.label).join(" · ")}
                </p>
              ) : null}

              <div className="mt-auto pt-1">
                <QuickTagAdder teamId={id} playerId={pm.playerId} scope="player" />
              </div>
            </Card>
          );
        })}
        {cards.length === 0 ? (
          <Card>
            <p className="m-0 text-sm text-slate-500">
              Add players to your roster and play a game or two. Coach Memory fills in from there.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
