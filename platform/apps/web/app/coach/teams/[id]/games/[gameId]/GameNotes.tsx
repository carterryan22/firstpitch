"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface GameNoteDTO {
  id: string;
  gameId: string;
  playerId: string;
  authorUserId: string;
  playLabel?: string;
  inningIdx?: number;
  body: string;
  shareWithParents: boolean;
  shareWithPlayer: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface RosterEntry {
  id: string;
  name: string;
  jerseyNumber?: string;
}

interface Props {
  gameId: string;
  innings: number;
  roster: RosterEntry[];
  initialNotes: GameNoteDTO[];
}

export function GameNotes({ gameId, innings, roster, initialNotes }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<GameNoteDTO[]>(initialNotes);
  const [playerId, setPlayerId] = useState(roster[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [playLabel, setPlayLabel] = useState("");
  const [inningIdx, setInningIdx] = useState<string>("");
  const [shareParents, setShareParents] = useState(true);
  const [sharePlayer, setSharePlayer] = useState(false);
  const [busy, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const nameById = new Map(roster.map((r) => [r.id, r.name]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!playerId || !body.trim()) {
      setErr("Pick a player and write a note.");
      return;
    }
    const payload = {
      playerId,
      body,
      playLabel: playLabel || undefined,
      inningIdx: inningIdx === "" ? undefined : Number(inningIdx),
      shareWithParents: shareParents,
      shareWithPlayer: sharePlayer,
    };
    startTransition(async () => {
      const res = await fetch(`/api/games/${gameId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Failed to save note.");
        return;
      }
      const j = (await res.json()) as { note: GameNoteDTO };
      setNotes((prev) => [j.note, ...prev]);
      setBody("");
      setPlayLabel("");
      setInningIdx("");
      router.refresh();
    });
  }

  async function toggleShare(n: GameNoteDTO, field: "shareWithParents" | "shareWithPlayer") {
    const next = !n[field];
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, [field]: next } : x)));
    await fetch(`/api/game-notes/${n.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    router.refresh();
  }

  async function remove(n: GameNoteDTO) {
    if (!confirm("Delete this note?")) return;
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
    await fetch(`/api/game-notes/${n.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Player</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}{p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Inning (optional)</span>
            <select
              value={inningIdx}
              onChange={(e) => setInningIdx(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              <option value="">-</option>
              {Array.from({ length: innings }, (_, i) => (
                <option key={i} value={i}>
                  Inning {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-1">
            <span className="text-xs text-slate-600">Play label</span>
            <input
              type="text"
              value={playLabel}
              onChange={(e) => setPlayLabel(e.target.value)}
              placeholder='e.g. "Ground ball to SS"'
              className="rounded border border-slate-300 bg-white px-2 py-1"
              maxLength={120}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Note</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened, what to work on next."
            rows={3}
            className="rounded border border-slate-300 bg-white px-2 py-1"
            maxLength={2000}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={shareParents}
              onChange={(e) => setShareParents(e.target.checked)}
            />
            <span className="text-xs text-slate-700">Share with parents</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={sharePlayer}
              onChange={(e) => setSharePlayer(e.target.checked)}
            />
            <span className="text-xs text-slate-700">Share with player</span>
          </label>
          <div className="grow" />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save note"}
          </button>
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </form>

      <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
        {notes.length === 0 ? (
          <li className="px-3 py-4 text-sm text-slate-500">No notes yet for this game.</li>
        ) : (
          notes.map((n) => (
            <li key={n.id} className="space-y-1 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <strong className="text-slate-800">{nameById.get(n.playerId) ?? n.playerId}</strong>
                  {typeof n.inningIdx === "number" ? (
                    <span className="ml-2 text-xs text-slate-500">Inn {n.inningIdx + 1}</span>
                  ) : null}
                  {n.playLabel ? (
                    <span className="ml-2 text-xs text-slate-500">· {n.playLabel}</span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={n.shareWithParents}
                    onChange={() => toggleShare(n, "shareWithParents")}
                  />
                  <span className="text-slate-600">Parents</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={n.shareWithPlayer}
                    onChange={() => toggleShare(n, "shareWithPlayer")}
                  />
                  <span className="text-slate-600">Player</span>
                </label>
                <button
                  type="button"
                  className="ml-auto text-red-600 hover:underline"
                  onClick={() => remove(n)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-slate-500">
        Notes attach to the player record. Toggle sharing on/off any time. Parents see shared notes in the family dashboard; players see them in their account view.
      </p>
    </section>
  );
}
