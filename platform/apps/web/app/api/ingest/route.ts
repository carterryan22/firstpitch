import { NextRequest, NextResponse } from "next/server";
import { ingestGameChangerCsv, ingestBlastCsv, ingestHitTraxCsv, ingestRapsodoCsv } from "@platform/ingest";
import { getRepos } from "@platform/storage";
import { getSession } from "../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csv, roster, source, playerId, persist } = body ?? {};
    if (typeof csv !== "string") {
      return NextResponse.json({ error: "csv (string) required" }, { status: 400 });
    }
    if (csv.length > 5_000_000) {
      return NextResponse.json(
        { error: "csv too large (max 5MB)" },
        { status: 413 },
      );
    }

    // Device adapters: rapsodo / blast / hittrax → entries
    if (source && source !== "gameChanger") {
      const device = source === "rapsodo" ? ingestRapsodoCsv(csv)
        : source === "blast" ? ingestBlastCsv(csv)
        : source === "hittrax" ? ingestHitTraxCsv(csv)
        : null;
      if (!device) {
        return NextResponse.json({ error: `unknown source: ${source}` }, { status: 400 });
      }
      let writtenCount: number | undefined;
      if (persist && playerId) {
        const session = await getSession();
        if (session) {
          const repos = getRepos();
          const created = await repos.metricEntries.bulkCreate(
            device.entries.map((e) => ({
              playerId,
              metricKey: e.metricKey,
              value: e.value,
              recordedAt: e.recordedAt,
              verificationState: "device_captured" as const,
              source: e.source,
              notes: e.notes,
            }))
          );
          writtenCount = created.length;
          await repos.audit.log({ userId: session.user.id, action: "ingest_device", resource: `player:${playerId}`, metadata: { source, count: created.length } });
        }
      }
      return NextResponse.json({ ...device, writtenCount });
    }

    // GameChanger
    if (!Array.isArray(roster)) {
      return NextResponse.json({ error: "roster (array) required for gameChanger" }, { status: 400 });
    }
    const report = ingestGameChangerCsv(csv, roster);
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
