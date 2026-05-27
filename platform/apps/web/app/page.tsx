import { loadSafetyRules, loadDrills } from "@platform/corpus";
import { getSession } from "./lib/session";
import { getRepos } from "@platform/storage";
import { Hero, FeatureGrid, RoleTile } from "./components/ui";

export default async function Home() {
  const rules = loadSafetyRules().rules;
  const drills = loadDrills();
  const publishedDrills = drills.filter((d) => d.review_status === "published").length;
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  let fieldsCount = 0;
  let reviewsCount = 0;
  try {
    const repos = getRepos();
    fieldsCount = (await repos.fields.list()).length;
    reviewsCount = (await repos.fieldReviews.list()).length;
  } catch {
    /* fields module optional at boot */
  }

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="Real dirt on every diamond"
        title={
          <>
            Don&apos;t show up to a field <em>blind</em>.
          </>
        }
        description="Compile age-appropriate practice plans in under a minute. Scout the field before you book it. Every drill is gated by USA Baseball Pitch Smart, an age-band matrix, and our typed safety corpus — no surprises, no splinters."
        primary={session ? { href: "/coach", label: "Open coach console" } : { href: "/practice/new", label: "Build a practice plan" }}
        secondary={{ href: "/fields", label: `Browse ${fieldsCount || ""} fields →`.replace("  ", " ") }}
        stats={[
          { value: publishedDrills, label: "Drills vetted" },
          { value: rules.length, label: "Safety rules enforced" },
          { value: fieldsCount, label: "Fields scouted" },
          { value: reviewsCount, label: "Honest reviews" },
        ]}
        ticker="LOCAL ROLLOUT · Bellevue · Issaquah · more dirt soon"
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
              title: "Spill the dirt on every field",
              description: "Real fence dimensions. Real bathroom situations. Real warnings about where the foul balls go. Reviews from people who actually played there.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Pick where you are today</h2>
          <span className="quote text-sm">Role-aware — sign in unlocks personal views</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RoleTile
            href="/practice/new"
            title="Build a practice"
            description="Pick age, length, and focus areas. The compiler returns a safety-checked plan."
            cta="Open compiler"
          />
          <RoleTile
            href="/fields"
            title="Scout a field"
            description="Browse diamonds with quick facts, honest reviews, and a one-tap booking request."
            cta="Find your diamond"
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
            href="/learn"
            title="Triple Play game"
            description="Position-aware baseball-IQ scenarios. Quick reps for players and parents — in the car, dugout, or living room."
            cta="Play & learn"
          />
          <RoleTile
            href="/learn/roles"
            title="Your role on the team"
            description="Meet the character behind every batting-order spot and fielding position. Kids learn why their job matters."
            cta="Meet the roles"
          />
          <RoleTile
            href="/favorites"
            title="★ Saved fields"
            description="Your shortlist of diamonds — pull it up before you book."
            cta="Open shortlist"
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
        <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3>Sign in to save plans, fields, and missions</h3>
            <p className="mt-2 text-sm text-ink/80">
              Coach, parent, player, or clinician — your view changes to match. No password. Magic link, you click it, you&apos;re in.
            </p>
          </div>
          <a href="/login" className="btn-primary mt-4 inline-flex md:mt-0 no-underline hover:no-underline">
            Send magic link
          </a>
        </section>
      )}
    </div>
  );
}

