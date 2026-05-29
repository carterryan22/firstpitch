import { getSession } from "../../lib/session";
import { Hero, FeatureGrid, RoleTile } from "../../components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For parents — Know what's happening, support your kid",
  description:
    "Game and practice schedules, RSVPs, short home missions tailored to your kid's positions, and honest coach notes — all in one family dashboard.",
};

export default async function ForParent() {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  const signedInAsParent = session?.user.role === "parent" || session?.user.role === "player";

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="For parents & guardians"
        title={
          <>
            Be the parent in the stands <em>who actually knows what&apos;s going on.</em>
          </>
        }
        description="Schedules, RSVPs, position plans, and short home missions tailored to your kid's spot in the lineup. No more decoding group texts at 9pm."
        primary={
          signedInAsParent
            ? { href: "/parent", label: "Open family dashboard" }
            : { href: "/login", label: "Sign in to see your kid" }
        }
        secondary={{ href: "/missions", label: "Browse home missions →" }}
        stats={[
          { value: "5 min", label: "Daily home mission" },
          { value: "1", label: "Family dashboard" },
          { value: "0", label: "Group-text scrolling" },
        ]}
        ticker="PARENT MODE · RSVPs · Position plans · Coach notes you can actually read"
      />

      <section>
        <FeatureGrid
          items={[
            {
              title: "One inbox for the season",
              description: "Upcoming games and practices for every kid on every team, with one-tap RSVP. No more guessing whether Saturday is home or away.",
            },
            {
              title: "Why your kid is playing where they're playing",
              description: "Each game's lineup includes a plain-English position plan: what skills it targets and what to work on at home.",
            },
            {
              title: "5-minute home missions",
              description: "Short drills tailored to your kid's age and the positions they're learning. Doable in the backyard, garage, or living room.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">What you can do as a parent</h2>
          <span className="quote text-sm">All real routes — explore now</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RoleTile
            href="/parent"
            title="Family dashboard"
            description="Every kid, every team, upcoming events, recent coach notes, and the next home mission."
            cta="Open dashboard"
          />
          <RoleTile
            href="/missions?age=11"
            title="Home missions"
            description="One short drill per practice. Pick your kid's age and the missions filter automatically."
            cta="See missions"
          />
          <RoleTile
            href="/learn"
            title="Triple Play game"
            description="Baseball-IQ scenarios for the car ride home. Quick reps with no equipment."
            cta="Play & learn"
          />
          <RoleTile
            href="/fields"
            title="Scout the field"
            description="Bathrooms, parking, shade, snack situation. Real reviews from parents who actually sat there."
            cta="Find your diamond"
          />
          <RoleTile
            href="/safety"
            title="What the coach is allowed to do"
            description="The same safety rulebook the coach's plans are gated by. Pitch counts, heat rules, contact limits."
            cta="Read the rules"
          />
          <RoleTile
            href="/favorites"
            title="★ Saved fields"
            description="Your shortlist of diamonds — pull it up before the carpool conversation starts."
            cta="Open shortlist"
          />
        </div>
      </section>

      {!signedInAsParent && (
        <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3>Sign in as a parent to connect to your kid&apos;s team</h3>
            <p className="mt-2 text-sm text-ink/80">
              Magic-link sign-in. No password. Pick &quot;Parent&quot; on your first login and your family dashboard unlocks once a coach adds your kid.
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
