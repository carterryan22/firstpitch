import { NextResponse } from "next/server";

export const runtime = "nodejs";
// `force-static` lets the response be cached at the edge AND inside the iOS
// WKWebView between checks, but `revalidate = 0` makes Next regenerate on
// every deploy so the mobile shell always sees the latest commit.
export const dynamic = "force-static";
export const revalidate = 0;

// Build-time fingerprint. Vercel injects VERCEL_GIT_COMMIT_SHA automatically;
// GitHub Actions / other CI can set BUILD_SHA. Fall back to a per-process id
// so dev still works.
const BUILD_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.BUILD_SHA ??
  process.env.GIT_SHA ??
  `dev-${Date.now().toString(36)}`;

const BUILD_TIME = new Date().toISOString();

// Minimum native-shell version that is allowed to talk to this web build.
// Bump this if you ship a web change that *requires* a new native plugin or
// Info.plist entitlement, so old binaries can show "please update" instead
// of silently breaking.
const MIN_NATIVE_VERSION = "1.0.0";

export function GET() {
  return NextResponse.json(
    {
      sha: BUILD_SHA,
      builtAt: BUILD_TIME,
      minNativeVersion: MIN_NATIVE_VERSION,
    },
    {
      headers: {
        // Tiny, frequently-polled — let the WebView cache for 60s but always
        // revalidate against the edge.
        "cache-control": "public, max-age=60, must-revalidate",
      },
    },
  );
}
