"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "yes" | "no" | "maybe";

export function RsvpButtons({
  kind,
  id,
  playerId,
  initial,
}: {
  kind: "game" | "practice";
  id: string;
  playerId: string;
  initial?: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | undefined>(initial);
  const [err, setErr] = useState<string | null>(null);

  function send(next: Status) {
    setErr(null);
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id, playerId, status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  const cls = (s: Status) =>
    status === s
      ? "rounded-full bg-teal-700 px-3 py-0.5 text-xs font-semibold text-white"
      : "rounded-full border border-slate-300 px-3 py-0.5 text-xs font-semibold text-slate-600 hover:border-teal-500";

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <button type="button" disabled={pending} className={cls("yes")} onClick={() => send("yes")}>
        Going
      </button>
      <button type="button" disabled={pending} className={cls("maybe")} onClick={() => send("maybe")}>
        Maybe
      </button>
      <button type="button" disabled={pending} className={cls("no")} onClick={() => send("no")}>
        Can't
      </button>
      {err ? <span className="ml-1 text-red-600">{err}</span> : null}
    </div>
  );
}
