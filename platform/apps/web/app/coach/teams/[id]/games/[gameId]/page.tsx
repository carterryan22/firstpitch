import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { sortRoster, fullName } from "../../../../../lib/players";
import { formatGameWhen, statusLabel } from "../../../../../lib/games";
import { GameTabs } from "./GameTabs";
import { FieldBoard, fieldBoardRosterFrom } from "./FieldBoard";

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
  const tab = (sp.tab ?? "field") as "field" | "roster" | "summary";

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
              href={`/coach/teams/${id}/games/${gameId}/report`}
              className="btn-ghost no-underline hover:no-underline"
            >
              Report
            </Link>
            <span className={status.cls}>{status.label}</span>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-slate-200 text-sm">
        {(["field", "roster", "summary"] as const).map((t) => (
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
          roster={fieldBoardRosterFrom(
            roster.map((p) => ({
              id: p.id,
              name: fullName(p),
              jerseyNumber: p.jerseyNumber,
              canPitch: !!p.canPitch,
              canCatch: !!p.canCatch,
              injured: !!p.injured,
              positionRatings: (p.positionRatings ?? {}) as Record<string, string>,
            })),
          )}
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
        />
      ) : null}
    </div>
  );
}
