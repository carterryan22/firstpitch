import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { Card } from "../../../../../components/ui";
import { PlayerForm } from "../PlayerForm";

export const metadata = { title: "Add player" };

export default async function NewPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");
  const team = await getRepos().teams.byId(id);
  if (!team) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}/roster`} className="no-underline hover:underline">
            ← {team.name} roster
          </Link>
        </p>
        <h1 className="mt-1">Add player</h1>
      </header>
      <Card>
        <PlayerForm teamId={id} showParentEmail />
      </Card>
    </div>
  );
}
