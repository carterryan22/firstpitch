import { describe, expect, it } from "vitest";
import { featureFlagEnabled } from "../components/Nav";

describe("featureFlagEnabled", () => {
  it("shows product surfaces by default", () => {
    expect(featureFlagEnabled(undefined)).toBe(true);
    expect(featureFlagEnabled("")).toBe(true);
  });

  it("supports an explicit deployment kill switch", () => {
    expect(featureFlagEnabled("0")).toBe(false);
    expect(featureFlagEnabled("false")).toBe(false);
    expect(featureFlagEnabled("1")).toBe(true);
    expect(featureFlagEnabled("true")).toBe(true);
  });
});
