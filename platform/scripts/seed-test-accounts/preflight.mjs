/** Fail before login or writes unless the target reports durable, reachable storage. */
export function validateSeedHealth(status, health, allowNoEmail = false) {
  if (!health || typeof health !== "object" ||
      health.store?.reachable !== true ||
      !["kv", "file"].includes(health.store?.backend) ||
      health.config?.auth !== true) {
    throw new Error("Seed target must have configured authentication and reachable persistent storage");
  }
  if (status === 200 && health.status === "ok" && !(health.missing?.length)) return;
  if (allowNoEmail && status === 503 && health.status === "degraded" &&
      Array.isArray(health.missing) && health.missing.length === 1 && health.missing[0] === "email") return;
  throw new Error("Seed target is not ready. Only an isolated demo may opt into SEED_ALLOW_NO_EMAIL=1 when email is the sole missing service");
}
