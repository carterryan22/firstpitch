// E4.3 — GameChanger-style filtered CSV ingest.
// We accept the most common GameChanger column layout; missing columns yield warnings.

import { toRecords } from "./csv";
import { matchPlayer, type RosterPlayer } from "./nameMatch";

export interface GameStatRow {
  playerId: string | null;
  rawName: string;
  jersey?: string;
  date?: string;
  pa?: number;
  ab?: number;
  hits?: number;
  doubles?: number;
  triples?: number;
  hr?: number;
  bb?: number;
  k?: number;
  pitchesSeen?: number;
  rbi?: number;
  sb?: number;
  cs?: number;
}

export interface IngestReport {
  rows: GameStatRow[];
  unmatchedNames: string[];
  ambiguousNames: Array<{ rawName: string; candidates: Array<{ playerId: string; score: number }> }>;
  unknownColumns: string[];
  parsedRowCount: number;
}

const NUM_COLS: Array<keyof GameStatRow> = ["pa","ab","hits","doubles","triples","hr","bb","k","pitchesSeen","rbi","sb","cs"];

const ALIASES: Record<string, keyof GameStatRow | "name" | "jersey" | "date"> = {
  player: "name",
  name: "name",
  athlete: "name",
  number: "jersey",
  "#": "jersey",
  jersey: "jersey",
  date: "date",
  gamedate: "date",
  pa: "pa",
  plateappearances: "pa",
  ab: "ab",
  atbats: "ab",
  h: "hits",
  hits: "hits",
  "2b": "doubles",
  doubles: "doubles",
  "3b": "triples",
  triples: "triples",
  hr: "hr",
  homeruns: "hr",
  bb: "bb",
  walks: "bb",
  k: "k",
  so: "k",
  strikeouts: "k",
  rbi: "rbi",
  rbis: "rbi",
  sb: "sb",
  stolenbases: "sb",
  cs: "cs",
  pitchesseen: "pitchesSeen",
  pitches: "pitchesSeen",
};

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim();
  if (lower === "#") return "jersey";
  return lower.replace(/[^a-z0-9]/g, "");
}

export function ingestGameChangerCsv(csv: string, roster: RosterPlayer[]): IngestReport {
  const records = toRecords(csv);
  const rows: GameStatRow[] = [];
  const unmatched: string[] = [];
  const ambiguous: IngestReport["ambiguousNames"] = [];
  const unknownCols = new Set<string>();

  if (records.length === 0) {
    return { rows, unmatchedNames: [], ambiguousNames: [], unknownColumns: [], parsedRowCount: 0 };
  }

  const sampleKeys = Object.keys(records[0]!);
  const colMap = new Map<string, keyof GameStatRow | "name" | "jersey" | "date">();
  for (const k of sampleKeys) {
    const norm = normalizeHeader(k);
    const mapped = ALIASES[norm];
    if (mapped) colMap.set(k, mapped);
    else unknownCols.add(k);
  }

  for (const rec of records) {
    const row: GameStatRow = { playerId: null, rawName: "" };
    let name = "";
    let jersey: string | undefined;
    let date: string | undefined;

    for (const [k, target] of colMap) {
      const raw = rec[k];
      if (raw === undefined || raw === "") continue;
      if (target === "name") name = raw;
      else if (target === "jersey") jersey = raw;
      else if (target === "date") date = raw;
      else if (NUM_COLS.includes(target as keyof GameStatRow)) {
        const n = Number(raw);
        if (!Number.isNaN(n)) (row as unknown as Record<string, unknown>)[target] = n;
      }
    }

    row.rawName = name;
    if (jersey) row.jersey = jersey;
    if (date) row.date = date;

    if (!name) continue;
    const match = matchPlayer(name, roster, jersey);
    if (match.ambiguous) {
      ambiguous.push({ rawName: name, candidates: match.candidates });
    } else if (!match.playerId) {
      unmatched.push(name);
    } else {
      row.playerId = match.playerId;
    }
    rows.push(row);
  }

  return {
    rows,
    unmatchedNames: Array.from(new Set(unmatched)),
    ambiguousNames: ambiguous,
    unknownColumns: Array.from(unknownCols),
    parsedRowCount: records.length,
  };
}

export interface ParsedRosterPlayer {
  firstName: string;
  lastName: string;
  jerseyNumber?: string;
}

/** Split a GameChanger name cell into first/last, handling "Last, First". */
export function splitPlayerName(raw: string): { firstName: string; lastName: string } {
  const s = raw.trim();
  if (!s) return { firstName: "", lastName: "" };
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((x) => x.trim());
    return { firstName: first ?? "", lastName: last ?? "" };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

/**
 * Extract a de-duplicated roster (name + jersey) from a GameChanger filtered
 * CSV, so a coach can bootstrap a brand-new team straight from an export.
 */
export function rosterFromGameChangerCsv(csv: string): ParsedRosterPlayer[] {
  const { rows } = ingestGameChangerCsv(csv, []);
  const seen = new Set<string>();
  const out: ParsedRosterPlayer[] = [];
  for (const row of rows) {
    const name = row.rawName.trim();
    if (!name) continue;
    const { firstName, lastName } = splitPlayerName(name);
    if (!firstName && !lastName) continue;
    const key = `${firstName}|${lastName}|${row.jersey ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ firstName, lastName, jerseyNumber: row.jersey });
  }
  return out;
}
