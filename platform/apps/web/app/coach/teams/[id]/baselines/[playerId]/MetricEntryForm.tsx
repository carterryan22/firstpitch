"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { METRICS, type MetricKey } from "../../../../../lib/metrics";

const VERIFICATIONS: Array<{ key: string; label: string }> = [
  { key: "self_entered", label: "Self-entered" },
  { key: "video_attached", label: "With video" },
  { key: "device_captured", label: "Device captured" },
  { key: "coach_verified", label: "Coach verified" },
  { key: "facility_verified", label: "Facility verified" },
  { key: "event_verified", label: "Event verified" },
];

export function MetricEntryForm({
  playerId,
  defaultMetric,
}: {
  playerId: string;
  defaultMetric?: MetricKey;
}) {
  const router = useRouter();
  const [metricKey, setMetricKey] = useState<MetricKey>(defaultMetric ?? "exit_velo_tee");
  const [value, setValue] = useState("");
  const [verificationState, setVerificationState] = useState("self_entered");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const def = METRICS.find((m) => m.key === metricKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const v = Number(value);
    if (!Number.isFinite(v)) {
      setBusy(false);
      setErr("Enter a numeric value.");
      return;
    }
    const res = await fetch(`/api/players/${playerId}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metricKey, value: v, verificationState, notes: notes || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to record");
      return;
    }
    setValue("");
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_180px]">
        <div>
          <label className="label" htmlFor="metric">Metric</label>
          <select
            id="metric"
            className="input"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="value">Value ({def?.unit})</label>
          <input
            id="value"
            className="input"
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="verif">Verification</label>
          <select
            id="verif"
            className="input"
            value={verificationState}
            onChange={(e) => setVerificationState(e.target.value)}
          >
            {VERIFICATIONS.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <input
          id="notes"
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. top 3 average of 5 swings"
        />
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Record entry"}
      </button>
    </form>
  );
}
