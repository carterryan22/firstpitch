import { NextResponse, type NextRequest } from "next/server";
import { getRepos } from "@platform/storage";
import { AuthError, issueLoginToken, type Role } from "@platform/auth";
import { sendEmail, isEmailInDevMode } from "../../../lib/email";
import { reportError } from "../../../lib/monitoring";
import { sanitizeRedirect } from "../../../lib/safeRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES: Role[] = ["coach", "parent", "player", "admin"];

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    role?: string;
    name?: string;
    redirectTo?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || email.length > 200 || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!body.role || !VALID_ROLES.includes(body.role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  // Whitelist redirect to same-app paths only — never accept arbitrary URLs.
  const redirectTo = sanitizeRedirect(body.redirectTo);

  let issued;
  try {
    issued = await issueLoginToken(getRepos(), {
      email,
      role: body.role as Role,
      name: body.name,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await reportError(error, { source: "api/auth/request-link" });
    return NextResponse.json({ error: "Unable to create a sign-in link." }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const magicLink = `${origin}/api/auth/verify?token=${encodeURIComponent(issued.token)}`;

  const result = await sendEmail({
    to: email,
    subject: "Your First Pitch sign-in link",
    text: [
      "Tap the link below to sign in to First Pitch.",
      "",
      magicLink,
      "",
      "This link expires in 15 minutes and can only be used once.",
      "If you didn't request it, ignore this email. No account changes happen until the link is opened.",
    ].join("\n"),
    html: [
      "<p>Tap the link below to sign in to First Pitch.</p>",
      `<p><a href="${magicLink}" style="background:#1A1410;color:#F5EFE0;padding:12px 18px;text-decoration:none;display:inline-block;border-radius:4px">Sign in to First Pitch →</a></p>`,
      `<p style="color:#666;font-size:12px">Or copy &amp; paste: ${magicLink}</p>`,
      "<p style=\"color:#666;font-size:12px\">This link expires in 15 minutes and can only be used once. If you didn't request it, ignore this email.</p>",
    ].join("\n"),
  });

  if (!result.ok) {
    await reportError(new Error(result.error ?? "Email delivery failed"), {
      source: "api/auth/request-link",
    });
    return NextResponse.json(
      { error: "Email delivery is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  // In dev (no email provider configured) return the link so localhost flows
  // don't require a real inbox. NEVER do this when a real provider is wired.
  const includeDevLink = isEmailInDevMode();
  return NextResponse.json({
    ok: true,
    delivery: result.provider,
    expiresAt: issued.expiresAt,
    ...(includeDevLink ? { devLink: magicLink } : {}),
    ...(result.ok ? {} : { warning: result.error }),
  });
}
