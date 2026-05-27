import Link from "next/link";
import { missionsForAge } from "@platform/missions";


export default async function MissionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const age = Number(sp.age ?? 11);
  const missions = missionsForAge(age);
  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Player missions</h1>
      <p><Link href="/">← Home</Link></p>
      <p>Showing age {age}. Try: {[8, 11, 13, 16].map((a) => (
        <span key={a}><Link href={`/missions?age=${a}`}>{a}</Link> </span>
      ))}</p>
      {missions.length === 0 ? <p>No missions for this age.</p> : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {missions.map((m) => (
            <li key={m.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8, borderRadius: 6 }}>
              <strong>{m.title}</strong> <span style={{ background: "#eef", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{m.kind}</span>
              <div style={{ fontSize: 13, color: "#555" }}>
                Cadence: {m.cadenceDays} days · Verification ≥ {m.minVerification}
              </div>
              <div style={{ marginTop: 6 }}>{m.description}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
