import type { Scenario } from "../types.ts";

function adminEmail(): string {
  return process.env.PERSONA_ADMIN_EMAIL?.trim() || `qa-admin+${Date.now()}@test.local`;
}

export const adminFlowScenario: Scenario = {
  name: "admin-operations",
  persona: "admin",
  description:
    "Verify platform status and audit-log workflows as an admin, then prove a coach cannot open either admin surface.",
  async run(ctx) {
    ctx.step("login as admin");
    const adminLogin = await ctx.page.request.post("/api/auth/login", {
      data: { email: adminEmail(), role: "admin", name: "QA Admin" },
      headers: { "content-type": "application/json" },
    });
    if (!ctx.expect(adminLogin.ok(), `admin login returned ${adminLogin.status()}`, "blocker")) return;

    ctx.step("platform status");
    await ctx.goto("/admin/status");
    const statusBody = (await ctx.page.locator("body").innerText()).toLowerCase();
    ctx.expect(statusBody.includes("platform status"), "admin status page has no platform status heading");
    ctx.expect(statusBody.includes("all checks pass"), "admin status page does not show the eval suite passing", "major");
    assertNoLeakedText(ctx, statusBody, "admin status");

    ctx.step("audit log and filter");
    await ctx.goto("/admin/audit?action=login");
    const auditBody = (await ctx.page.locator("body").innerText()).toLowerCase();
    ctx.expect(auditBody.includes("audit log"), "admin audit page has no audit log heading");
    ctx.expect(auditBody.includes("login"), "audit filter returned no login activity", "major");
    assertNoLeakedText(ctx, auditBody, "admin audit");

    ctx.step("coach blocked from admin surfaces");
    await ctx.page.request.post("/api/auth/logout");
    const coachLogin = await ctx.page.request.post("/api/auth/login", {
      data: { email: `qa-admin-deny+${Date.now()}@test.local`, role: "coach", name: "QA Coach" },
      headers: { "content-type": "application/json" },
    });
    if (!ctx.expect(coachLogin.ok(), `coach login returned ${coachLogin.status()}`, "blocker")) return;

    for (const path of ["/admin/status", "/admin/audit"]) {
      await ctx.page.goto(`${ctx.baseUrl}${path}`, { waitUntil: "domcontentloaded" });
      const finalPath = new URL(ctx.page.url()).pathname;
      ctx.expect(!finalPath.startsWith("/admin"), `coach remained on protected route ${path}`, "blocker");
    }
  },
};

function assertNoLeakedText(
  ctx: Parameters<Scenario["run"]>[0],
  body: string,
  label: string,
): void {
  ctx.expect(!body.includes("undefined"), `${label} contains literal undefined`);
  ctx.expect(!body.includes("[object object]"), `${label} contains [object Object]`);
  ctx.expect(!/\bnan\b/.test(body), `${label} contains NaN`);
}
