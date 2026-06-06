import { describe, it, expect } from "vitest";
import {
  GEAR_CATALOG,
  AMAZON_TAG_DEFAULT,
  affiliateUrl,
  gearStars,
  recommendGear,
  missingGearForEquipment,
  type GearProduct,
} from "./index";

const find = (id: string): GearProduct => {
  const p = GEAR_CATALOG.find((x) => x.id === id);
  if (!p) throw new Error(`missing fixture product ${id}`);
  return p;
};

describe("catalog integrity", () => {
  it("has products with unique ids and valid tiers", () => {
    expect(GEAR_CATALOG.length).toBeGreaterThan(5);
    const ids = new Set(GEAR_CATALOG.map((p) => p.id));
    expect(ids.size).toBe(GEAR_CATALOG.length);
    for (const p of GEAR_CATALOG) {
      expect([1, 2, 3]).toContain(p.price_tier);
      expect(p.age_bands.length).toBeGreaterThan(0);
      expect(p.amazon_asin || p.affiliate_url).toBeTruthy();
    }
  });

  it("flags weighted balls / radar with a safety note", () => {
    expect(find("weighted_throwing_balls").safety_note).toBeTruthy();
    expect(find("pocket_radar_ball_coach").safety_note).toBeTruthy();
  });
});

describe("affiliateUrl", () => {
  it("builds an Amazon associate link with the default tag", () => {
    const url = affiliateUrl(find("batting_tee_adjustable"));
    expect(url).toContain("amazon.com/dp/");
    expect(url).toContain(`tag=${AMAZON_TAG_DEFAULT}`);
  });

  it("honors a custom amazon tag", () => {
    const url = affiliateUrl(find("batting_tee_adjustable"), "myclub-20");
    expect(url).toContain("tag=myclub-20");
  });

  it("prefers a per-product affiliate_url when present", () => {
    const custom: GearProduct = { ...find("batting_tee_adjustable"), affiliate_url: "https://brand.example/tee?ref=fp" };
    expect(affiliateUrl(custom)).toBe("https://brand.example/tee?ref=fp");
  });

  it("returns null when there is nothing to link to", () => {
    const bare: GearProduct = { ...find("batting_tee_adjustable"), amazon_asin: undefined, affiliate_url: undefined };
    expect(affiliateUrl(bare)).toBeNull();
  });
});

describe("gearStars", () => {
  it("renders half stars", () => {
    expect(gearStars(4.6)).toBe("★★★★½");
    expect(gearStars(5)).toBe("★★★★★");
    expect(gearStars(3)).toBe("★★★☆☆");
  });
});

describe("recommendGear", () => {
  it("returns a deduped, budget-capped, safety-first kit", () => {
    const kit = recommendGear({ ageBand: "9-12", budget: "standard", focus: "hitting", owned: [] });
    expect(kit.essentials.length).toBeGreaterThan(0);
    expect(kit.essentials.length).toBeLessThanOrEqual(4);
    // no two essentials share a category
    const cats = kit.essentials.map((p) => p.category);
    expect(new Set(cats).size).toBe(cats.length);
    // budget cap respected
    for (const p of [...kit.essentials, ...kit.niceToHave]) expect(p.price_tier).toBeLessThanOrEqual(2);
    expect(kit.priceHigh).toBeGreaterThanOrEqual(kit.priceLow);
  });

  it("excludes owned categories from essentials and lists them as owned", () => {
    const kit = recommendGear({ ageBand: "9-12", budget: "standard", focus: "hitting", owned: ["tee"] });
    expect(kit.essentials.some((p) => p.category === "tee")).toBe(false);
    expect(kit.owned.some((p) => p.category === "tee")).toBe(true);
  });

  it("never recommends 13+ weighted balls to a 9-12 player", () => {
    const kit = recommendGear({ ageBand: "9-12", budget: "loaded", focus: "pitching", owned: [] });
    const all = [...kit.essentials, ...kit.niceToHave];
    expect(all.some((p) => p.id === "weighted_throwing_balls")).toBe(false);
  });

  it("adds an arm-care note for throwing/pitching focus", () => {
    const kit = recommendGear({ ageBand: "13-15", budget: "loaded", focus: "pitching", owned: [] });
    expect(kit.note.toLowerCase()).toContain("pitch counts");
  });
});

describe("missingGearForEquipment", () => {
  it("maps drill equipment tokens to buyable gear and skips owned categories", () => {
    const missing = missingGearForEquipment(["tee", "baseballs", "net"], ["net"]);
    const cats = missing.map((p) => p.category);
    expect(cats).toContain("tee");
    expect(cats).toContain("baseballs");
    expect(cats).not.toContain("net");
  });

  it("dedupes and normalizes tokens", () => {
    const missing = missingGearForEquipment(["Batting Tee", "batting_tee"]);
    expect(missing.length).toBe(1);
  });
});
