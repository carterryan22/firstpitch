// @platform/corpus-watch — every-3-days content scanner for the creator/social
// sources in corpus/sources.seed.json.
//
// WHAT IT DOES
//   1. Reads the corpus source list and keeps only creator/social entries
//      (YouTube / Instagram / TikTok profiles, plus anything tagged "social").
//   2. For YouTube channels it reads new uploads (Atom feed, falling back to a
//      channel-page scrape) and detects uploads newer than the last run.
//   3. For Instagram / TikTok (not pollable without auth) it emits a
//      "needs_manual_check" reminder so they still surface in the digest.
//   4. New candidates are appended to corpus/review-queue.json and a digest is
//      written to corpus/review-queue.md.
//
// It does NOT edit sources.seed.json — that's promote.ts's job (run together by
// `npm run cycle`). This file only discovers and queues candidates.
//
// Run: cd platform/scripts/corpus-watch ; cmd /c "npm run watch"
// Dry run (no writes): cmd /c "npm run watch:dry"

import { writeFile } from "node:fs/promises";
import {
  SOURCES_PATH,
  STATE_PATH,
  QUEUE_JSON_PATH,
  QUEUE_MD_PATH,
  type Candidate,
  type Platform,
  type SourceRecord,
  isCreatorSource,
  loadJson,
  platformOf,
  renderDigest,
} from "./shared.ts";

const DRY =
  process.env.CORPUS_WATCH_DRY === "1" || process.argv.includes("--dry");
const MAX_NEW_PER_SOURCE = Number(process.env.CORPUS_WATCH_MAX ?? 8);
// Re-nudge a manual (IG/TikTok) source only every N days to avoid daily spam.
const MANUAL_NUDGE_DAYS = Number(process.env.CORPUS_WATCH_MANUAL_DAYS ?? 6);

interface WatchState {
  lastRunAt?: string;
  sources: Record<
    string,
    {
      lastCheckedAt?: string;
      seenIds?: string[];
      lastManualNudgeAt?: string;
      channelId?: string;
    }
  >;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // A desktop UA gets the full channel HTML (needed to read channelId).
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) corpus-watch/0.1",
        "accept-language": "en-US,en;q=0.9",
        // Pre-consent cookies skip YouTube's EU consent interstitial, which
        // otherwise serves a stub page with no channelId/externalId.
        cookie: "CONSENT=YES+cb; SOCS=CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${res.statusText} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ! fetch failed for ${url}: ${(err as Error).message}`);
    return null;
  }
}

// Resolve any YouTube channel URL (/@handle, /user/x, /c/x, /channel/UC..,
// or a vanity path) to candidate UC… channel ids, most-likely first. A page can
// embed several UC ids (recommended channels, video authors), so callers should
// try each against the Atom feed and keep the first that returns 200.
async function resolveYouTubeChannelIds(
  url: string,
  cached?: string,
): Promise<string[]> {
  if (cached) return [cached];
  const direct = url.match(/\/channel\/(UC[\w-]+)/);
  if (direct?.[1]) return [direct[1]];
  const html = await fetchText(url);
  if (!html) return [];
  const candidates: string[] = [];
  const push = (id?: string | null) => {
    if (id && id.length === 24 && !candidates.includes(id)) candidates.push(id);
  };
  // Own-channel markers only — the broad "any UC id on the page" approach picks
  // up recommended-channel and avatar ids that 404 against the feed.
  push(html.match(/rel="canonical" href="[^"]*\/channel\/(UC[\w-]+)"/)?.[1]);
  push(html.match(/<meta property="og:url" content="[^"]*\/channel\/(UC[\w-]+)"/)?.[1]);
  push(html.match(/"externalId":"(UC[\w-]+)"/)?.[1]);
  push(html.match(/"browseId":"(UC[\w-]+)"/)?.[1]);
  push(html.match(/"channelId":"(UC[\w-]+)"/)?.[1]);
  return candidates;
}

// Some legacy URLs (/user/NAME) have a direct feed param; no HTML fetch needed.
function directYouTubeFeedUrl(url: string): string | null {
  const user = url.match(/youtube\.com\/user\/([^/?#]+)/i)?.[1];
  if (user) return `https://www.youtube.com/feeds/videos.xml?user=${user}`;
  const channel = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i)?.[1];
  if (channel)
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`;
  return null;
}

interface FeedItem {
  id: string;
  title: string;
  url: string;
  published?: string;
}

function parseYouTubeFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const id =
      entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim() ?? "";
    const title = decodeXml(
      entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "",
    );
    const link =
      entry.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ??
      (id ? `https://www.youtube.com/watch?v=${id}` : "");
    const published = entry
      .match(/<published>([^<]+)<\/published>/)?.[1]
      ?.trim();
    if (id && title) items.push({ id, title, url: link, published });
  }
  return items;
}

// Fallback when the Atom feed is unavailable (YouTube has largely deprecated
// /feeds/videos.xml). Scrape ytInitialData from the channel's /videos page.
// Modern channels use the lockupViewModel layout (contentId + accessibility
// label); older ones use videoRenderer (videoId + title runs).
function parseYouTubeChannelHtml(html: string): FeedItem[] {
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  const add = (id: string, rawTitle: string) => {
    if (!id || seen.has(id)) return;
    const title = cleanVideoTitle(decodeJsString(rawTitle));
    if (!title) return;
    seen.add(id);
    items.push({ id, title, url: `https://www.youtube.com/watch?v=${id}` });
  };

  // New lockup layout.
  const lockup =
    /"contentId":"([\w-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"[\s\S]{0,500}?"accessibilityContext":\{"label":"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = lockup.exec(html)) !== null) add(m[1]!, m[2] ?? "");

  // Legacy videoRenderer layout.
  const renderer =
    /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,400}?"title":\{(?:"runs":\[\{"text":"((?:[^"\\]|\\.)*)"|"simpleText":"((?:[^"\\]|\\.)*)")/g;
  while ((m = renderer.exec(html)) !== null) add(m[1]!, m[2] ?? m[3] ?? "");

  return items;
}

// Accessibility labels append a spoken duration ("… 3 minutes, 21 seconds").
// Strip that tail so we keep just the video title.
function cleanVideoTitle(label: string): string {
  return label
    .replace(
      /\s+\d+\s+(hour|minute|second)s?(,\s+\d+\s+(minute|second)s?)*\s*$/i,
      "",
    )
    .trim();
}

function decodeJsString(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function daysSince(iso?: string): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

// Normalize any YouTube channel URL to its /videos listing (newest uploads).
function channelVideosUrl(url: string): string {
  const clean = url.replace(/\/+$/, "");
  if (/\/videos$/i.test(clean)) return clean;
  return `${clean}/videos`;
}

// Emit a "go look at this yourself" candidate, throttled so a source that
// can't be auto-read only nudges every MANUAL_NUDGE_DAYS instead of every run.
function nudgeManually(
  src: SourceRecord,
  platform: Platform,
  st: WatchState["sources"][string],
  nowIso: string,
  out: Candidate[],
  firstRun: boolean,
  note: string,
): void {
  if (firstRun) {
    st.lastManualNudgeAt = nowIso;
    return;
  }
  if (daysSince(st.lastManualNudgeAt) < MANUAL_NUDGE_DAYS) return;
  st.lastManualNudgeAt = nowIso;
  out.push(
    toCandidate(src, platform, {
      title: `Manual check: review ${src.source_name} for new content`,
      url: src.url,
      nowIso,
      manual: true,
      note,
    }),
  );
  console.log(`  ~ ${src.source_name} (${platform}): manual nudge`);
}

async function main(): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  console.log(`corpus-watch run @ ${nowIso}${DRY ? " (dry run)" : ""}`);

  const sources = await loadJson<SourceRecord[]>(SOURCES_PATH, []);
  const creators = sources.filter(isCreatorSource);
  console.log(
    `Scanning ${creators.length} creator/social sources of ${sources.length} total.`,
  );

  const state = await loadJson<WatchState>(STATE_PATH, { sources: {} });
  state.sources ??= {};
  const existingQueue = await loadJson<Candidate[]>(QUEUE_JSON_PATH, []);
  const knownContentUrls = new Set(existingQueue.map((c) => c.content_url));

  const firstRun = !state.lastRunAt;
  const newCandidates: Candidate[] = [];

  for (const src of creators) {
    const key = src.url;
    const st = (state.sources[key] ??= {});
    const seen = new Set(st.seenIds ?? []);
    const platform = platformOf(src.url);

    if (platform === "youtube") {
      let items: FeedItem[] = [];
      let methodNote = "";

      // 1. Try the Atom feed (still works on some networks).
      const directFeed = directYouTubeFeedUrl(src.url);
      const feedUrl =
        directFeed ??
        (await (async () => {
          const ids = await resolveYouTubeChannelIds(src.url, st.channelId);
          if (ids[0]) st.channelId = ids[0];
          return ids[0]
            ? `https://www.youtube.com/feeds/videos.xml?channel_id=${ids[0]}`
            : null;
        })());
      if (feedUrl) {
        const xml = await fetchText(feedUrl);
        if (xml && xml.includes("<entry>")) {
          items = parseYouTubeFeed(xml);
          methodNote = "feed";
        }
      }

      // 2. Fallback: scrape the channel's /videos page (feed is often 404 now).
      if (!items.length) {
        const videosUrl = channelVideosUrl(src.url);
        const html = await fetchText(videosUrl);
        if (html) {
          items = parseYouTubeChannelHtml(html);
          methodNote = "scrape";
        }
      }

      // 3. Still nothing → degrade to a manual-check nudge so the creator
      //    still appears in the every-3-days review loop.
      if (!items.length) {
        nudgeManually(
          src,
          platform,
          st,
          nowIso,
          newCandidates,
          firstRun,
          "Could not auto-read this channel (YouTube feed/scrape unavailable). Open it and skim recent uploads.",
        );
        st.lastCheckedAt = nowIso;
        continue;
      }
      let added = 0;
      for (const item of items) {
        if (seen.has(item.id)) continue;
        // On the very first run, learn the baseline silently (don't flood the
        // queue with a creator's entire back catalogue).
        if (firstRun) {
          seen.add(item.id);
          continue;
        }
        if (knownContentUrls.has(item.url)) {
          seen.add(item.id);
          continue;
        }
        if (added >= MAX_NEW_PER_SOURCE) break;
        seen.add(item.id);
        added += 1;
        newCandidates.push(
          toCandidate(src, platform, {
            title: item.title,
            url: item.url,
            published: item.published,
            nowIso,
          }),
        );
      }
      st.seenIds = [...seen].slice(-400);
      st.lastCheckedAt = nowIso;
      console.log(
        `  + ${src.source_name} (YouTube/${methodNote}): ${added} new${firstRun ? " (baseline learned)" : ""}`,
      );
    } else if (platform === "instagram" || platform === "tiktok") {
      // Not pollable without authenticated APIs. Surface a periodic reminder
      // so the human reviewer manually checks the profile.
      nudgeManually(
        src,
        platform,
        st,
        nowIso,
        newCandidates,
        firstRun,
        `${platform} can't be auto-polled. Open the profile, skim recent posts, and add any worth keeping.`,
      );
      st.lastCheckedAt = nowIso;
    } else {
      st.lastCheckedAt = nowIso;
    }
  }

  state.lastRunAt = nowIso;

  // De-dupe against the existing queue by content_url.
  const fresh = newCandidates.filter((c) => !knownContentUrls.has(c.content_url));
  const mergedQueue = [...existingQueue, ...fresh];

  console.log(
    `\n${fresh.length} new candidate(s); queue now ${mergedQueue.length} item(s).`,
  );

  if (DRY) {
    for (const c of fresh)
      console.log(`   • [${c.platform}] ${c.source_name}: ${c.content_title}`);
    console.log("(dry run — no files written)");
    return;
  }

  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeFile(
    QUEUE_JSON_PATH,
    JSON.stringify(mergedQueue, null, 2) + "\n",
    "utf8",
  );
  await writeFile(QUEUE_MD_PATH, renderDigest(mergedQueue, nowIso), "utf8");
  console.log(`Wrote ${QUEUE_JSON_PATH}`);
  console.log(`Wrote ${QUEUE_MD_PATH}`);
}

function toCandidate(
  src: SourceRecord,
  platform: Platform,
  opts: {
    title: string;
    url: string;
    published?: string;
    nowIso: string;
    manual?: boolean;
    note?: string;
  },
): Candidate {
  const baseTags = (src.tags ?? []).filter(
    (t) => !["social", "video"].includes(t.toLowerCase()),
  );
  return {
    id: `${platform}:${opts.url}`,
    discovered_at: opts.nowIso,
    status: "pending_review",
    platform,
    source_name: src.source_name,
    source_url: src.url,
    content_title: opts.title,
    content_url: opts.url,
    published_at: opts.published,
    needs_manual_check: opts.manual ?? false,
    suggested_topic: src.topic,
    suggested_age_band: src.age_band,
    suggested_tags: [...baseTags, "needs-review"],
    note: opts.note,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
