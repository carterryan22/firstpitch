import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/site";

/**
 * Static, public, indexable routes. Dynamic public pages (individual fields,
 * public team pages) are intentionally omitted here to avoid leaking the full
 * id-space; they remain crawlable via in-app links. Add a dynamic generator
 * later if SEO needs per-field/per-team entries.
 */
const STATIC_PATHS = [
  "",
  "/safety",
  "/drills",
  "/fields",
  "/practice/new",
  "/plans",
  "/learn",
  "/learn/roles",
  "/billing",
  "/policy",
  "/policy/ai-boundaries",
  "/policy/privacy",
  "/policy/cookies",
  "/policy/terms",
  "/login",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
