import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../../lib/session";
import { siteUrl } from "../../../lib/site";
import { getPlan, isBillingEnabled, priceIdFor, type PlanId } from "../../../lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  plan?: PlanId;
}

/**
 * Creates a Stripe Checkout Session for the chosen plan and returns its URL.
 *
 * Dependency-free: we call Stripe's REST API directly with the secret key so
 * we don't ship the SDK before billing is turned on. If STRIPE_SECRET_KEY is
 * unset the endpoint reports billing-disabled (HTTP 503) and the UI stays on
 * the Free tier.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isBillingEnabled()) {
    return NextResponse.json(
      { error: "billing_disabled", message: "Billing isn't enabled yet — every team is on us." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const plan = body.plan ? getPlan(body.plan) : undefined;
  if (!plan || plan.id === "free") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const priceId = priceIdFor(plan.id);
  if (!priceId) {
    return NextResponse.json(
      { error: "price_not_configured", message: `Set ${plan.priceEnv} to enable the ${plan.name} plan.` },
      { status: 503 }
    );
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("customer_email", session.user.email);
  params.set("client_reference_id", session.user.id);
  params.set("success_url", `${siteUrl()}/billing?status=success`);
  params.set("cancel_url", `${siteUrl()}/billing?status=cancelled`);
  params.set("metadata[userId]", session.user.id);
  params.set("metadata[plan]", plan.id);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "stripe_error", message: "Could not start checkout.", detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const checkout = (await res.json()) as { url?: string };
  if (!checkout.url) {
    return NextResponse.json({ error: "no_checkout_url" }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url });
}
