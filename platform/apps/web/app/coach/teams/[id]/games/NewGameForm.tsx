"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewGameForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:30");
  const [venue, setVenue] = useState("");
  const [homeAway, setHomeAway] = useState<"home" | "away">("home");
  const [innings, setInnings] = useState(6);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const startsAt = new Date(`${date}T${time || "00:00"}`);
    if (Number.isNaN(startsAt.getTime())) {
      setBusy(false);
      setErr("Pick a valid date and time.");
      return;
    }
    const res = await fetch(`/api/teams/${teamId}/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        opponent,
        startsAt: startsAt.toISOString(),
        venue: venue || undefined,
        homeAway,
        innings,
        notes: notes || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to create game");
      return;
    }
    const data = (await res.json()) as { game?: { id: string } };
    if (data.game?.id) {
      router.push(`/coach/teams/${teamId}/games/${data.game.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="opp">Opponent</label>
        <input
          id="opp"
          className="input"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          required
          placeholder="Crosstown Rivals"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="time">Time</label>
          <input
            id="time"
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
        <div>
          <label className="label" htmlFor="venue">Venue</label>
          <input
            id="venue"
            className="input"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Field 3, Lions Park"
          />
        </div>
        <div>
          <label className="label" htmlFor="ha">Home/Away</label>
          <select id="ha" className="input" value={homeAway} onChange={(e) => setHomeAway(e.target.value as "home" | "away")}>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="innings">Innings</label>
          <input
            id="innings"
            type="number"
            min={1}
            max={15}
            className="input"
            value={innings}
            onChange={(e) => setInnings(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Creating…" : "Create game"}
      </button>
    </form>
  );
}
