import { loadDrills } from "@platform/corpus";
import { getSession } from "./lib/session";
import { getFieldsRepos } from "./lib/fields";
import { FIELD_SEEDS } from "./lib/fieldsSeed";
import { Hero, FeatureGrid, RoleTile } from "./components/ui";
import { SmartSearch } from "./components/SmartSearch";

// Stats need a live repo read for review counts; force-dynamic so the SSG
// build doesn't freeze a "0 fields" snapshot from an empty in-memory store.
export const dynamic = "force-dynamic";

export default async function Home() {
  const drills = loadDrills();
  const publishedDrills = drills.filter((d) => d.review_status === "published").length;
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  // Field count is corpus-like: seed catalog is the source of truth, so it
  // matches /fields exactly even if a fresh serverless invocation hasn't
  // populated its in-memory store yet.
  let fieldsCount = FIELD_SEEDS.length;
  let reviewsCount = 0;
  try {
    const repos = await getFieldsRepos();
    const live = (await repos.fields.list()).length;
    if (live > fieldsCount) fieldsCount = live;
    reviewsCount = (await repos.fieldReviews.list()).length;
  } catch {
    /* fields module optional at boot */
  }

  return (
    <div className="space-y-12">
      <Hero
        eyebrow="First Pitch: know before you throw"
        title={
          <>
            Know before you <em>throw</em>. Plan, train, track.
          </>
        }
        description="Inclusive youth-baseball training, planning, and tracking for every kid on the roster. Compile a safe practice in under a minute, scout the field before you book it, and watch each player grow."
        primary={session ? { href: "/coach", label: "Open coach console" } : { href: "/practice/new", label: "Try the compiler, no signup" }}
        secondary={{ href: "/fields", label: `Browse ${fieldsCount || ""} fields →`.replace("  ", " ") }}
        stats={[
          { value: publishedDrills, label: "Drills vetted" },
          { value: fieldsCount, label: "Fields scouted" },
          ...(reviewsCount > 0
            ? [{ value: reviewsCount, label: reviewsCount === 1 ? "Honest review" : "Honest reviews" }]
            : []),
        ]}
        ticker="LOCAL ROLLOUT · Bellevue · Issaquah · more dirt soon"
      />

      <SmartSearch />

      <section>
        <FeatureGrid
          items={[
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
          <h2 className="m-0">Who&apos;s it for?</h2>
          <span className="quote text-sm">Three roles, three landings. Sign in unlocks personal views</span>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <RoleTile
            href="/for/coach"
            title="Coaches"
            description="Compile a safe practice in under a minute. Roster, lineups, RSVPs, drill library, Pitch Smart enforcement."
            cta="For coaches"
          />
          <RoleTile
            href="/for/parent"
            title="Parents"
            description="Schedules, RSVPs, position plans, 5-minute home missions, honest field reviews. One family dashboard."
            cta="For parents"
          />
          <RoleTile
            href="/for/athlete"
            title="Athletes"
            description="Triple Play baseball-IQ reps, backyard missions tailored to your position, and a clear explanation of your role."
            cta="For athletes"
          />
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Jump straight in</h2>
          <span className="quote text-sm">Skip the landing pages, go to the tool</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RoleTile
            href="/practice/new"
            title="Build a practice"
            description="Pick age, length, and focus areas. Get a printable plan back in under a minute."
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
            description="Position-aware baseball-IQ scenarios. Quick reps for players and parents, in the car, dugout, or living room."
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
            description="Your shortlist of diamonds. Pull it up before you book."
            cta="Open shortlist"
          />
        </div>
      </section>

      {!session && (
        <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h3>Sign in to save plans, fields, and missions</h3>
            <p className="mt-2 text-sm text-ink/80">
              Coach, parent, or player. Your view changes to match. No password. Magic link, you click it, you&apos;re in.
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

