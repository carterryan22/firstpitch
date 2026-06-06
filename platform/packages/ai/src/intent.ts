// Plain-language intent parser. A coach (or any user) types something like
//   "I need a 60 min practice plan for u-10 select baseball"
// and we classify what they want + extract the parameters, then hand back a
// ready-to-use deep link the UI can route to.
//
// Two entry points:
//   - parseSearchIntent(query)        — deterministic, offline, zero-dependency.
//   - classifyIntent(provider, query) — refines the heuristic with an LLM when
//                                       one is configured; falls back to the
//                                       heuristic on any error or empty key.
//
// The LLM only ever returns *parameters* (never advice), so it stays well clear
// of the safety surface — the actual plan/answer is still generated through the
// rule-checked compile / coach-chat pipelines.

import { getAgeBandKeyForAge, type AgeBandKey } from "@platform/corpus";
import type { LLMProvider } from "./provider";

export type IntentKind =
  | "practice_plan"
  | "find_drills"
  | "build_lineup"
  | "coach_question"
  | "unknown";

export type EnvironmentTier = "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";

/** Skill focuses we recognize, aligned with drill topics + compiler focuses. */
export const INTENT_FOCUSES = [
  "hitting",
  "throwing",
  "fielding",
  "pitching",
  "speed",
  "baserunning",
  "catching",
  "reaction",
  "mental",
] as const;
export type IntentFocus = (typeof INTENT_FOCUSES)[number];

export interface IntentAction {
  label: string;
  href: string;
}

export interface SearchIntent {
  kind: IntentKind;
  confidence: "high" | "medium" | "low";
  /** Representative athlete age, when we could read one. */
  age?: number;
  ageBand?: AgeBandKey;
  durationMin?: number;
  focus: IntentFocus[];
  environmentTier?: EnvironmentTier;
  players?: number;
  /** Free-text level if mentioned (select, travel, rec, ...). */
  level?: string;
  /** A short, human echo of what we understood. */
  summary: string;
  /** Where the UI should send the user, plus a button label. */
  action: IntentAction;
  rawQuery: string;
}

interface ExtractedParams {
  kind: IntentKind;
  age?: number;
  durationMin?: number;
  focus: IntentFocus[];
  environmentTier?: EnvironmentTier;
  players?: number;
  level?: string;
}

const FOCUS_KEYWORDS: Array<{ focus: IntentFocus; patterns: RegExp[] }> = [
  { focus: "hitting", patterns: [/\bhit(ting)?\b/, /\bbatt(ing|er)\b/, /\bswing/, /\btee\b/, /\bsoft\s*toss\b/, /\bbat\s*speed\b/] },
  { focus: "pitching", patterns: [/\bpitch(ing|er)\b/, /\bbullpen\b/, /\bmound\b/] },
  { focus: "throwing", patterns: [/\bthrow(ing|s)?\b/, /\barm\s*(care|work)\b/, /\blong\s*toss\b/] },
  { focus: "catching", patterns: [/\bcatch(ing)?\b/, /\bcatcher\b/, /\breceiving\b/] },
  { focus: "fielding", patterns: [/\bfield(ing)?\b/, /\bground\s*balls?\b/, /\bgrounders?\b/, /\binfield\b/, /\boutfield\b/, /\bdefen[cs]e\b/, /\bfly\s*balls?\b/] },
  { focus: "baserunning", patterns: [/\bbase\s*runn?ing\b/, /\bbase-?running\b/, /\bbaserunning\b/, /\bstealing\b/, /\brounding\b/] },
  { focus: "speed", patterns: [/\bspeed\b/, /\bsprint/, /\bspeed\s*work\b/, /\bquick(ness)?\b/, /\bagilit/] },
  { focus: "reaction", patterns: [/\breaction\b/, /\bhand[\s-]?eye\b/, /\breflex/] },
  { focus: "mental", patterns: [/\bmental\b/, /\bfocus\b/, /\bbreath(ing)?\b/, /\bmindset\b/] },
];

const ENV_KEYWORDS: Array<{ tier: EnvironmentTier; patterns: RegExp[] }> = [
  { tier: "T2_cage_gym", patterns: [/\bcage\b/, /\bbatting\s*cage\b/, /\bgym\b/, /\bindoor/] },
  { tier: "T4_living_room", patterns: [/\bliving\s*room\b/, /\bat\s*home\b/, /\bgarage\b/, /\bbasement\b/] },
  { tier: "T3_backyard", patterns: [/\bbackyard\b/, /\bback\s*yard\b/, /\byard\b/, /\bdriveway\b/, /\bpark\b/] },
  { tier: "T1_field", patterns: [/\bfield\b/, /\bdiamond\b/, /\bballpark\b/, /\boutdoor/] },
];

const LEVEL_KEYWORDS = ["select", "travel", "competitive", "comp", "rec", "recreational", "house", "all-star", "allstar", "tournament", "school", "varsity"];

function extractFocus(q: string): IntentFocus[] {
  const out: IntentFocus[] = [];
  for (const { focus, patterns } of FOCUS_KEYWORDS) {
    if (patterns.some((p) => p.test(q)) && !out.includes(focus)) out.push(focus);
  }
  return out;
}

function extractEnvironment(q: string): EnvironmentTier | undefined {
  for (const { tier, patterns } of ENV_KEYWORDS) {
    if (patterns.some((p) => p.test(q))) return tier;
  }
  return undefined;
}

function extractDuration(q: string): number | undefined {
  // "90 minutes" / "60 min" / "45m"
  const mins = q.match(/\b(\d{2,3})\s*(?:minutes?|mins?|m)\b/);
  if (mins) {
    const n = Number(mins[1]);
    if (n >= 10 && n <= 240) return n;
  }
  // "1.5 hours" / "2 hr" / "an hour"
  const hours = q.match(/\b(\d(?:\.\d)?)\s*(?:hours?|hrs?|h)\b/);
  if (hours) {
    const n = Math.round(Number(hours[1]) * 60);
    if (n >= 10 && n <= 240) return n;
  }
  if (/\bhour\s*and\s*a\s*half\b/.test(q)) return 90;
  if (/\bhalf\s*(an?\s*)?hour\b/.test(q)) return 30;
  if (/\ban?\s*hour\b/.test(q)) return 60;
  return undefined;
}

function clampAge(n: number): number {
  return Math.max(4, Math.min(18, Math.round(n)));
}

function extractAge(q: string): number | undefined {
  // "u-10" / "u10" / "10u" / "12u select"
  const u = q.match(/\bu-?(\d{1,2})\b/) ?? q.match(/\b(\d{1,2})\s*u\b/);
  if (u) {
    const n = Number(u[1]);
    // "Under N" — typical oldest players are N-1.
    if (n >= 5 && n <= 19) return clampAge(n - 1);
  }
  // "12 year old" / "12yo" / "age 12"
  const yo = q.match(/\b(\d{1,2})\s*(?:years?\s*old|yo|y\/o)\b/) ?? q.match(/\bage[ds]?\s*(\d{1,2})\b/);
  if (yo) {
    const n = Number(yo[1]);
    if (n >= 4 && n <= 18) return clampAge(n);
  }
  // "9-10 year olds" / "ages 9 to 10" — take the upper bound.
  const range = q.match(/\b(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\b(?!\s*(?:min|m\b))/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (lo >= 4 && hi <= 18 && hi >= lo) return clampAge(hi);
  }
  return undefined;
}

function extractPlayers(q: string): number | undefined {
  const m = q.match(/\b(\d{1,2})\s*(?:players|kids|athletes|boys|girls)\b/) ?? q.match(/\bteam\s*of\s*(\d{1,2})\b/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 40) return n;
  }
  return undefined;
}

function extractLevel(q: string): string | undefined {
  for (const lvl of LEVEL_KEYWORDS) {
    if (new RegExp(`\\b${lvl.replace("-", "[\\s-]?")}\\b`).test(q)) {
      if (lvl === "comp") return "competitive";
      if (lvl === "rec") return "recreational";
      if (lvl === "allstar") return "all-star";
      return lvl;
    }
  }
  return undefined;
}

function classifyKind(q: string, hasDuration: boolean): IntentKind {
  const score: Record<Exclude<IntentKind, "unknown">, number> = {
    practice_plan: 0,
    find_drills: 0,
    build_lineup: 0,
    coach_question: 0,
  };
  if (/\bpractice\b/.test(q)) score.practice_plan += 2;
  if (/\b(plan|session|workout|schedule|agenda|run\s*a\s*practice)\b/.test(q)) score.practice_plan += 2;
  if (hasDuration) score.practice_plan += 1;

  if (/\bdrills?\b/.test(q)) score.find_drills += 3;
  if (/\b(how\s*(do|to)\s*(i\s*)?teach|teach\s+(my|the)|exercise|show\s*me)\b/.test(q)) score.find_drills += 2;

  if (/\b(lineup|line-?up|batting\s*order|who\s*plays\s*where|fair\s*play|playing\s*time|positions?\b|field\s*the\s*team)\b/.test(q)) {
    score.build_lineup += 3;
  }

  if (/\?\s*$/.test(q)) score.coach_question += 1;
  if (/\b(how\s*many|can\s*(i|my|we)|is\s*it\s*ok|should\s*(i|we)|what'?s\s*the\s*rule|rest\s*days?|pitch\s*count|allowed\s*to)\b/.test(q)) {
    score.coach_question += 2;
  }

  let best: IntentKind = "unknown";
  let bestScore = 0;
  for (const k of Object.keys(score) as Array<Exclude<IntentKind, "unknown">>) {
    if (score[k] > bestScore) {
      bestScore = score[k];
      best = k;
    }
  }
  if (bestScore === 0) return /\?\s*$/.test(q) ? "coach_question" : "unknown";
  return best;
}

function extractParams(query: string): ExtractedParams {
  const q = query.toLowerCase();
  const durationMin = extractDuration(q);
  return {
    kind: classifyKind(q, durationMin !== undefined),
    age: extractAge(q),
    durationMin,
    focus: extractFocus(q),
    environmentTier: extractEnvironment(q),
    players: extractPlayers(q),
    level: extractLevel(q),
  };
}

function bandToRepAge(band: AgeBandKey): number {
  switch (band) {
    case "6-8":
      return 7;
    case "9-12":
      return 10;
    case "13-15":
      return 14;
    default:
      return 16;
  }
}

function buildAction(kind: IntentKind, p: ExtractedParams): IntentAction {
  const qs = new URLSearchParams();
  switch (kind) {
    case "practice_plan": {
      if (p.focus.length) qs.set("focus", p.focus.join(","));
      if (p.age !== undefined) qs.set("age", String(p.age));
      if (p.environmentTier) qs.set("env", p.environmentTier);
      if (p.durationMin !== undefined) qs.set("duration", String(p.durationMin));
      const query = qs.toString();
      return { label: "Build this practice plan", href: query ? `/practice/new?${query}` : "/practice/new" };
    }
    case "find_drills": {
      if (p.focus[0]) qs.set("topic", p.focus[0]);
      if (p.environmentTier) qs.set("tier", p.environmentTier);
      const query = qs.toString();
      return { label: "Browse matching drills", href: query ? `/drills?${query}` : "/drills" };
    }
    case "build_lineup":
      return { label: "Open your teams to build a lineup", href: "/coach" };
    case "coach_question":
      return { label: "Ask the coach assistant", href: "/coach/chat" };
    default:
      return { label: "Browse the drill library", href: "/drills" };
  }
}

const KIND_PHRASE: Record<IntentKind, string> = {
  practice_plan: "a practice plan",
  find_drills: "drills",
  build_lineup: "a lineup",
  coach_question: "an answer from the coach assistant",
  unknown: "what you need",
};

function buildSummary(kind: IntentKind, p: ExtractedParams, ageBand?: AgeBandKey): string {
  const bits: string[] = [];
  if (p.durationMin !== undefined && kind === "practice_plan") bits.push(`${p.durationMin} min`);
  if (p.age !== undefined) bits.push(`age ${p.age}${ageBand ? ` (${ageBand})` : ""}`);
  if (p.level) bits.push(p.level);
  if (p.focus.length) bits.push(`focus: ${p.focus.join(", ")}`);
  if (p.environmentTier) bits.push(ENV_LABEL[p.environmentTier]);
  if (p.players !== undefined) bits.push(`${p.players} players`);
  const detail = bits.length ? ` — ${bits.join(", ")}` : "";
  return `Looks like you want ${KIND_PHRASE[kind]}${detail}.`;
}

const ENV_LABEL: Record<EnvironmentTier, string> = {
  T1_field: "on a field",
  T2_cage_gym: "cage / gym",
  T3_backyard: "backyard",
  T4_living_room: "at home",
};

function finalizeIntent(p: ExtractedParams, rawQuery: string): SearchIntent {
  let ageBand: AgeBandKey | undefined;
  let age = p.age;
  if (age !== undefined) ageBand = getAgeBandKeyForAge(age) ?? undefined;

  // Confidence: clear intent + at least one concrete param = high.
  const paramCount =
    (p.age !== undefined ? 1 : 0) +
    (p.durationMin !== undefined ? 1 : 0) +
    p.focus.length +
    (p.environmentTier ? 1 : 0);
  let confidence: SearchIntent["confidence"] = "low";
  if (p.kind !== "unknown" && paramCount >= 2) confidence = "high";
  else if (p.kind !== "unknown") confidence = "medium";

  const params: ExtractedParams = { ...p, age };
  return {
    kind: p.kind,
    confidence,
    age,
    ageBand,
    durationMin: p.durationMin,
    focus: p.focus,
    environmentTier: p.environmentTier,
    players: p.players,
    level: p.level,
    summary: buildSummary(p.kind, params, ageBand),
    action: buildAction(p.kind, params),
    rawQuery,
  };
}

/** Deterministic, offline plain-text → intent. */
export function parseSearchIntent(query: string): SearchIntent {
  return finalizeIntent(extractParams(query), query);
}

const VALID_KINDS = new Set<IntentKind>(["practice_plan", "find_drills", "build_lineup", "coach_question", "unknown"]);
const VALID_TIERS = new Set<EnvironmentTier>(["T1_field", "T2_cage_gym", "T3_backyard", "T4_living_room"]);

interface LlmIntentShape {
  kind?: string;
  age?: number | null;
  durationMin?: number | null;
  focus?: string[] | null;
  environmentTier?: string | null;
  players?: number | null;
  level?: string | null;
}

function intentSystemPrompt(): string {
  return [
    "You extract structured search intent for a youth baseball coaching app.",
    "You ONLY classify and extract parameters — you never give coaching advice.",
    "Return STRICT JSON, no prose, with this shape:",
    "{",
    '  "kind": "practice_plan" | "find_drills" | "build_lineup" | "coach_question" | "unknown",',
    '  "age": number | null,            // representative athlete age (for "u-10" use 9)',
    '  "durationMin": number | null,    // practice length in minutes',
    `  "focus": string[],               // any of: ${INTENT_FOCUSES.join(", ")}`,
    '  "environmentTier": "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room" | null,',
    '  "players": number | null,',
    '  "level": string | null           // e.g. select, travel, rec',
    "}",
    "If a field is not stated, use null (or [] for focus).",
  ].join("\n");
}

function mergeLlmParams(base: ExtractedParams, llm: LlmIntentShape): ExtractedParams {
  const merged: ExtractedParams = { ...base };
  if (llm.kind && VALID_KINDS.has(llm.kind as IntentKind) && llm.kind !== "unknown") {
    merged.kind = llm.kind as IntentKind;
  }
  if (typeof llm.age === "number" && llm.age >= 4 && llm.age <= 18) merged.age = clampAge(llm.age);
  if (typeof llm.durationMin === "number" && llm.durationMin >= 10 && llm.durationMin <= 240) {
    merged.durationMin = Math.round(llm.durationMin);
  }
  if (Array.isArray(llm.focus)) {
    const valid = llm.focus.filter((f): f is IntentFocus => (INTENT_FOCUSES as readonly string[]).includes(f));
    if (valid.length) merged.focus = Array.from(new Set(valid));
  }
  if (typeof llm.environmentTier === "string" && VALID_TIERS.has(llm.environmentTier as EnvironmentTier)) {
    merged.environmentTier = llm.environmentTier as EnvironmentTier;
  }
  if (typeof llm.players === "number" && llm.players >= 1 && llm.players <= 40) merged.players = Math.round(llm.players);
  if (typeof llm.level === "string" && llm.level.trim()) merged.level = llm.level.trim().slice(0, 40);
  return merged;
}

/**
 * LLM-assisted classification. Always seeds from the deterministic heuristic,
 * then lets a configured provider refine the parameters. Any provider/parse
 * failure quietly returns the heuristic result, so this never throws.
 */
export async function classifyIntent(provider: LLMProvider, query: string): Promise<SearchIntent> {
  const base = extractParams(query);
  try {
    const raw = await provider.complete({
      system: intentSystemPrompt(),
      user: `TASK: Classify the user's search intent.\n\nUSER_QUERY: ${query}`,
    });
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    if (jsonText.length > 1) {
      const parsed = JSON.parse(jsonText) as LlmIntentShape;
      return finalizeIntent(mergeLlmParams(base, parsed), query);
    }
  } catch {
    // fall through to heuristic
  }
  return finalizeIntent(base, query);
}

export { bandToRepAge };
