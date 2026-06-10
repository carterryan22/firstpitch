import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type ParentReportContent, type ParentReportRecord } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";
import { buildMonthlyReport, monthWindow, previousMonthWindow } from "../../../../lib/monthlyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GenerateBody {
  /** Any yyyy-mm-dd inside the target month. Defaults to the previous month. */
  periodStart?: string;
  /** Restrict to specific roster players. Defaults to the whole active roster. */
  playerIds?: string[];
}

function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** List the team's parent reports (coach-only). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const repos = getRepos();
  const reports = await repos.parentReports.list({ teamId });
  reports.sort((a, b) =>
    a.periodStart === b.periodStart ? a.playerId.localeCompare(b.playerId) : b.periodStart.localeCompare(a.periodStart),
  );
  return NextResponse.json({ reports });
}

/**
 * Generate DRAFT monthly reports for the team. Idempotent per (player, period):
 * an existing report for the same month is left untouched (coach edits are
 * never clobbered) and returned as `skipped`.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  if (!team) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const now = new Date();
  const window = isYmd(body.periodStart) ? monthWindow(new Date(`${body.periodStart}T00:00:00Z`)) : previousMonthWindow(now);

  let roster = await repos.players.byTeam(teamId);
  if (Array.isArray(body.playerIds) && body.playerIds.length > 0) {
    const wanted = new Set(body.playerIds.slice(0, 100));
    roster = roster.filter((p) => wanted.has(p.id));
  }

  const [games, plans] = await Promise.all([
    repos.games.list({ teamId }),
    repos.plans.list({ teamId, scheduled: true }),
  ]);

  const created: ParentReportRecord[] = [];
  const skipped: ParentReportRecord[] = [];

  for (const player of roster) {
    const existing = await repos.parentReports.findForPeriod(player.id, window.periodStart);
    if (existing) {
      skipped.push(existing);
      continue;
    }
    const [metrics, gameStats, missionAssignments, missionCompletions] = await Promise.all([
      repos.metricEntries.list({ playerId: player.id }),
      repos.playerGameStats.list({ teamId, playerId: player.id }),
      repos.missionAssignments.list({ playerId: player.id }),
      repos.missionCompletions.list({ playerId: player.id }),
    ]);
    const content: ParentReportContent = buildMonthlyReport({
      player,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      periodLabel: window.periodLabel,
      games,
      plans,
      metrics,
      gameStats,
      missionAssignments,
      missionCompletions,
      now,
    });
    const record = await repos.parentReports.create({
      teamId,
      playerId: player.id,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      periodLabel: window.periodLabel,
      status: "draft",
      generated: content,
      content,
      generatedByUserId: session.user.id,
    });
    created.push(record);
  }

  await repos.audit.log({
    userId: session.user.id,
    action: "parent_report_generated",
    resource: `team:${teamId}`,
    metadata: { period: window.periodStart, created: created.length, skipped: skipped.length },
  });

  return NextResponse.json({ period: window, created, skipped });
}
