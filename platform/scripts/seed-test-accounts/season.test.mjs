import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonAnchor } from "./season.mjs";

const marker = "[firstpitch-demo:harbor:";
const now = Date.parse("2026-09-04T18:00:00Z");

test("an empty season starts now even when repairing an older team", () => {
  assert.equal(seasonAnchor([], marker, 1, 6, now), now);
});

test("a resumed completed slot keeps its original anchor", () => {
  const games = [{ notes: `${marker}completed:0]`, startsAt: "2026-07-23T18:00:00Z" }];
  assert.equal(seasonAnchor(games, marker, 1, 6, now), now);
});

test("a remaining upcoming slot can recover the same anchor", () => {
  const games = [{ notes: `${marker}upcoming:0]`, startsAt: "2026-09-08T18:00:00Z" }];
  assert.equal(seasonAnchor(games, marker, 1, 6, now), now);
});

test("resuming later does not shift existing game dates", () => {
  const games = [{ notes: `${marker}upcoming:0]`, startsAt: "2026-09-08T18:00:00Z" }];
  assert.equal(seasonAnchor(games, marker, 1, 6, now + 7 * 86_400_000), now);
});
