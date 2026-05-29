"use client";
import { useState } from "react";

export function AssignSuggestedButton({
  teamId,
  missionId,
  planId,
  className,
}: {
  teamId: string;
  missionId: string;
  planId?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [count, setCount] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  async function assign() {
    setState("busy");
    setErr(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/missions/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId, all: true, planId }),
      });
      const j = (await res.json()) as { ok?: boolean; assignments?: unknown[]; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Assign failed");
      setCount(j.assignments?.length ?? 0);
      setState("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assign failed");
      setState("err");
    }
  }

  if (state === "done") {
    return (
      <span className={className ?? "text-xs text-grass"}>
        ✓ Assigned to {count} player{count === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={assign}
        disabled={state === "busy"}
        className={className ?? "btn-primary text-xs"}
      >
        {state === "busy" ? "Assigning…" : "Assign to team"}
      </button>
      {err ? <span className="ml-2 text-xs text-red-700">{err}</span> : null}
    </>
  );
}
