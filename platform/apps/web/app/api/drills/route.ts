import { NextRequest, NextResponse } from "next/server";
import { loadDrills } from "@platform/corpus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const age = sp.get("age") ? Number(sp.get("age")) : undefined;
  const topic = sp.get("topic") ?? undefined;
  const tier = sp.get("tier") ?? undefined;
  const sport = sp.get("sport") ?? undefined;

  let drills = loadDrills();
  if (topic) drills = drills.filter((d) => d.topic === topic);
  if (tier) drills = drills.filter((d) => d.environment_tier === tier);
  if (sport) drills = drills.filter((d) => d.sport === sport || d.sport === "general");
  if (age !== undefined) {
    const band = age <= 8 ? "6-8" : age <= 12 ? "9-12" : age <= 15 ? "13-15" : "16+";
    drills = drills.filter((d) => d.age_band.includes(band as never));
  }
  return NextResponse.json({
    count: drills.length,
    drills: drills.map((d) => ({
      id: d.drill_id,
      name: d.name,
      topic: d.topic,
      tier: d.environment_tier,
      durationMin: d.duration_minutes,
      summary: d.short_description,
      reviewStatus: d.review_status,
    })),
  });
}
