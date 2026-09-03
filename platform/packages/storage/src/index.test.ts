import { afterEach, describe, it, expect, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InMemoryStore, JsonFileStore, KvJsonStore, makeRepos } from "./index";

describe("InMemoryStore + repos", () => {
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
  afterEach(() => vi.unstubAllGlobals());

  function fakeRedis(seed?: Record<string, string>) {
    const values = new Map<string, string>(Object.entries(seed ?? {}));
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      const name = String(command[0]).toUpperCase();
      const key = String(command[1]);
      let result: unknown;

      if (name === "GET") {
        await new Promise((resolve) => setTimeout(resolve, 2));
        result = values.get(key) ?? null;
      } else if (name === "SET") {
        const value = String(command[2]);
        const onlyIfMissing = command[3] === "NX";
        if (onlyIfMissing && values.has(key)) result = null;
        else {
          // Redis evaluates SET NX atomically. Record the lock before yielding
          // so concurrent fake requests cannot all observe it as absent.
          values.set(key, value);
          await new Promise((resolve) => setTimeout(resolve, 2));
          result = "OK";
        }
      } else if (name === "EVAL") {
        const script = String(command[1]);
        const lockKey = String(command[3]);
        const commit = script.includes('redis.call("set"');
        const token = String(command[commit ? 5 : 4]);
        if (values.get(lockKey) !== token) result = 0;
        else {
          if (commit) values.set(String(command[4]), String(command[6]));
          values.delete(lockKey);
          result = 1;
        }
      } else {
        return new Response(JSON.stringify({ error: `unsupported ${name}` }), { status: 400 });
      }

      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    return { values, fetchMock };
  }

  it("serializes parallel repository mutations without losing records", async () => {
    fakeRedis();
    const repos = makeRepos(new KvJsonStore({ url: "https://kv.test", token: "test" }));

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        repos.teams.create({
          name: `Team ${index}`,
          slug: `team-${index}`,
          ageBand: "9-12",
          ownerCoachUserId: `coach-${index}`,
        }),
      ),
    );

    expect(await repos.teams.list()).toHaveLength(12);
  });

  it("reads the legacy wrapped value and migrates it on write", async () => {
    const legacyDb = JSON.stringify({
      value: JSON.stringify({
        users: [{ id: "usr_legacy", email: "legacy@example.com", role: "coach", createdAt: "2026-01-01" }],
      }),
    });
    const { values } = fakeRedis({ "platform:db": legacyDb });
    const store = new KvJsonStore({ url: "https://kv.test", token: "test" });
    const repos = makeRepos(store);

    expect((await repos.users.byEmail("legacy@example.com"))?.id).toBe("usr_legacy");
    await repos.users.upsert({ email: "new@example.com", role: "parent" });

    const persisted = JSON.parse(values.get("platform:db") ?? "{}") as { users?: unknown[]; value?: unknown };
    expect(persisted.users).toHaveLength(2);
    expect(persisted.value).toBeUndefined();
  });

  it("fails closed without overwriting malformed database JSON", async () => {
    const { values } = fakeRedis({ "platform:db": "not-json" });
    const repos = makeRepos(new KvJsonStore({ url: "https://kv.test", token: "test" }));

    await expect(
      repos.teams.create({
        name: "Must not persist",
        slug: "must-not-persist",
        ageBand: "9-12",
        ownerCoachUserId: "coach-1",
      }),
    ).rejects.toThrow("KV database value is not valid JSON");
    expect(values.get("platform:db")).toBe("not-json");
  });

  it("supersedes pending consent and links the replacement atomically", async () => {
    const repos = makeRepos(new InMemoryStore());
    const player = await repos.players.create({
      firstName: "Casey",
      lastName: "Catcher",
      ageBand: "9-12",
      sport: "baseball",
      positions: ["C"],
    });
    const base = {
      playerId: player.id,
      parentEmail: "parent@example.com",
      status: "pending" as const,
      policyVersion: "test",
    };
    const first = await repos.consents.createAndLinkPlayer({ ...base, tokenHash: "first" });
    const second = await repos.consents.createAndLinkPlayer({ ...base, tokenHash: "second" });

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect((await repos.consents.byId(first!.id))?.status).toBe("revoked");
    expect(await repos.consents.byTokenHash("first")).toBeUndefined();
    expect((await repos.players.byId(player.id))?.consentId).toBe(second!.id);
  });
});
