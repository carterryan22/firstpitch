/**
 * Tiny email-sender shim. Uses Resend's HTTP API if `RESEND_API_KEY` is set,
 * otherwise logs to stdout (dev). No npm dependency required.
 */

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
  provider: "resend" | "console";
  id?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? process.env.EMAIL_FROM ?? "First Pitch <noreply@firstpitch.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, provider: "console", error: "Email provider is not configured" };
    }
    // Dev / preview mode — log so the link is visible in server logs.
    // eslint-disable-next-line no-console
    console.log(
      `[email:console] to=${input.to} from=${from} subject=${JSON.stringify(input.subject)}\n${input.text}`,
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
  return process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;
}
