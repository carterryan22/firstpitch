"use client";
import { useState } from "react";

interface Player {
  id: string;
  name: string;
  jerseyNumber?: string;
  alreadyAssigned: boolean;
}

export function AssignMissionPanel({
  teamId,
  missionId,
  roster,
}: {
  teamId: string;
  missionId: string;
  roster: Player[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggle(pid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function selectAllUnassigned() {
    setSelected(new Set(roster.filter((p) => !p.alreadyAssigned).map((p) => p.id)));
  }

  async function submit() {
    if (selected.size === 0) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/missions/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId, playerIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = (await res.json()) as { assignments: unknown[] };
      setMsg(`Assigned to ${data.assignments.length} player(s). Refresh to see status.`);
      setSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-dirt-200 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={selectAllUnassigned} className="btn-ghost">
          Select all unassigned
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="btn-ghost"
          disabled={selected.size === 0}
        >
          Clear
        </button>
        <span className="quote text-dirt-700">{selected.size} selected</span>
      </div>
      <ul className="grid gap-1 text-sm sm:grid-cols-2 md:grid-cols-3">
        {roster.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-[40px] cursor-pointer items-center gap-2 border border-dirt-200 px-2 py-1 hover:bg-dirt-100">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4"
              />
              <span className="quote text-dirt-700">#{p.jerseyNumber ?? "-"}</span>
              <span className="flex-1 truncate">{p.name}</span>
              {p.alreadyAssigned ? (
                <span className="badge" title="Already assigned">
                  ✓
                </span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || selected.size === 0}
          className="btn-primary"
        >
          {busy ? "Assigning…" : `Assign to ${selected.size || 0}`}
        </button>
        {msg ? <span className="quote text-sm text-ink/80">{msg}</span> : null}
        {err ? <span className="text-sm text-red-700">{err}</span> : null}
      </div>
    </div>
  );
}
