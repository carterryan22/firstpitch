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
    <main style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Drill library</h1>
      <p><Link href="/">← Home</Link></p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <FilterGroup label="Topic" current={topic} options={topics} param="topic" />
        <FilterGroup label="Tier" current={tier} options={tiers} param="tier" />
      </div>
      <p>{drills.length} drills</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {drills.map((d) => (
          <li key={d.drill_id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8, borderRadius: 6 }}>
            <strong>{d.name}</strong> — <code>{d.drill_id}</code>
            <div style={{ fontSize: 13, color: "#555" }}>
              {d.topic} · {d.environment_tier} · {d.duration_minutes}min · ages {d.age_band.join(", ")} · status {d.review_status}
            </div>
            <div style={{ marginTop: 6 }}>{d.short_description}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function FilterGroup({ label, current, options, param }: { label: string; current?: string; options: string[]; param: string }) {
  return (
    <div>
      <strong>{label}: </strong>
      <Link href={`/drills`}>all</Link>
      {options.map((o) => (
        <span key={o}>
          {" · "}
          <Link href={`/drills?${param}=${o}`} style={{ fontWeight: current === o ? "bold" : "normal" }}>{o}</Link>
        </span>
      ))}
    </div>
  );
}
