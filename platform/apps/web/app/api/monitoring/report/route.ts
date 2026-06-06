import { NextResponse, type NextRequest } from "next/server";
import { reportError } from "../../../lib/monitoring";
import { getSession } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  name?: string;
  message?: string;
  stack?: string;
  digest?: string;
  source?: string;
}

/** Receives client-side error reports (e.g. from global-error.tsx). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const session = await getSession().catch(() => null);

  const err = Object.assign(new Error(body.message || "client error"), {
    name: body.name || "ClientError",
    stack: body.stack,
  });

  await reportError(err, {
    source: body.source || "client",
    userId: session?.user.id,
    extra: { digest: body.digest },
  });

  return NextResponse.json({ ok: true });
}
