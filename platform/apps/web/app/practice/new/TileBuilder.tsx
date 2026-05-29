"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanView, type PlanSummary } from "../../components/PlanView";

type EnvironmentTier = "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";

const ENV_OPTIONS: Array<{ value: EnvironmentTier; label: string }> = [
  { value: "T1_field", label: "Field" },
  { value: "T2_cage_gym", label: "Cage / gym" },
  { value: "T3_backyard", label: "Backyard" },
  { value: "T4_living_room", label: "Living room" },
];

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120] as const;

const TOPIC_LABEL: Record<string, string> = {
  throwing: "Throwing",
  hitting: "Hitting",
  fielding: "Fielding",
  pitching: "Pitching",
  baserunning: "Baserunning",
  speed: "Speed",
  reaction: "Reaction",
  catching: "Catching",
  mental_recovery: "Mental / recovery",
  strength: "Strength",
  warmup: "Warm-up",
};

const INTENSITY_TONE: Record<string, string> = {
  light: "bg-slate-100 text-slate-700",
  normal: "bg-brand-100 text-brand-700",
  hard: "bg-warn-soft text-warn",
  recovery: "bg-grass/20 text-grass-dark",
};

// Drill payload shipped from the server. Trimmed copy of corpus Drill.
export interface DrillTile {
  drill_id: string;
  name: string;
  short_description: string;
  topic: string;
  intensity: "light" | "normal" | "hard" | "recovery";
  duration_minutes: number;
  age_band: Array<"6-8" | "9-12" | "13-15" | "16+">;
  environment_tier: EnvironmentTier;
  equipment_required: string[];
  player_count_min: number;
  player_count_max: number;
  coaches_min: number;
  tags?: string[];
}

export interface PlanTemplateTile {
  id: string;
  name: string;
  blurb: string;
  durationMin: number;
  environmentTier: EnvironmentTier;
  focus: string[];
  drillIds: string[];
}

interface TeamLite {
  id: string;
  name: string;
  ageBand: "6-8" | "9-12" | "13-15" | "16+";
}

const AGE_BAND_DEFAULT: Record<TeamLite["ageBand"], number> = {
  "6-8": 7,
  "9-12": 11,
  "13-15": 14,
  "16+": 16,
};

const EQUIPMENT_PRESETS: Record<EnvironmentTier, string[]> = {
  T1_field: [
    "tee", "5_baseballs", "10_baseballs", "bat", "base", "bases",
    "cones", "stopwatch_or_gates", "stopwatches",
    "reaction_ball", "L-screen", "catcher_gear", "wiffle_balls",
  ],
  T2_cage_gym: [
    "tee", "5_baseballs", "10_baseballs", "bat",
    "cones", "stopwatch_or_gates", "L-screen", "reaction_ball", "wiffle_balls",
  ],
  T3_backyard: ["tee", "5_baseballs", "bat", "cones", "reaction_ball", "wiffle_balls"],
  T4_living_room: ["reaction_ball", "wiffle_balls"],
};

function isEnvTier(v: string | undefined): v is EnvironmentTier {
  return v === "T1_field" || v === "T2_cage_gym" || v === "T3_backyard" || v === "T4_living_room";
}

// Time budget math kept client-side so the tray meter updates live.
function computeBudget(selected: DrillTile[], durationMin: number) {
  const WARMUP = 8;
  const COOLDOWN = 5;
  const TRANSITION = 1;
  const WATER_EVERY = 25;
  const skillMin = selected.reduce((s, d) => s + d.duration_minutes, 0);
  const transitionMin = selected.length > 0 ? selected.length * TRANSITION : 0;
  const waterMin = Math.floor(skillMin / WATER_EVERY) * 2;
  const usedMin = WARMUP + skillMin + transitionMin + waterMin + (selected.length > 0 ? COOLDOWN : 0);
  return {
    warmup: WARMUP,
    cooldown: selected.length > 0 ? COOLDOWN : 0,
    skill: skillMin,
    transitions: transitionMin,
    water: waterMin,
    used: usedMin,
    slack: durationMin - usedMin,
    target: durationMin,
  };
}

export function TileBuilder({
  drills,
  teams,
  presetTeamId,
  canPersist,
  presetFocus,
  presetAge,
  presetEnv,
  presetDuration,
}: {
  drills: DrillTile[];
  teams: TeamLite[];
  presetTeamId?: string;
  canPersist: boolean;
  presetFocus?: string[];
  presetAge?: number;
  presetEnv?: string;
  presetDuration?: number;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string>(presetTeamId ?? "");
  const selectedTeam = teams.find((t) => t.id === teamId);
  const [age, setAge] = useState<number>(
    presetAge ?? (selectedTeam ? AGE_BAND_DEFAULT[selectedTeam.ageBand] : 11),
  );
  const [duration, setDuration] = useState<number>(presetDuration ?? 60);
  const [environment, setEnvironment] = useState<EnvironmentTier>(
    isEnvTier(presetEnv) ? presetEnv : "T1_field",
  );
  const [coaches, setCoaches] = useState<number>(1);
  const [players, setPlayers] = useState<number>(8);
  const [name, setName] = useState<string>("");
  const [saveToTeam, setSaveToTeam] = useState<boolean>(true);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [topicFilter, setTopicFilter] = useState<Set<string>>(
    new Set(presetFocus && presetFocus.length > 0 ? presetFocus : []),
  );
  const [intensityFilter, setIntensityFilter] = useState<Set<string>>(new Set());
  const [durationBucket, setDurationBucket] = useState<"all" | "short" | "med" | "long">("all");

  // Tray = ordered list of selected drill IDs
  const [tray, setTray] = useState<string[]>([]);
  const trayDrills = useMemo(
    () => tray.map((id) => drills.find((d) => d.drill_id === id)).filter((d): d is DrillTile => Boolean(d)),
    [tray, drills],
  );

  // Templates fetched on demand
  const [templates, setTemplates] = useState<PlanTemplateTile[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    fetch(`/api/compile/templates?age=${age}&duration=${duration}&env=${environment}`)
      .then((r) => r.json())
      .then((j: { templates: PlanTemplateTile[] }) => {
        if (!cancelled) setTemplates(j.templates ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setTemplatesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [age, duration, environment]);

  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ageBand = useMemo<TeamLite["ageBand"]>(() => {
    if (age <= 8) return "6-8";
    if (age <= 12) return "9-12";
    if (age <= 15) return "13-15";
    return "16+";
  }, [age]);

  // Drills filtered down to eligibility + UI filters
  const visibleDrills = useMemo(() => {
    return drills.filter((d) => {
      if (!d.age_band.includes(ageBand)) return false;
      // Environment: include same tier or lower (simpler).
      const tierOrder = ["T4_living_room", "T3_backyard", "T2_cage_gym", "T1_field"];
      if (tierOrder.indexOf(d.environment_tier) > tierOrder.indexOf(environment)) return false;
      if (topicFilter.size > 0 && !topicFilter.has(d.topic)) return false;
      if (intensityFilter.size > 0 && !intensityFilter.has(d.intensity)) return false;
      if (durationBucket === "short" && d.duration_minutes > 8) return false;
      if (durationBucket === "med" && (d.duration_minutes <= 8 || d.duration_minutes > 18)) return false;
      if (durationBucket === "long" && d.duration_minutes <= 18) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${d.name} ${d.short_description} ${(d.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [drills, ageBand, environment, topicFilter, intensityFilter, durationBucket, search]);

  const availableTopics = useMemo(() => {
    return Array.from(new Set(drills.filter((d) => d.age_band.includes(ageBand)).map((d) => d.topic))).sort();
  }, [drills, ageBand]);

  const budget = useMemo(() => computeBudget(trayDrills, duration), [trayDrills, duration]);

  function toggleSet(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function addToTray(drillId: string) {
    if (tray.includes(drillId)) return;
    setTray((cur) => [...cur, drillId]);
  }
  function removeFromTray(drillId: string) {
    setTray((cur) => cur.filter((id) => id !== drillId));
  }
  function moveInTray(drillId: string, delta: -1 | 1) {
    setTray((cur) => {
      const i = cur.indexOf(drillId);
      if (i < 0) return cur;
      const j = i + delta;
      if (j < 0 || j >= cur.length) return cur;
      const next = cur.slice();
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  function applyTemplate(t: PlanTemplateTile) {
    setTray(t.drillIds);
    setDuration(t.durationMin);
    setEnvironment(t.environmentTier);
    setTopicFilter(new Set(t.focus));
  }

  async function compile() {
    setBusy(true);
    setErr(null);
    setSavedId(null);
    const focus = Array.from(
      new Set([...topicFilter, ...trayDrills.map((d) => d.topic)]),
    ).filter((t) => t !== "warmup" && t !== "mental_recovery");
    const persist = canPersist && saveToTeam && Boolean(teamId);
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        age,
        durationMin: duration,
        environmentTier: environment,
        equipmentAvailable: EQUIPMENT_PRESETS[environment],
        coaches,
        players,
        focus: focus.length > 0 ? focus : ["throwing"],
        selectedDrillIds: tray,
        persist,
        teamId: persist && teamId ? teamId : undefined,
        name: name.trim() || undefined,
        scheduledAt: persist && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        location: persist && location.trim() ? location.trim() : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error ?? "Failed to compile");
      return;
    }
    const data = (await res.json()) as PlanSummary & { planId?: string };
    setPlan({ ...data, durationMin: duration, name: name.trim() || undefined, focus });
    if (data.planId) {
      setSavedId(data.planId);
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        {/* Constraints row — terse, no jargon */}
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="age">Player age</label>
              <input
                id="age" type="number" min={6} max={18}
                className="input" value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="players">Players</label>
              <input
                id="players" type="number" min={1} max={30}
                className="input" value={players}
                onChange={(e) => setPlayers(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="coaches">Coaches</label>
              <input
                id="coaches" type="number" min={1} max={6}
                className="input" value={coaches}
                onChange={(e) => setCoaches(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="env">Where</label>
              <select
                id="env" className="input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as EnvironmentTier)}
              >
                {ENV_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration presets */}
          <div>
            <span className="label">Time slot</span>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((m) => (
                <button
                  type="button" key={m}
                  onClick={() => setDuration(m)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    duration === m
                      ? "border-ink bg-ink text-cream"
                      : "border-slate-300 bg-white text-slate-700 hover:border-ink"
                  }`}
                  aria-pressed={duration === m}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Packaged plan presets */}
        {templates.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">
                Packaged plans for {duration} min · {ENV_OPTIONS.find((e) => e.value === environment)?.label}
              </h2>
              {templatesLoading ? <span className="text-xs text-ink/50">refreshing…</span> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((t) => (
                <button
                  type="button" key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="card text-left transition hover:border-brand-500"
                >
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="mt-1 text-xs text-ink/60">
                    {t.durationMin} min · {t.focus.map((f) => TOPIC_LABEL[f] ?? f).join(" · ")}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{t.blurb}</p>
                  <div className="mt-2 text-[11px] uppercase tracking-wide text-brand-700">
                    Tap to load →
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Filters */}
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search drills…"
              className="input max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ml-auto text-xs text-ink/60">
              {visibleDrills.length} drill{visibleDrills.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="space-y-2">
            <ChipRow label="Focus">
              {availableTopics.map((t) => (
                <Chip
                  key={t}
                  active={topicFilter.has(t)}
                  onClick={() => toggleSet(topicFilter, t, setTopicFilter)}
                >
                  {TOPIC_LABEL[t] ?? t}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow label="Intensity">
              {(["light", "normal", "hard", "recovery"] as const).map((i) => (
                <Chip
                  key={i}
                  active={intensityFilter.has(i)}
                  onClick={() => toggleSet(intensityFilter, i, setIntensityFilter)}
                >
                  {i}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow label="Length">
              {(["all", "short", "med", "long"] as const).map((d) => (
                <Chip key={d} active={durationBucket === d} onClick={() => setDurationBucket(d)}>
                  {d === "all" ? "Any" : d === "short" ? "≤8 min" : d === "med" ? "9–18 min" : "19+ min"}
                </Chip>
              ))}
            </ChipRow>
          </div>
        </section>

        {/* Tile grid */}
        <section>
          {visibleDrills.length === 0 ? (
            <div className="card text-sm text-ink/70">
              No drills match. Loosen a filter or change the environment.
            </div>
          ) : (
            <ul className="grid gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {visibleDrills.map((d) => {
                const inTray = tray.includes(d.drill_id);
                return (
                  <li key={d.drill_id} className="card flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">{d.name}</div>
                        <div className="mt-0.5 text-xs text-ink/60">
                          {TOPIC_LABEL[d.topic] ?? d.topic} · {d.duration_minutes} min
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          INTENSITY_TONE[d.intensity] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {d.intensity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">{d.short_description}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-1 text-[10px] text-ink/60">
                        {d.equipment_required.slice(0, 2).map((e) => (
                          <span key={e} className="rounded bg-slate-100 px-1.5 py-0.5">
                            {e.replace(/_/g, " ")}
                          </span>
                        ))}
                        {d.equipment_required.length > 2 ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            +{d.equipment_required.length - 2}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => (inTray ? removeFromTray(d.drill_id) : addToTray(d.drill_id))}
                        className={`text-xs ${
                          inTray ? "btn-ghost" : "btn-primary"
                        }`}
                      >
                        {inTray ? "Remove" : "Add"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>

      {/* Tray sidebar */}
      <aside className="space-y-4 self-start lg:sticky lg:top-4">
        <div className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">Your plan</h2>
            <span className="text-xs text-ink/60">
              {budget.used} / {budget.target} min
            </span>
          </div>

          <BudgetBar budget={budget} />

          <BudgetLegend budget={budget} />

          {trayDrills.length === 0 ? (
            <p className="rounded-md border border-dashed border-ink/30 bg-cream/50 p-3 text-sm text-ink/70">
              No drills yet. Tap a packaged plan above or add tiles from the library.
            </p>
          ) : (
            <ol className="space-y-2 p-0">
              {trayDrills.map((d, i) => (
                <li
                  key={d.drill_id}
                  className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2"
                >
                  <span className="mt-0.5 text-xs font-mono text-ink/40">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{d.name}</div>
                    <div className="text-[11px] text-ink/60">
                      {TOPIC_LABEL[d.topic] ?? d.topic} · {d.duration_minutes} min
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button" aria-label="Move up"
                      className="text-xs text-ink/60 hover:text-ink disabled:opacity-30"
                      onClick={() => moveInTray(d.drill_id, -1)}
                      disabled={i === 0}
                    >▲</button>
                    <button
                      type="button" aria-label="Move down"
                      className="text-xs text-ink/60 hover:text-ink disabled:opacity-30"
                      onClick={() => moveInTray(d.drill_id, 1)}
                      disabled={i === trayDrills.length - 1}
                    >▼</button>
                  </div>
                  <button
                    type="button" aria-label="Remove"
                    className="shrink-0 text-xs text-danger hover:underline"
                    onClick={() => removeFromTray(d.drill_id)}
                  >✕</button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {canPersist ? (
          <div className="card space-y-3">
            {teams.length > 0 ? (
              <div>
                <label className="label" htmlFor="team">Team</label>
                <select
                  id="team" className="input"
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    const t = teams.find((x) => x.id === e.target.value);
                    if (t) setAge(AGE_BAND_DEFAULT[t.ageBand]);
                  }}
                >
                  <option value="">No team — personal draft</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.ageBand})</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="label" htmlFor="name">Plan name</label>
              <input
                id="name" className="input"
                placeholder="Tuesday practice"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox" className="h-4 w-4"
                checked={saveToTeam}
                onChange={(e) => setSaveToTeam(e.target.checked)}
                disabled={!teamId}
              />
              Save & publish to team
            </label>
            {teamId && saveToTeam ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="sched">When</label>
                  <input
                    id="sched" type="datetime-local" className="input"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="loc">Location</label>
                  <input
                    id="loc" className="input"
                    placeholder="Field 3"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {err ? <p className="text-sm text-danger">{err}</p> : null}

        <button
          type="button"
          onClick={compile}
          disabled={busy || trayDrills.length === 0}
          className="btn-primary w-full"
        >
          {busy ? "Compiling…" : `Compile ${trayDrills.length} drill${trayDrills.length === 1 ? "" : "s"}`}
        </button>
      </aside>

      {plan ? (
        <section className="lg:col-span-2">
          {savedId ? (
            <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-ok/30 bg-ok-soft/40">
              <div className="text-sm">
                <span className="badge-ok mr-2">Saved</span>
                Players and parents on the team will see this plan now.
              </div>
              <a href={`/plans/${savedId}`} className="btn-ghost text-sm no-underline">
                Open plan ↗
              </a>
            </div>
          ) : null}
          <PlanView plan={plan} teamId={teamId || undefined} planId={savedId ?? undefined} />
        </section>
      ) : null}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{label}:</span>
      {children}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-0.5 text-xs ${
        active
          ? "border-brand-700 bg-brand-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-brand-500"
      }`}
    >
      {children}
    </button>
  );
}

function BudgetBar({ budget }: { budget: ReturnType<typeof computeBudget> }) {
  const segments: Array<{ key: string; min: number; cls: string }> = [
    { key: "warmup",     min: budget.warmup,      cls: "bg-brand-300" },
    { key: "skill",      min: budget.skill,       cls: "bg-brand-700" },
    { key: "transition", min: budget.transitions, cls: "bg-slate-300" },
    { key: "water",      min: budget.water,       cls: "bg-warn/60" },
    { key: "cooldown",   min: budget.cooldown,    cls: "bg-grass/60" },
  ];
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded bg-slate-100">
        {segments.map((s) =>
          s.min > 0 ? (
            <span
              key={s.key}
              className={s.cls}
              style={{ width: `${Math.min(100, (s.min / Math.max(1, budget.target)) * 100)}%` }}
              title={`${s.key}: ${s.min} min`}
            />
          ) : null,
        )}
        {budget.slack > 0 ? (
          <span
            className="bg-slate-200"
            style={{ width: `${Math.min(100, (budget.slack / Math.max(1, budget.target)) * 100)}%` }}
            title={`free: ${budget.slack} min`}
          />
        ) : null}
      </div>
      {budget.slack < 0 ? (
        <p className="text-xs text-danger">
          Over by {Math.abs(budget.slack)} min — remove a drill or add time.
        </p>
      ) : budget.slack > 10 ? (
        <p className="text-xs text-warn">
          {budget.slack} min still open. Add one more drill or tighten time per block.
        </p>
      ) : (
        <p className="text-xs text-ink/60">
          {budget.slack === 0 ? "Right on time." : `${budget.slack} min slack for huddles.`}
        </p>
      )}
    </div>
  );
}

function BudgetLegend({ budget }: { budget: ReturnType<typeof computeBudget> }) {
  const items = [
    { label: "Warm-up", value: budget.warmup },
    { label: "Drills", value: budget.skill },
    { label: "Transitions", value: budget.transitions },
    { label: "Water", value: budget.water },
    { label: "Cool-down", value: budget.cooldown },
  ];
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-ink/70">
      {items.map((i) => (
        <li key={i.label} className="flex justify-between">
          <span>{i.label}</span>
          <span className="tabular-nums">{i.value} min</span>
        </li>
      ))}
    </ul>
  );
}
