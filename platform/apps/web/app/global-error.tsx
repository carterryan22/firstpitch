"use client";

// Surfaces the real server error message + digest in the browser during
// debugging. Safe to leave in — Next.js only renders this when an error
// bubbles up out of a route segment.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800 }}>
        <h1 style={{ color: "#b91c1c" }}>Server error</h1>
        <p>
          <strong>Message:</strong> {error.message || "(no message)"}
        </p>
        {error.digest ? (
          <p>
            <strong>Digest:</strong> <code>{error.digest}</code>
          </p>
        ) : null}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f1f5f9",
            padding: "1rem",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          {error.stack ?? "(no stack)"}
        </pre>
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
