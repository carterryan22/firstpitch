import Link from "next/link";

export const metadata = {
  title: "Platform policy",
  description:
    "First Pitch product, AI, and safety policy. What we cite, what we won't ship, and how we treat your family's data.",
};

export default function PolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Platform policy</p>
        <h1>What we will and won&apos;t do with your team.</h1>
        <p className="text-ink/80">
          We build for kids and parents first. These are the rules we hold ourselves to. They&apos;re
          short on purpose.
        </p>
        <p className="text-xs text-ink/60">Last reviewed: 2026-05-27.</p>
      </header>

      <section className="space-y-3">
        <h2 className="m-0">Safety is a hard gate, not a setting.</h2>
        <p>
          Every practice plan is run through a typed corpus of Tier-1 safety rules pulled from USA
          Baseball Pitch Smart, Little League International, the NSCA, HSS, the CDC, GSSI, and the
          Sleep Foundation. Rules are versioned, sourced, and dated. See{" "}
          <Link href="/safety" className="underline">the rulebook</Link> for the full list. The
          compiler refuses to ship a plan that violates a hard-block rule. Warn-and-label rules
          are surfaced in every compiled plan, every time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">AI never replaces a coach, doctor, or parent.</h2>
        <p>
          We use AI to draft text, summarize, and search, never to diagnose injuries, predict
          college recruitment, rank kids publicly, or give mental-health advice. Read the full{" "}
          <Link href="/policy/ai-boundaries" className="underline">AI boundaries page</Link> for
          what&apos;s in and out of scope.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Field information is community-owned.</h2>
        <p>
          Anyone can browse the field directory without an account. Reviews require a magic-link
          login so we can keep spam off. Field claims by owners, parks staff, schools, or league
          admins go through manual review before any edit becomes public. We never let one
          claimant silently overwrite community-sourced facts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Booking requests are honest about routing.</h2>
        <p>
          For most fields we don&apos;t yet have a direct booking integration. When you submit a
          booking request, we capture it for the field manager and email you the official booking
          contact or link. We&apos;ll never charge for a slot we can&apos;t actually deliver.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">What we won&apos;t do with your data.</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>We won&apos;t sell or rent personally identifiable data, ever.</li>
          <li>We won&apos;t publish a player&apos;s metrics, video, or notes outside their team without explicit coach + parent action.</li>
          <li>We won&apos;t use your team&apos;s data to train third-party models without an opt-in.</li>
          <li>We won&apos;t keep deleted accounts beyond what the law requires.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Reporting a problem.</h2>
        <p>
          Bad field info, safety concern, mistaken claim, or anything that feels off, email{" "}
          <a href="mailto:hello@firstpitch.app" className="underline">hello@firstpitch.app</a>.
          For urgent safety issues affecting a kid right now, contact your local emergency
          services first. We&apos;re a planning tool, not an emergency service.
        </p>
      </section>

      <footer className="border-t-2 border-dirt-200 pt-6 text-xs text-ink/60">
        This policy will keep getting clearer. If something is ambiguous, write us. We&apos;ll fix it
        in plain English and date the change.
      </footer>
    </article>
  );
}
