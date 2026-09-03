import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";
import { runtimeReadiness } from "../../lib/runtimeConfig";

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
export async function GET() {
  const time = new Date().toISOString();
  const readiness = runtimeReadiness();

  let storeReachable = false;
  try {
    // Single lightweight read — confirms the backend answers without exposing
    // any data. For KV this is one round-trip to the blob key.
    await getRepos().teams.list();
    storeReachable = true;
  } catch {
    storeReachable = false;
  }

  const ok = storeReachable && readiness.ready;
  const status = !storeReachable ? "error" : !readiness.ready ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      time,
      store: { backend: readiness.config.persistence, reachable: storeReachable },
      config: readiness.config,
    },
    { status: ok ? 200 : 503 },
  );
}
