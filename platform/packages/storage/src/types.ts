// Domain types for the storage layer. Intentionally JSON-serializable.

export type Role = "parent" | "coach" | "player" | "admin";

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
  /**
   * COPPA parental-consent state for this child profile. Undefined on legacy
   * records (treated as not-yet-gated). `pending` until a parent verifies.
   */
  consentStatus?: ConsentStatus;
  /** Active consent record id, if any. */
  consentId?: string;
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
  /**
   * Team-level lineup rule set (governing-body + house rules) used as the
   * default when building a game lineup. Mirrors the Who's on Second
   * Settings → rules surface. Structurally a subset of `@platform/lineup`'s
   * `LeagueRules` (scalar rules only — per-game tandem locks live on the game).
   */
  leagueRules?: TeamLeagueRules;
  /**
   * Id of the rule-set preset last applied to this team (e.g. `littleLeague_11_12`).
   * Drives per-rule provenance badges in Settings: a rule whose value still
   * matches the applied preset is shown as a "League rule", anything the coach
   * changed afterward is "Custom". Undefined = fully custom / no preset applied.
   */
  appliedRuleSetId?: string;
  createdAt: string;
}

/** Serializable scalar lineup rules persisted on a team. */
export interface TeamLeagueRules {
  minFieldInnings?: number;
  infieldRequiredByInning?: number;
  maxConsecutiveBench?: number;
  maxConsecutiveOutfield?: number;
  pitcherBenchInningBefore?: boolean;
  equalBenchTime?: boolean;
  maxConsecutiveSamePosition?: number;
  minInfieldInnings?: number;
  minOutfieldInnings?: number;
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

/**
 * Coach-issued mission assignment. Closes the development loop: the diagnosis
 * engine + practice compiler can suggest a mission, the coach assigns it to
 * specific players, and the parent dashboard surfaces it as homework with a
 * one-tap "Done" that writes both this record (completedAt) and a
 * MissionCompletionRecord so the streak engine keeps working.
 */
export interface MissionAssignmentRecord {
  id: string;
  teamId: string;
  playerId: string;
  missionId: string;
  assignedByUserId: string;
  assignedAt: string;
  dueAt?: string;
  /** Player-side progress signal. Defaults to "assigned" when missing. */
  status?: "assigned" | "in_progress" | "completed";
  /** Set the first time the player taps "Start" — used by the locker for in-progress badges. */
  startedAt?: string;
  completedAt?: string;
  /** Optional link back to the practice plan that produced the suggestion. */
  planId?: string;
  notes?: string;
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

/**
 * A one-time magic-link login token. Stores the *hash* of the token (never the
 * plaintext) so a DB leak doesn't expose live links. Consumes single-use.
 */
export interface LoginTokenRecord {
  id: string;
  /** SHA-256 hash of the random token string. */
  tokenHash: string;
  email: string;
  role: "coach" | "parent" | "player" | "admin";
  name?: string;
  /** Where to send the user after consumption (path on this app). */
  redirectTo?: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
}

export type ConsentStatus = "pending" | "granted" | "revoked";

/**
 * Verifiable parental consent record (COPPA). One per child profile. We email
 * the parent a one-time verification link; the *hash* of that token is stored
 * (never the plaintext). A child profile is not "active" until status=granted.
 */
export interface ConsentRecord {
  id: string;
  /** Child this consent governs. */
  playerId: string;
  teamId?: string;
  /** Parent/guardian email the consent request was sent to. */
  parentEmail: string;
  /** User id of the parent once known/linked. */
  parentUserId?: string;
  /** Coach/admin who initiated the request. */
  requestedByUserId?: string;
  status: ConsentStatus;
  /** SHA-256 hash of the one-time verification token. */
  tokenHash?: string;
  /** Version of the privacy disclosure the parent agreed to. */
  policyVersion: string;
  expiresAt?: string;
  grantedAt?: string;
  revokedAt?: string;
  /** Best-effort record of the consenting action for the audit trail. */
  verifiedVia?: "email_link";
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
  /** Parent-facing Press Box link is live when true. URL is HMAC-signed so no token is stored. */
  shareEnabled?: boolean;
  /** Snack / volunteer duty for this game (surfaced on the Press Box). */
  snackDuty?: SnackDuty;
  /** UID of the source calendar event when this game was imported from a GameChanger (or other) ICS feed. Used to reconcile re-imports. */
  sourceUid?: string;
  createdAt: string;
  completedAt?: string;
}

/** Who's bringing snacks / running the table for a game (WoS §3.12). */
export interface SnackDuty {
  /** Stable key (parent userId or family slug) when assigned from the pool. */
  volunteerId?: string;
  /** Display name shown to parents. */
  name: string;
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
  /** Coach-issued mission assignments. Optional for back-compat. */
  missionAssignments?: MissionAssignmentRecord[];
  auditLogs: AuditLogRecord[];
  sessions: SessionRecord[];
  /** Magic-link login tokens. Optional for back-compat with old persisted DBs. */
  loginTokens?: LoginTokenRecord[];
  /** COPPA parental-consent records. Optional for back-compat. */
  consents?: ConsentRecord[];
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
  missionAssignments: [],
  auditLogs: [],
  sessions: [],
  loginTokens: [],
  consents: [],
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
  /** Human-readable source label, e.g. "OpenStreetMap", "Bellevue Parks", "Coach-submitted". */
  sourceName?: string;
  /** ISO date the field info was last verified by a human or trusted source. */
  lastVerifiedAt?: string;
  /** Verification confidence — drives the trust badge on /fields. */
  verification?: "verified" | "community" | "imported" | "unverified";
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
  /** Free-text team or league name (e.g. "Bellevue Little League 11U Bombers"). */
  teamOrLeague?: string;
  /** Age group of the players using the field. */
  ageGroup?: "6U" | "8U" | "10U" | "12U" | "14U" | "16U" | "18U" | "adult";
  /** Whether the requester confirms they have insurance lined up (many cities require it). */
  insuranceReady?: boolean;
  /** Optional backup date for the same slot, ISO "YYYY-MM-DD". */
  backupDate?: string;
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
