import { describe, expect, it } from "vitest";
import type { GameRecord, MetricEntryRecord } from "@platform/storage";
import {
  buildMonthlyReport,
  reportIsShareable,
  isEditedSinceApproval,
  monthWindow,
  previousMonthWindow,
  type MonthlyReportInput,
} from "./monthlyReport";

const NOW = new Date("2026-06-09T12:00:00.000Z");
const PERIOD = { periodStart: "2026-05-01", periodEnd: "2026-05-31", periodLabel: "May 2026" };

type ReportPlayer = MonthlyReportInput["player"];

function player(overrides: Partial<ReportPlayer> = {}): ReportPlayer {
  return { id: "p1", firstName: "Hudson", lastName: "Reyes", ageBand: "9-12", positions: [], ...overrides };
}

function entry(metricKey: string, value: number, recordedAt: string): MetricEntryRecord {
  return {
    id: `${metricKey}-${recordedAt}`,
    playerId: "p1",
    metricKey,
    value,
    recordedAt,
    verificationState: "coach_verified",
  };
}

function game(over: Partial<GameRecord> = {}): GameRecord {
  return {
    id: "g1",
    teamId: "t1",
    opponent: "Rivals",
    startsAt: "2026-05-10T18:00:00.000Z",
    homeAway: "home",
    innings: 6,
    status: "completed",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...over,
  };
}

function build(over: Partial<MonthlyReportInput> = {}): ReturnType<typeof buildMonthlyReport> {
  return buildMonthlyReport({
    player: player(),
    ...PERIOD,
    games: [],
    metrics: [],
    now: NOW,
    ...over,
  });
}

describe("buildMonthlyReport", () => {
  it("produces all required parent-facing fields even with no data", () => {
    const c = build();
    expect(c.summary.length).toBeGreaterThan(0);
    expect(c.attendance.length).toBeGreaterThan(0);
    expect(c.effort.length).toBeGreaterThan(0);
    expect(c.focus.length).toBeGreaterThan(0);
    expect(c.homeMission).toMatch(/home mission/i);
    expect(c.playingTime.length).toBeGreaterThan(0);
    expect(c.coachNote.trim().length).toBeGreaterThan(0);
    // No data → no faked improvement.
    expect(c.improvement).toBeUndefined();
  });

  it("reports a measurable improvement only with a fresh in-window retest", () => {
    const metrics = [
      entry("home_to_first", 4.9, "2026-04-01T00:00:00.000Z"),
      entry("home_to_first", 4.6, "2026-05-20T00:00:00.000Z"),
    ];
    const c = build({ metrics });
    expect(c.improvement).toBeDefined();
    expect(c.improvement).toMatch(/home to first/i);
    expect(c.improvement).toMatch(/improved/i);
  });

  it("omits improvement when the latest retest is outside the window", () => {
    const metrics = [
      entry("home_to_first", 4.9, "2026-03-01T00:00:00.000Z"),
      entry("home_to_first", 4.6, "2026-04-01T00:00:00.000Z"),
    ];
    expect(build({ metrics }).improvement).toBeUndefined();
  });

  it("omits improvement on a regression (time got slower)", () => {
    const metrics = [
      entry("home_to_first", 4.6, "2026-04-01T00:00:00.000Z"),
      entry("home_to_first", 4.9, "2026-05-20T00:00:00.000Z"),
    ];
    expect(build({ metrics }).improvement).toBeUndefined();
  });

  it("requires two datapoints for an improvement", () => {
    const metrics = [entry("home_to_first", 4.6, "2026-05-20T00:00:00.000Z")];
    expect(build({ metrics }).improvement).toBeUndefined();
  });

  it("summarizes attendance from in-window team events", () => {
    const games = [
      game({ id: "g1", startsAt: "2026-05-10T18:00:00.000Z", attendance: { p1: "present" } }),
      game({ id: "g2", startsAt: "2026-05-17T18:00:00.000Z", attendance: { p1: "absent" } }),
      // out of window — ignored
      game({ id: "g3", startsAt: "2026-04-17T18:00:00.000Z", attendance: { p1: "present" } }),
    ];
    expect(build({ games }).attendance).toMatch(/1 of 2/);
  });

  it("summarizes playing time and positions from saved lineups", () => {
    const games = [
      game({
        id: "g1",
        startsAt: "2026-05-10T18:00:00.000Z",
        lineup: [{ p1: "SS" }, { p1: "SS" }, { p1: "BN" }],
      }),
    ];
    const c = build({ games });
    expect(c.playingTime).toMatch(/2 innings/);
    expect(c.playingTime).toMatch(/SS/);
  });

  it("leads with a safety note for an injured player", () => {
    const c = build({ player: player({ injured: true, injuryNote: "tender elbow" }) });
    expect(c.safetyNote).toBeDefined();
    expect(c.safetyNote ?? "").toMatch(/arm|clear|rest|inj/i);
  });
});

describe("report guards", () => {
  it("reportIsShareable requires a non-empty coach note", () => {
    expect(reportIsShareable({ ...build(), coachNote: "" })).toBe(false);
    expect(reportIsShareable({ ...build(), coachNote: "   " })).toBe(false);
    expect(reportIsShareable({ ...build(), coachNote: "Great month!" })).toBe(true);
  });

  it("isEditedSinceApproval is true only when an edit follows approval", () => {
    expect(isEditedSinceApproval({ approvedAt: "2026-06-01T00:00:00Z", editedAt: "2026-06-02T00:00:00Z" })).toBe(true);
    expect(isEditedSinceApproval({ approvedAt: "2026-06-02T00:00:00Z", editedAt: "2026-06-01T00:00:00Z" })).toBe(false);
    expect(isEditedSinceApproval({ approvedAt: "2026-06-02T00:00:00Z" })).toBe(false);
    expect(isEditedSinceApproval({ editedAt: "2026-06-02T00:00:00Z" })).toBe(false);
  });
});

describe("month windows", () => {
  it("monthWindow spans the full calendar month", () => {
    const w = monthWindow(new Date("2026-05-15T12:00:00.000Z"));
    expect(w.periodStart).toBe("2026-05-01");
    expect(w.periodEnd).toBe("2026-05-31");
    expect(w.periodLabel).toBe("May 2026");
  });

  it("previousMonthWindow returns the prior calendar month", () => {
    const w = previousMonthWindow(new Date("2026-06-09T12:00:00.000Z"));
    expect(w.periodStart).toBe("2026-05-01");
    expect(w.periodEnd).toBe("2026-05-31");
    expect(w.periodLabel).toBe("May 2026");
  });
});
