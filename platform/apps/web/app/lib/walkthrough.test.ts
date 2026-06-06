import { describe, expect, it } from "vitest";
import {
  clampStep,
  positionCard,
  seenStorageKey,
  type Rect,
} from "./walkthrough";

const viewport = { width: 1000, height: 800 };
const card = { width: 320, height: 200 };

describe("seenStorageKey", () => {
  it("namespaces the tour id", () => {
    expect(seenStorageKey("team-home")).toBe("walkthrough:seen:team-home");
  });
});

describe("positionCard", () => {
  it("centers when there is no target", () => {
    const p = positionCard(null, card, viewport);
    expect(p.placement).toBe("center");
    expect(p.top).toBe((800 - 200) / 2);
    expect(p.left).toBe((1000 - 320) / 2);
  });

  it("places below a target with room underneath", () => {
    const rect: Rect = { top: 100, left: 400, width: 200, height: 40 };
    const p = positionCard(rect, card, viewport);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(100 + 40 + 12);
    // horizontally centered on the target, then clamped
    expect(p.left).toBe(400 + 200 / 2 - 320 / 2);
  });

  it("flips above when there is no room below", () => {
    const rect: Rect = { top: 700, left: 400, width: 200, height: 40 };
    const p = positionCard(rect, card, viewport);
    expect(p.placement).toBe("above");
    expect(p.top).toBe(700 - 12 - 200);
  });

  it("clamps the card inside the viewport horizontally", () => {
    const rect: Rect = { top: 100, left: 960, width: 40, height: 40 };
    const p = positionCard(rect, card, viewport);
    expect(p.left).toBeLessThanOrEqual(1000 - 320 - 12);
    expect(p.left).toBeGreaterThanOrEqual(12);
  });
});

describe("clampStep", () => {
  it("keeps an index within range", () => {
    expect(clampStep(5, 3)).toBe(2);
    expect(clampStep(-1, 3)).toBe(0);
    expect(clampStep(1, 3)).toBe(1);
  });

  it("returns 0 for an empty tour", () => {
    expect(clampStep(2, 0)).toBe(0);
  });
});
