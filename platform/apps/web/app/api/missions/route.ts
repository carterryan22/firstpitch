import { NextRequest, NextResponse } from "next/server";
import { missionsForAge } from "@platform/missions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ageParam = req.nextUrl.searchParams.get("age");
  if (!ageParam) {
    return NextResponse.json({ error: "age query required" }, { status: 400 });
  }
  const age = Number(ageParam);
  if (!Number.isInteger(age) || age < 4 || age > 18) {
    return NextResponse.json(
      { error: "age must be an integer between 4 and 18" },
      { status: 400 },
    );
  }
  const missions = missionsForAge(age);
  return NextResponse.json({ age, count: missions.length, missions });
}
