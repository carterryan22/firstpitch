import { NextRequest, NextResponse } from "next/server";
import { dontDoToday } from "@platform/safety";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || typeof body.age !== "number") {
      return NextResponse.json({ error: "age (number) required" }, { status: 400 });
    }
    const r = dontDoToday(body);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
