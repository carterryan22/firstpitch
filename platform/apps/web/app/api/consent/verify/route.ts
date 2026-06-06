import { NextResponse, type NextRequest } from "next/server";
import { grantConsentByToken } from "../../../lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parent clicks the one-time link from their email. Consumes the token, marks
 * the consent granted, and redirects to a human-readable confirmation page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const base = req.nextUrl.origin;
  if (!token) {
    return NextResponse.redirect(`${base}/policy/consent?status=missing`);
  }
  const outcome = await grantConsentByToken(token);
  if (outcome.ok) {
    return NextResponse.redirect(`${base}/policy/consent?status=granted`);
  }
  return NextResponse.redirect(`${base}/policy/consent?status=${outcome.reason}`);
}
