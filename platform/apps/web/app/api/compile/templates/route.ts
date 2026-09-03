import { NextResponse } from "next/server";
import { PLAN_TEMPLATES, suggestTemplates, templateDrills } from "@platform/compiler";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ageStr = url.searchParams.get("age");
  const durationStr = url.searchParams.get("duration");
  const env = url.searchParams.get("env") as
    | "T1_field"
    | "T2_cage_gym"
    | "T3_backyard"
    | "T4_living_room"
    | null;

  const list = ageStr && durationStr && env
    ? suggestTemplates({
        age: Number(ageStr),
        durationMin: Number(durationStr),
        environmentTier: env,
      })
    : PLAN_TEMPLATES;

  const enriched = list.map((template) => {
    const drills = templateDrills(template);
    return {
      ...template,
      drillIds: drills.map((drill) => drill.drill_id),
      drills: drills.map((drill) => ({
        drill_id: drill.drill_id,
        name: drill.name,
        duration_minutes: drill.duration_minutes,
        topic: drill.topic,
      })),
    };
  });

  return NextResponse.json({ templates: enriched });
}
