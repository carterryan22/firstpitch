// @platform/gear — gear catalog + "gear test" recommendation engine + affiliate links.
//
// Pure + isomorphic: no fs, no DOM. Safe to import from server components,
// route handlers, and `"use client"` components alike. The catalog JSON is
// inlined by the bundler (same pattern as @platform/corpus).
//
// Three jobs:
//   1. recommendGear()          — the gear-test quiz → a tailored kit
//   2. affiliateUrl()           — build Amazon-tag or per-product affiliate links
//   3. missingGearForEquipment()— compiler inventory check (what to buy for a plan)

import catalog from "../../../../corpus/gear-catalog.json";

// ---------- Types ----------

export type AgeBandKey = "6-8" | "9-12" | "13-15" | "16+";
export type GearFocus = "hitting" | "throwing" | "fielding" | "pitching" | "speed" | "allaround";
export type BudgetLevel = "lean" | "standard" | "loaded";

export interface GearProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  role: string;
  blurb: string;
  editor_note: string;
  /** 1 = budget, 2 = standard, 3 = premium. */
  price_tier: 1 | 2 | 3;
  price_usd: number;
  age_bands: AgeBandKey[];
  focus: GearFocus[];
  rating: number;
  review_count: number;
  /** Amazon ASIN powering the associate-tag link. */
  amazon_asin?: string;
  /** A pre-built per-product affiliate URL (Amazon, brand site, etc.). Wins over amazon_asin. */
  affiliate_url?: string;
  /** Drill `equipment_required` tokens this product satisfies (for the inventory check). */
  equipment_keys: string[];
  /** Non-null when the item carries an arm-care / safety caveat. */
  safety_note: string | null;
}

export interface GearTestAnswers {
  ageBand: AgeBandKey;
  budget: BudgetLevel;
  focus: GearFocus;
  /** Category ids the family already owns (excluded from "essentials"). */
  owned: string[];
}

export interface GearKit {
  /** Buy-these-first list, de-duplicated by category, cheapest/safety-first. */
  essentials: GearProduct[];
  /** Worth it once the essentials are covered. */
  niceToHave: GearProduct[];
  /** Catalog items the family said they already own. */
  owned: GearProduct[];
  priceLow: number;
  priceHigh: number;
  note: string;
  disclosure: string;
}

// ---------- Catalog ----------

export const GEAR_CATALOG: GearProduct[] = (catalog.products as GearProduct[]).slice();
export const GEAR_DISCLOSURE: string = catalog.disclosure;
export const AMAZON_TAG_DEFAULT: string = catalog.amazon_tag_default;

const TIER_CAP: Record<BudgetLevel, number> = { lean: 1, standard: 2, loaded: 3 };

export const BUDGET_OPTIONS: Array<{ value: BudgetLevel; label: string; hint: string }> = [
  { value: "lean", label: "Keep it cheap", hint: "Just the essentials under ~$40 each" },
  { value: "standard", label: "Solid season kit", hint: "Mid-range gear that lasts" },
  { value: "loaded", label: "Go all in", hint: "Including radar / premium safety gear" },
];

export const FOCUS_OPTIONS: Array<{ value: GearFocus; label: string }> = [
  { value: "allaround", label: "A bit of everything" },
  { value: "hitting", label: "Hitting" },
  { value: "fielding", label: "Fielding" },
  { value: "throwing", label: "Throwing" },
  { value: "pitching", label: "Pitching" },
  { value: "speed", label: "Speed & athleticism" },
];

export const AGE_BAND_OPTIONS: Array<{ value: AgeBandKey; label: string }> = [
  { value: "6-8", label: "6-8 (coach pitch / tee)" },
  { value: "9-12", label: "9-12 (kid pitch)" },
  { value: "13-15", label: "13-15 (middle school)" },
  { value: "16+", label: "16+ (high school+)" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  tee: "Batting tee",
  l_screen: "L-screen",
  net: "Net / rebounder",
  baseballs: "Baseballs",
  agility: "Cones & speed",
  weighted_balls: "Weighted balls",
  radar: "Radar gun",
  glove: "Glove",
  catcher_gear: "Catcher's gear",
  bat: "Bat",
  bucket: "Ball bucket",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

/** Distinct categories present in the catalog, for the "what do you own" step. */
export function ownableCategories(): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const out: Array<{ value: string; label: string }> = [];
  for (const p of GEAR_CATALOG) {
    if (!seen.has(p.category)) {
      seen.add(p.category);
      out.push({ value: p.category, label: categoryLabel(p.category) });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ---------- Affiliate links ----------

/**
 * Build the outbound affiliate URL for a product.
 * - A product-specific `affiliate_url` always wins (generic per-product model).
 * - Otherwise we build an Amazon associate link from the ASIN + tag.
 * - Returns null when there's nothing to link to.
 */
export function affiliateUrl(product: GearProduct, amazonTag: string = AMAZON_TAG_DEFAULT): string | null {
  if (product.affiliate_url) return product.affiliate_url;
  if (product.amazon_asin) {
    const tag = encodeURIComponent(amazonTag.trim() || AMAZON_TAG_DEFAULT);
    return `https://www.amazon.com/dp/${encodeURIComponent(product.amazon_asin)}?tag=${tag}`;
  }
  return null;
}

/** Visual star string for a 0-5 rating, e.g. 4.6 → "★★★★½". */
export function gearStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

// ---------- Catalog queries ----------

export function gearByCategory(category: string): GearProduct[] {
  return GEAR_CATALOG.filter((p) => p.category === category);
}

export function gearForFocus(focus: GearFocus, ageBand?: AgeBandKey): GearProduct[] {
  return GEAR_CATALOG.filter(
    (p) =>
      (focus === "allaround" || p.focus.includes(focus) || p.focus.includes("allaround")) &&
      (!ageBand || p.age_bands.includes(ageBand)),
  );
}

// ---------- Gear test (recommendation engine) ----------

function rank(a: GearProduct, b: GearProduct): number {
  // Safety gear first, then cheapest first (brand voice: cheapest rep-getter wins),
  // then best rated.
  const safetyA = a.safety_note ? 0 : 1;
  const safetyB = b.safety_note ? 0 : 1;
  if (safetyA !== safetyB) return safetyA - safetyB;
  if (a.price_tier !== b.price_tier) return a.price_tier - b.price_tier;
  return b.rating - a.rating;
}

export function recommendGear(answers: GearTestAnswers): GearKit {
  const owned = new Set(answers.owned);
  const cap = TIER_CAP[answers.budget];

  const owns = (p: GearProduct) => owned.has(p.category) || owned.has(p.id);

  const matches = GEAR_CATALOG.filter(
    (p) =>
      p.age_bands.includes(answers.ageBand) &&
      (answers.focus === "allaround" || p.focus.includes(answers.focus) || p.focus.includes("allaround")) &&
      p.price_tier <= cap,
  ).sort(rank);

  const essentials: GearProduct[] = [];
  const niceToHave: GearProduct[] = [];
  const seenCategory = new Set<string>();

  for (const p of matches) {
    if (owns(p)) continue;
    if (!seenCategory.has(p.category) && essentials.length < 4) {
      essentials.push(p);
      seenCategory.add(p.category);
    } else if (niceToHave.length < 3) {
      niceToHave.push(p);
    }
  }

  const ownedItems = GEAR_CATALOG.filter(owns);

  const priceLow = essentials.reduce((sum, p) => sum + p.price_usd, 0);
  const priceHigh = priceLow + niceToHave.reduce((sum, p) => sum + p.price_usd, 0);

  const armCare = answers.focus === "throwing" || answers.focus === "pitching";
  const note = armCare
    ? "Here's your kit. Gear never replaces the arm-care plan — pitch counts and rest days come from Pitch Smart, not from how the kid feels. Start with the essentials, add the rest when you're ready."
    : "Here's your kit, cheapest rep-getters first. You don't need all of it to run a great practice tonight — grab the essentials and build from there.";

  return {
    essentials,
    niceToHave,
    owned: ownedItems,
    priceLow,
    priceHigh,
    note,
    disclosure: GEAR_DISCLOSURE,
  };
}

// ---------- Compiler inventory check ----------

/**
 * Given the equipment a practice plan calls for (drill `equipment_required`
 * tokens) and the categories a coach already owns, return the catalog products
 * that fill the gaps — so a plan can surface affiliate "grab this" buy-links.
 */
export function missingGearForEquipment(equipmentKeys: string[], ownedCategories: string[] = []): GearProduct[] {
  const owned = new Set(ownedCategories);
  const needed = new Set(equipmentKeys.map((e) => e.toLowerCase().replace(/\s+/g, "_")));
  const out: GearProduct[] = [];
  const seen = new Set<string>();

  for (const key of needed) {
    const match = GEAR_CATALOG.filter((p) => p.equipment_keys.includes(key)).sort(rank)[0];
    if (match && !owned.has(match.category) && !seen.has(match.id)) {
      out.push(match);
      seen.add(match.id);
    }
  }
  return out;
}
