import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/site";

/**
 * Crawl rules. We allow the public marketing + SEO surfaces (drills, fields,
 * practice plans, safety) and disallow authenticated app areas, API routes, and
 * the no-auth signed Press Box share links (already noindex'd per-page).
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/coach/", "/parent/", "/favorites", "/p/", "/login"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
