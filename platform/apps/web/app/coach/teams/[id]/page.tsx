import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { getTeamRoster, plansForTeam, userCanManageTeam } from "../../../lib/teams";
import { Card } from "../../../components/ui";
import { Walkthrough } from "../../../components/Walkthrough";
import { TEAM_HOME_TOUR } from "../../../lib/tours";
import { AddMemberForm } from "./AddMemberForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getRepos().teams.byId(id);
  return { title: team ? `${team.name} · Team` : "Team" };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const { team, coaches, players, parents } = await getTeamRoster(id);
  if (!team) notFound();
  const [plans, rosterPlayers] = await Promise.all([
    plansForTeam(id),
    getRepos().players.byTeam(id),
  ]);
  const linkablePlayers = rosterPlayers.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
  }));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            <Link href="/coach" className="no-underline hover:underline">Coach dashboard</Link> /
            Team
          </p>
          <h1 className="mt-1">{team.name}</h1>
          <p className="mt-1 text-slate-600">
            Age band {team.ageBand} · slug <code className="bg-slate-100 px-1">{team.slug}</code>
          </p>
          <div className="mt-2">
            <Walkthrough tour={TEAM_HOME_TOUR} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/coach/teams/${team.id}/roster`}
            className="btn-ghost no-underline hover:no-underline"
          >
            Manage roster
          </Link>
          <Link
            href={`/coach/teams/${team.id}/more`}
            className="btn-ghost no-underline hover:no-underline"
          >
            More
          </Link>
          <Link
            href={`/coach/teams/${team.id}/memory`}
            className="btn-ghost no-underline hover:no-underline"
          >
            🧠 Coach Memory
          </Link>
          <Link
            href={`/practice/new?teamId=${team.id}`}
            data-tour="team-build-practice"
            className="btn-primary no-underline hover:no-underline"
          >
            Build practice
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4" data-tour="team-roster">
          <h2 className="m-0">Roster</h2>
          <Card>
            <RosterGroup title="Coaches" rows={coaches} />
            <RosterGroup title="Players" rows={players} />
            <RosterGroup title="Parents" rows={parents} />
          </Card>
          <Card>
            <h3 className="m-0 text-sm uppercase tracking-wide text-slate-500">Invite</h3>
            <p className="mt-1 text-sm text-slate-600">
              Adding by email auto-provisions the account. They'll see this team after they sign in.
            </p>
            <div className="mt-3">
              <AddMemberForm teamId={team.id} players={linkablePlayers} />
            </div>
          </Card>
        </section>

        <section className="space-y-4" data-tour="team-practices">
          <h2 className="m-0">Practices</h2>
          <PlansSection plans={plans} />
        </section>
      </div>
    </div>
  );
}

function PlansSection({
  plans,
}: {
  plans: Array<{
    id: string;
    name: string;
    durationMin: number;
    ageBand: string;
    focus?: string[];
    createdAt: string;
    scheduledAt?: string;
    location?: string;
  }>;
}) {
  const now = Date.now();
  const upcoming = plans
    .filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() >= now - 1000 * 60 * 60 * 6)
    .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1));
  const past = plans
    .filter((p) => p.scheduledAt && new Date(p.scheduledAt).getTime() < now - 1000 * 60 * 60 * 6)
    .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? 1 : -1));
  const drafts = plans.filter((p) => !p.scheduledAt);

  return (
    <>
      <div>
        <h3 className="m-0 text-sm uppercase tracking-wide text-slate-500">
          Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nothing scheduled. Build a practice and pick a date to put it on the calendar.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/plans/${p.id}`}
                      className="text-base font-medium text-slate-900 no-underline hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="badge-info">
                      {new Date(p.scheduledAt!).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.durationMin} min · age {p.ageBand}
                    {p.location ? ` · ${p.location}` : ""}
                    {p.focus?.length ? ` · ${p.focus.join(", ")}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {drafts.length > 0 ? (
        <div className="mt-4">
          <h3 className="m-0 text-sm uppercase tracking-wide text-slate-500">
            Drafts ({drafts.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {drafts.map((p) => (
              <li key={p.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/plans/${p.id}`}
                      className="text-base font-medium text-slate-900 no-underline hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      Saved {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.durationMin} min · age {p.ageBand}
                    {p.focus?.length ? ` · ${p.focus.join(", ")}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {past.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-slate-500">
            {past.length} past practice{past.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {past.slice(0, 20).map((p) => (
              <li key={p.id}>
                <Link href={`/plans/${p.id}`} className="no-underline hover:underline">
                  {p.name}
                </Link>
                <span className="ml-2 text-xs text-slate-400">
                  {new Date(p.scheduledAt!).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function RosterGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ user: { name?: string; email: string }; membership: { id: string } }>;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <h3 className="m-0 text-sm uppercase tracking-wide text-slate-500">
        {title} ({rows.length})
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">None yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.map(({ user, membership }) => (
            <li key={membership.id} className="flex justify-between gap-2">
              <span className="text-slate-800">{user.name ?? "—"}</span>
              <span className="text-slate-500">{user.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
