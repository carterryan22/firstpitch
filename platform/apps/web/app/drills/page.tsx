import Link from "next/link";
import { loadDrills } from "@platform/corpus";
import { TIER_ORDER, tierLabel, topicLabel, normalizeTier, TIER_LABELS } from "./drillLabels";


export default async function DrillsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const allDrills = loadDrills();
  const topics = Array.from(new Set(allDrills.map((d) => d.topic))).sort();

  const rawTopic = sp.topic;
  const rawTier = sp.tier;
  const topic = rawTopic && topics.includes(rawTopic) ? rawTopic : undefined;
  const tier = normalizeTier(rawTier);
  const invalidTopic = rawTopic && !topic ? rawTopic : null;
  const invalidTier = rawTier && !tier ? rawTier : null;

  let drills = allDrills;
  if (topic) drills = drills.filter((d) => d.topic === topic);
  if (tier) drills = drills.filter((d) => d.environment_tier === tier);

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1>Drill library</h1>
        <p className="text-sm uppercase tracking-wide text-ink/60">
          {drills.length} drill{drills.length === 1 ? "" : "s"}
          {topic || tier ? " match your filters" : ""}
        </p>
        {invalidTopic || invalidTier ? (
          <p className="card text-sm">
            {invalidTopic ? <>Unknown topic <code>{invalidTopic}</code>. </> : null}
            {invalidTier ? (
              <>Unknown tier <code>{invalidTier}</code> — try {Object.keys(TIER_LABELS).join(", ")} or short forms T1–T4. </>
            ) : null}
            <Link href="/drills" className="underline">Clear filters</Link>.
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        <FilterGroup
          label="Topic"
          current={topic}
          options={topics.map((t) => ({ value: t, label: topicLabel(t) }))}
          param="topic"
          otherParams={{ tier }}
        />
        <FilterGroup
          label="Tier"
          current={tier}
          options={TIER_ORDER.map((t) => ({ value: t, label: tierLabel(t) }))}
          param="tier"
          otherParams={{ topic }}
        />
      </div>

      {drills.length === 0 ? (
        <p className="card text-sm">
          No drills match those filters.{" "}
          <Link href="/drills" className="underline">Clear filters</Link>.
        </p>
      ) : (
        <ul className="space-y-3 p-0">
          {drills.map((d) => (
            <li key={d.drill_id} className="card space-y-2">
              <h2 className="text-lg">
                <Link href={`/drills/${d.drill_id}`} className="inline-flex min-h-[44px] items-center no-underline">
                  {d.name}
                </Link>
              </h2>
              <p className="text-xs uppercase tracking-wide text-ink/60">
                {topicLabel(d.topic)} · {tierLabel(d.environment_tier)} · {d.duration_minutes} min · ages {d.age_band.join(", ")}
              </p>
              <p>{d.short_description}</p>
              {d.equipment_required.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5 p-0 text-xs">
                  {d.equipment_required.slice(0, 6).map((e) => (
                    <li key={e} className="badge">{e.replace(/_/g, " ")}</li>
                  ))}
                  {d.equipment_required.length > 6 ? (
                    <li className="badge">+{d.equipment_required.length - 6}</li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-xs text-ink/60">No equipment required.</p>
              )}
              <div className="pt-1">
                <Link
                  href={`/practice/new?focus=${encodeURIComponent(d.topic)}&age=${d.age_band[0]?.split("-")[0] ?? 11}&env=${d.environment_tier}`}
                  className="btn-ghost inline-flex min-h-[44px] items-center text-sm no-underline hover:no-underline"
                >
                  Use in a practice →
                </Link>
              </div>
              {d.kid_friendly ? (
                <div className="rounded-none border-l-4 border-grass bg-cream/60 p-3 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-wide text-grass-dark">For kids</p>
                  <p><strong>How to explain it:</strong> {d.kid_friendly.explain}</p>
                  <p><strong>What good looks like:</strong> {d.kid_friendly.goal}</p>
                  <p><strong>Why it matters:</strong> {d.kid_friendly.why}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function FilterGroup({
  label,
  current,
  options,
  param,
  otherParams,
}: {
  label: string;
  current?: string;
  options: { value: string; label: string }[];
  param: string;
  otherParams?: Record<string, string | undefined>;
}) {
  const chip = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none border-2 px-3 py-1 text-sm no-underline";
  const active = "border-ink bg-ink text-cream";
  const idle = "border-ink/30 bg-cream text-ink hover:border-ink";

  function buildHref(value?: string): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(otherParams ?? {})) {
      if (v) params.set(k, v);
    }
    if (value) params.set(param, value);
    const qs = params.toString();
    return qs ? `/drills?${qs}` : "/drills";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <strong className="mr-1 text-xs uppercase tracking-wide text-ink/60">{label}:</strong>
      <Link href={buildHref()} className={`${chip} ${!current ? active : idle}`}>All</Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={buildHref(o.value)}
          className={`${chip} ${current === o.value ? active : idle}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
