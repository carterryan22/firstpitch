import { getSession } from "../../lib/session";
import { getTeamsForUser } from "../../lib/teams";
import { PracticeBuilder } from "./PracticeBuilder";

export const metadata = { title: "New practice" };

export default async function NewPracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const teams = session ? getTeamsForUser(session.user.id) : [];
  const presetTeamId = sp.teamId && teams.some((t) => t.id === sp.teamId) ? sp.teamId : undefined;
  const canPersist = !!session && (session.user.role === "coach" || session.user.role === "admin");

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1>Build a practice</h1>
        <p className="mt-2 text-slate-600">
          The compiler picks age-appropriate drills, blocks unsafe combinations, and stays within
          Pitch Smart limits. Save it to a team so players and parents see it on their dashboards.
        </p>
      </header>
      <PracticeBuilder
        teams={teams.map((t) => ({ id: t.id, name: t.name, ageBand: t.ageBand }))}
        presetTeamId={presetTeamId}
        canPersist={canPersist}
      />
    </div>
  );
}

