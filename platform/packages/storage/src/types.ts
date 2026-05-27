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

export interface DbShape {
  users: UserRecord[];
  players: PlayerRecord[];
  teams: TeamRecord[];
  teamMemberships: TeamMembershipRecord[];
  plans: PlanRecord[];
  metricEntries: MetricEntryRecord[];
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
  metricEntries: [],
  missionCompletions: [],
  auditLogs: [],
  sessions: [],
};
