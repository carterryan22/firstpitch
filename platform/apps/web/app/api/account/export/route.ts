import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";
import { buildDataExport } from "../../../lib/dataExport";
import { getRepos } from "@platform/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-service data export. Returns a JSON download of everything tied to the
 * signed-in user. Satisfies GDPR/CCPA access + COPPA parental review.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bundle = await buildDataExport(session.user.id);
  if (!bundle) return NextResponse.json({ error: "not found" }, { status: 404 });

  await getRepos().audit.log({
    userId: session.user.id,
    action: "data_exported",
    resource: `user:${session.user.id}`,
  });

  const filename = `first-pitch-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
