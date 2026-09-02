/**
 * Tiny email-sender shim. Uses Resend's HTTP API when fully configured.
 * Console delivery is an explicit, local-development-only mode.
 */

import { emailMode } from "./runtimeConfig";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body — falls back to text if omitted. */
  html?: string;
  /** Override sender address. Defaults to `EMAIL_FROM` env. */
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "console" | "unconfigured";
  id?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? process.env.EMAIL_FROM;
  const mode = emailMode({ ...process.env, EMAIL_FROM: from });

  if (mode === "unconfigured") {
    return {
      ok: false,
      provider: "unconfigured",
      error: "Email delivery is not configured",
    };
  }

  if (mode === "console") {
    // eslint-disable-next-line no-console
    console.info(
      `[email:console] to=${input.to} from=${from ?? "First Pitch <local>"} subject=${JSON.stringify(input.subject)}\n${input.text}`,
    );
    return { ok: true, provider: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre style="font-family:ui-monospace,monospace">${escapeHtml(input.text)}</pre>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, provider: "resend", error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, provider: "resend", id: json.id };
  } catch (e) {
    return { ok: false, provider: "resend", error: (e as Error).message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when emails will only be logged (no provider configured). */
export function isEmailInDevMode(): boolean {
  return emailMode() === "console";
}
