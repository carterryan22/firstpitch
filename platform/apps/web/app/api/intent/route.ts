import { NextResponse } from "next/server";
import { classifyIntent, getDefaultProvider } from "@platform/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plain-text intent search. POST { query } → classified intent + a deep link
 * the UI can route to (e.g. "I need a 60 min practice plan for u-10 select").
 */
export async function POST(req: Request) {
  let body: { query?: unknown };
  try {
    body = (await req.json()) as { query?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "query too long (max 500 chars)" }, { status: 400 });
  }

  const intent = await classifyIntent(getDefaultProvider(), query);
  return NextResponse.json({ intent });
}
