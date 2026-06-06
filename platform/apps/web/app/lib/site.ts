/**
 * Canonical public origin for the app. Used for metadataBase, sitemap, and
 * robots so generated URLs are absolute and correct in every environment.
 *
 * Precedence:
 *  1. NEXT_PUBLIC_SITE_URL (explicit, set this in prod)
 *  2. VERCEL_PROJECT_PRODUCTION_URL (stable prod alias on Vercel)
 *  3. VERCEL_URL (per-deploy preview URL)
 *  4. http://localhost:3000 (local dev)
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${stripTrailingSlash(prod)}`;

  const preview = process.env.VERCEL_URL;
  if (preview) return `https://${stripTrailingSlash(preview)}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}
