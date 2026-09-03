import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmailInDevMode, sendEmail } from "./email";

describe("email configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs links only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await sendEmail({ to: "parent@example.com", subject: "Sign in", text: "secret-link" });

    expect(result).toMatchObject({ ok: true, provider: "console" });
    expect(isEmailInDevMode()).toBe(true);
    expect(log).toHaveBeenCalledOnce();
  });

  it("fails closed without logging tokens in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await sendEmail({ to: "parent@example.com", subject: "Sign in", text: "secret-link" });

    expect(result).toMatchObject({ ok: false, provider: "console" });
    expect(isEmailInDevMode()).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});