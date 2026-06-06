import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "../lib/session";
import { getTeamsForUser, plansForTeam } from "../lib/teams";
import { Card } from "../components/ui";
import { SmartSearch } from "../components/SmartSearch";
import { CreateTeamForm } from "./CreateTeamForm";
import { CreateTeamFromCsvForm } from "./CreateTeamFromCsvForm";

export const metadata = { title: "Coach dashboard" };

export default async function CoachDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "coach" && session.user.role !== "admin") {
    redirect("/parent");
  }

  const teams = await getTeamsForUser(session.user.id);
  const teamCards = await Promise.all(
    teams.map(async (t) => ({ team: t, plans: (await plansForTeam(t.id)).slice(0, 3) }))
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Coach dashboard</h1>
          <p className="mt-2 text-slate-600">
            Manage your teams, build today's practice, and publish it to your roster.
          </p>
        </div>
        <Link href="/practice/new" className="btn-primary no-underline hover:no-underline">
          + New practice
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="m-0">Your teams</h2>
        {teamCards.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">
              You don't have any teams yet. Create one to start sharing plans with players and parents.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teamCards.map(({ team, plans }) => (
              <Card key={team.id} className="flex flex-col gap-3">
                <header className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/coach/teams/${team.id}`}
                    className="text-lg font-semibold text-slate-900 no-underline hover:underline"
                  >
                    {team.name}
                  </Link>
                  <span className="badge-info">{team.ageBand}</span>
                </header>
                {plans.length === 0 ? (
                  <p className="text-sm text-slate-500">No plans yet for this team.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {plans.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <Link
                          href={`/plans/${p.id}`}
                          className="truncate text-slate-700 no-underline hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <footer className="flex gap-2 pt-1">
                  <Link
                    href={`/practice/new?teamId=${team.id}`}
                    className="btn-primary text-sm no-underline hover:no-underline"
                  >
                    Build practice
                  </Link>
                  <Link
                    href={`/coach/teams/${team.id}`}
                    className="btn-ghost text-sm no-underline hover:no-underline"
                  >
                    Manage roster
                  </Link>
                </footer>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="m-0">Create a team</h2>
        <Card>
          <CreateTeamForm />
        </Card>
        <Card>
          <h3 className="mt-0">Import a roster from GameChanger</h3>
          <p className="text-sm text-slate-600">
            Already have a GameChanger team? Drop in a filtered-stats CSV export and we&rsquo;ll
            create the team and its roster for you in one step.
          </p>
          <div className="mt-3">
            <CreateTeamFromCsvForm />
          </div>
        </Card>
      </section>
    </div>
  );
}

