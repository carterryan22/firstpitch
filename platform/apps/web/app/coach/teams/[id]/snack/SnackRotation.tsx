"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../../components/ui";

interface Volunteer {
  id: string;
  name: string;
}

interface SnackGame {
  id: string;
  opponent: string;
  homeAway?: "home" | "away";
  startsAt: string;
  snackDuty: { volunteerId?: string; name: string } | null;
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function SnackRotation({
  teamId,
  games,
  volunteers,
}: {
  teamId: string;
  games: SnackGame[];
  volunteers: Volunteer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of games) {
      const vid = g.snackDuty?.volunteerId;
      if (vid) c[vid] = (c[vid] ?? 0) + 1;
    }
    return c;
  }, [games]);

  async function autoBalance() {
    setError(null);
    const res = await fetch(`/api/teams/${teamId}/snack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepExisting: false }),
    });
    if (!res.ok) {
      setError("Could not build a rotation. Please try again.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function setGameDuty(gameId: string, volunteerId: string) {
    setError(null);
    setBusyGameId(gameId);
    const v = volunteers.find((x) => x.id === volunteerId);
    const res = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        snackDuty: v ? { volunteerId: v.id, name: v.name } : null,
      }),
    });
    setBusyGameId(null);
    if (!res.ok) {
      setError("Could not save that assignment.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg">Rotation</h2>
            <p className="m-0 mt-1 text-sm text-slate-600">
              {games.length} upcoming {games.length === 1 ? "game" : "games"} ·{" "}
              {volunteers.length} {volunteers.length === 1 ? "family" : "families"}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={autoBalance}
            disabled={pending || games.length === 0}
          >
            {pending ? "Balancing…" : "Auto-balance rotation"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {games.length === 0 ? (
        <Card>
          <p className="m-0 text-sm text-slate-600">No upcoming games to assign.</p>
        </Card>
      ) : (
        <Card>
          <ul className="m-0 list-none space-y-2 p-0">
            {games.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dirt-300/40 pb-2 last:border-b-0 last:pb-0"
              >
                <div className="min-w-[10rem]">
                  <p className="m-0 font-semibold">
                    {g.homeAway === "away" ? "@ " : "vs "}
                    {g.opponent}
                  </p>
                  <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
                    {whenLabel(g.startsAt)}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Snack duty</span>
                  <select
                    className="input"
                    value={g.snackDuty?.volunteerId ?? ""}
                    disabled={busyGameId === g.id}
                    onChange={(e) => setGameDuty(g.id, e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {volunteers.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {counts[v.id] ? ` (${counts[v.id]})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
