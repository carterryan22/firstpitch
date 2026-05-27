import { NextResponse } from "next/server";
import { canPitchToday } from "@platform/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckBody {
  age?: number;
  plannedPitches?: number;
  date?: string;
  todayCount?: number;
  soreToday?: boolean;
  todayCatchingInnings?: number;
  continuousThrowingDays?: number;
  outingsByDate?: Record<string, number>;
  leagueDailyMax?: number;
}

export async function POST(req: Request) {
  let body: CheckBody;
  try {
    body = (await req.json()) as CheckBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.age !== "number" || typeof body.plannedPitches !== "number") {
    return NextResponse.json(
      { error: "age and plannedPitches are required" },
      { status: 400 }
    );
  }
  const res = canPitchToday({
    age: body.age,
    date: body.date ? new Date(body.date) : new Date(),
    plannedPitches: body.plannedPitches,
    leagueDailyMax: body.leagueDailyMax,
    history: {
      outingsByDate: body.outingsByDate ?? {},
      todayCount: body.todayCount ?? 0,
      soreToday: body.soreToday ?? false,
      todayCatchingInnings: body.todayCatchingInnings ?? 0,
      continuousThrowingDays: body.continuousThrowingDays ?? 0,
    },
  });
  return NextResponse.json(res);
}
