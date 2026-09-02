import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

const message = { to: "user@example.com", subject: "Sign in", text: "secret-link" };

describe("sendEmail configuration", () => {
  it("fails closed without a provider and does not log the message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    vi.stubEnv("PLATFORM_ALLOW_DEV_EMAIL", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendEmail(message)).resolves.toMatchObject({
      ok: false,
      provider: "unconfigured",
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs only when explicitly enabled outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.RESEND_API_KEY;
    vi.stubEnv("EMAIL_FROM", "First Pitch <local@example.com>");
    vi.stubEnv("PLATFORM_ALLOW_DEV_EMAIL", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendEmail(message)).resolves.toMatchObject({ ok: true, provider: "console" });
    expect(log).toHaveBeenCalledOnce();
  });
});
