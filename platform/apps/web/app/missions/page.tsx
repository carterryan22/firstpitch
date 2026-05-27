import Link from "next/link";
import { missionsForAge } from "@platform/missions";

const AGE_OPTIONS = [8, 11, 13, 16];

function humanize(token: string): string {
  return token
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default async function MissionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const age = Number(sp.age ?? 11);
  const missions = missionsForAge(age);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1>Today's missions</h1>
        <p className="text-sm uppercase tracking-wide text-ink/60">Pick an age.</p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Age band">
          {AGE_OPTIONS.map((a) => {
            const active = a === age;
            return (
              <Link
                key={a}
                role="tab"
                aria-selected={active}
                href={`/missions?age=${a}`}
                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none border-2 px-4 py-2 text-base font-semibold no-underline ${
                  active ? "border-ink bg-ink text-cream" : "border-ink/40 bg-cream text-ink hover:border-ink"
                }`}
              >
                {a}
              </Link>
            );
          })}
        </div>
      </header>

      {missions.length === 0 ? (
        <p className="card">No missions yet. Try another age.</p>
      ) : (
        <ul className="space-y-3 p-0">
          {missions.map((m) => (
            <li key={m.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">{m.title}</h2>
                <span className="badge">{humanize(m.kind)}</span>
              </div>
              <p>{m.description}</p>
              <p className="text-xs uppercase tracking-wide text-ink/60">
                Do it every {m.cadenceDays} days. Goal: {m.minVerification} good reps.
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
