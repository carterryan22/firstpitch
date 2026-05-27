"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"player" | "parent" | "coach">("player");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to add member");
      return;
    }
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto]">
      <div>
        <label className="label" htmlFor="m-email">Email</label>
        <input
          id="m-email"
          type="email"
          className="input"
          placeholder="parent@home.example"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="m-name">Name (optional)</label>
        <input
          id="m-name"
          className="input"
          placeholder="Sam Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="m-role">Role</label>
        <select
          id="m-role"
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          <option value="player">Player</option>
          <option value="parent">Parent</option>
          <option value="coach">Coach</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={busy || !email.trim()} className="btn-primary w-full">
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {err ? <p className="col-span-full text-sm text-danger">{err}</p> : null}
    </form>
  );
}
