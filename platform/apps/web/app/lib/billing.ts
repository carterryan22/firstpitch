/**
 * Subscription plan catalog. Source of truth for pricing UI + checkout.
 *
 * Billing is OPTIONAL at launch — the platform is fully usable on the Free
 * tier. Stripe is only wired when STRIPE_SECRET_KEY (and the per-plan price
 * IDs) are present, so we can ship without it and flip it on later.
 *
 * Pricing per coach-platform-build-plan.md §1.6.
 */

export type PlanId = "free" | "coach" | "multi" | "club";

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in USD. 0 = free. */
  priceMonthly: number;
  tagline: string;
  features: string[];
  /** Max teams included; null = unlimited. */
  teamLimit: number | null;
  /** Env var holding the Stripe Price ID for this plan, if billable. */
  priceEnv?: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Everything one coach needs for a single team.",
    teamLimit: 1,
    features: [
      "1 team",
      "Practice compiler with safety checks",
      "Lineup engine + Pitch Smart enforcement",
      "Fairness grid & parent Press Box",
    ],
  },
  {
    id: "coach",
    name: "Coach",
    priceMonthly: 39,
    tagline: "For the season-long head coach who wants the full toolkit.",
    teamLimit: 1,
    priceEnv: "STRIPE_PRICE_COACH",
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited AI coaching assistant",
      "Weekly parent digests",
      "Missions & home training assignments",
      "Priority email support",
    ],
  },
  {
    id: "multi",
    name: "Multi-Team",
    priceMonthly: 79,
    tagline: "For coaches running more than one roster.",
    teamLimit: 5,
    priceEnv: "STRIPE_PRICE_MULTI",
    features: [
      "Everything in Coach",
      "Up to 5 teams",
      "Cross-team player development tracking",
      "Shared drill library",
    ],
  },
  {
    id: "club",
    name: "Club",
    priceMonthly: 299,
    tagline: "For leagues and clubs standardizing across coaches.",
    teamLimit: null,
    priceEnv: "STRIPE_PRICE_CLUB",
    features: [
      "Everything in Multi-Team",
      "Unlimited teams & coaches",
      "Club-wide safety reporting",
      "Admin console & onboarding support",
    ],
  },
];

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** True when Stripe is configured enough to actually take a payment. */
export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Resolve the Stripe Price ID for a plan, if both env + plan are configured. */
export function priceIdFor(id: PlanId): string | undefined {
  const plan = getPlan(id);
  if (!plan?.priceEnv) return undefined;
  return process.env[plan.priceEnv] || undefined;
}
