import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type ParentReportContent, type ParentReportRecord } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Coach-editable parent-facing fields and their length caps. */
const TEXT_LIMITS: Record<keyof ParentReportContent, number> = {
  summary: 280,
  attendance: 280,
  effort: 280,
  improvement: 280,
  focus: 400,
  homeMission: 400,
  playingTime: 280,
  coachNote: 600,
  safetyNote: 400,
};

/** Fields that may be cleared (set empty → undefined). */
const CLEARABLE = new Set<keyof ParentReportContent>(["improvement", "safetyNote"]);

interface PatchBody {
  content?: Partial<Record<keyof ParentReportContent, string | null>>;
}

async function loadOwned(id: string, userId: string) {
  const repos = getRepos();
  const report = await repos.parentReports.byId(id);
  if (!report) return { error: "not_found" as const, status: 404 as const };
  if (!(await userCanManageTeam(userId, report.teamId))) {
    return { error: "forbidden" as const, status: 403 as const };
  }
  return { report, repos };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const loaded = await loadOwned(id, session.user.id);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  const { report, repos } = loaded;

  // A shared report must be recalled before it can be edited — never silently
  // change what a parent is already looking at.
  if (report.status === "shared") {
    return NextResponse.json({ error: "recall_first" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const incoming = body.content ?? {};
  const nextContent: ParentReportContent = { ...report.content };
  let changed = false;
  for (const key of Object.keys(TEXT_LIMITS) as Array<keyof ParentReportContent>) {
    if (!(key in incoming)) continue;
    const raw = incoming[key];
    if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
      // Only CLEARABLE fields are optional, so clearing them to undefined is safe.
      if (CLEARABLE.has(key)) {
        if (nextContent[key] !== undefined) {
          (nextContent as unknown as Record<string, string | undefined>)[key] = undefined;
          changed = true;
        }
      }
      continue;
    }
    if (typeof raw !== "string") continue;
    const cleaned = raw.trim().slice(0, TEXT_LIMITS[key]);
    if (nextContent[key] !== cleaned) {
      nextContent[key] = cleaned;
      changed = true;
    }
  }

  if (!changed) return NextResponse.json({ report });

  const patch: Partial<ParentReportRecord> = {
    content: nextContent,
    editedAt: new Date().toISOString(),
    editedByUserId: session.user.id,
  };
  // Editing an approved (but unshared) report sends it back for re-approval.
  if (report.status === "approved") {
    patch.status = "draft";
  }
  const updated = await repos.parentReports.update(id, patch);
  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_edited",
    resource: `parent_report:${id}`,
    metadata: { revertedToDraft: report.status === "approved" },
  });
  return NextResponse.json({ report: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const loaded = await loadOwned(id, session.user.id);
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  const { repos } = loaded;
  await repos.parentReports.delete(id);
  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_deleted",
    resource: `parent_report:${id}`,
  });
  return NextResponse.json({ ok: true });
}
