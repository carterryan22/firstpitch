import { NextResponse } from "next/server";
import { compile, type CompileInput } from "@platform/compiler";
import { postFilter } from "@platform/ai";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Partial<CompileInput> & { name?: string; persist?: boolean };
  try {
    body = (await req.json()) as Partial<CompileInput> & { name?: string; persist?: boolean };
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

  // Optional persistence — only if caller asked AND is signed in as coach/admin.
  let planId: string | undefined;
  if (body.persist) {
    const session = await getSession();
    if (session && (session.user.role === "coach" || session.user.role === "admin")) {
      const repos = getRepos();
      const plan = repos.plans.create({
        name: body.name ?? `Practice ${new Date().toISOString().slice(0, 10)}`,
        ageBand,
        durationMin: input.durationMin,
        blocks: result.blocks,
        qualityScore: result.qualityScore,
        createdByUserId: session.user.id,
      });
      repos.audit.log({ userId: session.user.id, action: "plan_compiled", resource: `plan:${plan.id}` });
      planId = plan.id;
    }
  }

  return NextResponse.json({ ...result, postFilterActions: filterActions, planId });
}
