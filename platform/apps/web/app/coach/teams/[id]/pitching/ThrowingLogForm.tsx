"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlayerOption {
  id: string;
  name: string;
}

type Activity = "bullpen" | "long_toss" | "lesson" | "practice" | "game";

const ACTIVITY_LABELS: Record<Activity, string> = {
  bullpen: "Bullpen",
  long_toss: "Long toss",
  lesson: "Lesson",
  practice: "Practice throwing",
  game: "Game (another team)",
};

/**
 * Logs a non-game throwing exposure so the Pitch Load Passport reflects total
 * arm load — bullpens, long toss, private lessons, practice reps, innings
 * caught, and throwing for another team. Coach-facing; collapsed by default.
 */
export function ThrowingLogForm({ teamId, players }: { teamId: string; players: PlayerOption[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [activity, setActivity] = useState<Activity>("bullpen");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(25);
  const [catcherInnings, setCatcherInnings] = useState(0);
  const [intensity, setIntensity] = useState(7);
  const [external, setExternal] = useState(false);
  const [soreness, setSoreness] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const isPitchKind = activity === "bullpen" || activity === "game";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    const payload: Record<string, unknown> = {
      playerId,
      activity,
      date,
      catcherInnings: catcherInnings || undefined,
      external: external || activity === "game",
      soreness1to10: soreness || undefined,
      notes: notes || undefined,
    };
    if (isPitchKind) payload.pitches = amount;
    else {
      payload.throws = amount;
      payload.intensity = intensity;
    }

    const res = await fetch(`/api/teams/${teamId}/throwing-log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Could not log throwing.");
      return;
    }
    setOk(true);
    setNotes("");
    setSoreness(0);
    router.refresh();
  }

  if (players.length === 0) return null;

  return (
    <details className="rounded-none border-2 border-dirt-300 bg-cream/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        + Log throwing (bullpen, long toss, lesson, catching)
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tl-player">Player</label>
            <select id="tl-player" className="input" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tl-activity">Activity</label>
            <select
              id="tl-activity"
              className="input"
              value={activity}
              onChange={(e) => setActivity(e.target.value as Activity)}
            >
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
                <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="tl-amount">{isPitchKind ? "Pitches" : "Throws"}</label>
            <input
              id="tl-amount"
              type="number"
              min={0}
              max={isPitchKind ? 200 : 500}
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          {!isPitchKind ? (
            <div>
              <label className="label" htmlFor="tl-intensity">Intensity (1–10)</label>
              <input
                id="tl-intensity"
                type="number"
                min={1}
                max={10}
                className="input"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="tl-catch">Catcher innings</label>
            <input
              id="tl-catch"
              type="number"
              min={0}
              max={15}
              className="input"
              value={catcherInnings}
              onChange={(e) => setCatcherInnings(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="tl-date">Date</label>
            <input
              id="tl-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tl-sore">Soreness (1–10)</label>
            <input
              id="tl-sore"
              type="number"
              min={0}
              max={10}
              className="input"
              value={soreness}
              onChange={(e) => setSoreness(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} />
          Threw for another team / outside lesson
        </label>

        <div>
          <label className="label" htmlFor="tl-notes">Notes</label>
          <input id="tl-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {ok ? <p className="text-sm text-field-700">Logged. The passport is updated.</p> : null}
        <button type="submit" disabled={busy || !playerId} className="btn-primary">
          {busy ? "Logging…" : "Log throwing"}
        </button>
      </form>
    </details>
  );
}
