import { notFound } from "next/navigation";
import { getRepos } from "@platform/storage";
import { verifyGameSig } from "../../../../lib/pressBox";
import { sortRoster } from "../../../../lib/players";
import { formatGameWhen, statusLabel } from "../../../../lib/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Press Box",
  robots: { index: false, follow: false },
};

export default async function PressBoxPage({
  params,
}: {
  params: Promise<{ id: string; sig: string }>;
}) {
  const { id, sig } = await params;
  if (!verifyGameSig(id, sig)) notFound();

  const repos = getRepos();
  const game = await repos.games.byId(id);
  if (!game || !game.shareEnabled) notFound();

  const [team, players] = await Promise.all([
    repos.teams.byId(game.teamId),
    repos.players.byTeam(game.teamId),
  ]);
  if (!team) notFound();

  const roster = sortRoster(players);
  const playerById = new Map(roster.map((p) => [p.id, p]));
  const status = statusLabel(game.status);
  const gameStarted = game.status !== "scheduled";
  const battingOrder = game.battingOrder ?? [];
  const lineup = game.lineup ?? [];

  // Reveal lineup only once first pitch has been thrown / coach flips status.
  const showLineup = gameStarted && lineup.length > 0;

  // Pitch counts — parents care; show even before completion if entered.
  const pitchEntries = Object.entries(game.pitchCounts ?? {})
    .map(([playerId, entry]) => ({ player: playerById.get(playerId), entry }))
    .filter((row) => row.player);

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b-2 border-ink pb-6">
        <p className="eyebrow text-dirt-700">Press Box · Public view</p>
        <h1 className="m-0">
          {team.name} {game.homeAway === "home" ? "vs" : "@"} {game.opponent}
        </h1>
        <p className="text-sm text-ink/80">
          {formatGameWhen(game.startsAt)}
          {game.venue ? ` · ${game.venue}` : ""} · {game.innings} innings
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className={status.cls}>{status.label}</span>
          {game.isScrimmage ? <span className="badge-warn">Scrimmage</span> : null}
          {game.finalScore ? (
            <span className="badge">
              Final {game.finalScore.us}-{game.finalScore.them}
            </span>
          ) : null}
        </p>
      </header>

      <section className="card space-y-3">
        <h2 className="m-0 text-lg">Roster</h2>
        <p className="text-xs text-dirt-700">First names only — parent-safe view.</p>
        <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {roster.map((p) => (
            <li key={p.id} className="flex items-baseline gap-2">
              <span className="quote text-dirt-700">#{p.jerseyNumber ?? "—"}</span>
              <span>{p.firstName}</span>
            </li>
          ))}
        </ul>
      </section>

      {showLineup ? (
        <section className="card space-y-3">
          <h2 className="m-0 text-lg">Lineup by inning</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="py-2 pr-3">Player</th>
                  {lineup.map((_, i) => (
                    <th key={i} className="px-2 py-2 text-center">
                      I{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(battingOrder.length ? battingOrder : roster.map((r) => r.id)).map((pid) => {
                  const p = playerById.get(pid);
                  if (!p) return null;
                  return (
                    <tr key={pid} className="border-b border-dirt-200">
                      <td className="py-1 pr-3">
                        <span className="quote text-dirt-700">#{p.jerseyNumber ?? "—"}</span>{" "}
                        {p.firstName}
                      </td>
                      {lineup.map((inning, i) => (
                        <td key={i} className="px-2 py-1 text-center">
                          {inning[pid] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card">
          <h2 className="m-0 text-lg">Lineup</h2>
          <p className="text-sm text-ink/80">
            Posted after first pitch. Coaches can adjust right up to game time.
          </p>
        </section>
      )}

      {pitchEntries.length > 0 ? (
        <section className="card space-y-2">
          <h2 className="m-0 text-lg">Pitch counts</h2>
          <p className="text-xs text-dirt-700">
            Tracked against USA Baseball Pitch Smart rest days.
          </p>
          <ul className="text-sm">
            {pitchEntries.map(({ player, entry }) => (
              <li key={player!.id} className="flex justify-between border-b border-dirt-200 py-1">
                <span>
                  <span className="quote text-dirt-700">#{player!.jerseyNumber ?? "—"}</span>{" "}
                  {player!.firstName}
                </span>
                <span className="quote">
                  {entry.pitches} pitches · {entry.innings} IP
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-2 border-ink bg-dirt-100 p-5">
        <p className="quote text-sm text-ink/80">
          This is a parent-facing share from {team.name}&apos;s coach. No accounts, no ads, no
          tracking beyond a basic page view.{" "}
          <a className="text-ink underline" href={`/for/parent`}>
            See what a parent account adds →
          </a>
        </p>
      </section>

      <p className="text-xs text-dirt-700">First Pitch · Real dirt on every diamond.</p>
    </div>
  );
}
