"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Purpose = "practice" | "game" | "scrimmage" | "clinic" | "other";
type AgeGroup = "6U" | "8U" | "10U" | "12U" | "14U" | "16U" | "18U" | "adult";

const AGE_GROUPS: AgeGroup[] = ["6U", "8U", "10U", "12U", "14U", "16U", "18U", "adult"];

export function BookForm({ slug, defaultName }: { slug: string; defaultName: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(today);
  const [backupDate, setBackupDate] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [durationMin, setDurationMin] = useState(90);
  const [purpose, setPurpose] = useState<Purpose>("practice");
  const [teamOrLeague, setTeamOrLeague] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("10U");
  const [insuranceReady, setInsuranceReady] = useState<"yes" | "no" | "unsure">("unsure");
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
        body: JSON.stringify({
          requestedByName: name,
          date,
          startTime,
          durationMin,
          purpose,
          notes,
          teamOrLeague: teamOrLeague || undefined,
          ageGroup,
          insuranceReady: insuranceReady === "yes" ? true : insuranceReady === "no" ? false : undefined,
          backupDate: backupDate || undefined,
        }),
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
        <h3 className="m-0">Request received.</h3>
        <p className="mt-2 text-sm">
          We&apos;ll dig up the official booking link or contact for this field and email it to you
          within a couple of business days. Your request lives in{" "}
          <a href="/favorites" className="underline">your saved fields</a> in the meantime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-4">
      <div>
        <label className="label" htmlFor="bk-name">Your name</label>
        <input id="bk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="label" htmlFor="bk-team">Team or league</label>
        <input
          id="bk-team"
          className="input"
          placeholder="e.g. Bellevue Little League 11U Bombers"
          value={teamOrLeague}
          onChange={(e) => setTeamOrLeague(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink/60">Field owners triage by org. Helps us route faster.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bk-age">Age group</label>
          <select
            id="bk-age"
            className="input"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
          >
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/60">Drives diamond size + safety rules.</p>
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
        <label className="label" htmlFor="bk-backup">Backup date (optional)</label>
        <input
          id="bk-backup"
          type="date"
          className="input"
          value={backupDate}
          onChange={(e) => setBackupDate(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink/60">
          Cuts dead ends in half. If your first pick is taken, we try the backup.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">Insurance lined up?</legend>
        <p className="text-xs text-ink/60">
          Most schools and cities require proof of liability insurance before they confirm a slot.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {([
            ["yes", "Yes, ready to upload"],
            ["no", "Not yet"],
            ["unsure", "Not sure"],
          ] as const).map(([val, label]) => {
            const active = insuranceReady === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setInsuranceReady(val)}
                className={`rounded-none border-2 px-3 py-2 text-sm ${
                  active ? "border-ink bg-ink text-cream" : "border-ink/30 bg-cream text-ink hover:border-ink"
                }`}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="bk-notes">Notes (optional)</label>
        <textarea id="bk-notes" className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Expected attendance, equipment needs, anything the field owner should know…" />
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "⚾ Send request"}
      </button>
    </form>
  );
}
