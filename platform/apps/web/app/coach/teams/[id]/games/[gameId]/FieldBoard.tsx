"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fieldingRoleFor } from "../../../../../lib/roles";
import {
  autoLineup,
  buildLocks,
  POSITIONS,
  EXTRA_POSITIONS,
  PRESET_POSITIONS,
  shuffleNonLocked,
  summarize,
  toCsv,
  defaultLeagueRules,
  explainCell,
  summarizeForParents,
  validateLineup,
  LINEUP_MODES,
  LINEUP_MODE_ORDER,
  type DefensivePreset,
  type LeagueRules,
  type LineupPlayer,
  type LineupMode,
  type Inning,
  type Slot,
} from "@platform/lineup";

const ALL_SLOTS: Slot[] = [...POSITIONS, ...EXTRA_POSITIONS, "BN"];

type RosterEntry = LineupPlayer & {
  name: string;
  jerseyNumber?: string;
};

const MAX_HISTORY = 30;

export function FieldBoard({
  gameId,
  innings,
  roster,
  present,
  initial,
  pitcherUnavailable,
  teamRules,
}: {
  gameId: string;
  innings: number;
  roster: RosterEntry[];
  present: string[];
  initial: Inning[];
  pitcherUnavailable?: string[];
  /** Team-configured default rules (from Team settings). */
  teamRules?: Partial<LeagueRules>;
}) {
  const router = useRouter();
  const seedLineup: Inning[] =
    initial.length === innings
      ? initial
      : Array.from({ length: innings }, (_, i) => initial[i] ?? {});
  const [lineup, setLineupRaw] = useState<Inning[]>(seedLineup);
  const [history, setHistory] = useState<Inning[][]>([]);
  const [future, setFuture] = useState<Inning[][]>([]);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<DefensivePreset>("standard9");
  const [competitive, setCompetitive] = useState<number>(30); // 0..100
  const [mode, setMode] = useState<LineupMode>("recFair");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rulesEnabled, setRulesEnabled] = useState(true);
  // A team-configured rule set is authoritative (omitted rule = off). Only fall
  // back to the built-in defaults when the team hasn't set anything.
  const [leagueRules, setLeagueRules] = useState<LeagueRules>(() =>
    teamRules && Object.keys(teamRules).length > 0
      ? { ...teamRules }
      : defaultLeagueRules(),
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  const [familyView, setFamilyView] = useState(false);

  // setLineup that also records history for undo
  const setLineup = useCallback((updater: (cur: Inning[]) => Inning[]) => {
    setLineupRaw((cur) => {
      const next = updater(cur);
      setHistory((h) => [...h.slice(-MAX_HISTORY + 1), cur]);
      setFuture([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setFuture((f) => [lineup, ...f].slice(0, MAX_HISTORY));
      setLineupRaw(prev);
      return h.slice(0, -1);
    });
  }, [lineup]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, lineup].slice(-MAX_HISTORY));
      setLineupRaw(next!);
      return rest;
    });
  }, [lineup]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const fairness = useMemo(
    () => summarize(lineup, roster.map((r) => r.id)),
    [lineup, roster],
  );

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of roster) m[r.id] = r.name;
    return m;
  }, [roster]);

  const violations = useMemo(() => {
    if (!rulesEnabled) return [];
    return validateLineup(lineup, leagueRules, present);
  }, [lineup, leagueRules, present, rulesEnabled]);

  // Group violations by rule for a more scannable list (pattern borrowed from
  // Who's On Second's "Rules & Compliance" card — coaches want to see
  // "NO CONSECUTIVE BENCH: Carson · innings 1,2 ; Levi · innings 1,2"
  // rather than a flat per-player feed.
  const RULE_LABELS: Record<string, { title: string; explain: string }> = {
    minFieldInnings: { title: "MIN FIELD INNINGS", explain: "Each player needs a minimum number of defensive innings." },
    infieldRequiredByInning: { title: "INFIELD ROTATION", explain: "Every player needs at least one infield inning by the cutoff." },
    maxConsecutiveBench: { title: "NO CONSECUTIVE BENCH", explain: "Cannot sit out too many innings in a row." },
    maxConsecutiveOutfield: { title: "NO CONSECUTIVE OUTFIELD", explain: "Cannot play the outfield too many innings in a row." },
    pitcherBenchInningBefore: { title: "PITCHER WARM-UP", explain: "Pitchers need the prior inning on the bench to warm up." },
    pairedPositions: { title: "POSITION PAIRS", explain: "Tandem position locks were not satisfied." },
    equalBenchTime: { title: "EQUAL BENCH TIME", explain: "No player sits a second inning until everyone has sat once." },
    maxConsecutiveSamePosition: { title: "NO CONSECUTIVE POSITION", explain: "Cannot play the same defensive position two innings in a row." },
    minInfieldInnings: { title: "MIN INFIELD INNINGS", explain: "Each player needs a minimum number of infield innings." },
    minOutfieldInnings: { title: "MIN OUTFIELD INNINGS", explain: "Each player needs a minimum number of outfield innings." },
  };

  const grouped = useMemo(() => {
    const byRule = new Map<string, { playerId: string; innings: number[] }[]>();
    for (const v of violations) {
      const arr = byRule.get(v.rule) ?? [];
      if (!v.playerId) {
        arr.push({ playerId: "—", innings: [] });
      } else {
        const existing = arr.find((e) => e.playerId === v.playerId);
        if (existing) {
          if (v.inning !== undefined && !existing.innings.includes(v.inning + 1)) {
            existing.innings.push(v.inning + 1);
          }
        } else {
          arr.push({ playerId: v.playerId, innings: v.inning !== undefined ? [v.inning + 1] : [] });
        }
      }
      byRule.set(v.rule, arr);
    }
    return Array.from(byRule.entries());
  }, [violations]);

  function printLineup() {
    if (typeof window !== "undefined") window.print();
  }

  function setSlot(playerId: string, inningIdx: number, slot: Slot | "") {
    setLineup((cur) =>
      cur.map((inn, i) => {
        if (i !== inningIdx) return inn;
        const next = { ...inn };
        if (slot === "") delete next[playerId];
        else next[playerId] = slot;
        return next;
      }),
    );
  }

  function toggleLock(playerId: string, inningIdx: number) {
    setLocked((cur) => {
      const k = `${inningIdx}:${playerId}`;
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function generate() {
    const res = autoLineup({
      innings,
      players: roster,
      present,
      preset,
      competitiveWeight: competitive / 100,
      varietyWeight: LINEUP_MODES[mode].varietyWeight,
      locks: locked.size ? buildLocks(lineup, locked) : undefined,
      pitcherUnavailable,
      leagueRules: rulesEnabled ? leagueRules : undefined,
    });
    setLineup(() => res.innings);
    setWarnings(res.warnings);
  }

  function shuffleAroundLocks() {
    if (locked.size === 0) {
      // Equivalent to a regenerate when nothing is locked.
      generate();
      return;
    }
    const res = shuffleNonLocked(lineup, locked, {
      innings,
      players: roster,
      present,
      preset,
      competitiveWeight: competitive / 100,
      varietyWeight: LINEUP_MODES[mode].varietyWeight,
      pitcherUnavailable,
      leagueRules: rulesEnabled ? leagueRules : undefined,
    });
    setLineup(() => res.innings);
    setWarnings(res.warnings);
  }

  function clearAll() {
    setLineup(() => Array.from({ length: innings }, () => ({})));
    setLocked(new Set());
    setWarnings([]);
  }

  function exportCsv() {
    const csv = toCsv(
      lineup,
      roster.map((r) => ({ id: r.id, name: r.name, jerseyNumber: r.jerseyNumber })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lineup-${gameId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineup }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to save");
      return;
    }
    router.refresh();
  }

  // Per-inning issues. Use the active position set so missing/dupe checks
  // adapt to the chosen preset.
  const activePositions = PRESET_POSITIONS[preset];
  const inningIssues = lineup.map((inn) => {
    const fillCount: Partial<Record<Slot, number>> = {};
    for (const slot of Object.values(inn) as Slot[]) {
      fillCount[slot] = (fillCount[slot] ?? 0) + 1;
    }
    const dupes = activePositions.filter((p) => (fillCount[p] ?? 0) > 1);
    const missing = activePositions.filter((p) => (fillCount[p] ?? 0) === 0);
    return { dupes, missing };
  });

  return (
    <section className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={generate}>
          Auto-generate
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={shuffleAroundLocks}
          title="Re-roll non-locked cells"
        >
          Shuffle ({locked.size} locked)
        </button>
        <button type="button" className="btn-ghost" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl/Cmd+Z)">
          ↶ Undo
        </button>
        <button type="button" className="btn-ghost" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)">
          ↷ Redo
        </button>
        <button type="button" className="btn-ghost" onClick={clearAll}>
          Clear
        </button>
        <button type="button" className="btn-ghost" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="btn-ghost" onClick={printLineup}>
          Print
        </button>
        <div className="grow" />
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save lineup"}
        </button>
      </div>

      <div className="no-print rounded border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Game mode</span>
          {LINEUP_MODE_ORDER.map((m) => {
            const spec = LINEUP_MODES[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setCompetitive(Math.round(spec.competitiveWeight * 100));
                }}
                aria-pressed={active}
                title={spec.blurb}
                className={
                  active
                    ? "rounded bg-field-700 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-field-700"
                }
              >
                {spec.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-1.5 text-xs text-slate-500">
          {LINEUP_MODES[mode].note} Pick a mode, then <strong>Auto-generate</strong>.
        </p>
      </div>

      <div className="no-print flex flex-wrap items-center gap-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Preset</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1"
            value={preset}
            onChange={(e) => setPreset(e.target.value as DefensivePreset)}
          >
            <option value="standard9">Standard 9</option>
            <option value="standard10">Standard 10 (+ Rover)</option>
            <option value="coachPitch">Coach Pitch (no P/C)</option>
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-slate-600 whitespace-nowrap">Priority</span>
          <span className="text-xs text-slate-500">Fair</span>
          <input
            type="range"
            min={0}
            max={100}
            value={competitive}
            onChange={(e) => setCompetitive(Number(e.target.value))}
            className="w-40 accent-emerald-600"
            aria-label="Competitive priority"
          />
          <span className="text-xs text-slate-500">Skill</span>
          <span className="tabular-nums text-slate-700 w-10 text-right">{competitive}%</span>
        </label>
        <span className="text-xs text-slate-500">
          Tap a cell&apos;s 🔒 to lock; Shuffle keeps locked cells.
        </span>
      </div>

      <div className="no-print rounded border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-emerald-600"
              checked={rulesEnabled}
              onChange={(e) => setRulesEnabled(e.target.checked)}
            />
            <span className="font-medium text-slate-700">League rules</span>
          </label>
          <span className="text-xs text-slate-500">
            Min playing time · infield / outfield minimums · no consecutive bench / outfield / position · equal bench · pitcher warm-up.
          </span>
          <div className="grow" />
          {rulesEnabled ? (
            <span className={`text-xs ${violations.length === 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {violations.length === 0 ? "All rules met" : `${violations.length} violation${violations.length === 1 ? "" : "s"}`}
            </span>
          ) : null}
          <button
            type="button"
            className="text-xs text-slate-600 underline-offset-2 hover:underline"
            onClick={() => setRulesOpen((o) => !o)}
            aria-expanded={rulesOpen}
          >
            {rulesOpen ? "Hide" : "Edit"}
          </button>
        </div>
        {rulesOpen ? (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 px-3 py-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Min field innings / player</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.minFieldInnings ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({ ...r, minFieldInnings: Number(e.target.value) }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Infield required by inning</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.infieldRequiredByInning ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({
                    ...r,
                    infieldRequiredByInning: Number(e.target.value) || undefined,
                  }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Max consecutive bench</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.maxConsecutiveBench ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({ ...r, maxConsecutiveBench: Number(e.target.value) }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Max consecutive outfield</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.maxConsecutiveOutfield ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({ ...r, maxConsecutiveOutfield: Number(e.target.value) }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={!!leagueRules.pitcherBenchInningBefore}
                onChange={(e) =>
                  setLeagueRules((r) => ({ ...r, pitcherBenchInningBefore: e.target.checked }))
                }
              />
              <span className="text-xs text-slate-600">Pitcher benched inning before</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Min infield innings / player</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.minInfieldInnings ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({
                    ...r,
                    minInfieldInnings: Number(e.target.value) || undefined,
                  }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Min outfield innings / player</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.minOutfieldInnings ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({
                    ...r,
                    minOutfieldInnings: Number(e.target.value) || undefined,
                  }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Max same position in a row</span>
              <input
                type="number"
                min={0}
                max={innings}
                value={leagueRules.maxConsecutiveSamePosition ?? 0}
                onChange={(e) =>
                  setLeagueRules((r) => ({
                    ...r,
                    maxConsecutiveSamePosition: Number(e.target.value) || undefined,
                  }))
                }
                className="rounded border border-slate-300 bg-white px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={!!leagueRules.equalBenchTime}
                onChange={(e) =>
                  setLeagueRules((r) => ({ ...r, equalBenchTime: e.target.checked }))
                }
              />
              <span className="text-xs text-slate-600">Equal bench time</span>
            </label>
          </div>
        ) : null}
      </div>

      {rulesEnabled && violations.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <div className="border-b border-amber-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Rules &amp; compliance · {violations.length} violation{violations.length === 1 ? "" : "s"}
          </div>
          <ul className="divide-y divide-amber-200">
            {grouped.map(([rule, entries]) => {
              const meta = RULE_LABELS[rule] ?? { title: rule.toUpperCase(), explain: "" };
              return (
                <li key={rule} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold tracking-wide text-amber-900">{meta.title}</span>
                    <span className="text-[10px] text-amber-700">{entries.length} affected</span>
                  </div>
                  {meta.explain ? (
                    <p className="mt-0.5 text-xs text-amber-800">{meta.explain}</p>
                  ) : null}
                  <ul className="mt-1 space-y-0.5">
                    {entries.slice(0, 8).map((e, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{nameById[e.playerId] ?? e.playerId}</span>
                        {e.innings.length > 0 ? (
                          <span className="text-amber-800"> · innings {e.innings.join(", ")}</span>
                        ) : null}
                      </li>
                    ))}
                    {entries.length > 8 ? (
                      <li className="text-[11px] text-amber-700">…and {entries.length - 8} more.</li>
                    ) : null}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {warnings.length > 0 ? (
        <ul className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="border-b border-slate-200 px-2 py-2">Player</th>
              {Array.from({ length: innings }, (_, i) => {
                const issues = inningIssues[i] ?? { dupes: [], missing: [] };
                return (
                <th key={i} className="border-b border-slate-200 px-2 py-2 text-center">
                  {i + 1}
                  {issues.dupes.length > 0 ? (
                    <div className="text-xs font-normal text-red-600">
                      dup: {issues.dupes.join(",")}
                    </div>
                  ) : null}
                  {issues.missing.length > 0 ? (
                    <div className="text-xs font-normal text-amber-700">
                      need: {issues.missing.join(",")}
                    </div>
                  ) : null}
                </th>
              );})}
              <th className="border-b border-slate-200 px-2 py-2 text-center">F</th>
              <th className="border-b border-slate-200 px-2 py-2 text-center">BN</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((p, ri) => {
              const stats = fairness[ri];
              const isAbsent = !present.includes(p.id);
              return (
                <tr key={p.id} className={isAbsent ? "opacity-40" : ""}>
                  <td className="border-b border-slate-100 px-2 py-1.5 whitespace-nowrap">
                    <span className="inline-block w-7 text-right text-xs font-bold tabular-nums text-slate-700">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : ""}
                    </span>{" "}
                    {p.name}
                    {p.injured ? <span className="ml-1 badge-danger">Inj</span> : null}
                  </td>
                  {Array.from({ length: innings }, (_, i) => {
                    const slot = (lineup[i]?.[p.id] ?? "") as Slot | "";
                    const key = `${i}:${p.id}`;
                    const isLocked = locked.has(key);
                    const role = slot && slot !== "BN" ? fieldingRoleFor(slot) : undefined;
                    const cellTitle = slot
                      ? role
                        ? `${role.emoji} ${role.name} — ${role.tagline}\n\n${explainCell(p, slot, i).detail}`
                        : explainCell(p, slot, i).detail
                      : undefined;
                    return (
                      <td
                        key={i}
                        className="border-b border-slate-100 px-1 py-1 text-center"
                        title={cellTitle}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <select
                            aria-label={`Inning ${i + 1} for ${p.name}`}
                            className={`rounded border bg-white px-1 py-0.5 text-xs ${isLocked ? "border-emerald-500 ring-1 ring-emerald-300" : "border-slate-200"}`}
                            value={slot}
                            disabled={isAbsent || p.injured}
                            onChange={(e) => setSlot(p.id, i, e.target.value as Slot | "")}
                          >
                            <option value="">—</option>
                            {ALL_SLOTS.map((s) => {
                              const rating = p.positionRatings?.[s as never];
                              const blocked = rating === "avoid";
                              const noPitch = s === "P" && !p.canPitch;
                              const noCatch = s === "C" && !p.canCatch;
                              return (
                                <option
                                  key={s}
                                  value={s}
                                  disabled={blocked || noPitch || noCatch}
                                >
                                  {s}
                                  {rating === "preferred" ? "★" : rating === "ok" ? "·" : ""}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            aria-label={isLocked ? `Unlock ${p.name} inning ${i + 1}` : `Lock ${p.name} inning ${i + 1}`}
                            title={isLocked ? "Locked — Shuffle will keep this" : "Lock this cell"}
                            onClick={() => toggleLock(p.id, i)}
                            disabled={isAbsent || p.injured || !slot}
                            className={`text-[10px] leading-none px-0.5 ${isLocked ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"} disabled:opacity-30`}
                          >
                            {isLocked ? "🔒" : "🔓"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 px-2 py-1 text-center text-xs text-slate-600">
                    {stats?.fieldInnings ?? 0}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-1 text-center text-xs text-slate-600">
                    {stats?.benchInnings ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        ★ preferred · dot ok · blank unrated · &ldquo;avoid&rdquo; positions are disabled. Absent players are dimmed. Lock cells with 🔒, then click <strong>Shuffle</strong> to reroll the rest. Hover any cell for the parent-facing rationale.
      </p>

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-3 text-xs">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Position characters · share with players
          </span>
          <Link
            href="/learn/roles#fielding"
            target="_blank"
            className="text-[11px] text-slate-500 underline-offset-2 hover:underline"
          >
            Full guide →
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {(POSITIONS as readonly string[]).map((pos) => {
            const role = fieldingRoleFor(pos);
            if (!role) return null;
            return (
              <li
                key={pos}
                title={role.tagline}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700"
              >
                <span className="font-mono text-[10px] text-slate-500">{pos}</span>
                <span aria-hidden>{role.emoji}</span>
                <span className="font-medium">{role.name}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm">
          <span className="font-medium text-slate-700">Family-facing position plan</span>
          <button
            type="button"
            className="text-xs text-slate-600 underline-offset-2 hover:underline"
            onClick={() => setFamilyView((v) => !v)}
            aria-expanded={familyView}
          >
            {familyView ? "Hide" : "Show"}
          </button>
        </div>
        {familyView ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {roster
              .filter((p) => present.includes(p.id) && !p.injured)
              .map((p) => {
                const sum = summarizeForParents(lineup, p);
                return (
                  <li key={p.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-slate-800">{p.name}</strong>
                      <span className="text-xs text-slate-500">
                        {sum.fieldInnings} field · {sum.benchInnings} bench
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">{sum.parentSummary}</p>
                    {sum.improvementAreas.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Growth at: {sum.improvementAreas.join(", ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="px-3 py-2 text-xs text-slate-500">
            Coach-only by default. Toggle on to preview the same explanation parents see in the family dashboard, and to copy/paste into a team message.
          </p>
        )}
      </div>
    </section>
  );
}
