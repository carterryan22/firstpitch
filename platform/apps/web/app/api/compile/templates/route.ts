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

  const enriched = list.map((t) => ({
    ...t,
    drills: templateDrills(t).map((d) => ({
      drill_id: d.drill_id,
      name: d.name,
      duration_minutes: d.duration_minutes,
      topic: d.topic,
    })),
  }));

  return NextResponse.json({ templates: enriched });
}
