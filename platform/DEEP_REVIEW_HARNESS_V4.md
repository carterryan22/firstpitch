# Definitive End-to-End Review Harness — Web + iOS Compatibility (v4)

> **What this is:** the complete, repeatable harness — every dimension of a web app plus a full iOS/mobile-WebKit compatibility layer and true end-to-end journey testing. Built on v3's automatable contract (stable check IDs, computed severity, machine-readable output, run-over-run diffing). **What this is not:** a claim to be "the best prompt ever." It is the most complete one I can construct for your context; its value is in being run repeatedly and diffed, not in one heroic pass.
>
> **Coverage map:** SEC (security) · PRIV (privacy) · UI (visual) · USA (usability/a11y) · SUP (supportability) · **IOS (Apple/WebKit compat)** · **E2E (cross-surface journeys)** · DATA (integrity) · PERF (performance/scale).
>
> Run web dimensions on desktop Chrome + a real or simulated iOS Safari; run the IOS dimension on **real iOS Safari** wherever a checkmark says "real device required" — the simulator and Chrome devtools' iOS emulation do NOT reproduce WebKit's most important bugs (ITP, in-app browsers, true safe-area behavior, HEIC, PWA push).

---

## How this file relates to the rest of the harness (read first)

This is the **canonical v4 master** — it supersedes [DEEP_REVIEW_HARNESS.md](DEEP_REVIEW_HARNESS.md)
(v3) by adding the **IOS** and **E2E** dimensions and promoting **DATA** and **PERF** to
first-class dimensions. v3 remains the source of truth for the *semantics* of the web dimensions
it defines (SEC, UI, USA, SUP); v4 inherits those verbatim and layers the new dimensions on top.

For an **actual run**, do not paste this whole file — it is the spec, not the session prompt. Use
the operational split under [deep-review/](deep-review/README.md), which mechanically breaks this
master into one paste-and-run runner per dimension keyed to a shared `run_id`, then a single merge
pass:

| Dimension | Runner | Notes |
|---|---|---|
| SEC + **PRIV** | [deep-review/runners/sec.md](deep-review/runners/sec.md) | PRIV is the `SEC-PRIV-*` block — privacy is enforced by the same route-handler authz, so it ships inside the SEC runner |
| UI | [deep-review/runners/ui.md](deep-review/runners/ui.md) | |
| USA | [deep-review/runners/usa.md](deep-review/runners/usa.md) | the v3 `ux` mode folds in here |
| SUP | [deep-review/runners/sup.md](deep-review/runners/sup.md) | |
| **IOS** | [deep-review/runners/ios.md](deep-review/runners/ios.md) | new in v4 |
| **E2E** | [deep-review/runners/e2e.md](deep-review/runners/e2e.md) | new in v4 |
| **DATA** | [deep-review/runners/data.md](deep-review/runners/data.md) | promoted to its own catalog in v4 |
| **PERF** | [deep-review/runners/perf.md](deep-review/runners/perf.md) | promoted to its own catalog in v4 |
| merge | [deep-review/merge.md](deep-review/merge.md) | unions partials → diff → unified report |

> **First Pitch delivery note.** First Pitch ships on two iOS surfaces at once: a **Capacitor 6
> WKWebView** shell (`platform/mobile`, `limitsNavigationsToAppBoundDomains: true`,
> `StatusBar.overlaysWebView: true`, `MobileRefresh` polling `/api/version`) loading
> `https://firstpitch.app`, **and** the same site as responsive web in Safari. The IOS dimension
> must be run against **both** surfaces — the magic-link auth return path and safe-area behavior
> differ between them. See [deep-review/runners/ios.md](deep-review/runners/ios.md) for the
> pre-corrected First Pitch config.

---

# 1. RUN CONFIGURATION (fill before every run)

```yaml
run:
  run_id: "QA-{YYYYMMDD}-{NN}"
  previous_run_manifest: "[prior manifest JSON, or null]"
  mode: "full"                 # full | dimension:{sec|priv|ui|usa|sup|ios|e2e|data|perf} | smoke
app:
  name: "[APP NAME]"
  url: "[DEPLOYED URL]"
  build_or_commit: "[version/commit or 'unknown']"
  stack: "[e.g., Next.js + Supabase + Resend + Vercel, magic-link auth]"
  delivery: "responsive_web"   # responsive_web | pwa | wrapped_webview | native+web
  stage: "mvp"                 # mvp | beta | production
users:
  roles: ["head_coach", "assistant_coach", "parent", "player"]
  tenants_required: 2
context:
  primary_device: "iphone"
  ios_test_matrix:             # real devices/OS to cover; list what you actually have
    - { device: "iPhone (notch/Dynamic Island)", ios: "latest", browser: "Safari" }
    - { device: "iPhone SE (small, Touch ID, no notch)", ios: "latest-1", browser: "Safari" }
    - { device: "iPad", ios: "latest", browser: "Safari" }
    - { context: "in-app browser", apps: ["Gmail", "Instagram", "Messages link preview"] }
  environment: "outdoor, bright sun, one-handed, intermittent LTE, time pressure"
  data_sensitivity: "minors_pii"
  top_journeys:                # full cross-surface flows, not single screens — drives E2E + USA
    - { id: J1, journey: "[e.g., new coach: signup via magic link on iPhone → create team → import roster → generate first lineup → text QR card to assistant]", budget_minutes: 0 }
    - { id: J2, journey: "[parent: tap emailed report link on iPhone Mail → view child progress → no account required path]" , budget_minutes: 0 }
    - { id: J3, journey: "[...]" , budget_minutes: 0 }
spec:
  reference: "[spec / MVP cut-list, or null]"
  domain_safety_rules: ["[e.g., pitch-count limits by age]", "[rest days]"]
support_model:
  channels_expected: ["in-app help", "email"]
  slo_assumption: "solo developer, no support staff"
```

---

# 2. HARNESS PROTOCOL

Identical engine to v3 — read and apply all of it:

- **Determinism:** namespaced fixtures `QA_{run_id}_*`; the fixed hostile dataset (names `O'Brien-Smith`, `José Núñez 强`, A×200, `<b>bold</b>`, `x" onmouseover="x`, `=1+1`; 1,000-char note; numerics {0,-1,0.5,max,max+1}; dates {today, Feb 29 2028, Dec 31, +1yr, DST date}); plus iOS-specific fixtures: one **HEIC** photo, one Live Photo, one 12-megapixel image, one emoji-heavy note `⚾️🔥👨‍👩‍👧`.
- **Result vocabulary:** `pass | fail | warn | blocked | not_applicable(reason)`.
- **Computed severity** (v3 table) plus these additions:
  | Condition | Severity |
  |---|---|
  | Auth flow broken in any common iOS in-app browser (Gmail/Instagram/Messages) | P0 |
  | Session silently dropped by Safari ITP within 7 days (magic-link/localStorage auth) | P0 |
  | Core content unreachable behind notch / home indicator / not scrollable on a real iPhone | P1 |
  | Input zoom on focus traps user or hides submit (font-size <16px) | P2 |
  | HEIC/Live Photo upload fails silently or corrupts | P1 |
  | 100vh layout cutting off primary action on iOS Safari | P2 |
  Stage modifier and the "never downgrade security/privacy/safety/data-loss" rule carry over.
- **Diff protocol, dimension scoring, two-axis severity×likelihood:** as v3.
- **Setup each run:** role accounts × 2 tenants; seed hostile + iOS fixtures; dev tools console+network recording on web; on iOS, connect Safari to a Mac for **Web Inspector** (Settings → Safari → Advanced → Web Inspector) so you can read console/network on the real device — without this the IOS dimension is observation-only and you must mark affected checks `partial`. Build/refresh Surface Inventory.

---

# 3. CHECK CATALOG

> Web dimensions **SEC, PRIV, UI, USA, SUP** are inherited verbatim from the v3 harness — run them via their runners ([sec](deep-review/runners/sec.md) · [ui](deep-review/runners/ui.md) · [usa](deep-review/runners/usa.md) · [sup](deep-review/runners/sup.md)). **DATA** and **PERF**, which v3 only cross-referenced, now have their own catalogs ([data](deep-review/runners/data.md) · [perf](deep-review/runners/perf.md)). This file specifies the **new and extended** dimensions below. Where a v3 check is sharpened for iOS, the ID is reused with an `/iOS` suffix.

## DIMENSION: IOS — Apple / mobile-WebKit compatibility

### IOS-AUTH — The auth-on-iOS minefield (highest priority for magic-link stacks)
- **IOS-AUTH-001** *(real device required)* **In-app browser auth:** send the magic link to an email, open it from the **Gmail iOS app**, **Instagram in-app browser**, and a **Messages link preview**. For each: does login complete, and does the resulting session carry back to Safari / the app's intended context, or does it strand the user in an isolated webview? Stranded or failed login in any common in-app browser = P0. This is the single most common silent killer of magic-link products on mobile.
- **IOS-AUTH-002** *(real device, time-bound)* **ITP session survival:** authenticate in Safari, then verify how the session is stored (cookie vs localStorage). Safari's Intelligent Tracking Prevention caps script-writable storage (incl. localStorage and JS-set cookies) at **7 days** of Safari use without a top-level interaction with the setting domain. If auth relies on localStorage or a JS cookie, the user is silently logged out within a week. Pass: session in a server-set `HttpOnly` `Secure` `SameSite` cookie. Fail (P0): script-writable persistence.
- **IOS-AUTH-003** **Email client link handling:** open the magic link from Apple Mail, Gmail, and Outlook iOS. Some prefetch/scan links and may consume single-use tokens before the user taps. Pass: token survives prefetch (e.g., requires a second confirmation click, or link-scanners don't consume it). Token consumed by scanner = P0 (user can never log in).
- **IOS-AUTH-004** **Password manager / autofill:** if any password field exists, verify iOS Keychain and 1Password autofill work; verify OTP autofill from SMS if used.
- **IOS-AUTH-005** **Universal links / return path:** if the app expects to deep-link back after auth, verify the return actually opens the right context on iOS rather than a fresh tab.

### IOS-VIEW — Viewport, safe areas, and the notch
- **IOS-VIEW-001** *(real device)* **Safe-area insets:** on a notch/Dynamic Island device, verify no interactive element or critical content sits under the notch, status bar, or home indicator. Pass: layout respects `env(safe-area-inset-*)`. Primary action under the home indicator = P1.
- **IOS-VIEW-002** **100vh bug:** check every full-height view. iOS Safari's `100vh` includes the area behind the dynamic toolbar, pushing content (often the submit button) off-screen until the toolbar collapses. Pass: app uses `dvh`/`svh` or JS viewport handling. Primary action cut off = P2.
- **IOS-VIEW-003** **Viewport meta sanity:** confirm `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (or equivalent). Missing `viewport-fit=cover` breaks safe-area handling; `maximum-scale=1`/`user-scalable=no` is an accessibility fail (blocks zoom).
- **IOS-VIEW-004** *(real device)* **Rubber-band / overscroll:** does overscrolling reveal a broken background, double-bounce nested scrollers, or trap scroll inside a modal? Body-scroll-lock correctness on modals is a frequent WebKit failure.
- **IOS-VIEW-005** **Orientation:** rotate during each core view and mid-journey; check layout, safe areas (landscape notch is on the side), and state preservation.

### IOS-INPUT — Touch, keyboard, and forms on iOS
- **IOS-INPUT-001** **Focus zoom:** tap into every input. iOS auto-zooms when input `font-size < 16px`. Pass: no zoom (font-size ≥16px on inputs). Zoom that hides the submit or doesn't reset = P2.
- **IOS-INPUT-002** *(real device)* **Keyboard occlusion:** with the iOS keyboard open, is the focused field visible and is the submit reachable? `position: fixed` footers commonly get covered or float wrong on iOS. List every form where submit is hidden.
- **IOS-INPUT-003** **Input types & keyboards:** numeric fields show the number pad (`inputmode`/`type`), email shows the email keyboard, tel shows the phone pad. Date/time inputs render the native iOS wheel — verify it works and the value round-trips (WebKit date inputs differ sharply from Chrome).
- **IOS-INPUT-004** **Touch targets & hover traps:** ≥44×44pt targets; verify nothing depends on `:hover` to reveal an action (no hover on touch — content that only appears on hover is unreachable). List hover-gated actions = fail.
- **IOS-INPUT-005** **Gestures:** swipe-back navigation doesn't corrupt app state; custom swipe/drag (e.g., reordering a lineup) works with touch and doesn't fight Safari's edge-swipe.
- **IOS-INPUT-006** **Tap latency / double-tap zoom:** confirm `touch-action` set so taps don't incur double-tap-zoom delay on interactive controls.
- **IOS-INPUT-007** **Copy/paste/select:** can a user copy a generated value (e.g., a share link, a stat)? Long-press selection works on the values they'd want to share.

### IOS-MEDIA — Camera, photos, and the HEIC trap
- **IOS-MEDIA-001** *(real device required)* **HEIC upload:** upload the HEIC fixture via the photo picker. iPhones shoot HEIC by default; many backends/`<img>` paths can't render it. Pass: converts or renders correctly server-side. Silent failure or broken image = P1.
- **IOS-MEDIA-002** **Live Photo & large image:** upload a Live Photo (verify it degrades to a still) and the 12MP image (verify resize/orientation — EXIF rotation is a classic iOS bug where photos display sideways).
- **IOS-MEDIA-003** **Camera capture:** if capture is offered, `capture` attribute opens the camera; permission prompt is clear; denial is handled gracefully.
- **IOS-MEDIA-004** **Video (if any):** inline playback works (`playsinline` — without it iOS forces fullscreen); autoplay policy respected.

### IOS-PWA — Standalone / Add to Home Screen (run if delivery = pwa, else record gaps)
- **IOS-PWA-001** *(real device)* **Install & launch:** Add to Home Screen; launch from the icon. Icon, name, and splash render correctly; app opens in standalone (no Safari chrome).
- **IOS-PWA-002** **Standalone navigation trap:** in standalone mode, external links and the auth redirect can kick the user OUT to Safari and lose the standalone session — re-run IOS-AUTH-001 in installed mode. Auth that breaks only in standalone = P0.
- **IOS-PWA-003** **Status bar & safe areas in standalone:** `apple-mobile-web-app-status-bar-style` correct; safe areas still respected without Safari's UI.
- **IOS-PWA-004** **Offline/service worker:** iOS service-worker support is limited and storage is evictable. Verify claimed offline behavior on a real device; verify graceful behavior when the SW cache is evicted.
- **IOS-PWA-005** **Push (only if you claim it):** iOS web push requires the PWA be **installed to Home Screen** (16.4+) and explicit permission. If notifications are promised, verify the full install→permission→delivery path on a real device; promising push in a non-installed web context on iOS = P1 (impossible).
- **IOS-PWA-006** **Storage eviction:** iOS evicts PWA storage after inactivity. If the app stores anything locally that the user would lose, document the data-loss risk.

### IOS-SYS — System integration & resilience
- **IOS-SYS-001** **Share sheet:** sharing a lineup/report uses the native share sheet (Web Share API) where appropriate; falls back gracefully.
- **IOS-SYS-002** **Dynamic Type / text size:** increase iOS text size (Accessibility → Larger Text); does the app respect it or break? Fixed px everywhere ignores user text-size = a11y fail.
- **IOS-SYS-003** **Reduced Motion / Reduce Transparency:** honor `prefers-reduced-motion`; no essential info conveyed only by motion.
- **IOS-SYS-004** **VoiceOver smoke test** *(real device)*: run J1's first screen with VoiceOver; controls announced, order logical, no unlabeled buttons.
- **IOS-SYS-005** **Low Power Mode / background:** background the app mid-journey (call, app switch) for 5 min, return; state resumes, session valid, no crash/white screen.
- **IOS-SYS-006** **Network transitions:** WiFi→LTE→offline→back during a save; iOS aggressively changes networks. Verify no duplicate writes and clear offline state (cross-ref SUP-REL/DATA).
- **IOS-SYS-007** **Date/locale:** set device to a non-US locale and 24h time; verify dates/numbers render and parse correctly (cross-ref DATA timezone checks).

## DIMENSION: E2E — End-to-end cross-surface journeys

> Single checks prove a screen works; journeys prove the *product* works. Each `top_journey` is executed start-to-finish on the primary device, crossing every surface it touches (web, email, SMS, share sheet, second role, second device). A journey passes only if a real user could complete it unaided.

- **E2E-J{n}-FLOW** Run journey Jn end to end on iPhone Safari. Record: completed (y/n), total minutes vs budget, every surface crossed, every point of friction or confusion, and the exact step of any failure. A journey that requires switching to desktop to finish, or that dead-ends, fails.
- **E2E-J{n}-HANDOFF** Verify every cross-surface handoff in Jn actually lands: the emailed link opens the right place (test from Apple Mail AND Gmail app — cross-ref IOS-AUTH-001/003), the texted QR/link resolves, the share-sheet output is correct, the second role sees what they should.
- **E2E-J{n}-MULTIROLE** Where Jn spans roles (coach creates → parent views), execute both halves on separate accounts/devices and verify the data and permissions line up (cross-ref SEC-AUTHZ, SEC-PRIV).
- **E2E-J{n}-INTERRUPT** Re-run Jn with a realistic interruption injected (network drop at the worst step, backgrounding the app, session expiry mid-journey). Pass: resumable without data loss or restart-from-zero.
- **E2E-J{n}-COLD** Run Jn as a genuinely new user with empty data; measure time-to-first-value and note the biggest abandonment risk.
- **E2E-EMAIL-001** Email deliverability & rendering: trigger every transactional email (magic link, report, invite). Verify it arrives (check spam), renders in Apple Mail + Gmail iOS, links work, and sender/branding is correct. Resend/SES misconfig landing auth emails in spam = P1 (users can't log in).
- **E2E-IDEMP-001** Run the single most important write-journey twice rapidly and from two devices; verify no duplicate teams/players/records (cross-ref SEC-API-004, DATA persistence).

---

# 4. CROSS-DIMENSION SYNTHESIS (required after all checks)

- **Systemic root causes:** cluster findings into the underlying patterns (e.g., "auth persists in localStorage" explains ITP logout + in-app-browser failure + standalone-session loss — one fix, three P0s).
- **The "field test" narrative:** write the realistic worst-case story — new coach, iPhone, parking-lot LTE, link opened from the Gmail app, bright sun, 5 minutes before first pitch — and state plainly whether the product survives it, citing check IDs. This is the single most useful paragraph in the report for your context.
- **Top-10 support drivers** (SUP-PRED-001) updated with iOS-specific drivers ("can't log in from email app", "logged out after a week", "photo won't upload").

# 5. OUTPUT CONTRACT
Identical to v3: per-finding JSON (add fields `device` and `ios_version` alongside `viewport`), run manifest JSON (add `ios_test_matrix_covered` and per-device coverage), and the human report ordered: **diff summary → field-test narrative → P0/P1 detail (iOS-auth findings first) → dimension scorecards incl. IOS and E2E → matrices (authorization, visibility leakage, state inventory, error corpus, self-service, iOS device coverage, top-10 support drivers) → systemic root causes → fix sequence → coverage appendix.** Preserve the manifest for next run's diff.

# 6. RULES OF ENGAGEMENT
- Verification, never exploitation; own fixtures only; surface P0 security/privacy/safety/minors-data immediately at top.
- **Real-device honesty:** any IOS check marked "real device required" that was run on simulator/emulation is recorded `partial` with that reason — never `pass`. Simulators do not reproduce ITP, in-app browsers, HEIC, true safe areas, or PWA push.
- Reproduce twice or label intermittent; verbatim evidence at capture time; redact sensitive values to field names.
- Deduplicate to root cause; scores are for trend, findings are for action — never soften finding language with a score.
- `smoke` mode: prior failures + all P0-capable checks (which now includes IOS-AUTH-001/002/003 and IOS-PWA-002); rest `not_applicable: smoke`.
- State every coverage gap explicitly; an unstated gap is a defect in the audit, not a clean result.
