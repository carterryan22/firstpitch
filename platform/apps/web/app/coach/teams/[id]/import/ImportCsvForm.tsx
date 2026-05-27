"use client";

import { useState } from "react";

type RosterPlayer = { playerId: string; displayName: string; jerseyNumber?: string };

type IngestResponse = {
  rows?: Array<{ playerId: string | null; rawName: string }>;
  unmatchedNames?: string[];
  ambiguousNames?: Array<{ rawName: string; candidates: Array<{ playerId: string; score: number }> }>;
  unknownColumns?: string[];
  parsedRowCount?: number;
  error?: string;
};

export function ImportCsvForm({ roster }: { roster: RosterPlayer[] }) {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, roster, source: "gameChanger" }),
      });
      const data: IngestResponse = await res.json();
      if (!res.ok) {
        setErr(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const playerById = new Map(roster.map((p) => [p.playerId, p.displayName] as const));
  const matchedCount = result?.rows?.filter((r) => r.playerId).length ?? 0;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Upload CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-1"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            …or paste CSV contents
          </span>
          <textarea
            className="textarea mt-1 h-40 font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Player,PA,AB,H,2B,3B,HR,BB,K,RBI,SB,CS"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn" disabled={busy || !csv.trim()}>
            {busy ? "Parsing…" : "Parse CSV"}
          </button>
          <span className="text-xs text-slate-500">
            Preview only — nothing is saved yet. {roster.length} roster players available for matching.
          </span>
        </div>
      </form>

      {err ? (
        <div className="rounded border border-danger/30 bg-danger-soft/40 p-3 text-sm text-danger">
          {err}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <strong>{result.parsedRowCount ?? 0}</strong> row(s) parsed ·{" "}
            <strong>{matchedCount}</strong> matched ·{" "}
            <strong>{result.unmatchedNames?.length ?? 0}</strong> unmatched ·{" "}
            <strong>{result.ambiguousNames?.length ?? 0}</strong> ambiguous
          </div>

          {result.unknownColumns && result.unknownColumns.length > 0 ? (
            <div className="rounded border border-warn/30 bg-warn-soft/40 p-3 text-sm">
              <div className="font-medium text-warn">Unknown columns (ignored)</div>
              <code className="text-xs">{result.unknownColumns.join(", ")}</code>
            </div>
          ) : null}

          {result.unmatchedNames && result.unmatchedNames.length > 0 ? (
            <div className="rounded border border-warn/30 bg-warn-soft/40 p-3 text-sm">
              <div className="font-medium text-warn">Unmatched names</div>
              <ul className="mt-1 list-disc pl-6">
                {result.unmatchedNames.map((n, i) => (
                  <li key={i}>
                    <code>{n}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.ambiguousNames && result.ambiguousNames.length > 0 ? (
            <div className="rounded border border-warn/30 bg-warn-soft/40 p-3 text-sm">
              <div className="font-medium text-warn">Ambiguous names (low-confidence)</div>
              <ul className="mt-1 space-y-1">
                {result.ambiguousNames.map((a, i) => (
                  <li key={i}>
                    <code>{a.rawName}</code> →{" "}
                    {a.candidates.map((c, j) => (
                      <span key={j} className="text-xs">
                        {j > 0 ? ", " : ""}
                        {playerById.get(c.playerId) ?? c.playerId} ({c.score.toFixed(2)})
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.rows && result.rows.length > 0 ? (
            <details className="rounded border border-slate-200 p-3 text-sm">
              <summary className="cursor-pointer font-medium">View parsed rows</summary>
              <ul className="mt-2 list-disc pl-6">
                {result.rows.map((r, i) => (
                  <li key={i}>
                    {r.rawName} →{" "}
                    {r.playerId ? (
                      <strong>{playerById.get(r.playerId) ?? r.playerId}</strong>
                    ) : (
                      <span className="text-warn">unmatched</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
