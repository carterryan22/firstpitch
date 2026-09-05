import type { Scenario } from "../types.ts";

/** Only run in an explicitly enabled isolated demo, never a real-user database. */
export const adminAccessScenario: Scenario = {
  name: "admin-access-boundaries",
  persona: "admin / coach / parent / player / anonymous",
  description: "Verify operator status and audit pages for an admin, and denial for every other role.",
  async run(ctx) {
    const pages = ["/admin/status", "/admin/audit"];
    ctx.step("anonymous cannot open operator pages");
    await ctx.context.clearCookies({ name: "platform_session" });
    for (const path of pages) await ctx.goto(path, { expectPath: "/login" });

    for (const role of ["coach", "parent", "player"] as const) {
      ctx.step(`${role} cannot open operator pages`);
      await ctx.context.clearCookies({ name: "platform_session" });
      const signedIn = await ctx.api("/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `qa-operator-denial-${role}@firstpitch.test`, role }),
      });
      if (!ctx.expect(signedIn.ok, `${role} fixture sign-in failed`, "blocker")) return;
      for (const path of pages) {
        await ctx.goto(path, { expectPath: "/" });
        ctx.expect(await ctx.page.getByRole("heading", { name: /^(Platform status|Audit log)$/ }).count() === 0,
          `${role} received operator-only content`, "blocker");
      }
    }

    ctx.step("admin can read platform status and audit log");
    await ctx.context.clearCookies({ name: "platform_session" });
    const signedIn = await ctx.api("/api/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "qa-operator-admin@firstpitch.test", role: "admin" }),
    });
    if (!ctx.expect(signedIn.ok, "Admin fixture sign-in failed", "blocker")) return;
    for (const [path, title] of [["/admin/status", "Platform status"], ["/admin/audit", "Audit log"]] as const) {
      await ctx.goto(path, { expectPath: path });
      ctx.expect(await ctx.page.getByRole("heading", { name: title, exact: true }).count() === 1,
        `Admin could not read ${title}`, "blocker");
    }
  },
};
