import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InMemoryStore, JsonFileStore, KvJsonStore, makeRepos } from "./index";

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
  it("persists across instances", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    await a.users.upsert({ email: "x@y.com", role: "coach" });
    const b = makeRepos(new JsonFileStore(file));
    expect(await b.users.byEmail("x@y.com")).toBeDefined();
  });
  it("atomic write leaves no .tmp file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    await a.users.upsert({ email: "z@z.com", role: "coach" });
    expect(fs.existsSync(file + ".tmp")).toBe(false);
  });
});

describe("KvJsonStore", () => {
  it("retries concurrent mutations instead of losing an update", async () => {
    let value: string | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/get/")) {
        return Response.json({ result: value });
      }
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      expect(command[0]).toBe("EVAL");
      const expected = String(command[4]);
      const next = String(command[5]);
      if ((value ?? "") !== expected) return Response.json({ result: 0 });
      value = next;
      return Response.json({ result: 1 });
    };

    try {
      const store = new KvJsonStore({ url: "https://kv.test", token: "test" });
      const a = makeRepos(store);
      const b = makeRepos(store);
      await Promise.all([
        a.users.upsert({ email: "first@example.com", role: "coach" }),
        b.users.upsert({ email: "second@example.com", role: "parent" }),
      ]);
      expect((await store.read()).users.map((user) => user.email).sort()).toEqual([
        "first@example.com",
        "second@example.com",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails closed when the stored database is corrupt", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ result: "not-json" });
    try {
      const store = new KvJsonStore({ url: "https://kv.test", token: "test" });
      await expect(store.read()).rejects.toThrow("invalid JSON");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
