"use client";

import { useState } from "react";

export function PublicSharingSettings({ teamId, initialEnabled }: { teamId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: boolean) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/teams/${teamId}/settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicPageEnabled: next }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not update public sharing");
      return;
    }
    setEnabled(next);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="m-0 text-sm font-medium text-slate-800">Public team page</p>
        <p className="mt-1 text-xs text-slate-500">
          Private by default. Publishing shows team-level schedule details, never an unconsented roster.
        </p>
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
      <button
        type="button"
        className={enabled ? "btn-ghost" : "btn-primary"}
        disabled={busy}
        onClick={() => update(!enabled)}
      >
        {busy ? "Saving…" : enabled ? "Make private" : "Publish page"}
      </button>
    </div>
  );
}
