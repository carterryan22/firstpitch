import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../../lib/session";
import { userCanManageTeam } from "../../../../../lib/teams";
import { Card } from "../../../../../components/ui";
import { NewGameForm } from "../NewGameForm";

export const metadata = { title: "New game" };

export default async function NewGamePage({ params }: { params: Promise<{ id: string }> }) {
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
          <Link href={`/coach/teams/${id}/games`} className="no-underline hover:underline">
            ← {team.name} games
          </Link>
        </p>
        <h1 className="mt-1">New game</h1>
      </header>
      <Card>
        <NewGameForm teamId={id} />
      </Card>
    </div>
  );
}
