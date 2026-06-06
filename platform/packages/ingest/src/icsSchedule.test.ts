import { describe, it, expect } from "vitest";
import {
  gameChangerScheduleFromIcs,
  parseScheduleSummary,
  parseIcsDate,
  diffSchedule,
  type ExistingGameForDiff,
} from "./icsSchedule";

const SAMPLE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//GameChanger//EN",
  "BEGIN:VEVENT",
  "UID:gc-001@gamechanger",
  "SUMMARY:Wildcats vs Riverhawks",
  "DTSTART:20260601T230000Z",
  "LOCATION:Memorial Park Field 2",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:gc-002@gamechanger",
  "SUMMARY:Wildcats @ Thunder",
  "DTSTART:20260608T220000Z",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:gc-practice@gamechanger",
  "SUMMARY:Wildcats Practice",
  "DTSTART:20260603T230000Z",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcsDate", () => {
  it("parses UTC date-time", () => {
    expect(parseIcsDate("20260601T230000Z")).toBe("2026-06-01T23:00:00.000Z");
  });
  it("parses all-day date", () => {
    expect(parseIcsDate("20260601")).toBe("2026-06-01T00:00:00.000Z");
  });
  it("returns null for garbage", () => {
    expect(parseIcsDate("not-a-date")).toBeNull();
  });
});

describe("parseScheduleSummary", () => {
  it("treats vs as home and strips our team name", () => {
    expect(parseScheduleSummary("Wildcats vs Riverhawks", "Wildcats")).toEqual({
      opponent: "Riverhawks",
      homeAway: "home",
    });
  });
  it("treats @ as away", () => {
    expect(parseScheduleSummary("Wildcats @ Thunder", "Wildcats")).toEqual({
      opponent: "Thunder",
      homeAway: "away",
    });
  });
  it("falls back to whole summary as home opponent", () => {
    expect(parseScheduleSummary("Season Opener")).toEqual({
      opponent: "Season Opener",
      homeAway: "home",
    });
  });
});

describe("gameChangerScheduleFromIcs", () => {
  it("parses games and skips practices", () => {
    const games = gameChangerScheduleFromIcs(SAMPLE, "Wildcats");
    expect(games).toHaveLength(2);
    expect(games[0]).toMatchObject({
      uid: "gc-001@gamechanger",
      opponent: "Riverhawks",
      homeAway: "home",
      venue: "Memorial Park Field 2",
      startsAt: "2026-06-01T23:00:00.000Z",
    });
    expect(games[1]).toMatchObject({ opponent: "Thunder", homeAway: "away" });
  });

  it("handles folded lines", () => {
    const folded = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:gc-fold",
      "SUMMARY:Wildcats vs Long Opponent ",
      " Name Continues",
      "DTSTART:20260601T230000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const games = gameChangerScheduleFromIcs(folded, "Wildcats");
    expect(games[0]?.opponent).toBe("Long Opponent Name Continues");
  });
});

describe("diffSchedule", () => {
  const parsed = gameChangerScheduleFromIcs(SAMPLE, "Wildcats");

  it("marks everything created when no existing games", () => {
    const diff = diffSchedule([], parsed);
    expect(diff.created).toHaveLength(2);
    expect(diff.updated).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
    expect(diff.detached).toHaveLength(0);
  });

  it("matches by sourceUid into unchanged / updated", () => {
    const existing: ExistingGameForDiff[] = [
      {
        id: "g1",
        sourceUid: "gc-001@gamechanger",
        opponent: "Riverhawks",
        startsAt: "2026-06-01T23:00:00.000Z",
        venue: "Memorial Park Field 2",
        homeAway: "home",
      },
      {
        id: "g2",
        sourceUid: "gc-002@gamechanger",
        opponent: "Thunder",
        startsAt: "2026-06-08T18:00:00.000Z", // different time → updated
        homeAway: "away",
      },
    ];
    const diff = diffSchedule(existing, parsed);
    expect(diff.unchanged.map((u) => u.existingId)).toEqual(["g1"]);
    expect(diff.updated.map((u) => u.existingId)).toEqual(["g2"]);
    expect(diff.created).toHaveLength(0);
  });

  it("reports detached imported games but ignores manual games", () => {
    const existing: ExistingGameForDiff[] = [
      {
        id: "gManual",
        opponent: "Local Rivals",
        startsAt: "2026-07-01T23:00:00.000Z",
        homeAway: "home",
      },
      {
        id: "gOld",
        sourceUid: "gc-removed@gamechanger",
        opponent: "Gone",
        startsAt: "2026-05-01T23:00:00.000Z",
        homeAway: "home",
      },
    ];
    const diff = diffSchedule(existing, parsed);
    expect(diff.detached.map((g) => g.id)).toEqual(["gOld"]);
    expect(diff.created).toHaveLength(2);
  });
});
