"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { battingRoleFor } from "../../../../../lib/roles";

type Player = { id: string; name: string; jerseyNumber?: string };

export function BattingOrder({
  gameId,
  roster,
  initial,
}: {
  gameId: string;
  roster: Player[];
  initial: string[];
}) {
  const rosterById = new Map(roster.map((p) => [p.id, p]));
  // Order = persisted order first, then anyone else from roster appended at the end.
  const initialOrder = [
    ...initial.filter((id) => rosterById.has(id)),
    ...roster.map((p) => p.id).filter((id) => !initial.includes(id)),
  ];
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setOrder(initialOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.join("|"), roster.map((r) => r.id).join("|")]);

  function move(idx: number, delta: number) {
    const next = order.slice();
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    const tmp = next[idx]!;
    next[idx] = next[target]!;
    next[target] = tmp;
    setOrder(next);
  }

  function autoBuild() {
    // Default heuristic: keep current order — coach intent.
    // For "starting" lineup ordering we move bench/absent players to the end
    // by sorting by jersey number if present.
    const sorted = order.slice().sort((a, b) => {
      const ja = rosterById.get(a)?.jerseyNumber ?? "";
      const jb = rosterById.get(b)?.jerseyNumber ?? "";
      if (ja && jb) return Number(ja) - Number(jb) || ja.localeCompare(jb);
      if (ja) return -1;
      if (jb) return 1;
      return 0;
    });
    setOrder(sorted);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ battingOrder: order }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to save");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <section className="card mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-sm uppercase tracking-wide text-slate-500">Batting order</h2>
        <div className="flex items-center gap-2">
          <Link href="/learn/roles#batting" className="text-xs text-slate-500 underline-offset-2 hover:underline" target="_blank">
            What’s my role?
          </Link>
          <button type="button" className="btn-ghost text-xs" onClick={autoBuild}>
            Sort by jersey #
          </button>
          <button type="button" className="btn-primary text-xs" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      {savedAt ? <p className="mt-2 text-xs text-slate-500">Saved at {savedAt}</p> : null}
      <ol className="mt-3 divide-y divide-slate-100">
        {order.map((pid, i) => {
          const p = rosterById.get(pid);
          if (!p) return null;
          const role = battingRoleFor(i + 1);
          return (
            <li key={pid} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-6 text-right font-mono text-xs text-slate-400">{i + 1}.</span>
              {role ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  title={role.tagline}
                >
                  <span aria-hidden>{role.emoji}</span>
                  <span className="font-medium">{role.name}</span>
                </span>
              ) : null}
              <span className="flex-1 text-slate-800">
                {p.name}
                {p.jerseyNumber ? <span className="ml-2 font-mono text-xs text-slate-400">#{p.jerseyNumber}</span> : null}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50 disabled:opacity-40"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${p.name} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50 disabled:opacity-40"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${p.name} down`}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
