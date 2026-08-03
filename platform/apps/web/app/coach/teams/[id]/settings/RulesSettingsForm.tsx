"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LINEUP_RULE_META,
  RULE_SET_PRESETS,
  ruleSetPreset,
  ruleProvenance,
  type LineupRuleKey,
  type RuleSetPresetId,
} from "@platform/lineup";
import type { TeamLeagueRules } from "@platform/storage";

/** Rules with a numeric parameter (innings). The rest are simple on/off. */
const NUMERIC_RULES: Partial<Record<LineupRuleKey, { unit: string; max: number }>> = {
  minFieldInnings: { unit: "innings", max: 9 },
  infieldRequiredByInning: { unit: "by inning", max: 9 },
  maxConsecutiveBench: { unit: "innings", max: 9 },
  maxConsecutiveOutfield: { unit: "innings", max: 9 },
  maxConsecutiveSamePosition: { unit: "innings", max: 9 },
  minInfieldInnings: { unit: "innings", max: 9 },
  minOutfieldInnings: { unit: "innings", max: 9 },
};

const BOOL_RULES: LineupRuleKey[] = ["pitcherBenchInningBefore", "equalBenchTime"];

/** Order rules the way the game-day competitor groups them in Settings → §8.2. */
const RULE_ORDER: LineupRuleKey[] = [
  "minFieldInnings",
  "minInfieldInnings",
  "minOutfieldInnings",
  "infieldRequiredByInning",
  "maxConsecutiveBench",
  "equalBenchTime",
  "maxConsecutiveOutfield",
  "maxConsecutiveSamePosition",
  "pitcherBenchInningBefore",
];

/**
 * Value-provenance badge (game-day ref §8.2): does this rule's current value still come
 * from the applied rule set ("League rule", tagged with the governing body) or
 * has the coach changed it ("Custom")? Off rules show nothing.
 */
function ProvenanceBadge({
  ruleKey,
  rules,
  presetId,
}: {
  ruleKey: LineupRuleKey;
  rules: TeamLeagueRules;
  presetId: RuleSetPresetId | "";
}) {
  const prov = ruleProvenance(ruleKey, rules, presetId || undefined);
  if (prov.source === "off") return null;
  if (prov.source === "preset") {
    return (
      <span className="badge-info text-[10px]" title={`From ${prov.presetLabel}`}>
        {prov.governingBody} rule
      </span>
    );
  }
  return <span className="badge text-[10px]">Custom</span>;
}

export function RulesSettingsForm({
  teamId,
  initial,
  appliedRuleSetId,
}: {
  teamId: string;
  initial: TeamLeagueRules;
  appliedRuleSetId?: string;
}) {
  const router = useRouter();
  const [rules, setRules] = useState<TeamLeagueRules>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [presetId, setPresetId] = useState<RuleSetPresetId | "">(
    appliedRuleSetId && ruleSetPreset(appliedRuleSetId as RuleSetPresetId)
      ? (appliedRuleSetId as RuleSetPresetId)
      : "",
  );

  function applyPreset(id: RuleSetPresetId) {
    const preset = ruleSetPreset(id);
    if (!preset) return;
    setSaved(false);
    setPresetId(id);
    // A preset is a complete rule set — replace, don't merge (anything the
    // preset omits is intentionally off). Strip the per-game-only pairedPositions.
    const { pairedPositions: _drop, ...scalar } = preset.rules;
    void _drop;
    setRules({ ...scalar } as TeamLeagueRules);
  }

  // Manual edits keep the applied preset id: provenance is derived per-rule, so
  // only the rule that changed flips to "Custom" while the rest stay "League rule".
  function setNum(key: LineupRuleKey, value: number | undefined) {
    setSaved(false);
    setRules((r) => {
      const next = { ...r } as Record<string, unknown>;
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next as TeamLeagueRules;
    });
  }

  function setBool(key: LineupRuleKey, on: boolean) {
    setSaved(false);
    setRules((r) => {
      const next = { ...r } as Record<string, unknown>;
      if (on) next[key] = true;
      else delete next[key];
      return next as TeamLeagueRules;
    });
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/teams/${teamId}/settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leagueRules: rules, appliedRuleSetId: presetId || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const activeCount = RULE_ORDER.filter((k) => {
    const v = (rules as Record<string, unknown>)[k];
    return v !== undefined && v !== false && v !== 0;
  }).length;

  return (
    <section className="space-y-4">
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Apply a rule set</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              value={presetId}
              onChange={(e) => {
                const v = e.target.value as RuleSetPresetId | "";
                if (v) applyPreset(v);
                else setPresetId("");
              }}
            >
              <option value="">Choose a preset…</option>
              {RULE_SET_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {presetId ? (
            <span className="text-xs text-slate-500">
              {ruleSetPreset(presetId)?.blurb}. Review below, then Save.
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              Sets all rules in one tap. You can still fine-tune any rule afterward.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {activeCount} of {RULE_ORDER.length} rules on. These apply as defaults whenever you
          build a game lineup.
        </p>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-xs text-field-700">Saved</span> : null}
          {err ? <span className="text-xs text-rose-600">{err}</span> : null}
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save rules"}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded border border-slate-200">
        {RULE_ORDER.map((key) => {
          const meta = LINEUP_RULE_META[key];
          const numeric = NUMERIC_RULES[key];
          const raw = (rules as Record<string, unknown>)[key];
          const on = raw !== undefined && raw !== false && raw !== 0;
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-[14rem] grow">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{meta.label}</span>
                  <ProvenanceBadge ruleKey={key} rules={rules} presetId={presetId} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
              </div>

              {numeric ? (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-field-600"
                      checked={on}
                      onChange={(e) => setNum(key, e.target.checked ? (typeof raw === "number" ? raw : 1) : undefined)}
                      aria-label={`Enable ${meta.label}`}
                    />
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={numeric.max}
                    value={typeof raw === "number" ? raw : ""}
                    disabled={!on}
                    onChange={(e) => setNum(key, e.target.value === "" ? undefined : Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-dirt-700"
                    aria-label={`${meta.label} value`}
                  />
                  <span className="w-16 text-xs text-dirt-700">{numeric.unit}</span>
                </div>
              ) : BOOL_RULES.includes(key) ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-field-600"
                    checked={on}
                    onChange={(e) => setBool(key, e.target.checked)}
                    aria-label={`Toggle ${meta.label}`}
                  />
                  <span className="text-xs text-slate-500">{on ? "On" : "Off"}</span>
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
