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
  /** Position assignment per inning. lineup[inningIndex][playerId] = positionCode ("P","C",..., "BN"). */
  lineup?: Array<Record<string, string>>;
  /** Batting order: ordered array of playerIds. */
  battingOrder?: string[];
  /** Pitch counts entered post-game (one entry per pitcher). */
  pitchCounts?: Record<string, PitchEntry>;
  finalScore?: { us: number; them: number };
  createdAt: string;
  completedAt?: string;
}

export interface DbShape {
  users: UserRecord[];
  players: PlayerRecord[];
  teams: TeamRecord[];
  teamMemberships: TeamMembershipRecord[];
  plans: PlanRecord[];
  games: GameRecord[];
  metricEntries: MetricEntryRecord[];
  goals: GoalRecord[];
  missionCompletions: MissionCompletionRecord[];
  auditLogs: AuditLogRecord[];
  sessions: SessionRecord[];
}

export const EMPTY_DB: DbShape = {
  users: [],
  players: [],
  teams: [],
  teamMemberships: [],
  plans: [],
  games: [],
  metricEntries: [],
  goals: [],
  missionCompletions: [],
  auditLogs: [],
  sessions: [],
};

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
