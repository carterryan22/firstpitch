import type { Metadata } from "next";
import Link from "next/link";
import {
  BATTING_ORDER_CHARACTERS,
  FIELDING_CHARACTERS,
  type RoleCharacter,
} from "./characters";
import { PrintButton } from "../../components/PrintButton";

export const metadata: Metadata = {
  title: "Your Role on the Team",
  description:
    "Every spot in the batting order and every position on the field has a job, and a personality. Meet the characters that make a baseball team work.",
};

export default function RolesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Learning · Roles &amp; Positions
        </p>
        <h1 className="m-0">Your Role on the Team</h1>
        <p className="max-w-3xl text-slate-600">
          A great team is nine kids doing nine different jobs really well, not
          nine kids all trying to be the same player. Find your spot, meet your
          character, and learn why your role matters every single inning.
        </p>
        <div className="flex flex-wrap gap-2 pt-2 text-sm print:hidden">
          <a href="#batting" className="btn-ghost no-underline">
            Batting order →
          </a>
          <a href="#fielding" className="btn-ghost no-underline">
            Fielding positions →
          </a>
          <Link href="/learn" className="btn-ghost no-underline">
            ← Back to Triple Play
          </Link>
          <PrintButton />
        </div>
      </header>

      <section id="batting" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <div>
            <h2 className="m-0">The Batting Order</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Nine spots, nine jobs, plus three more if your team bats
              everyone. Coaches don&apos;t put the best hitter first and the
              &quot;worst&quot; hitter last. They build a lineup like a story,
              with each spot setting up the next.
            </p>
          </div>
          <span className="badge-info">1 → 12</span>
        </div>

        <figure className="rounded-2xl border-l-4 border-brand-500 bg-brand-50/60 p-5">
          <blockquote className="m-0 text-base font-medium text-slate-900">
            &ldquo;Your spot is not your rank. Your spot is your mission. Know
            your job, get on base, run hard, and pass the bat.&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Coach
          </figcaption>
        </figure>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BATTING_ORDER_CHARACTERS.map((c) => (
            <RoleCard key={c.id} c={c} kind="batting" />
          ))}
        </div>
      </section>

      <section id="fielding" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <div>
            <h2 className="m-0">Fielding Positions</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Pitcher to right field. Every glove on the diamond has a
              superpower. Some you see on every pitch, some win the game with
              one play. All nine matter.
            </p>
          </div>
          <span className="badge-info">9 positions</span>
        </div>

        <figure className="rounded-2xl border-l-4 border-brand-500 bg-brand-50/60 p-5">
          <blockquote className="m-0 text-base font-medium text-slate-900">
            &ldquo;Every position has a job. Know your role, talk loud, back up
            the play, and turn the ball into outs.&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Coach
          </figcaption>
        </figure>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FIELDING_CHARACTERS.map((c) => (
            <RoleCard key={c.id} c={c} kind="fielding" />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-500/30 bg-brand-50/60 p-6">
        <h3 className="mt-0 text-brand-900">No role is bigger than the team</h3>
        <p className="mt-2 text-sm text-slate-700">
          A leadoff hitter who can&apos;t bunt loses games. A right fielder who
          backs up first base on every grounder wins them. The best players in
          the world are the ones who learn <em>their</em> job first, and then
          help the player next to them do <em>theirs</em>.
        </p>
      </section>
    </div>
  );
}

function RoleCard({
  c,
  kind,
}: {
  c: RoleCharacter;
  kind: "batting" | "fielding";
}) {
  const badge = kind === "batting" ? `#${c.id}` : c.code ?? c.id;
  return (
    <article className="card flex h-full flex-col gap-3">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {c.subtitle}
          </div>
          <h3 className="m-0 text-lg">
            <span aria-hidden className="mr-2">
              {c.emoji}
            </span>
            {c.name}
          </h3>
        </div>
        <span className="badge-info shrink-0">{badge}</span>
      </header>

      <p className="text-sm italic text-slate-700">&ldquo;{c.tagline}&rdquo;</p>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          What this role does
        </div>
        <p className="mt-1 text-sm text-slate-700">{c.job}</p>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Superpower
        </div>
        <p className="mt-1 text-sm text-slate-700">{c.superpower}</p>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Why the team needs you
        </div>
        <p className="mt-1 text-sm text-slate-700">{c.whyMatters}</p>
      </div>

      {c.proTip ? (
        <div className="mt-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Pro tip: </span>
          {c.proTip}
        </div>
      ) : null}
    </article>
  );
}
