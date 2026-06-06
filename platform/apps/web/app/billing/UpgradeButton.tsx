"use client";

import { useState } from "react";
import type { Plan } from "../lib/billing";

export function UpgradeButton({ plan, signedIn }: { plan: Plan; signedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (plan.id === "free") {
    return <span className="badge-ok">Included</span>;
  }

  async function start() {
    setErr(null);
    if (!signedIn) {
      window.location.href = "/login?next=/billing";
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      setErr(json.message ?? "Checkout isn't available yet.");
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button onClick={start} disabled={busy} className={plan.highlight ? "btn-primary w-full" : "btn-ghost w-full"}>
        {busy ? "Starting…" : `Choose ${plan.name}`}
      </button>
      {err && <p className="m-0 text-xs text-danger">{err}</p>}
    </div>
  );
}
