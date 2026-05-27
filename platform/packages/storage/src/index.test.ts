import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InMemoryStore, JsonFileStore, makeRepos } from "./index";

describe("InMemoryStore + repos", () => {
  it("creates and lists users", () => {
    const repos = makeRepos(new InMemoryStore());
    const u = repos.users.upsert({ email: "a@b.com", role: "coach" });
    expect(u.id).toMatch(/^usr_/);
    expect(repos.users.byEmail("A@B.com")?.id).toBe(u.id);
  });
  it("upsert is idempotent by email", () => {
    const repos = makeRepos(new InMemoryStore());
    repos.users.upsert({ email: "a@b.com", role: "coach", name: "First" });
    repos.users.upsert({ email: "a@b.com", role: "coach", name: "Second" });
    expect(repos.users.list()).toHaveLength(1);
    expect(repos.users.byEmail("a@b.com")?.name).toBe("Second");
  });
  it("creates plans and filters by team", () => {
    const repos = makeRepos(new InMemoryStore());
    repos.plans.create({ name: "A", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: "t1" });
    repos.plans.create({ name: "B", ageBand: "9-12", durationMin: 60, blocks: [], createdByUserId: "u1", teamId: "t2" });
    expect(repos.plans.list({ teamId: "t1" })).toHaveLength(1);
  });
  it("metric entries bulk create + filter", () => {
    const repos = makeRepos(new InMemoryStore());
    repos.metricEntries.bulkCreate([
      { playerId: "p1", metricKey: "EV_TEE", value: 55, recordedAt: new Date().toISOString(), verificationState: "device_captured" },
      { playerId: "p1", metricKey: "BAT_SPEED", value: 60, recordedAt: new Date().toISOString(), verificationState: "device_captured" },
      { playerId: "p2", metricKey: "EV_TEE", value: 50, recordedAt: new Date().toISOString(), verificationState: "self_entered" },
    ]);
    expect(repos.metricEntries.list({ playerId: "p1" })).toHaveLength(2);
    expect(repos.metricEntries.list({ metricKey: "EV_TEE" })).toHaveLength(2);
  });
  it("sessions expire", () => {
    const repos = makeRepos(new InMemoryStore());
    const s = repos.sessions.create("u1", -1000);
    expect(repos.sessions.byId(s.id)).toBeDefined();
    const purged = repos.sessions.purgeExpired();
    expect(purged).toBe(1);
    expect(repos.sessions.byId(s.id)).toBeUndefined();
  });
  it("audit log appends", () => {
    const repos = makeRepos(new InMemoryStore());
    repos.audit.log({ userId: "u1", action: "compile_plan", resource: "plan:p1" });
    expect(repos.audit.list({ userId: "u1" })).toHaveLength(1);
  });
  it("teams + memberships scope plan visibility", () => {
    const repos = makeRepos(new InMemoryStore());
    const coach = repos.users.upsert({ email: "c@x.com", role: "coach" });
    const parent = repos.users.upsert({ email: "p@x.com", role: "parent" });
    const team = repos.teams.create({
      name: "Coast Diamondbacks 11U",
      slug: "coast-diamondbacks-11u",
      ageBand: "9-12",
      ownerCoachUserId: coach.id,
    });
    repos.teamMemberships.upsert({ teamId: team.id, userId: coach.id, role: "coach" });
    repos.teamMemberships.upsert({ teamId: team.id, userId: parent.id, role: "parent" });
    expect(repos.teams.bySlug("coast-diamondbacks-11u")?.id).toBe(team.id);
    expect(repos.teamMemberships.list({ userId: parent.id })).toHaveLength(1);

    repos.plans.create({
      name: "Tue practice", ageBand: "9-12", durationMin: 60, blocks: [],
      createdByUserId: coach.id, teamId: team.id,
    });
    const parentTeamIds = repos.teamMemberships.list({ userId: parent.id }).map((m) => m.teamId);
    expect(repos.plans.list({ teamIds: parentTeamIds })).toHaveLength(1);
    // upsert is idempotent on (team, user)
    repos.teamMemberships.upsert({ teamId: team.id, userId: parent.id, role: "parent" });
    expect(repos.teamMemberships.list({ teamId: team.id })).toHaveLength(2);
  });
});

describe("JsonFileStore", () => {
  it("persists across instances", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    a.users.upsert({ email: "x@y.com", role: "coach" });
    const b = makeRepos(new JsonFileStore(file));
    expect(b.users.byEmail("x@y.com")).toBeDefined();
  });
  it("atomic write leaves no .tmp file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plat-"));
    const file = path.join(dir, "db.json");
    const a = makeRepos(new JsonFileStore(file));
    a.users.upsert({ email: "z@z.com", role: "coach" });
    expect(fs.existsSync(file + ".tmp")).toBe(false);
  });
});
