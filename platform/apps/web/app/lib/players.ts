// Player helpers — age band derivation + sorting.

import type { GameRecord, PlayerRecord } from "@platform/storage";
import { canPitchToday } from "@platform/safety";

const BAND_BOUNDARIES: Array<{ max: number; band: PlayerRecord["ageBand"] }> = [
  { max: 8, band: "6-8" },
  { max: 12, band: "9-12" },
  { max: 15, band: "13-15" },
  { max: 99, band: "16+" },
];

export function ageFromDob(dob: string, on: Date = new Date()): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  let age = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) age -= 1;
  return age;
}

export function bandFromAge(age: number): PlayerRecord["ageBand"] {
  for (const b of BAND_BOUNDARIES) if (age <= b.max) return b.band;
  return "16+";
}

export function bandFromDob(dob: string | undefined, fallback: PlayerRecord["ageBand"]): PlayerRecord["ageBand"] {
  if (!dob) return fallback;
  const a = ageFromDob(dob);
  return a > 0 ? bandFromAge(a) : fallback;
}

/** Sort by jersey then last name. */
export function sortRoster(players: PlayerRecord[]): PlayerRecord[] {
  return [...players].sort((a, b) => {
    const an = Number(a.jerseyNumber);
    const bn = Number(b.jerseyNumber);
    const aHasNum = !Number.isNaN(an) && a.jerseyNumber;
    const bHasNum = !Number.isNaN(bn) && b.jerseyNumber;
    if (aHasNum && bHasNum) return an - bn;
    if (aHasNum) return -1;
    if (bHasNum) return 1;
    return a.lastName.localeCompare(b.lastName);
  });
}

export function fullName(p: Pick<PlayerRecord, "firstName" | "lastName">): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

function ageBandCenter(band: PlayerRecord["ageBand"]): number {
  if (band === "6-8") return 8;
  if (band === "9-12") return 11;
  if (band === "13-15") return 14;
  return 16;
}

export type CapabilityTone = "ok" | "info" | "warn" | "danger";

export interface CapabilityBadge {
  label: string;
  tone: CapabilityTone;
  /** Longer explanation, surfaced as a tooltip / title attribute. */
  title?: string;
}

const TONE_CLASS: Record<CapabilityTone, string> = {
  ok: "badge-ok",
  info: "badge-info",
  warn: "badge-warn",
  danger: "badge-danger",
};

export function capabilityBadgeClass(tone: CapabilityTone): string {
  return TONE_CLASS[tone];
}

/**
 * Compute the capability badges for a player card. Manual flags (`canPitch`,
 * `canCatch`, `injured`) are the baseline; the `Can pitch` badge is then
 * upgraded/downgraded automatically against the Pitch Smart rest gate using the
 * player's outing history pulled from `games[].pitchCounts`.
 */
export function playerCapabilityBadges(
  player: PlayerRecord,
  opts: { games?: GameRecord[]; today?: Date } = {},
): CapabilityBadge[] {
  const today = opts.today ?? new Date();
  const games = opts.games ?? [];
  const badges: CapabilityBadge[] = [];

  if (player.injured) {
    badges.push({
      label: "Injured",
      tone: "danger",
      title: player.injuryNote ? `Injured — ${player.injuryNote}` : "Marked injured by a coach.",
    });
  }

  if (player.canPitch) {
    const age = player.dob ? ageFromDob(player.dob, today) : ageBandCenter(player.ageBand);
    const outingsByDate: Record<string, number> = {};
    for (const g of games) {
      const entry = g.pitchCounts?.[player.id];
      if (!entry?.pitches) continue;
      const day = (g.startsAt ?? "").slice(0, 10);
      if (!day) continue;
      outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
    }
    const check = canPitchToday({
      age,
      date: today,
      plannedPitches: 1,
      history: {
        outingsByDate,
        todayCount: 0,
        soreToday: false,
        todayCatchingInnings: 0,
        continuousThrowingDays: 0,
      },
    });
    if (!check.allowed && check.requiredRestDaysRemaining > 0) {
      const d = check.requiredRestDaysRemaining;
      badges.push({
        label: `Resting ${d}d`,
        tone: "warn",
        title:
          check.reasons[0] ??
          `Needs ${d} more rest day${d === 1 ? "" : "s"} before pitching (Pitch Smart).`,
      });
    } else if (!check.allowed) {
      badges.push({
        label: "Pitch: hold",
        tone: "warn",
        title: check.reasons[0] ?? "Not cleared to pitch today.",
      });
    } else {
      badges.push({ label: "Can pitch", tone: "info", title: "Eligible to pitch today." });
    }
  }

  if (player.canCatch) {
    badges.push({ label: "Can catch", tone: "info" });
  }

  return badges;
}

/**
 * True when a pitcher is not cleared to pitch today (resting / hold per Pitch
 * Smart). Used by the grouping engine to steer recently-used arms toward
 * lower-volume stations. Catchers (canCatch) are always treated as carrying
 * load on a high-throwing day as a conservative default.
 */
export function playerHasHighThrowingLoad(
  player: PlayerRecord,
  games: GameRecord[],
  today: Date = new Date(),
): boolean {
  if (!player.canPitch) return false;
  const age = player.dob ? ageFromDob(player.dob, today) : ageBandCenter(player.ageBand);
  const outingsByDate: Record<string, number> = {};
  for (const g of games) {
    const entry = g.pitchCounts?.[player.id];
    if (!entry?.pitches) continue;
    const day = (g.startsAt ?? "").slice(0, 10);
    if (!day) continue;
    outingsByDate[day] = (outingsByDate[day] ?? 0) + entry.pitches;
  }
  const check = canPitchToday({
    age,
    date: today,
    plannedPitches: 1,
    history: {
      outingsByDate,
      todayCount: 0,
      soreToday: false,
      todayCatchingInnings: 0,
      continuousThrowingDays: 0,
    },
  });
  return !check.allowed;
}

