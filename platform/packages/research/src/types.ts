// @platform/research — types for the competitor-research corpus.
// Mirrors corpus/competitor-research/*.json. See competitor-research-corpus-plan.md.

export type SourceType =
  | "app_review"
  | "reddit"
  | "forum"
  | "product_page"
  | "help_doc"
  | "release_note"
  | "youtube"
  | "social"
  | "pricing_page"
  | "manual_note";

export type SourcePlatform =
  | "apple_app_store"
  | "google_play"
  | "reddit"
  | "web"
  | "youtube"
  | "facebook"
  | "product_site";

export type PlatformCategory =
  | "lineup"
  | "scorekeeping"
  | "stats"
  | "team_management"
  | "practice_planning"
  | "training"
  | "video_analysis"
  | "hardware_metrics"
  | "recruiting"
  | "club_ops";

export type AuthorRole =
  | "coach"
  | "parent"
  | "player"
  | "scorer"
  | "trainer"
  | "facility_owner"
  | "tournament_director"
  | "unknown";

export type AgeBand =
  | "tee_ball"
  | "8U"
  | "10U"
  | "12U"
  | "14U"
  | "HS"
  | "college"
  | "adult"
  | "unknown";

export type Sport = "baseball" | "softball" | "both" | "unknown";

export type WorkflowStage =
  | "pre_game"
  | "game_day"
  | "post_game"
  | "practice"
  | "off_season"
  | "tryout"
  | "tournament"
  | "recruiting";

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";
export type Level = "low" | "medium" | "high";

export interface CorpusItem {
  source_id: string;
  source_type: SourceType;
  platform_name: string;
  platform_category: PlatformCategory[];
  source_platform: SourcePlatform;
  url: string;
  date_published?: string | null;
  date_collected: string;
  app_version?: string | null;
  rating?: number | null;
  review_title?: string | null;
  raw_text?: string | null;
  clean_text: string;
  author_role_inferred: AuthorRole;
  age_band: AgeBand;
  sport: Sport;
  workflow_stage?: WorkflowStage | null;
  job_to_be_done?: string[];
  pain_points?: string[];
  feature_requests?: string[];
  delighters?: string[];
  bugs_or_reliability_issues?: string[];
  workarounds?: string[];
  competitors_mentioned?: string[];
  pricing_feedback?: string[];
  trust_or_safety_concerns?: string[];
  data_ownership_concerns?: string[];
  export_or_integration_needs?: string[];
  sentiment: Sentiment;
  urgency?: Level | null;
  severity?: Level | null;
  confidence: Level;
  product_implication?: string | null;
  opportunity_score?: number | null;
}

export interface Platform {
  id: string;
  name: string;
  categories: PlatformCategory[];
  wave: 1 | 2 | 3;
  priority: number;
  sport: Sport;
  pricing_model: "free" | "freemium" | "subscription" | "hardware" | "quote" | "unknown";
  url: string | null;
  why: string;
}

export interface PlatformsFile {
  description: string;
  waves: Record<string, string>;
  category_legend: Record<string, string>;
  platforms: Platform[];
  additional_research_targets: string[];
}

export interface TaxonomyTerm {
  id: string;
  label: string;
}

export interface Taxonomy {
  description: string;
  enums: Record<string, string[]>;
  roles: TaxonomyTerm[];
  jobs_to_be_done: TaxonomyTerm[];
  pain_points: TaxonomyTerm[];
  feature_opportunities: TaxonomyTerm[];
}

export interface ScoringDimension {
  id: string;
  label: string;
  measures: string;
}

export interface ScoringConfig {
  description: string;
  scale: { min: number; max: number };
  max_score: number;
  mvp_threshold: number;
  dimensions: ScoringDimension[];
}

export type CapabilityValue = "yes" | "partial" | "no" | "unknown";

export interface MatrixFeature {
  id: string;
  label: string;
}

export interface MatrixPlatform {
  platformId: string;
  cells: Record<string, string>;
}

export interface FeatureMatrixFile {
  description: string;
  legend: Record<string, string>;
  capability_features: MatrixFeature[];
  text_features: MatrixFeature[];
  platforms: MatrixPlatform[];
}

export interface ValidationIssue {
  itemId: string;
  level: "error" | "warning";
  message: string;
}
