"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ParsedGame {
  uid: string;
  opponent: string;
  startsAt: string;
  venue?: string;
  homeAway: "home" | "away";
  summary: string;
}
interface DiffSummary {
  created: number;
  updated: number;
  unchanged: number;
  detached: number;
}
interface PreviewDiff {
  created: ParsedGame[];
  updated: Array<{
    existingId: string;
    before: { opponent: string; startsAt: string; homeAway: "home" | "away"; venue?: string };
    after: ParsedGame;
  }>;
  unchanged: Array<{ existingId: string; game: ParsedGame }>;
  detached: Array<{ id: string; opponent: string; startsAt: string }>;
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function side(g: { homeAway: "home" | "away"; opponent: string }): string {
  return `${g.homeAway === "home" ? "vs" : "@"} ${g.opponent}`;
}

export function ScheduleImport({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ics, setIcs] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<DiffSummary | null>(null);
  const [diff, setDiff] = useState<PreviewDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setDiff(null);
    setSummary(null);
    setDone(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setIcs(await f.text());
  }

  async function preview() {
    if (!ics.trim()) {
      setErr("Choose a GameChanger .ics file or paste its contents first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/schedule/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ics, commit: false }),
      });
      const data = (await res.json()) as { summary?: DiffSummary; diff?: PreviewDiff; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Could not read that calendar.");
        return;
      }
      setSummary(data.summary ?? null);
      setDiff(data.diff ?? null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/schedule/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ics, commit: true }),
      });
      const data = (await res.json()) as { summary?: DiffSummary; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Import failed.");
        return;
      }
      const s = data.summary;
      setDone(
        s
          ? `Imported: ${s.created} created, ${s.updated} updated, ${s.unchanged} unchanged.`
          : "Schedule imported.",
      );
      setDiff(null);
      setSummary(null);
      setIcs("");
      setFileName(null);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost no-underline">
        Import schedule (.ics)
      </button>
    );
  }

  const nothingToDo =
    summary !== null && summary.created === 0 && summary.updated === 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0">Import schedule from GameChanger</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:underline">
          Close
        </button>
      </div>
      <p className="m-0 text-sm text-slate-600">
        In GameChanger, export your team&rsquo;s schedule as a calendar (.ics) file, then upload it
        here. We&rsquo;ll show you exactly what will change before anything is saved.
      </p>

      <div>
        <input type="file" accept=".ics,text/calendar" onChange={onFile} className="block text-sm" />
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-slate-600">Or paste .ics contents</summary>
          <textarea
            className="input mt-2 h-28 font-mono text-xs"
            placeholder="BEGIN:VCALENDAR…"
            value={ics}
            onChange={(e) => {
              setIcs(e.target.value);
              setFileName(null);
              setDiff(null);
              setSummary(null);
            }}
          />
        </details>
        {fileName ? <p className="mt-1 text-xs text-slate-500">Loaded: {fileName}</p> : null}
      </div>

      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {done ? <p className="text-sm font-medium text-field-700">{done}</p> : null}

      {summary ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-field-100 px-2 py-1 text-field-700">{summary.created} created</span>
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">{summary.updated} updated</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{summary.unchanged} unchanged</span>
            <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">{summary.detached} detached</span>
          </div>

          {diff && diff.created.length > 0 ? (
            <DiffSection title="New games">
              {diff.created.map((g) => (
                <li key={g.uid} className="text-sm text-slate-700">
                  <span className="font-medium">{side(g)}</span>
                  <span className="text-slate-500"> · {when(g.startsAt)}{g.venue ? ` · ${g.venue}` : ""}</span>
                </li>
              ))}
            </DiffSection>
          ) : null}

          {diff && diff.updated.length > 0 ? (
            <DiffSection title="Changed games">
              {diff.updated.map((u) => (
                <li key={u.existingId} className="text-sm text-slate-700">
                  <span className="font-medium">{side(u.after)}</span>
                  <span className="text-slate-500"> · {when(u.after.startsAt)}</span>
                  <span className="block text-xs text-dirt-700 line-through">
                    was {side(u.before)} · {when(u.before.startsAt)}
                  </span>
                </li>
              ))}
            </DiffSection>
          ) : null}

          {diff && diff.detached.length > 0 ? (
            <DiffSection title="No longer in the feed (kept, not deleted)">
              {diff.detached.map((g) => (
                <li key={g.id} className="text-sm text-slate-500">
                  {g.opponent} · {when(g.startsAt)}
                </li>
              ))}
            </DiffSection>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!summary ? (
          <button onClick={preview} disabled={busy || !ics.trim()} className="btn-primary">
            {busy ? "Reading…" : "Preview changes"}
          </button>
        ) : (
          <>
            <button onClick={commit} disabled={busy || nothingToDo} className="btn-primary">
              {busy
                ? "Importing…"
                : nothingToDo
                  ? "Nothing to import"
                  : `Apply ${summary.created + summary.updated} change${summary.created + summary.updated === 1 ? "" : "s"}`}
            </button>
            <button
              onClick={() => {
                setSummary(null);
                setDiff(null);
              }}
              disabled={busy}
              className="btn-ghost"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DiffSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-1 space-y-1">{children}</ul>
    </div>
  );
}
