"use client";

import { useEffect, useState } from "react";
import { getNetworkStatus, onNetworkChange } from "../lib/native";

// Field-first offline indicator. Coaches run First Pitch on diamonds with
// patchy signal, so the moment connectivity drops we warn that edits
// (lineups, pitch counts, metrics) may not be saving. Inside the iOS /
// iPadOS / Android shell this is driven by the native @capacitor/network
// plugin — WKWebView does not fire window online/offline events reliably —
// and falls back to navigator.onLine in the browser PWA. Renders nothing
// while online, so it never adds chrome on a good connection.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    void getNetworkStatus().then((s) => {
      if (active) setOffline(!s.connected);
    });
    const unsubscribe = onNetworkChange((s) => {
      if (active) setOffline(!s.connected);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b-2 border-ink bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-ink"
    >
      ⚠ You&apos;re offline. Changes may not save until you reconnect.
    </div>
  );
}
