"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "coach" | "parent" | "player" | "clinician" | "admin";

const ROLES: Array<{ role: Role; title: string; description: string }> = [
  { role: "coach", title: "Coach", description: "Compile plans, manage roster, review safety gates." },
  { role: "parent", title: "Parent", description: "See today's home mission and your child's progress." },
  { role: "player", title: "Player", description: "Today's drills, missions, and personal bests." },
  { role: "clinician", title: "Clinician", description: "Review escalations, sign off on return-to-play." },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("coach");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role, name }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Sign-in failed");
      return;
    }
    router.push(role === "parent" ? "/parent" : role === "coach" ? "/coach" : "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1>Sign in</h1>
        <p className="mt-2 text-slate-600">
          Pick how you use the platform — the navigation and dashboards adjust to match.
        </p>
      </header>

      <fieldset className="space-y-3">
        <legend className="label">I am a&hellip;</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => {
            const active = role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-brand-700 bg-brand-50/60 ring-2 ring-brand-500/40"
                    : "border-slate-200 bg-white hover:border-brand-500/40"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{r.title}</span>
                  {active ? <span className="badge-info">Selected</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">{r.description}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@team.example"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="name">
            Display name
          </label>
          <input
            id="name"
            className="input"
            placeholder="Optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button type="submit" disabled={busy || !email} className="btn-primary w-full">
          {busy ? "Signing in…" : `Continue as ${role}`}
        </button>
        <p className="text-xs text-slate-500">
          By signing in you agree to safety-first practice guidance. We do not store medical data
          and we never publish player data without consent.
        </p>
      </form>
    </div>
  );
}

