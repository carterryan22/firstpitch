"use client";

import { useEffect, useRef } from "react";

// MobileRefresh keeps the iOS / iPadOS Capacitor shell (and installed PWA)
// in sync with the live web deploy. Strategy:
//
//   1. On mount, fetch /api/version and remember the deployed SHA.
//   2. Whenever the app comes back to foreground (visibilitychange) OR
//      regains network, re-fetch and compare. If the SHA changed, the user
//      is running stale JS chunks from a previous deploy — force a full
//      reload so they pick up the new code.
//
// This works identically in three contexts:
//   - Regular browser tab    (visibilitychange + online)
//   - Installed iOS PWA      (same DOM events fire on resume)
//   - Capacitor WKWebView    (same DOM events fire on app resume)
//
// We intentionally do NOT import @capacitor/app here — keeping this
// dependency-free means the web bundle stays the same whether or not the
// native shell is in play.

const VERSION_URL = "/api/version";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // soft poll every 5 minutes too

export function MobileRefresh() {
  const knownSha = useRef<string | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function check(reason: string) {
      if (reloading.current || cancelled) return;
      try {
        const res = await fetch(VERSION_URL, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        const sha = data?.sha;
        if (!sha) return;
        if (knownSha.current == null) {
          knownSha.current = sha;
          return;
        }
        if (sha !== knownSha.current) {
          // New deploy detected. Reload to pick up new HTML + JS chunks.
          // Logging here helps when debugging "why didn't my change show up?"
          // eslint-disable-next-line no-console
          console.info(`[MobileRefresh] new deploy detected (${reason}): ${knownSha.current} → ${sha}`);
          reloading.current = true;
          window.location.reload();
        }
      } catch {
        // Offline or fetch blocked — silently retry on next trigger.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check("visibility");
    }
    function onOnline() {
      void check("online");
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void check("interval"), POLL_INTERVAL_MS);
    void check("mount");

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
