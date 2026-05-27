"use client";

import { useEffect, useState } from "react";
import { isNative, platform } from "../lib/native";

// UpdateBanner is shown only inside the native iOS / iPadOS / Android shell
// when the deployed web app advertises a minNativeVersion higher than what
// this binary supports. The web version of the same fact is always-current
// because the WebView fetches live HTML, so this banner is irrelevant in
// browsers and PWAs — we explicitly bail out in those cases.
//
// The shell's version is read from window.__APP_VERSION__, which the iOS
// build is expected to inject via a small WKUserScript at WebView creation
// time. If it's missing we assume the shell is recent and skip the banner.

interface VersionPayload {
  sha: string;
  builtAt: string;
  minNativeVersion: string;
}

declare global {
  interface Window {
    __APP_VERSION__?: string;
  }
}

function parseSemver(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isOlder(a: string, b: string): boolean {
  const [a1, a2, a3] = parseSemver(a);
  const [b1, b2, b3] = parseSemver(b);
  if (a1 !== b1) return a1 < b1;
  if (a2 !== b2) return a2 < b2;
  return a3 < b3;
}

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as VersionPayload;
        const shellVersion = window.__APP_VERSION__ ?? "999.0.0";
        if (!cancelled && isOlder(shellVersion, data.minNativeVersion)) {
          setShow(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  const iosId = process.env.NEXT_PUBLIC_IOS_APP_ID;
  const androidId =
    process.env.NEXT_PUBLIC_ANDROID_APP_ID ?? "app.firstpitch.coach";
  const storeUrl =
    platform() === "ios" && iosId
      ? `https://apps.apple.com/app/first-pitch/id${iosId}`
      : `https://play.google.com/store/apps/details?id=${androidId}`;

  return (
    <div className="sticky top-0 z-40 border-b-2 border-warn bg-warn-soft text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span>
          A newer version of First Pitch is available. Please update for the
          latest features.
        </span>
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary text-xs"
        >
          Update
        </a>
      </div>
    </div>
  );
}
