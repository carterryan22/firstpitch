import { NextRequest, NextResponse } from "next/server";
import { decideEscalation } from "@platform/safety";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { playerId, symptom, severity, reportedBy, bodyArea } = body ?? {};
    if (!playerId || !symptom || !severity || !reportedBy) {
      return NextResponse.json({ error: "playerId, symptom, severity, reportedBy required" }, { status: 400 });
    }
    const decision = decideEscalation({
      playerId, symptom, severity, reportedBy, bodyArea,
      reportedAt: new Date(),
    });
    await getRepos().audit.log({
      userId: session.user.id,
      action: "escalation",
      resource: `player:${playerId}`,
      metadata: { symptom, severity, reportedBy, bodyArea, decision: decision.escalateTo },
    });
    return NextResponse.json(decision);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
