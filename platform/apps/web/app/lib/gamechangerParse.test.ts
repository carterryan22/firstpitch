import { describe, expect, it } from "vitest";
import { parseGameChangerCsv } from "./gamechangerParse";

const roster = [
  { id: "p1", firstName: "Aiden", lastName: "Anderson", jerseyNumber: "1" },
  { id: "p2", firstName: "Bo", lastName: "Brooks", jerseyNumber: "2" },
  { id: "p3", firstName: "Caleb", lastName: "Carter", jerseyNumber: "3" },
];

describe("parseGameChangerCsv", () => {
  it("detects batting block from typical GC headers", () => {
    const csv = [
      "Number,Last,First,GP,PA,AB,H,2B,3B,HR,RBI,R,BB,SO,SB,AVG,OBP,OPS",
      "1,Anderson,Aiden,1,4,3,2,1,0,0,2,1,1,0,1,.667,.750,1.500",
      "2,Brooks,Bo,1,3,3,0,0,0,0,0,0,0,2,0,.000,.000,.000",
      "Team,Totals,,2,7,6,2,1,0,0,2,1,1,2,1,.333,.429,.929",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.kind).toBe("batting");
    expect(r.rows).toHaveLength(2); // Team row skipped
    expect(r.rows[0]!.playerId).toBe("p1");
    expect(r.rows[0]!.batting?.h).toBe(2);
    expect(r.rows[0]!.batting?.["2b"]).toBe(1);
    expect(r.rows[0]!.batting?.rbi).toBe(2);
    expect(r.rows[1]!.batting?.so).toBe(2);
    expect(r.unmatched).toHaveLength(0);
  });

  it("detects pitching block and tolerates #P / P/IP headers", () => {
    const csv = [
      "Number,Last,First,IP,BF,#P,H,R,ER,BB,SO,WP,HBP,ERA,WHIP,P/IP",
      "1,Anderson,Aiden,3,11,42,2,1,0,1,5,1,0,0.00,1.00,14.0",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.kind).toBe("pitching");
    expect(r.rows[0]!.pitching?.ip).toBe(3);
    expect(r.rows[0]!.pitching?.pitches).toBe(42);
    expect(r.rows[0]!.pitching?.so).toBe(5);
    expect(r.rows[0]!.pitching?.era).toBe(0);
    expect(r.rows[0]!.pitching?.pitchesPerInning).toBe(14);
  });

  it("matches by jersey + last name (case-insensitive)", () => {
    const csv = [
      "Number,Last,First,PA,AB,H,BB,SO",
      "3,carter,caleb,4,4,2,0,1",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.rows[0]!.playerId).toBe("p3");
    expect(r.rows[0]!.match).toBe("exact");
  });

  it("falls back to fuzzy match on jersey only", () => {
    const csv = [
      "Number,Last,First,PA,AB,H,BB,SO",
      "2,Smith,Bo,3,3,1,0,0",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.rows[0]!.playerId).toBe("p2");
    expect(r.rows[0]!.match).toBe("fuzzy");
  });

  it("reports unmatched rows", () => {
    const csv = [
      "Number,Last,First,PA,AB,H,BB,SO",
      "99,Nobody,Stranger,1,1,0,0,1",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.unmatched).toHaveLength(1);
    expect(r.warnings.join(" ")).toMatch(/did not match/);
  });

  it("handles tab-separated input", () => {
    const csv = "Number\tLast\tFirst\tPA\tAB\tH\tBB\tSO\n1\tAnderson\tAiden\t4\t3\t2\t1\t0";
    const r = parseGameChangerCsv(csv, roster);
    expect(r.rows[0]!.playerId).toBe("p1");
    expect(r.rows[0]!.batting?.h).toBe(2);
  });

  it("handles a single Player column with 'Last, First' format", () => {
    const csv = [
      "Number,Player,PA,AB,H,BB,SO",
      "1,\"Anderson, Aiden\",4,3,2,1,0",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.rows[0]!.playerId).toBe("p1");
    expect(r.rows[0]!.batting?.h).toBe(2);
  });

  it("treats blank / dash cells as undefined", () => {
    const csv = [
      "Number,Last,First,PA,AB,H,BB,SO",
      "1,Anderson,Aiden,,-,2,1,0",
    ].join("\n");
    const r = parseGameChangerCsv(csv, roster);
    expect(r.rows[0]!.batting?.pa).toBeUndefined();
    expect(r.rows[0]!.batting?.ab).toBeUndefined();
    expect(r.rows[0]!.batting?.h).toBe(2);
  });
});
