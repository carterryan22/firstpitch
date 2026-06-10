import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryStore, makeRepos, type ParentReportContent } from "@platform/storage";

let repos: ReturnType<typeof makeRepos>;
beforeEach(() => {
  // Seed a fresh array — InMemoryStore shallow-copies EMPTY_DB, so its array
  // refs are shared across instances unless explicitly overridden.
  repos = makeRepos(new InMemoryStore({ parentReports: [] }));
});

function content(over: Partial<ParentReportContent> = {}): ParentReportContent {
  return {
    summary: "Great month",
    attendance: "Made 7 of 8 team events.",
    effort: "Brings energy.",
    focus: "Quicker first step.",
    homeMission: "Home mission: 10 min of catch, 3x/week.",
    playingTime: "Played about 12 innings across 3 games.",
    coachNote: "Proud of the effort!",
    ...over,
  };
}

async function seedDraft(over: Partial<Parameters<typeof repos.parentReports.create>[0]> = {}) {
  return repos.parentReports.create({
    teamId: "t1",
    playerId: "p1",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    periodLabel: "May 2026",
    status: "draft",
    generated: content(),
    content: content(),
    generatedByUserId: "u1",
    ...over,
  });
}

describe("parentReports repo", () => {
  it("creates a draft and finds it for the period (idempotency key)", async () => {
    const r = await seedDraft();
    expect(r.status).toBe("draft");
    expect(r.id).toMatch(/^prpt_/);
    const found = await repos.parentReports.findForPeriod("p1", "2026-05-01");
    expect(found?.id).toBe(r.id);
    expect(await repos.parentReports.findForPeriod("p1", "2026-04-01")).toBeUndefined();
  });

  it("edit mutates content but leaves the generated snapshot intact", async () => {
    const r = await seedDraft();
    const edited = await repos.parentReports.update(r.id, {
      content: content({ coachNote: "Reworded by coach." }),
      editedAt: "2026-06-02T00:00:00.000Z",
      editedByUserId: "u1",
    });
    expect(edited?.content.coachNote).toBe("Reworded by coach.");
    // Original system draft is preserved for diffing.
    expect(edited?.generated.coachNote).toBe("Proud of the effort!");
  });

  it("filters by status so a parent query returns only shared reports", async () => {
    await seedDraft({ playerId: "p1" });
    const approved = await seedDraft({ playerId: "p2" });
    await repos.parentReports.update(approved.id, { status: "approved" });
    const shared = await seedDraft({ playerId: "p3" });
    await repos.parentReports.update(shared.id, { status: "shared", sharedAt: "2026-06-03T00:00:00.000Z" });

    const sharedOnly = await repos.parentReports.list({ playerIds: ["p1", "p2", "p3"], status: "shared" });
    expect(sharedOnly).toHaveLength(1);
    expect(sharedOnly[0]?.playerId).toBe("p3");

    const drafts = await repos.parentReports.list({ teamId: "t1", status: "draft" });
    expect(drafts.map((r) => r.playerId)).toEqual(["p1"]);
  });

  it("supports the approve → share → recall transitions on the record", async () => {
    const r = await seedDraft();
    const approved = await repos.parentReports.update(r.id, {
      status: "approved",
      approvedByUserId: "u1",
      approvedAt: "2026-06-02T00:00:00.000Z",
    });
    expect(approved?.status).toBe("approved");

    const shared = await repos.parentReports.update(r.id, {
      status: "shared",
      sharedAt: "2026-06-03T00:00:00.000Z",
      sharedVia: ["dashboard"],
    });
    expect(shared?.status).toBe("shared");
    expect(shared?.sharedVia).toEqual(["dashboard"]);

    const recalled = await repos.parentReports.update(r.id, {
      status: "draft",
      recalledAt: "2026-06-04T00:00:00.000Z",
      sharedAt: undefined,
      sharedVia: undefined,
    });
    expect(recalled?.status).toBe("draft");
    expect(recalled?.sharedAt).toBeUndefined();
    // Hidden from a parent query again.
    expect(await repos.parentReports.list({ playerId: "p1", status: "shared" })).toHaveLength(0);
  });

  it("deletes a report", async () => {
    const r = await seedDraft();
    await repos.parentReports.delete(r.id);
    expect(await repos.parentReports.byId(r.id)).toBeUndefined();
  });
});
