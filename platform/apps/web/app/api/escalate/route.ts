import { NextRequest, NextResponse } from "next/server";
import { decideEscalation } from "@platform/safety";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, symptom, severity, reportedBy, bodyArea } = body ?? {};
    if (!playerId || !symptom || !severity || !reportedBy) {
      return NextResponse.json({ error: "playerId, symptom, severity, reportedBy required" }, { status: 400 });
    }
    const decision = decideEscalation({
      playerId, symptom, severity, reportedBy, bodyArea,
      reportedAt: new Date(),
    });
    return NextResponse.json(decision);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
