/**
 * GameChanger CSV parser.
 *
 * Accepts a pasted CSV string (or TSV) exported from GameChanger. Detects the
 * stat block (batting / pitching / fielding) by inspecting headers, normalizes
 * column names, and matches rows back to roster players by (number, last,
 * first). Returns per-player parsed stats ready to upsert as
 * `PlayerGameStatsRecord` rows.
 *
 * Robust to:
 *  - Tabs or commas as separator (auto-detected)
 *  - Quoted cells with embedded commas
 *  - Header casing / whitespace
 *  - "-" / "" / "." for blank numeric cells
 *  - Players in any order; trailing "Team" / "Totals" rows skipped
 */

import type {
  PlayerGameBattingStats,
  PlayerGameFieldingStats,
  PlayerGamePitchingStats,
  Position,
} from "@platform/storage";

export type GcBlockKind = "batting" | "pitching" | "fielding" | "unknown";

export interface RosterLite {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: string;
}

export interface ParsedPlayerRow {
  playerId?: string;     // resolved against roster
  match: "exact" | "fuzzy" | "unmatched";
  raw: {
    number?: string;
    last?: string;
    first?: string;
  };
  batting?: PlayerGameBattingStats;
  pitching?: PlayerGamePitchingStats;
  fielding?: PlayerGameFieldingStats[];
}

export interface ParseGameChangerResult {
  kind: GcBlockKind;
  rows: ParsedPlayerRow[];
  unmatched: ParsedPlayerRow[];
  warnings: string[];
}

// ───────────────────── tokenization ─────────────────────

function detectSeparator(line: string): "\t" | "," {
  const t = (line.match(/\t/g) ?? []).length;
  const c = (line.match(/,/g) ?? []).length;
  return t > c ? "\t" : ",";
}

function splitCsvLine(line: string, sep: "\t" | ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === sep && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim();
  if (v === "" || v === "-" || v === "." || v === "—") return undefined;
  // Strip trailing %
  const cleaned = v.replace(/%$/, "").replace(/^\./, "0.");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  // % values become 0-1 if header looked like a percentage
  return n;
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s/]+/g, "");
}

// ───────────────────── kind detection ─────────────────────

const BATTING_MARKERS = ["pa", "ab", "obp", "slg", "ops", "avg", "qab", "rbi"];
const PITCHING_MARKERS = ["ip", "era", "whip", "bf", "#p", "p/ip", "p/bf", "baa"];
const FIELDING_MARKERS = ["po", "fpct", "tc", "pb"];

function detectKind(headers: string[]): GcBlockKind {
  const set = new Set(headers.map(normHeader));
  const batting = BATTING_MARKERS.filter((m) => set.has(m)).length;
  const pitching = PITCHING_MARKERS.filter((m) => set.has(m)).length;
  const fielding = FIELDING_MARKERS.filter((m) => set.has(m)).length;
  const max = Math.max(batting, pitching, fielding);
  if (max < 2) return "unknown";
  if (max === pitching) return "pitching";
  if (max === fielding && fielding > batting) return "fielding";
  return "batting";
}

// ───────────────────── header → field maps ─────────────────────

const BATTING_MAP: Record<string, keyof PlayerGameBattingStats> = {
  pa: "pa", ab: "ab", h: "h", r: "r", rbi: "rbi", bb: "bb",
  so: "so", k: "so", kl: "kLooking", hbp: "hbp",
  "1b": "1b", "2b": "2b", "3b": "3b", hr: "hr",
  sac: "sac", sf: "sf", roe: "roe", fc: "fc",
  sb: "sb", cs: "cs", qab: "qab", ps: "ps", lob: "lob",
  "2outrbi": "twoOutRbi",
  avg: "avg", obp: "obp", slg: "slg", ops: "ops",
  "qab%": "qabPct", "c%": "contactPct", bbk: "bbPerK",
};

const PITCHING_MAP: Record<string, keyof PlayerGamePitchingStats> = {
  ip: "ip", bf: "bf", "#p": "pitches", p: "pitches",
  h: "h", r: "r", er: "er", bb: "bb", so: "so", k: "so",
  hbp: "hbp", wp: "wp", bk: "bk", hr: "hr",
  era: "era", whip: "whip", baa: "baa",
  pip: "pitchesPerInning", pbf: "pitchesPerBatter",
};

// ───────────────────── roster matching ─────────────────────

function matchPlayer(
  roster: RosterLite[],
  raw: { number?: string; last?: string; first?: string },
): { id?: string; match: ParsedPlayerRow["match"] } {
  const num = (raw.number ?? "").replace(/^#/, "").trim();
  const last = (raw.last ?? "").trim().toLowerCase();
  const first = (raw.first ?? "").trim().toLowerCase();

  // Exact: jersey + last name
  if (num && last) {
    const found = roster.find(
      (p) => (p.jerseyNumber ?? "") === num && p.lastName.toLowerCase() === last,
    );
    if (found) return { id: found.id, match: "exact" };
  }
  // First + last exact
  if (first && last) {
    const found = roster.find(
      (p) =>
        p.lastName.toLowerCase() === last &&
        p.firstName.toLowerCase() === first,
    );
    if (found) return { id: found.id, match: "exact" };
  }
  // Jersey-only
  if (num) {
    const found = roster.find((p) => (p.jerseyNumber ?? "") === num);
    if (found) return { id: found.id, match: "fuzzy" };
  }
  // Last-name only (only useful when unique)
  if (last) {
    const found = roster.filter((p) => p.lastName.toLowerCase() === last);
    if (found.length === 1 && found[0]) return { id: found[0].id, match: "fuzzy" };
  }
  return { id: undefined, match: "unmatched" };
}

// ───────────────────── identity column detection ─────────────────────

function findIdentityCols(headers: string[]): { number?: number; last?: number; first?: number; name?: number } {
  let number: number | undefined;
  let last: number | undefined;
  let first: number | undefined;
  let name: number | undefined;
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (n === "number" || n === "#" || n === "jersey" || n === "no") number = i;
    else if (n === "last" || n === "lastname") last = i;
    else if (n === "first" || n === "firstname") first = i;
    else if (n === "player" || n === "name" || n === "playername") name = i;
  });
  return { number, last, first, name };
}

function splitName(raw: string): { first?: string; last?: string } {
  const s = raw.trim();
  if (!s) return {};
  if (s.includes(",")) {
    const parts = s.split(",").map((x) => x.trim());
    return { first: parts[1], last: parts[0] };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { last: parts[0] };
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  return { first, last };
}

// ───────────────────── main parser ─────────────────────

export function parseGameChangerCsv(
  csv: string,
  roster: RosterLite[],
): ParseGameChangerResult {
  const warnings: string[] = [];
  const lines = csv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { kind: "unknown", rows: [], unmatched: [], warnings: ["No data rows found."] };
  }
  const sep = detectSeparator(lines[0] ?? "");
  const headers = splitCsvLine(lines[0] ?? "", sep);
  const kind = detectKind(headers);
  if (kind === "unknown") {
    warnings.push("Could not detect batting/pitching/fielding block — header markers not recognized.");
  }
  const ids = findIdentityCols(headers);

  const rows: ParsedPlayerRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const cols = splitCsvLine(line, sep);
    if (cols.length < 2) continue;
    // Identity
    let raw: { number?: string; last?: string; first?: string } = {};
    if (ids.number !== undefined) raw.number = cols[ids.number];
    if (ids.last !== undefined) raw.last = cols[ids.last];
    if (ids.first !== undefined) raw.first = cols[ids.first];
    if (!raw.last && !raw.first && ids.name !== undefined) {
      Object.assign(raw, splitName(cols[ids.name] ?? ""));
    }
    // Skip totals / blank
    const lastLower = (raw.last ?? "").toLowerCase();
    if (!raw.last && !raw.first && !raw.number) continue;
    if (["totals", "total", "team"].includes(lastLower)) continue;

    const { id, match } = matchPlayer(roster, raw);
    const row: ParsedPlayerRow = { playerId: id, match, raw };

    if (kind === "batting") {
      const b: PlayerGameBattingStats = {};
      headers.forEach((h, i) => {
        const field = BATTING_MAP[normHeader(h)];
        if (!field) return;
        const v = toNumber(cols[i]);
        if (v !== undefined) (b as Record<string, number>)[field as string] = v;
      });
      if (Object.keys(b).length > 0) row.batting = b;
    } else if (kind === "pitching") {
      const p: PlayerGamePitchingStats = {};
      headers.forEach((h, i) => {
        const field = PITCHING_MAP[normHeader(h)];
        if (!field) return;
        const v = toNumber(cols[i]);
        if (v !== undefined) (p as Record<string, number>)[field as string] = v;
      });
      if (Object.keys(p).length > 0) row.pitching = p;
    } else if (kind === "fielding") {
      // Fielding block from GC is one row per player aggregated; we treat the
      // whole row as a single "position-agnostic" fielding entry. If a POS
      // column exists, we honor it.
      const posIdx = headers.findIndex((h) => normHeader(h) === "pos" || normHeader(h) === "position");
      const pos = posIdx >= 0 ? (cols[posIdx] || "").toUpperCase() as Position : ("" as Position);
      const fld: PlayerGameFieldingStats = { position: pos || ("UTL" as Position) };
      const innIdx = headers.findIndex((h) => normHeader(h) === "ip" || normHeader(h) === "inn");
      if (innIdx >= 0) fld.innings = toNumber(cols[innIdx]);
      const map: Array<[string, keyof PlayerGameFieldingStats]> = [
        ["gp", "gs"], ["gs", "gs"], ["tc", "tc"], ["po", "po"], ["a", "a"],
        ["e", "e"], ["dp", "dp"], ["tp", "tp"], ["fpct", "fpct"],
        ["pb", "pb"], ["sb", "sbAgainst"], ["cs", "cs"], ["cs%", "csPct"],
      ];
      for (const [h, field] of map) {
        const i = headers.findIndex((hd) => normHeader(hd) === h);
        if (i >= 0) {
          const v = toNumber(cols[i]);
          if (v !== undefined) {
            (fld as unknown as Record<string, number | string>)[field as string] = v;
          }
        }
      }
      row.fielding = [fld];
    }
    rows.push(row);
  }

  const unmatched = rows.filter((r) => r.match === "unmatched");
  if (unmatched.length > 0) {
    warnings.push(`${unmatched.length} row${unmatched.length === 1 ? "" : "s"} did not match any roster player.`);
  }
  return { kind, rows, unmatched, warnings };
}
