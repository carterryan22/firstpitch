"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Role = "parent" | "coach" | "player" | "umpire" | "other";

export function ReviewForm({
  slug,
  defaultName,
  defaultRole,
}: {
  slug: string;
  defaultName: string;
  defaultRole: Role;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState<Role>(defaultRole);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/fields/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorName: name, authorRole: role, rating, body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not save review.");
      }
      setBody("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="rv-name">Display name</label>
          <input id="rv-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="rv-role">You&apos;re a…</label>
          <select id="rv-role" className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="parent">Parent</option>
            <option value="coach">Coach</option>
            <option value="player">Player</option>
            <option value="umpire">Umpire</option>
            <option value="other">Just played here</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="rv-rating">Rating</label>
        <select id="rv-rating" className="input max-w-[10rem]" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}  ({n})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rv-body">The honest scoop</label>
        <textarea
          id="rv-body"
          className="input min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Fence dimensions, bathrooms, lights, dugout splinters, foul-ball hazards…"
          required
          minLength={10}
        />
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
