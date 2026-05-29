import type { Scenario } from "../types.ts";

/**
 * Anonymous broken-link sweep.
 * 1. Visit every public seed page.
 * 2. Extract every same-origin <a href>.
 * 3. HEAD/GET each unique URL and flag 4xx/5xx.
 *
 * Distinct from anonymous-tour: that one only visits a hard-coded list and
 * looks at page-level signals (console, img.naturalWidth). This one actually
 * follows the link graph so a stale `<Link href="/old-route">` will be caught.
 */
export const brokenLinksScenario: Scenario = {
  name: "broken-links",
  persona: "anonymous",
  description:
    "Crawl all anchor hrefs reachable from public pages and report non-2xx responses.",
  async run(ctx) {
    const seeds = [
      "/",
      "/login",
      "/learn",
      "/drills",
      "/safety",
      "/fields",
      "/missions",
      "/favorites",
    ];

    const seen = new Set<string>();
    const queue: string[] = [];

    for (const path of seeds) {
      ctx.step(`collect links on ${path}`);
      await ctx.goto(path);
      const hrefs = await ctx.page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll("a[href]").forEach((a) => {
          const h = (a as HTMLAnchorElement).getAttribute("href") ?? "";
          if (!h) return;
          out.push(h);
        });
        return out;
      });
      for (const raw of hrefs) {
        // Skip anchors / mail / tel / javascript: / external (assume http(s)://*).
        if (
          raw.startsWith("#") ||
          raw.startsWith("mailto:") ||
          raw.startsWith("tel:") ||
          raw.startsWith("javascript:")
        )
          continue;
        // Skip external links; only crawl same-origin paths.
        if (/^https?:\/\//i.test(raw)) {
          try {
            const u = new URL(raw);
            const base = new URL(ctx.baseUrl);
            if (u.origin !== base.origin) continue;
            const pathOnly = u.pathname + u.search;
            if (!seen.has(pathOnly)) {
              seen.add(pathOnly);
              queue.push(pathOnly);
            }
          } catch {
            /* ignore malformed */
          }
          continue;
        }
        // Relative or root-relative.
        const pathOnly = raw.startsWith("/") ? raw : new URL(raw, ctx.baseUrl + path).pathname;
        if (!seen.has(pathOnly)) {
          seen.add(pathOnly);
          queue.push(pathOnly);
        }
      }
    }

    ctx.step(`check ${queue.length} discovered links`);
    for (const target of queue) {
      const res = await ctx.api(target).catch(() => null);
      if (!res) {
        ctx.bug({
          kind: "timeout",
          severity: "major",
          url: target,
          message: `request to ${target} threw`,
        });
        continue;
      }
      if (res.status >= 400) {
        ctx.bug({
          kind: "response.error",
          severity: res.status >= 500 ? "blocker" : "major",
          url: target,
          status: res.status,
          message: `discovered link ${target} returned ${res.status}`,
        });
      }
    }
  },
};
