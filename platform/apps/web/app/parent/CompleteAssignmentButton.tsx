"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteAssignmentButton({
  assignmentId,
  className,
}: {
  assignmentId: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function done() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/missions/assignments/${assignmentId}/complete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={done}
        disabled={busy}
        className={className ?? "btn-primary"}
      >
        {busy ? "…" : "Mark done"}
      </button>
      {err ? <span className="ml-2 text-xs text-red-700">{err}</span> : null}
    </>
  );
}
