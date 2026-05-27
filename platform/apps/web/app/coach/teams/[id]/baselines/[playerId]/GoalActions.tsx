"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoalActions({ goalId, status }: { goalId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(next: "achieved" | "archived" | "active") {
    setBusy(true);
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this goal? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "achieved" ? (
        <button className="btn-ghost text-xs" disabled={busy} onClick={() => patch("achieved")}>
          Mark achieved
        </button>
      ) : (
        <button className="btn-ghost text-xs" disabled={busy} onClick={() => patch("active")}>
          Reopen
        </button>
      )}
      {status !== "archived" ? (
        <button className="btn-ghost text-xs" disabled={busy} onClick={() => patch("archived")}>
          Archive
        </button>
      ) : null}
      <button className="btn-ghost text-xs text-red-600" disabled={busy} onClick={remove}>
        Delete
      </button>
    </div>
  );
}
