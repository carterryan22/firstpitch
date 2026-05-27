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
```

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
3. **App icons + splash**: drop a 1024×1024 source PNG at
   `platform/mobile/resources/icon.png` and a 2732×2732 splash at
   `resources/splash.png`, then run `npx @capacitor/assets generate`. This
   produces every required size in `ios/App/App/Assets.xcassets/`.
4. **Privacy strings** (`ios/App/App/Info.plist`): add usage descriptions for
   any native capability you turn on (camera, photo library, push, etc.). The
   shell currently uses none, so you only need the basics App Review enforces.
5. **App-bound domains**: `limitsNavigationsToAppBoundDomains` is on. List
   your production hosts in `WKAppBoundDomains` inside `Info.plist` — exactly
   the domains in `server.allowNavigation` in `capacitor.config.ts`.
6. **Privacy manifest** (`PrivacyInfo.xcprivacy`): Apple requires this for
   third-party SDKs. Capacitor 6 ships one; review and add tracking-domain
   declarations if you add analytics later.
7. **Age rating**: youth sports → set "Made for Kids" appropriately. If we
   collect any data from users under 13, we trigger COPPA-equivalent
   requirements.

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

## Roadmap (native-only features)

| Plugin                       | What it unlocks                                    |
| ---------------------------- | -------------------------------------------------- |
| `@capacitor/camera`          | In-app swing/pitching video capture                |
| `@capacitor/local-notifications` | Pre-game reminders, hydration alerts, pitch-rest end-times |
| `@capacitor/push-notifications` | Coach-to-parent broadcasts (lineup posted, rainout) |
| `@capacitor/geolocation`     | Auto-pick the closest field for "Today's practice" |
| `@capacitor/filesystem`      | Offline cache of the day's lineup card + PDF       |
| `@capacitor-community/sqlite` | True offline mode for in-game live scoring         |
