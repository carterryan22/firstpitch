import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { fullName } from "../../../../../lib/players";
import { Card } from "../../../../../components/ui";
import { PlayerForm } from "../PlayerForm";

export const metadata = { title: "Player" };

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, player] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byId(playerId),
  ]);
  if (!team || !player || player.teamId !== id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/roster`} className="no-underline hover:underline">
            ← {team.name} roster
          </Link>
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            #{player.jerseyNumber || "—"}
          </span>
          <h1 className="m-0">{fullName(player)}</h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{player.bats || "?"}/{player.throws || "?"}</span>
          <span>·</span>
          <span>{player.ageBand}</span>
          {player.canPitch ? <span className="badge-info">Can pitch</span> : null}
          {player.canCatch ? <span className="badge-info">Can catch</span> : null}
          {player.injured ? <span className="badge-danger">Injured</span> : null}
          {player.archivedAt ? <span className="badge-warn">Archived</span> : null}
        </div>
      </header>
      <Card>
        <PlayerForm
          teamId={id}
          playerId={player.id}
          initial={{
            firstName: player.firstName,
            lastName: player.lastName,
            jerseyNumber: player.jerseyNumber,
            dob: player.dob,
            bats: player.bats,
            throws: player.throws,
            canPitch: !!player.canPitch,
            canCatch: !!player.canCatch,
            injured: !!player.injured,
            injuryNote: player.injuryNote,
            positionRatings: player.positionRatings ?? {},
            notes: player.notes,
          }}
        />
      </Card>
    </div>
  );
}
