import { describe, expect, it } from "vitest";
import { runtimeReadiness } from "./runtimeConfig";

describe("runtimeReadiness", () => {
  it("allows local development fallbacks", () => {
    const result = runtimeReadiness({ NODE_ENV: "development" });
    expect(result.ready).toBe(true);
    expect(result.config.email).toBe("console");
    expect(result.config.persistence).toBe("memory");
  });

  it("fails closed when production capabilities are missing", () => {
    const result = runtimeReadiness({ NODE_ENV: "production" });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["auth", "email", "persistence", "cron", "canonicalUrl", "privacyInbox"]);
    expect(result.config.email).toBe("unavailable");
  });

  it("accepts a fully configured Vercel production environment", () => {
    const result = runtimeReadiness({
      NODE_ENV: "production",
      PLATFORM_AUTH_SECRET: "secret",
      KV_REST_API_URL: "https://kv.example",
      KV_REST_API_TOKEN: "token",
      RESEND_API_KEY: "resend",
      EMAIL_FROM: "First Pitch <login@firstpitch.example>",
      CRON_SECRET: "cron",
      VERCEL_PROJECT_PRODUCTION_URL: "firstpitch.example",
      PRIVACY_INBOX: "privacy@firstpitch.example",
    });
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.config.persistence).toBe("kv");
  });

  it("does not treat a partial KV configuration as durable", () => {
    const result = runtimeReadiness({ NODE_ENV: "production", KV_REST_API_URL: "https://kv.example" });
    expect(result.config.persistence).toBe("memory");
    expect(result.missing).toContain("persistence");
  });
});