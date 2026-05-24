import { describe, it, expect } from "vitest";
import { parseCsv, toRecords } from "./csv";
import { matchPlayer } from "./nameMatch";
import { ingestGameChangerCsv } from "./gameChanger";

describe("csv", () => {
  it("parses simple csv", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([["a","b"],["1","2"]]);
  });
  it("handles quoted commas and escaped quotes", () => {
    const r = parseCsv('name,note\n"Doe, John","said ""hi"""\n');
    expect(r[1]).toEqual(["Doe, John", 'said "hi"']);
  });
  it("toRecords keys by header", () => {
    const r = toRecords("a,b\n1,2\n");
    expect(r[0]).toEqual({ a: "1", b: "2" });
  });
});

describe("matchPlayer", () => {
  const roster = [
    { playerId: "p1", displayName: "Cole Carter" },
    { playerId: "p2", displayName: "Jordan Lopez" },
  ];
  it("matches exact", () => {
    const r = matchPlayer("Cole Carter", roster);
    expect(r.playerId).toBe("p1");
  });
  it("matches fuzzy typo", () => {
    const r = matchPlayer("Cole Cartr", roster);
    expect(r.playerId).toBe("p1");
  });
  it("returns null for low similarity", () => {
    const r = matchPlayer("Zzz Xxx", roster);
    expect(r.playerId).toBe(null);
  });
  it("ambiguous when two are very close", () => {
    const r = matchPlayer("Cole Cart", [
      { playerId: "a", displayName: "Cole Carter" },
      { playerId: "b", displayName: "Cole Carver" },
    ]);
    expect(r.ambiguous).toBe(true);
    expect(r.playerId).toBe(null);
  });
});

describe("ingestGameChangerCsv", () => {
  const roster = [
    { playerId: "p1", displayName: "Cole Carter", jerseyNumber: "7" },
    { playerId: "p2", displayName: "Jordan Lopez", jerseyNumber: "12" },
  ];
  const csv = [
    "Player,#,PA,AB,H,2B,HR,BB,K",
    "Cole Carter,7,4,4,2,1,0,0,1",
    "Jordan Lopez,12,3,2,1,0,0,1,0",
    "Mystery Kid,99,2,2,0,0,0,0,2",
  ].join("\n");
  it("maps headers, matches roster, and reports unmatched", () => {
    const r = ingestGameChangerCsv(csv, roster);
    expect(r.parsedRowCount).toBe(3);
    expect(r.rows[0]?.playerId).toBe("p1");
    expect(r.rows[0]?.hits).toBe(2);
    expect(r.unmatchedNames).toContain("Mystery Kid");
    expect(r.unknownColumns).toEqual([]);
  });
});
