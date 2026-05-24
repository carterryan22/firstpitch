import { NextRequest, NextResponse } from "next/server";
import { diagnose } from "@platform/diagnosis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body required" }, { status: 400 });
    }
    const { outcomeMetric, entries, expectedRanges, minVerification } = body as {
      outcomeMetric: string;
      entries: Array<{ metricKey: string; value: number; recordedAt: string; verification: string }>;
      expectedRanges: Array<{ metricKey: string; min: number; max: number }>;
      minVerification?: string;
    };
    if (!outcomeMetric || !Array.isArray(entries) || !Array.isArray(expectedRanges)) {
      return NextResponse.json({ error: "outcomeMetric, entries[], expectedRanges[] required" }, { status: 400 });
    }
    const result = diagnose({
      outcomeMetric,
      entries: entries.map((e) => ({ ...e, recordedAt: new Date(e.recordedAt), verification: e.verification as never })),
      expectedRanges,
      minVerification: minVerification as never,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
