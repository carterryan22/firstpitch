"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanView, type PlanSummary } from "../../components/PlanView";

type EnvironmentTier = "T1_field" | "T2_cage_gym" | "T3_backyard" | "T4_living_room";

const ENV_OPTIONS: Array<{ value: EnvironmentTier; label: string; hint: string }> = [
  { value: "T1_field", label: "Field", hint: "Full diamond / outfield." },
  { value: "T2_cage_gym", label: "Cage / gym", hint: "Indoor cage or gym." },
  { value: "T3_backyard", label: "Backyard", hint: "Small open space." },
  { value: "T4_living_room", label: "Living room", hint: "Tight indoor space." },
];

const FOCUS_OPTIONS = [
  "throwing", "hitting", "speed", "reaction", "fielding",
  "baserunning", "pitching", "mental_recovery",
];

// Equipment keys must match `equipment_required` strings in corpus/drills/starter-library.json.
const EQUIPMENT_PRESETS: Record<EnvironmentTier, string[]> = {
  T1_field: [
    "tee", "5_baseballs", "10_baseballs", "bat", "base",
    "cones", "stopwatch_or_gates", "stopwatches",
    "reaction_ball", "L-screen", "catcher_gear",
  ],
  T2_cage_gym: [
    "tee", "5_baseballs", "10_baseballs", "bat",
    "cones", "stopwatch_or_gates", "L-screen", "reaction_ball",
  ],
  T3_backyard: ["tee", "5_baseballs", "bat", "cones", "reaction_ball"],
  T4_living_room: ["reaction_ball"],
};

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

export function PracticeBuilder({
  teams,
  presetTeamId,
  canPersist,
}: {
  teams: TeamLite[];
  presetTeamId?: string;
  canPersist: boolean;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string>(presetTeamId ?? "");
  const selectedTeam = teams.find((t) => t.id === teamId);
  const [age, setAge] = useState<number>(selectedTeam ? AGE_BAND_DEFAULT[selectedTeam.ageBand] : 11);
  const [duration, setDuration] = useState<number>(60);
  const [focus, setFocus] = useState<string[]>(["throwing", "speed"]);
  const [environment, setEnvironment] = useState<EnvironmentTier>("T1_field");
  const [coaches, setCoaches] = useState<number>(1);
  const [players, setPlayers] = useState<number>(8);
  const [name, setName] = useState<string>("");
  const [saveToTeam, setSaveToTeam] = useState<boolean>(true);

  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const equipment = useMemo(() => EQUIPMENT_PRESETS[environment], [environment]);

  function toggleFocus(f: string) {
    setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function onTeamChange(id: string) {
    setTeamId(id);
    const t = teams.find((x) => x.id === id);
    if (t) setAge(AGE_BAND_DEFAULT[t.ageBand]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSavedId(null);
    const persist = canPersist && saveToTeam;
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        age,
        durationMin: duration,
        environmentTier: environment,
        equipmentAvailable: equipment,
        coaches,
        players,
        focus,
        persist,
        teamId: persist && teamId ? teamId : undefined,
        name: name.trim() || undefined,
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
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="card space-y-5 self-start">
        {teams.length > 0 ? (
          <div>
            <label className="label" htmlFor="team">Team</label>
            <select
              id="team"
              className="input"
              value={teamId}
              onChange={(e) => onTeamChange(e.target.value)}
            >
              <option value="">No team — personal draft</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.ageBand})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="age">Player age</label>
            <input
              id="age"
              type="number"
              min={6}
              max={18}
              className="input"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="dur">Duration (min)</label>
            <input
              id="dur"
              type="number"
              min={15}
              max={180}
              step={5}
              className="input"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <span className="label">Focus</span>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => {
              const on = focus.includes(f);
              return (
                <button
                  type="button"
                  key={f}
                  onClick={() => toggleFocus(f)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    on
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-brand-500"
                  }`}
                  aria-pressed={on}
                >
                  {f.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="env">Environment</label>
          <select
            id="env"
            className="input"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as EnvironmentTier)}
          >
            {ENV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="coaches">Coaches</label>
            <input
              id="coaches"
              type="number"
              min={1}
              max={6}
              className="input"
              value={coaches}
              onChange={(e) => setCoaches(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="players">Players</label>
            <input
              id="players"
              type="number"
              min={1}
              max={30}
              className="input"
              value={players}
              onChange={(e) => setPlayers(Number(e.target.value))}
            />
          </div>
        </div>

        {canPersist ? (
          <div className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div>
              <label className="label" htmlFor="name">Plan name (optional)</label>
              <input
                id="name"
                className="input"
                placeholder="Tuesday — speed + reaction"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700"
                checked={saveToTeam}
                onChange={(e) => setSaveToTeam(e.target.checked)}
                disabled={!teamId}
              />
              Save & publish to{" "}
              <strong>{selectedTeam?.name ?? "selected team"}</strong>
            </label>
            {!teamId ? (
              <p className="text-xs text-slate-500">
                Pick a team to share this plan with players and parents.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Sign in as a coach to save plans for your team.
          </p>
        )}

        {err ? <p className="text-sm text-danger">{err}</p> : null}

        <button type="submit" disabled={busy || focus.length === 0} className="btn-primary w-full">
          {busy ? "Compiling…" : "Compile practice"}
        </button>
      </form>

      <section className="space-y-4">
        {!plan ? (
          <div className="card text-sm text-slate-600">
            <p className="font-medium text-slate-900">No plan yet</p>
            <p className="mt-1">
              Fill out the form on the left and hit <em>Compile practice</em>. The compiler runs every
              draft through the Tier-1 safety corpus before showing it to you.
            </p>
          </div>
        ) : (
          <>
            {savedId ? (
              <div className="card flex flex-wrap items-center justify-between gap-3 border-ok/30 bg-ok-soft/40">
                <div className="text-sm">
                  <span className="badge-ok mr-2">Saved</span>
                  Players and parents on the team will see this plan now.
                </div>
                <a href={`/plans/${savedId}`} className="btn-ghost text-sm no-underline">
                  Open plan ↗
                </a>
              </div>
            ) : null}
            <PlanView plan={plan} />
          </>
        )}
      </section>
    </div>
  );
}
