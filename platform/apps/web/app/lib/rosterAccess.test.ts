import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { __resetReposForTests, getRepos, type Role } from "@platform/storage";
import { GET } from "../api/teams/[id]/players/route";
import { getSession } from "./session";

vi.mock("./session", () => ({ getSession: vi.fn() }));

describe("full roster endpoint authorization", () => {
  beforeEach(() => {
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("PLATFORM_DATA_DIR", "");
    __resetReposForTests();
    vi.mocked(getSession).mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); __resetReposForTests(); });

  it.each([
    { role: "coach", member: true, expected: 200 },
    { role: "parent", member: true, expected: 403 },
    { role: "player", member: true, expected: 403 },
    { role: "coach", member: false, expected: 403 },
    { role: null, member: false, expected: 401 },
  ])("$role membership=$member receives $expected", async ({ role, member, expected }) => {
    const repos = getRepos();
    const owner = await repos.users.upsert({ email: "owner@example.test", role: "coach" });
    const team = await repos.teams.create({ name: "Private team", slug: "private", ageBand: "9-12", ownerCoachUserId: owner.id });
    const child = await repos.players.create({ teamId: team.id, firstName: "PrivateChild", lastName: "Example", dob: "2014-05-10", ageBand: "9-12", sport: "baseball", positions: [], injuryNote: "private injury", notes: "private coach note" });
    if (role) {
      const user = await repos.users.upsert({ email: "caller@example.test", role: role as Role });
      if (member) await repos.teamMemberships.upsert({ teamId: team.id, userId: user.id, role: role as "coach" | "parent" | "player", playerId: role === "coach" ? undefined : child.id });
      vi.mocked(getSession).mockResolvedValue({ user, sessionId: "session", cookieValue: "cookie" });
    } else {
      vi.mocked(getSession).mockResolvedValue(null);
    }
    const response = await GET(new NextRequest(`http://localhost/api/teams/${team.id}/players`), { params: Promise.resolve({ id: team.id }) });
    expect(response.status).toBe(expected);
    const body = await response.text();
    if (expected === 200) {
      expect(JSON.parse(body).players).toHaveLength(1);
      expect(body).toContain("private coach note");
    } else {
      for (const secret of [child.id, child.firstName, child.dob, child.injuryNote, child.notes]) {
        expect(body).not.toContain(secret!);
      }
    }
  });
});
