import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { fullName } from "../../../../../lib/players";
import { Card } from "../../../../../components/ui";
import { PlayerForm } from "../PlayerForm";
import { aggregateSeason } from "../../../../../lib/playerStats";

export const metadata = { title: "Player" };

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, player] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byId(playerId),
  ]);
  if (!team || !player || player.teamId !== id) notFound();

  // Season stats: aggregate all per-game stats records (excluding scrimmages).
  const [allStats, allGames] = await Promise.all([
    repos.playerGameStats.list({ teamId: id, playerId: player.id }),
    repos.games.list({ teamId: id }),
  ]);
  const scrimmageIds = new Set(allGames.filter((g) => g.isScrimmage).map((g) => g.id));
  const statsForSeason = allStats.filter((s) => !scrimmageIds.has(s.gameId));
  const season = aggregateSeason(statsForSeason);
  const gameById: Record<string, (typeof allGames)[number]> = {};
  for (const g of allGames) gameById[g.id] = g;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/roster`} className="no-underline hover:underline">
            ← {team.name} roster
          </Link>
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            #{player.jerseyNumber || "—"}
          </span>
          <h1 className="m-0">{fullName(player)}</h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{player.bats || "?"}/{player.throws || "?"}</span>
          <span>·</span>
          <span>{player.ageBand}</span>
          {player.canPitch ? <span className="badge-info">Can pitch</span> : null}
          {player.canCatch ? <span className="badge-info">Can catch</span> : null}
          {player.injured ? <span className="badge-danger">Injured</span> : null}
          {player.archivedAt ? <span className="badge-warn">Archived</span> : null}
        </div>
      </header>

      {season.gamesPlayed > 0 ? (
        <Card>
          <header className="flex items-baseline justify-between">
            <h2 className="m-0">Season stats</h2>
            <span className="text-xs text-slate-500">
              {season.gamesPlayed} game{season.gamesPlayed === 1 ? "" : "s"} ·
              avg rating <span className="font-semibold tabular-nums">{season.averageRating.toFixed(1)}</span>/5
              {season.mostPlayedPosition ? ` · most played ${season.mostPlayedPosition}` : ""}
            </span>
          </header>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {season.batting ? (
              <div className="rounded border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batting</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{season.batting.avg.toFixed(3).replace(/^0/, "")}</div>
                <div className="text-xs tabular-nums text-slate-600">
                  {season.batting.h}-for-{season.batting.ab} · OBP {season.batting.obp.toFixed(3).replace(/^0/, "")} · OPS {season.batting.ops.toFixed(3).replace(/^0/, "")}
                </div>
                <div className="mt-1 text-xs tabular-nums text-slate-500">
                  {season.batting.bb} BB · {season.batting.so} K · {season.batting.rbi} RBI · {season.batting.sb} SB
                </div>
              </div>
            ) : null}
            {season.pitching ? (
              <div className="rounded border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pitching</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{season.pitching.era.toFixed(2)} ERA</div>
                <div className="text-xs tabular-nums text-slate-600">
                  {season.pitching.ip} IP · {season.pitching.so} K · {season.pitching.bb} BB · WHIP {season.pitching.whip.toFixed(2)}
                </div>
                <div className="mt-1 text-xs tabular-nums text-slate-500">
                  {season.pitching.pitches} pitches · {season.pitching.pitchesPerInning.toFixed(1)} P/IP
                </div>
              </div>
            ) : null}
            {season.fielding ? (
              <div className="rounded border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fielding</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{season.fielding.totalInnings} IP</div>
                <div className="text-xs tabular-nums text-slate-600">
                  FPCT {season.fielding.fpct.toFixed(3).replace(/^0/, "")} · {season.fielding.po} PO · {season.fielding.a} A · {season.fielding.e} E
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {Object.entries(season.fielding.positionInnings)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([pos, inn]) => `${pos} ${inn}`)
                    .join(" · ")}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent games</div>
            <ul className="mt-1 divide-y divide-slate-100">
              {season.perGame.slice(-6).reverse().map((g) => {
                const game = gameById[g.gameId];
                return (
                  <li key={g.gameId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <Link
                        href={`/coach/teams/${id}/games/${g.gameId}?tab=stats`}
                        className="font-medium no-underline hover:underline"
                      >
                        {game ? `${game.homeAway === "home" ? "vs" : "@"} ${game.opponent}` : g.gameId}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">
                        {game?.startsAt ? new Date(game.startsAt).toLocaleDateString() : ""}
                      </span>
                      {g.highlights.length > 0 ? (
                        <span className="ml-2 text-xs text-slate-500">· {g.highlights[0]}</span>
                      ) : null}
                    </div>
                    <span className="text-right">
                      <span className="font-semibold tabular-nums">{g.rating.toFixed(1)}</span>
                      <span className="ml-2 text-xs text-slate-500">{g.ratingLabel}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      ) : null}

      <Card>
        <PlayerForm
          teamId={id}
          playerId={player.id}
          initial={{
            firstName: player.firstName,
            lastName: player.lastName,
            jerseyNumber: player.jerseyNumber,
            dob: player.dob,
            bats: player.bats,
            throws: player.throws,
            gender: player.gender,
            battingSkill: player.battingSkill,
            canPitch: !!player.canPitch,
            canCatch: !!player.canCatch,
            injured: !!player.injured,
            injuryNote: player.injuryNote,
            positionRatings: player.positionRatings ?? {},
            notes: player.notes,
          }}
        />
      </Card>
    </div>
  );
}
