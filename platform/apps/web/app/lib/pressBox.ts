// Press Box public-share token helpers.
//
// A press-box URL is stateless: `/p/g/<gameId>/<sig>` where
//   sig = HMAC-SHA256(PLATFORM_AUTH_SECRET, gameId).slice(0,16) base64url.
// We don't persist a token. The game must have `shareEnabled === true`
// for the route to render — that's the kill switch.

import crypto from "node:crypto";

function secret(): string {
  return process.env.PLATFORM_AUTH_SECRET ?? "dev-insecure-secret";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signGameId(gameId: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(gameId).digest()).slice(0, 22);
}

export function verifyGameSig(gameId: string, sig: string): boolean {
  const expected = signGameId(gameId);
  if (expected.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function pressBoxPath(gameId: string): string {
  return `/p/g/${gameId}/${signGameId(gameId)}`;
}
