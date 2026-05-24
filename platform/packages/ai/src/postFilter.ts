// Runtime post-filter — ai-system-prompts.md §7. Scans model output for any
// rule violation BEFORE delivery. Returns sanitized text + an action log.

import { violatesAnyDailyMax } from "@platform/safety";

export interface PostFilterResult {
  text: string;
  blocked: boolean;
  actions: string[];
  escalate: boolean;
}

const FORBIDDEN_PATTERNS: Array<{ id: string; re: RegExp; reason: string }> = [
  { id: "CURVEBALL_UNDER_14", re: /\b(curve[-\s]?ball|slider|12[-\s]?6\s+(curve|break)|breaking\s+pitch)\b/i, reason: "Mentions breaking pitch; gated by age check." },
  { id: "1RM_TEST", re: /\b1\s*RM\b/i, reason: "Mentions 1RM; forbidden under 14." },
  { id: "WEIGHT_CUT", re: /\b(weight[-\s]?cut|cut\s+weight|lose\s+\d+\s*(lbs|pounds))\b/i, reason: "Diet/weight cut language." },
  { id: "DIAGNOSIS", re: /\b(you\s+have|this\s+is)\s+(a\s+)?(strain|tear|sprain|tendinitis|fracture)\b/i, reason: "Diagnostic language." },
  { id: "DIAGNOSIS_LOOSE", re: /\b(this\s+is|you\s+have)\b[^.!?]{0,40}\b(strain|tear|sprain|tendinitis|fracture|UCL|labrum)\b/i, reason: "Loose diagnostic phrasing." },
  { id: "SUPPLEMENT", re: /\b(creatine|pre[-\s]?workout|protein\s+powder|sarms?)\b/i, reason: "Supplement recommendation." },
];

const PAIN_PATTERNS = [/\bpain\b/i, /\bhurts?\b/i, /\bsore\b/i, /\binjur(y|ed)\b/i];

export function postFilter(text: string, ctx: { ageBand: string; userRole: string }): PostFilterResult {
  const actions: string[] = [];
  let working = text;
  let blocked = false;

  for (const p of FORBIDDEN_PATTERNS) {
    if (p.re.test(working)) {
      actions.push(`flagged:${p.id}:${p.reason}`);
      // Strip the offending sentence rather than the whole reply.
      working = working
        .split(/(?<=[.!?])\s+/)
        .filter((s) => !p.re.test(s))
        .join(" ");
      blocked = true;
    }
  }

  // Pitch count numeric guard — find any "N pitches" and check vs max
  const pitchMatches = [...working.matchAll(/(\d{2,4})\s*pitches?\b/gi)];
  for (const m of pitchMatches) {
    const n = Number(m[1]);
    if (violatesAnyDailyMax(n)) {
      actions.push(`flagged:PITCH_COUNT_OVER_MAX:${n}`);
      blocked = true;
    }
  }

  const escalate = PAIN_PATTERNS.some((re) => re.test(text));
  if (escalate) actions.push("escalate:pain_reported");

  if (blocked && working.trim().length < 20) {
    working = "I can't help with that request as written. Please talk to your coach or guardian for next steps.";
  }

  return { text: working.trim(), blocked, actions, escalate };
}
