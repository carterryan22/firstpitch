import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryStore, makeRepos } from "@platform/storage";

let repos: ReturnType<typeof makeRepos>;
beforeEach(() => {
  repos = makeRepos(new InMemoryStore());
});

describe("missionAssignments repo", () => {
  it("bulkCreate + complete + list filter", async () => {
    const created = await repos.missionAssignments.bulkCreate([
      { teamId: "t1", playerId: "p1", missionId: "M_X", assignedByUserId: "u1" },
      { teamId: "t1", playerId: "p2", missionId: "M_X", assignedByUserId: "u1" },
    ]);
    expect(created).toHaveLength(2);
    expect(created[0]!.id).not.toEqual(created[1]!.id);
    expect(created[0]!.assignedAt).toBeDefined();

    const open = await repos.missionAssignments.list({ teamId: "t1", open: true });
    expect(open).toHaveLength(2);

    await repos.missionAssignments.complete(created[0]!.id);
    const open2 = await repos.missionAssignments.list({ teamId: "t1", open: true });
    expect(open2).toHaveLength(1);
    expect(open2[0]!.playerId).toBe("p2");

    const byPlayerIds = await repos.missionAssignments.list({ playerIds: ["p1"] });
    expect(byPlayerIds).toHaveLength(1);
    expect(byPlayerIds[0]!.completedAt).toBeDefined();
  });

  it("complete is idempotent-friendly (sets completedAt only once unless called again)", async () => {
    const a = await repos.missionAssignments.create({
      teamId: "t1",
      playerId: "p1",
      missionId: "M_X",
      assignedByUserId: "u1",
    });
    const r1 = await repos.missionAssignments.complete(a.id, "2026-01-01T00:00:00.000Z");
    expect(r1?.completedAt).toBe("2026-01-01T00:00:00.000Z");
    const r2 = await repos.missionAssignments.complete(a.id, "2026-02-01T00:00:00.000Z");
    expect(r2?.completedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("delete removes the assignment", async () => {
    const a = await repos.missionAssignments.create({
      teamId: "t1",
      playerId: "p1",
      missionId: "M_X",
      assignedByUserId: "u1",
    });
    await repos.missionAssignments.delete(a.id);
    expect(await repos.missionAssignments.byId(a.id)).toBeUndefined();
  });
});
