import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanReadTeam } from "../../../../../../lib/teams";
import { fullName, sortRoster } from "../../../../../../lib/players";
import { formatGameWhen } from "../../../../../../lib/games";
import { summarize, type Inning } from "@platform/lineup";

export const metadata = { title: "Game report" };

export default async function GameReportPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanReadTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, game, players] = await Promise.all([
    repos.teams.byId(id),
    repos.games.byId(gameId),
    repos.players.byTeam(id),
  ]);
  if (!team || !game || game.teamId !== id) notFound();
  const roster = sortRoster(players);

  const lineup = (game.lineup ?? []) as unknown as Inning[];
  const stats = summarize(lineup, roster.map((r) => r.id));
  const statsById = new Map(stats.map((s) => [s.playerId, s]));

  const attendance = game.attendance ?? {};
  const present = Object.values(attendance).filter((v) => v === "present").length;
  const absent = Object.values(attendance).filter((v) => v === "absent").length;
  const score = game.finalScore;
  const outcome = score
    ? score.us > score.them
      ? "W"
      : score.us < score.them
      ? "L"
      : "T"
    : "-";

  return (
    <div className="space-y-6 print:space-y-3">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500 print:hidden">
          <Link href={`/coach/teams/${id}/games/${gameId}`} className="no-underline hover:underline">
            ← Back to game
          </Link>
        </p>
        <h1 className="m-0">
          {team.name} {game.homeAway === "home" ? "vs" : "@"} {game.opponent}
        </h1>
        <p className="text-sm text-slate-600">
          {formatGameWhen(game.startsAt)}{game.venue ? ` · ${game.venue}` : ""} · {game.innings} innings
        </p>
        <div className="text-3xl font-bold text-slate-800">
          {outcome}
          {score ? (
            <span className="ml-2 text-lg text-slate-500">
              {score.us}–{score.them}
            </span>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Attendance</div>
          <div className="mt-1 text-xl font-semibold text-slate-800">{present}</div>
          <div className="text-xs text-slate-500">{absent} absent · {roster.length} on roster</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Pitchers used</div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {Object.keys(game.pitchCounts ?? {}).filter((k) => (game.pitchCounts ?? {})[k]?.pitches).length}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total pitches</div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {Object.values(game.pitchCounts ?? {}).reduce((a, b) => a + (b?.pitches ?? 0), 0)}
          </div>
        </div>
      </section>

      <section>
        <h2>Per-player report</h2>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Att.</th>
                <th className="px-4 py-3">Innings</th>
                <th className="px-4 py-3">Bench</th>
                <th className="px-4 py-3">P / C inn</th>
                <th className="px-4 py-3">Positions</th>
                <th className="px-4 py-3">Pitches</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => {
                const s = statsById.get(p.id);
                const att = attendance[p.id];
                const pitchRow = (game.pitchCounts ?? {})[p.id];
                const positions = s
                  ? Object.entries(s.positions)
                      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                      .map(([pos, n]) => `${pos}×${n}`)
                      .join(" ")
                  : "";
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <span className="inline-block w-7 text-right text-xs font-bold tabular-nums text-slate-600">
                        {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}
                      </span>{" "}
                      {fullName(p)}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{att ?? "-"}</td>
                    <td className="px-4 py-2 text-slate-700">{s?.fieldInnings ?? 0}</td>
                    <td className="px-4 py-2 text-slate-700">{s?.benchInnings ?? 0}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {(s?.pitchInnings ?? 0)} / {(s?.catchInnings ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{positions}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {pitchRow?.pitches ? `${pitchRow.pitches}p / ${pitchRow.innings ?? 0}ip` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {game.notes ? (
        <section>
          <h2>Coach notes</h2>
          <div className="card whitespace-pre-wrap text-sm text-slate-700">{game.notes}</div>
        </section>
      ) : null}

      <p className="text-xs text-slate-400 print:hidden">
        Tip: use your browser&apos;s print menu to save as PDF and share with families.
      </p>
    </div>
  );
}
