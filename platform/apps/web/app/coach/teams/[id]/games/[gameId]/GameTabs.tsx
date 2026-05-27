"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Attendance, GameStatus, HomeAway, PitchEntry } from "@platform/storage";

type RosterLite = {
  id: string;
  name: string;
  jerseyNumber?: string;
  canPitch: boolean;
  canCatch: boolean;
  injured: boolean;
};

type GameLite = {
  id: string;
  opponent: string;
  startsAt: string;
  venue?: string;
  homeAway: HomeAway;
  innings: number;
  status: GameStatus;
  notes?: string;
  attendance: Record<string, Attendance>;
  pitchCounts: Record<string, PitchEntry>;
  finalScore?: { us: number; them: number };
  isScrimmage?: boolean;
};

export function GameTabs({
  teamId,
  game,
  roster,
  tab,
}: {
  teamId: string;
  game: GameLite;
  roster: RosterLite[];
  tab: "field" | "roster" | "summary" | "notes" | "stats";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>(game.attendance);
  const [pitchCounts, setPitchCounts] = useState<Record<string, PitchEntry>>(game.pitchCounts);
  const [us, setUs] = useState<number>(game.finalScore?.us ?? 0);
  const [them, setThem] = useState<number>(game.finalScore?.them ?? 0);
  const completed = game.status === "completed";

  async function patch(body: Record<string, unknown>, redirectGames = false) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to save");
      return;
    }
    if (redirectGames) router.push(`/coach/teams/${teamId}/games`);
    router.refresh();
  }

  async function deleteGame() {
    if (!confirm("Delete this game? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push(`/coach/teams/${teamId}/games`);
      router.refresh();
    }
  }

  if (tab === "roster") {
    const presentCount = Object.values(attendance).filter((v) => v === "present").length;
    return (
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0">Attendance ({presentCount}/{roster.length} present)</h2>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => patch({ attendance })}
          >
            {busy ? "Saving…" : "Save attendance"}
          </button>
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <ul className="card divide-y divide-slate-100 p-0">
          {roster.map((p) => {
            const v = attendance[p.id] ?? "present";
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-baseline gap-3">
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-slate-700">
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}
                  </span>
                  <span className="text-slate-800">{p.name}</span>
                  {p.injured ? <span className="badge-danger">Injured</span> : null}
                </div>
                <div className="flex gap-1">
                  {(["present", "absent"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setAttendance((cur) => ({ ...cur, [p.id]: opt }))
                      }
                      className={`rounded px-3 py-1 text-xs capitalize ${
                        v === opt
                          ? opt === "present"
                            ? "bg-teal-600 text-white"
                            : "bg-slate-300 text-slate-900"
                          : "border border-slate-200 text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (tab === "summary") {
    const pitchers = roster.filter((p) => p.canPitch);
    return (
      <section className="space-y-6">
        <div>
          <h2 className="m-0">Pitch counts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter pitches and innings for each player who pitched. Drives the Pitching board's
            rest-day calculations.
          </p>
          {pitchers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No players are marked as &ldquo;Can pitch&rdquo;. Toggle the flag on the roster.
            </p>
          ) : (
            <ul className="mt-3 card divide-y divide-slate-100 p-0">
              {pitchers.map((p) => {
                const entry = pitchCounts[p.id] ?? { pitches: 0, innings: 0, recordedAt: "" };
                return (
                  <li key={p.id} className="grid grid-cols-[1fr_100px_100px] items-center gap-3 px-4 py-3">
                    <span className="text-slate-800">
                      {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}{p.name}
                    </span>
                    <label className="text-xs text-slate-500">
                      Pitches
                      <input
                        type="number"
                        min={0}
                        max={200}
                        disabled={completed}
                        className="input mt-1"
                        value={entry.pitches}
                        onChange={(e) =>
                          setPitchCounts((cur) => ({
                            ...cur,
                            [p.id]: {
                              ...entry,
                              pitches: Number(e.target.value) || 0,
                              recordedAt: new Date().toISOString(),
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-xs text-slate-500">
                      Innings
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.5}
                        disabled={completed}
                        className="input mt-1"
                        value={entry.innings}
                        onChange={(e) =>
                          setPitchCounts((cur) => ({
                            ...cur,
                            [p.id]: {
                              ...entry,
                              innings: Number(e.target.value) || 0,
                              recordedAt: new Date().toISOString(),
                            },
                          }))
                        }
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {pitchers.length > 0 ? (
            <button
              className="btn-ghost mt-3"
              disabled={busy || completed}
              onClick={() => patch({ pitchCounts })}
            >
              Save pitch counts
            </button>
          ) : null}
        </div>

        <div>
          <h2 className="m-0">Final score</h2>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <label>
              Us
              <input
                type="number"
                min={0}
                className="input ml-2 w-20"
                value={us}
                onChange={(e) => setUs(Number(e.target.value) || 0)}
                disabled={completed}
              />
            </label>
            <span>–</span>
            <label>
              {game.opponent}
              <input
                type="number"
                min={0}
                className="input ml-2 w-20"
                value={them}
                onChange={(e) => setThem(Number(e.target.value) || 0)}
                disabled={completed}
              />
            </label>
          </div>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {!completed ? (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => patch({ finalScore: { us, them }, markCompleted: true })}
            >
              Mark complete
            </button>
          ) : (
            <>
              <span className="badge-ok">Read-only — game completed</span>
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={() => patch({ revertToDraft: true })}
              >
                Revert to draft
              </button>
            </>
          )}
          <button
            type="button"
            className={`btn-ghost ${game.isScrimmage ? "bg-amber-50 text-amber-900 ring-amber-200" : ""}`}
            disabled={busy}
            onClick={() => patch({ isScrimmage: !game.isScrimmage })}
            title="Scrimmages are excluded from season stats"
          >
            {game.isScrimmage ? "✓ Scrimmage" : "Mark as scrimmage"}
          </button>
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => patch({ resetLineup: true })}
          >
            Reset lineup
          </button>
          <button className="btn-ghost text-red-600" disabled={busy} onClick={deleteGame}>
            Delete game
          </button>
        </div>
      </section>
    );
  }

  return null;
}
