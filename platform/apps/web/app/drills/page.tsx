import Link from "next/link";
import { loadDrills } from "@platform/corpus";


export default async function DrillsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const topic = sp.topic;
  const tier = sp.tier;
  let drills = loadDrills();
  if (topic) drills = drills.filter((d) => d.topic === topic);
  if (tier) drills = drills.filter((d) => d.environment_tier === tier);

  const topics = Array.from(new Set(loadDrills().map((d) => d.topic))).sort();
  const tiers = ["T1_field", "T2_cage_gym", "T3_backyard", "T4_living_room"];

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1>Drill library</h1>
        <p className="text-sm uppercase tracking-wide text-ink/60">{drills.length} drills</p>
      </header>

      <div className="space-y-3">
        <FilterGroup label="Topic" current={topic} options={topics} param="topic" />
        <FilterGroup label="Tier" current={tier} options={tiers} param="tier" />
      </div>

      <ul className="space-y-3 p-0">
        {drills.map((d) => (
          <li key={d.drill_id} className="card space-y-2">
            <h2 className="text-lg">
              <Link href={`/drills/${d.drill_id}`} className="inline-flex min-h-[44px] items-center no-underline">
                {d.name}
              </Link>
            </h2>
            <p className="text-xs uppercase tracking-wide text-ink/60">
              {d.topic} · {d.environment_tier} · {d.duration_minutes} min · ages {d.age_band.join(", ")} · {d.review_status}
            </p>
            <p>{d.short_description}</p>
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
    </main>
  );
}

function FilterGroup({ label, current, options, param }: { label: string; current?: string; options: string[]; param: string }) {
  const chip = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none border-2 px-3 py-1 text-sm no-underline";
  const active = "border-ink bg-ink text-cream";
  const idle = "border-ink/30 bg-cream text-ink hover:border-ink";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <strong className="mr-1 text-xs uppercase tracking-wide text-ink/60">{label}:</strong>
      <Link href={`/drills`} className={`${chip} ${!current ? active : idle}`}>All</Link>
      {options.map((o) => (
        <Link
          key={o}
          href={`/drills?${param}=${o}`}
          className={`${chip} ${current === o ? active : idle}`}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}
