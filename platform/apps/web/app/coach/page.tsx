import Link from "next/link";
import { loadDrills, loadSources } from "@platform/corpus";

export const dynamic = "force-dynamic";

export default function CoachPage() {
  const drills = loadDrills();
  const sources = loadSources();
  return (
    <main style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Coach console</h1>
      <p><Link href="/">← Home</Link></p>

      <section>
        <h2>Quick actions</h2>
        <ul>
          <li><Link href="/practice/new">▶︎ Build today's practice plan</Link></li>
          <li><Link href="/drills">▶︎ Browse drill library</Link> ({drills.length} drills)</li>
          <li><Link href="/safety">▶︎ Review safety rules</Link></li>
          <li><Link href="/missions?age=11">▶︎ Manage player missions</Link></li>
        </ul>
      </section>

      <section>
        <h2>Library snapshot</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Card label="Drills" value={drills.length} />
          <Card label="Published" value={drills.filter((d) => d.review_status === "published").length} />
          <Card label="Cited sources" value={sources.length} />
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Featured drills</h2>
        <ul>
          {drills.slice(0, 5).map((d) => (
            <li key={d.drill_id}><strong>{d.name}</strong> — {d.short_description}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
