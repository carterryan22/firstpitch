// Repos = uniform interface against any DbShape store.
// Pure CRUD + a few query helpers. No business logic here.

import type {
  AuditLogRecord,
  DbShape,
  MetricEntryRecord,
  MissionCompletionRecord,
  PlanRecord,
  PlayerRecord,
  SessionRecord,
  UserRecord,
} from "./types";

export interface Store {
  read(): DbShape;
  write(db: DbShape): void;
}

let counter = 0;
export function cid(prefix = "rec"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export interface Repos {
  users: {
    list(): UserRecord[];
    byId(id: string): UserRecord | undefined;
    byEmail(email: string): UserRecord | undefined;
    upsert(input: Omit<UserRecord, "id" | "createdAt"> & { id?: string }): UserRecord;
  };
  players: {
    list(): PlayerRecord[];
    byId(id: string): PlayerRecord | undefined;
    create(input: Omit<PlayerRecord, "id" | "createdAt">): PlayerRecord;
    byParent(userId: string): PlayerRecord[];
  };
  plans: {
    list(filter?: { teamId?: string; createdByUserId?: string }): PlanRecord[];
    byId(id: string): PlanRecord | undefined;
    create(input: Omit<PlanRecord, "id" | "createdAt">): PlanRecord;
  };
  metricEntries: {
    list(filter?: { playerId?: string; metricKey?: string }): MetricEntryRecord[];
    create(input: Omit<MetricEntryRecord, "id">): MetricEntryRecord;
    bulkCreate(rows: Array<Omit<MetricEntryRecord, "id">>): MetricEntryRecord[];
  };
  missionCompletions: {
    list(filter?: { playerId?: string; missionId?: string }): MissionCompletionRecord[];
    create(input: Omit<MissionCompletionRecord, "id">): MissionCompletionRecord;
  };
  audit: {
    list(filter?: { userId?: string; resource?: string }): AuditLogRecord[];
    log(input: Omit<AuditLogRecord, "id" | "createdAt">): AuditLogRecord;
  };
  sessions: {
    byId(id: string): SessionRecord | undefined;
    create(userId: string, ttlMs: number): SessionRecord;
    delete(id: string): void;
    purgeExpired(): number;
  };
}

export function makeRepos(store: Store): Repos {
  const mutate = <T>(fn: (db: DbShape) => T): T => {
    const db = store.read();
    const result = fn(db);
    store.write(db);
    return result;
  };
  return {
    users: {
      list: () => store.read().users.slice(),
      byId: (id) => store.read().users.find((u) => u.id === id),
      byEmail: (email) =>
        store.read().users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
      upsert(input) {
        return mutate((db) => {
          const existing =
            (input.id && db.users.find((u) => u.id === input.id)) ||
            db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
          if (existing) {
            Object.assign(existing, { name: input.name, role: input.role });
            return existing;
          }
          const created: UserRecord = {
            id: input.id ?? cid("usr"),
            email: input.email,
            name: input.name,
            role: input.role,
            createdAt: new Date().toISOString(),
          };
          db.users.push(created);
          return created;
        });
      },
    },
    players: {
      list: () => store.read().players.slice(),
      byId: (id) => store.read().players.find((p) => p.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: PlayerRecord = { ...input, id: cid("ply"), createdAt: new Date().toISOString() };
          db.players.push(rec);
          return rec;
        }),
      byParent: (userId) => store.read().players.filter((p) => p.parentUserId === userId),
    },
    plans: {
      list(filter) {
        const all = store.read().plans;
        return all.filter(
          (p) =>
            (!filter?.teamId || p.teamId === filter.teamId) &&
            (!filter?.createdByUserId || p.createdByUserId === filter.createdByUserId)
        );
      },
      byId: (id) => store.read().plans.find((p) => p.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: PlanRecord = { ...input, id: cid("pln"), createdAt: new Date().toISOString() };
          db.plans.push(rec);
          return rec;
        }),
    },
    metricEntries: {
      list(filter) {
        return store.read().metricEntries.filter(
          (e) =>
            (!filter?.playerId || e.playerId === filter.playerId) &&
            (!filter?.metricKey || e.metricKey === filter.metricKey)
        );
      },
      create: (input) =>
        mutate((db) => {
          const rec: MetricEntryRecord = { ...input, id: cid("me") };
          db.metricEntries.push(rec);
          return rec;
        }),
      bulkCreate: (rows) =>
        mutate((db) => {
          const created = rows.map((r) => ({ ...r, id: cid("me") }));
          db.metricEntries.push(...created);
          return created;
        }),
    },
    missionCompletions: {
      list(filter) {
        return store.read().missionCompletions.filter(
          (c) =>
            (!filter?.playerId || c.playerId === filter.playerId) &&
            (!filter?.missionId || c.missionId === filter.missionId)
        );
      },
      create: (input) =>
        mutate((db) => {
          const rec: MissionCompletionRecord = { ...input, id: cid("mc") };
          db.missionCompletions.push(rec);
          return rec;
        }),
    },
    audit: {
      list(filter) {
        return store.read().auditLogs.filter(
          (a) =>
            (!filter?.userId || a.userId === filter.userId) &&
            (!filter?.resource || a.resource === filter.resource)
        );
      },
      log: (input) =>
        mutate((db) => {
          const rec: AuditLogRecord = {
            ...input,
            id: cid("aud"),
            createdAt: new Date().toISOString(),
          };
          db.auditLogs.push(rec);
          return rec;
        }),
    },
    sessions: {
      byId: (id) => store.read().sessions.find((s) => s.id === id),
      create: (userId, ttlMs) =>
        mutate((db) => {
          const rec: SessionRecord = {
            id: cid("sess"),
            userId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttlMs).toISOString(),
          };
          db.sessions.push(rec);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          const i = db.sessions.findIndex((s) => s.id === id);
          if (i >= 0) db.sessions.splice(i, 1);
        }),
      purgeExpired() {
        return mutate((db) => {
          const now = Date.now();
          const before = db.sessions.length;
          db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > now);
          return before - db.sessions.length;
        });
      },
    },
  };
}
