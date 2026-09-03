export type PersistenceBackend = "kv" | "file" | "memory";

type RuntimeEnv = Readonly<Record<string, string | undefined>>;

export function runtimeReadiness(env: RuntimeEnv = process.env) {
  const production = env.NODE_ENV === "production";
  const persistence: PersistenceBackend =
    env.KV_REST_API_URL && env.KV_REST_API_TOKEN
      ? "kv"
      : env.PLATFORM_DATA_DIR
        ? "file"
        : "memory";
  const emailReady = Boolean(env.RESEND_API_KEY && (!production || env.EMAIL_FROM));
  const config = {
    auth: Boolean(env.PLATFORM_AUTH_SECRET),
    email: emailReady ? ("resend" as const) : production ? ("unavailable" as const) : ("console" as const),
    persistence,
    cron: Boolean(env.CRON_SECRET),
    canonicalUrl: Boolean(env.NEXT_PUBLIC_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL),
    privacyInbox: Boolean(env.PRIVACY_INBOX),
  };
  const missing = production
    ? [
        !config.auth && "auth",
        config.email !== "resend" && "email",
        config.persistence === "memory" && "persistence",
        !config.cron && "cron",
        !config.canonicalUrl && "canonicalUrl",
        !config.privacyInbox && "privacyInbox",
      ].filter((value): value is string => Boolean(value))
    : [];

  return { production, ready: missing.length === 0, config, missing };
}