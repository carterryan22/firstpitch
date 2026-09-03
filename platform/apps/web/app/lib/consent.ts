/**
 * COPPA verifiable parental consent — server helpers.
 *
 * Children never self-register. When a child profile is created with a parent
 * email, we open a `pending` consent record, email the parent a one-time
 * verification link, and keep the profile gated until the parent verifies. The
 * profile stays usable for safety-critical coaching, but family-facing surfaces
 * and data sharing should check `consentStatus === "granted"`.
 */
import crypto from "node:crypto";
import { getRepos, type ConsentRecord, type PlayerRecord } from "@platform/storage";
import { hashToken } from "@platform/auth";
import { sendEmail, isEmailInDevMode, type SendEmailResult } from "./email";
import { ageFromDob } from "./players";
import { siteUrl } from "./site";

/** Bump when the privacy disclosure shown to parents materially changes. */
export const CONSENT_POLICY_VERSION = "2026-06-03";

/** COPPA applies to children under 13. */
export function requiresParentalConsent(player: Pick<PlayerRecord, "dob" | "ageBand">): boolean {
  if (player.dob) return ageFromDob(player.dob) < 13;
  // No DOB — fall back to age band. 6-8 and 9-12 are presumptively under 13.
  return player.ageBand === "6-8" || player.ageBand === "9-12";
}

const CONSENT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days to act

export interface RequestConsentInput {
  playerId: string;
  teamId?: string;
  parentEmail: string;
  parentUserId?: string;
  requestedByUserId?: string;
}

export interface RequestConsentResult {
  consent: ConsentRecord;
  delivery: SendEmailResult;
  /** Present only in email dev mode so the link is testable locally. */
  devLink?: string;
}

/**
 * Open (or re-open) a pending consent request for a child and email the parent.
 * Idempotent-ish: always issues a fresh token, superseding any prior pending one.
 */
export async function requestParentalConsent(input: RequestConsentInput): Promise<RequestConsentResult> {
  const repos = getRepos();
  const email = input.parentEmail.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);

  const consent = await repos.consents.createAndLinkPlayer({
    playerId: input.playerId,
    teamId: input.teamId,
    parentEmail: email,
    parentUserId: input.parentUserId,
    requestedByUserId: input.requestedByUserId,
    status: "pending",
    tokenHash,
    policyVersion: CONSENT_POLICY_VERSION,
    expiresAt: new Date(Date.now() + CONSENT_TTL_MS).toISOString(),
  });
  if (!consent) throw new Error("Player not found while requesting consent");

  const link = `${siteUrl()}/api/consent/verify?token=${token}`;
  const delivery = await sendEmail({
    to: email,
    subject: "Please approve your child's First Pitch profile",
    text:
      `A coach added your child to a team on First Pitch.\n\n` +
      `Before we activate the profile we need your permission as the parent or guardian.\n` +
      `Review what we collect and approve here (link expires in 30 days):\n\n${link}\n\n` +
      `If you didn't expect this, you can ignore this email and the profile stays inactive.\n` +
      `Questions: privacy@firstpitch.app`,
  });

  await repos.audit.log({
    userId: input.requestedByUserId,
    action: "consent_requested",
    resource: `player:${input.playerId}`,
    metadata: { consentId: consent.id, parentEmail: email },
  });

  return { consent, delivery, devLink: isEmailInDevMode() ? link : undefined };
}

export type GrantConsentOutcome =
  | { ok: true; consent: ConsentRecord }
  | { ok: false; reason: "invalid" | "expired" | "already" };

/** Consume a verification token and mark the consent granted + profile active. */
export async function grantConsentByToken(token: string): Promise<GrantConsentOutcome> {
  const repos = getRepos();
  const tokenHash = hashToken(token);
  const consent = await repos.consents.byTokenHash(tokenHash);
  if (!consent) return { ok: false, reason: "invalid" };
  if (consent.status === "granted") return { ok: false, reason: "already" };
  if (consent.expiresAt && Date.parse(consent.expiresAt) <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const updated = await repos.consents.update(consent.id, {
    status: "granted",
    grantedAt: new Date().toISOString(),
    verifiedVia: "email_link",
    // Burn the token so the link is single-use.
    tokenHash: undefined,
  });

  await repos.players.update(consent.playerId, {
    consentStatus: "granted",
    consentId: consent.id,
  });

  await repos.audit.log({
    userId: consent.parentUserId,
    action: "consent_granted",
    resource: `player:${consent.playerId}`,
    metadata: { consentId: consent.id },
  });

  return { ok: true, consent: updated ?? consent };
}

/** Revoke a previously granted consent (parent withdraws permission). */
export async function revokeConsent(consentId: string, byUserId?: string): Promise<ConsentRecord | undefined> {
  const repos = getRepos();
  const updated = await repos.consents.update(consentId, {
    status: "revoked",
    revokedAt: new Date().toISOString(),
    tokenHash: undefined,
  });
  if (updated) {
    await repos.players.update(updated.playerId, { consentStatus: "revoked" });
    await repos.audit.log({
      userId: byUserId,
      action: "consent_revoked",
      resource: `player:${updated.playerId}`,
      metadata: { consentId },
    });
  }
  return updated;
}
