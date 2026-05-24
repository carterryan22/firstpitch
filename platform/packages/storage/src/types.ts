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
  firstName: string;
  lastName: string;
  ageBand: "6-8" | "9-12" | "13-15" | "16+";
  sport: "baseball" | "softball" | "both";
  positions: string[];
  handedness?: "L" | "R" | "S";
  parentUserId?: string;
  createdAt: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  ageBand: string;
  durationMin: number;
  blocks: unknown; // serialized compiler output
  qualityScore?: number;
  createdByUserId: string;
  teamId?: string;
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
  plans: PlanRecord[];
  metricEntries: MetricEntryRecord[];
  missionCompletions: MissionCompletionRecord[];
  auditLogs: AuditLogRecord[];
  sessions: SessionRecord[];
}

export const EMPTY_DB: DbShape = {
  users: [],
  players: [],
  plans: [],
  metricEntries: [],
  missionCompletions: [],
  auditLogs: [],
  sessions: [],
};
