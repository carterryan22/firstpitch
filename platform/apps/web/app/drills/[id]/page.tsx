import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDrills } from "@platform/corpus";

export const dynamic = "force-static";

export default async function DrillDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = loadDrills().find((d) => d.drill_id === id);
  if (!drill) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm">
        <Link href="/drills">← All drills</Link>
      </p>
      <header className="space-y-2">
        <h1>{drill.name}</h1>
        <p className="text-sm uppercase tracking-wide text-ink/60">
          {drill.topic} · {drill.duration_minutes} min · ages {drill.age_band.join(", ")}
        </p>
      </header>

      {drill.kid_friendly ? (
        <section className="card space-y-3 bg-cream">
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

      <section className="card space-y-2">
        <h2 className="text-base uppercase">For the coach</h2>
        <p>{drill.short_description}</p>
        <p className="text-sm text-ink/70">
          Tier: {drill.environment_tier} · Status: {drill.review_status}
        </p>
      </section>
    </main>
  );
}
