# Four-team demo seed

Run from `platform/` against a local development server or an explicitly enabled, isolated demo environment:

```powershell
$env:SEED_BASE_URL="http://localhost:3001"
node scripts/seed-test-accounts/seed.mjs
```

The target needs persistent storage and `PLATFORM_ALLOW_DEV_LOGIN=1`. Local development can use `PLATFORM_DATA_DIR` pointing to a local temporary directory outside cloud-synced folders. Do not enable passwordless demo login on a production database.

For hosted Preview, set a branch-scoped `PLATFORM_KV_KEY`, for example `platform:demo:firstpitch-september`. All Preview KV runtimes and all KV runtimes with demo login enabled require an explicit `platform:demo:` or `platform:preview:` namespace and fail closed otherwise. Production keeps `platform:db`; Vercel Production rejects demo namespaces and never permits passwordless demo login. Namespaces separate application records, but share provider credentials and capacity; a separate database is preferable for stronger infrastructure isolation. Never seed the production key or move existing production records into the demo key.

Seeding requires a configured auth secret and reachable durable storage. In an isolated demo using the sign-in shortcuts, `SEED_ALLOW_NO_EMAIL=1` permits the health endpoint to report email as its only missing service; it does not disable any runtime auth or storage safeguards. Production readiness still requires real email delivery. HTML protection pages and redirects stop seeding before sign-in or writes.

The seed creates Cascade Comets, Harbor Hawks, Summit Sparks, and Valley Vipers. Each has 12 roster players, 12 linked parent accounts, 12 linked athlete accounts, and 3 coaches (one shared director plus two team coaches). Each sample season has 6 completed games and 2 upcoming games. All people and accounts are synthetic.

Rerunning reuses rosters and memberships. Tagged sample games resume by slot after an interrupted run; completed games remain intact. Existing untagged seasons are preserved. New empty seasons start at the current date, while resumed seasons retain their schedule.

With `NEXT_PUBLIC_DEMO_MODE=1` at build time, `/login` provides Coach Riley, Parent demo, and Athlete demo forms. The primary accounts are `coach1@firstpitch.test`, `parent1@firstpitch.test`, and `athlete1@firstpitch.test`.

## Verification

```powershell
cmd /c "npm run verify"
$env:QA_BASE_URL="http://localhost:3001"
$env:QA_DEMO_SIGN_IN="1"
$env:PERSONA_PARENT_EMAIL="parent1@firstpitch.test"
$env:PERSONA_PLAYER_EMAIL="athlete1@firstpitch.test"
cmd /c "npm run qa"
```

The opt-in browser scenario submits all three real forms, reloads each destination to verify the session, checks team membership, and checks all four coach rosters. The authorization scenario checks that linked parents and athletes cannot retrieve full player records.

## Existing KV data

KV writes use a Redis script that verifies lease ownership and commits atomically. Values are stored as bare `gz:` strings. The reader supports plain JSON and simple legacy `{ "value": "..." }` wrappers; reads do not modify data, and the next successful mutation migrates a simple wrapper.

Mixed legacy blobs containing both collections and a `value` wrapper are ambiguous. The reader refuses to overwrite them. Before recovery, export the original key and inspect all layers; choosing one layer automatically can discard records, while merging layers can resurrect deleted records. Do not delete or reset the database to get past this error.

Local tests and seed logs do not prove deployed persistence. Before demoing a deployment, verify its storage backend, sign in over HTTPS, reload, and confirm the four live rosters. Vercel Secret values cannot be downloaded by `env run`; that command alone does not reproduce the deployed database locally.
