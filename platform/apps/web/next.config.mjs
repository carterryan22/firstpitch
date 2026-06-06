// Plausible-compatible analytics origin (only used when NEXT_PUBLIC_ANALYTICS_DOMAIN is set).
const analyticsSrc = process.env.NEXT_PUBLIC_ANALYTICS_SRC || "https://plausible.io";
const analyticsOrigin = (() => {
  try {
    return new URL(analyticsSrc).origin;
  } catch {
    return "https://plausible.io";
  }
})();

// Pragmatic CSP. Next.js App Router injects inline bootstrap scripts and runtime
// styles, so we allow 'unsafe-inline' (a nonce-based middleware CSP is a future
// hardening step). next/font self-hosts Google Fonts at build time, so no external
// font origin is required. Connect/script/img are widened only for opt-in analytics.
// In development the Next.js react-refresh runtime evaluates code via eval(), so
// 'unsafe-eval' is required for `next dev` to hydrate; production stays strict.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${analyticsOrigin}`;
const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${analyticsOrigin}`,
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  transpilePackages: ["@platform/compiler", "@platform/corpus", "@platform/safety", "@platform/ai", "@platform/diagnosis", "@platform/ingest", "@platform/missions", "@platform/eval", "@platform/storage", "@platform/auth", "@platform/gear"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
