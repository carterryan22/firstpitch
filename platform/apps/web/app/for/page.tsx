import { RoleTile } from "../components/ui";

export const metadata = {
  title: "Who's it for?",
  description: "First Pitch is built for three roles: coaches, parents, and athletes. Pick yours.",
};

export default function ForIndex() {
  return (
    <div className="space-y-8">
      <header>
        <span className="eyebrow">Role-aware product</span>
        <h1 className="mt-4">Who&apos;s it for?</h1>
        <p className="mt-3 max-w-2xl text-ink/80">
          First Pitch wears three hats. Pick the one that fits you today. Every page below is a real,
          working surface, no marketing waiting list.
        </p>
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
    </div>
  );
}
