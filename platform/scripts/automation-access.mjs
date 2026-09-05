/** Keep the temporary project-wide secret confined to an explicitly selected HTTPS origin. */
export function automationHeaders(url, env = process.env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  const authorized = new URL(env.QA_AUTHORIZED_PREVIEW_ORIGIN ?? "");
  if (authorized.protocol !== "https:" || authorized.username || authorized.password ||
      authorized.pathname !== "/" || authorized.search || authorized.hash) {
    throw new Error("Automation access requires an explicit HTTPS preview origin");
  }
  const target = new URL(url);
  if (target.origin !== authorized.origin || target.username || target.password) return {};
  return { "x-vercel-protection-bypass": secret };
}

/** Exchange the header for a host-scoped cookie, never global extraHTTPHeaders. */
export async function authorizePreviewContext(context, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const headers = automationHeaders(origin);
  if (!Object.keys(headers).length) return;
  await context.request.get(origin, {
    headers: { ...headers, "x-vercel-set-bypass-cookie": "true" }, maxRedirects: 0,
  });
  const response = await context.request.get(`${origin}/api/auth/session`, { maxRedirects: 0 });
  const session = response.headers()["content-type"]?.includes("application/json")
    ? await response.json().catch(() => null) : null;
  if (!response.ok() || !session || !("user" in session)) {
    throw new Error("Could not establish protected Preview access for this browser context");
  }
}
