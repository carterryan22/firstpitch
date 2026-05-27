import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRepos } from "@platform/storage";
import { SESSION_COOKIE, decodeCookie, logout } from "@platform/auth";

export async function POST() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const id = decodeCookie(raw);
  if (id) await logout(getRepos(), id);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
