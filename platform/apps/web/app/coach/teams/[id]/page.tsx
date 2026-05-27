import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "../../../lib/session";
import { getTeamRoster, plansForTeam, userCanManageTeam } from "../../../lib/teams";
import { Card } from "../../../components/ui";
import { AddMemberForm } from "./AddMemberForm";

export const metadata = { title: "Team" };

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!userCanManageTeam(session.user.id, id)) redirect("/coach");

  const { team, coaches, players, parents } = getTeamRoster(id);
  if (!team) notFound();
  const plans = plansForTeam(id);

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
        </div>
        <Link
          href={`/practice/new?teamId=${team.id}`}
          className="btn-primary no-underline hover:no-underline"
        >
          Build practice for this team
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
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
              <AddMemberForm teamId={team.id} />
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="m-0">Published plans ({plans.length})</h2>
          {plans.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">
                No plans yet. Build one for the team and players / parents will see it on their
                dashboards.
              </p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
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
                        {new Date(p.createdAt).toLocaleString()}
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
          )}
        </section>
      </div>
    </div>
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
