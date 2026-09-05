export type PersistenceBackend = "kv" | "file" | "memory";
export type EmailMode = "resend" | "console" | "unconfigured";

type RuntimeEnv = Partial<Pick<
  NodeJS.ProcessEnv,
  | "NODE_ENV"
  | "PLATFORM_AUTH_SECRET"
  | "PLATFORM_ALLOW_DEV_EMAIL"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
>>;

/**
 * Console delivery exposes authentication links, so it requires an explicit
 * local-development opt-in and can never be enabled in production.
 */
export function emailMode(env: RuntimeEnv = process.env): EmailMode {
  const hasApiKey = !!env.RESEND_API_KEY?.trim();
  const hasSender = !!env.EMAIL_FROM?.trim();
  if (hasApiKey && hasSender) return "resend";
  if (
    !hasApiKey &&
    env.NODE_ENV !== "production" &&
    env.PLATFORM_ALLOW_DEV_EMAIL === "1"
  ) {
    return "console";
  }
  return "unconfigured";
}

export function productionConfigurationIssues(
  backend: PersistenceBackend,
  env: RuntimeEnv = process.env,
): string[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: string[] = [];
  if (!env.PLATFORM_AUTH_SECRET?.trim()) issues.push("auth");
  if (emailMode(env) !== "resend") issues.push("email");
  if (backend === "memory") issues.push("persistence");
  return issues;
}
