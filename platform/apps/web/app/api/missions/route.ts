import { NextRequest, NextResponse } from "next/server";
import { missionsForAge } from "@platform/missions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ageParam = req.nextUrl.searchParams.get("age");
  if (!ageParam) {
    return NextResponse.json({ error: "age query required" }, { status: 400 });
  }
  const age = Number(ageParam);
  const missions = missionsForAge(age);
  return NextResponse.json({ age, count: missions.length, missions });
}
