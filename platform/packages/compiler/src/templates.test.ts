import { describe, expect, it } from "vitest";
import { loadDrills } from "@platform/corpus";
import { PLAN_TEMPLATES, templateDrills } from "./templates";

describe("practice plan templates", () => {
  it("uses unique template ids and existing drill ids", () => {
    const templateIds = PLAN_TEMPLATES.map((template) => template.id);
    const drillIds = new Set(loadDrills().map((drill) => drill.drill_id));

    expect(new Set(templateIds).size).toBe(templateIds.length);
    for (const template of PLAN_TEMPLATES) {
      expect(template.drillIds.length, template.id).toBeGreaterThan(0);
      for (const drillId of template.drillIds) {
        expect(drillIds.has(drillId), `${template.id}: ${drillId}`).toBe(true);
      }
    }
  });

  it("keeps every preset usable while draft drills await review", () => {
    for (const template of PLAN_TEMPLATES) {
      const available = templateDrills(template);
      expect(available.length, template.id).toBeGreaterThan(0);
      expect(
        available.every(
          (drill) => drill.review_status === "published" || drill.review_status === "reviewed",
        ),
        template.id,
      ).toBe(true);
    }
  });
});
