/**
 * Lightweight, dependency-free error reporting.
 *
 * Configure either:
 *   - SENTRY_DSN          → posts to Sentry's Store endpoint (envelope-free, classic store API)
 *   - ERROR_WEBHOOK_URL   → posts a JSON payload to any webhook (Slack, Discord, custom)
 *
 * If neither is set we just log to stderr, so local/dev never depends on a
 * network call. Mirrors the email.ts dev-mode pattern.
 */

export interface ErrorContext {
  /** Where the error came from, e.g. "api/teams" or "global-error". */
  source?: string;
  userId?: string;
  /** Arbitrary extra detail. Keep it small and non-sensitive. */
  extra?: Record<string, unknown>;
}

export function isMonitoringInDevMode(): boolean {
  return !process.env.SENTRY_DSN && !process.env.ERROR_WEBHOOK_URL;
}

function serializeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "NonError", message: typeof error === "string" ? error : JSON.stringify(error) };
}

async function postWebhook(url: string, body: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // Never let monitoring block the request lifecycle for long.
    signal: AbortSignal.timeout(3000),
  });
}

/** Report an error. Never throws — monitoring must not break the app. */
export async function reportError(error: unknown, context: ErrorContext = {}): Promise<void> {
  const err = serializeError(error);
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

  if (isMonitoringInDevMode()) {
    // eslint-disable-next-line no-console
    console.error(`[monitoring:${context.source ?? "app"}]`, err.name, err.message, context.extra ?? "");
    return;
  }

  try {
    const webhook = process.env.ERROR_WEBHOOK_URL;
    if (webhook) {
      await postWebhook(webhook, {
        text: `🛑 ${err.name}: ${err.message}`,
        source: context.source,
        userId: context.userId,
        env,
        stack: err.stack,
        extra: context.extra,
        at: new Date().toISOString(),
      });
      return;
    }

    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      await sendToSentry(dsn, err, context, env);
    }
  } catch {
    // Swallow — a failed report should never surface to the user.
    // eslint-disable-next-line no-console
    console.error(`[monitoring] failed to deliver report for ${err.name}`);
  }
}

/**
 * Minimal Sentry "store" call. Parses the DSN and posts a bare event so we
 * don't need the @sentry/* SDK at launch. Swap for the SDK later if desired.
 */
async function sendToSentry(
  dsn: string,
  err: { name: string; message: string; stack?: string },
  context: ErrorContext,
  env: string
): Promise<void> {
  // DSN: https://<publicKey>@<host>/<projectId>
  const m = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn);
  if (!m) return;
  const [, publicKey, host, projectId] = m;
  const endpoint = `https://${host}/api/${projectId}/store/`;

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    environment: env,
    level: "error",
    logger: context.source ?? "app",
    exception: {
      values: [{ type: err.name, value: err.message, stacktrace: err.stack ? { frames: [] } : undefined }],
    },
    extra: { stack: err.stack, ...context.extra },
    user: context.userId ? { id: context.userId } : undefined,
  };

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=first-pitch/0.1`,
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(3000),
  });
}
