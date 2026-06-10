/**
 * Coach Memory — the "never lose track of what each player needs" engine.
 *
 * Youth coaches juggle chaos and forget things. This synthesizes the data we
 * already store (defensive rotations, pitch counts, attendance) with the
 * coach's one-tap quick-tags into a single per-player picture: who sat last
 * game, who's only played outfield, who needs infield reps, who pitched/caught
 * recently, who needs confidence, who's working hard, who's missed practice —
 * plus the team's recurring mistakes.
 *
 * It's a coach-only surface. Watch-tone signals describe a *skill to work on*,
 * never a judgment of the kid, and nothing here is parent-facing.
 *
 * Pure + deterministic: takes already-fetched records, returns a view model.
 */

import { summarize, type Inning, type FairnessRow } from "@platform/lineup";
import type { IntentFocus } from "@platform/ai";
import { quickTagDef, type QuickTagTone } from "./quickTags";

export interface MemoryPlayer {
  id: string;
  firstName: string;
  lastName: string;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  injuryNote?: string;
}

export interface MemoryGame {
  id: string;
  startsAt: string;
  /** inning -> playerId -> slot ("P","C",...,"BN"). */
  lineup?: Array<Record<string, string>>;
  /** playerId -> pitch count entered post-game. */
  pitchCounts?: Record<string, { pitches: number }>;
  /** playerId -> present|absent. */
  attendance?: Record<string, "present" | "absent">;
  opponent?: string;
}

export interface MemoryTag {
  code: string;
  playerId?: string;
  createdAt: string;
}

export interface CoachMemoryInput {
  players: MemoryPlayer[];
  /** All games; the engine sorts chronologically and uses the played window. */
  games: MemoryGame[];
  /** Quick-tags already filtered to the window the caller wants to consider. */
  tags: MemoryTag[];
  /** Optional practice-absence counts per player (from scheduled plans). */
  practiceAbsencesByPlayer?: Record<string, number>;
  /** How many recent played games to weigh. Default 5. */
  windowGames?: number;
}

export type MemoryTone = "positive" | "watch" | "neutral" | "danger";

export interface MemorySignal {
  kind: string;
  tone: MemoryTone;
  /** Short chip label. */
  label: string;
  /** One-line context. */
  detail?: string;
}

export interface PlayerMemory {
  playerId: string;
  name: string;
  /** Watch/neutral signals — "what they need". Ordered most-important first. */
  needs: MemorySignal[];
  /** Positive signals — strengths worth remembering (confidence, parent talk). */
  strengths: MemorySignal[];
  /** The single most important thing for this player right now. */
  topNeed?: MemorySignal;
  watchCount: number;
}

export interface TeamMemorySignal {
  code: string;
  label: string;
  count: number;
  focus?: IntentFocus[];
}

export interface CoachMemory {
  players: PlayerMemory[];
  /** Recurring team mistakes, most-tagged first. Feeds Fix-Last-Game. */
  team: TeamMemorySignal[];
  windowGames: number;
  playedGames: number;
}

const INFIELD_DIRT = new Set(["1B", "2B", "3B", "SS"]);
const OUTFIELD = new Set(["LF", "CF", "RF", "RV"]);

// Priority rank for choosing the single "top need". Lower = more urgent.
const KIND_RANK: Record<string, number> = {
  injured: 0,
  arm_care: 1,
  skill_watch: 2,
  sat_last_game: 3,
  needs_infield_reps: 4,
  only_outfield: 4,
  low_playing_time: 5,
  needs_confidence: 6,
  missed_practice: 7,
};

function toneFromTag(tone: QuickTagTone): MemoryTone {
  if (tone === "positive") return "positive";
  if (tone === "watch") return "watch";
  return "neutral";
}

/** A game counts as "played" once it has at least one inning of assignments. */
function isPlayed(g: MemoryGame): boolean {
  return Array.isArray(g.lineup) && g.lineup.length > 0;
}

export function buildCoachMemory(input: CoachMemoryInput): CoachMemory {
  const windowGames = input.windowGames ?? 5;
  const played = input.games
    .filter(isPlayed)
    .slice()
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  const windowed = played.slice(-windowGames);
  const lastGame = windowed[windowed.length - 1];
  const playerIds = input.players.map((p) => p.id);

  // Aggregate rotation stats across the window + isolate the last game.
  const agg: Record<string, FairnessRow> = {};
  for (const id of playerIds) {
    agg[id] = { playerId: id, fieldInnings: 0, benchInnings: 0, pitchInnings: 0, catchInnings: 0, positions: {} };
  }
  let lastGameRows: FairnessRow[] = [];
  for (const g of windowed) {
    const rows = summarize((g.lineup ?? []) as unknown as Inning[], playerIds);
    if (g === lastGame) lastGameRows = rows;
    for (const r of rows) {
      const a = agg[r.playerId];
      if (!a) continue;
      a.fieldInnings += r.fieldInnings;
      a.benchInnings += r.benchInnings;
      a.pitchInnings += r.pitchInnings;
      a.catchInnings += r.catchInnings;
      for (const [pos, n] of Object.entries(r.positions)) {
        a.positions[pos as keyof typeof a.positions] =
          (a.positions[pos as keyof typeof a.positions] ?? 0) + (n ?? 0);
      }
    }
  }
  const lastGameById: Record<string, FairnessRow> = {};
  for (const r of lastGameRows) lastGameById[r.playerId] = r;

  // Roster mean field innings for the "playing less than most" signal.
  const fieldVals = playerIds.map((id) => agg[id]?.fieldInnings ?? 0);
  const meanField = fieldVals.length ? fieldVals.reduce((s, v) => s + v, 0) / fieldVals.length : 0;

  // Group quick-tags by player.
  const tagsByPlayer: Record<string, MemoryTag[]> = {};
  const teamCounts: Record<string, number> = {};
  for (const t of input.tags) {
    const def = quickTagDef(t.code);
    if (!def) continue;
    if (t.playerId) {
      (tagsByPlayer[t.playerId] ??= []).push(t);
    }
    // Recurring-mistake roll-up counts every watch-tone tag (player or team).
    if (def.tone === "watch") teamCounts[t.code] = (teamCounts[t.code] ?? 0) + 1;
  }

  const players: PlayerMemory[] = input.players.map((p) => {
    const needs: MemorySignal[] = [];
    const strengths: MemorySignal[] = [];
    const a = agg[p.id] ?? { playerId: p.id, fieldInnings: 0, benchInnings: 0, pitchInnings: 0, catchInnings: 0, positions: {} };

    // 1. Injury overrides everything.
    if (p.injured) {
      needs.push({
        kind: "injured",
        tone: "danger",
        label: "Injured",
        detail: p.injuryNote?.trim() || "On the injury list. Clear before full reps.",
      });
    }

    // 2. Arm-care: pitched/caught in the most recent game.
    const lastPitches = lastGame?.pitchCounts?.[p.id]?.pitches ?? 0;
    const lastCatch = lastGameById[p.id]?.catchInnings ?? 0;
    if (lastPitches > 0) {
      needs.push({
        kind: "arm_care",
        tone: "watch",
        label: "Pitched recently",
        detail: `Threw ${lastPitches} pitch${lastPitches === 1 ? "" : "es"} last game. Mind Pitch Smart rest.`,
      });
    } else if (lastCatch >= 3) {
      needs.push({
        kind: "arm_care",
        tone: "watch",
        label: "Caught recently",
        detail: `Caught ${lastCatch} innings last game. Watch the throwing load.`,
      });
    }

    // 3. Sat most of last game.
    const lg = lastGameById[p.id];
    if (lg && lg.benchInnings >= 2 && lg.benchInnings > lg.fieldInnings) {
      needs.push({
        kind: "sat_last_game",
        tone: "watch",
        label: "Sat last game",
        detail: `Benched ${lg.benchInnings} of ${lg.benchInnings + lg.fieldInnings} innings${lastGame?.opponent ? ` vs ${lastGame.opponent}` : ""}. Get them going early.`,
      });
    }

    // 4. Position development: only outfield / needs infield reps.
    const ifReps = Array.from(INFIELD_DIRT).reduce((s, pos) => s + (a.positions[pos as keyof typeof a.positions] ?? 0), 0);
    const ofReps = Array.from(OUTFIELD).reduce((s, pos) => s + (a.positions[pos as keyof typeof a.positions] ?? 0), 0);
    if (a.fieldInnings > 0 && ofReps > 0 && ifReps === 0) {
      needs.push({
        kind: "only_outfield",
        tone: "watch",
        label: "Only outfield",
        detail: `${ofReps} OF innings, 0 infield over the last ${windowed.length} games. Rotate in some infield.`,
      });
    } else if (a.fieldInnings >= 4 && ifReps <= 1 && !p.canCatch) {
      needs.push({
        kind: "needs_infield_reps",
        tone: "watch",
        label: "Needs infield reps",
        detail: `Only ${ifReps} infield inning${ifReps === 1 ? "" : "s"} lately. Give them some dirt time.`,
      });
    }

    // 5. Playing less than most (fairness-derived development need).
    if (meanField >= 2 && a.fieldInnings < meanField * 0.7) {
      needs.push({
        kind: "low_playing_time",
        tone: "watch",
        label: "Playing less than most",
        detail: `${a.fieldInnings} field innings vs a team average of ${meanField.toFixed(1)}.`,
      });
    }

    // 6. Quick-tag derived signals (skill, effort, confidence, attendance).
    const ptags = tagsByPlayer[p.id] ?? [];
    const seenCodes = new Set<string>();
    for (const t of ptags) {
      if (seenCodes.has(t.code)) continue;
      seenCodes.add(t.code);
      const def = quickTagDef(t.code);
      if (!def) continue;
      const count = ptags.filter((x) => x.code === t.code).length;
      const tone = toneFromTag(def.tone);
      const detail = def.need ? `${def.need}${count > 1 ? ` · tagged ${count}×` : ""}` : undefined;
      const sig: MemorySignal = {
        kind:
          def.code === "needs_confidence"
            ? "needs_confidence"
            : def.code === "missed_practice"
              ? "missed_practice"
              : def.tone === "watch"
                ? "skill_watch"
                : `tag_${def.code}`,
        tone,
        label: def.label,
        detail,
      };
      if (tone === "positive") strengths.push(sig);
      else needs.push(sig);
    }

    // 7. Missed practices (from scheduled-plan attendance).
    const absences = input.practiceAbsencesByPlayer?.[p.id] ?? 0;
    if (absences > 0 && !seenCodes.has("missed_practice")) {
      needs.push({
        kind: "missed_practice",
        tone: "neutral",
        label: "Missed practice",
        detail: `Missed ${absences} recent practice${absences === 1 ? "" : "s"}. May need catch-up reps.`,
      });
    }

    // Order needs by urgency; pick the single top need.
    needs.sort((x, y) => (KIND_RANK[x.kind] ?? 50) - (KIND_RANK[y.kind] ?? 50));
    const watchCount = needs.filter((n) => n.tone === "watch" || n.tone === "danger").length;

    return {
      playerId: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      needs,
      strengths,
      topNeed: needs[0],
      watchCount,
    };
  });

  // Recurring team mistakes — most-tagged watch signals first.
  const team: TeamMemorySignal[] = Object.entries(teamCounts)
    .map(([code, count]) => {
      const def = quickTagDef(code);
      return {
        code,
        label: def?.priority ?? def?.label ?? code,
        count,
        focus: def?.focus,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { players, team, windowGames, playedGames: windowed.length };
}
