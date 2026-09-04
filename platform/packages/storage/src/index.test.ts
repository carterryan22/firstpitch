import { afterEach, describe, it, expect, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { gzipSync } from "node:zlib";
import { EMPTY_DB, InMemoryStore, JsonFileStore, KvJsonStore, makeRepos } from "./index";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});

describe("InMemoryStore + repos", () => {
  it("isolates default state between store instances", async () => {
    const first = makeRepos(new InMemoryStore());
    const second = makeRepos(new InMemoryStore());
    await first.users.upsert({ email: "isolated@example.com", role: "coach" });
    expect(await second.users.list()).toEqual([]);
  });
  it("creates and lists users", async () => {
    const repos = makeRepos(new InMemoryStore());
    const u = await repos.users.upsert({ email: "a@b.com", role: "coach" });
    expect(u.id).toMatch(/^usr_/);
    expect((await repos.users.byEmail("A@B.com"))?.id).toBe(u.id);
  });
  it("upsert is idempotent by email", async () => {
    const repos = makeRepos(new InMemoryStore());
    await repos.users.upsert({ email: "a@b.com", role: "coach", name: "First" });
    await repos.users.upsert({ email: "a@b.com", role: "coach", name: "Second" });
    expect(await repos.users.list()).toHaveLength(1);
    expect((await repos.users.byEmail("a@b.com"))?.name).toBe("Second");
  });
  it("creates plans and filters by team", async () => {
    const repos = makeRepos(new InMemoryStore());
    await repos.plans.create({ name: "A", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: "t1" });
    await repos.plans.create({ name: "B", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: "t2" });
    expect(await repos.plans.list({ teamId: "t1" })).toHaveLength(1);
  });
  it("metric entries bulk create + filter", async () => {
    const repos = makeRepos(new InMemoryStore());
    await repos.metricEntries.bulkCreate([
      { playerId: "p1", metricKey: "EV_TEE", value: 55, recordedAt: new Date().toISOString(), verificationState: "device_captured" },
      { playerId: "p1", metricKey: "BAT_SPEED", value: 60, recordedAt: new Date().toISOString(), verificationState: "device_captured" },
      { playerId: "p2", metricKey: "EV_TEE", value: 50, recordedAt: new Date().toISOString(), verificationState: "self_entered" },
    ]);
    expect(await repos.metricEntries.list({ playerId: "p1" })).toHaveLength(2);
    expect(await repos.metricEntries.list({ metricKey: "EV_TEE" })).toHaveLength(2);
  });
  it("sessions expire", async () => {
    const repos = makeRepos(new InMemoryStore());
    const s = await repos.sessions.create("u1", -1000);
    expect(await repos.sessions.byId(s.id)).toBeDefined();
    const purged = await repos.sessions.purgeExpired();
    expect(purged).toBe(1);
    expect(await repos.sessions.byId(s.id)).toBeUndefined();
  });
  it("audit log appends", async () => {
    const repos = makeRepos(new InMemoryStore());
    await repos.audit.log({ userId: "u1", action: "compile_plan", resource: "plan:p1" });
    expect(await repos.audit.list({ userId: "u1" })).toHaveLength(1);
  });
  it("teams + memberships scope plan visibility", async () => {
    const repos = makeRepos(new InMemoryStore());
    const coach = await repos.users.upsert({ email: "c@x.com", role: "coach" });
    const parent = await repos.users.upsert({ email: "p@x.com", role: "parent" });
    const team = await repos.teams.create({
      name: "Coast Diamondbacks 11U",
      slug: "coast-diamondbacks-11u",
      ageBand: "9-12",
      ownerCoachUserId: coach.id,
    });
    await repos.teamMemberships.upsert({ teamId: team.id, userId: coach.id, role: "coach" });
    await repos.teamMemberships.upsert({ teamId: team.id, userId: parent.id, role: "parent" });
    expect((await repos.teams.bySlug("coast-diamondbacks-11u"))?.id).toBe(team.id);
    expect(await repos.teamMemberships.list({ userId: parent.id })).toHaveLength(1);

    await repos.plans.create({
      name: "Tue practice", ageBand: "9-12", durationMin: 60, blocks: [],
      createdByUserId: coach.id, teamId: team.id,
    });
    const parentTeamIds = (await repos.teamMemberships.list({ userId: parent.id })).map((m) => m.teamId);
    expect(await repos.plans.list({ teamIds: parentTeamIds })).toHaveLength(1);
    await repos.teamMemberships.upsert({ teamId: team.id, userId: parent.id, role: "parent" });
    expect(await repos.teamMemberships.list({ teamId: team.id })).toHaveLength(2);
  });
});

describe("JsonFileStore", () => {
  it("retries a transient Windows rename denial without losing the mutation", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const repos = makeRepos(new JsonFileStore(file));
    await repos.users.upsert({ email: "existing@example.com", role: "coach" });
    vi.mocked(fs.renameSync).mockImplementationOnce(() => {
      expect(JSON.parse(fs.readFileSync(file, "utf8")).users).toHaveLength(1);
      throw Object.assign(new Error("file briefly open"), { code: "EPERM" });
    });
    await repos.users.upsert({ email: "new@example.com", role: "parent" });
    expect(await repos.users.list()).toHaveLength(2);
    expect(fs.readdirSync(dir).filter((name) => name.endsWith(".tmp") || name.endsWith(".lock"))).toEqual([]);
  });
  it("persists across instances", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    await a.users.upsert({ email: "x@y.com", role: "coach" });
    const b = makeRepos(new JsonFileStore(file));
    expect(await b.users.byEmail("x@y.com")).toBeDefined();
  });
  it("refreshes existing instances and preserves concurrent mutations", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    const b = makeRepos(new JsonFileStore(file));
    await a.users.upsert({ email: "first@example.com", role: "coach" });
    expect(await b.users.byEmail("first@example.com")).toBeDefined();
    await Promise.all([
      a.users.upsert({ email: "second@example.com", role: "parent" }),
      b.users.upsert({ email: "third@example.com", role: "player" }),
    ]);
    expect((await a.users.list()).map((user) => user.email).sort()).toEqual([
      "first@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });
  it("atomic write leaves no .tmp file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    await a.users.upsert({ email: "z@z.com", role: "coach" });
    expect(fs.existsSync(file + ".tmp")).toBe(false);
  });
});

/** Upstash stores a POST /set/key body verbatim, not body.value. */
function mockKv(initial: string | null = null) {
  const state = {
    value: initial,
    lockToken: null as string | null,
    rejectedCommits: 0,
    beforeRead: undefined as (() => Promise<void>) | undefined,
  };
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/get/")) {
      const snapshot = state.value;
      await state.beforeRead?.();
      return Response.json({ result: snapshot });
    }
    if (url.includes("/set/")) {
      state.value = String(init?.body);
      return Response.json({ result: "OK" });
    }
    const command = JSON.parse(String(init?.body)) as Array<string | number>;
    if (command[0] === "SET") {
      if (state.lockToken) return Response.json({ result: null });
      state.lockToken = String(command[2]);
      return Response.json({ result: "OK" });
    }
    expect(command[0]).toBe("EVAL");
    if (command[2] === 2) {
      if (state.lockToken !== command[5]) {
        state.rejectedCommits += 1;
        return Response.json({ result: 0 });
      }
      state.value = String(command[6]);
      state.lockToken = null;
      return Response.json({ result: 1 });
    }
    if (state.lockToken === command[4]) state.lockToken = null;
    return Response.json({ result: 1 });
  });
  return state;
}

describe("KvJsonStore", () => {
  afterEach(() => vi.unstubAllGlobals());
  const newStore = () => new KvJsonStore({ url: "https://kv.test", token: "test" });

  it("round-trips writes using the provider's raw-value semantics", async () => {
    const state = mockKv();
    const repos = makeRepos(newStore());
    await repos.users.upsert({ email: "persist@example.com", role: "coach" });
    expect((await makeRepos(newStore()).users.list()).map((user) => user.email)).toEqual(["persist@example.com"]);
    expect(state.value?.startsWith("gz:")).toBe(true);
  });

  it("retries concurrent mutations instead of losing an update", async () => {
    mockKv();
    const a = makeRepos(newStore());
    const b = makeRepos(newStore());
    await Promise.all([
      a.users.upsert({ email: "first@example.com", role: "coach" }),
      b.users.upsert({ email: "second@example.com", role: "parent" }),
    ]);
    expect((await a.users.list()).map((user) => user.email).sort()).toEqual([
      "first@example.com", "second@example.com",
    ]);
  });

  it("rejects a stale lease and re-applies the mutation to the newer database", async () => {
    const state = mockKv();
    let readStarted!: () => void;
    let releaseRead!: () => void;
    const started = new Promise<void>((resolve) => { readStarted = resolve; });
    const barrier = new Promise<void>((resolve) => { releaseRead = resolve; });
    state.beforeRead = async () => {
      state.beforeRead = undefined;
      readStarted();
      await barrier;
    };
    const a = makeRepos(newStore());
    const b = makeRepos(newStore());
    const delayed = a.users.upsert({ email: "slow@example.com", role: "coach" });
    await started;
    state.lockToken = null; // Redis expired the lease while GET was delayed.
    await b.users.upsert({ email: "fast@example.com", role: "parent" });
    releaseRead();
    const saved = await delayed;
    expect(state.rejectedCommits).toBe(1);
    expect((await a.users.list()).map((user) => user.email).sort()).toEqual([
      "fast@example.com", "slow@example.com",
    ]);
    expect((await a.users.byEmail("slow@example.com"))?.id).toBe(saved.id);
  });

  it.each(["plain", "compressed", "wrapped-plain", "wrapped-compressed"])("reads %s legacy data and migrates on mutation", async (format) => {
    const db = { ...structuredClone(EMPTY_DB), users: [{ id: "legacy", email: "legacy@example.com", role: "coach", createdAt: "2026-01-01" }] };
    const json = JSON.stringify(db);
    let stored = format.endsWith("compressed") ? `gz:${gzipSync(json).toString("base64")}` : json;
    if (format.startsWith("wrapped")) stored = JSON.stringify({ value: stored });
    const state = mockKv(stored);
    const repos = makeRepos(newStore());
    expect((await repos.users.list()).map((user) => user.id)).toEqual(["legacy"]);
    expect(state.value).toBe(stored); // Reads never rewrite the source value.
    await repos.users.upsert({ email: "new@example.com", role: "parent" });
    expect(state.value?.startsWith("gz:")).toBe(true);
    expect(await repos.users.list()).toHaveLength(2);
  });

  it.each(["not-json", "", "null", "[]", "{}", '{"users":null}', '{"users":{},"teams":[]}', '{"value":"{}","users":[]}'])("refuses to overwrite malformed or ambiguous data: %s", async (raw) => {
    const state = mockKv(raw);
    await expect(makeRepos(newStore()).users.upsert({ email: "new@example.com", role: "coach" })).rejects.toThrow("invalid JSON or schema");
    expect(state.value).toBe(raw);
    expect(state.lockToken).toBeNull();
  });

  it("round-trips the public write method through the same commit protection", async () => {
    mockKv();
    const store = newStore();
    await store.write(structuredClone(EMPTY_DB));
    expect(await store.read()).toEqual(EMPTY_DB);
  });

  it("rejects provider errors instead of treating them as an empty database", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "WRONGTYPE" }));
    await expect(newStore().read()).rejects.toThrow("KV command failed");
  });
});
