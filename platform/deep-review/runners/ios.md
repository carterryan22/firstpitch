# Deep Review Harness — IOS runner (Apple / mobile-WebKit compat · v4 · First Pitch)

> Self-contained. Paste this whole file into one fresh Claude-in-Chrome (or Safari Web Inspector)
> session. It runs the **IOS** dimension only and emits a partial manifest keyed to the shared
> `run_id`. Hand the partial to `merge.md` once every dimension is done. New in v4 — derived from
> `DEEP_REVIEW_HARNESS_V4.md` §3.
>
> **Real-device honesty is the whole point of this runner.** Chrome devtools' iOS emulation and
> the Xcode Simulator do **not** reproduce ITP, in-app browsers, true safe areas, HEIC, or push.
> Any check marked *(real device required)* that you ran on a simulator/emulator is recorded
> `partial` with that reason — **never `pass`.**

---

# 1. RUN CONFIGURATION (pre-filled — confirm before running)

```yaml
run:
  run_id: "FP-QA-{YYYYMMDD}-{NN}"          # SAME id across all dimension sessions of this review
  previous_run_manifest: "[paste prior MERGED manifest JSON, or null for baseline]"
  mode: "dimension:ios"                      # this runner = IOS only. Set "smoke" to rerun prior fails + P0-capable only.
app:
  name: "First Pitch"
  url: "https://firstpitch.app"             # prod target. iOS auth/ITP/safe-area honesty REQUIRES the deployed build, not localhost.
  build_or_commit: "unknown"
  stack: "Next.js 15 App Router on Vercel; custom magic-link auth (packages/auth, SHA-256 token hash, 15-min TTL, server-set HttpOnly platform_session cookie); KV/JsonFile/InMemory storage; Resend email. NOT Supabase."
  delivery: "wrapped_webview + responsive_web"  # BOTH ship: a Capacitor 6 WKWebView shell AND firstpitch.app in Safari. Run every check against both surfaces.
  stage: "mvp"
users:
  roles: ["head_coach", "assistant_coach", "parent", "player", "admin"]
  tenants_required: 2                        # IOS-AUTH return-path + multi-role handoffs need 2 contexts
context:
  primary_device: "iphone"
  ios_test_matrix:                           # cover what you actually have; record per-device coverage
    - { device: "iPhone (notch/Dynamic Island)", ios: "latest",   browser: "Safari" }
    - { device: "iPhone (notch/Dynamic Island)", ios: "latest",   browser: "Capacitor WKWebView (TestFlight build)" }
    - { device: "iPhone SE (small, no notch)",   ios: "latest-1", browser: "Safari" }
    - { device: "iPad",                          ios: "latest",   browser: "Safari" }
    - { context: "in-app browser",               apps: ["Gmail", "Instagram", "Messages link preview"] }
  environment: "outdoor, bright sun, one-handed, intermittent LTE, time pressure (field-side at 6 PM)"
  data_sensitivity: "minors_pii"
  top_journeys:                              # the cross-surface flows whose iOS handoffs this runner stress-tests (full runs live in e2e.md)
    - { id: J1, journey: "New coach: magic-link signup on iPhone -> create team -> import GameChanger roster -> generate first lineup -> share Press Box link", budget_minutes: 8 }
    - { id: J2, journey: "Parent: tap SHARED monthly-report / Press Box link from Apple Mail on iPhone -> view child's progress + tonight's lineup", budget_minutes: 2 }
    - { id: J3, journey: "Coach in the Capacitor app: open app cold -> tonight's game -> log pitch counts -> Pitch Smart alert", budget_minutes: 3 }
spec:
  reference: "In-repo: DECISION-LOG.md (AUTHORITATIVE), platform/mobile/README.md + capacitor.config.ts (the WKWebView shell), /memories/repo/ios-mac-runbook.md."
  domain_safety_rules:
    - "A Pitch Smart / arm-care 'hold' alert must remain visible on a real iPhone — never clipped under the notch, home indicator, or keyboard."
    - "Incomplete/self-reported arm-load data can NEVER display 'green' (DECISION-LOG D7) — verify the chip is legible in bright-sun contrast on device."
support_model:
  channels_expected: ["in-app help (/policy)", "email (hello@firstpitch.app)"]
  slo_assumption: "solo developer, no support staff"
```

> **First Pitch shell facts that change the iOS verdicts (read before judging):**
> - **Delivery is a Capacitor 6 WKWebView over `https://firstpitch.app`**, not a static bundle and
>   not (primarily) a home-screen PWA. `webDir: "www"` is only a fallback page. So the **IOS-PWA**
>   block is mostly `not_applicable: native Capacitor app` — *except* IOS-PWA-002's "auth breaks
>   when it leaves the app context" risk, which is **very real here** (see IOS-AUTH).
> - `ios.limitsNavigationsToAppBoundDomains: true` + `WKAppBoundDomains` (firstpitch.app,
>   www.firstpitch.app). A magic link tapped in **Mail/Gmail opens in Safari, not the WKWebView**,
>   and **WKWebView has its own cookie store** — so a session minted in Safari does **not**
>   automatically appear inside the Capacitor app. Whether the app has a return path
>   (Universal Link / re-request link inside the app) is the load-bearing IOS-AUTH-001/005 finding.
> - `StatusBar.overlaysWebView: true` → the web content draws **under** the status bar. Top
>   safe-area insets are mandatory (IOS-VIEW-001); the repo already added
>   `pb-[env(safe-area-inset-bottom)]` to the bottom tab bar — verify the **top** inset too.
> - `Keyboard.resize: "native"` → the WKWebView resizes for the keyboard; re-check IOS-INPUT-002
>   occlusion in the app, where it differs from Safari.
> - Native share is wired (`apps/web/app/lib/native.ts` → `@capacitor/share`); **camera is CALLED
>   in `AttachmentsCell.tsx` but `@capacitor/camera` is NOT installed → falls back to the file
>   picker.** So IOS-MEDIA is mostly the **photo-library file-picker** path (HEIC still applies),
>   not live camera capture.
> - `MobileRefresh` polls `/api/version` (mount / visibilitychange / online / 5-min) and reloads
>   the WKWebView on a new deploy — relevant to IOS-SYS-005 (background→foreground) and any
>   "mid-flow reload eats my input" data-loss (cross-ref DATA-PERSIST, SUP-REL).
> - Push today is **local notifications only** (`@capacitor/local-notifications`); there is **no**
>   web push and no `@capacitor/push-notifications`. Treat any "push" claim accordingly
>   (IOS-PWA-005).

---

# 2. HARNESS PROTOCOL (read fully before executing any check)

### 2.1 Determinism rules
- **Namespaced fixtures:** prefix every entity `QA_{run_id}_`. Reuse fixture *definitions* across runs.
- **Fixed hostile dataset + the iOS fixtures:** the standard set (long/unicode/markup names,
  1,000-char note, boundary numerics, edge dates) **plus** one **HEIC** photo, one **Live Photo**,
  one **12-megapixel** image, and one emoji-heavy note `⚾️🔥👨‍👩‍👧`. Keep these identical run-to-run.
- **Stable check IDs:** reference exactly; new discoveries get a `-X` suffix (e.g., `IOS-VIEW-X1`).
- **Atomicity:** record `blocked` (with the blocking ID) rather than skipping.
- **Evidence at capture time:** exact URL, role, **device + iOS version + surface (Safari vs
  Capacitor app)**, viewport, observed vs expected. Console/network only exist on device if you
  attached **Safari Web Inspector** from a Mac (Settings → Safari → Advanced → Web Inspector);
  without it, affected checks are `partial`, not `pass`.

### 2.2 Result vocabulary
`pass` | `fail` | `warn` | `blocked` | `not_applicable` (with reason) | **`partial`** (ran on
simulator/emulator or without Web Inspector — record the reason). No other states.

### 2.3 Severity is computed, not vibed
| Condition | Severity |
|---|---|
| Auth broken in any common iOS in-app browser (Gmail/Instagram/Messages) | P0 |
| Auth session minted in Safari is unreachable inside the Capacitor app, with no in-app re-auth path | P0 |
| Session silently dropped by Safari ITP within 7 days (script-writable auth storage) | P0 |
| Magic-link token consumed by an email link-scanner before the user taps (login impossible) | P0 |
| A Pitch Smart / arm-care "hold" alert clipped off-screen under notch/home-indicator/keyboard on device | P0 |
| Core content unreachable behind notch / home indicator / not scrollable on a real iPhone | P1 |
| HEIC / Live Photo upload fails silently or corrupts (where an upload surface exists) | P1 |
| Promised push that is impossible in the current delivery (non-installed web context) | P1 |
| Input zoom on focus traps the user or hides submit (input font-size <16px) | P2 |
| 100vh layout cutting off a primary (non-safety) action on iOS Safari | P2 |
| `viewport-fit=cover` missing (breaks safe areas); `user-scalable=no` (blocks zoom) | P2 |
| Everything else (cosmetic overscroll, minor latency) | P3 |

Stage modifier: at `mvp`, downgrade P2→P3 for **polish-class items only** — never for auth,
minors-data, a clipped safety signal, or data loss. **Never downgrade an auth or safety finding.**

### 2.4 Per-dimension diff handling
Single-dimension session: compute **only the IOS dimension score** and emit a **partial
manifest**. Cross-run diff + unified report are produced by `merge.md`. Set `diff_status` from the
pasted `previous_run_manifest` if present (fingerprint `check_id + url_pattern + observed_class`),
else `diff_status:"unknown"`. A `partial` result is **not** a pass and must not be diffed as FIXED.

### 2.5 Dimension scoring (0–100, computed)
`score = 100 × Σ(weightᵢ × resultᵢ) / Σ(weightᵢ)`; result pass=1, warn=0.5, **partial=0.5**, fail=0;
weight by worst severity (P0-capable=5, P1=3, P2=2, P3=1). Report `dimension_scores.IOS`. Scores are
for trend only — never let a good score soften an auth/safety finding.

### 2.6 Setup (every run)
1. Two role accounts across two tenants; seed the hostile + iOS fixtures in Tenant A.
2. **Attach Safari Web Inspector** from a Mac to the real device for both surfaces (Safari and the
   Capacitor app via Develop → <device> → the app's WebView). Without it the run is observation-only.
3. Record the **device + iOS version + surface** for every result — it's load-bearing here.
4. Have an installed **Capacitor/TestFlight build** for the app-surface checks; if unavailable,
   record all app-surface checks `blocked: no TestFlight build` (a stated gap, not a silent pass).
5. Build/refresh the Surface Inventory of the views each journey traverses; mark drift vs prior.

---

# 3. CHECK CATALOG — IOS (Apple / mobile-WebKit compatibility)

> **First Pitch anchors for this dimension (highest-value first):**
> - **IOS-AUTH-001/005 are the load-bearing checks.** Magic-link + a Capacitor WKWebView with its
>   own cookie jar + app-bound domains is the textbook stranded-session trap. Prove whether a
>   coach who taps the link from the Gmail app can actually end up logged in **inside the app**.
> - **IOS-VIEW-001** with `StatusBar.overlaysWebView: true` — the top inset is real; a clipped
>   Pitch Smart "hold" chip is a **P0 here**, not a cosmetic P3.
> - **IOS-INPUT-001/003** — pitch-count, jersey, metric, and duration inputs must raise the number
>   pad and be ≥16px so focus doesn't zoom; date/time inputs use the native WebKit wheel.
> - **IOS-MEDIA-001** — attachments are URL-paste and camera falls back to the file picker, so the
>   realistic media path is a **HEIC chosen from the photo library**; verify it doesn't break.

### IOS-AUTH — The auth-on-iOS minefield
- **IOS-AUTH-001** *(real device required)* **In-app browser auth:** request a magic link; open it from the **Gmail iOS app**, **Instagram in-app browser**, and a **Messages link preview**. For each: does login complete, and does the session carry back to Safari / the intended context? **Then the Capacitor-specific case:** with the app installed, tap a link from Mail — does the user end up authenticated **inside the app**, or stranded in Safari with a session the WKWebView can't see? Stranded/failed login in any common in-app browser **or** no path to an authenticated app session = P0.
- **IOS-AUTH-002** *(real device, time-bound)* **ITP session survival:** authenticate in Safari; confirm the session is the **server-set `HttpOnly` `Secure` `SameSite` `platform_session` cookie** (expected here — pass) and not localStorage/JS-cookie. If anything auth-bearing is script-writable, ITP silently logs the user out within 7 days = P0. (Cross-ref SEC-TRAN-002.)
- **IOS-AUTH-003** **Email-client link handling:** open the magic link from Apple Mail, Gmail, and Outlook iOS. The token is **single-use with a 15-min TTL** — verify a link-scanner/prefetch can't consume it before the user taps (token consumed = login impossible = P0). Note whether tapping requires a second confirmation click.
- **IOS-AUTH-004** **Password manager / autofill:** First Pitch is passwordless (magic-link only), so Keychain/1Password password autofill is `not_applicable`; if an email field offers autofill, verify it works and doesn't fight the form.
- **IOS-AUTH-005** **Return path / Universal Links:** does the app provide a return path after auth (a Universal Link that re-opens the app, or an in-app "email me a link" that stays in the WKWebView)? The runbook does not document an `apple-app-site-association` — if there is no return path, the only way into the app is re-requesting the link from inside it; verify that works, else P0 (no way to log into the app).

### IOS-VIEW — Viewport, safe areas, the notch
- **IOS-VIEW-001** *(real device)* **Safe-area insets:** on a notch/Dynamic Island device, verify no interactive element or critical content sits under the notch, status bar (remember `overlaysWebView: true`), or home indicator. The bottom tab bar uses `env(safe-area-inset-bottom)` — confirm the **top** header and any sticky action bar respect the top inset. A clipped Pitch Smart/arm-care chip = P0; any other primary action under the home indicator = P1.
- **IOS-VIEW-002** **100vh / dvh:** check every full-height view (login, FieldBoard, TileBuilder, parent dashboard). iOS `100vh` hides content behind the dynamic toolbar. Pass: `dvh`/`svh` or JS handling. Primary (non-safety) action cut off = P2.
- **IOS-VIEW-003** **Viewport meta:** confirm `width=device-width, initial-scale=1, viewport-fit=cover`. Missing `viewport-fit=cover` breaks safe areas; `maximum-scale=1`/`user-scalable=no` is an a11y fail (blocks zoom — cross-ref USA-A11Y).
- **IOS-VIEW-004** *(real device)* **Rubber-band / overscroll & modal scroll-lock:** overscroll doesn't reveal a broken background or double-bounce; body-scroll-lock holds inside any modal/drawer (EditGameModal, GameTools dropdown, share sheets).
- **IOS-VIEW-005** **Orientation:** rotate on FieldBoard and the fairness heat-map (the widest grids); check layout, side-notch safe areas in landscape, and state preservation.

### IOS-INPUT — Touch, keyboard, forms
- **IOS-INPUT-001** **Focus zoom:** tap every input (login email, jersey, pitch counts, metric entries, durations, league-rule numbers, note fields). iOS zooms when `font-size < 16px`. Pass: ≥16px, no zoom-trap. Zoom that hides submit or doesn't reset = P2.
- **IOS-INPUT-002** *(real device)* **Keyboard occlusion (both surfaces):** with the keyboard open, the focused field and the submit/save stay reachable — test in Safari **and** in the Capacitor app (`Keyboard.resize: "native"` changes the behavior). List every form where submit is hidden (note-entry and metric-entry forms are the usual suspects).
- **IOS-INPUT-003** **Input types & keyboards:** numeric fields (jersey, pitch count, metric, duration) raise the **number pad** (`inputmode`/`type`); email raises the email keyboard. Date/time inputs render the native iOS wheel and the value round-trips (game datetime-local is a known WebKit divergence — verify the local-time conversion holds).
- **IOS-INPUT-004** **Touch targets & hover traps:** ≥44×44pt in core flows (repo standard is `min-h-[44px]`); nothing essential is revealed only on `:hover` (FieldBoard cell tooltips, GameTools — verify they're tap-reachable, not hover-gated). Hover-gated actions on touch = fail.
- **IOS-INPUT-005** **Gestures:** Safari edge swipe-back doesn't corrupt state mid-lineup-edit; any custom drag (batting-order ↑/↓, lineup reordering) works with touch and doesn't fight the edge-swipe.
- **IOS-INPUT-006** **Tap latency / double-tap zoom:** `touch-action` set so interactive controls don't incur the double-tap-zoom delay.
- **IOS-INPUT-007** **Copy/paste/select:** the Press Box share link and any displayed stat can be long-press-selected and copied (a coach will want to paste the share link into a text).

### IOS-MEDIA — Camera, photos, HEIC
- **IOS-MEDIA-001** *(real device required)* **HEIC via photo picker:** where an image can attach (metric-entry attachments — note these are **URL-paste** today, and camera falls back to the file picker), pick the **HEIC** fixture from the photo library. Pass: converts/renders. Silent failure or broken image = P1. If no binary-upload surface exists, record `not_applicable: attachments are URL-paste only`.
- **IOS-MEDIA-002** **Live Photo & 12MP:** if a binary upload exists, a Live Photo degrades to a still and the 12MP image is resized with correct EXIF rotation (sideways photo = fail). Else `not_applicable`.
- **IOS-MEDIA-003** **Camera capture:** `@capacitor/camera` is **not installed**, so `captureFromCamera()` falls back to the file picker — verify the fallback is graceful and labeled (no dead "take photo" affordance). If/when camera is enabled it needs `NSCameraUsageDescription` + a COPPA review (minors' photos) — flag that as a gate, not a pass.
- **IOS-MEDIA-004** **Video:** if any inline video exists it sets `playsinline` (else iOS forces fullscreen); else `not_applicable`.

### IOS-PWA — Standalone (delivery is native Capacitor, so most are N/A — record the gaps)
- **IOS-PWA-001** **Install & launch:** primary install is the **Capacitor/TestFlight app**, not Add-to-Home-Screen — record `not_applicable: native app` but verify the installed app icon/splash render (sourced from `platform/mobile/assets`). A secondary Safari Add-to-Home-Screen PWA is technically possible (apple-touch-icons exist) — if you test it, note it.
- **IOS-PWA-002** **Standalone / app navigation trap:** the high-value variant here — in the **installed Capacitor app**, does any external link or the auth redirect kick the user out to Safari and lose the session? Re-run IOS-AUTH-001 in the app context. Auth that breaks only in the app = P0.
- **IOS-PWA-003** **Status bar & safe areas in-app:** with `StatusBar.overlaysWebView: true`, confirm the status-bar style is legible over the header and safe areas hold without Safari's chrome.
- **IOS-PWA-004** **Offline / service worker:** no SW offline mode is claimed; `MobileRefresh` reloads on reconnect. Verify a dropped connection degrades gracefully (cross-ref SUP-REL-001) rather than white-screening the WebView.
- **IOS-PWA-005** **Push reality:** only `@capacitor/local-notifications` is wired (no web push, no `@capacitor/push-notifications`). Any UI promising remote/push notifications beyond local reminders = P1 (impossible in the current build). Verify local notifications (pitch-rest reminders) actually fire.
- **IOS-PWA-006** **Storage eviction:** the app is server-backed (KV/cookie session), so little is stored locally; confirm nothing the user would lose lives only in evictable WebView storage (cross-ref SEC-CLNT-003).

### IOS-SYS — System integration & resilience
- **IOS-SYS-001** **Share sheet:** sharing a Press Box link/lineup uses the native share sheet (`@capacitor/share` in the app; Web Share API in Safari) and falls back gracefully to copy when unavailable.
- **IOS-SYS-002** **Dynamic Type:** raise iOS text size (Accessibility → Larger Text); the app reflows rather than clipping. Fixed-px-everywhere that ignores user text size = a11y fail (cross-ref USA-A11Y, UI-VIS-002).
- **IOS-SYS-003** **Reduced Motion / Transparency:** honor `prefers-reduced-motion`; no safety/state info conveyed only by motion (the splash spinner and any transitions).
- **IOS-SYS-004** **VoiceOver smoke** *(real device)*: run J3's pitch-count + Pitch Smart screen with VoiceOver — controls announced, logical order, the "hold/can pitch" status is announced (not conveyed by color alone).
- **IOS-SYS-005** **Background / Low Power Mode:** background the app mid-pitch-count-entry for 5 min (`MobileRefresh` may reload on foreground) → return: session valid, **no unsaved input silently lost**, no white screen. Lost input here = data-loss P-level (cross-ref DATA-PERSIST, SUP-REL-003).
- **IOS-SYS-006** **Network transitions:** WiFi→LTE→offline→back during a lineup save / pitch-count log; verify **no duplicate writes** and a clear offline state (cross-ref SEC-API-004, DATA-PERSIST, SUP-DIAG-006). KvJsonStore is single-blob last-write-wins — a duplicate-fire here is a real corruption path.
- **IOS-SYS-007** **Date / locale:** set the device to a non-US locale + 24h time; verify game times, report dates, and pitch-count dates render and parse correctly (cross-ref DATA-TIME, the known day-key string-compare in `transfer.ts`).

---

# 4. OUTPUT CONTRACT (required)

Produce, in this order:

**(a) P0/P1 first.** Any auth/safety/minors-data P0 surfaces at the very top, then continue. iOS-AUTH findings lead.

**(b) Findings JSON** — one object per `fail`/`warn`/`partial` (same shape as the SEC runner, with these added load-bearing fields):
```json
{
  "run_id": "FP-QA-20260609-01",
  "check_id": "IOS-AUTH-001",
  "status": "fail",
  "severity": "P0",
  "likelihood": "L1",
  "diff_status": "unknown",
  "age_runs": 1,
  "title": "Magic link from Gmail app strands the user in Safari; Capacitor app never sees the session",
  "url_pattern": "/api/auth/verify",
  "role": "head_coach",
  "device": "iPhone 15 Pro",
  "ios_version": "17.x",
  "surface": "Capacitor WKWebView",
  "viewport": "393x852",
  "observed": "Tapping the link in Gmail opens Safari, authenticates there; reopening the app shows the logged-out state",
  "expected": "An authenticated session reachable inside the app (Universal Link return, or in-app link request)",
  "repro_steps": ["1. Install the TestFlight build", "2. In-app, request a magic link", "3. Open it from the Gmail app", "4. Reopen the First Pitch app"],
  "evidence": "Web Inspector: no platform_session cookie in the app WebView cookie store after auth",
  "suggested_fix": "Add a Universal Link (apple-app-site-association) for the verify route, or an in-app magic-link request that completes inside the WKWebView",
  "regression_test": "Manual IOS-AUTH-001 on every native build; assert platform_session present in the app WebView after the email-app flow",
  "cross_refs": ["IOS-AUTH-005", "IOS-PWA-002", "E2E-J1-HANDOFF"]
}
```

**(c) The iOS device-coverage matrix:** for every entry in `ios_test_matrix`, which checks ran on it and the result (so `partial`/`blocked` gaps are explicit).

**(d) Partial manifest JSON** (save as `<run_id>.ios.partial.json`):
```json
{
  "run_id": "FP-QA-20260609-01",
  "dimension": "IOS",
  "date": "ISO-8601",
  "app_version": "unknown",
  "environment_fingerprint": { "devices": ["iPhone 15 Pro / iOS 17.x"], "surfaces": ["Safari", "Capacitor WKWebView"], "web_inspector_attached": true, "timezone": "...", "target_url": "https://firstpitch.app" },
  "ios_test_matrix_covered": [ { "device": "iPhone 15 Pro", "ios": "17.x", "surface": "Safari", "checks_run": 22, "checks_partial": 3 } ],
  "surface_inventory": [ { "type": "route", "pattern": "/login", "auth": false, "status": "tested", "first_seen_run": "FP-QA-20260609-01" } ],
  "check_results": [ { "check_id": "IOS-AUTH-001", "status": "fail", "finding_ids": ["..."] }, { "check_id": "IOS-MEDIA-002", "status": "not_applicable", "finding_ids": [] } ],
  "dimension_scores": { "IOS": 0 },
  "findings": [ { "...": "every finding object from (b)" } ],
  "coverage_gaps": [ { "check_id": "IOS-PWA-002", "reason": "no TestFlight build available this run" } ]
}
```

**(e) Coverage appendix:** every `blocked`/`not_applicable`/`partial` with a reason. A `partial`
that you don't explain is a defect in the audit itself.

---

# 5. RULES OF ENGAGEMENT
- Verification, never exploitation; your `QA_{run_id}_` fixtures only.
- **Real-device honesty:** any check marked *(real device required)* run on a simulator/emulator,
  or any on-device check without Web Inspector, is `partial` with that reason — never `pass`.
- Record device + iOS version + surface (Safari vs Capacitor app) on every result.
- Reproduce twice or label intermittent. Verbatim evidence; redact sensitive values to field names.
- Surface any auth/safety/minors-data P0 immediately at the top, then continue.
- Deduplicate to root cause (one localStorage-persistence pattern can explain ITP logout +
  in-app-browser failure + app-session loss — one fix, three P0s; merge them, keep highest severity).
- Never let a good score soften an auth or safety finding. The score is for trend; the finding is for action.
- `smoke` mode: execute only checks that failed in `previous_run_manifest` plus all P0-capable IOS
  checks (IOS-AUTH-001/002/003/005, IOS-PWA-002, IOS-VIEW-001 safety-chip); mark the rest `not_applicable: smoke`.
- When a spec doc disagrees with `DECISION-LOG.md`, the log wins.
