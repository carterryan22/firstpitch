import { getSession } from "../../lib/session";
import { Hero, FeatureGrid, RoleTile } from "../../components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "For athletes: Know your role, get your reps",
  description:
    "Triple Play scenarios for baseball-IQ reps, position-aware drills, and home missions you can do in the backyard. Short, focused, age-appropriate.",
};

export default async function ForAthlete() {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  const signedInAsPlayer = session?.user.role === "player";

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="For players, ages 6–16"
        title={
          <>
            Get your reps in. <em>Even when practice is canceled.</em>
          </>
        }
        description="Short drills you can do in the backyard, baseball-IQ scenarios for the car, and a clear explanation of why your spot in the lineup actually matters."
        primary={
          signedInAsPlayer
            ? { href: "/parent", label: "Open my dashboard" }
            : { href: "/learn", label: "Play Triple Play" }
        }
        secondary={{ href: "/missions?age=11", label: "Today's home mission →" }}
        stats={[
          { value: "5 min", label: "Per mission" },
          { value: "9", label: "Positions to master" },
          { value: "∞", label: "Reps you can stack" },
        ]}
        ticker="ATHLETE MODE · Backyard reps · Car-ride IQ · Position-aware"
      />

      <section>
        <FeatureGrid
          items={[
            {
              title: "Triple Play: baseball IQ on demand",
              description: "Position-aware scenarios. Runner on second, one out, ball hit to short. Where do you go? Quick reps that make game day slower in your head.",
            },
            {
              title: "Home missions tailored to your spot",
              description: "Pick your age and the missions filter to drills that target the positions you actually play. No equipment? There's a living-room version.",
            },
            {
              title: "Know your role",
              description: "Every spot in the batting order and every fielding position has a character with a job. Learn yours so you stop guessing at game time.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Pick up where you left off</h2>
          <span className="quote text-sm">Tap and go, no setup</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RoleTile
            href="/learn"
            title="Triple Play game"
            description="Baseball-IQ scenarios for the car, dugout, or living room. Position-aware, age-appropriate."
            cta="Play now"
          />
          <RoleTile
            href="/learn/roles"
            title="Your role on the team"
            description="Meet the character behind every batting-order spot and fielding position. Learn why your job matters."
            cta="Meet the roles"
          />
          <RoleTile
            href="/missions?age=11"
            title="Home missions"
            description="Short drills for the backyard. Pick your age. Missions filter to fit."
            cta="See missions"
          />
          <RoleTile
            href="/drills"
            title="Drill library"
            description="Browse the full drill library. Filter by tier, equipment, and what you're trying to get better at."
            cta="Browse drills"
          />
          <RoleTile
            href="/fields"
            title="Scout the field"
            description="What does the diamond look like? Fences, dugouts, dirt. Show up knowing what's there."
            cta="Find your diamond"
          />
          <RoleTile
            href="/safety"
            title="Why coach won't let you throw 80 pitches"
            description="The same rulebook coaches use. Pitch counts, rest days, heat rules, straight from Pitch Smart."
            cta="Read the rules"
          />
        </div>
      </section>

      {!signedInAsPlayer && (
        <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3>Got an account? Sign in to track your missions and goals</h3>
            <p className="mt-2 text-sm text-ink/80">
              Most players sign in through their parent&apos;s account. Ask a parent or coach to set you up, then your dashboard tracks the reps you put in.
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
