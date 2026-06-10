// @platform/research — schema-driven validation for corpus items.
// Errors: missing required field, value not in enum, out-of-range, unknown key
// (corpus.schema.json is additionalProperties:false). Warnings: tags in
// job_to_be_done / pain_points / feature_requests that are not in taxonomy.json.

import { getCorpus, getCorpusSchema, getTaxonomy } from "./load";
import type { CorpusSchema, PropSchema } from "./load";
import type { CorpusItem, Taxonomy, ValidationIssue } from "./types";

function checkValue(prop: PropSchema, value: unknown): string | null {
  if (prop.enum) {
    if (!prop.enum.includes(value as string | null)) {
      return `value ${JSON.stringify(value)} not in [${prop.enum.join(", ")}]`;
    }
    return null;
  }
  const isArray = prop.type === "array" || (Array.isArray(prop.type) && prop.type.includes("array"));
  if (isArray && prop.items) {
    if (!Array.isArray(value)) return "expected an array";
    for (const element of value) {
      const msg = checkValue(prop.items, element);
      if (msg) return `array item ${JSON.stringify(element)}: ${msg}`;
    }
    return null;
  }
  if (typeof value === "number") {
    if (typeof prop.minimum === "number" && value < prop.minimum) return `below minimum ${prop.minimum}`;
    if (typeof prop.maximum === "number" && value > prop.maximum) return `above maximum ${prop.maximum}`;
  }
  if (prop.pattern && typeof value === "string") {
    if (!new RegExp(prop.pattern).test(value)) return `does not match pattern ${prop.pattern}`;
  }
  return null;
}

const TAXONOMY_FIELDS: Array<keyof CorpusItem> = ["job_to_be_done", "pain_points", "feature_requests"];

function taxonomySets(taxonomy: Taxonomy): Record<string, Set<string>> {
  return {
    job_to_be_done: new Set(taxonomy.jobs_to_be_done.map((t) => t.id)),
    pain_points: new Set(taxonomy.pain_points.map((t) => t.id)),
    feature_requests: new Set(taxonomy.feature_opportunities.map((t) => t.id)),
  };
}

/** Validate a single corpus item against the schema + taxonomy. */
export function validateItem(
  item: CorpusItem,
  schema: CorpusSchema = getCorpusSchema(),
  taxonomy: Taxonomy = getTaxonomy(),
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const record = item as unknown as Record<string, unknown>;
  const itemId = typeof item.source_id === "string" && item.source_id ? item.source_id : "<no source_id>";

  for (const req of schema.required) {
    if (record[req] === undefined) {
      issues.push({ itemId, level: "error", message: `missing required field "${req}"` });
    }
  }

  for (const key of Object.keys(record)) {
    const prop = schema.properties[key];
    if (!prop) {
      issues.push({ itemId, level: "error", message: `unknown property "${key}" (schema is additionalProperties:false)` });
      continue;
    }
    const value = record[key];
    if (value === undefined) continue;
    const msg = checkValue(prop, value);
    if (msg) issues.push({ itemId, level: "error", message: `field "${key}": ${msg}` });
  }

  const sets = taxonomySets(taxonomy);
  for (const field of TAXONOMY_FIELDS) {
    const tags = record[field as string];
    const allowed = sets[field as string];
    if (!Array.isArray(tags) || !allowed) continue;
    for (const tag of tags) {
      if (typeof tag === "string" && !allowed.has(tag)) {
        issues.push({ itemId, level: "warning", message: `${String(field)} tag "${tag}" is not in taxonomy.json` });
      }
    }
  }

  return issues;
}

export interface ValidationReport {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

/** Validate the whole corpus (defaults to the loaded corpus.json). */
export function validateCorpus(
  items: CorpusItem[] = getCorpus(),
  schema: CorpusSchema = getCorpusSchema(),
  taxonomy: Taxonomy = getTaxonomy(),
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item.source_id === "string") {
      if (seen.has(item.source_id)) {
        issues.push({ itemId: item.source_id, level: "error", message: "duplicate source_id" });
      }
      seen.add(item.source_id);
    }
    issues.push(...validateItem(item, schema, taxonomy));
  }
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;
  return { ok: errorCount === 0, errorCount, warningCount, issues };
}
