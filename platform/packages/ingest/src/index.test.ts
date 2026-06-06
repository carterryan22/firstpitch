import { describe, it, expect } from "vitest";
import { parseCsv, toRecords } from "./csv";
import { matchPlayer } from "./nameMatch";
import { ingestGameChangerCsv, rosterFromGameChangerCsv, splitPlayerName } from "./gameChanger";

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

  // E4.3 DoD: a 100-row CSV maps with >=95% accuracy.
  it("maps a 100-row CSV with >=95% accuracy", () => {
    const FIRST = ["Cole","Jordan","Mason","Liam","Noah","Ethan","Aiden","Lucas","Owen","Caleb"];
    const LAST = ["Carter","Lopez","Nguyen","Patel","Garcia","Brooks","Hayes","Reyes","Walker","Foster"];
    // 100 unique roster players from 10 firsts x 10 lasts (each combo once).
    const bigRoster = [] as Array<{ playerId: string; displayName: string; jerseyNumber: string }>;
    for (let i = 0; i < 100; i++) {
      const first = FIRST[i % FIRST.length]!;
      const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!;
      bigRoster.push({
        playerId: `p${i}`,
        displayName: `${first} ${last}`,
        jerseyNumber: String(i),
      });
    }

    // Build a CSV that perturbs each name the way a real export would:
    // case changes, "Last, First" ordering, single-char typos, extra spaces.
    const lines = ["Player,#,PA,AB,H,BB,K,HR,RBI"];
    const expected: string[] = [];
    bigRoster.forEach((p, i) => {
      const [first, last] = p.displayName.split(" ") as [string, string];
      let name: string;
      const mode = i % 4;
      if (mode === 0) name = p.displayName.toUpperCase();
      else if (mode === 1) name = `${last}, ${first}`;
      else if (mode === 2) name = `${first.slice(0, -1)} ${last}`; // dropped a letter (typo)
      else name = `  ${first}   ${last} `; // sloppy whitespace
      lines.push(`"${name}",${i},4,4,2,1,1,0,1`);
      expected.push(p.playerId);
    });
    const bigCsv = lines.join("\n");

    const r = ingestGameChangerCsv(bigCsv, bigRoster);
    expect(r.parsedRowCount).toBe(100);
    const correct = r.rows.filter((row, idx) => row.playerId === expected[idx]).length;
    expect(correct / 100).toBeGreaterThanOrEqual(0.95);
  });
});

describe("rosterFromGameChangerCsv", () => {
  it("splits names and keeps jerseys", () => {
    const csv = [
      "Player,#,PA,AB,H",
      "Cole Carter,7,4,4,2",
      '"Lopez, Jordan",12,3,2,1',
      "Mason Nguyen,9,2,2,0",
    ].join("\n");
    const roster = rosterFromGameChangerCsv(csv);
    expect(roster).toHaveLength(3);
    expect(roster[0]).toEqual({ firstName: "Cole", lastName: "Carter", jerseyNumber: "7" });
    expect(roster[1]).toEqual({ firstName: "Jordan", lastName: "Lopez", jerseyNumber: "12" });
  });

  it("de-dupes repeated players (batting + pitching rows)", () => {
    const csv = [
      "Player,#,PA,H",
      "Cole Carter,7,4,2",
      "Cole Carter,7,3,1",
      "Jordan Lopez,12,2,1",
    ].join("\n");
    const roster = rosterFromGameChangerCsv(csv);
    expect(roster).toHaveLength(2);
  });

  it("splitPlayerName handles 'Last, First' and single token", () => {
    expect(splitPlayerName("Lopez, Jordan")).toEqual({ firstName: "Jordan", lastName: "Lopez" });
    expect(splitPlayerName("Cole Carter")).toEqual({ firstName: "Cole", lastName: "Carter" });
    expect(splitPlayerName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
  });
});
