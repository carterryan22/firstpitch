import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { fullName } from "../../../../lib/players";
import { Card } from "../../../../components/ui";
import { ImportCsvForm } from "./ImportCsvForm";

export const metadata = { title: "Import CSV" };

export default async function ImportCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const repos = getRepos();
  const [team, players] = await Promise.all([
    repos.teams.byId(id),
    repos.players.byTeam(id),
  ]);
  if (!team) notFound();

  const roster = players.map((p) => ({
    playerId: p.id,
    displayName: fullName(p),
    jerseyNumber: p.jerseyNumber ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Import game stats (GameChanger CSV)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload or paste a GameChanger-style filtered CSV export. Common column variants
          (PA, AB, H, 2B, 3B, HR, BB, K, RBI, SB, CS) are auto-mapped. Player names are matched
          fuzzily against your roster.
        </p>
      </header>

      <Card>
        <ImportCsvForm roster={roster} />
      </Card>
    </div>
  );
}
