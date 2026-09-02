import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepos } from "@platform/storage";
import { formatGameWhen, statusLabel } from "../../lib/games";
import { pressBoxPath } from "../../lib/pressBox";
import { isPublicTeamPageEnabled } from "../../lib/sharing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getRepos().teams.bySlug(slug);
  if (!team || !isPublicTeamPageEnabled(team)) return { title: "Team not found" };
  return {
    title: `${team.name}`,
    description: `${team.name} · ${team.ageBand} · public team page on First Pitch.`,
  };
}

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repos = getRepos();
  const team = await repos.teams.bySlug(slug);
  if (!team || !isPublicTeamPageEnabled(team)) notFound();

  // Pull a few public-safe signals. We never expose roster names or contact info here.
  const [allGames, players] = await Promise.all([
    repos.games.list({ teamId: team.id }),
    repos.players.byTeam(team.id),
  ]);
  const now = Date.now();
  const upcoming = allGames
    .filter((g) => new Date(g.startsAt).getTime() >= now - 1000 * 60 * 60 * 6)
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  const nextGame = upcoming[0];
  const recent = allGames
    .filter((g) => new Date(g.startsAt).getTime() < now)
    .sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1))
    .slice(0, 3);
  const sharedRecent = recent.filter((g) => g.shareEnabled);

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b-2 border-ink pb-6">
        <p className="eyebrow text-dirt-700">Public team page</p>
        <h1 className="m-0">{team.name}</h1>
        <p className="quote text-sm text-ink/80">Age band {team.ageBand} · powered by First Pitch</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="eyebrow text-dirt-700">Roster size</p>
          <p className="mt-1 text-3xl font-display">{players.filter((p) => !p.archivedAt).length}</p>
        </div>
        <div className="card">
          <p className="eyebrow text-dirt-700">Games scheduled</p>
          <p className="mt-1 text-3xl font-display">{allGames.length}</p>
        </div>
        <div className="card">
          <p className="eyebrow text-dirt-700">Press Box shares</p>
          <p className="mt-1 text-3xl font-display">
            {allGames.filter((g) => g.shareEnabled).length}
          </p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="m-0 text-lg">Next game</h2>
        {nextGame ? (
          <div className="space-y-1">
            <p className="text-sm">
              <span className={statusLabel(nextGame.status).cls}>
                {statusLabel(nextGame.status).label}
              </span>{" "}
              {nextGame.homeAway === "home" ? "vs" : "@"} {nextGame.opponent}
            </p>
            <p className="quote text-sm text-dirt-700">
              {formatGameWhen(nextGame.startsAt)}
              {nextGame.venue ? ` · ${nextGame.venue}` : ""}
            </p>
            {nextGame.shareEnabled ? (
              <p className="mt-2">
                <a className="btn-ghost no-underline" href={pressBoxPath(nextGame.id)}>
                  Open Press Box →
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink/80">No upcoming games posted.</p>
        )}
      </section>

      {sharedRecent.length > 0 ? (
        <section className="card space-y-3">
          <h2 className="m-0 text-lg">Recent Press Box shares</h2>
          <ul className="text-sm">
            {sharedRecent.map((g) => (
              <li key={g.id} className="flex items-baseline justify-between border-b border-dirt-200 py-2">
                <span>
                  {g.homeAway === "home" ? "vs" : "@"} {g.opponent}{" "}
                  <span className="quote text-xs text-dirt-700">
                    · {formatGameWhen(g.startsAt)}
                  </span>
                </span>
                <a className="btn-ghost no-underline" href={pressBoxPath(g.id)}>
                  Open
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-2 border-ink bg-dirt-100 p-5">
        <p className="quote text-sm text-ink/80">
          Coaching this team? <Link href="/login" className="underline">Sign in</Link> to manage
          roster, lineups, and Press Box shares. Parent on this team?{" "}
          <Link href="/login" className="underline">Magic-link in</Link> to see your child&apos;s
          progress and assigned home missions.
        </p>
      </section>

      <p className="text-xs text-dirt-700">
        First Pitch publishes only what coaches choose to share. No roster names, no player photos,
        no contact info on this public page.
      </p>
    </div>
  );
}
