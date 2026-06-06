import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "../../../../lib/session";
import { getTeamRoster, userCanManageTeam } from "../../../../lib/teams";
import { gamesForTeam, splitUpcomingPast } from "../../../../lib/games";
import { Card } from "../../../../components/ui";
import { SnackRotation } from "./SnackRotation";

export const metadata = { title: "Snack duty" };

export default async function SnackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const { team, parents } = await getTeamRoster(id);
  if (!team) notFound();

  const all = await gamesForTeam(id);
  const { upcoming } = splitUpcomingPast(all);

  const volunteers = parents.map((p) => ({
    id: p.user.id,
    name: p.user.name || p.user.email || "Parent",
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/more`} className="no-underline hover:underline">
            ← Back to More
          </Link>
        </p>
        <h1 className="m-0">Snack duty</h1>
        <p className="mt-1 text-sm text-slate-600">
          Spread snack &amp; table duty evenly across families. Assignments show up on the public
          Press Box for each game so parents know when it&apos;s their turn.
        </p>
      </header>

      {volunteers.length === 0 ? (
        <Card>
          <p className="m-0 text-sm text-slate-600">
            No parents on this team yet. Add parents to the roster first, then come back to build a
            rotation.
          </p>
          <Link
            href={`/coach/teams/${id}/roster`}
            className="btn-ghost mt-3 inline-block no-underline hover:no-underline"
          >
            Manage roster
          </Link>
        </Card>
      ) : (
        <SnackRotation
          teamId={id}
          volunteers={volunteers}
          games={upcoming.map((g) => ({
            id: g.id,
            opponent: g.opponent,
            homeAway: g.homeAway,
            startsAt: g.startsAt,
            snackDuty: g.snackDuty ?? null,
          }))}
        />
      )}
    </div>
  );
}
