"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POSITIONS, type Position, type PositionRating, type Bats, type Throws } from "@platform/storage/types";

const RATINGS: Array<{ value: PositionRating | ""; label: string; color: string }> = [
  { value: "", label: "—", color: "bg-slate-50 text-slate-400" },
  { value: "preferred", label: "Pref", color: "bg-teal-600 text-white" },
  { value: "ok", label: "OK", color: "bg-amber-100 text-amber-900" },
  { value: "avoid", label: "Avoid", color: "bg-slate-200 text-slate-600" },
];

export interface PlayerFormValues {
  firstName: string;
  lastName: string;
  jerseyNumber?: string;
  dob?: string;
  bats?: Bats;
  throws?: Throws;
  gender?: "M" | "F" | "X";
  /** 1–5 scale; undefined = not rated. */
  battingSkill?: 1 | 2 | 3 | 4 | 5;
  canPitch: boolean;
  canCatch: boolean;
  injured: boolean;
  injuryNote?: string;
  positionRatings: Partial<Record<Position, PositionRating>>;
  notes?: string;
  parentEmail?: string;
}

export function PlayerForm({
  initial,
  teamId,
  playerId,
  showParentEmail,
}: {
  initial?: Partial<PlayerFormValues>;
  /** When creating, target POST /api/teams/{teamId}/players */
  teamId?: string;
  /** When editing, target PATCH /api/players/{playerId} */
  playerId?: string;
  showParentEmail?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<PlayerFormValues>({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    jerseyNumber: initial?.jerseyNumber,
    dob: initial?.dob,
    bats: initial?.bats,
    throws: initial?.throws,
    gender: initial?.gender,
    battingSkill: initial?.battingSkill,
    canPitch: initial?.canPitch ?? false,
    canCatch: initial?.canCatch ?? false,
    injured: initial?.injured ?? false,
    injuryNote: initial?.injuryNote,
    positionRatings: initial?.positionRatings ?? {},
    notes: initial?.notes,
    parentEmail: initial?.parentEmail,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof PlayerFormValues>(k: K, val: PlayerFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function setRating(pos: Position, rating: PositionRating | "") {
    setV((prev) => {
      const next = { ...prev.positionRatings };
      if (rating === "") delete next[pos];
      else next[pos] = rating;
      return { ...prev, positionRatings: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const url = playerId ? `/api/players/${playerId}` : `/api/teams/${teamId}/players`;
    const method = playerId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(v),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Save failed");
      return;
    }
    const data = (await res.json()) as { player?: { id: string; teamId?: string } };
    const tid = data.player?.teamId ?? teamId;
    if (data.player?.id && tid) {
      router.push(`/coach/teams/${tid}/roster/${data.player.id}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function archive() {
    if (!playerId) return;
    if (!confirm("Archive this player? They will be hidden from the active roster.")) return;
    setBusy(true);
    const res = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    setBusy(false);
    if (res.ok && teamId) {
      router.push(`/coach/teams/${teamId}/roster`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[100px_1fr_1fr]">
        <div>
          <label className="label" htmlFor="jersey">#</label>
          <input
            id="jersey"
            className="input"
            value={v.jerseyNumber ?? ""}
            onChange={(e) => set("jerseyNumber", e.target.value)}
            placeholder="00"
          />
        </div>
        <div>
          <label className="label" htmlFor="first">First name</label>
          <input
            id="first"
            className="input"
            value={v.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="last">Last name</label>
          <input
            id="last"
            className="input"
            value={v.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="dob">Date of birth</label>
          <input
            id="dob"
            type="date"
            className="input"
            value={v.dob ?? ""}
            onChange={(e) => set("dob", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bats">Bats</label>
          <select
            id="bats"
            className="input"
            value={v.bats ?? ""}
            onChange={(e) => set("bats", (e.target.value || undefined) as Bats | undefined)}
          >
            <option value="">—</option>
            <option value="L">L</option>
            <option value="R">R</option>
            <option value="S">S</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="throws">Throws</label>
          <select
            id="throws"
            className="input"
            value={v.throws ?? ""}
            onChange={(e) => set("throws", (e.target.value || undefined) as Throws | undefined)}
          >
            <option value="">—</option>
            <option value="L">L</option>
            <option value="R">R</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="input"
            value={v.gender ?? ""}
            onChange={(e) =>
              set(
                "gender",
                (e.target.value || undefined) as "M" | "F" | "X" | undefined,
              )
            }
          >
            <option value="">—</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="X">Non-binary / prefer not</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Used by co-ed leagues that enforce gender-alternating batting orders.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="battingSkill">Batting skill (1–5)</label>
          <div className="flex items-center gap-2">
            <input
              id="battingSkill"
              type="range"
              min={1}
              max={5}
              step={1}
              value={v.battingSkill ?? 3}
              onChange={(e) =>
                set("battingSkill", Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
              }
              className="w-full accent-teal-600"
            />
            <span className="w-6 text-right tabular-nums text-sm text-slate-700">
              {v.battingSkill ?? 3}
            </span>
            <button
              type="button"
              className="text-xs text-slate-500 underline-offset-2 hover:underline"
              onClick={() => set("battingSkill", undefined)}
            >
              clear
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Feeds the auto-lineup engine. 3 is the neutral default; higher = better hitter.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="label mb-1">Capabilities</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={v.canPitch} onChange={(e) => set("canPitch", e.target.checked)} />
            Can pitch
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={v.canCatch} onChange={(e) => set("canCatch", e.target.checked)} />
            Can catch
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={v.injured} onChange={(e) => set("injured", e.target.checked)} />
            Injured
          </label>
        </div>
        {v.injured ? (
          <input
            className="input mt-2"
            placeholder="Injury note (visible to coaches only)"
            value={v.injuryNote ?? ""}
            onChange={(e) => set("injuryNote", e.target.value)}
          />
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="label mb-2">Position ratings</legend>
        <p className="mb-2 text-xs text-slate-500">
          Drives the auto-lineup engine. Preferred = first choice. Avoid = never.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="px-2 py-1 text-left">Position</th>
                {RATINGS.map((r) => (
                  <th key={r.label} className="px-2 py-1 text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((pos) => (
                <tr key={pos} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-medium text-slate-700">{pos}</td>
                  {RATINGS.map((r) => {
                    const current = (v.positionRatings[pos] as PositionRating | undefined) ?? "";
                    const active = current === r.value;
                    return (
                      <td key={r.label} className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => setRating(pos, r.value)}
                          className={`rounded px-2 py-1 ${active ? r.color : "border border-slate-200 text-slate-400 hover:border-slate-400"}`}
                        >
                          {r.label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      {showParentEmail ? (
        <div>
          <label className="label" htmlFor="parent">Parent email (optional)</label>
          <input
            id="parent"
            type="email"
            className="input"
            value={v.parentEmail ?? ""}
            onChange={(e) => set("parentEmail", e.target.value)}
            placeholder="parent@example.com"
          />
          <p className="mt-1 text-xs text-slate-500">
            Adds the parent to the team and links them to this player.
          </p>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          className="input min-h-[80px]"
          value={v.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : playerId ? "Save changes" : "Add player"}
        </button>
        {playerId ? (
          <button type="button" onClick={archive} disabled={busy} className="btn-ghost text-red-600">
            Archive
          </button>
        ) : null}
      </div>
    </form>
  );
}
