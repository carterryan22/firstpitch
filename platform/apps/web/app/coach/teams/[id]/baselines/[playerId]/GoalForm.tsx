"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { METRICS, type MetricKey } from "../../../../../lib/metrics";

type LatestMap = Record<string, number | undefined>;

export function GoalForm({
  playerId,
  latestByMetric,
}: {
  playerId: string;
  latestByMetric: LatestMap;
}) {
  const router = useRouter();
  const goalable = useMemo(() => METRICS.filter((m) => m.cls !== "guardrail"), []);
  const [metricKey, setMetricKey] = useState<MetricKey>(goalable[0]!.key);
  const [type, setType] = useState<"delta" | "absolute">("delta");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const def = goalable.find((m) => m.key === metricKey)!;
  const baseline = latestByMetric[metricKey];
  const baselineDisplay = baseline ?? "-";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum)) {
      setBusy(false);
      setErr("Enter a numeric target.");
      return;
    }
    if (baseline === undefined) {
      setBusy(false);
      setErr("Record at least one entry for this metric before setting a goal.");
      return;
    }
    const res = await fetch(`/api/players/${playerId}/goals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metricKey,
        type,
        target: targetNum,
        baseline,
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to create goal");
      return;
    }
    setTarget("");
    setNotes("");
    setTargetDate("");
    router.refresh();
  }

  const helperText =
    type === "delta"
      ? def.lowerIsBetter
        ? `e.g. -0.2 means improve from ${baselineDisplay} ${def.unit} to ${
            typeof baseline === "number" ? (baseline - 0.2).toFixed(2) : "-"
          } ${def.unit}`
        : `e.g. +3 means improve from ${baselineDisplay} ${def.unit} to ${
            typeof baseline === "number" ? baseline + 3 : "-"
          } ${def.unit}`
      : `Absolute target value in ${def.unit}`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_150px_160px]">
        <div>
          <label className="label" htmlFor="g-metric">Metric</label>
          <select
            id="g-metric"
            className="input"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          >
            {goalable.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g-type">Goal type</label>
          <select
            id="g-type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as "delta" | "absolute")}
          >
            <option value="delta">Delta</option>
            <option value="absolute">Absolute</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g-target">
            Target ({type === "delta" ? `Δ ${def.unit}` : def.unit})
          </label>
          <input
            id="g-target"
            type="number"
            step="0.01"
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="g-date">Target date</label>
          <input
            id="g-date"
            type="date"
            className="input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="g-notes">Notes</label>
        <input
          id="g-notes"
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What the player will work on to hit this"
        />
      </div>
      <p className="text-xs text-slate-500">
        Baseline (latest recorded {def.label}): <span className="font-mono">{baselineDisplay}</span>{" "}
        {def.unit}. {helperText}
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create goal"}
      </button>
    </form>
  );
}
