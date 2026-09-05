import { describe, expect, it } from "vitest";
import { emailMode, productionConfigurationIssues } from "./runtimeConfig";

describe("emailMode", () => {
  it("requires both Resend credentials", () => {
    expect(emailMode({ NODE_ENV: "production", RESEND_API_KEY: "key", EMAIL_FROM: "from@x.com" })).toBe(
      "resend",
    );
    expect(emailMode({ NODE_ENV: "production", RESEND_API_KEY: "key" })).toBe("unconfigured");
    expect(emailMode({ NODE_ENV: "production", EMAIL_FROM: "from@x.com" })).toBe("unconfigured");
  });

  it("only enables console links through an explicit non-production flag", () => {
    expect(emailMode({ NODE_ENV: "development", PLATFORM_ALLOW_DEV_EMAIL: "1" })).toBe("console");
    expect(emailMode({ NODE_ENV: "development" })).toBe("unconfigured");
    expect(emailMode({ NODE_ENV: "production", PLATFORM_ALLOW_DEV_EMAIL: "1" })).toBe(
      "unconfigured",
    );
  });
});

describe("productionConfigurationIssues", () => {
  it("reports missing production auth, email, and persistence", () => {
    expect(productionConfigurationIssues("memory", { NODE_ENV: "production" })).toEqual([
      "auth",
      "email",
      "persistence",
    ]);
  });

  it("accepts a fully configured persistent production runtime", () => {
    expect(
      productionConfigurationIssues("kv", {
        NODE_ENV: "production",
        PLATFORM_AUTH_SECRET: "secret",
        RESEND_API_KEY: "key",
        EMAIL_FROM: "from@x.com",
      }),
    ).toEqual([]);
  });

  it("does not make production services mandatory for local development", () => {
    expect(productionConfigurationIssues("memory", { NODE_ENV: "development" })).toEqual([]);
  });
});
