// E12.3 — Player Grouping Engine (coach-platform-practice-compiler.md §5).
// Auto-creates practice groups intelligently, not randomly. Pure functions,
// no I/O. Six modes: balanced, skill, position, buddy, safety, competition.
//
// The marquee feature is *workload awareness*: a player who pitched or caught
// recently is steered away from high-volume throwing stations (core §12 /
// Pitch Smart), and that reasoning is surfaced to the coach as a note — the
// detail that earns trust.

export type GroupMode = "balanced" | "skill" | "position" | "buddy" | "safety" | "competition";

export type GroupPositionBucket = "battery" | "infield" | "outfield" | "utility";

export interface GroupingPlayer {
  id: string;
  name: string;
  /** 1 (developing) – 5 (elite). Missing → treated as 3 (average). */
  skill?: number;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  /** True when the player pitched/caught recently and should avoid high-volume throwing. */
  highThrowingLoad?: boolean;
  /** Primary position bucket for position-mode grouping. */
  positionBucket?: GroupPositionBucket;
}

export interface PracticeGroup {
  /** 1-based group label, e.g. "Group 1". */
  label: string;
  players: GroupingPlayer[];
  /** Average skill of the group, 1 decimal. */
  averageSkill: number;
  /** Coach-facing notes, e.g. workload steering or station guidance. */
  notes: string[];
}

export interface GroupingInput {
  players: GroupingPlayer[];
  /** Desired number of groups. Clamped to 1..players.length. */
  groupCount: number;
  mode: GroupMode;
}

export interface GroupingResult {
  mode: GroupMode;
  groups: PracticeGroup[];
  /** Plan-level notes (e.g. "2 players carry high throwing load today"). */
  notes: string[];
}

function skillOf(p: GroupingPlayer): number {
  const s = p.skill;
  return typeof s === "number" && Number.isFinite(s) ? Math.max(1, Math.min(5, s)) : 3;
}

function clampGroupCount(requested: number, playerCount: number): number {
  if (playerCount === 0) return 1;
  const n = Math.floor(Number(requested) || 1);
  return Math.max(1, Math.min(n, playerCount));
}

function emptyGroups(count: number): GroupingPlayer[][] {
  return Array.from({ length: count }, () => []);
}

function finalize(mode: GroupMode, buckets: GroupingPlayer[][], planNotes: string[]): GroupingResult {
  const groups: PracticeGroup[] = buckets
    .filter((b) => b.length > 0)
    .map((players, i) => {
      const avg = players.reduce((s, p) => s + skillOf(p), 0) / players.length;
      const notes: string[] = [];
      const loaded = players.filter((p) => p.highThrowingLoad);
      if (loaded.length > 0) {
        notes.push(
          `${loaded.map((p) => p.name).join(", ")} ${
            loaded.length === 1 ? "carries" : "carry"
          } a high throwing load — keep this group at a lower-volume station today.`,
        );
      }
      return {
        label: `Group ${i + 1}`,
        players,
        averageSkill: Math.round(avg * 10) / 10,
        notes,
      };
    });
  return { mode, groups, notes: planNotes };
}

/**
 * Snake-draft a list (already sorted strongest→weakest) across N buckets so
 * each bucket ends up with balanced total skill: serpentine 0,1,2,2,1,0,...
 */
function draftEvenSkill(players: GroupingPlayer[], count: number): GroupingPlayer[][] {
  const sorted = [...players].sort((a, b) => skillOf(b) - skillOf(a));
  // Proper serpentine: walk index 0..n-1, n-1..0, repeating.
  const buckets = emptyGroups(count);
  let pos = 0;
  let step = 1;
  for (const p of sorted) {
    buckets[pos]!.push(p);
    if (count === 1) continue;
    pos += step;
    if (pos === count) {
      pos = count - 1;
      step = -1;
    } else if (pos < 0) {
      pos = 0;
      step = 1;
    }
  }
  return buckets;
}

/** Skill-based: contiguous tiers (strongest together) for differentiated instruction. */
function draftBySkillTier(players: GroupingPlayer[], count: number): GroupingPlayer[][] {
  const sorted = [...players].sort((a, b) => skillOf(b) - skillOf(a));
  const buckets = emptyGroups(count);
  const per = Math.ceil(sorted.length / count);
  sorted.forEach((p, i) => {
    const b = Math.min(count - 1, Math.floor(i / per));
    buckets[b]!.push(p);
  });
  return buckets;
}

/** Buddy: pair each stronger player with a newer one (round-robin by skill rank). */
function draftBuddy(players: GroupingPlayer[], count: number): GroupingPlayer[][] {
  const sorted = [...players].sort((a, b) => skillOf(b) - skillOf(a));
  const buckets = emptyGroups(count);
  const half = Math.ceil(sorted.length / 2);
  const strong = sorted.slice(0, half);
  const newer = sorted.slice(half).reverse(); // weakest paired with strongest
  let i = 0;
  for (const p of strong) buckets[i++ % count]!.push(p);
  i = 0;
  for (const p of newer) buckets[i++ % count]!.push(p);
  return buckets;
}

/** Position: bucket by battery / infield / outfield, padded to groupCount. */
function draftByPosition(players: GroupingPlayer[]): { buckets: GroupingPlayer[][]; labels: string[] } {
  const order: GroupPositionBucket[] = ["battery", "infield", "outfield", "utility"];
  const byBucket = new Map<GroupPositionBucket, GroupingPlayer[]>();
  for (const p of players) {
    const b = p.positionBucket ?? "utility";
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(p);
  }
  const buckets: GroupingPlayer[][] = [];
  const labels: string[] = [];
  for (const b of order) {
    const list = byBucket.get(b);
    if (list && list.length > 0) {
      buckets.push(list);
      labels.push(b);
    }
  }
  return { buckets, labels };
}

const POSITION_LABEL: Record<GroupPositionBucket, string> = {
  battery: "Pitchers & catchers",
  infield: "Infield",
  outfield: "Outfield",
  utility: "Utility",
};

export function groupPlayers(input: GroupingInput): GroupingResult {
  const active = input.players.filter((p) => !p.injured);
  const injured = input.players.filter((p) => p.injured);
  const count = clampGroupCount(input.groupCount, active.length);

  const planNotes: string[] = [];
  const loaded = active.filter((p) => p.highThrowingLoad);
  if (loaded.length > 0) {
    planNotes.push(
      `${loaded.length} ${loaded.length === 1 ? "player carries" : "players carry"} a high throwing load today — they are steered toward lower-volume stations.`,
    );
  }
  if (injured.length > 0) {
    planNotes.push(
      `${injured.map((p) => p.name).join(", ")} ${injured.length === 1 ? "is" : "are"} marked injured and left out of station groups — modify or rest.`,
    );
  }

  if (active.length === 0) {
    return { mode: input.mode, groups: [], notes: planNotes };
  }

  switch (input.mode) {
    case "position": {
      const { buckets, labels } = draftByPosition(active);
      const result = finalize("position", buckets, planNotes);
      // Re-label position groups by their bucket name instead of "Group N".
      result.groups.forEach((g, i) => {
        const bucket = labels[i] as GroupPositionBucket | undefined;
        if (bucket) {
          g.label = POSITION_LABEL[bucket];
          if (bucket === "battery") {
            g.notes.unshift("Battery group — favor a lower-volume throwing/command station per Pitch Smart.");
          }
        }
      });
      return result;
    }
    case "safety": {
      // Separate high-load (battery/recently-threw) players from the rest.
      const restGroupCount = Math.max(1, count - 1);
      const highLoad = active.filter((p) => p.highThrowingLoad || p.canPitch || p.canCatch);
      const others = active.filter((p) => !(p.highThrowingLoad || p.canPitch || p.canCatch));
      const buckets: GroupingPlayer[][] = [];
      if (highLoad.length > 0) buckets.push(highLoad);
      const restBuckets = draftEvenSkill(others, restGroupCount);
      buckets.push(...restBuckets);
      const result = finalize("safety", buckets, planNotes);
      if (highLoad.length > 0 && result.groups[0]) {
        result.groups[0]!.label = "Arm-care group";
        result.groups[0]!.notes.unshift(
          "Pitchers & catchers — assign the low-volume / recovery station (mobility, command, tee/contact). No high-rep throwing today.",
        );
      }
      return result;
    }
    case "skill":
      return finalize("skill", draftBySkillTier(active, count), planNotes);
    case "buddy":
      return finalize("buddy", draftBuddy(active, count), planNotes);
    case "competition":
    case "balanced":
    default:
      return finalize(input.mode, draftEvenSkill(active, count), planNotes);
  }
}

export const GROUP_MODE_LABEL: Record<GroupMode, string> = {
  balanced: "Balanced",
  skill: "Skill-based",
  position: "By position",
  buddy: "Buddy (pair up)",
  safety: "Arm-care safety",
  competition: "Fair competition",
};

export const GROUP_MODE_HINT: Record<GroupMode, string> = {
  balanced: "Even total skill across every station.",
  skill: "Group similar levels for differentiated instruction.",
  position: "Pitchers/catchers, infield, outfield.",
  buddy: "Pair stronger players with newer ones.",
  safety: "Pull pitchers/catchers to a low-volume station (Pitch Smart).",
  competition: "Fair, evenly-matched teams for challenges.",
};
