import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../../lib/session";
import { userCanManageTeam } from "../../../../../../lib/teams";
import { fullName } from "../../../../../../lib/players";
import { livePitchSafety } from "../../../../../../lib/pitchSafety";
import { LiveConsole } from "./LiveConsole";

export const metadata = { title: "Live game" };
export const dynamic = "force-dynamic";

export default async function LiveGamePage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");
  const repos = getRepos();
  const [team, game, roster, games, logs] = await Promise.all([
    repos.teams.byId(id),
    repos.games.byId(gameId),
    repos.players.byTeam(id),
    repos.games.list({ teamId: id }),
    repos.throwingLogs.list({ teamId: id }),
  ]);
  if (!team || !game || game.teamId !== id) notFound();

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/games/${gameId}`} className="no-underline hover:underline">
            ← Game detail
          </Link>
        </p>
        <h1 className="mt-1">Live · {game.homeAway === "home" ? "vs" : "@"} {game.opponent}</h1>
      </header>
      <LiveConsole
        gameId={game.id}
        initial={game}
        initialPitchSafety={livePitchSafety(roster, games, logs, new Date(game.startsAt))}
        roster={roster
          .filter((p) => !p.archivedAt)
          .map((p) => ({ id: p.id, name: fullName(p), canPitch: p.canPitch ?? false }))}
      />
    </div>
  );
}
