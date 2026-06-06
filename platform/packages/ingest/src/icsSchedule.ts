// E16.5 — GameChanger (and generic) calendar ICS schedule import + reconcile.
// Pure functions; no I/O. Caller hands us raw .ics text + the team's existing games.

/** Mirrors @platform/storage HomeAway; redefined here so @platform/ingest stays dependency-free. */
export type HomeAway = "home" | "away";

/** A single VEVENT reduced to the fields we care about for scheduling. */
export interface ParsedScheduleGame {
  /** Stable UID from the source calendar; used to reconcile re-imports. */
  uid: string;
  /** Best-effort opponent name parsed from the SUMMARY. */
  opponent: string;
  /** ISO datetime of first pitch. */
  startsAt: string;
  venue?: string;
  homeAway: HomeAway;
  /** Original SUMMARY text, for display. */
  summary: string;
}

/** Minimal shape of an existing game needed to reconcile against an import. */
export interface ExistingGameForDiff {
  id: string;
  sourceUid?: string;
  opponent: string;
  startsAt: string;
  venue?: string;
  homeAway: HomeAway;
}

export interface ScheduleDiff {
  /** Events in the feed with no matching existing game. */
  created: ParsedScheduleGame[];
  /** Events whose existing game differs (time/opponent/venue/home-away). */
  updated: Array<{ existingId: string; before: ExistingGameForDiff; after: ParsedScheduleGame }>;
  /** Events whose existing game already matches exactly. */
  unchanged: Array<{ existingId: string; game: ParsedScheduleGame }>;
  /**
   * Previously-imported games (have a sourceUid) that are no longer present in
   * the feed. Manually-created games (no sourceUid) are never reported here.
   */
  detached: ExistingGameForDiff[];
}

/** Unfold RFC-5545 folded lines: a CRLF followed by a space/tab continues the previous line. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split "DTSTART;TZID=America/New_York:20260601T180000" into {name, params, value}. */
function parseContentLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const segments = left.split(";");
  const name = (segments.shift() ?? "").toUpperCase();
  const params: Record<string, string> = {};
  for (const seg of segments) {
    const eq = seg.indexOf("=");
    if (eq === -1) continue;
    params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1);
  }
  return { name, params, value };
}

/** Unescape RFC-5545 TEXT values (\, \; \\ \n). */
function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Convert an ICS DATE / DATE-TIME value to an ISO string.
 * Handles `YYYYMMDDTHHMMSSZ` (UTC), floating `YYYYMMDDTHHMMSS` (treated as UTC),
 * and all-day `YYYYMMDD` (midnight UTC). TZID params are not resolved (no tz db);
 * floating/zoned times are interpreted as UTC, which is acceptable for display + diffing.
 */
export function parseIcsDate(value: string): string | null {
  const v = value.trim();
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v);
  if (dateTime) {
    const [, y, mo, d, h, mi, s] = dateTime;
    const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    const iso = `${y}-${mo}-${d}T00:00:00Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  // Last resort: let Date try (handles already-ISO values some exporters emit).
  const fallback = new Date(v);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

/**
 * Parse "Us @ Them" / "Us vs Them" style summaries into an opponent + home/away.
 * GameChanger emits e.g. "Wildcats @ Riverhawks" (away) or "Wildcats vs Riverhawks" (home).
 * `teamName` (when provided) is stripped from the matched side so we keep only the opponent.
 */
export function parseScheduleSummary(
  summary: string,
  teamName?: string,
): { opponent: string; homeAway: HomeAway } {
  const text = summary.trim();
  const norm = (s: string) => s.trim().toLowerCase();
  const stripTeam = (side: string, other: string): string => {
    if (teamName) {
      if (norm(side) === norm(teamName)) return other.trim();
      if (norm(other) === norm(teamName)) return side.trim();
    }
    return other.trim() || side.trim();
  };

  // "@" means our team is on the road → away.
  const at = /\s+@\s+|\s+at\s+/i.exec(text);
  if (at) {
    const left = text.slice(0, at.index);
    const right = text.slice(at.index + at[0].length);
    return { opponent: stripTeam(left, right), homeAway: "away" };
  }
  // "vs" / "vs." / "versus" means home.
  const vs = /\s+vs\.?\s+|\s+versus\s+/i.exec(text);
  if (vs) {
    const left = text.slice(0, vs.index);
    const right = text.slice(vs.index + vs[0].length);
    return { opponent: stripTeam(left, right), homeAway: "home" };
  }
  return { opponent: text, homeAway: "home" };
}

/**
 * Parse raw ICS text into schedule games. Only VEVENTs that carry a DTSTART are
 * returned. Events whose SUMMARY clearly marks them as practices are skipped.
 */
export function gameChangerScheduleFromIcs(icsText: string, teamName?: string): ParsedScheduleGame[] {
  const lines = unfold(icsText);
  const games: ParsedScheduleGame[] = [];
  let inEvent = false;
  let cur: { uid?: string; summary?: string; start?: string; location?: string } = {};

  for (const line of lines) {
    const cl = parseContentLine(line);
    if (!cl) continue;
    if (cl.name === "BEGIN" && cl.value.toUpperCase() === "VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (cl.name === "END" && cl.value.toUpperCase() === "VEVENT") {
      inEvent = false;
      if (cur.start) {
        const startsAt = parseIcsDate(cur.start);
        const summary = cur.summary ? unescapeText(cur.summary) : "Game";
        const isPractice = /practice|workout|training/i.test(summary);
        if (startsAt && !isPractice) {
          const { opponent, homeAway } = parseScheduleSummary(summary, teamName);
          games.push({
            uid: (cur.uid && cur.uid.trim()) || `ics-${startsAt}-${summary}`,
            opponent: opponent || "Opponent",
            startsAt,
            venue: cur.location ? unescapeText(cur.location) : undefined,
            homeAway,
            summary,
          });
        }
      }
      cur = {};
      continue;
    }
    if (!inEvent) continue;
    switch (cl.name) {
      case "UID":
        cur.uid = cl.value;
        break;
      case "SUMMARY":
        cur.summary = cl.value;
        break;
      case "DTSTART":
        cur.start = cl.value;
        break;
      case "LOCATION":
        cur.location = cl.value;
        break;
      default:
        break;
    }
  }
  return games;
}

/** True when an existing game already matches a parsed event (ignores seconds drift). */
function isSameGame(existing: ExistingGameForDiff, parsed: ParsedScheduleGame): boolean {
  const sameTime =
    new Date(existing.startsAt).getTime() === new Date(parsed.startsAt).getTime();
  return (
    sameTime &&
    existing.opponent.trim().toLowerCase() === parsed.opponent.trim().toLowerCase() &&
    (existing.venue ?? "").trim() === (parsed.venue ?? "").trim() &&
    existing.homeAway === parsed.homeAway
  );
}

/**
 * Reconcile a parsed feed against existing games. Matching is by `sourceUid`.
 * Games without a `sourceUid` are treated as manually created and only ever
 * appear in `detached` calculations when... never (they're left untouched).
 */
export function diffSchedule(
  existing: ExistingGameForDiff[],
  parsed: ParsedScheduleGame[],
): ScheduleDiff {
  const byUid = new Map<string, ExistingGameForDiff>();
  for (const g of existing) {
    if (g.sourceUid) byUid.set(g.sourceUid, g);
  }
  const seenUids = new Set<string>();
  const diff: ScheduleDiff = { created: [], updated: [], unchanged: [], detached: [] };

  for (const p of parsed) {
    seenUids.add(p.uid);
    const match = byUid.get(p.uid);
    if (!match) {
      diff.created.push(p);
    } else if (isSameGame(match, p)) {
      diff.unchanged.push({ existingId: match.id, game: p });
    } else {
      diff.updated.push({ existingId: match.id, before: match, after: p });
    }
  }

  for (const g of existing) {
    if (g.sourceUid && !seenUids.has(g.sourceUid)) {
      diff.detached.push(g);
    }
  }

  return diff;
}
