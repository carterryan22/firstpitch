// Common helpers for device CSV ingest. Each device adapter parses its
// vendor-specific column layout into MetricEntry-shaped rows.

import { toRecords } from "./csv";

export type DeviceVerification = "device_captured";
export const DEVICE_VERIFICATION: DeviceVerification = "device_captured";

export interface DeviceEntry {
  metricKey: string;
  value: number;
  recordedAt: string;
  source: string;
  notes?: string;
}

export interface DeviceIngestReport {
  source: string;
  entries: DeviceEntry[];
  parsedRowCount: number;
  unknownColumns: string[];
  warnings: string[];
}

export function normalizeHeaderKey(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

export function toNumberOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function toIsoOrNow(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function buildReport(
  csv: string,
  source: string,
  knownHeaders: Record<string, string>,
  rowToEntries: (rec: Record<string, string>) => DeviceEntry[]
): DeviceIngestReport {
  const records = toRecords(csv);
  if (records.length === 0) {
    return { source, entries: [], parsedRowCount: 0, unknownColumns: [], warnings: ["no_rows"] };
  }
  const headerKeys = Object.keys(records[0]!);
  const unknownColumns: string[] = [];
  for (const h of headerKeys) {
    if (!knownHeaders[normalizeHeaderKey(h)]) unknownColumns.push(h);
  }
  const entries: DeviceEntry[] = [];
  for (const rec of records) {
    // normalize keys once per row so device adapters can use stable lookups
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(rec)) norm[normalizeHeaderKey(k)] = v;
    entries.push(...rowToEntries(norm));
  }
  return { source, entries, parsedRowCount: records.length, unknownColumns, warnings: [] };
}
