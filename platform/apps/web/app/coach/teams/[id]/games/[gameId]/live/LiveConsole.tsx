"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameRecord } from "@platform/storage";

type Roster = Array<{ id: string; name: string; canPitch: boolean }>;
type Score = { us: number; them: number };

export function LiveConsole({
  gameId,
  initial,
  roster,
}: {
  gameId: string;
  initial: GameRecord;
  roster: Roster;
}) {
  const [game, setGame] = useState<GameRecord>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activePitcherId, setActivePitcherId] = useState<string>(() => {
    const eligible = roster.filter((p) => p.canPitch);
    return eligible[0]?.id ?? roster[0]?.id ?? "";
  });
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as { game: GameRecord };
    setGame(j.game);
  }, [gameId]);

  useEffect(() => {
    pollRef.current = window.setInterval(refresh, 15000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refresh]);

  async function patch(body: Record<string, unknown>, optimistic?: (g: GameRecord) => GameRecord) {
    setErr(null);
    let previous: GameRecord | null = null;
    if (optimistic) {
      previous = game;
      setGame(optimistic(game));
    }
    setBusy(true);
    const res = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      if (previous) setGame(previous);
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed");
      return;
    }
    const j = (await res.json()) as { game: GameRecord };
    setGame(j.game);
  }

  const score: Score = game.finalScore ?? { us: 0, them: 0 };
  const present = game.attendance ?? {};
  const counts = game.pitchCounts ?? {};
  const pitchersEligible = roster.filter((p) => p.canPitch);
  const pitchersOnList = pitchersEligible.length > 0 ? pitchersEligible : roster;

  function addPitches(n: number) {
    if (!activePitcherId) return;
    const cur = counts[activePitcherId] ?? { pitches: 0, innings: 0, recordedAt: new Date().toISOString() };
    const next = {
      ...counts,
      [activePitcherId]: {
        pitches: Math.max(0, cur.pitches + n),
        innings: cur.innings,
        recordedAt: new Date().toISOString(),
      },
    };
    patch({ pitchCounts: next }, (g) => ({ ...g, pitchCounts: next }));
  }

  function setInnings(playerId: string, innings: number) {
    const cur = counts[playerId] ?? { pitches: 0, innings: 0, recordedAt: new Date().toISOString() };
    const next = {
      ...counts,
      [playerId]: {
        pitches: cur.pitches,
        innings: Math.max(0, innings),
        recordedAt: new Date().toISOString(),
      },
    };
    patch({ pitchCounts: next }, (g) => ({ ...g, pitchCounts: next }));
  }

  function bumpScore(side: "us" | "them", delta: number) {
    const next = { ...score, [side]: Math.max(0, score[side] + delta) };
    patch({ finalScore: next }, (g) => ({ ...g, finalScore: next }));
  }

  function toggleAttendance(playerId: string) {
    const cur = present[playerId] ?? "absent";
    const next = { ...present, [playerId]: cur === "present" ? "absent" : "present" } as Record<string, "present" | "absent">;
    patch({ attendance: next }, (g) => ({ ...g, attendance: next }));
  }

  const presentCount = Object.values(present).filter((v) => v === "present").length;
  const totalPitchesToday = Object.values(counts).reduce((s, e) => s + e.pitches, 0);

  return (
    <div className="space-y-4">
      {err ? (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">{err}</div>
      ) : null}

      {/* Status + Score banner */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={
                game.status === "in_progress"
                  ? "badge-ok"
                  : game.status === "completed"
                  ? "badge-info"
                  : "badge-warn"
              }
            >
              {game.status.replace("_", " ")}
            </span>
            {game.status === "scheduled" ? (
              <button
                className="btn-primary text-sm"
                disabled={busy}
                onClick={() => patch({ status: "in_progress" }, (g) => ({ ...g, status: "in_progress" }))}
              >
                Start game
              </button>
            ) : null}
            {game.status !== "completed" ? (
              <button
                className="btn-ghost text-sm"
                disabled={busy}
                onClick={() => patch({ markCompleted: true }, (g) => ({ ...g, status: "completed" }))}
              >
                Finalize
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-6">
            <ScoreColumn label="Us" value={score.us} disabled={busy} onChange={(d) => bumpScore("us", d)} />
            <div className="text-2xl text-slate-400">–</div>
            <ScoreColumn label="Them" value={score.them} disabled={busy} onChange={(d) => bumpScore("them", d)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Auto-refreshes every 15s · {presentCount} present · {totalPitchesToday} total pitches
        </p>
      </div>

      {/* Active pitcher panel */}
      <div className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Pitch counter</h2>
          <div className="text-xs text-slate-500">tap +1 for every pitch thrown</div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label" htmlFor="lp-pitcher">Active pitcher</label>
            <select
              id="lp-pitcher"
              className="input"
              value={activePitcherId}
              onChange={(e) => setActivePitcherId(e.target.value)}
            >
              {pitchersOnList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {!p.canPitch ? " (not flagged)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="text-3xl font-bold tabular-nums text-slate-800">
            {counts[activePitcherId]?.pitches ?? 0}
            <span className="ml-1 text-base font-normal text-slate-500">pitches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy || !activePitcherId} onClick={() => addPitches(1)}>+1</button>
            <button className="btn-primary" disabled={busy || !activePitcherId} onClick={() => addPitches(5)}>+5</button>
            <button className="btn-ghost" disabled={busy || !activePitcherId} onClick={() => addPitches(-1)}>−1</button>
          </div>
        </div>

        {Object.keys(counts).length > 0 ? (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-1">Pitcher</th>
                <th className="px-2 py-1">Pitches</th>
                <th className="px-2 py-1">Innings</th>
                <th className="px-2 py-1">Last</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts).map(([pid, e]) => {
                const p = roster.find((r) => r.id === pid);
                return (
                  <tr key={pid} className="border-t border-slate-100">
                    <td className="px-2 py-1 font-medium text-slate-700">{p?.name ?? pid}</td>
                    <td className="px-2 py-1 font-mono">{e.pitches}</td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        className="input h-7 w-16 px-1 py-0 text-sm"
                        min={0}
                        step={0.5}
                        value={e.innings}
                        onChange={(ev) => setInnings(pid, Number(ev.target.value))}
                      />
                    </td>
                    <td className="px-2 py-1 text-xs text-slate-500">
                      {new Date(e.recordedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Attendance grid */}
      <div className="card">
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Attendance</h2>
        <p className="mt-1 text-xs text-slate-500">Tap a name to toggle present / absent.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {roster.map((p) => {
            const isPresent = present[p.id] === "present";
            return (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => toggleAttendance(p.id)}
                className={
                  isPresent
                    ? "rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-sm font-medium text-emerald-800"
                    : present[p.id] === "absent"
                    ? "rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-500 line-through"
                    : "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 hover:border-teal-500"
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreColumn({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-4xl font-bold tabular-nums text-slate-800">{value}</div>
      <div className="mt-1 flex gap-1">
        <button
          type="button"
          className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50"
          disabled={disabled}
          onClick={() => onChange(-1)}
        >
          −
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50"
          disabled={disabled}
          onClick={() => onChange(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
