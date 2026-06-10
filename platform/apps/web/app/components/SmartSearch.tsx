"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Intent {
  kind: string;
  confidence: "high" | "medium" | "low";
  summary: string;
  action: { label: string; href: string };
}

const EXAMPLES = [
  "60 min practice plan for u-10 select",
  "infield drills for the cage",
  "build a fair lineup for my team",
  "how many pitches can an 11 year old throw?",
];

export function SmartSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(q: string) {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    setIntent(null);
    try {
      const r = await fetch("/api/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { intent: Intent };
      setIntent(j.intent);
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-4">
      <div className="space-y-1">
        <p className="eyebrow">Just tell us what you need</p>
        <h2 className="m-0">Search in plain English</h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="smart-search" className="sr-only">
          Describe what you need
        </label>
        <input
          id="smart-search"
          className="input flex-1"
          placeholder="e.g. I need a 60 min practice plan for u-10 select baseball"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="btn-primary min-h-[44px]" disabled={busy}>
          {busy ? "Reading…" : "Go"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="badge min-h-[32px] cursor-pointer hover:bg-ink hover:text-cream"
            onClick={() => {
              setQuery(ex);
              void run(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {err ? <p className="text-sm text-danger">{err}</p> : null}

      {intent ? (
        <div className="border-2 border-ink/15 bg-cream/60 p-4 space-y-3">
          <p className="m-0 text-sm">{intent.summary}</p>
          {intent.kind === "unknown" ? (
            <p className="m-0 text-xs uppercase tracking-wide text-ink/60">
              Not sure what you meant. Here&apos;s a place to start.
            </p>
          ) : null}
          <button
            type="button"
            className="btn-dark min-h-[44px]"
            onClick={() => router.push(intent.action.href)}
          >
            {intent.action.label} →
          </button>
        </div>
      ) : null}
    </section>
  );
}
