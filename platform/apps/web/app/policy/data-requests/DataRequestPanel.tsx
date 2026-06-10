"use client";

import { useState } from "react";

export function DataRequestPanel({ signedIn }: { signedIn: boolean }) {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <div className="card space-y-2">
        <p className="m-0 text-ink/80">
          Sign in to export or delete your data instantly. You can also email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>{" "}
          and we&apos;ll verify your identity and handle it within 30 days.
        </p>
        <a href="/login?next=/policy/data-requests" className="btn-primary w-fit">Sign in</a>
      </div>
    );
  }

  async function requestDelete() {
    setErr(null);
    setMsg(null);
    if (confirm !== "DELETE") {
      setErr('Type DELETE (all caps) to confirm.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setErr(json.error ?? "Something went wrong.");
      } else {
        setMsg(json.message ?? "Deletion request received.");
      }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="m-0">Export your data</h2>
        <p className="m-0 text-ink/80">
          Download a JSON file of everything we hold for your account: your profile, the players
          you manage, teams, plans, goals, and metrics.
        </p>
        <a href="/api/account/export" className="btn-primary w-fit" download>
          Download my data
        </a>
      </div>

      <div className="card space-y-3 border-danger">
        <h2 className="m-0">Delete your account</h2>
        <p className="m-0 text-ink/80">
          This signs you out immediately and queues your data for deletion within 30 days. If you
          own a team with other coaches and families, we&apos;ll reach out to hand off ownership
          before removing shared records.
        </p>
        <label className="label" htmlFor="del-reason">Reason (optional)</label>
        <input
          id="del-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us why you're leaving (optional)"
          maxLength={500}
        />
        <label className="label" htmlFor="del-confirm">Type DELETE to confirm</label>
        <input
          id="del-confirm"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
        />
        <button
          onClick={requestDelete}
          disabled={busy || confirm !== "DELETE"}
          className="btn-dark w-fit"
        >
          {busy ? "Submitting…" : "Request deletion"}
        </button>
        {err && <p className="m-0 text-sm text-danger">{err}</p>}
        {msg && <p className="m-0 text-sm text-field-700">{msg}</p>}
      </div>
    </div>
  );
}
