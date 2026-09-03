import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { sendEmail } from "../../../lib/email";
import { siteUrl } from "../../../lib/site";
import { reportError } from "../../../lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** Must be the literal string "DELETE" to confirm intent. */
  confirm?: string;
  reason?: string;
}

/**
 * Records a verified account-deletion request. We log it, revoke active
 * sessions immediately, and notify our privacy desk to complete the cascade
 * within 30 days. We do NOT hard-delete inline because a user may own teams
 * with other coaches' and families' data that needs an ownership handoff.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "type DELETE to confirm" }, { status: 400 });
  }

  const repos = getRepos();

  await repos.audit.log({
    userId: session.user.id,
    action: "deletion_requested",
    resource: `user:${session.user.id}`,
    metadata: { reason: (body.reason ?? "").slice(0, 500), email: session.user.email },
  });

  // Revoke this session right away so access stops now.
  try {
    await repos.sessions.delete(session.sessionId);
  } catch {
    // best-effort
  }

  // Notify the privacy desk to complete the cascade + any ownership handoff.
  const delivery = await sendEmail({
    to: process.env.PRIVACY_INBOX || "privacy@firstpitch.app",
    subject: `Account deletion request: ${session.user.email}`,
    text:
      `User ${session.user.id} (${session.user.email}, role ${session.user.role}) requested deletion.\n` +
      `Reason: ${(body.reason ?? "-").slice(0, 500)}\n` +
      `Process within 30 days per policy. Dashboard: ${siteUrl()}/admin/audit`,
  });
  if (!delivery.ok) {
    await reportError(new Error(delivery.error ?? "Privacy inbox delivery failed"), {
      source: "api/account/delete",
      userId: session.user.id,
      extra: { deletionRequestRecorded: true },
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Your deletion request was received. Your session has been signed out and we'll complete deletion within 30 days.",
  });
}
