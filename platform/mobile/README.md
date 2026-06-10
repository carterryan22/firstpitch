# @platform/mobile — First Pitch iOS / iPadOS (and Android) shell

A thin **Capacitor 6** native wrapper that ships the First Pitch web app to the
Apple App Store and Google Play. The shell loads the production Next.js
deployment in a WKWebView and adds native-only capabilities (status bar,
splash screen, keyboard, haptics, share sheet, push notifications later).

## How web changes reach the app (the important part)

**Every web deploy is instantly live in the iOS / iPadOS app. You do NOT
re-submit to TestFlight or App Review for normal feature work.** Here is the
contract:

| What you changed                                | Reaches the app via                       | Action needed                          |
| ----------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| Any UI, route, API route, server action         | `server.url` → next Vercel deploy         | None. `MobileRefresh` reloads the WKWebView the next time the user foregrounds the app. |
| `manifest.webmanifest`, app icons, theme color  | Same — fetched live from the web origin   | None.                                  |
| `capacitor.config.ts` (plugins, allowNavigation)| Native binary                             | `npm run sync && npm run open:ios` → archive → upload to TestFlight. |
| Adding a new Capacitor plugin (camera, push…)   | Native binary                             | Same as above. App Review needed if you add a privacy-sensitive entitlement. |
| Bumping `minNativeVersion` in `/api/version`    | Forces stale shells to prompt for update  | Ship the matching native build first.  |

The `MobileRefresh` component (`apps/web/app/components/MobileRefresh.tsx`)
polls `/api/version` on mount, on `visibilitychange`, on `online`, and every
5 minutes. When the deployed SHA changes, it calls `location.reload()`. This
works identically inside the Capacitor WebView, an installed PWA on an iPhone
home screen, and a regular browser tab.

The `mobile-shell` GitHub Actions workflow (`.github/workflows/mobile-shell.yml`)
runs `cap sync` on macOS whenever you touch the shell config or PWA assets, so
config drift between the web app and the native wrapper is caught at PR time.

## Why a hybrid shell instead of a rewrite?

The web app depends on Next.js server actions, API routes, server-side auth
sessions, and live LLM calls. Re-implementing all of that as a pure-native app
would duplicate ~30k LoC. The native shell strategy keeps **one codebase** and
gets us into the App Store quickly. We can incrementally add native plugins
(camera for swing video, local notifications for game reminders, HealthKit for
pitch counts, etc.) without forking the UI.

## Prerequisites

| Tool                  | Version   | Where                                  |
| --------------------- | --------- | -------------------------------------- |
| macOS                 | 14+       | Required for iOS builds (Windows/Linux cannot build iOS) |
| Xcode                 | 15+       | App Store                              |
| CocoaPods             | 1.15+     | `sudo gem install cocoapods`           |
| Node                  | 20+ / 24+ | Matches the monorepo                   |
| Android Studio        | Hedgehog+ | Required for Android builds            |

> **You are on Windows.** Run all of the iOS commands below on a Mac (your own,
> a colleague's, a cloud Mac like MacStadium, or a CI service like Codemagic /
> EAS Build / Ionic Appflow). The repo will check in fine from Windows.

## First-time setup (on a Mac)

```sh
# from the repo root
cd platform/mobile
npm install

# Point the shell at the deployed app (or your local dev URL).
export FIRST_PITCH_APP_URL="https://firstpitch.app"

# Add the iOS platform — creates ./ios/App with an Xcode project.
npm run init:ios
# Add Android — creates ./android with a Gradle project.
npm run init:android

# Copy config + assets into the native projects.
npm run sync

# Generate native app icons + splash from the committed brand sources
# (platform/mobile/assets/*.png) into the iOS asset catalog.
npx @capacitor/assets generate --ios
```

> **Commit the generated `ios/` project.** It holds your `Info.plist`
> (`WKAppBoundDomains`, privacy strings) and signing config, so it is tracked
> in git — run `git add platform/mobile/ios` after `init:ios`. The
> `mobile-shell.yml` CI skips `cap add ios` when the folder already exists.

## Day-to-day

```sh
# After editing capacitor.config.ts or the www/ fallback page:
npm run sync

# Open Xcode (build, sign, archive, upload to TestFlight from here):
npm run open:ios

# Or open Android Studio:
npm run open:android

# Run on a connected device / simulator:
npm run run:ios
npm run run:android
```

## App Store submission checklist

1. **Bundle ID** is `app.firstpitch.coach` — register it in
   App Store Connect → "Identifiers".
2. **Signing**: in Xcode → Signing & Capabilities, pick your team and let Xcode
   auto-manage signing. For TestFlight, you need an Apple Developer account
   ($99/yr).
3. **App icons + splash**: brand sources are already committed under
   `platform/mobile/assets/` (`icon-only.png` 1024×1024, `icon-foreground.png`,
   `icon-background.png`, `splash.png` + `splash-dark.png` 2732×2732),
   generated by `platform/scripts/generate-app-icons.cjs`. After `cap add ios`,
   run `npx @capacitor/assets generate --ios` to produce every required size in
   `ios/App/App/Assets.xcassets/`. To rebrand, replace the PNGs in `assets/`
   (or re-run the generator) and re-run the command.
4. **Privacy strings** (`ios/App/App/Info.plist`): add usage descriptions for
   any native capability you turn on (camera, photo library, push, etc.). The
   shell currently uses none, so you only need the basics App Review enforces.
5. **App-bound domains**: `limitsNavigationsToAppBoundDomains` is on, so you
   MUST declare `WKAppBoundDomains` in `ios/App/App/Info.plist` or the WebView
   will refuse to load the site. Add the exact production hosts (no wildcards —
   Apple caps this at 10 exact domains; `*.firstpitch.app` / `*.vercel.app`
   from `allowNavigation` are NOT valid here):

   ```xml
   <key>WKAppBoundDomains</key>
   <array>
     <string>firstpitch.app</string>
     <string>www.firstpitch.app</string>
   </array>
   ```

   > Testing against a Vercel **preview** URL or a LAN dev IP? Those can't be
   > app-bound, so temporarily set `limitsNavigationsToAppBoundDomains: false`
   > in `capacitor.config.ts` for that build, then flip it back on (with the
   > plist above) for the App Store production archive.
6. **Privacy manifest** (`PrivacyInfo.xcprivacy`): Apple requires this for
   third-party SDKs. Capacitor 6 ships one; review and add tracking-domain
   declarations if you add analytics later.
7. **Age rating**: youth sports → set "Made for Kids" appropriately. If we
   collect any data from users under 13, we trigger COPPA-equivalent
   requirements.
8. **Privacy policy URL** (required for App Store Connect and the Kids
   Category): `https://firstpitch.app/policy/privacy`. It is COPPA-first
   (children never self-register; verifiable parental consent; no behavioral
   ads or child profiling; export/delete rights).
9. **No third-party tracking in kid flows**: the only analytics is optional,
   cookieless Plausible, and it is gated to **public marketing pages only** —
   `app/layout.tsx` renders `<Analytics />` solely for signed-out visitors, so
   no tracking script ever loads while a child's roster, metrics, or lineup is
   on screen. Keep it that way; do not move `<Analytics />` outside the
   signed-out branch.

## What the web app already does to be a good iOS citizen

Even without the native shell, the web app at `platform/apps/web` is a
fully-installable PWA. iOS users can "Add to Home Screen" from Safari and get
a standalone app with the right icon and status-bar styling. The PWA layer is
defined by:

- `app/layout.tsx` — `metadata.manifest`, `appleWebApp`, `viewport.viewportFit`
- `public/manifest.webmanifest` — name, icons, theme colors, shortcuts
- `app/icon.svg` / `app/apple-icon.svg` — Next 15 auto-generates the link tags
- `app/globals.css` — `env(safe-area-inset-*)` padding, tap-highlight off,
  16px form fonts to suppress iOS auto-zoom

## Native plugins wired today

The web capability layer (`apps/web/app/lib/native.ts`) calls these through a
dependency-free runtime bridge (no `@capacitor/*` in the web bundle — they
resolve from the native shell at runtime):

| Plugin                           | Status | Used by |
| -------------------------------- | ------ | ------- |
| `@capacitor/share`               | installed | Share-digest button |
| `@capacitor/haptics`             | installed | Button confirmations |
| `@capacitor/local-notifications` | installed | `scheduleLocalNotification()` — pitch-rest end reminders (no iOS plist string needed for local notifications) |
| `@capacitor/network`             | installed | `OfflineBanner` — warns coaches the moment they lose signal on a field so they know edits may not be saving. No permission or plist string required. |
| `@capacitor/camera`              | **referenced in code, plugin NOT installed** | `captureFromCamera()` in `AttachmentsCell.tsx` falls back to a file picker until the plugin is added. Enabling it requires `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` and — because this is a youth app — a deliberate COPPA review of capturing minors' photos before you turn it on. |

### Guideline 4.2 (minimum functionality) — why this isn't a "thin wrapper"

Apple can reject web wrappers that add nothing a website couldn't. First Pitch
ships genuine native capability that a Safari tab cannot: a native share sheet,
haptic feedback, scheduled **local notifications** (pitch-rest / arm-care
reminders that fire even when the app is closed), a native **splash screen** and
status-bar treatment, and **offline-aware connectivity** (`@capacitor/network`)
that warns a coach on a signal-dead diamond that their edits may not be saving.
If a reviewer still pushes back, the next native lever is `@capacitor/camera`
for swing-video capture — deliberately gated behind a COPPA review (see below).

## Roadmap (native-only features)

| Plugin                       | What it unlocks                                    |
| ---------------------------- | -------------------------------------------------- |
| `@capacitor/push-notifications` | Coach-to-parent broadcasts (lineup posted, rainout) |
| `@capacitor/geolocation`     | Auto-pick the closest field for "Today's practice" |
| `@capacitor/filesystem`      | Offline cache of the day's lineup card + PDF       |
| `@capacitor-community/sqlite` | True offline mode for in-game live scoring         |
