import type { CapacitorConfig } from "@capacitor/cli";

// First Pitch native shell.
//
// Strategy: the app relies heavily on Next.js server actions, API routes,
// session cookies, and live LLM calls, so we do NOT bundle the web app
// as static files. Instead, the native shell points at the deployed
// Next.js URL (Vercel / your own host) and renders it inside a WKWebView.
//
// Set FIRST_PITCH_APP_URL in your environment before running `cap sync`
// to override the default. For local dev against a Mac running `next dev`
// on the same Wi-Fi, set it to `http://<mac-lan-ip>:3000`.
const APP_URL = process.env.FIRST_PITCH_APP_URL ?? "https://firstpitch.app";

const config: CapacitorConfig = {
  appId: "app.firstpitch.coach",
  appName: "First Pitch",
  // `webDir` is required by Capacitor even when using `server.url`. We point
  // it at a tiny static fallback so the binary has something to ship if the
  // remote host is unreachable on first launch.
  webDir: "www",
  bundledWebRuntime: false,
  ios: {
    contentInset: "always",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: "#f6efd9",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f6efd9",
  },
  server: {
    url: APP_URL,
    cleartext: false,
    // Allow the WebView to load assets/APIs from the production host AND
    // any local dev origin you swap in via FIRST_PITCH_APP_URL.
    allowNavigation: [
      "firstpitch.app",
      "*.firstpitch.app",
      "*.vercel.app",
      "10.*",
      "192.168.*",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#1f1a17",
      iosSpinnerStyle: "small",
      spinnerColor: "#f6efd9",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1f1a17",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "native",
      style: "DARK",
    },
  },
};

export default config;
