"use client";

// Keep production details in monitoring, never in the user-facing boundary.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[global-error]", error);
    }
    // Best-effort report to our monitoring endpoint. Never blocks render.
    void fetch("/api/monitoring/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        digest: error.digest,
        source: "global-error",
        ...(process.env.NODE_ENV !== "production"
          ? { name: error.name, message: error.message, stack: error.stack }
          : {}),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800 }}>
        <h1 style={{ color: "#b91c1c" }}>Server error</h1>
        <p>Something went wrong. Your data is still safe; try the request again.</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            background: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
