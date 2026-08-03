"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gameSymptomTags, quickTagToneClass } from "../../../../../../lib/quickTags";

/**
 * Post-game symptom capture for Fix-Last-Game. The coach taps what went wrong;
 * each tap persists a game-scoped quick-tag (which also feeds Coach Memory's
 * recurring-mistakes roll-up). Removing a pill deletes the tag. The parent
 * server page recomputes the priorities + practice on refresh.
 */
export function FixLastGameSymptoms({
  teamId,
  gameId,
  current,
}: {
  teamId: string;
  gameId: string;
  current: Array<{ id: string; code: string; label: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const tags = gameSymptomTags();
  const currentCodes = new Set(current.map((c) => c.code));

  async function add(code: string) {
    setBusy(code);
    try {
      const res = await fetch(`/api/teams/${teamId}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, gameId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tap what went wrong
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = currentCodes.has(t.code);
            return (
              <button
                key={t.code}
                type="button"
                disabled={busy === t.code || on}
                onClick={() => add(t.code)}
                aria-label={`Symptom: ${t.label}`}
                className={`${quickTagToneClass(t.tone)} min-h-[40px] cursor-pointer border-0 px-3 text-xs disabled:cursor-default disabled:opacity-40`}
                title={t.priority || t.label}
              >
                {on ? "✓ " : "＋ "}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {current.length > 0 ? (
        <div>
          <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tagged this game
          </p>
          <div className="flex flex-wrap gap-1.5">
            {current.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              >
                {c.label}
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => remove(c.id)}
                  aria-label={`Remove ${c.label}`}
                  className="min-h-[24px] px-1 text-dirt-700 hover:text-red-600 disabled:opacity-40"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
