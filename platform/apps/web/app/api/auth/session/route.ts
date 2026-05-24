import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: s.user.id, email: s.user.email, role: s.user.role, name: s.user.name },
  });
}
