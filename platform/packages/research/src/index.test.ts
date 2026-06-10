import { describe, it, expect } from "vitest";

import {
  getCorpus,
  getPlatforms,
  getFeatureMatrix,
  getTaxonomy,
  getScoringConfig,
  scoreOpportunity,
  isMvpCandidate,
  opportunityStats,
  validateCorpus,
  renderFeatureMatrix,
  whiteSpaceCapabilities,
  buildReport,
} from "./index";

const CAPABILITY_VALUES = new Set(["yes", "partial", "no", "unknown"]);

describe("scoreOpportunity", () => {
  const config = getScoringConfig();
  const all = (n: number) => Object.fromEntries(config.dimensions.map((d) => [d.id, n]));

  it("sums eight dimensions to the configured range", () => {
    expect(config.dimensions).toHaveLength(8);
    expect(scoreOpportunity(all(5)).total).toBe(40);
    expect(scoreOpportunity(all(1)).total).toBe(8);
  });

  it("clamps out-of-range values and defaults missing dimensions to the minimum", () => {
    const one = config.dimensions[0]!;
    expect(scoreOpportunity({ [one.id]: 100 }).total).toBe(5 + 7 * 1);
    expect(scoreOpportunity({ [one.id]: -50 }).total).toBe(1 + 7 * 1);
  });

  it("flags MVP candidates at or above the threshold", () => {
    expect(scoreOpportunity(all(5)).isMvpCandidate).toBe(true);
    expect(scoreOpportunity(all(1)).isMvpCandidate).toBe(false);
    expect(isMvpCandidate(config.mvp_threshold)).toBe(true);
    expect(isMvpCandidate(config.mvp_threshold - 1)).toBe(false);
  });
});

describe("corpus", () => {
  it("loads scored, prefixed items", () => {
    const items = getCorpus();
    expect(items.length).toBeGreaterThanOrEqual(20);
    expect(items.every((i) => i.source_id.startsWith("cr-"))).toBe(true);
  });

  it("validates clean against the schema and taxonomy (no errors, no warnings)", () => {
    const report = validateCorpus();
    if (!report.ok || report.warningCount > 0) {
      // Surface the offending issues in the failure message.
      throw new Error(report.issues.map((x) => `[${x.level}] ${x.itemId}: ${x.message}`).join("\n"));
    }
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
  });

  it("catches schema violations on a bad item", () => {
    const bad = { ...getCorpus()[0]!, sentiment: "ecstatic" as never };
    const report = validateCorpus([bad]);
    expect(report.ok).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);
  });
});

describe("opportunityStats", () => {
  it("ranks the top opportunity first and counts MVP candidates", () => {
    const items = getCorpus();
    const stats = opportunityStats(items);
    expect(stats.scored).toBe(items.length);
    expect(stats.unscored).toBe(0);
    expect(stats.top[0]!.score).toBe(38);
    expect(stats.top[0]!.platform).toBe("GameChanger");
    expect(stats.mvpCandidates).toBe(8);
  });
});

describe("platforms backlog", () => {
  it("catalogues platforms across three waves with valid categories", () => {
    const platforms = getPlatforms();
    expect(platforms.length).toBeGreaterThanOrEqual(35);
    const categoryEnum = new Set(getTaxonomy().enums.platform_category);
    for (const p of platforms) {
      expect([1, 2, 3]).toContain(p.wave);
      expect(p.categories.length).toBeGreaterThan(0);
      expect(p.categories.every((c) => categoryEnum.has(c))).toBe(true);
    }
  });
});

describe("feature matrix", () => {
  it("uses legal capability values and known platform ids", () => {
    const matrix = getFeatureMatrix();
    const knownIds = new Set(getPlatforms().map((p) => p.id));
    knownIds.add("firstpitch");
    for (const row of matrix.platforms) {
      expect(knownIds.has(row.platformId)).toBe(true);
      for (const feature of matrix.capability_features) {
        const value = row.cells[feature.id] ?? "unknown";
        expect(CAPABILITY_VALUES.has(value)).toBe(true);
      }
    }
  });

  it("renders markdown with the legend, our target row, and white space", () => {
    const md = renderFeatureMatrix();
    expect(md).toContain("# Competitor Feature Matrix");
    expect(md).toContain("GameChanger");
    expect(md).toContain("First Pitch (target)");
    expect(md).toContain("White space");
    expect(md).toContain("\u2713");
  });

  it("flags low-coverage capabilities as white space", () => {
    const ws = whiteSpaceCapabilities();
    expect(ws.every((w) => w.yesCount <= 3)).toBe(true);
    const ids = ws.map((w) => w.featureId);
    expect(ids).toContain("bench_tracking");
    expect(ids).toContain("streaming");
    // sorted ascending by yesCount
    for (let i = 1; i < ws.length; i++) {
      expect(ws[i]!.yesCount).toBeGreaterThanOrEqual(ws[i - 1]!.yesCount);
    }
  });
});

describe("report", () => {
  it("builds a deterministic markdown report", () => {
    const md = buildReport("2026-01-02");
    expect(md).toContain("# Competitor Research Report");
    expect(md).toContain("Top opportunities");
    expect(md).toContain("MVP-candidate insights");
    expect(md).toContain("GameChanger");
    expect(md).toContain("2026-01-02");
  });
});
