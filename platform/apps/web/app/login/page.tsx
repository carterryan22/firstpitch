"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type Role = "coach" | "parent" | "player" | "admin";

interface RoleInfo {
  role: Role;
  title: string;
  description: string;
  unlocks: string[];
}

const ROLES: RoleInfo[] = [
  {
    role: "coach",
    title: "Coach",
    description: "Run the team.",
    unlocks: [
      "Save teams, baselines, and pitching history",
      "Compile safety-gated practice plans + share parent versions",
      "Auto-lineups with Pitch Smart enforcement",
    ],
  },
  {
    role: "parent",
    title: "Parent",
    description: "Stay in the loop.",
    unlocks: [
      "Today's home mission for your kid",
      "Save your favorite fields + booking history",
      "See your kid's progress without nagging the coach",
    ],
  },
  {
    role: "player",
    title: "Player",
    description: "Get better between practices.",
    unlocks: [
      "Daily missions + XP for streaks",
      "Triple Play baseball-IQ game",
      "Personal bests for your throws, swings, and times",
    ],
  },
];

const ERROR_COPY: Record<string, string> = {
  missing_token: "That magic link is missing its token. Request a new one.",
  invalid_or_expired:
    "That magic link is expired or already used. Request a new one. They're good for 15 minutes.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const incomingError = params.get("error");
  const nextPath = params.get("next") ?? undefined;

  const [role, setRole] = useState<Role>("coach");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(
    incomingError ? (ERROR_COPY[incomingError] ?? "Sign-in failed") : null,
  );
  const [sent, setSent] = useState<null | { email: string; devLink?: string; delivery?: string }>(null);

  const selectedRole = ROLES.find((r) => r.role === role);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role, name, redirectTo: nextPath }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        devLink?: string;
        delivery?: string;
      };
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "Couldn't send the magic link.");
        return;
      }
      setSent({ email, devLink: j.devLink, delivery: j.delivery });
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <header>
          <h1>Check your email</h1>
          <p className="mt-2 text-slate-600">
            We sent a magic link to <strong>{sent.email}</strong>. It expires in 15 minutes and can
            only be used once.
          </p>
        </header>
        <div className="card space-y-3">
          <p className="m-0 text-sm">
            Open it on the device you want to stay signed in on. We don&apos;t use passwords.
            Opening the link signs you in and sets a 7-day cookie.
          </p>
          {sent.devLink ? (
            <div className="rounded-md border-2 border-warn/40 bg-warn-soft/30 p-3 text-sm">
              <p className="m-0 font-semibold text-warn">Dev mode (no email provider configured)</p>
              <p className="mt-1 text-xs text-ink/80">
                Local email console mode is enabled, so we&apos;re showing the link inline. This mode
                is unavailable in production.
              </p>
              <p className="mt-2">
                <a className="btn-primary no-underline hover:no-underline" href={sent.devLink}>
                  Open magic link →
                </a>
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              setSent(null);
              setErr(null);
            }}
          >
            ← Wrong email? Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1>Sign in</h1>
        <p className="mt-2 text-slate-600">
          No passwords. Pick your role, drop your email, we&apos;ll send you a one-time magic link.
        </p>
      </header>

      <fieldset className="space-y-3">
        <legend id="role-legend" className="label">
          I am a&hellip;
        </legend>
        <div role="radiogroup" aria-labelledby="role-legend" className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => {
            const active = role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r.role)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-brand-700 bg-brand-50/60 ring-2 ring-brand-500/40"
                    : "border-slate-200 bg-white hover:border-brand-500/40"
                }`}
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
        {selectedRole ? (
          <div className="card border-brand-500/40 bg-brand-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Signing in as a {selectedRole.title.toLowerCase()} unlocks
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              {selectedRole.unlocks.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </fieldset>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
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
            autoComplete="name"
            placeholder="Optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button type="submit" disabled={busy || !email} className="btn-primary w-full">
          {busy ? "Sending link…" : "Email me a magic link"}
        </button>
        <p className="text-xs text-slate-600">
          Links expire in 15 minutes. By signing in you agree to safety-first practice guidance. We
          don&apos;t store medical data and we never publish player data without consent.
        </p>
      </form>
    </div>
  );
}
