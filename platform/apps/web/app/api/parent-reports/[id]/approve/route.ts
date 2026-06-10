import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { reportIsShareable } from "../../../../lib/monthlyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Approve a report so it becomes eligible to share. Re-approving clears the
 * "edited since approval" flag by stamping a fresh approvedAt. */
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
  if (report.status === "shared") {
    return NextResponse.json({ error: "already_shared" }, { status: 409 });
  }
  if (!reportIsShareable(report.content)) {
    return NextResponse.json({ error: "coach_note_required" }, { status: 422 });
  }
  const now = new Date().toISOString();
  const updated = await repos.parentReports.update(id, {
    status: "approved",
    approvedByUserId: session.user.id,
    approvedAt: now,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_approved",
    resource: `parent_report:${id}`,
  });
  return NextResponse.json({ report: updated });
}
