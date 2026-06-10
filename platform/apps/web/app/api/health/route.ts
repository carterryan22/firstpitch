import { NextResponse } from "next/server";
import { getRepos } from "@platform/storage";

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
  const isProd = process.env.NODE_ENV === "production";

  const config = {
    auth: !!process.env.PLATFORM_AUTH_SECRET,
    email: process.env.RESEND_API_KEY ? ("resend" as const) : ("console" as const),
    persistence: backend,
    cron: !!process.env.CRON_SECRET,
  };

  // In production, an in-memory store loses data between invocations and a
  // missing auth secret means auth can't boot — surface these as not-ready.
  const misconfigured =
    isProd && (backend === "memory" || !config.auth);

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
    { status, time, store: { backend, reachable: storeReachable }, config },
    { status: ok ? 200 : 503 },
  );
}
