import { NextResponse } from "next/server";
import { compile, antiLineCheck, type CompileInput } from "@platform/compiler";
import { postFilter } from "@platform/ai";
import { getRepos } from "@platform/storage";
import { missionsForAge, type Mission } from "@platform/missions";
import { getSession } from "../../lib/session";
import { userCanManageTeam } from "../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<CompileInput> & {
    name?: string;
    persist?: boolean;
    teamId?: string;
    scheduledAt?: string;
    location?: string;
  };
  try {
    body = (await req.json()) as Partial<CompileInput> & {
      name?: string;
      persist?: boolean;
      teamId?: string;
      scheduledAt?: string;
      location?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.age !== "number" || typeof body.durationMin !== "number") {
    return NextResponse.json({ error: "age and durationMin are required" }, { status: 400 });
  }
  const input: CompileInput = {
    age: body.age,
    durationMin: body.durationMin,
    environmentTier: body.environmentTier ?? "T1_field",
    equipmentAvailable: body.equipmentAvailable ?? [],
    coaches: body.coaches ?? 1,
    players: body.players ?? 8,
    focus: body.focus ?? ["throwing"],
    fieldResources: body.fieldResources,
    pitchHistoryByPlayer: body.pitchHistoryByPlayer,
    date: body.date ? new Date(body.date) : undefined,
    overrides: body.overrides,
    selectedDrillIds: body.selectedDrillIds,
    transitionMinPerBlock: body.transitionMinPerBlock,
  };
  const result = compile(input);

  // Compiler v2 — run the anti-line check up front so the UI can surface
  // station-density violations next to the safety warnings.
  const antiLine = antiLineCheck(result, {
    players: input.players,
    coaches: input.coaches,
    fieldResources: input.fieldResources,
  });

  // Defensive sweep: run post-filter on every drill note so any future
  // AI-authored content can't bypass the runtime guard.
  const ageBand = result.ageBand;
  const filterActions: string[] = [];
  result.blocks.forEach((b) => {
    b.notes = b.notes.map((n) => {
      const r = postFilter(n, { ageBand, userRole: "coach" });
      if (r.actions.length) filterActions.push(...r.actions);
      return r.text;
    });
  });

  // Optional persistence — coach/admin only; requires team membership when teamId is set.
  let planId: string | undefined;
  if (body.persist) {
    const session = await getSession();
    if (!session || (session.user.role !== "coach" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Only coaches can save plans. Sign in as a coach." },
        { status: 403 }
      );
    }
    if (body.teamId && !(await userCanManageTeam(session.user.id, body.teamId))) {
      return NextResponse.json(
        { error: "You are not a coach on that team." },
        { status: 403 }
      );
    }
    const repos = getRepos();
    const plan = await repos.plans.create({
      name: body.name ?? `Practice ${new Date().toISOString().slice(0, 10)}`,
      ageBand,
      durationMin: input.durationMin,
      blocks: result.blocks,
      qualityScore: result.qualityScore,
      warnings: result.warnings,
      blocked: result.blocked,
      totalThrowingLoad: result.totalThrowingLoad,
      timeBudget: result.timeBudget,
      focus: input.focus,
      createdByUserId: session.user.id,
      teamId: body.teamId,
      scheduledAt: body.scheduledAt,
      location: body.location,
      status: body.scheduledAt ? "scheduled" : undefined,
    });
    await repos.audit.log({ userId: session.user.id, action: "plan_compiled", resource: `plan:${plan.id}` });
    planId = plan.id;
  }

  // Auto-suggested missions: any mission whose drill the compiler picked, or whose
  // band+topic overlaps the plan. Coaches see them as a one-click "assign to player".
  const drillIdsInPlan = new Set(
    result.blocks.map((b) => b.drill?.drill_id).filter((x): x is string => Boolean(x)),
  );
  const ageMissions = missionsForAge(input.age);
  const suggestedMissions: Array<Pick<Mission, "id" | "title" | "description" | "kind" | "cadenceDays" | "minVerification" | "drillId">> = [];
  for (const m of ageMissions) {
    const directHit = m.drillId && drillIdsInPlan.has(m.drillId);
    if (directHit) {
      suggestedMissions.push({
        id: m.id,
        title: m.title,
        description: m.description,
        kind: m.kind,
        cadenceDays: m.cadenceDays,
        minVerification: m.minVerification,
        drillId: m.drillId,
      });
    }
  }

  return NextResponse.json({
    ...result,
    antiLine,
    postFilterActions: filterActions,
    planId,
    suggestedMissions,
  });
}

