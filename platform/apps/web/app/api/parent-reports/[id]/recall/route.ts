import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pull a shared report back from parents. It returns to `draft` (hidden from the
 * family dashboard again) so the coach can edit and re-approve before re-sharing.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const report = await repos.parentReports.byId(id);
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, report.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (report.status !== "shared") {
    return NextResponse.json({ error: "not_shared" }, { status: 409 });
  }
  const updated = await repos.parentReports.update(id, {
    status: "draft",
    recalledAt: new Date().toISOString(),
    sharedAt: undefined,
    sharedVia: undefined,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_recalled",
    resource: `parent_report:${id}`,
  });
  return NextResponse.json({ report: updated });
}
