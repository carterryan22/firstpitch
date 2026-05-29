import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDrills, loadSafetyRules } from "@platform/corpus";
import { tierLabel, topicLabel, reviewStatusLabel } from "../drillLabels";

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = loadDrills().find((d) => d.drill_id === id);
  if (!drill) return { title: "Drill not found" };
  return {
    title: drill.name,
    description: drill.short_description,
  };
}

export default async function DrillDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = loadDrills().find((d) => d.drill_id === id);
  if (!drill) notFound();

  const rules = loadSafetyRules().rules;
  const referencedRules = (drill.safety_rule_refs ?? [])
    .map((rid) => rules.find((r) => r.rule_id === rid))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <main className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm">
        <Link href="/drills">← All drills</Link>
      </p>

      <header className="space-y-3">
        <h1>{drill.name}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="badge-info">{topicLabel(drill.topic)}</span>
          <span className="badge-info">{tierLabel(drill.environment_tier)}</span>
          <span className="badge-info">{drill.duration_minutes} min</span>
          <span className="badge-info">Ages {drill.age_band.join(", ")}</span>
          <span className="badge-info">
            {drill.player_count_min}-{drill.player_count_max} players
          </span>
          <span className="badge-info">Intensity: {drill.intensity}</span>
          {drill.pitch_smart_compliant ? <span className="badge-ok">Pitch Smart OK</span> : null}
          {drill.supervision_required ? <span className="badge-warn">Adult supervision</span> : null}
        </div>
        <p className="text-base text-ink">{drill.short_description}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/practice/new?focus=${encodeURIComponent(drill.topic)}&age=${drill.age_band[0]?.split("-")[0] ?? 11}&env=${drill.environment_tier}&duration=${Math.max(45, drill.duration_minutes + 30)}`}
            className="btn-primary no-underline hover:no-underline"
          >
            Use this drill in a practice
          </Link>
          <Link href="/drills" className="btn-ghost no-underline hover:no-underline">
            Back to library
          </Link>
        </div>
      </header>

      {drill.kid_friendly ? (
        <section className="card space-y-3">
          <h2 className="text-base uppercase">Your job today</h2>
          <p className="text-lg leading-snug">{drill.kid_friendly.explain}</p>
          <p>
            <strong>What good looks like:</strong> {drill.kid_friendly.goal}
          </p>
          <p>
            <strong>Why it matters:</strong> {drill.kid_friendly.why}
          </p>
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="text-base uppercase">How it works</h2>
        <p className="leading-relaxed">{drill.long_description}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="Reps / rounds" value={drill.reps_or_rounds} />
          <Stat label="Rest between sets" value={`${drill.rest_seconds_between_sets}s`} />
          <Stat label="Space needed" value={drill.space_required} />
          <Stat
            label="Coaches"
            value={
              drill.coaches_min === drill.coaches_max
                ? String(drill.coaches_min)
                : `${drill.coaches_min}-${drill.coaches_max}`
            }
          />
        </dl>
      </section>

      {drill.equipment_required.length > 0 ? (
        <section className="card space-y-3">
          <h2 className="text-base uppercase">Equipment</h2>
          <ul className="list-disc space-y-1 pl-5">
            {drill.equipment_required.map((eq) => (
              <li key={eq}>{eq.replace(/_/g, " ")}</li>
            ))}
          </ul>
          {drill.equipment_substitutions.length > 0 ? (
            <div className="space-y-1 border-t-2 border-dirt-200 pt-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-dirt-700">If you don&apos;t have it</p>
              <ul className="space-y-1">
                {drill.equipment_substitutions.map((s, i) => (
                  <li key={i}>
                    No <strong>{s.missing}</strong>? Use <strong>{s.swap_to}</strong>
                    {s.tier_change ? ` (moves to ${tierLabel(s.tier_change)})` : ""}.
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {drill.setup_steps.length > 0 ? (
        <section className="card space-y-3">
          <h2 className="text-base uppercase">Setup</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {drill.setup_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {drill.execution_steps.length > 0 ? (
        <section className="card space-y-3">
          <h2 className="text-base uppercase">Run the drill</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {drill.execution_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {drill.coaching_cues.length > 0 || drill.common_mistakes.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {drill.coaching_cues.length > 0 ? (
            <div className="card space-y-2">
              <h2 className="text-base uppercase">Coaching cues</h2>
              <ul className="list-disc space-y-1 pl-5">
                {drill.coaching_cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {drill.common_mistakes.length > 0 ? (
            <div className="card space-y-2">
              <h2 className="text-base uppercase">Common mistakes</h2>
              <ul className="list-disc space-y-1 pl-5">
                {drill.common_mistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {drill.scoring ? (
        <section className="card space-y-2">
          <h2 className="text-base uppercase">Scoring</h2>
          <p>
            Track <strong>{drill.scoring.unit}</strong> ({drill.scoring.type}).
            {drill.scoring.success_threshold !== null
              ? ` On-track when at or above ${drill.scoring.success_threshold}.`
              : ""}
          </p>
        </section>
      ) : null}

      {drill.progressions.length > 0 ||
      drill.regressions.length > 0 ||
      drill.variations.length > 0 ? (
        <section className="card space-y-3">
          <h2 className="text-base uppercase">Adjust it</h2>
          {drill.regressions.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-dirt-700">Make it easier</p>
              <ul className="list-disc space-y-1 pl-5">
                {drill.regressions.map((r, i) => (
                  <li key={i}>
                    <strong>{r.level}:</strong> {r.change}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {drill.progressions.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-dirt-700">Make it harder</p>
              <ul className="list-disc space-y-1 pl-5">
                {drill.progressions.map((p, i) => (
                  <li key={i}>
                    <strong>{p.level}:</strong> {p.change}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {drill.variations.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-dirt-700">Variations</p>
              <ul className="list-disc space-y-1 pl-5">
                {drill.variations.map((v, i) => (
                  <li key={i}>
                    <strong>{v.name}:</strong> {v.change}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {referencedRules.length > 0 || drill.safety_flags.length > 0 ? (
        <section className="card-dark space-y-3">
          <h2 className="text-base uppercase text-cream">Safety</h2>
          {drill.safety_flags.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {drill.safety_flags.map((f) => (
                <li key={f}>{f.replace(/_/g, " ")}</li>
              ))}
            </ul>
          ) : null}
          {referencedRules.length > 0 ? (
            <ul className="space-y-2">
              {referencedRules.map((r) => (
                <li key={r.rule_id}>
                  <strong>{r.rule_id}</strong> — {r.rule_text}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="card space-y-1 text-sm">
        <h2 className="text-base uppercase">Source</h2>
        <p>
          Author: {drill.author} · Status: {reviewStatusLabel(drill.review_status)} · Last reviewed{" "}
          {drill.last_reviewed_at}
        </p>
        {drill.evidence_links.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {drill.evidence_links.map((e, i) => (
              <li key={i}>
                <a href={e.source_id} target="_blank" rel="noreferrer noopener">
                  {e.source_id}
                </a>{" "}
                <span className="text-ink/70">({e.relationship.replace(/_/g, " ")})</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-dirt-200 pl-3">
      <dt className="text-xs uppercase tracking-wide text-dirt-700">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
