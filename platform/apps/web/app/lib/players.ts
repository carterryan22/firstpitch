// Player helpers — age band derivation + sorting.

import type { PlayerRecord } from "@platform/storage";

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
