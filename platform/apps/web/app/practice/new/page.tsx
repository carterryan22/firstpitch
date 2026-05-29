import { loadDrills } from "@platform/corpus";
import { getSession } from "../../lib/session";
import { getTeamsForUser } from "../../lib/teams";
import { TileBuilder, type DrillTile } from "./TileBuilder";

export const metadata = { title: "New practice" };

export default async function NewPracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const teams = session ? await getTeamsForUser(session.user.id) : [];
  const presetTeamId = sp.teamId && teams.some((t) => t.id === sp.teamId) ? sp.teamId : undefined;
  const canPersist = !!session && (session.user.role === "coach" || session.user.role === "admin");
  const presetFocus = sp.focus
    ? sp.focus.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const presetAge = sp.age ? Number(sp.age) : undefined;
  const presetEnv = sp.env;
  const presetDuration = sp.duration ? Number(sp.duration) : undefined;

  // Ship a trimmed drill payload — server is the only side that imports the corpus.
  const drillTiles: DrillTile[] = loadDrills()
    .filter((d) => d.review_status === "published" || d.review_status === "reviewed")
    .map((d) => ({
      drill_id: d.drill_id,
      name: d.name,
      short_description: d.short_description,
      topic: d.topic,
      intensity: d.intensity,
      duration_minutes: d.duration_minutes,
      age_band: d.age_band,
      environment_tier: d.environment_tier,
      equipment_required: d.equipment_required,
      player_count_min: d.player_count_min,
      player_count_max: d.player_count_max,
      coaches_min: d.coaches_min,
      tags: d.tags,
    }));

  return (
    <div className="space-y-6">
      {!session ? (
        <aside className="border-2 border-ink bg-dirt-100 p-5">
          <p className="eyebrow text-dirt-700">Sandbox · no signup</p>
          <h2 className="mt-1 text-xl">Try the practice builder. Right now.</h2>
          <p className="mt-2 text-sm text-ink/80">
            Pick a packaged plan or drag in your own drills. Every plan runs through the safety
            corpus before it ships.{" "}
            <a className="text-ink underline" href="/login?next=/practice/new">
              Send a magic link →
            </a>
          </p>
        </aside>
      ) : null}
      <header className="max-w-3xl">
        <h1>Build a practice</h1>
        <p className="mt-2 text-slate-600">
          Browse drill tiles, drop them in your plan, and we'll compile a safety-checked timeline
          that fits your time slot — water breaks and transitions included.
        </p>
      </header>
      <TileBuilder
        drills={drillTiles}
        teams={teams.map((t) => ({ id: t.id, name: t.name, ageBand: t.ageBand }))}
        presetTeamId={presetTeamId}
        canPersist={canPersist}
        presetFocus={presetFocus}
        presetAge={presetAge}
        presetEnv={presetEnv}
        presetDuration={presetDuration}
      />
    </div>
  );
}

