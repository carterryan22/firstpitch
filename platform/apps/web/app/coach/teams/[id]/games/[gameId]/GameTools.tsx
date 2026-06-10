"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GameStatus = "scheduled" | "in_progress" | "completed";

export type GameToolsGame = {
  id: string;
  teamId: string;
  opponent: string;
  startsAt: string;
  venue?: string;
  homeAway: "home" | "away";
  innings: number;
  status: GameStatus;
  isScrimmage?: boolean;
  shareEnabled?: boolean;
};

/**
 * Game Tools dropdown (game-day-competitor §7.2.4 parity). Keeps advanced verbs out
 * of the primary UI: Revert to Draft, Complete Game, Game Stats, Edit Game
 * Details (modal — there is intentionally NO `/edit` route), Mark as Scrimmage,
 * Duplicate, Share Lineup, Print, Delete. Every action hits the existing
 * `/api/games/[id]` (PATCH/DELETE) or `/api/teams/[id]/games` (POST) endpoints.
 */
export function GameTools({ game }: { game: GameToolsGame }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const base = `/coach/teams/${game.teamId}/games/${game.id}`;
  const completed = game.status === "completed";

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy("duplicate");
    setErr(null);
    try {
      // Next week, same matchup — a sensible default the coach can adjust.
      const next = new Date(game.startsAt);
      next.setDate(next.getDate() + 7);
      const res = await fetch(`/api/teams/${game.teamId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent: game.opponent,
          startsAt: next.toISOString(),
          venue: game.venue,
          homeAway: game.homeAway,
          innings: game.innings,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { game?: { id: string }; error?: string };
      if (!res.ok || !data.game) throw new Error(data.error ?? "Could not duplicate");
      router.push(`/coach/teams/${game.teamId}/games/${data.game.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete the game vs ${game.opponent}? This cannot be undone.`)) return;
    setBusy("delete");
    setErr(null);
    try {
      const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Delete failed");
      router.push(`/coach/teams/${game.teamId}/games`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Tools ▾
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-60 border-2 border-dirt-300 bg-cream shadow-card"
        >
          {completed ? (
            <ToolItem label="Revert to Draft" hint="Re-open for editing" disabled={busy !== null}
              onClick={() => patch({ revertToDraft: true }, "revert")} />
          ) : (
            <ToolItem label="Complete Game" hint="Lock lineup, unlock stats" disabled={busy !== null}
              onClick={() => patch({ markCompleted: true }, "complete")} />
          )}

          <ToolLink href={`${base}?tab=stats`} label="Game Stats" hint="Enter / review box score" />

          <ToolItem label="Edit Game Details" hint="Opponent, date, venue, innings" disabled={busy !== null}
            onClick={() => { setOpen(false); setEditing(true); }} />

          <ToolItem label="Reset Lineup" hint="Clear field + batting order" disabled={busy !== null}
            onClick={() => {
              if (confirm("Clear the lineup and batting order for this game?")) patch({ resetLineup: true }, "reset");
            }} />

          <ToolItem
            label={game.isScrimmage ? "Unmark Scrimmage" : "Mark as Scrimmage"}
            hint={game.isScrimmage ? "Count toward stats again" : "Exclude from fairness / stats"}
            disabled={busy !== null}
            onClick={() => patch({ isScrimmage: !game.isScrimmage }, "scrimmage")}
          />

          <ToolLink href={`${base}?tab=summary`} label="Share Lineup" hint="Press Box read-only link" />
          <ToolLink href={`${base}/report`} label="Print" hint="Printable lineup sheet" />

          <ToolItem label="Duplicate" hint="Copy to next week" disabled={busy !== null}
            onClick={duplicate} />

          <div className="border-t border-dirt-300/40">
            <ToolItem label="Delete Game" hint="Permanent" danger disabled={busy !== null}
              onClick={remove} />
          </div>
        </div>
      ) : null}

      {err ? (
        <p className="absolute right-0 top-full mt-1 w-60 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {err}
        </p>
      ) : null}

      {editing ? (
        <EditGameModal
          game={game}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ToolItem({
  label,
  hint,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm no-underline transition hover:bg-dirt-100 disabled:opacity-50 ${
        danger ? "text-rose-700" : "text-slate-800"
      }`}
    >
      <span className="font-medium">{label}</span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </button>
  );
}

function ToolLink({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <a
      href={href}
      role="menuitem"
      className="block w-full px-3 py-2 text-left text-sm text-slate-800 no-underline transition hover:bg-dirt-100 hover:no-underline"
    >
      <span className="font-medium">{label}</span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </a>
  );
}

function EditGameModal({
  game,
  onClose,
  onSaved,
}: {
  game: GameToolsGame;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Convert ISO → value usable by <input type="datetime-local"> (local time, no Z).
  const initialLocal = (() => {
    const d = new Date(game.startsAt);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  })();

  const [opponent, setOpponent] = useState(game.opponent);
  const [startsAt, setStartsAt] = useState(initialLocal);
  const [venue, setVenue] = useState(game.venue ?? "");
  const [homeAway, setHomeAway] = useState<"home" | "away">(game.homeAway);
  const [innings, setInnings] = useState(game.innings);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent.trim()) {
      setErr("Opponent is required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent: opponent.trim(),
          startsAt: new Date(startsAt).toISOString(),
          venue: venue.trim(),
          homeAway,
          innings,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit game details"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="w-full max-w-md space-y-3 border-2 border-dirt-300 bg-cream p-5 shadow-card"
      >
        <h2 className="m-0 text-base font-semibold text-slate-900">Edit game details</h2>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Opponent</span>
          <input
            className="input mt-1 w-full"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            maxLength={80}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Home / Away</span>
            <select
              className="input mt-1 w-full"
              value={homeAway}
              onChange={(e) => setHomeAway(e.target.value as "home" | "away")}
            >
              <option value="home">Home (vs)</option>
              <option value="away">Away (@)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Innings</span>
            <input
              type="number"
              min={1}
              max={15}
              className="input mt-1 w-full"
              value={innings}
              onChange={(e) => setInnings(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Date &amp; time</span>
          <input
            type="datetime-local"
            className="input mt-1 w-full"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Venue</span>
          <input
            className="input mt-1 w-full"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={120}
            placeholder="Field / address (optional)"
          />
        </label>

        {err ? <p className="m-0 text-sm text-rose-700">{err}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
