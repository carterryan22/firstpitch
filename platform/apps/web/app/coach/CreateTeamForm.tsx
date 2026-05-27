"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AGE_BANDS: Array<"6-8" | "9-12" | "13-15" | "16+"> = ["6-8", "9-12", "13-15", "16+"];

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>("9-12");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, ageBand }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to create team");
      return;
    }
    const j = (await res.json()) as { team: { id: string } };
    router.push(`/coach/teams/${j.team.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
      <div>
        <label className="label" htmlFor="team-name">Team name</label>
        <input
          id="team-name"
          className="input"
          placeholder="Coast Diamondbacks 11U"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="team-age">Age band</label>
        <select
          id="team-age"
          className="input"
          value={ageBand}
          onChange={(e) => setAgeBand(e.target.value as (typeof AGE_BANDS)[number])}
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full">
          {busy ? "Creating…" : "Create team"}
        </button>
      </div>
      {err ? <p className="col-span-full text-sm text-danger">{err}</p> : null}
    </form>
  );
}
