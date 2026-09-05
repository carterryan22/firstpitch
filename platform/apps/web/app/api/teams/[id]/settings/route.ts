import { NextResponse, type NextRequest } from "next/server";
import { getRepos, type TeamLeagueRules } from "@platform/storage";
import { getSession } from "../../../../lib/session";
import { userCanManageTeam } from "../../../../lib/teams";

export const dynamic = "force-dynamic";

interface PatchBody {
  leagueRules?: Partial<Record<keyof TeamLeagueRules, number | boolean | null | undefined>>;
  /** Id of the rule-set preset that produced these rules, for provenance badges. */
  appliedRuleSetId?: string | null;
  publicPageEnabled?: boolean;
}

/** Clamp + coerce an incoming numeric rule, or undefined to clear it. */
function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.round(n), 20);
}

function bool(v: unknown): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  return Boolean(v);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: teamId } = await ctx.params;
  if (!(await userCanManageTeam(session.user.id, teamId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const r = body.leagueRules ?? team.leagueRules ?? {};

  // Build a clean rule set; omitted/invalid fields are dropped (rule off).
  const leagueRules: TeamLeagueRules = {};
  const minFieldInnings = num(r.minFieldInnings);
  if (minFieldInnings !== undefined) leagueRules.minFieldInnings = minFieldInnings;
  const infieldRequiredByInning = num(r.infieldRequiredByInning);
  if (infieldRequiredByInning !== undefined) leagueRules.infieldRequiredByInning = infieldRequiredByInning;
  const maxConsecutiveBench = num(r.maxConsecutiveBench);
  if (maxConsecutiveBench !== undefined) leagueRules.maxConsecutiveBench = maxConsecutiveBench;
  const maxConsecutiveOutfield = num(r.maxConsecutiveOutfield);
  if (maxConsecutiveOutfield !== undefined) leagueRules.maxConsecutiveOutfield = maxConsecutiveOutfield;
  const maxConsecutiveSamePosition = num(r.maxConsecutiveSamePosition);
  if (maxConsecutiveSamePosition !== undefined) leagueRules.maxConsecutiveSamePosition = maxConsecutiveSamePosition;
  const minInfieldInnings = num(r.minInfieldInnings);
  if (minInfieldInnings !== undefined) leagueRules.minInfieldInnings = minInfieldInnings;
  const minOutfieldInnings = num(r.minOutfieldInnings);
  if (minOutfieldInnings !== undefined) leagueRules.minOutfieldInnings = minOutfieldInnings;
  if (bool(r.pitcherBenchInningBefore)) leagueRules.pitcherBenchInningBefore = true;
  if (bool(r.equalBenchTime)) leagueRules.equalBenchTime = true;

  const VALID_PRESET_IDS = new Set([
    "littleLeague_9_10",
    "littleLeague_11_12",
    "calRipken",
    "recBalanced",
    "tournament",
    "none",
  ]);
  // Provenance source: keep the applied preset id only when it's a known preset;
  // an explicit null or any manual edit that doesn't pass one clears it (fully custom).
  let appliedRuleSetId: string | undefined = team.appliedRuleSetId;
  if (body.appliedRuleSetId === null) {
    appliedRuleSetId = undefined;
  } else if (typeof body.appliedRuleSetId === "string" && VALID_PRESET_IDS.has(body.appliedRuleSetId)) {
    appliedRuleSetId = body.appliedRuleSetId === "none" ? undefined : body.appliedRuleSetId;
  }

  const publicPageEnabled =
    typeof body.publicPageEnabled === "boolean" ? body.publicPageEnabled : team.publicPageEnabled;
  const updated = await repos.teams.update(teamId, { leagueRules, appliedRuleSetId, publicPageEnabled });
  if (!updated) return NextResponse.json({ error: "team not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    leagueRules: updated.leagueRules ?? {},
    appliedRuleSetId: updated.appliedRuleSetId ?? null,
    publicPageEnabled: updated.publicPageEnabled === true,
  });
}
