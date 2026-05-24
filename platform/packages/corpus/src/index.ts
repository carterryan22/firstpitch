// @platform/corpus — typed loader for the JSON knowledge stack at workspace `corpus/`.
// Source of truth for `tier1-safety-rules.json`, `pitch-smart-tables.json`,
// `age-band-matrix.json`, `sources.seed.json`, `drills/starter-library.json`.

import { readFileSync } from "node:fs";
import path from "node:path";

// ---------- Types ----------

export type AgeBandKey = "6-8" | "9-12" | "13-15" | "16+";
export type AgeBandRange = "7-8" | "9-10" | "11-12" | "13-14" | "15-16" | "17-18";
export type Enforcement = "hard_block" | "warn_and_label" | "informational";

export interface SafetyRule {
  rule_id: string;
  domain: string;
  sport: string;
  age_band: string;
  source_name: string;
  source_url: string;
  scope: string;
  rule_text: string;
  enforcement: Enforcement;
  applies_to: string[];
  overrides_allowed?: string[];
  never_overridden_by?: string[];
  ui_strings?: Record<string, string>;
}

export interface SafetyRules {
  $schema_version: string;
  description: string;
  last_reviewed: string;
  rules: SafetyRule[];
}

export interface PitchSmartRestRow {
  pitches_min: number;
  pitches_max: number;
  rest_days: number;
}

export interface PitchSmartAgeTable {
  age_band: AgeBandRange;
  daily_max_pitches: number;
  required_rest: PitchSmartRestRow[];
  allowed_pitch_types: string[];
  notes?: string;
}

export interface PitchSmartGlobalRule {
  rule_id: string;
  text: string;
}

export interface PitchSmartTables {
  $schema_version: string;
  description: string;
  source: { name: string; url: string; last_verified: string; version_note: string };
  global_rules: PitchSmartGlobalRule[];
  age_tables: PitchSmartAgeTable[];
  league_overrides: { description: string; examples: Array<{ league: string; url: string; note: string }> };
  compiler_contract: Record<string, unknown>;
}

export interface AgeMatrixTopicItem {
  item: string;
  conditions: string[];
}

export interface AgeMatrixTopic {
  required: string[];
  allowed_with_conditions: AgeMatrixTopicItem[];
  forbidden: string[];
}

export interface AgeMatrixBand {
  age_band: AgeBandKey;
  stage: string;
  primary_outcomes: string[];
  session_structure: {
    max_session_minutes: number;
    ideal_active_minutes: number;
    max_continuous_skill_block_minutes: number;
    rest_or_water_break_every_minutes: number;
    sessions_per_week_max: number;
  };
  topics: Record<string, AgeMatrixTopic>;
  assessment_rules: {
    verification_max_level: string;
    public_leaderboards: string;
    private_progress_view: string;
    metrics_emphasized: string[];
  };
}

export interface AgeMatrix {
  $schema_version: string;
  description: string;
  bands: AgeMatrixBand[];
  matrix_query_contract: Record<string, unknown>;
}

export interface SourceRecord {
  title: string;
  url: string;
  source_name: string;
  source_tier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4";
  topic: string;
  age_band: string;
  sport: string;
  summary: string;
  key_principles: string[];
  safe_to_prescribe: boolean;
  requires_guardrail: boolean;
  guardrail_reason: string;
  do_not_use_for: string[];
  coach_use_case: string;
  player_use_case: string;
  parent_use_case: string;
  practice_format: string;
  equipment_needed: string[];
  duration_minutes: number | null;
  progression_level: string;
  evidence_level: string;
  tags: string[];
}

export interface Drill {
  drill_id: string;
  name: string;
  short_description: string;
  long_description: string;
  topic: string;
  sport: "baseball" | "softball" | "general";
  age_band: AgeBandKey[];
  season_state: string[];
  intensity: "light" | "normal" | "hard" | "recovery";
  primary_metric: { metric_id: string; expected_movement: "increase" | "decrease" | "maintain" };
  secondary_metrics: Array<{ metric_id: string; expected_movement: string }>;
  non_metric: boolean;
  environment_tier: "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";
  equipment_required: string[];
  equipment_substitutions: Array<{ missing: string; swap_to: string; tier_change: string | null }>;
  space_required: string;
  player_count_min: number;
  player_count_max: number;
  coaches_min: number;
  coaches_max: number;
  duration_minutes: number;
  reps_or_rounds: string;
  rest_seconds_between_sets: number;
  setup_steps: string[];
  execution_steps: string[];
  coaching_cues: string[];
  common_mistakes: string[];
  scoring: { type: string; unit: string; success_threshold: number | null };
  progressions: Array<{ level: string; change: string }>;
  regressions: Array<{ level: string; change: string }>;
  variations: Array<{ name: string; change: string }>;
  pitch_smart_compliant: boolean;
  throw_count_contribution: number;
  loaded_strength_movement: boolean;
  supervision_required: boolean;
  safety_flags: string[];
  safety_rule_refs: string[];
  verification_levels_supported: string[];
  evidence_links: Array<{ source_id: string; relationship: string }>;
  tags: string[];
  author: string;
  created_at: string;
  last_reviewed_at: string;
  review_status: "draft" | "reviewed" | "published" | "retired";
}

// ---------- Loader ----------

function resolveCorpusDir(): string {
  const envDir = process.env.CORPUS_DIR;
  if (envDir) return path.resolve(envDir);

  // Walk up from cwd and from __dirname looking for a `corpus/` folder
  // that contains the canonical files. This works for next dev (cwd=apps/web),
  // vitest (cwd=platform), and node CLI alike.
  const seen = new Set<string>();
  const starts: string[] = [process.cwd()];
  try {
    starts.push(__dirname);
  } catch {
    // __dirname may be undefined in ESM contexts; fall through.
  }
  for (const start of starts) {
    let cur = start;
    for (let i = 0; i < 8; i++) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const candidate = path.join(cur, "corpus", "tier1-safety-rules.json");
      try {
        readFileSync(candidate);
        return path.join(cur, "corpus");
      } catch {
        /* keep walking */
      }
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }
  }
  throw new Error(
    "Could not locate corpus/ directory. Set CORPUS_DIR env var to the absolute path."
  );
}

function readJson<T>(file: string): T {
  const full = path.join(resolveCorpusDir(), file);
  const raw = readFileSync(full, "utf-8");
  return JSON.parse(raw) as T;
}

let _safety: SafetyRules | null = null;
let _pitch: PitchSmartTables | null = null;
let _matrix: AgeMatrix | null = null;
let _sources: SourceRecord[] | null = null;
let _drills: Drill[] | null = null;

export function loadSafetyRules(): SafetyRules {
  if (!_safety) _safety = readJson<SafetyRules>("tier1-safety-rules.json");
  return _safety;
}

export function loadPitchSmart(): PitchSmartTables {
  if (!_pitch) _pitch = readJson<PitchSmartTables>("pitch-smart-tables.json");
  return _pitch;
}

export function loadAgeMatrix(): AgeMatrix {
  if (!_matrix) _matrix = readJson<AgeMatrix>("age-band-matrix.json");
  return _matrix;
}

export function loadSources(): SourceRecord[] {
  if (!_sources) _sources = readJson<SourceRecord[]>("sources.seed.json");
  return _sources;
}

export function loadDrills(): Drill[] {
  if (!_drills) _drills = readJson<Drill[]>("drills/starter-library.json");
  return _drills;
}

export function resetCache(): void {
  _safety = _pitch = _matrix = null;
  _sources = null;
  _drills = null;
}

// ---------- Lookups ----------

export function getRuleById(id: string): SafetyRule | undefined {
  return loadSafetyRules().rules.find((r) => r.rule_id === id);
}

export function getPitchTableForAge(age: number): PitchSmartAgeTable | undefined {
  const bands = loadPitchSmart().age_tables;
  return bands.find((b) => {
    const [lo, hi] = b.age_band.split("-").map((n) => Number(n));
    return age >= lo! && age <= hi!;
  });
}

export function getAgeBandKeyForAge(age: number): AgeBandKey {
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  if (age <= 15) return "13-15";
  return "16+";
}

export function getMatrixBand(age: number): AgeMatrixBand {
  const key = getAgeBandKeyForAge(age);
  const band = loadAgeMatrix().bands.find((b) => b.age_band === key);
  if (!band) throw new Error(`No age matrix band for ${key}`);
  return band;
}
