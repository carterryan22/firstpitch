import { NextRequest, NextResponse } from "next/server";
import { retrieve } from "@platform/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const k = Number(req.nextUrl.searchParams.get("k") ?? "5");
  const kindsParam = req.nextUrl.searchParams.get("kinds");
  const tierMaxParam = req.nextUrl.searchParams.get("tierMax");
  const kinds = kindsParam ? (kindsParam.split(",") as Array<"source" | "drill">) : undefined;
  const tierMax = tierMaxParam ? Number(tierMaxParam) : undefined;

  const results = retrieve(q, { k, kinds, tierMax });
  return NextResponse.json({ query: q, count: results.length, results });
}
