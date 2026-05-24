// BM25-lite retrieval over corpus sources + drills. E8.1.
// Pure in-memory, deterministic, no network. Returns snippets with source citations.

import { loadSources, loadDrills, type SourceRecord, type Drill } from "@platform/corpus";

export type RetrievalKind = "source" | "drill";

export interface RetrievedRecord {
  kind: RetrievalKind;
  id: string;
  title: string;
  snippet: string;
  score: number;
  citation: { id: string; url?: string; tier?: number };
}

interface Doc {
  kind: RetrievalKind;
  id: string;
  title: string;
  text: string;
  tokens: string[];
  tier?: number;
  url?: string;
}

let CACHED: Doc[] | null = null;
let AVGDL = 0;
let IDF: Map<string, number> = new Map();

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "in", "to", "for", "on", "with",
  "is", "are", "be", "as", "by", "at", "this", "that", "it", "from",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function tierFromLabel(label: string): number | undefined {
  const m = /(\d)/.exec(label);
  return m && m[1] ? Number(m[1]) : undefined;
}

function buildIndex(): Doc[] {
  if (CACHED) return CACHED;
  const docs: Doc[] = [];

  const srcs: SourceRecord[] = loadSources();
  let srcIdx = 0;
  for (const s of srcs) {
    const text = [
      s.title,
      s.summary,
      (s.key_principles ?? []).join(" "),
      s.topic,
      (s.tags ?? []).join(" "),
    ].join(" ");
    docs.push({
      kind: "source",
      id: `SRC_${srcIdx++}_${s.source_name.replace(/\s+/g, "_")}`,
      title: s.title,
      text,
      tokens: tokenize(text),
      tier: tierFromLabel(s.source_tier),
      url: s.url,
    });
  }

  const drills: Drill[] = loadDrills();
  for (const d of drills) {
    const text = [
      d.name,
      d.short_description,
      d.long_description,
      (d.coaching_cues ?? []).join(" "),
      d.topic,
      (d.equipment_required ?? []).join(" "),
      (d.tags ?? []).join(" "),
    ].join(" ");
    docs.push({
      kind: "drill",
      id: d.drill_id,
      title: d.name,
      text,
      tokens: tokenize(text),
    });
  }

  // Build IDF
  const N = docs.length;
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  IDF = new Map();
  for (const [t, n] of df) {
    IDF.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  }
  AVGDL = docs.reduce((s, d) => s + d.tokens.length, 0) / Math.max(1, N);
  CACHED = docs;
  return docs;
}

function bm25(q: string[], d: Doc): number {
  const k1 = 1.5;
  const b = 0.75;
  const dl = d.tokens.length;
  const tf = new Map<string, number>();
  for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const term of q) {
    const f = tf.get(term);
    if (!f) continue;
    const idf = IDF.get(term) ?? 0;
    const numer = f * (k1 + 1);
    const denom = f + k1 * (1 - b + b * (dl / Math.max(1, AVGDL)));
    score += idf * (numer / denom);
  }
  return score;
}

function snippetFor(text: string, qTokens: string[], max = 220): string {
  const lower = text.toLowerCase();
  let bestIdx = 0;
  for (const t of qTokens) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      bestIdx = Math.max(0, i - 40);
      break;
    }
  }
  const slice = text.slice(bestIdx, bestIdx + max);
  return slice.length < text.length ? slice.trim() + "…" : slice.trim();
}

export interface RetrieveOptions {
  k?: number;
  kinds?: RetrievalKind[];
  /** Tier 1/2 sources only (Pitch Smart, NFHS, etc.) for safety-sensitive prompts. */
  tierMax?: number;
}

export function retrieve(query: string, opts: RetrieveOptions = {}): RetrievedRecord[] {
  const docs = buildIndex();
  const q = tokenize(query);
  if (q.length === 0) return [];
  const k = opts.k ?? 5;
  const kinds = new Set(opts.kinds ?? ["source", "drill"]);

  const scored = docs
    .filter((d) => kinds.has(d.kind))
    .filter((d) => (opts.tierMax !== undefined && d.kind === "source" ? (d.tier ?? 99) <= opts.tierMax : true))
    .map((d) => ({ d, s: bm25(q, d) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k);

  return scored.map(({ d, s }) => ({
    kind: d.kind,
    id: d.id,
    title: d.title,
    snippet: snippetFor(d.text, q),
    score: Number(s.toFixed(4)),
    citation: { id: d.id, url: d.url, tier: d.tier },
  }));
}

/** Test/CLI helper to reset cache (e.g., after corpus edits). */
export function resetRetrievalCache(): void {
  CACHED = null;
  AVGDL = 0;
  IDF = new Map();
}
