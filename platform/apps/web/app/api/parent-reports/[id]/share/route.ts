import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type ParentReportContent } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { reportIsShareable, isEditedSinceApproval } from "../../../../lib/monthlyReport";
import { sendEmail } from "../../../../lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Channel = "dashboard" | "email";

interface ShareBody {
  via?: Channel[];
}

function emailBody(playerName: string, periodLabel: string, c: ParentReportContent): string {
  const lines = [
    `${playerName}: ${periodLabel} progress update`,
    "",
    c.summary,
    "",
    `Attendance: ${c.attendance}`,
    `Effort: ${c.effort}`,
  ];
  if (c.improvement) lines.push(`Improvement: ${c.improvement}`);
  lines.push(`Playing time: ${c.playingTime}`);
  lines.push(`This month's focus: ${c.focus}`);
  lines.push(`Home mission: ${c.homeMission}`);
  if (c.safetyNote) lines.push(`Arm care: ${c.safetyNote}`);
  lines.push("", `Coach's note: ${c.coachNote}`);
  return lines.join("\n");
}

/**
 * Publish an approved report to parents. Hard-gated: the report must be
 * `approved`, carry a coach note, and not have been edited since approval.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const repos = getRepos();
  const report = await repos.parentReports.byId(id);
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await userCanManageTeam(session.user.id, report.teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // The review gate: nothing reaches a parent that isn't approved, reviewed
  // since the last edit, and carries a coach note.
  if (report.status !== "approved") {
    return NextResponse.json({ error: "not_approved" }, { status: 409 });
  }
  if (isEditedSinceApproval(report)) {
    return NextResponse.json({ error: "needs_reapproval" }, { status: 409 });
  }
  if (!reportIsShareable(report.content)) {
    return NextResponse.json({ error: "coach_note_required" }, { status: 422 });
  }

  const body = (await req.json().catch(() => ({}))) as ShareBody;
  const requested = Array.isArray(body.via) ? body.via : ["dashboard"];
  const via: Channel[] = [];
  if (requested.includes("dashboard")) via.push("dashboard");
  if (requested.includes("email")) via.push("email");
  if (via.length === 0) via.push("dashboard");

  let emailDelivery: string | undefined;
  if (via.includes("email")) {
    const player = await repos.players.byId(report.playerId);
    const parentUserId = player?.parentUserId;
    const parent = parentUserId ? await repos.users.byId(parentUserId) : undefined;
    if (parent?.email) {
      const playerName = player ? `${player.firstName} ${player.lastName}`.trim() : "Your player";
      const res = await sendEmail({
        to: parent.email,
        subject: `${playerName}: ${report.periodLabel} progress update`,
        text: emailBody(playerName, report.periodLabel, report.content),
      }).catch(() => ({ ok: false, provider: "console" as const }));
      emailDelivery = res.ok ? res.provider : "failed";
    } else {
      emailDelivery = "no_parent_email";
    }
  }

  const updated = await repos.parentReports.update(id, {
    status: "shared",
    sharedAt: new Date().toISOString(),
    sharedVia: via,
    recalledAt: undefined,
  });
  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_shared",
    resource: `parent_report:${id}`,
    metadata: { via, emailDelivery },
  });
  return NextResponse.json({ report: updated, emailDelivery });
}
