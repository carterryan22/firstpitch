import { NextRequest, NextResponse } from "next/server";
import { applicableRulesFor, getDefaultProvider, safeCall, retrieve } from "@platform/ai";
import { getSession } from "../../lib/session";
import { getRepos } from "@platform/storage";
import { requireRole, AuthError } from "@platform/auth";
import { reportError } from "../../lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireRole(session, ["coach", "admin"]);

    const body = (await req.json()) as {
      message?: string;
      ageBand?: string;
      sport?: "baseball" | "softball" | "both";
      promptId?: "COACH_QA" | "PRACTICE_PLAN" | "PARENT_MESSAGE" | "PLAYER_MESSAGE";
    };
    if (!body.message || body.message.length < 2) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    const ageBand = body.ageBand ?? "9-12";
    const sport = body.sport ?? "baseball";
    const promptId = body.promptId ?? "COACH_QA";

    const retrieved = retrieve(body.message, { k: 5 });
    const provider = getDefaultProvider();

    const result = await safeCall(provider, {
      promptId,
      env: {
        userRole: "coach",
        ageBand,
        sport,
        applicableRules: applicableRulesFor(["ai_layer", "compiler", "coach_console"]),
        retrievedRecordIds: retrieved.map((r) => r.id),
        retrievedSnippets: retrieved.map((r) => r.snippet),
      },
      userMessage: body.message,
    });

    await getRepos().audit.log({
      userId: session!.user.id,
      action: "coach_chat",
      resource: `prompt:${promptId}`,
      metadata: { blocked: result.blocked, escalate: result.escalate, provider: result.providerName },
    });

    return NextResponse.json({
      text: result.text,
      blocked: result.blocked,
      escalate: result.escalate,
      actions: result.actions,
      providerName: result.providerName,
      sources: retrieved.map((r) => ({ id: r.id, title: r.title, tier: r.citation.tier })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    await reportError(e, { source: "api/coach-chat" });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
