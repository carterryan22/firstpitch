import Link from "next/link";
import { missionsForAge } from "@platform/missions";
import { homeMission } from "@platform/compiler";

export const dynamic = "force-dynamic";

export default async function ParentPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const age = Number(sp.age ?? 11);
  const missions = missionsForAge(age);
  const home = homeMission({ age, focus: ["mental_recovery", "speed"] });
  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Parent view</h1>
      <p><Link href="/">← Home</Link></p>
      <p>Age: {age}. Try: {[8, 11, 13, 16].map((a) => (
        <span key={a}><Link href={`/parent?age=${a}`}>{a}</Link> </span>
      ))}</p>

      <section>
        <h2>Today's home mission</h2>
        {home ? (
          <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
            <strong>{home.name}</strong> ({home.duration_minutes}min) — {home.short_description}
            <ul>{home.coaching_cues.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        ) : <p>No home mission found for this age.</p>}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Your child's missions</h2>
        <ul>
          {missions.map((m) => <li key={m.id}><strong>{m.title}</strong> — {m.description}</li>)}
        </ul>
      </section>

      <section style={{ marginTop: 24, fontSize: 13, color: "#666" }}>
        <p>This view shows only verified data. No diagnoses are inferred without coach- or device-verified entries.</p>
      </section>
    </main>
  );
}
