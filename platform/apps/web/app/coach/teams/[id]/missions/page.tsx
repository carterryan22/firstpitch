import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { MISSIONS, type Mission } from "@platform/missions";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { sortRoster, fullName } from "../../../../lib/players";
import { AssignMissionPanel } from "./AssignMissionPanel";

export const metadata = { title: "Missions" };
export const dynamic = "force-dynamic";

function ageBandToBand(b: string): Mission["bands"][number] {
  if (b.startsWith("6-8")) return "6-8";
  if (b.startsWith("9-12")) return "9-12";
  if (b.startsWith("13-15")) return "13-15";
  return "16+";
}

export default async function TeamMissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login?next=" + encodeURIComponent(`/coach/teams/${id}/missions`));
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, players, assignments] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
    repos.missionAssignments.list({ teamId: id }),
  ]);
  if (!team) notFound();
  const roster = sortRoster(players);
  const band = ageBandToBand(team.ageBand);
  const availableMissions = MISSIONS.filter((m) => m.bands.includes(band));

  // group assignments by mission, then by player
  const assignmentsByMission = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = assignmentsByMission.get(a.missionId) ?? [];
    list.push(a);
    assignmentsByMission.set(a.missionId, list);
  }

  const openCount = assignments.filter((a) => !a.completedAt).length;
  const doneCount = assignments.length - openCount;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="m-0">Missions</h1>
          <p className="quote text-sm text-dirt-700">
            {assignments.length === 0
              ? "Nothing assigned yet."
              : `${doneCount} done · ${openCount} open`}
          </p>
        </div>
        <p className="text-sm text-ink/80 max-w-2xl">
          Pick a mission. Choose which players get it. Parents see it on their dashboard with a
          one-tap &quot;Done.&quot; Use this to close the loop after a practice plan or a baseline
          re-test.
        </p>
      </header>

      <section className="space-y-4">
        {availableMissions.map((m) => {
          const rows = assignmentsByMission.get(m.id) ?? [];
          const assignedPlayerIds = new Set(rows.map((r) => r.playerId));
          const completed = rows.filter((r) => r.completedAt).length;
          return (
            <article key={m.id} className="card space-y-3">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="m-0 text-lg">{m.title}</h2>
                  <p className="mt-1 text-sm text-ink/80">{m.description}</p>
                </div>
                <p className="quote text-xs text-dirt-700">
                  {m.cadenceDays}-day · {m.minVerification.replace(/_/g, " ")}
                </p>
              </header>
              {rows.length > 0 ? (
                <div className="text-xs text-dirt-700">
                  {completed}/{rows.length} complete
                </div>
              ) : null}
              <AssignMissionPanel
                teamId={id}
                missionId={m.id}
                roster={roster.map((p) => ({
                  id: p.id,
                  name: fullName(p),
                  jerseyNumber: p.jerseyNumber,
                  alreadyAssigned: assignedPlayerIds.has(p.id),
                }))}
              />
            </article>
          );
        })}
        {availableMissions.length === 0 ? (
          <p className="card text-sm">
            No missions are tagged for this team&apos;s age band yet.{" "}
            <Link href="/missions" className="underline">
              Browse all missions →
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
