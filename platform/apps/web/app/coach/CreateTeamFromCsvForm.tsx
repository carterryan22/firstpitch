"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AGE_BANDS: Array<"6-8" | "9-12" | "13-15" | "16+"> = ["6-8", "9-12", "13-15", "16+"];

type PreviewRow = { rawName: string; jersey?: string };

export function CreateTeamFromCsvForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>("9-12");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setPreview(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
  }

  async function runPreview() {
    if (!csv.trim()) {
      setErr("Pick a CSV file or paste contents first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, roster: [], source: "gameChanger" }),
      });
      const data = (await res.json()) as {
        rows?: PreviewRow[];
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? "Could not read CSV");
        return;
      }
      const rows = (data.rows ?? []).filter((r) => r.rawName?.trim());
      // De-dupe by name + jersey, mirroring the server-side roster extraction.
      const seen = new Set<string>();
      const unique = rows.filter((r) => {
        const key = `${r.rawName}|${r.jersey ?? ""}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (unique.length === 0) {
        setErr("No players found. Make sure the CSV has a Player or Name column.");
        return;
      }
      setPreview(unique);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/teams/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, ageBand, csv }),
      });
      const data = (await res.json()) as { team?: { id: string }; error?: string };
      if (!res.ok || !data.team) {
        setErr(data.error ?? "Failed to create team");
        return;
      }
      router.push(`/coach/teams/${data.team.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label" htmlFor="csv-team-name">Team name</label>
          <input
            id="csv-team-name"
            className="input"
            placeholder="Coast Diamondbacks 11U"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="csv-team-age">Age band</label>
          <select
            id="csv-team-age"
            className="input"
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as (typeof AGE_BANDS)[number])}
          >
            {AGE_BANDS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="csv-team-file">GameChanger filtered CSV</label>
        <input
          id="csv-team-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block text-sm"
        />
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-slate-600">Or paste CSV directly</summary>
          <textarea
            className="input mt-2 h-32 font-mono text-xs"
            placeholder="Player,#,PA,AB,H,2B,3B,HR,BB,K..."
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileName(null);
              setPreview(null);
            }}
          />
        </details>
        {fileName ? (
          <p className="mt-1 text-xs text-slate-500">Loaded: {fileName}</p>
        ) : null}
      </div>

      {err ? <p className="text-sm text-danger">{err}</p> : null}

      {preview ? (
        <div className="rounded border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">
            {preview.length} player{preview.length === 1 ? "" : "s"} found
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {preview.map((r, i) => (
              <li key={i} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {r.jersey ? <span className="text-dirt-700">#{r.jersey} </span> : null}
                {r.rawName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!preview ? (
          <button onClick={runPreview} disabled={busy || !csv.trim()} className="btn-primary">
            {busy ? "Reading…" : "Preview roster"}
          </button>
        ) : (
          <>
            <button onClick={create} disabled={busy || !name.trim()} className="btn-primary">
              {busy ? "Creating…" : `Create team & ${preview.length} player${preview.length === 1 ? "" : "s"}`}
            </button>
            <button onClick={() => setPreview(null)} disabled={busy} className="btn-ghost">
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
