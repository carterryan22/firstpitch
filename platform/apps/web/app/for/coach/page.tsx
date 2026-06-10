import { loadSafetyRules, loadDrills } from "@platform/corpus";
import { getSession } from "../../lib/session";
import { Hero, FeatureGrid, RoleTile } from "../../components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For coaches: Build a safe practice in under a minute",
  description:
    "Compile age-appropriate practice plans gated by Pitch Smart, NSCA, and CDC. Manage your roster, share plans, and never guess at pitch counts again.",
};

export default async function ForCoach() {
  const rules = loadSafetyRules().rules;
  const publishedDrills = loadDrills().filter((d) => d.review_status === "published").length;
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  const signedInAsCoach = session?.user.role === "coach" || session?.user.role === "admin";

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="For head coaches & assistants"
        title={
          <>
            Show up with a plan. <em>Not a clipboard full of guesses.</em>
          </>
        }
        description="Pick age, length, and focus areas. The compiler returns a safety-checked practice plan with warm-up, station rotations, and a closer, gated by Pitch Smart pitch counts, weather rules, and equipment on hand."
        primary={
          signedInAsCoach
            ? { href: "/coach", label: "Open coach dashboard" }
            : { href: "/practice/new", label: "Build a practice plan" }
        }
        secondary={{ href: signedInAsCoach ? "/practice/new" : "/login", label: signedInAsCoach ? "New practice →" : "Sign in to save plans →" }}
        stats={[
          { value: publishedDrills, label: "Drills vetted" },
          { value: rules.length, label: "Safety rules enforced" },
          { value: "<60s", label: "To a printable plan" },
        ]}
        ticker="COACH MODE · Pitch Smart compliant · Roster-aware · Print or share"
      />

      <section>
        <FeatureGrid
          items={[
            {
              title: "Safety isn't optional",
              description: `${rules.length} Tier-1 rules from Pitch Smart, NSCA, CDC, and Stop Sports Injuries compile into hard blocks, warnings, and labels you can show parents.`,
            },
            {
              title: "Drills filtered for the team you've got",
              description: `${publishedDrills} published drills filtered by age band, environment (field / cage / backyard), and the equipment you actually own.`,
            },
            {
              title: "Roster, lineups, RSVPs in one place",
              description: "Create teams, invite parents, set the lineup, collect RSVPs. Coach chat keeps practice notes off group texts.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Your coach workflow</h2>
          <span className="quote text-sm">Each tile is a real route. Try them now</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RoleTile
            href="/practice/new"
            title="Build a practice"
            description="Age, length, focus → safety-checked plan. Edit, print, share with parents."
            cta="Open compiler"
          />
          <RoleTile
            href="/coach"
            title="Coach dashboard"
            description="Teams, rosters, scheduled practices, and a one-tap path to today's plan."
            cta="Open dashboard"
          />
          <RoleTile
            href="/drills"
            title="Drill library"
            description={`Browse ${publishedDrills} drills with tier, age band, and equipment filters.`}
            cta="Browse drills"
          />
          <RoleTile
            href="/fields"
            title="Scout a field"
            description="Real fence dimensions, bathroom situations, and warnings about where foul balls go."
            cta="Find your diamond"
          />
          <RoleTile
            href="/safety"
            title="Safety rulebook"
            description="The corpus that gates every plan. Sourced, dated, reviewable. Show parents anytime."
            cta="Read the rules"
          />
          <RoleTile
            href="/coach/chat"
            title="Coach chat"
            description="Ask the assistant for substitutions, drill swaps, or a sub plan when a parent bails 30 min before."
            cta="Open chat"
          />
        </div>
      </section>

      {!signedInAsCoach && (
        <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3>Sign in as a coach to save plans, manage rosters, and share with parents</h3>
            <p className="mt-2 text-sm text-ink/80">
              Magic-link sign-in. No password. Pick &quot;Coach&quot; on your first login and your dashboard unlocks.
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
