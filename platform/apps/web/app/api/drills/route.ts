import { NextRequest, NextResponse } from "next/server";
import { loadDrills } from "@platform/corpus";
import { normalizeTier } from "../../drills/drillLabels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const age = sp.get("age") ? Number(sp.get("age")) : undefined;
  const rawTopic = sp.get("topic") ?? undefined;
  const rawTier = sp.get("tier") ?? undefined;
  const sport = sp.get("sport") ?? undefined;

  const allDrills = loadDrills();
  const knownTopics = new Set(allDrills.map((d) => d.topic));
  const topic = rawTopic && knownTopics.has(rawTopic) ? rawTopic : undefined;
  const tier = normalizeTier(rawTier);

  if (rawTopic && !topic) {
    return NextResponse.json(
      { error: `Unknown topic "${rawTopic}"`, knownTopics: Array.from(knownTopics).sort() },
      { status: 400 },
    );
  }
  if (rawTier && !tier) {
    return NextResponse.json(
      { error: `Unknown tier "${rawTier}"`, knownTiers: ["T1_field", "T2_cage_gym", "T3_backyard", "T4_living_room", "T1", "T2", "T3", "T4"] },
      { status: 400 },
    );
  }

  let drills = allDrills;
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
