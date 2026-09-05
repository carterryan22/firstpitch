type StorageEnvironment = Record<string, string | undefined>;

/** Demo and preview runtimes must never fall through to the production blob. */
export function kvKeyForEnvironment(env: StorageEnvironment = process.env): string {
  const key = env.PLATFORM_KV_KEY ?? "platform:db";
  if (!/^[a-zA-Z0-9:_-]{1,200}$/.test(key)) {
    throw new Error("PLATFORM_KV_KEY must be a non-empty alphanumeric namespace");
  }
  const isolated = /^platform:(demo|preview):[a-zA-Z0-9_-][a-zA-Z0-9:_-]*$/.test(key);
  if (env.VERCEL_ENV === "production" && (isolated || env.PLATFORM_ALLOW_DEV_LOGIN === "1")) {
    throw new Error("Demo storage and passwordless demo login are forbidden in Vercel Production");
  }
  if ((env.VERCEL_ENV === "preview" || env.PLATFORM_ALLOW_DEV_LOGIN === "1") && !isolated) {
    throw new Error("Preview and demo KV storage require an isolated PLATFORM_KV_KEY beginning platform:demo: or platform:preview:");
  }
  return key;
}
