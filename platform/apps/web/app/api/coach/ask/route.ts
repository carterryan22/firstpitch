import { NextRequest, NextResponse } from "next/server";
import { applicableRulesFor, getDefaultProvider, safeCall, retrieve } from "@platform/ai";
import { getRepos } from "@platform/storage";
import { getSession } from "../../../lib/session";
import { userCanManageTeam } from "../../../lib/teams";
import { ageFromDob, fullName } from "../../../lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ageBandSport(band: string): "baseball" | "softball" | "both" {
  return "baseball";
}

const DAY_MS = 24 * 3600 * 1000;
const RECENT_BASELINE_WINDOW_DAYS = 30;

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = (await req.json()) as { teamId?: string; question?: string };
    if (!body.teamId || !body.question || body.question.trim().length < 2) {
      return NextResponse.json({ error: "teamId and question required" }, { status: 400 });
    }
    if (!(await userCanManageTeam(session.user.id, body.teamId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const repos = getRepos();
    const team = await repos.teams.byId(body.teamId);
    if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });
    const players = await repos.players.byTeam(body.teamId);
    const [allGames, goals, metricEntries] = await Promise.all([
      repos.games.list({ teamId: body.teamId }),
      repos.goals.list({ teamId: body.teamId, status: "active" }),
      repos.metricEntries.list({ playerIds: players.map((p) => p.id) }),
    ]);

    const recentGames = allGames
      .slice()
      .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))
      .slice(0, 5);

    const playerById = new Map(players.map((p) => [p.id, p]));
    const cutoff = Date.now() - RECENT_BASELINE_WINDOW_DAYS * DAY_MS;
    const recentEntries = metricEntries
      .filter((e) => new Date(e.recordedAt).getTime() >= cutoff)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

    // Build grounded snippets.
    const rosterSnippet = [
      `TEAM: ${team.name} (age band ${team.ageBand})`,
      `ROSTER (${players.length} players):`,
      ...players.slice(0, 30).map((p) => {
        const age = p.dob ? `${ageFromDob(p.dob)}yo` : "age ?";
        const flags = [
          p.canPitch ? "P✓" : null,
          p.canCatch ? "C✓" : null,
          p.injured ? `INJ${p.injuryNote ? `:${p.injuryNote}` : ""}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        return `- ${fullName(p)} (${age}) pos:${(p.positions ?? []).join("/")} ${flags}`;
      }),
    ].join("\n");

    const gamesSnippet = [
      `RECENT GAMES (last ${recentGames.length}):`,
      ...recentGames.map((g) => {
        const score = g.finalScore ? ` ${g.finalScore.us}-${g.finalScore.them}` : "";
        const pitches = Object.entries(g.pitchCounts ?? {})
          .map(([pid, pc]) => {
            const nm = playerById.get(pid);
            return nm ? `${fullName(nm)}:${pc.pitches}` : null;
          })
          .filter(Boolean)
          .join(", ");
        return `- ${g.startsAt?.slice(0, 10)} vs ${g.opponent}${score} status:${g.status}${pitches ? ` pitches[${pitches}]` : ""}`;
      }),
    ].join("\n");

    const goalsSnippet = [
      `ACTIVE GOALS (${goals.length}):`,
      ...goals.slice(0, 20).map((g) => {
        const nm = playerById.get(g.playerId);
        return `- ${nm ? fullName(nm) : g.playerId}: ${g.metricKey} ${g.type === "delta" ? "+" : ""}${g.target} (baseline ${g.baseline}${g.targetDate ? `, by ${g.targetDate.slice(0, 10)}` : ""})`;
      }),
    ].join("\n");

    const latestByPlayerMetric = new Map<string, (typeof recentEntries)[number]>();
    for (const e of recentEntries) {
      const k = `${e.playerId}::${e.metricKey}`;
      if (!latestByPlayerMetric.has(k)) latestByPlayerMetric.set(k, e);
    }
    const baselinesSnippet = [
      `RECENT BASELINES (last 30d, latest per player+metric, capped 30):`,
      ...Array.from(latestByPlayerMetric.values())
        .slice(0, 30)
        .map((e) => {
          const nm = playerById.get(e.playerId);
          return `- ${nm ? fullName(nm) : e.playerId} ${e.metricKey}=${e.value} on ${e.recordedAt.slice(0, 10)}`;
        }),
    ].join("\n");

    const teamSnippets = [rosterSnippet, gamesSnippet, goalsSnippet, baselinesSnippet].map((s) =>
      clip(s, 4000),
    );

    const retrieved = retrieve(body.question, { k: 5 });
    const provider = getDefaultProvider();

    const result = await safeCall(provider, {
      promptId: "COACH_QA",
      env: {
        userRole: "coach",
        ageBand: team.ageBand,
        sport: ageBandSport(team.ageBand),
        applicableRules: applicableRulesFor(["ai_layer", "coach_console", "compiler"]),
        retrievedRecordIds: [...retrieved.map((r) => r.id), `team:${team.id}`],
        retrievedSnippets: [...teamSnippets, ...retrieved.map((r) => r.snippet)],
      },
      userMessage: body.question,
    });

    await repos.audit.log({
      userId: session.user.id,
      action: "coach_ask",
      resource: `team:${team.id}`,
      metadata: { blocked: result.blocked, escalate: result.escalate, provider: result.providerName },
    });

    return NextResponse.json({
      text: result.text,
      blocked: result.blocked,
      escalate: result.escalate,
      actions: result.actions,
      providerName: result.providerName,
      sources: retrieved.map((r) => ({ id: r.id, title: r.title, tier: r.citation.tier })),
      teamContext: {
        players: players.length,
        recentGames: recentGames.length,
        activeGoals: goals.length,
        recentBaselines: latestByPlayerMetric.size,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
