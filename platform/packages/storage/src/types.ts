// Domain types for the storage layer. Intentionally JSON-serializable.

export type Role = "parent" | "coach" | "player" | "clinician" | "admin";

export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt: string;
}

export interface PlayerRecord {
  id: string;
  /** Owning team. Optional only for legacy / standalone player records. */
  teamId?: string;
  firstName: string;
  lastName: string;
  /** String to allow "00", "7a", etc. */
  jerseyNumber?: string;
  /** ISO yyyy-mm-dd. */
  dob?: string;
  ageBand: "6-8" | "9-12" | "13-15" | "16+";
  sport: "baseball" | "softball" | "both";
  positions: string[];
  /** Hitting side. */
  bats?: Bats;
  /** Throwing arm. */
  throws?: Throws;
  /** Legacy single handedness — keep for back-compat. */
  handedness?: "L" | "R" | "S";
  /** Optional. Used for co-ed leagues that enforce gender-alternating lineups. */
  gender?: "M" | "F" | "X";
  /**
   * Coach-set batting skill on a 1–5 scale (1=developing, 5=elite). Feeds the
   * lineup engine's skillScore weighting at premium defensive positions.
   */
  battingSkill?: 1 | 2 | 3 | 4 | 5;
  canPitch?: boolean;
  canCatch?: boolean;
  injured?: boolean;
  injuryNote?: string;
  positionRatings?: Partial<Record<Position, PositionRating>>;
  notes?: string;
  parentUserId?: string;
  archivedAt?: string;
  createdAt: string;
}

export type Bats = "L" | "R" | "S";
export type Throws = "L" | "R";
export type PositionRating = "preferred" | "ok" | "avoid";
export const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
export type Position = (typeof POSITIONS)[number];

export interface PlanRecord {
  id: string;
  name: string;
  ageBand: string;
  durationMin: number;
  blocks: unknown; // serialized compiler output
  qualityScore?: number;
  warnings?: string[];
  blocked?: string[];
  totalThrowingLoad?: number;
  focus?: string[];
  createdByUserId: string;
  teamId?: string;
  /** When set, the plan is scheduled on the team calendar. ISO datetime. */
  scheduledAt?: string;
  location?: string;
  /** Optional per-player RSVP / attendance state once scheduled. */
  rsvp?: Record<string, "yes" | "no" | "maybe">;
  attendance?: Record<string, "present" | "absent">;
  status?: "scheduled" | "completed" | "canceled";
  notes?: string;
  createdAt: string;
}

export interface TeamRecord {
  id: string;
  name: string;
  slug: string;
  ageBand: "6-8" | "9-12" | "13-15" | "16+";
  ownerCoachUserId: string;
  createdAt: string;
}

export type TeamMemberRole = "coach" | "player" | "parent";

export interface TeamMembershipRecord {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  /** For parent memberships, links the parent to the specific player on the team. */
  playerId?: string;
  createdAt: string;
}

export interface MetricEntryAttachment {
  url: string;
  kind: "video" | "image" | "doc" | "link";
  label?: string;
  addedAt: string;
  addedByUserId: string;
}

export interface MetricEntryRecord {
  id: string;
  playerId: string;
  metricKey: string;
  value: number;
  recordedAt: string;
  verificationState:
    | "self_entered"
    | "video_attached"
    | "device_captured"
    | "coach_verified"
    | "facility_verified"
    | "event_verified";
  source?: string;
  notes?: string;
  attachments?: MetricEntryAttachment[];
}

export interface MissionCompletionRecord {
  id: string;
  playerId: string;
  missionId: string;
  completedAt: string;
  evidence?: string;
}

export interface AuditLogRecord {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export type GameStatus = "scheduled" | "in_progress" | "completed";
export type HomeAway = "home" | "away";
export type Attendance = "present" | "absent";

export interface PitchEntry {
  pitches: number;
  innings: number;
  recordedAt: string;
}

export interface GameRecord {
  id: string;
  teamId: string;
  opponent: string;
  /** ISO datetime when first pitch is scheduled. */
  startsAt: string;
  venue?: string;
  homeAway: HomeAway;
  innings: number;
  status: GameStatus;
  notes?: string;
  /** Player attendance for this game. Map of playerId -> present|absent. */
  attendance?: Record<string, Attendance>;
  /** Parent / player RSVPs collected ahead of the game. */
  rsvp?: Record<string, "yes" | "no" | "maybe">;
  /** Position assignment per inning. lineup[inningIndex][playerId] = positionCode ("P","C",..., "BN"). */
  lineup?: Array<Record<string, string>>;
  /** Batting order: ordered array of playerIds. */
  battingOrder?: string[];
  /** Pitch counts entered post-game (one entry per pitcher). */
  pitchCounts?: Record<string, PitchEntry>;
  finalScore?: { us: number; them: number };
  /** When true, the game is treated as a scrimmage: excluded from season stats. */
  isScrimmage?: boolean;
  createdAt: string;
  completedAt?: string;
}

/**
 * Per-player per-game box-score stats. Source is typically a GameChanger CSV
 * paste; can also be manual or computed from a play-by-play. Any of
 * batting/pitching/fielding may be omitted if the player didn't participate
 * in that phase. `rating` is a *kind* 1.0-5.0 score (see `lib/playerStats`).
 */
export interface PlayerGameBattingStats {
  pa?: number; ab?: number; h?: number;
  "1b"?: number; "2b"?: number; "3b"?: number; hr?: number;
  r?: number; rbi?: number; bb?: number; so?: number; kLooking?: number;
  hbp?: number; sac?: number; sf?: number; roe?: number; fc?: number;
  sb?: number; cs?: number; qab?: number; ps?: number; lob?: number;
  twoOutRbi?: number; bbRisp?: number; abRisp?: number; hRisp?: number;
  /** Derived percentages (optional, may come straight from CSV). */
  avg?: number; obp?: number; slg?: number; ops?: number;
  qabPct?: number; contactPct?: number; bbPerK?: number;
}

export interface PlayerGamePitchingStats {
  ip?: number; bf?: number; pitches?: number; strikes?: number;
  h?: number; r?: number; er?: number; bb?: number; so?: number;
  hbp?: number; wp?: number; bk?: number; hr?: number;
  era?: number; whip?: number; baa?: number;
  pitchesPerInning?: number; pitchesPerBatter?: number;
}

export interface PlayerGameFieldingStats {
  position: Position;
  innings?: number; gs?: number; tc?: number;
  po?: number; a?: number; e?: number; dp?: number; tp?: number;
  fpct?: number;
  /** Catcher-only. */
  pb?: number; sbAgainst?: number; cs?: number; csPct?: number;
}

export interface PlayerGameStatsRecord {
  id: string;
  playerId: string;
  teamId: string;
  gameId: string;
  batting?: PlayerGameBattingStats;
  pitching?: PlayerGamePitchingStats;
  fielding?: PlayerGameFieldingStats[];
  /** 1.0 - 5.0, kind by design. */
  rating: number;
  ratingLabel: string;
  highlights: string[];
  source: "gamechanger" | "manual" | "computed";
  createdAt: string;
  updatedAt?: string;
}

export interface DbShape {
  users: UserRecord[];
  players: PlayerRecord[];
  teams: TeamRecord[];
  teamMemberships: TeamMembershipRecord[];
  plans: PlanRecord[];
  games: GameRecord[];
  gameNotes: GameNoteRecord[];
  playerGameStats: PlayerGameStatsRecord[];
  metricEntries: MetricEntryRecord[];
  goals: GoalRecord[];
  missionCompletions: MissionCompletionRecord[];
  auditLogs: AuditLogRecord[];
  sessions: SessionRecord[];
  /** Fields directory (Dugout Dirt parity). All optional for back-compat. */
  fields?: FieldRecord[];
  fieldReviews?: FieldReviewRecord[];
  fieldBookings?: FieldBookingRecord[];
  favorites?: FavoriteRecord[];
}

export const EMPTY_DB: DbShape = {
  users: [],
  players: [],
  teams: [],
  teamMemberships: [],
  plans: [],
  games: [],
  gameNotes: [],
  playerGameStats: [],
  metricEntries: [],
  goals: [],
  missionCompletions: [],
  auditLogs: [],
  sessions: [],
  fields: [],
  fieldReviews: [],
  fieldBookings: [],
  favorites: [],
};

/**
 * In-game note authored by a coach about one player and (optionally) a
 * specific play/inning. Notes attach to the player record and can be shared
 * with the parent and/or player account so they show up in the family
 * dashboard and player view.
 */
export interface GameNoteRecord {
  id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  authorUserId: string;
  /** Short label for the play context, e.g. "Top 3rd — ground ball to SS". */
  playLabel?: string;
  /** Optional inning index (0-based). */
  inningIdx?: number;
  body: string;
  shareWithParents: boolean;
  shareWithPlayer: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Player development goals. Targets attach to Measurable / Skill metrics
 * only (game-context stats are not goal-able per spec).
 */
export type GoalType = "delta" | "absolute";
export type GoalStatus = "active" | "achieved" | "archived";

export interface GoalRecord {
  id: string;
  playerId: string;
  metricKey: string;
  type: GoalType;
  /** For "delta" goals: the +/- change from baseline. Lower-is-better metrics use negative deltas. */
  /** For "absolute" goals: the target value the player must reach. */
  target: number;
  /** Baseline captured at goal creation so progress is stable even as the metric registry changes. */
  baseline: number;
  /** Optional target date (ISO). */
  targetDate?: string;
  status: GoalStatus;
  createdByUserId: string;
  createdAt: string;
  achievedAt?: string;
  archivedAt?: string;
  notes?: string;
}

// ---------- Fields directory (Dugout Dirt-inspired) ----------

export type FieldSurface = "grass" | "turf" | "dirt" | "mixed";
export type FieldType = "baseball" | "softball" | "multi" | "tee-ball";

export interface FieldRecord {
  id: string;
  /** URL-safe handle, e.g. "robinswood-park-baseball-field-1-bellevue-wa". */
  slug: string;
  name: string;
  city: string;
  /** Two-letter US state. */
  state: string;
  type: FieldType;
  surface: FieldSurface;
  lights: boolean;
  /** Free-form quick facts beyond the typed ones above (parking, snack stand, etc.). */
  notes?: string;
  /** Coordinates for "Open in Maps" / nearby calc. */
  lat?: number;
  lng?: number;
  /** External source attribution (OSM way id URL, league site, etc.). */
  sourceUrl?: string;
  /** When a coach/manager has claimed and is maintaining this field. */
  claimedByUserId?: string;
  createdAt: string;
}

export interface FieldReviewRecord {
  id: string;
  fieldId: string;
  authorUserId: string;
  authorName: string;
  /** parent | coach | player | umpire | other — drives the byline tag. */
  authorRole: "parent" | "coach" | "player" | "umpire" | "other";
  /** 1-5 stars. */
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
}

export type FieldBookingStatus = "requested" | "confirmed" | "declined" | "canceled";

export interface FieldBookingRecord {
  id: string;
  fieldId: string;
  requestedByUserId: string;
  requestedByName: string;
  /** ISO date "YYYY-MM-DD". */
  date: string;
  /** "HH:mm". */
  startTime: string;
  /** Minutes of requested slot. */
  durationMin: number;
  purpose: "practice" | "game" | "scrimmage" | "clinic" | "other";
  notes?: string;
  status: FieldBookingStatus;
  createdAt: string;
}

/** Per-user star-saved entities. Currently only fields; structured for reuse. */
export interface FavoriteRecord {
  id: string;
  userId: string;
  kind: "field";
  targetId: string;
  createdAt: string;
}
