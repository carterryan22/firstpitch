// Analytics tag. Plausible-compatible by default (no cookies, no PII).
// Activated only when NEXT_PUBLIC_ANALYTICS_DOMAIN is set.
//
// To use a different host (self-hosted / Cabin / Umami): set
//   NEXT_PUBLIC_ANALYTICS_SRC=https://analytics.example.com/script.js
//
// Inject the <Analytics /> component once in the root layout.

import Script from "next/script";

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!domain) return null;
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "https://plausible.io/js/script.js";
  return <Script data-domain={domain} src={src} strategy="afterInteractive" />;
}
