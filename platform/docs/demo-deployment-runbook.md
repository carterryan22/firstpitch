# Hosted demo release checklist

This is a release gate, not evidence that live verification has already passed.
Local tests, a successful build, and a successful Vercel deployment do not prove
hosted data persistence or delivery of sign-in emails.

## 1. Isolate the data before sign-in or seeding

- Use an isolated Preview deployment, preferably with a separate Redis database.
- Set branch-scoped `PLATFORM_KV_KEY=platform:demo:firstpitch-production-demo-blockers`.
- Keep `PLATFORM_AUTH_SECRET`, both KV credentials, and `PLATFORM_ALLOW_DEV_LOGIN=1`
  available to that Preview. Build its demo buttons with `NEXT_PUBLIC_DEMO_MODE=1`.
- The storage factory refuses Preview/demo access to the production `platform:db`
  namespace. Vercel Production never permits passwordless demo login.
- Namespaces isolate application records, not provider credentials or capacity.
  Do not assume older deployments have this safeguard; retain their protection.
- Do not reset, overwrite, or migrate the production key to make a demo work.

## 2. Obtain authorized automated access

Vercel-protected deployments can return an HTML sign-in page with status 200.
The QA/UX runners and seed preflight now reject that response. Do not disable
deployment protection or create automation-bypass credentials without approval.
Browser-visible public pages are not proof that the API is accessible.

Once temporary automation access is approved, pass its secret through the
`VERCEL_AUTOMATION_BYPASS_SECRET` process environment and set
`QA_AUTHORIZED_PREVIEW_ORIGIN` to the exact HTTPS Preview origin. The runners
send the header only to that origin and exchange it for a host-scoped browser
cookie; it is not attached globally to third-party requests. Persona switches
clear the application session while preserving Vercel access. Revoke the
temporary secret after the run and verify it no longer opens the protected API.
Never place it in a URL, command argument, source file, or report.

## 3. Seed and verify

From `platform/`, set `SEED_BASE_URL` to the explicitly authorized isolated demo.
Run `node scripts/seed-test-accounts/seed.mjs`. If this demo uses only the three
sign-in shortcuts, set `SEED_ALLOW_NO_EMAIL=1`; only an email-only degraded health
response is accepted. Authentication and durable storage remain mandatory.

Sign in as the coach and check Cascade Comets, Harbor Hawks, Summit Sparks, and
Valley Vipers, each with 12 roster players and linked parents/athletes. Sign out,
start a new browser session, sign back in, and verify the same records. Confirm
one tagged synthetic update persists across independent requests and a redeploy.
Run all QA scenarios with `QA_DEMO_SIGN_IN=1` and the five UX journeys against
that exact HTTPS origin. Verify family privacy boundaries and mobile layouts.

## 4. Email and alerts

- Configure `RESEND_API_KEY` as a Vercel Secret and `EMAIL_FROM` with an actually
  verified sender. Never paste keys into issues, source files, or test reports.
- Send a sign-in link to a user-approved test inbox. Verify delivery, successful
  sign-in, token single use, logout, and role-appropriate navigation.
- Configure a user-selected Sentry destination or error webhook. Trigger a
  non-sensitive synthetic error and confirm receipt in the destination. Native
  Vercel alert rules do not prove application error delivery.
- Keep billing and unconfigured integrations off during the demo.

## 5. Backups, rollback, and promotion

- Before touching existing data, export the exact raw database key using
  authorized database access to an approved private backup location. Preserve
  ambiguous legacy wrappers without choosing a layer automatically.
- Restore only into a new isolated namespace and verify record counts and a
  read/write cycle there. Never restore over production as a test.
- Record the deployed commit and a known-good deployment. A code rollback does
  not roll back database mutations. Previous versions using the old KV writer
  are not safe rollback targets for newly migrated data.
- Confirm a single intended public URL and its project/domain mapping. Do not
  promote or change DNS until the live checks pass and the destination is chosen.
- Merge/release approval is separate from branch testing; preserve the working
  Preview until the public release is confirmed.
