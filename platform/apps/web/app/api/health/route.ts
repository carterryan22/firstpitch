import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { emailMode, productionConfigurationIssues } from "../../lib/runtimeConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for uptime monitors and deploy smoke checks.
 *
 * - Confirms the storage backend is reachable (a read does not throw).
 * - Reports which subsystems are CONFIGURED as booleans/labels only — never
 *   the secret values themselves, and never any user data (no record counts).
 *
 * Returns 200 when the store is reachable, 503 otherwise. `/api/` is already
 * disallowed in robots.ts, so this is not indexable.
 */
function persistenceBackend(): "kv" | "file" | "memory" {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return "kv";
  if (process.env.PLATFORM_DATA_DIR) return "file";
  return "memory";
}

export async function GET() {
  const time = new Date().toISOString();
  const backend = persistenceBackend();
  const config = {
    auth: !!process.env.PLATFORM_AUTH_SECRET,
    email: emailMode(),
    persistence: backend,
    cron: !!process.env.CRON_SECRET,
  };

  // Production auth, email, and durable persistence are all required for the
  // application to be ready to serve sign-in traffic.
  const configurationIssues = productionConfigurationIssues(backend);
  const misconfigured = configurationIssues.length > 0;

  let storeReachable = false;
  try {
    // Single lightweight read — confirms the backend answers without exposing
    // any data. For KV this is one round-trip to the blob key.
    await getRepos().teams.list();
    storeReachable = true;
  } catch {
    storeReachable = false;
  }

  const ok = storeReachable && !misconfigured;
  const status = !storeReachable ? "error" : misconfigured ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      time,
      store: { backend, reachable: storeReachable },
      config,
      ...(misconfigured ? { missing: configurationIssues } : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
