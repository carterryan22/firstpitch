"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PlayerGameStatsRecord,
  PlayerGameBattingStats,
  PlayerGamePitchingStats,
} from "@platform/storage";

type RosterLite = {
  id: string;
  name: string;
  jerseyNumber?: string;
};

type ImportResponse = {
  kind: string;
  upsertedCount: number;
  unmatchedCount: number;
  warnings: string[];
  upserted: PlayerGameStatsRecord[];
};

// ── Manual edit form ──────────────────────────────────────────────────────

type BattingDraft = Partial<Record<keyof PlayerGameBattingStats, string>>;
type PitchingDraft = Partial<Record<keyof PlayerGamePitchingStats, string>>;

const BATTING_FIELDS: Array<[keyof PlayerGameBattingStats, string]> = [
  ["pa", "PA"], ["ab", "AB"], ["h", "H"], ["1b", "1B"], ["2b", "2B"],
  ["3b", "3B"], ["hr", "HR"], ["r", "R"], ["rbi", "RBI"], ["bb", "BB"],
  ["so", "SO"], ["hbp", "HBP"], ["sb", "SB"], ["cs", "CS"],
];
const PITCHING_FIELDS: Array<[keyof PlayerGamePitchingStats, string]> = [
  ["ip", "IP"], ["bf", "BF"], ["pitches", "#P"], ["h", "H"], ["r", "R"],
  ["er", "ER"], ["bb", "BB"], ["so", "SO"], ["hbp", "HBP"], ["wp", "WP"],
];

function toDraft(src: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!src) return out;
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "number") out[k] = String(v);
  }
  return out;
}

function draftToStats<T>(
  draft: Record<string, string>,
  fields: Array<[keyof T, string]>,
): Partial<T> | undefined {
  const out: Record<string, number> = {};
  let hasAny = false;
  for (const [k] of fields) {
    const raw = draft[k as string];
    if (raw === undefined || raw.trim() === "") continue;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      out[k as string] = n;
      hasAny = true;
    }
  }
  return hasAny ? (out as Partial<T>) : undefined;
}

function ManualForm({
  playerName,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  playerName: string;
  initial: PlayerGameStatsRecord | undefined;
  busy: boolean;
  onCancel: () => void;
  onSave: (
    batting: PlayerGameBattingStats | undefined,
    pitching: PlayerGamePitchingStats | undefined,
  ) => void;
}) {
  const [batting, setBatting] = useState<BattingDraft>(toDraft(initial?.batting as Record<string, unknown> | undefined));
  const [pitching, setPitching] = useState<PitchingDraft>(toDraft(initial?.pitching as Record<string, unknown> | undefined));

  return (
    <div className="rounded border border-sky-200 bg-sky-50/40 p-3 space-y-3">
      <div className="text-sm font-semibold text-slate-700">Edit stats — {playerName}</div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batting</div>
        <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {BATTING_FIELDS.map(([k, label]) => (
            <label key={String(k)} className="block text-xs">
              <span className="text-slate-600">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                step="any"
                className="input mt-0.5 w-full px-1.5 py-0.5 text-sm tabular-nums"
                value={batting[k] ?? ""}
                onChange={(e) => setBatting({ ...batting, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pitching</div>
        <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {PITCHING_FIELDS.map(([k, label]) => (
            <label key={String(k)} className="block text-xs">
              <span className="text-slate-600">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                step="any"
                className="input mt-0.5 w-full px-1.5 py-0.5 text-sm tabular-nums"
                value={pitching[k] ?? ""}
                onChange={(e) => setPitching({ ...pitching, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => {
            const b = draftToStats<PlayerGameBattingStats>(batting, BATTING_FIELDS);
            const p = draftToStats<PlayerGamePitchingStats>(pitching, PITCHING_FIELDS);
            onSave(
              b as PlayerGameBattingStats | undefined,
              p as PlayerGamePitchingStats | undefined,
            );
          }}
        >
          {busy ? "Saving…" : "Save & re-rate"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const RATING_COLORS: Array<[number, string]> = [
  [4.75, "bg-emerald-100 text-emerald-900 ring-emerald-200"],
  [4.25, "bg-teal-100 text-teal-900 ring-teal-200"],
  [3.75, "bg-sky-100 text-sky-900 ring-sky-200"],
  [3.25, "bg-amber-50 text-amber-900 ring-amber-200"],
  [0, "bg-slate-100 text-slate-700 ring-slate-200"],
];

function ratingClass(score: number): string {
  for (const [floor, cls] of RATING_COLORS) if (score >= floor) return cls;
  return RATING_COLORS[RATING_COLORS.length - 1]?.[1] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

function Stars({ score }: { score: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <span aria-label={`${score} of 5`} className="font-semibold tabular-nums">
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span className="text-slate-400">{"☆".repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
  );
}

export function GameStatsImporter({
  gameId,
  roster,
  initial,
  canEdit = false,
}: {
  gameId: string;
  roster: RosterLite[];
  initial: PlayerGameStatsRecord[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [stats, setStats] = useState<PlayerGameStatsRecord[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [addPlayerId, setAddPlayerId] = useState<string>("");

  const recById = useMemo(() => {
    const m: Record<string, PlayerGameStatsRecord> = {};
    for (const s of stats) m[s.playerId] = s;
    return m;
  }, [stats]);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of roster) m[r.id] = r.name;
    return m;
  }, [roster]);

  async function refreshStats() {
    const fresh = await fetch(`/api/games/${gameId}/stats`);
    if (fresh.ok) {
      const fj = (await fresh.json()) as { stats: PlayerGameStatsRecord[] };
      setStats(fj.stats);
    }
  }

  async function importCsv() {
    setBusy(true);
    setErr(null);
    setResult(null);
    const res = await fetch(`/api/games/${gameId}/stats`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format: "gamechanger", csv }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Import failed");
      return;
    }
    const json = (await res.json()) as ImportResponse;
    setResult(json);
    await refreshStats();
    router.refresh();
  }

  async function saveManual(
    playerId: string,
    batting: PlayerGameBattingStats | undefined,
    pitching: PlayerGamePitchingStats | undefined,
  ) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${gameId}/stats`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        format: "manual",
        entries: [{ playerId, batting, pitching }],
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Save failed");
      return;
    }
    setEditing(null);
    setAddPlayerId("");
    await refreshStats();
    router.refresh();
  }

  const teamAvg = stats.length > 0
    ? Math.round((stats.reduce((s, r) => s + r.rating, 0) / stats.length) * 10) / 10
    : null;

  const missingRoster = roster.filter((r) => !recById[r.id]);

  return (
    <section className="space-y-6">
      {canEdit ? (
        <div className="card space-y-3">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="m-0">Import box-score (GameChanger)</h2>
            <span className="text-xs text-slate-500">
              Paste any GC CSV — Batting / Pitching / Fielding blocks auto-detected.
            </span>
          </header>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            placeholder={"Number,Last,First,PA,AB,H,2B,3B,HR,RBI,R,BB,SO,SB,AVG,OBP,OPS\n1,Anderson,Aiden,4,3,2,1,0,0,2,1,1,0,1,.667,.750,1.500"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !csv.trim()}
              onClick={importCsv}
            >
              {busy ? "Importing…" : "Import & rate"}
            </button>
            {result ? (
              <span className="text-sm text-slate-600">
                ✓ Imported {result.kind} · {result.upsertedCount} matched
                {result.unmatchedCount > 0 ? ` · ${result.unmatchedCount} unmatched` : ""}
              </span>
            ) : null}
            {result?.warnings.map((w, i) => (
              <span key={i} className="text-xs text-amber-700">⚠ {w}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card space-y-3">
        <header className="flex items-baseline justify-between">
          <h2 className="m-0">Player ratings</h2>
          {teamAvg !== null ? (
            <span className="text-sm text-slate-600">
              Team avg: <Stars score={teamAvg} /> <span className="tabular-nums">{teamAvg.toFixed(1)}</span>
            </span>
          ) : null}
        </header>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">
            {canEdit
              ? "No stats yet. Paste a GameChanger export above, or add manual entries below."
              : "No stats yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...stats]
              .sort((a, b) => b.rating - a.rating)
              .map((s) => {
                const b = s.batting;
                const p = s.pitching;
                const isEditing = editing === s.playerId;
                return (
                  <li key={s.id} className="py-3">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-slate-900">{nameById[s.playerId] ?? s.playerId}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${ratingClass(
                              s.rating,
                            )}`}
                          >
                            {s.ratingLabel}
                          </span>
                          {s.source === "manual" ? (
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">manual</span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                          {b ? (
                            <span>
                              {(b.h ?? 0)}-for-{(b.ab ?? 0)}{b.bb ? ` · ${b.bb} BB` : ""}
                              {b.rbi ? ` · ${b.rbi} RBI` : ""}
                              {b.hr ? ` · ${b.hr} HR` : ""}
                              {b.sb ? ` · ${b.sb} SB` : ""}
                            </span>
                          ) : null}
                          {p ? (
                            <span>
                              {p.ip ?? 0} IP · {p.so ?? 0} K · {p.bb ?? 0} BB
                              {p.er !== undefined ? ` · ${p.er} ER` : ""}
                              {p.pitches ? ` · ${p.pitches} P` : ""}
                            </span>
                          ) : null}
                          {s.fielding && s.fielding.length > 0 ? (
                            <span>
                              Played: {s.fielding.map((f) => f.position).join(", ")}
                            </span>
                          ) : null}
                        </div>
                        {s.highlights.length > 0 ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {s.highlights.map((h, i) => (
                              <span key={i} className="mr-2">• {h}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <Stars score={s.rating} />
                        <div className="text-xs tabular-nums text-slate-500">{s.rating.toFixed(1)}</div>
                        {canEdit && !isEditing ? (
                          <button
                            type="button"
                            className="mt-1 text-xs text-sky-700 hover:underline"
                            onClick={() => setEditing(s.playerId)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {canEdit && isEditing ? (
                      <div className="mt-3">
                        <ManualForm
                          playerName={nameById[s.playerId] ?? s.playerId}
                          initial={s}
                          busy={busy}
                          onCancel={() => setEditing(null)}
                          onSave={(b2, p2) => saveManual(s.playerId, b2, p2)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        )}

        {canEdit && missingRoster.length > 0 ? (
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Add manual entry:</span>
              <select
                className="input py-1 text-sm"
                value={addPlayerId}
                onChange={(e) => setAddPlayerId(e.target.value)}
              >
                <option value="">— pick a player —</option>
                {missingRoster.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.jerseyNumber ? `#${r.jerseyNumber} ` : ""}{r.name}
                  </option>
                ))}
              </select>
            </div>
            {addPlayerId ? (
              <div className="mt-3">
                <ManualForm
                  playerName={nameById[addPlayerId] ?? addPlayerId}
                  initial={undefined}
                  busy={busy}
                  onCancel={() => setAddPlayerId("")}
                  onSave={(b2, p2) => saveManual(addPlayerId, b2, p2)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </div>
    </section>
  );
}
