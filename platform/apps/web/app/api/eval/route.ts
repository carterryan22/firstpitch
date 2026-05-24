import { NextResponse } from "next/server";
import { runAll } from "@platform/eval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const run = runAll();
  return NextResponse.json(run);
}
