"use client";

import { useState } from "react";

type RosterEntry = { playerId: string; displayName: string; jerseyNumber?: string };

type IngestReport = {
  rows: Array<{
    playerId: string | null;
    rawName: string;
    jersey?: string;
    date?: string;
    pa?: number;
    ab?: number;
    hits?: number;
    doubles?: number;
    triples?: number;
    hr?: number;
    bb?: number;
    k?: number;
    pitchesSeen?: number;
    rbi?: number;
    sb?: number;
    cs?: number;
  }>;
  unmatchedNames: string[];
  ambiguousNames: Array<{ rawName: string; candidates: Array<{ playerId: string; score: number }> }>;
  unknownColumns: string[];
  parsedRowCount: number;
};

// Sentinel select value meaning "don't import this row".
const SKIP = "__skip__";

export function StatsImportForm({ roster }: { roster: RosterEntry[] }) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<IngestReport | null>(null);
  // Coach-supplied resolutions for ambiguous / unmatched names: rawName -> playerId | SKIP.
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setCsv(text);
  }

  async function submit() {
    if (!csv) {
      setErr("Pick a CSV file or paste contents first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setReport(null);
    setResolutions({});
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, roster, source: "gameChanger" }),
      });
      const data = (await res.json()) as IngestReport & { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Import failed");
      } else {
        setReport(data);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function setResolution(rawName: string, value: string) {
    setResolutions((prev) => ({ ...prev, [rawName]: value }));
  }

  // The player a row maps to after applying coach resolutions.
  function effectivePlayerId(row: { playerId: string | null; rawName: string }): string | null {
    if (row.playerId) return row.playerId;
    const r = resolutions[row.rawName];
    if (r && r !== SKIP) return r;
    return null;
  }

  const nameById = new Map(roster.map((p) => [p.playerId, p.displayName] as const));
  const matched = report?.rows.filter((r) => effectivePlayerId(r)).length ?? 0;
  // Names still needing a decision: shown as ambiguous/unmatched and not yet resolved.
  const needsReview = report
    ? [
        ...report.ambiguousNames.map((a) => a.rawName),
        ...report.unmatchedNames,
      ].filter((n) => !resolutions[n])
    : [];

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="csv-file">GameChanger filtered CSV</label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Export &ldquo;Filtered Stats&rdquo; from GameChanger (or any CSV with player + batting
            columns). We accept common headers: Player, #, PA, AB, H, 2B, 3B, HR, BB, K, RBI, SB, CS.
          </p>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-slate-600">Or paste CSV directly</summary>
          <textarea
            className="input mt-2 h-40 font-mono text-xs"
            placeholder="Player,#,PA,AB,H,2B,3B,HR,BB,K..."
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileName(null);
            }}
          />
        </details>

        {fileName ? (
          <p className="text-xs text-slate-500">Loaded: {fileName} ({csv.length.toLocaleString()} chars)</p>
        ) : null}

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <button onClick={submit} disabled={busy || !csv} className="btn-primary">
          {busy ? "Importing…" : "Import & match roster"}
        </button>
      </div>

      {report ? (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Parsed rows" value={report.parsedRowCount} />
            <Stat label="Matched players" value={matched} tone={matched > 0 ? "ok" : undefined} />
            <Stat
              label="Unmatched"
              value={report.unmatchedNames.length}
              tone={report.unmatchedNames.length > 0 ? "warn" : undefined}
            />
            <Stat
              label="Ambiguous"
              value={report.ambiguousNames.length}
              tone={report.ambiguousNames.length > 0 ? "warn" : undefined}
            />
          </div>

          {report.unknownColumns.length > 0 ? (
            <p className="text-xs text-slate-500">
              Unknown columns ignored: <span className="font-mono">{report.unknownColumns.join(", ")}</span>
            </p>
          ) : null}

          {needsReview.length > 0 ? (
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {needsReview.length} name{needsReview.length === 1 ? "" : "s"} still need review. Pick the
              matching player (or skip) below.
            </p>
          ) : report.ambiguousNames.length + report.unmatchedNames.length > 0 ? (
            <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              All flagged names resolved. {matched} of {report.rows.length} rows mapped.
            </p>
          ) : null}

          {report.ambiguousNames.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Ambiguous matches</h3>
              <p className="mt-1 text-xs text-slate-500">
                More than one roster player is a close match. Confirm who each row belongs to.
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {report.ambiguousNames.map((a) => (
                  <li
                    key={a.rawName}
                    className="flex flex-wrap items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <span className="font-medium">{a.rawName}</span>
                    <RosterSelect
                      roster={roster}
                      value={resolutions[a.rawName] ?? ""}
                      preferred={a.candidates.map((c) => c.playerId)}
                      onChange={(v) => setResolution(a.rawName, v)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.unmatchedNames.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Unmatched names</h3>
              <p className="mt-1 text-xs text-slate-500">
                These didn&rsquo;t match any roster player. Assign each to a player, or skip it.
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {report.unmatchedNames.map((n) => (
                  <li
                    key={n}
                    className="flex flex-wrap items-center gap-2 rounded border border-slate-200 px-3 py-2"
                  >
                    <span className="font-medium">{n}</span>
                    <RosterSelect
                      roster={roster}
                      value={resolutions[n] ?? ""}
                      onChange={(v) => setResolution(n, v)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.rows.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Preview</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Match</th>
                      <th className="px-2 py-1">PA</th>
                      <th className="px-2 py-1">AB</th>
                      <th className="px-2 py-1">H</th>
                      <th className="px-2 py-1">BB</th>
                      <th className="px-2 py-1">K</th>
                      <th className="px-2 py-1">HR</th>
                      <th className="px-2 py-1">RBI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.slice(0, 25).map((r, i) => {
                      const pid = effectivePlayerId(r);
                      const resolved = !r.playerId && !!pid;
                      return (
                        <tr key={i}>
                          <td className="px-2 py-1">{r.rawName}</td>
                          <td className="px-2 py-1">
                            {pid ? (
                              <span className={resolved ? "text-sky-700" : "text-emerald-700"}>
                                {nameById.get(pid) ?? pid}
                                {resolved ? " (you)" : ""}
                              </span>
                            ) : (
                              <span className="text-dirt-700">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1 tabular-nums">{r.pa ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.ab ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.hits ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.bb ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.k ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.hr ?? ""}</td>
                          <td className="px-2 py-1 tabular-nums">{r.rbi ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {report.rows.length > 25 ? (
                  <p className="mt-1 text-xs text-slate-500">Showing first 25 of {report.rows.length} rows.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded border border-slate-200 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function RosterSelect({
  roster,
  value,
  preferred,
  onChange,
}: {
  roster: RosterEntry[];
  value: string;
  /** Player ids to surface first (e.g. the fuzzy-match candidates). */
  preferred?: string[];
  onChange: (value: string) => void;
}) {
  const preferredSet = new Set(preferred ?? []);
  const top = (preferred ?? [])
    .map((id) => roster.find((p) => p.playerId === id))
    .filter((p): p is RosterEntry => Boolean(p));
  const rest = roster.filter((p) => !preferredSet.has(p.playerId));
  const label = (p: RosterEntry) =>
    p.jerseyNumber ? `#${p.jerseyNumber} ${p.displayName}` : p.displayName;
  return (
    <select
      className="input min-h-[36px] w-auto py-1 text-sm"
      aria-label="Assign to roster player"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Choose player…</option>
      {top.length > 0 ? (
        <optgroup label="Likely matches">
          {top.map((p) => (
            <option key={p.playerId} value={p.playerId}>{label(p)}</option>
          ))}
        </optgroup>
      ) : null}
      <optgroup label={top.length > 0 ? "All players" : "Roster"}>
        {rest.map((p) => (
          <option key={p.playerId} value={p.playerId}>{label(p)}</option>
        ))}
      </optgroup>
      <option value={SKIP}>Skip this row</option>
    </select>
  );
}
