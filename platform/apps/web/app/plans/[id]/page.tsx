import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepos } from "@platform/storage";
import { MISSIONS } from "@platform/missions";
import { getSession } from "../../lib/session";
import { userCanReadTeam } from "../../lib/teams";
import { PlanView, type PlanBlock } from "../../components/PlanView";

export const metadata = { title: "Practice plan" };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/plans/${id}`);

  const repos = getRepos();
  const plan = await repos.plans.byId(id);
  if (!plan) notFound();
  if (!plan.teamId || !(await userCanReadTeam(session.user.id, plan.teamId))) {
    redirect("/");
  }
  const team = await repos.teams.byId(plan.teamId);
  const blocks = Array.isArray(plan.blocks) ? (plan.blocks as PlanBlock[]) : [];
  const drillIds = new Set(blocks.map((b) => b.drill?.drill_id).filter((x): x is string => !!x));
  const suggestedMissions = MISSIONS.filter((m) => m.drillId && drillIds.has(m.drillId)).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    kind: m.kind,
    cadenceDays: m.cadenceDays,
    minVerification: m.minVerification,
    drillId: m.drillId,
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {team ? (
            <Link href={`/coach/teams/${team.id}`} className="no-underline hover:underline">
              {team.name}
            </Link>
          ) : (
            "Practice plan"
          )}{" "}
          · {new Date(plan.createdAt).toLocaleString()}
        </p>
        <h1 className="mt-1">{plan.name}</h1>
      </header>
      <PlanView
        teamId={plan.teamId ?? undefined}
        planId={plan.id}
        plan={{
          name: plan.name,
          ageBand: plan.ageBand,
          durationMin: plan.durationMin,
          blocks,
          warnings: plan.warnings,
          blocked: plan.blocked,
          totalThrowingLoad: plan.totalThrowingLoad,
          timeBudget: plan.timeBudget,
          qualityScore: plan.qualityScore,
          focus: plan.focus,
          suggestedMissions,
        }}
      />
    </div>
  );
}
