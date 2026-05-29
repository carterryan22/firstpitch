"use client";

import { useState } from "react";

export function TriplePlayFrame() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-none border-2 border-ink bg-cream shadow-card">
      {!loaded ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cream text-ink"
          aria-hidden="true"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink/20 border-t-ink" />
          <p className="quote text-sm">Warming up the bats…</p>
        </div>
      ) : null}
      <iframe
        src="/triple-play/index.html"
        title="Triple Play Baseball learning game"
        onLoad={() => setLoaded(true)}
        className="block h-[calc(100vh-260px)] min-h-[560px] w-full border-0"
        // The vendored game is fully self-contained; it does not need to
        // reach into the parent frame. Keep it sandboxed but allow scripts,
        // same-origin (for localStorage progress), and popups for the
        // print-coach-sheet flow.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
      />
    </div>
  );
}
