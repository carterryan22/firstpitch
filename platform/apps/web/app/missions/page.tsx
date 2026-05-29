import Link from "next/link";
import { missionsForAge, type Mission } from "@platform/missions";

const AGE_OPTIONS = [8, 11, 13, 16];

const KIND_LABEL: Record<Mission["kind"], string> = {
  fun_streak: "Daily streak",
  pr_challenge: "Personal best",
  position_ladder: "Position ladder",
  verified_pr_only: "Coach-verified PR",
};

const VERIFICATION_COPY: Record<Mission["minVerification"], string> = {
  self_entered: "Log your reps when you finish.",
  video_attached: "Record a short video so your coach can review.",
  device_captured: "Use a device timer or sensor to capture it.",
  coach_verified: "Coach checks it off at the next practice.",
};

export const metadata = { title: "Home missions" };

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const age = Number(sp.age ?? 11);
  const missions = missionsForAge(age);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1>Today&apos;s missions</h1>
        <p className="text-sm uppercase tracking-wide text-ink/60">Pick an age band.</p>
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
                <span className="badge">{KIND_LABEL[m.kind]}</span>
              </div>
              <p>{m.description}</p>
              <p className="text-xs uppercase tracking-wide text-ink/60">
                Repeat every {m.cadenceDays} day{m.cadenceDays === 1 ? "" : "s"} · {VERIFICATION_COPY[m.minVerification]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
