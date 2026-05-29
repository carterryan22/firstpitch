import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { canPitchToday } from "@platform/safety";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { ageFromDob, sortRoster, fullName } from "../../../../../lib/players";
import { formatGameWhen, statusLabel } from "../../../../../lib/games";
import { GameTabs } from "./GameTabs";
import { FieldBoard } from "./FieldBoard";
import { BattingOrder } from "./BattingOrder";
import { GameNotes } from "./GameNotes";
import { GameStatsImporter } from "./GameStatsImporter";
import { PressBoxShare } from "./PressBoxShare";
import { pressBoxPath } from "../../../../../lib/pressBox";

function ageBandCenter(band: string): number {
  if (band.startsWith("6-8")) return 8;
  if (band.startsWith("9-12")) return 11;
  if (band.startsWith("13-15")) return 14;
  return 16;
}

export const metadata = { title: "Game" };

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; gameId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id, gameId } = await params;
  const sp = await searchParams;
  const tab = (sp.tab ?? "field") as "field" | "roster" | "summary" | "notes" | "stats";

  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, game, players] = await Promise.all([
    repos.teams.byId(id),
    repos.games.byId(gameId),
    repos.players.byTeam(id),
  ]);
  if (!team || !game || game.teamId !== id) notFound();
  const roster = sortRoster(players);
  const status = statusLabel(game.status);

  // Pitch-Smart fatigue: compute list of pitchers who must NOT take the bump today
  // based on outings from PRIOR games (exclude the current one) + age band.
  const allGames = await repos.games.list({ teamId: id });
  const otherGames = allGames.filter((g) => g.id !== game.id);
  const gameDate = new Date(game.startsAt);
  const fallbackAge = ageBandCenter(team.ageBand);
  const pitcherUnavailable: string[] = [];
  for (const p of roster) {
    if (!p.canPitch) continue;
    const outingsByDate: Record<string, number> = {};
    for (const g of otherGames) {
      const entry = g.pitchCounts?.[p.id];
      if (!entry || !entry.pitches) continue;
      const day = (g.startsAt ?? "").slice(0, 10);
      if (!day) continue;
      outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
    }
    const age = p.dob ? ageFromDob(p.dob) : fallbackAge;
    const check = canPitchToday({
      age,
      date: gameDate,
      plannedPitches: 1,
      history: {
        outingsByDate,
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    if (!check.allowed) pitcherUnavailable.push(p.id);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/games`} className="no-underline hover:underline">
            ← {team.name} games
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="m-0">
              {game.homeAway === "home" ? "vs" : "@"} {game.opponent}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatGameWhen(game.startsAt)}{game.venue ? ` · ${game.venue}` : ""} · {game.innings} innings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/coach/teams/${id}/games/${gameId}/live`}
              className="btn-primary no-underline hover:no-underline"
            >
              Live
            </Link>
            <Link
              href={`/coach/teams/${id}/games/${gameId}/report`}
              className="btn-ghost no-underline hover:no-underline"
            >
              Report
            </Link>
            <span className={status.cls}>{status.label}</span>
            {game.isScrimmage ? <span className="badge-warn">Scrimmage</span> : null}
          </div>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-slate-200 text-sm">
        {(["field", "roster", "stats", "summary", "notes"] as const).map((t) => (
          <Link
            key={t}
            href={`/coach/teams/${id}/games/${gameId}?tab=${t}`}
            className={`-mb-px border-b-2 px-3 py-2 capitalize no-underline ${
              tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t}
          </Link>
        ))}
      </nav>

      <GameTabs
        teamId={id}
        game={{
          id: game.id,
          opponent: game.opponent,
          startsAt: game.startsAt,
          venue: game.venue,
          homeAway: game.homeAway,
          innings: game.innings,
          status: game.status,
          notes: game.notes,
          attendance: game.attendance ?? {},
          finalScore: game.finalScore,
          pitchCounts: game.pitchCounts ?? {},
          isScrimmage: game.isScrimmage,
        }}
        roster={roster.map((p) => ({
          id: p.id,
          name: fullName(p),
          jerseyNumber: p.jerseyNumber,
          canPitch: !!p.canPitch,
          canCatch: !!p.canCatch,
          injured: !!p.injured,
        }))}
        tab={tab}
      />

      {tab === "field" ? (
        <FieldBoard
          gameId={game.id}
          innings={game.innings}
          roster={roster.map((p) => ({
            id: p.id,
            name: fullName(p),
            jerseyNumber: p.jerseyNumber,
            canPitch: !!p.canPitch,
            canCatch: !!p.canCatch,
            injured: !!p.injured,
            battingSkill: p.battingSkill,
            positionRatings: (p.positionRatings ?? {}) as Record<
              import("@platform/lineup").Slot,
              "preferred" | "ok" | "avoid"
            >,
          }))}
          present={Object.entries(game.attendance ?? {})
            .filter(([, v]) => v === "present")
            .map(([k]) => k)
            // default to everyone if attendance unset
            .concat(
              Object.keys(game.attendance ?? {}).length === 0
                ? roster.map((p) => p.id)
                : [],
            )}
          initial={(game.lineup ?? []) as unknown as import("@platform/lineup").Inning[]}
          pitcherUnavailable={pitcherUnavailable}
        />
      ) : null}

      {tab === "field" ? (
        <BattingOrder
          gameId={game.id}
          roster={roster.map((p) => ({ id: p.id, name: fullName(p), jerseyNumber: p.jerseyNumber }))}
          initial={game.battingOrder ?? []}
        />
      ) : null}

      {tab === "stats" ? (
        <GameStatsImporter
          gameId={game.id}
          roster={roster.map((p) => ({
            id: p.id,
            name: fullName(p),
            jerseyNumber: p.jerseyNumber,
          }))}
          initial={await repos.playerGameStats.list({ gameId: game.id })}
          canEdit
        />
      ) : null}

      {tab === "notes" ? (
        <GameNotes
          gameId={game.id}
          innings={game.innings}
          roster={roster.map((p) => ({ id: p.id, name: fullName(p), jerseyNumber: p.jerseyNumber }))}
          initialNotes={(await repos.gameNotes.list({ gameId: game.id }))
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((n) => ({
              id: n.id,
              gameId: n.gameId,
              playerId: n.playerId,
              authorUserId: n.authorUserId,
              playLabel: n.playLabel,
              inningIdx: n.inningIdx,
              body: n.body,
              shareWithParents: n.shareWithParents,
              shareWithPlayer: n.shareWithPlayer,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            }))}
        />
      ) : null}
      {tab === "summary" ? (
        <PressBoxShare
          gameId={game.id}
          initialEnabled={!!game.shareEnabled}
          initialPath={game.shareEnabled ? pressBoxPath(game.id) : null}
        />
      ) : null}
    </div>
  );
}
