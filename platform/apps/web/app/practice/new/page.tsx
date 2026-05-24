"use client";
import { useState } from "react";

export default function NewPracticePage() {
  const [age, setAge] = useState(11);
  const [duration, setDuration] = useState(60);
  const [focus, setFocus] = useState("throwing,speed,reaction");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        age,
        durationMin: duration,
        environmentTier: "T1_field",
        equipmentAvailable: ["tee", "5 baseballs", "cone", "stopwatch", "open space", "partner", "reaction ball"],
        coaches: 1,
        players: 8,
        focus: focus.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <h1>Compile a practice plan</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <label>
          Age <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={6} max={18} />
        </label>
        <label>
          Duration (min){" "}
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} max={180} />
        </label>
        <label>
          Focus (comma-separated){" "}
          <input value={focus} onChange={(e) => setFocus(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Compiling…" : "Compile"}</button>
      </form>
      {result ? (
        <pre style={{ marginTop: 24, padding: 16, background: "white", border: "1px solid #e5e5e5", overflow: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
