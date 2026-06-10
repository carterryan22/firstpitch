"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RosterPlayer {
  id: string;
  name: string;
}

export function AddMemberForm({ teamId, players = [] }: { teamId: string; players?: RosterPlayer[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"player" | "parent" | "coach">("player");
  const [playerId, setPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const linksToPlayer = role === "player" || role === "parent";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        playerId: linksToPlayer && playerId ? playerId : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to add member");
      return;
    }
    setEmail("");
    setName("");
    setPlayerId("");
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
      {linksToPlayer && players.length > 0 ? (
        <div className="col-span-full">
          <label className="label" htmlFor="m-player">
            {role === "parent" ? "Link to child (optional)" : "Link to roster player (optional)"}
          </label>
          <select
            id="m-player"
            className="input"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">No link</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {role === "parent"
              ? "Links this parent to their child so the child shows up on their family dashboard."
              : "Links this account to a roster player so they can complete coach-assigned missions."}
          </p>
        </div>
      ) : null}
      {err ? <p className="col-span-full text-sm text-danger">{err}</p> : null}
    </form>
  );
}
