"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Purpose = "practice" | "game" | "scrimmage" | "clinic" | "other";

export function BookForm({ slug, defaultName }: { slug: string; defaultName: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("17:00");
  const [durationMin, setDurationMin] = useState(90);
  const [purpose, setPurpose] = useState<Purpose>("practice");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/fields/${encodeURIComponent(slug)}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedByName: name, date, startTime, durationMin, purpose, notes }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not submit request.");
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card max-w-xl">
        <h3 className="m-0">Request sent.</h3>
        <p className="mt-2 text-sm">We&apos;ll email you when the field manager responds. In the meantime, your request lives in <a href="/favorites" className="underline">your saved fields</a>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-3">
      <div>
        <label className="label" htmlFor="bk-name">Your name</label>
        <input id="bk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="bk-date">Date</label>
          <input id="bk-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="bk-time">Start time</label>
          <input id="bk-time" type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="bk-dur">Duration</label>
          <select id="bk-dur" className="input" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
            {[60, 75, 90, 105, 120, 150, 180].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bk-purpose">Purpose</label>
        <select id="bk-purpose" className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
          <option value="practice">Practice</option>
          <option value="game">Game</option>
          <option value="scrimmage">Scrimmage</option>
          <option value="clinic">Clinic / camp</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="bk-notes">Notes (optional)</label>
        <textarea id="bk-notes" className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Age group, expected attendance, equipment needs…" />
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "⚾ Send booking request"}
      </button>
    </form>
  );
}
