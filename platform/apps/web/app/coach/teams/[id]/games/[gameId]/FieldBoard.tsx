"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  autoLineup,
  POSITIONS,
  summarize,
  type LineupPlayer,
  type Inning,
  type Slot,
} from "@platform/lineup";

const SLOTS: Slot[] = [...POSITIONS, "BN"];

type RosterEntry = LineupPlayer & {
  name: string;
  jerseyNumber?: string;
};

export function FieldBoard({
  gameId,
  innings,
  roster,
  present,
  initial,
}: {
  gameId: string;
  innings: number;
  roster: RosterEntry[];
  present: string[];
  initial: Inning[];
}) {
  const router = useRouter();
  const [lineup, setLineup] = useState<Inning[]>(
    initial.length === innings
      ? initial
      : Array.from({ length: innings }, (_, i) => initial[i] ?? {}),
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fairness = useMemo(
    () => summarize(lineup, roster.map((r) => r.id)),
    [lineup, roster],
  );
  const byId = useMemo(() => {
    const m = new Map<string, RosterEntry>();
    for (const r of roster) m.set(r.id, r);
    return m;
  }, [roster]);

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

  function generate() {
    const res = autoLineup({
      innings,
      players: roster,
      present,
    });
    setLineup(res.innings);
    setWarnings(res.warnings);
  }

  function clear() {
    setLineup(Array.from({ length: innings }, () => ({})));
    setWarnings([]);
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

  // For each inning, detect duplicates / missing positions
  const inningIssues = lineup.map((inn) => {
    const fillCount: Partial<Record<Slot, number>> = {};
    for (const slot of Object.values(inn) as Slot[]) {
      fillCount[slot] = (fillCount[slot] ?? 0) + 1;
    }
    const dupes = POSITIONS.filter((p) => (fillCount[p] ?? 0) > 1);
    const missing = POSITIONS.filter((p) => (fillCount[p] ?? 0) === 0);
    return { dupes, missing };
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={generate}>
          Auto-generate
        </button>
        <button type="button" className="btn-ghost" onClick={clear}>
          Clear
        </button>
        <div className="grow" />
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save lineup"}
        </button>
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
                    return (
                      <td key={i} className="border-b border-slate-100 px-1 py-1 text-center">
                        <select
                          aria-label={`Inning ${i + 1} for ${p.name}`}
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                          value={slot}
                          disabled={isAbsent || p.injured}
                          onChange={(e) => setSlot(p.id, i, e.target.value as Slot | "")}
                        >
                          <option value="">—</option>
                          {SLOTS.map((s) => {
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
        ★ preferred · dot ok · blank unrated · &ldquo;avoid&rdquo; positions are disabled. Absent players are dimmed.
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
