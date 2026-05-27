import Link from "next/link";
import { redirect } from "next/navigation";
import { missionsForAge } from "@platform/missions";
import { homeMission } from "@platform/compiler";
import { getRepos } from "@platform/storage";
import { getSession } from "../lib/session";
import { getTeamsForUser, plansForTeam } from "../lib/teams";
import { Card } from "../components/ui";

export const metadata = { title: "Family dashboard" };

const AGE_FROM_BAND: Record<string, number> = {
  "6-8": 7,
  "9-12": 11,
  "13-15": 14,
  "16+": 16,
};

export default async function ParentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const repos = getRepos();
  const teams = await getTeamsForUser(session.user.id);
  const memberships = await repos.teamMemberships.list({ userId: session.user.id });
  const teamCards = await Promise.all(
    teams.map(async (t) => {
      const role = memberships.find((m) => m.teamId === t.id)?.role ?? "player";
      const plans = (await plansForTeam(t.id)).slice(0, 5);
      return { team: t, role, plans };
    })
  );
  const primaryAge = teams[0] ? AGE_FROM_BAND[teams[0].ageBand] ?? 11 : 11;
  const missions = missionsForAge(primaryAge);
  const home = homeMission({ age: primaryAge, focus: ["mental_recovery", "speed"] });

  return (
    <div className="space-y-10">
      <header>
        <h1>Today</h1>
        <p className="mt-2 text-slate-600">
          Practice plans your coach has published, plus a short home mission to do between sessions.
        </p>
      </header>

      {home ? (
        <Card>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <span className="badge-info">Home mission</span>
            <span>~{home.duration_minutes} min</span>
          </div>
          <h2 className="mt-1">{home.name}</h2>
          <p className="mt-1 text-slate-600">{home.short_description}</p>
          {home.coaching_cues?.length ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
              {home.coaching_cues.slice(0, 3).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <section className="space-y-4">
        <h2 className="m-0">Your teams</h2>
        {teamCards.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">
              You aren't on any teams yet. Ask your coach to add your email — once they do, the
              team's practice plans will show up here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teamCards.map(({ team, role, plans }) => (
              <Card key={team.id}>
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="m-0 text-base">{team.name}</h3>
                  <span className="badge-info">{role}</span>
                </header>
                <p className="text-xs text-slate-500">Age band {team.ageBand}</p>
                {plans.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No published plans yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {plans.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/plans/${p.id}`}
                          className="flex items-baseline justify-between gap-2 no-underline hover:underline"
                        >
                          <span className="truncate text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {missions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="m-0">Missions for age {primaryAge}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {missions.map((m) => (
              <li key={m.id}>
                <Card>
                  <h3 className="m-0 text-base">{m.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        Only coach-verified or device-verified data is shown. No diagnoses are inferred from
        self-entered values.
      </p>
    </div>
  );
}

