"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  playerObservationTags,
  gameSymptomTags,
  quickTagToneClass,
  type QuickTagDef,
} from "../lib/quickTags";

/**
 * One-tap quick-tag entry. The coach taps a chip instead of typing a note, and
 * that observation becomes data behind Coach Memory + Fix-Last-Game.
 *
 * Used in three places: per-player on the roster + Coach Memory cards
 * (scope="player"), and per-game for post-game symptoms (scope="team").
 */
export function QuickTagAdder({
  teamId,
  playerId,
  gameId,
  scope = "player",
  buttonLabel = "＋ Tag",
}: {
  teamId: string;
  playerId?: string;
  gameId?: string;
  scope?: "player" | "team";
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const tags: QuickTagDef[] = scope === "team" ? gameSymptomTags() : playerObservationTags();

  async function add(code: string) {
    setBusy(code);
    try {
      const res = await fetch(`/api/teams/${teamId}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, playerId, gameId }),
      });
      if (res.ok) {
        setJustAdded(code);
        router.refresh();
        window.setTimeout(() => setJustAdded(null), 1600);
      }
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost min-h-[40px] text-xs"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded border border-slate-200 bg-white/60 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {scope === "team" ? "What went wrong?" : "Tag what you saw"}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[32px] px-2 text-xs text-slate-500 hover:text-slate-800"
          aria-label="Close tag picker"
        >
          Done
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const isBusy = busy === t.code;
          const added = justAdded === t.code;
          return (
            <button
              key={t.code}
              type="button"
              disabled={isBusy}
              onClick={() => add(t.code)}
              aria-label={`Tag: ${t.label}`}
              className={`${quickTagToneClass(t.tone)} min-h-[36px] cursor-pointer border-0 px-2.5 text-xs disabled:opacity-50 ${
                added ? "ring-2 ring-field-700" : ""
              }`}
              title={t.need || t.priority || t.label}
            >
              {added ? "✓ " : ""}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
