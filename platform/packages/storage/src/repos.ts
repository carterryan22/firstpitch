// Repos = uniform async interface against any DbShape store.
// Pure CRUD + a few query helpers. No business logic here.

import type {
  AuditLogRecord,
  DbShape,
  GameRecord,
  MetricEntryRecord,
  MissionCompletionRecord,
  PlanRecord,
  PlayerRecord,
  SessionRecord,
  TeamMembershipRecord,
  TeamMemberRole,
  TeamRecord,
  UserRecord,
} from "./types";

export interface Store {
  read(): Promise<DbShape>;
  write(db: DbShape): Promise<void>;
}

let counter = 0;
export function cid(prefix = "rec"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export interface Repos {
  users: {
    list(): Promise<UserRecord[]>;
    byId(id: string): Promise<UserRecord | undefined>;
    byEmail(email: string): Promise<UserRecord | undefined>;
    upsert(input: Omit<UserRecord, "id" | "createdAt"> & { id?: string }): Promise<UserRecord>;
  };
  players: {
    list(filter?: { teamId?: string; includeArchived?: boolean }): Promise<PlayerRecord[]>;
    byId(id: string): Promise<PlayerRecord | undefined>;
    byTeam(teamId: string, opts?: { includeArchived?: boolean }): Promise<PlayerRecord[]>;
    create(input: Omit<PlayerRecord, "id" | "createdAt">): Promise<PlayerRecord>;
    update(id: string, patch: Partial<Omit<PlayerRecord, "id" | "createdAt">>): Promise<PlayerRecord | undefined>;
    archive(id: string): Promise<PlayerRecord | undefined>;
    unarchive(id: string): Promise<PlayerRecord | undefined>;
    byParent(userId: string): Promise<PlayerRecord[]>;
  };
  plans: {
    list(filter?: { teamId?: string; createdByUserId?: string; teamIds?: string[] }): Promise<PlanRecord[]>;
    byId(id: string): Promise<PlanRecord | undefined>;
    create(input: Omit<PlanRecord, "id" | "createdAt">): Promise<PlanRecord>;
  };
  teams: {
    list(): Promise<TeamRecord[]>;
    byId(id: string): Promise<TeamRecord | undefined>;
    bySlug(slug: string): Promise<TeamRecord | undefined>;
    create(input: Omit<TeamRecord, "id" | "createdAt">): Promise<TeamRecord>;
  };
  teamMemberships: {
    list(filter?: { teamId?: string; userId?: string; role?: TeamMemberRole }): Promise<TeamMembershipRecord[]>;
    upsert(input: Omit<TeamMembershipRecord, "id" | "createdAt">): Promise<TeamMembershipRecord>;
    remove(id: string): Promise<void>;
  };
  games: {
    list(filter?: { teamId?: string; status?: GameRecord["status"] }): Promise<GameRecord[]>;
    byId(id: string): Promise<GameRecord | undefined>;
    create(input: Omit<GameRecord, "id" | "createdAt">): Promise<GameRecord>;
    update(id: string, patch: Partial<Omit<GameRecord, "id" | "createdAt" | "teamId">>): Promise<GameRecord | undefined>;
    delete(id: string): Promise<void>;
  };
  metricEntries: {
    list(filter?: { playerId?: string; metricKey?: string }): Promise<MetricEntryRecord[]>;
    create(input: Omit<MetricEntryRecord, "id">): Promise<MetricEntryRecord>;
    bulkCreate(rows: Array<Omit<MetricEntryRecord, "id">>): Promise<MetricEntryRecord[]>;
  };
  missionCompletions: {
    list(filter?: { playerId?: string; missionId?: string }): Promise<MissionCompletionRecord[]>;
    create(input: Omit<MissionCompletionRecord, "id">): Promise<MissionCompletionRecord>;
  };
  audit: {
    list(filter?: { userId?: string; resource?: string }): Promise<AuditLogRecord[]>;
    log(input: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord>;
  };
  sessions: {
    byId(id: string): Promise<SessionRecord | undefined>;
    create(userId: string, ttlMs: number): Promise<SessionRecord>;
    delete(id: string): Promise<void>;
    purgeExpired(): Promise<number>;
  };
}

export function makeRepos(store: Store): Repos {
  const mutate = async <T>(fn: (db: DbShape) => T): Promise<T> => {
    const db = await store.read();
    const result = fn(db);
    await store.write(db);
    return result;
  };
  return {
    users: {
      list: async () => (await store.read()).users.slice(),
      byId: async (id) => (await store.read()).users.find((u) => u.id === id),
      byEmail: async (email) =>
        (await store.read()).users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
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
      async list(filter) {
        const all = (await store.read()).players;
        return all.filter(
          (p) =>
            (!filter?.teamId || p.teamId === filter.teamId) &&
            (filter?.includeArchived || !p.archivedAt)
        );
      },
      byId: async (id) => (await store.read()).players.find((p) => p.id === id),
      byTeam: async (teamId, opts) =>
        (await store.read()).players.filter(
          (p) => p.teamId === teamId && (opts?.includeArchived || !p.archivedAt)
        ),
      create: (input) =>
        mutate((db) => {
          const rec: PlayerRecord = { ...input, id: cid("ply"), createdAt: new Date().toISOString() };
          db.players.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.players.find((p) => p.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
          return rec;
        }),
      archive: (id) =>
        mutate((db) => {
          const rec = db.players.find((p) => p.id === id);
          if (!rec) return undefined;
          rec.archivedAt = new Date().toISOString();
          return rec;
        }),
      unarchive: (id) =>
        mutate((db) => {
          const rec = db.players.find((p) => p.id === id);
          if (!rec) return undefined;
          delete rec.archivedAt;
          return rec;
        }),
      byParent: async (userId) =>
        (await store.read()).players.filter((p) => p.parentUserId === userId),
    },
    plans: {
      async list(filter) {
        const all = (await store.read()).plans;
        return all.filter(
          (p) =>
            (!filter?.teamId || p.teamId === filter.teamId) &&
            (!filter?.createdByUserId || p.createdByUserId === filter.createdByUserId) &&
            (!filter?.teamIds || (p.teamId !== undefined && filter.teamIds.includes(p.teamId)))
        );
      },
      byId: async (id) => (await store.read()).plans.find((p) => p.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: PlanRecord = { ...input, id: cid("pln"), createdAt: new Date().toISOString() };
          db.plans.push(rec);
          return rec;
        }),
    },
    teams: {
      list: async () => (await store.read()).teams.slice(),
      byId: async (id) => (await store.read()).teams.find((t) => t.id === id),
      bySlug: async (slug) => (await store.read()).teams.find((t) => t.slug === slug),
      create: (input) =>
        mutate((db) => {
          const rec: TeamRecord = { ...input, id: cid("tm"), createdAt: new Date().toISOString() };
          db.teams.push(rec);
          return rec;
        }),
    },
    teamMemberships: {
      async list(filter) {
        return (await store.read()).teamMemberships.filter(
          (m) =>
            (!filter?.teamId || m.teamId === filter.teamId) &&
            (!filter?.userId || m.userId === filter.userId) &&
            (!filter?.role || m.role === filter.role)
        );
      },
      upsert: (input) =>
        mutate((db) => {
          const existing = db.teamMemberships.find(
            (m) =>
              m.teamId === input.teamId &&
              m.userId === input.userId &&
              (input.playerId ? m.playerId === input.playerId : true)
          );
          if (existing) {
            existing.role = input.role;
            if (input.playerId) existing.playerId = input.playerId;
            return existing;
          }
          const rec: TeamMembershipRecord = {
            ...input,
            id: cid("tmm"),
            createdAt: new Date().toISOString(),
          };
          db.teamMemberships.push(rec);
          return rec;
        }),
      remove: (id) =>
        mutate((db) => {
          const i = db.teamMemberships.findIndex((m) => m.id === id);
          if (i >= 0) db.teamMemberships.splice(i, 1);
        }),
    },
    games: {
      async list(filter) {
        return (await store.read()).games.filter(
          (g) =>
            (!filter?.teamId || g.teamId === filter.teamId) &&
            (!filter?.status || g.status === filter.status)
        );
      },
      byId: async (id) => (await store.read()).games.find((g) => g.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: GameRecord = { ...input, id: cid("gm"), createdAt: new Date().toISOString() };
          db.games.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.games.find((g) => g.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          const i = db.games.findIndex((g) => g.id === id);
          if (i >= 0) db.games.splice(i, 1);
        }),
    },
    metricEntries: {
      async list(filter) {
        return (await store.read()).metricEntries.filter(
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
      async list(filter) {
        return (await store.read()).missionCompletions.filter(
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
      async list(filter) {
        return (await store.read()).auditLogs.filter(
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
      byId: async (id) => (await store.read()).sessions.find((s) => s.id === id),
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
