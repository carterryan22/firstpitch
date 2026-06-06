// Repos = uniform async interface against any DbShape store.
// Pure CRUD + a few query helpers. No business logic here.

import type {
  AuditLogRecord,
  ConsentRecord,
  ConsentStatus,
  DbShape,
  FavoriteRecord,
  FieldBookingRecord,
  FieldBookingStatus,
  FieldRecord,
  FieldReviewRecord,
  GameNoteRecord,
  GameRecord,
  GoalRecord,
  MetricEntryRecord,
  MissionAssignmentRecord,
  MissionCompletionRecord,
  PlanRecord,
  PlayerGameStatsRecord,
  PlayerRecord,
  SessionRecord,
  LoginTokenRecord,
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
    list(filter?: { teamId?: string; createdByUserId?: string; teamIds?: string[]; scheduled?: boolean }): Promise<PlanRecord[]>;
    byId(id: string): Promise<PlanRecord | undefined>;
    create(input: Omit<PlanRecord, "id" | "createdAt">): Promise<PlanRecord>;
    update(id: string, patch: Partial<Omit<PlanRecord, "id" | "createdAt">>): Promise<PlanRecord | undefined>;
    delete(id: string): Promise<void>;
  };
  teams: {
    list(): Promise<TeamRecord[]>;
    byId(id: string): Promise<TeamRecord | undefined>;
    bySlug(slug: string): Promise<TeamRecord | undefined>;
    create(input: Omit<TeamRecord, "id" | "createdAt">): Promise<TeamRecord>;
    update(id: string, patch: Partial<Omit<TeamRecord, "id" | "createdAt" | "ownerCoachUserId">>): Promise<TeamRecord | undefined>;
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
  gameNotes: {
    list(filter?: { gameId?: string; teamId?: string; playerId?: string; authorUserId?: string }): Promise<GameNoteRecord[]>;
    byId(id: string): Promise<GameNoteRecord | undefined>;
    create(input: Omit<GameNoteRecord, "id" | "createdAt">): Promise<GameNoteRecord>;
    update(id: string, patch: Partial<Omit<GameNoteRecord, "id" | "createdAt" | "gameId" | "teamId" | "playerId" | "authorUserId">>): Promise<GameNoteRecord | undefined>;
    delete(id: string): Promise<void>;
  };
  playerGameStats: {
    list(filter?: { teamId?: string; gameId?: string; playerId?: string }): Promise<PlayerGameStatsRecord[]>;
    byId(id: string): Promise<PlayerGameStatsRecord | undefined>;
    upsert(input: Omit<PlayerGameStatsRecord, "id" | "createdAt">): Promise<PlayerGameStatsRecord>;
    delete(id: string): Promise<void>;
    deleteByGame(gameId: string): Promise<number>;
  };
  metricEntries: {
    list(filter?: { playerId?: string; playerIds?: string[]; metricKey?: string }): Promise<MetricEntryRecord[]>;
    byId(id: string): Promise<MetricEntryRecord | undefined>;
    create(input: Omit<MetricEntryRecord, "id">): Promise<MetricEntryRecord>;
    bulkCreate(rows: Array<Omit<MetricEntryRecord, "id">>): Promise<MetricEntryRecord[]>;
    update(id: string, patch: Partial<Omit<MetricEntryRecord, "id" | "playerId">>): Promise<MetricEntryRecord | undefined>;
  };
  goals: {
    list(filter?: { playerId?: string; status?: GoalRecord["status"]; teamId?: string }): Promise<GoalRecord[]>;
    byId(id: string): Promise<GoalRecord | undefined>;
    create(input: Omit<GoalRecord, "id" | "createdAt">): Promise<GoalRecord>;
    update(id: string, patch: Partial<Omit<GoalRecord, "id" | "createdAt" | "playerId">>): Promise<GoalRecord | undefined>;
    delete(id: string): Promise<void>;
  };
  missionCompletions: {
    list(filter?: { playerId?: string; missionId?: string }): Promise<MissionCompletionRecord[]>;
    create(input: Omit<MissionCompletionRecord, "id">): Promise<MissionCompletionRecord>;
  };
  missionAssignments: {
    list(filter?: { teamId?: string; playerId?: string; playerIds?: string[]; missionId?: string; open?: boolean }): Promise<MissionAssignmentRecord[]>;
    byId(id: string): Promise<MissionAssignmentRecord | undefined>;
    create(input: Omit<MissionAssignmentRecord, "id" | "assignedAt">): Promise<MissionAssignmentRecord>;
    bulkCreate(rows: Array<Omit<MissionAssignmentRecord, "id" | "assignedAt">>): Promise<MissionAssignmentRecord[]>;
    complete(id: string, at?: string): Promise<MissionAssignmentRecord | undefined>;
    start(id: string, at?: string): Promise<MissionAssignmentRecord | undefined>;
    delete(id: string): Promise<void>;
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
  loginTokens: {
    byHash(tokenHash: string): Promise<LoginTokenRecord | undefined>;
    create(input: Omit<LoginTokenRecord, "id" | "createdAt">): Promise<LoginTokenRecord>;
    /** Marks a token consumed and returns the previous (pre-consumption) record. */
    consume(tokenHash: string, at?: string): Promise<LoginTokenRecord | undefined>;
    purgeExpired(): Promise<number>;
  };
  consents: {
    list(filter?: { playerId?: string; parentEmail?: string; status?: ConsentStatus }): Promise<ConsentRecord[]>;
    byId(id: string): Promise<ConsentRecord | undefined>;
    byTokenHash(tokenHash: string): Promise<ConsentRecord | undefined>;
    byPlayer(playerId: string): Promise<ConsentRecord | undefined>;
    create(input: Omit<ConsentRecord, "id" | "createdAt">): Promise<ConsentRecord>;
    update(id: string, patch: Partial<ConsentRecord>): Promise<ConsentRecord | undefined>;
  };
  fields: {
    list(filter?: { city?: string; state?: string; surface?: string; lights?: boolean; type?: string; query?: string }): Promise<FieldRecord[]>;
    byId(id: string): Promise<FieldRecord | undefined>;
    bySlug(slug: string): Promise<FieldRecord | undefined>;
    upsert(input: Omit<FieldRecord, "id" | "createdAt"> & { id?: string }): Promise<FieldRecord>;
    bulkSeedIfEmpty(records: Array<Omit<FieldRecord, "id" | "createdAt">>): Promise<number>;
  };
  fieldReviews: {
    list(filter?: { fieldId?: string; authorUserId?: string }): Promise<FieldReviewRecord[]>;
    create(input: Omit<FieldReviewRecord, "id" | "createdAt">): Promise<FieldReviewRecord>;
    delete(id: string): Promise<void>;
  };
  fieldBookings: {
    list(filter?: { fieldId?: string; requestedByUserId?: string; status?: FieldBookingStatus }): Promise<FieldBookingRecord[]>;
    byId(id: string): Promise<FieldBookingRecord | undefined>;
    create(input: Omit<FieldBookingRecord, "id" | "createdAt" | "status"> & { status?: FieldBookingStatus }): Promise<FieldBookingRecord>;
    setStatus(id: string, status: FieldBookingStatus): Promise<FieldBookingRecord | undefined>;
  };
  favorites: {
    list(filter: { userId: string; kind?: "field" }): Promise<FavoriteRecord[]>;
    has(userId: string, kind: "field", targetId: string): Promise<boolean>;
    toggle(userId: string, kind: "field", targetId: string): Promise<{ favorited: boolean }>;
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
            (!filter?.teamIds || (p.teamId !== undefined && filter.teamIds.includes(p.teamId))) &&
            (filter?.scheduled === undefined || (filter.scheduled ? Boolean(p.scheduledAt) : !p.scheduledAt))
        );
      },
      byId: async (id) => (await store.read()).plans.find((p) => p.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: PlanRecord = { ...input, id: cid("pln"), createdAt: new Date().toISOString() };
          db.plans.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.plans.find((p) => p.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          const i = db.plans.findIndex((p) => p.id === id);
          if (i >= 0) db.plans.splice(i, 1);
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
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.teams.find((t) => t.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
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
    gameNotes: {
      async list(filter) {
        const all = (await store.read()).gameNotes ?? [];
        return all.filter(
          (n) =>
            (!filter?.gameId || n.gameId === filter.gameId) &&
            (!filter?.teamId || n.teamId === filter.teamId) &&
            (!filter?.playerId || n.playerId === filter.playerId) &&
            (!filter?.authorUserId || n.authorUserId === filter.authorUserId),
        );
      },
      byId: async (id) => ((await store.read()).gameNotes ?? []).find((n) => n.id === id),
      create: (input) =>
        mutate((db) => {
          if (!db.gameNotes) db.gameNotes = [];
          const rec: GameNoteRecord = {
            ...input,
            id: cid("gn"),
            createdAt: new Date().toISOString(),
          };
          db.gameNotes.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          if (!db.gameNotes) db.gameNotes = [];
          const rec = db.gameNotes.find((n) => n.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch, { updatedAt: new Date().toISOString() });
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          if (!db.gameNotes) db.gameNotes = [];
          const i = db.gameNotes.findIndex((n) => n.id === id);
          if (i >= 0) db.gameNotes.splice(i, 1);
        }),
    },
    playerGameStats: {
      async list(filter) {
        const all = (await store.read()).playerGameStats ?? [];
        return all.filter(
          (s) =>
            (!filter?.teamId || s.teamId === filter.teamId) &&
            (!filter?.gameId || s.gameId === filter.gameId) &&
            (!filter?.playerId || s.playerId === filter.playerId),
        );
      },
      byId: async (id) =>
        ((await store.read()).playerGameStats ?? []).find((s) => s.id === id),
      upsert: (input) =>
        mutate((db) => {
          if (!db.playerGameStats) db.playerGameStats = [];
          const existing = db.playerGameStats.find(
            (s) => s.gameId === input.gameId && s.playerId === input.playerId,
          );
          if (existing) {
            Object.assign(existing, input, { updatedAt: new Date().toISOString() });
            return existing;
          }
          const rec: PlayerGameStatsRecord = {
            ...input,
            id: cid("pgs"),
            createdAt: new Date().toISOString(),
          };
          db.playerGameStats.push(rec);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          if (!db.playerGameStats) db.playerGameStats = [];
          const i = db.playerGameStats.findIndex((s) => s.id === id);
          if (i >= 0) db.playerGameStats.splice(i, 1);
        }),
      deleteByGame: (gameId) =>
        mutate((db) => {
          if (!db.playerGameStats) db.playerGameStats = [];
          const before = db.playerGameStats.length;
          db.playerGameStats = db.playerGameStats.filter((s) => s.gameId !== gameId);
          return before - db.playerGameStats.length;
        }),
    },
    metricEntries: {
      async list(filter) {
        const ids = filter?.playerIds ? new Set(filter.playerIds) : undefined;
        return (await store.read()).metricEntries.filter(
          (e) =>
            (!filter?.playerId || e.playerId === filter.playerId) &&
            (!ids || ids.has(e.playerId)) &&
            (!filter?.metricKey || e.metricKey === filter.metricKey)
        );
      },
      byId: async (id) => (await store.read()).metricEntries.find((e) => e.id === id),
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
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.metricEntries.find((e) => e.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
          return rec;
        }),
    },
    goals: {
      async list(filter) {
        const db = await store.read();
        const playerTeam = new Map(db.players.map((p) => [p.id, p.teamId]));
        return db.goals.filter(
          (g) =>
            (!filter?.playerId || g.playerId === filter.playerId) &&
            (!filter?.status || g.status === filter.status) &&
            (!filter?.teamId || playerTeam.get(g.playerId) === filter.teamId)
        );
      },
      byId: async (id) => (await store.read()).goals.find((g) => g.id === id),
      create: (input) =>
        mutate((db) => {
          const rec: GoalRecord = { ...input, id: cid("gl"), createdAt: new Date().toISOString() };
          db.goals.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          const rec = db.goals.find((g) => g.id === id);
          if (!rec) return undefined;
          Object.assign(rec, patch);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          const i = db.goals.findIndex((g) => g.id === id);
          if (i >= 0) db.goals.splice(i, 1);
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
    missionAssignments: {
      async list(filter) {
        const all = (await store.read()).missionAssignments ?? [];
        return all.filter((a) => {
          if (filter?.teamId && a.teamId !== filter.teamId) return false;
          if (filter?.playerId && a.playerId !== filter.playerId) return false;
          if (filter?.playerIds && !filter.playerIds.includes(a.playerId)) return false;
          if (filter?.missionId && a.missionId !== filter.missionId) return false;
          if (filter?.open === true && a.completedAt) return false;
          if (filter?.open === false && !a.completedAt) return false;
          return true;
        });
      },
      byId: async (id) => ((await store.read()).missionAssignments ?? []).find((a) => a.id === id),
      create: (input) =>
        mutate((db) => {
          if (!db.missionAssignments) db.missionAssignments = [];
          const rec: MissionAssignmentRecord = {
            ...input,
            id: cid("ma"),
            assignedAt: new Date().toISOString(),
          };
          db.missionAssignments.push(rec);
          return rec;
        }),
      bulkCreate: (rows) =>
        mutate((db) => {
          if (!db.missionAssignments) db.missionAssignments = [];
          const out: MissionAssignmentRecord[] = [];
          for (const input of rows) {
            const rec: MissionAssignmentRecord = {
              ...input,
              id: cid("ma"),
              assignedAt: new Date().toISOString(),
            };
            db.missionAssignments.push(rec);
            out.push(rec);
          }
          return out;
        }),
      complete: (id, at) =>
        mutate((db) => {
          if (!db.missionAssignments) db.missionAssignments = [];
          const rec = db.missionAssignments.find((a) => a.id === id);
          if (!rec) return undefined;
          rec.completedAt = at ?? new Date().toISOString();
          rec.status = "completed";
          return rec;
        }),
      start: (id, at) =>
        mutate((db) => {
          if (!db.missionAssignments) db.missionAssignments = [];
          const rec = db.missionAssignments.find((a) => a.id === id);
          if (!rec) return undefined;
          if (!rec.startedAt) rec.startedAt = at ?? new Date().toISOString();
          if (!rec.completedAt) rec.status = "in_progress";
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          if (!db.missionAssignments) db.missionAssignments = [];
          const i = db.missionAssignments.findIndex((a) => a.id === id);
          if (i >= 0) db.missionAssignments.splice(i, 1);
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
    loginTokens: {
      byHash: async (tokenHash) => ((await store.read()).loginTokens ?? []).find((t) => t.tokenHash === tokenHash),
      create: (input) =>
        mutate((db) => {
          if (!db.loginTokens) db.loginTokens = [];
          const rec: LoginTokenRecord = {
            id: cid("ltok"),
            createdAt: new Date().toISOString(),
            ...input,
          };
          db.loginTokens.push(rec);
          return rec;
        }),
      consume: (tokenHash, at) =>
        mutate((db) => {
          if (!db.loginTokens) db.loginTokens = [];
          const i = db.loginTokens.findIndex((t) => t.tokenHash === tokenHash);
          if (i < 0) return undefined;
          const rec = db.loginTokens[i]!;
          if (rec.consumedAt) return undefined;
          if (Date.parse(rec.expiresAt) <= Date.now()) return undefined;
          const updated: LoginTokenRecord = { ...rec, consumedAt: at ?? new Date().toISOString() };
          db.loginTokens[i] = updated;
          return rec;
        }),
      purgeExpired() {
        return mutate((db) => {
          if (!db.loginTokens) {
            db.loginTokens = [];
            return 0;
          }
          const now = Date.now();
          const before = db.loginTokens.length;
          // Keep consumed ones for 24h so audit trail stays meaningful; purge clearly-stale only.
          db.loginTokens = db.loginTokens.filter(
            (t) => Date.parse(t.expiresAt) > now - 86_400_000,
          );
          return before - db.loginTokens.length;
        });
      },
    },
    consents: {
      async list(filter) {
        const all = (await store.read()).consents ?? [];
        return all.filter(
          (c) =>
            (!filter?.playerId || c.playerId === filter.playerId) &&
            (!filter?.parentEmail || c.parentEmail.toLowerCase() === filter.parentEmail.toLowerCase()) &&
            (!filter?.status || c.status === filter.status),
        );
      },
      byId: async (id) => ((await store.read()).consents ?? []).find((c) => c.id === id),
      byTokenHash: async (tokenHash) =>
        ((await store.read()).consents ?? []).find((c) => c.tokenHash === tokenHash),
      async byPlayer(playerId) {
        const all = ((await store.read()).consents ?? []).filter((c) => c.playerId === playerId);
        // Prefer a granted record, else the most recent.
        return (
          all.find((c) => c.status === "granted") ??
          all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        );
      },
      create: (input) =>
        mutate((db) => {
          if (!db.consents) db.consents = [];
          const rec: ConsentRecord = {
            id: cid("consent"),
            createdAt: new Date().toISOString(),
            ...input,
          };
          db.consents.push(rec);
          return rec;
        }),
      update: (id, patch) =>
        mutate((db) => {
          if (!db.consents) db.consents = [];
          const i = db.consents.findIndex((c) => c.id === id);
          if (i < 0) return undefined;
          const updated: ConsentRecord = { ...db.consents[i]!, ...patch, id };
          db.consents[i] = updated;
          return updated;
        }),
    },
    fields: {
      async list(filter) {
        const all = (await store.read()).fields ?? [];
        const q = filter?.query?.trim().toLowerCase();
        return all.filter(
          (f) =>
            (!filter?.city || f.city.toLowerCase() === filter.city.toLowerCase()) &&
            (!filter?.state || f.state.toLowerCase() === filter.state.toLowerCase()) &&
            (!filter?.surface || f.surface === filter.surface) &&
            (!filter?.type || f.type === filter.type) &&
            (filter?.lights === undefined || f.lights === filter.lights) &&
            (!q ||
              f.name.toLowerCase().includes(q) ||
              f.city.toLowerCase().includes(q) ||
              f.slug.toLowerCase().includes(q))
        );
      },
      byId: async (id) => ((await store.read()).fields ?? []).find((f) => f.id === id),
      bySlug: async (slug) => ((await store.read()).fields ?? []).find((f) => f.slug === slug),
      upsert: (input) =>
        mutate((db) => {
          if (!db.fields) db.fields = [];
          const existing =
            (input.id && db.fields.find((f) => f.id === input.id)) ||
            db.fields.find((f) => f.slug === input.slug);
          if (existing) {
            Object.assign(existing, input);
            return existing;
          }
          const rec: FieldRecord = {
            ...input,
            id: input.id ?? cid("fld"),
            createdAt: new Date().toISOString(),
          };
          db.fields.push(rec);
          return rec;
        }),
      bulkSeedIfEmpty: (records) =>
        mutate((db) => {
          if (!db.fields) db.fields = [];
          if (db.fields.length > 0) return 0;
          for (const r of records) {
            db.fields.push({ ...r, id: cid("fld"), createdAt: new Date().toISOString() });
          }
          return records.length;
        }),
    },
    fieldReviews: {
      async list(filter) {
        const all = (await store.read()).fieldReviews ?? [];
        return all.filter(
          (r) =>
            (!filter?.fieldId || r.fieldId === filter.fieldId) &&
            (!filter?.authorUserId || r.authorUserId === filter.authorUserId)
        );
      },
      create: (input) =>
        mutate((db) => {
          if (!db.fieldReviews) db.fieldReviews = [];
          const rec: FieldReviewRecord = {
            ...input,
            id: cid("frv"),
            createdAt: new Date().toISOString(),
          };
          db.fieldReviews.push(rec);
          return rec;
        }),
      delete: (id) =>
        mutate((db) => {
          if (!db.fieldReviews) db.fieldReviews = [];
          const i = db.fieldReviews.findIndex((r) => r.id === id);
          if (i >= 0) db.fieldReviews.splice(i, 1);
        }),
    },
    fieldBookings: {
      async list(filter) {
        const all = (await store.read()).fieldBookings ?? [];
        return all.filter(
          (b) =>
            (!filter?.fieldId || b.fieldId === filter.fieldId) &&
            (!filter?.requestedByUserId || b.requestedByUserId === filter.requestedByUserId) &&
            (!filter?.status || b.status === filter.status)
        );
      },
      byId: async (id) => ((await store.read()).fieldBookings ?? []).find((b) => b.id === id),
      create: (input) =>
        mutate((db) => {
          if (!db.fieldBookings) db.fieldBookings = [];
          const rec: FieldBookingRecord = {
            ...input,
            status: input.status ?? "requested",
            id: cid("fbk"),
            createdAt: new Date().toISOString(),
          };
          db.fieldBookings.push(rec);
          return rec;
        }),
      setStatus: (id, status) =>
        mutate((db) => {
          if (!db.fieldBookings) db.fieldBookings = [];
          const rec = db.fieldBookings.find((b) => b.id === id);
          if (!rec) return undefined;
          rec.status = status;
          return rec;
        }),
    },
    favorites: {
      async list(filter) {
        const all = (await store.read()).favorites ?? [];
        return all.filter(
          (f) => f.userId === filter.userId && (!filter.kind || f.kind === filter.kind)
        );
      },
      async has(userId, kind, targetId) {
        const all = (await store.read()).favorites ?? [];
        return all.some((f) => f.userId === userId && f.kind === kind && f.targetId === targetId);
      },
      toggle: (userId, kind, targetId) =>
        mutate((db) => {
          if (!db.favorites) db.favorites = [];
          const i = db.favorites.findIndex(
            (f) => f.userId === userId && f.kind === kind && f.targetId === targetId
          );
          if (i >= 0) {
            db.favorites.splice(i, 1);
            return { favorited: false };
          }
          db.favorites.push({
            id: cid("fav"),
            userId,
            kind,
            targetId,
            createdAt: new Date().toISOString(),
          });
          return { favorited: true };
        }),
    },
  };
}
