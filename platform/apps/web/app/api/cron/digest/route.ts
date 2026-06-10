import { NextRequest, NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { buildTeamDigest, type TeamDigest } from "../../../lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory TTL cache. Cron-style consumers (or admin spot-checks) often poll
// the same team multiple times in a short window; rebuilding from scratch each
// time is wasteful since the underlying records change infrequently inside a
// single day. `?fresh=1` bypasses the cache.
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_ENTRIES = 256;
type CacheEntry = { generatedAt: number; digest: TeamDigest };
const DIGEST_CACHE = new Map<string, CacheEntry>();

function cacheSet(key: string, entry: CacheEntry): void {
  // Drop the oldest insertion-order entry when over the soft cap so we don't
  // grow without bound under a busy cron + many teams.
  if (DIGEST_CACHE.size >= CACHE_MAX_ENTRIES) {
    const firstKey = DIGEST_CACHE.keys().next().value;
    if (firstKey !== undefined) DIGEST_CACHE.delete(firstKey);
  }
  DIGEST_CACHE.set(key, entry);
}

function cacheKey(teamId: string, now: Date): string {
  // Bucket by 15-minute window so the key naturally rotates without LRU work.
  const bucket = Math.floor(now.getTime() / CACHE_TTL_MS);
  return `${teamId}:${bucket}`;
}

async function buildOne(teamId: string, now: Date, useCache: boolean): Promise<TeamDigest | null> {
  if (useCache) {
    const hit = DIGEST_CACHE.get(cacheKey(teamId, now));
    if (hit && now.getTime() - hit.generatedAt < CACHE_TTL_MS) return hit.digest;
  }
  const repos = getRepos();
  const team = await repos.teams.byId(teamId);
  if (!team) return null;
  const players = await repos.players.byTeam(team.id);
  const [games, plans, goals, teamMetricEntries] = await Promise.all([
    repos.games.list({ teamId: team.id }),
    repos.plans.list({ teamId: team.id }),
    repos.goals.list({ teamId: team.id }),
    repos.metricEntries.list({ playerIds: players.map((p) => p.id) }),
  ]);
  const digest = buildTeamDigest({
    team,
    players,
    games,
    plans,
    goals,
    metricEntries: teamMetricEntries,
    now,
  });
  if (useCache) cacheSet(cacheKey(team.id, now), { generatedAt: now.getTime(), digest });
  return digest;
}

async function buildAll(teamIdFilter: string | undefined, now: Date, useCache: boolean): Promise<TeamDigest[]> {
  const repos = getRepos();
  const allTeams = await repos.teams.list();
  const teams = teamIdFilter ? allTeams.filter((t) => t.id === teamIdFilter) : allTeams;
  const digests: TeamDigest[] = [];
  for (const team of teams) {
    const d = await buildOne(team.id, now, useCache);
    if (d) digests.push(d);
  }
  return digests;
}

function authorizeCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Fail OPEN only in local dev. In production an unset secret must fail
    // CLOSED — otherwise forgetting to set CRON_SECRET leaves this endpoint
    // (digest generation + audit writes) world-accessible.
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId") ?? undefined;
  const fresh = url.searchParams.get("fresh") === "1";
  const now = new Date();
  const digests = await buildAll(teamId, now, !fresh);

  await getRepos().audit.log({
    action: "cron_digest",
    resource: teamId ? `team:${teamId}` : "all",
    metadata: { count: digests.length, cached: !fresh },
  });

  return NextResponse.json({ digests, generatedAt: now.toISOString(), cached: !fresh });
}
