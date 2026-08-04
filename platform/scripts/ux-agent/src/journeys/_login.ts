import type { JourneyContext } from "../types.ts";

const LANDING: Record<"coach" | "parent" | "player", string> = {
  coach: "/coach",
  parent: "/parent",
  player: "/missions",
};

const PERSONA_ENV: Record<"coach" | "parent" | "player", string> = {
  coach: "PERSONA_COACH_EMAIL",
  parent: "PERSONA_PARENT_EMAIL",
  player: "PERSONA_PLAYER_EMAIL",
};

/**
 * Optional binding to a seeded account (see scripts/seed-test-accounts). Unset,
 * journeys sign in as a throwaway user and therefore only ever score EMPTY
 * states — a parent with no child, a coach with no roster. Set, they score the
 * populated screens real users actually see.
 */
export function personaEmail(role: "coach" | "parent" | "player"): string | undefined {
  return process.env[PERSONA_ENV[role]]?.trim() || undefined;
}

/**
 * Reliable sign-in for journeys that want to evaluate the *destination*
 * workflow, not the login form itself. Posts to the auth API directly so the
 * journey doesn't fail on dev-mode HMR / controlled-input timing.
 *
 * The login form's own UX is evaluated separately by `signInWithForm`.
 */
export async function loginAs(ctx: JourneyContext, role: "coach" | "parent" | "player", email: string, name: string): Promise<void> {
  const res = await ctx.page.request.post("/api/auth/login", {
    data: { email: personaEmail(role) ?? email, role, name },
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) {
    ctx.flag({
      kind: "broken-step",
      severity: "critical",
      url: `${ctx.baseUrl}/api/auth/login`,
      message: `POST /api/auth/login returned ${res.status()} for role=${role}`,
      suggestion: "Auth endpoint should accept {email, role, name} and set a session cookie.",
    });
    return;
  }
  await ctx.goto(LANDING[role]);
}

/** Exercises the actual login form, for journeys that want to score sign-in UX. */
export async function signInWithForm(ctx: JourneyContext, role: "coach" | "parent" | "player", email: string, name: string): Promise<void> {
  await ctx.goto("/login");
  await ctx.page.waitForSelector("input#email", { timeout: 20_000 });
  const title = role[0]!.toUpperCase() + role.slice(1);
  const personaBtn = ctx.page.getByRole("radio", { name: title, exact: false }).first();
  if (await personaBtn.count() > 0) {
    await personaBtn.click();
    const cs = (ctx as unknown as { __currentStep?: { clicks: number } }).__currentStep;
    if (cs) cs.clicks++;
  }
  await ctx.type("input#email", personaEmail(role) ?? email);
  await ctx.type("input#name", name);
  await ctx.page.locator("form button[type=submit]:not([disabled])").waitFor({ timeout: 10_000 });
  await ctx.click("form button[type=submit]:not([disabled])");
  await ctx.page.waitForURL(new RegExp(LANDING[role].replace("/", "\\/")), { timeout: 15_000 }).catch(() => undefined);
}
