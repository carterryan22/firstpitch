import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { AskPanel } from "./AskPanel";

export const metadata = { title: "Ask coach AI" };

export default async function CoachAskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await userCanManageTeam(session.user.id, id))) redirect("/coach");

  const team = await getRepos().teams.byId(id);
  if (!team) notFound();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/coach/teams/${id}`} className="no-underline hover:underline">
            ← {team.name}
          </Link>
        </p>
        <h1 className="mt-1">Ask Coach AI</h1>
        <p className="mt-1 text-sm text-slate-500">
          Grounded in this team&apos;s roster, recent games, active goals, and recent baselines. Answers
          cite Tier 1 safety rules where relevant. Pain &amp; injury questions are routed to escalation.
        </p>
      </header>
      <AskPanel teamId={id} />
    </div>
  );
}
