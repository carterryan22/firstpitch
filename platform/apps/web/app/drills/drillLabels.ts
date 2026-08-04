// Human-readable labels for drill enum codes that show up in the UI.

export const TIER_LABELS: Record<string, string> = {
  T1_field: "Full field",
  T2_cage_gym: "Cage / Gym",
  T3_backyard: "Backyard",
  T4_living_room: "Living room",
};

export function tierLabel(tier: string | undefined | null): string {
  if (!tier) return "";
  return TIER_LABELS[tier] ?? tier;
}

// Accept short forms (T1, T2, T3, T4) as aliases for the canonical tier slugs.
const TIER_SHORT_FORMS: Record<string, string> = {
  T1: "T1_field",
  T2: "T2_cage_gym",
  T3: "T3_backyard",
  T4: "T4_living_room",
};

export function normalizeTier(tier: string | undefined | null): string | undefined {
  if (!tier) return undefined;
  if (tier in TIER_LABELS) return tier;
  if (tier in TIER_SHORT_FORMS) return TIER_SHORT_FORMS[tier];
  return undefined;
}

export const TOPIC_LABELS: Record<string, string> = {
  hitting: "Hitting",
  pitching: "Pitching",
  fielding: "Fielding",
  baserunning: "Baserunning",
  catching: "Catching",
  throwing: "Throwing",
  defense: "Defense",
  mental: "Mental",
  strength: "Strength & conditioning",
  baseball_iq: "Baseball IQ",
};

export function topicLabel(topic: string | undefined | null): string {
  if (!topic) return "";
  return TOPIC_LABELS[topic] ?? topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const TIER_ORDER = ["T1_field", "T2_cage_gym", "T3_backyard", "T4_living_room"];

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  published: "Published",
  retired: "Retired",
};

export function reviewStatusLabel(status: string | undefined | null): string {
  if (!status) return "";
  return REVIEW_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/**
 * Mirrors `pickDrills` in @platform/compiler: a drill the compiler refuses to
 * prescribe must not be listed as vetted content either. Drafts stay reachable
 * by direct URL (where the detail page shows a Draft badge) so they can be
 * reviewed, but they are kept out of the library and the public API.
 */
export function isPubliclyListable(status: string | undefined | null): boolean {
  return status !== "draft" && status !== "retired";
}
