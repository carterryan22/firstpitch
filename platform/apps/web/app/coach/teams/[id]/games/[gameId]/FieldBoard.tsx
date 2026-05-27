"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  autoLineup,
  buildLocks,
  POSITIONS,
  EXTRA_POSITIONS,
  PRESET_POSITIONS,
  shuffleNonLocked,
  summarize,
  toCsv,
  type DefensivePreset,
  type LineupPlayer,
  type Inning,
  type Slot,
} from "@platform/lineup";

const ALL_SLOTS: Slot[] = [...POSITIONS, ...EXTRA_POSITIONS, "BN"];

type RosterEntry = LineupPlayer & {
  name: string;
  jerseyNumber?: string;
};

const MAX_HISTORY = 30;

export function FieldBoard({
  gameId,
  innings,
  roster,
  present,
  initial,
  pitcherUnavailable,
}: {
  gameId: string;
  innings: number;
  roster: RosterEntry[];
  present: string[];
  initial: Inning[];
  pitcherUnavailable?: string[];
}) {
  const router = useRouter();
  const seedLineup: Inning[] =
    initial.length === innings
      ? initial
      : Array.from({ length: innings }, (_, i) => initial[i] ?? {});
  const [lineup, setLineupRaw] = useState<Inning[]>(seedLineup);
  const [history, setHistory] = useState<Inning[][]>([]);
  const [future, setFuture] = useState<Inning[][]>([]);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<DefensivePreset>("standard9");
  const [competitive, setCompetitive] = useState<number>(30); // 0..100
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // setLineup that also records history for undo
  const setLineup = useCallback((updater: (cur: Inning[]) => Inning[]) => {
    setLineupRaw((cur) => {
      const next = updater(cur);
      setHistory((h) => [...h.slice(-MAX_HISTORY + 1), cur]);
      setFuture([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setFuture((f) => [lineup, ...f].slice(0, MAX_HISTORY));
      setLineupRaw(prev);
      return h.slice(0, -1);
    });
  }, [lineup]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, lineup].slice(-MAX_HISTORY));
      setLineupRaw(next!);
      return rest;
    });
  }, [lineup]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const fairness = useMemo(
    () => summarize(lineup, roster.map((r) => r.id)),
    [lineup, roster],
  );

  function setSlot(playerId: string, inningIdx: number, slot: Slot | "") {
    setLineup((cur) =>
      cur.map((inn, i) => {
        if (i !== inningIdx) return inn;
        const next = { ...inn };
        if (slot === "") delete next[playerId];
        else next[playerId] = slot;
        return next;
      }),
    );
  }

  function toggleLock(playerId: string, inningIdx: number) {
    setLocked((cur) => {
      const k = `${inningIdx}:${playerId}`;
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function generate() {
    const res = autoLineup({
      innings,
      players: roster,
      present,
      preset,
      competitiveWeight: competitive / 100,
      locks: locked.size ? buildLocks(lineup, locked) : undefined,
      pitcherUnavailable,
    });
    setLineup(() => res.innings);
    setWarnings(res.warnings);
  }

  function shuffleAroundLocks() {
    if (locked.size === 0) {
      // Equivalent to a regenerate when nothing is locked.
      generate();
      return;
    }
    const res = shuffleNonLocked(lineup, locked, {
      innings,
      players: roster,
      present,
      preset,
      competitiveWeight: competitive / 100,
      pitcherUnavailable,
    });
    setLineup(() => res.innings);
    setWarnings(res.warnings);
  }

  function clearAll() {
    setLineup(() => Array.from({ length: innings }, () => ({})));
    setLocked(new Set());
    setWarnings([]);
  }

  function exportCsv() {
    const csv = toCsv(
      lineup,
      roster.map((r) => ({ id: r.id, name: r.name, jerseyNumber: r.jerseyNumber })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lineup-${gameId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineup }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to save");
      return;
    }
    router.refresh();
  }

  // Per-inning issues. Use the active position set so missing/dupe checks
  // adapt to the chosen preset.
  const activePositions = PRESET_POSITIONS[preset];
  const inningIssues = lineup.map((inn) => {
    const fillCount: Partial<Record<Slot, number>> = {};
    for (const slot of Object.values(inn) as Slot[]) {
      fillCount[slot] = (fillCount[slot] ?? 0) + 1;
    }
    const dupes = activePositions.filter((p) => (fillCount[p] ?? 0) > 1);
    const missing = activePositions.filter((p) => (fillCount[p] ?? 0) === 0);
    return { dupes, missing };
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={generate}>
          Auto-generate
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={shuffleAroundLocks}
          title="Re-roll non-locked cells"
        >
          Shuffle ({locked.size} locked)
        </button>
        <button type="button" className="btn-ghost" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl/Cmd+Z)">
          ↶ Undo
        </button>
        <button type="button" className="btn-ghost" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)">
          ↷ Redo
        </button>
        <button type="button" className="btn-ghost" onClick={clearAll}>
          Clear
        </button>
        <button type="button" className="btn-ghost" onClick={exportCsv}>
          Export CSV
        </button>
        <div className="grow" />
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save lineup"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Preset</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1"
            value={preset}
            onChange={(e) => setPreset(e.target.value as DefensivePreset)}
          >
            <option value="standard9">Standard 9</option>
            <option value="standard10">Standard 10 (+ Rover)</option>
            <option value="coachPitch">Coach Pitch (no P/C)</option>
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-slate-600 whitespace-nowrap">Priority</span>
          <span className="text-xs text-slate-500">Fair</span>
          <input
            type="range"
            min={0}
            max={100}
            value={competitive}
            onChange={(e) => setCompetitive(Number(e.target.value))}
            className="w-40 accent-emerald-600"
            aria-label="Competitive priority"
          />
          <span className="text-xs text-slate-500">Skill</span>
          <span className="tabular-nums text-slate-700 w-10 text-right">{competitive}%</span>
        </label>
        <span className="text-xs text-slate-500">
          Tap a cell&apos;s 🔒 to lock; Shuffle keeps locked cells.
        </span>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {warnings.length > 0 ? (
        <ul className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="border-b border-slate-200 px-2 py-2">Player</th>
              {Array.from({ length: innings }, (_, i) => {
                const issues = inningIssues[i] ?? { dupes: [], missing: [] };
                return (
                <th key={i} className="border-b border-slate-200 px-2 py-2 text-center">
                  {i + 1}
                  {issues.dupes.length > 0 ? (
                    <div className="text-xs font-normal text-red-600">
                      dup: {issues.dupes.join(",")}
                    </div>
                  ) : null}
                  {issues.missing.length > 0 ? (
                    <div className="text-xs font-normal text-amber-700">
                      need: {issues.missing.join(",")}
                    </div>
                  ) : null}
                </th>
              );})}
              <th className="border-b border-slate-200 px-2 py-2 text-center">F</th>
              <th className="border-b border-slate-200 px-2 py-2 text-center">BN</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((p, ri) => {
              const stats = fairness[ri];
              const isAbsent = !present.includes(p.id);
              return (
                <tr key={p.id} className={isAbsent ? "opacity-40" : ""}>
                  <td className="border-b border-slate-100 px-2 py-1.5 whitespace-nowrap">
                    <span className="inline-block w-7 text-right text-xs font-bold tabular-nums text-slate-700">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}
                    </span>{" "}
                    {p.name}
                    {p.injured ? <span className="ml-1 badge-danger">Inj</span> : null}
                  </td>
                  {Array.from({ length: innings }, (_, i) => {
                    const slot = (lineup[i]?.[p.id] ?? "") as Slot | "";
                    const key = `${i}:${p.id}`;
                    const isLocked = locked.has(key);
                    return (
                      <td key={i} className="border-b border-slate-100 px-1 py-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <select
                            aria-label={`Inning ${i + 1} for ${p.name}`}
                            className={`rounded border bg-white px-1 py-0.5 text-xs ${isLocked ? "border-emerald-500 ring-1 ring-emerald-300" : "border-slate-200"}`}
                            value={slot}
                            disabled={isAbsent || p.injured}
                            onChange={(e) => setSlot(p.id, i, e.target.value as Slot | "")}
                          >
                            <option value="">—</option>
                            {ALL_SLOTS.map((s) => {
                              const rating = p.positionRatings?.[s as never];
                              const blocked = rating === "avoid";
                              const noPitch = s === "P" && !p.canPitch;
                              const noCatch = s === "C" && !p.canCatch;
                              return (
                                <option
                                  key={s}
                                  value={s}
                                  disabled={blocked || noPitch || noCatch}
                                >
                                  {s}
                                  {rating === "preferred" ? "★" : rating === "ok" ? "·" : ""}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            aria-label={isLocked ? `Unlock ${p.name} inning ${i + 1}` : `Lock ${p.name} inning ${i + 1}`}
                            title={isLocked ? "Locked — Shuffle will keep this" : "Lock this cell"}
                            onClick={() => toggleLock(p.id, i)}
                            disabled={isAbsent || p.injured || !slot}
                            className={`text-[10px] leading-none px-0.5 ${isLocked ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"} disabled:opacity-30`}
                          >
                            {isLocked ? "🔒" : "🔓"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 px-2 py-1 text-center text-xs text-slate-600">
                    {stats?.fieldInnings ?? 0}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-1 text-center text-xs text-slate-600">
                    {stats?.benchInnings ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        ★ preferred · dot ok · blank unrated · &ldquo;avoid&rdquo; positions are disabled. Absent players are dimmed. Lock cells with 🔒, then click <strong>Shuffle</strong> to reroll the rest.
      </p>
    </section>
  );
}

export function fieldBoardRosterFrom(
  players: Array<{
    id: string;
    name: string;
    jerseyNumber?: string;
    canPitch: boolean;
    canCatch: boolean;
    injured: boolean;
    positionRatings?: Record<string, string>;
  }>,
): RosterEntry[] {
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    jerseyNumber: p.jerseyNumber,
    canPitch: p.canPitch,
    canCatch: p.canCatch,
    injured: p.injured,
    positionRatings: (p.positionRatings ?? {}) as RosterEntry["positionRatings"],
  }));
}
