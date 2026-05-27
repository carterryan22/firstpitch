import { loadSafetyRules, loadDrills } from "@platform/corpus";
import { getSession } from "./lib/session";
import { Hero, FeatureGrid, RoleTile } from "./components/ui";

export default async function Home() {
  const rules = loadSafetyRules().rules;
  const drills = loadDrills();
  const publishedDrills = drills.filter((d) => d.review_status === "published").length;
  // Layout already swallows getSession errors; mirror that here.
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="Youth player development"
        title={
          <>
            Practices that respect the rulebook —{" "}
            <span className="text-brand-700">and the athlete.</span>
          </>
        }
        description="Compile age-appropriate practice plans in under a minute. Every drill is gated by USA Baseball Pitch Smart, an age-band matrix, and our typed safety corpus before it reaches a coach or parent."
        primary={session ? { href: "/coach", label: "Open coach console" } : { href: "/practice/new", label: "Build a practice plan" }}
        secondary={{ href: "/safety", label: `${rules.length} safety rules →` }}
      />

      <section>
        <FeatureGrid
          items={[
            {
              title: "Safety enforced, not suggested",
              description: `${rules.length} Tier-1 rules from Pitch Smart, NSCA, CDC, and Stop Sports Injuries are compiled into hard blocks, warnings, and informational labels.`,
            },
            {
              title: "Drills picked for the athlete",
              description: `${publishedDrills} published drills filtered by age band, environment tier (field / cage / backyard / living room), and equipment on hand.`,
            },
            {
              title: "Parent-facing without the noise",
              description: "Every practice produces one home mission — a single, verified drill for the parent. No diagnoses, no comparisons, no anxiety.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Pick where you are today</h2>
          <span className="text-sm text-slate-500">Role-aware — sign in unlocks personal views</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RoleTile
            href="/practice/new"
            title="Build a practice"
            description="Pick age, length, and focus areas. The compiler returns a safety-checked plan."
            cta="Open compiler"
          />
          <RoleTile
            href="/drills"
            title="Drill library"
            description={`Browse ${publishedDrills} published drills with tier, age band, and equipment filters.`}
            cta="Browse drills"
          />
          <RoleTile
            href="/missions?age=11"
            title="Home missions"
            description="One short drill per practice for the parent and athlete to do at home."
            cta="See missions"
          />
          <RoleTile
            href="/safety"
            title="Safety rulebook"
            description="The corpus that gates every plan. Sourced, dated, and reviewable."
            cta="Read the rules"
          />
        </div>
      </section>

      {!session && (
        <section className="rounded-2xl border border-brand-500/30 bg-brand-50/60 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3 className="text-brand-900">Sign in to save plans and missions</h3>
            <p className="mt-1 text-sm text-slate-700">
              Coach, parent, player, or clinician — your view changes to match.
            </p>
          </div>
          <a href="/login" className="btn-primary mt-4 inline-flex md:mt-0">
            Sign in
          </a>
        </section>
      )}
    </div>
  );
}

