import { NextResponse } from "next/server";
import { compile, type CompileInput } from "@platform/compiler";
import { postFilter } from "@platform/ai";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";
import { userCanManageTeam } from "../../lib/teams";

export const runtime = "nodejs";

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
    pitchHistoryByPlayer: body.pitchHistoryByPlayer,
    date: body.date ? new Date(body.date) : undefined,
    overrides: body.overrides,
  };
  const result = compile(input);

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

  return NextResponse.json({ ...result, postFilterActions: filterActions, planId });
}

