import Link from "next/link";
import { getSession } from "../lib/session";
import { PLANS, isBillingEnabled } from "../lib/billing";
import { UpgradeButton } from "./UpgradeButton";

export const metadata = {
  title: "Plans & pricing",
  description: "Free for one team forever. Upgrade for AI coaching, multiple teams, and club tools.",
};

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession().catch(() => null);
  const { status } = await searchParams;

  return (
    <article className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Pricing</p>
        <h1>Free for one team. Upgrade when you grow.</h1>
        <p className="text-ink/80">
          Every coach gets the full safety-first toolkit free for a single team. Paid plans add AI
          coaching, multiple rosters, and club-wide tools.
        </p>
      </header>

      {status === "success" && (
        <div className="card border-field-500">
          <p className="m-0">Thanks, your subscription is active. It may take a moment to reflect.</p>
        </div>
      )}
      {status === "cancelled" && (
        <div className="card">
          <p className="m-0">Checkout cancelled. You&apos;re still on your current plan.</p>
        </div>
      )}
      {!isBillingEnabled() && (
        <div className="card">
          <p className="m-0 text-ink/80">
            Billing isn&apos;t switched on yet. <strong>Everything is free during launch</strong>.
            These tiers show where we&apos;re headed.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col gap-3 ${plan.highlight ? "border-field-500" : ""}`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg">{plan.name}</h2>
                {plan.highlight && <span className="badge-info">Popular</span>}
              </div>
              <p className="m-0 text-2xl font-bold">
                {plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`}
                {plan.priceMonthly > 0 && <span className="text-sm font-normal text-ink/60">/mo</span>}
              </p>
              <p className="m-0 text-sm text-ink/70">{plan.tagline}</p>
            </div>
            <ul className="m-0 flex-1 space-y-1 pl-4 text-sm text-ink/80">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <UpgradeButton plan={plan} signedIn={!!session} />
          </div>
        ))}
      </div>

      <p className="text-sm text-ink/60">
        Questions about plans? Email{" "}
        <a href="mailto:hello@firstpitch.app" className="underline">hello@firstpitch.app</a>. See our{" "}
        <Link href="/policy/terms" className="underline">Terms</Link> for billing details.
      </p>
    </article>
  );
}
