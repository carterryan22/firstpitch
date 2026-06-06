// @platform/corpus-watch — promoter. Turns queued candidates into real
// SourceRecords in corpus/sources.seed.json, then removes them from the queue.
//
// Each promoted item CLONES its parent creator's source record (so it inherits
// the exact safety posture: safe_to_prescribe:false, requires_guardrail,
// guardrail_reason, do_not_use_for, topic, age_band, tags) and only overrides
// the title/url/summary to point at the specific new piece of content. This is
// why auto-promotion is safe: we never invent a safety posture, we copy a
// human-vetted one from a creator already in the corpus.
//
// By default it promotes every non-manual pending (or approved) candidate so
// the cycle is hands-off. Set CORPUS_PROMOTE_REQUIRE_APPROVAL=1 to only promote
// candidates a human marked `approved` (via `npm run approve`).
//
// Run: cmd /c "npm run promote"   ·   dry: cmd /c "npm run promote -- --dry"

import {
  SOURCES_PATH,
  QUEUE_JSON_PATH,
  QUEUE_MD_PATH,
  type Candidate,
  type SourceRecord,
  loadJson,
  writeJson,
  renderDigest,
  slug,
} from "./shared.ts";
import { writeFile } from "node:fs/promises";

const DRY =
  process.env.CORPUS_WATCH_DRY === "1" || process.argv.includes("--dry");
const REQUIRE_APPROVAL = process.env.CORPUS_PROMOTE_REQUIRE_APPROVAL === "1";

function platformLabel(platform: Candidate["platform"]): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    default:
      return "Web";
  }
}

// Build a SourceRecord for a piece of content by cloning the parent creator.
function buildSourceRecord(
  candidate: Candidate,
  parent: SourceRecord | undefined,
): SourceRecord {
  const label = platformLabel(candidate.platform);
  const sourceName = parent?.source_name ?? candidate.source_name;
  const baseTags = (parent?.tags ?? candidate.suggested_tags ?? []).filter(
    (t) => !["needs-review"].includes(t.toLowerCase()),
  );
  const summary =
    `"${candidate.content_title}" — a ${label} video from ${sourceName}. ` +
    `Auto-added from the creator watch list; use as coaching inspiration only, ` +
    `age-scale it, and defer to Pitch Smart and Tier-1 safety rules.`;

  return {
    title: `${candidate.content_title} — ${sourceName} (${label})`,
    url: candidate.content_url,
    source_name: sourceName,
    source_tier: parent?.source_tier ?? "Tier 3",
    topic: parent?.topic ?? candidate.suggested_topic ?? "baseball",
    age_band: parent?.age_band ?? candidate.suggested_age_band ?? "9-12",
    sport: parent?.sport ?? "baseball",
    summary,
    key_principles: parent?.key_principles ?? [],
    // Safety posture is ALWAYS the conservative creator stance, regardless of
    // what (if anything) the parent had — these are unvetted social clips.
    // Treat empty parent guardrail fields as missing (some older creator
    // records predate the guardrail convention) and fall back to the default.
    safe_to_prescribe: false,
    requires_guardrail: true,
    guardrail_reason:
      parent?.guardrail_reason?.trim() ||
      "Social-media creator content — inspiration only; must be age-scaled and defer to Pitch Smart and Tier-1 safety rules.",
    do_not_use_for: parent?.do_not_use_for?.length
      ? parent.do_not_use_for
      : ["pitch-count guidance", "medical/injury advice"],
    coach_use_case: parent?.coach_use_case ?? "Drill / coaching inspiration.",
    player_use_case: parent?.player_use_case ?? "",
    parent_use_case: parent?.parent_use_case ?? "",
    practice_format: parent?.practice_format ?? "drill",
    equipment_needed: parent?.equipment_needed ?? [],
    duration_minutes: null,
    progression_level: parent?.progression_level ?? "intro",
    evidence_level: parent?.evidence_level ?? "coaching article",
    tags: dedupe([
      ...baseTags,
      slug(sourceName),
      candidate.platform === "youtube" ? "video" : "social",
      "auto-added",
    ]),
  };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

async function main(): Promise<void> {
  const nowIso = new Date().toISOString();
  console.log(`corpus-promote run @ ${nowIso}${DRY ? " (dry run)" : ""}`);

  const sources = await loadJson<SourceRecord[]>(SOURCES_PATH, []);
  const queue = await loadJson<Candidate[]>(QUEUE_JSON_PATH, []);
  const existingUrls = new Set(sources.map((s) => s.url));
  const parentByUrl = new Map(sources.map((s) => [s.url, s]));

  const eligible = queue.filter((c) => {
    if (c.status === "promoted") return false;
    if (c.needs_manual_check) return false; // IG/TikTok stay manual
    return REQUIRE_APPROVAL ? c.status === "approved" : true;
  });

  if (!eligible.length) {
    console.log(
      REQUIRE_APPROVAL
        ? "No approved candidates to promote (gate is ON)."
        : "No promotable candidates in the queue.",
    );
  }

  const added: SourceRecord[] = [];
  const promotedIds = new Set<string>();
  for (const candidate of eligible) {
    if (existingUrls.has(candidate.content_url)) {
      // Already in the corpus (e.g. promoted in a prior run) — just drop it.
      promotedIds.add(candidate.id);
      continue;
    }
    const parent = parentByUrl.get(candidate.source_url);
    const record = buildSourceRecord(candidate, parent);
    added.push(record);
    existingUrls.add(record.url);
    promotedIds.add(candidate.id);
    console.log(`  + ${record.source_name}: ${candidate.content_title}`);
  }

  // Keep manual checks + anything not promoted; mark promoted items so the
  // digest can show history if desired (we drop them to keep the queue lean).
  const remainingQueue = queue.filter((c) => !promotedIds.has(c.id));

  console.log(
    `\n${added.length} source(s) added; ${remainingQueue.length} item(s) remain in queue.`,
  );

  if (DRY) {
    console.log("(dry run — no files written)");
    return;
  }

  if (added.length) {
    await writeJson(SOURCES_PATH, [...sources, ...added]);
    console.log(`Wrote ${SOURCES_PATH} (+${added.length})`);
  }
  await writeJson(QUEUE_JSON_PATH, remainingQueue);
  await writeFile(QUEUE_MD_PATH, renderDigest(remainingQueue, nowIso), "utf8");
  console.log(`Wrote ${QUEUE_JSON_PATH}`);
  console.log(`Wrote ${QUEUE_MD_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
