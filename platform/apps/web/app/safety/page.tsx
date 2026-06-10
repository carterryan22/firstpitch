import Link from "next/link";
import { loadSafetyRules, loadSources } from "@platform/corpus";
import { EnforcementBadge, type EnforcementTone } from "../components/ui";

const SECTIONS: Array<{ key: EnforcementTone; title: string; description: string }> = [
  {
    key: "hard_block",
    title: "Hard blocks",
    description: "Compiler will refuse to ship a plan that violates these.",
  },
  {
    key: "warn_and_label",
    title: "Warn & label",
    description: "Plans can include these, but coaches and parents see a labeled warning.",
  },
  {
    key: "informational",
    title: "Informational",
    description: "Surfaced as context, no enforcement.",
  },
];

export const metadata = {
  title: "Safety rules",
  description:
    "The Tier-1 safety corpus that gates every First Pitch practice plan, sourced from Pitch Smart, NSCA, CDC, and Stop Sports Injuries.",
};

export default function SafetyPage() {
  const { rules } = loadSafetyRules();
  const byKind = SECTIONS.map((section) => ({
    ...section,
    rules: rules.filter((r) => r.enforcement === section.key),
  }));
  const counts = Object.fromEntries(byKind.map((s) => [s.key, s.rules.length])) as Record<EnforcementTone, number>;

  // Unique Tier-1 sources powering the corpus.
  const tier1Sources = Array.from(
    new Map(
      loadSources()
        .filter((s) => s.source_tier === "Tier 1" && s.url && !s.url.startsWith("internal://"))
        .map((s) => [s.source_name, s]),
    ).values(),
  );

  return (
    <div className="space-y-12">
      <header className="max-w-3xl space-y-3">
        <p className="quote text-xs uppercase tracking-[0.18em] text-dirt-700">The corpus that gates every plan</p>
        <h1 className="m-0">Safety, enforced. Not suggested.</h1>
        <p className="text-slate-700">
          {rules.length} Tier-1 rules pulled from USA Baseball Pitch Smart, NSCA Youth Training &amp; Conditioning,
          the CDC, and Stop Sports Injuries. Every rule is cited in the practice compiler and reviewed before it
          ever gates a plan.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/practice/new" className="btn-primary no-underline hover:no-underline">
            Compile a plan with these rules
          </Link>
          <Link href="/policy" className="btn no-underline hover:no-underline">
            Read our AI &amp; data policy
          </Link>
        </div>
        <p className="quote text-xs text-slate-600">Last reviewed: 2026-05-27 · Corpus v1</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {byKind.map((section) => (
          <a
            key={section.key}
            href={`#${section.key}`}
            className="card block no-underline hover:no-underline"
          >
            <div className="flex items-center justify-between gap-3">
              <EnforcementBadge kind={section.key} />
              <span className="text-2xl font-display">{counts[section.key]}</span>
            </div>
            <p className="mt-2 font-display text-base uppercase leading-tight">{section.title}</p>
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          </a>
        ))}
      </section>

      <section className="card max-w-3xl">
        <h2 className="m-0 text-base uppercase">In plain English</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink/85">
          <li>· Kids 9-12 are never asked to throw a breaking ball, period.</li>
          <li>· Pitch counts and rest days come from Pitch Smart and Little League, not coach guesswork.</li>
          <li>· Strength work for under-14s is bodyweight + technique only.</li>
          <li>· Water and rest breaks are scheduled into every plan, not optional.</li>
          <li>· Heat, sleep, and fatigue are surfaced as warnings on every compiled practice.</li>
          <li>· No AI feature ever diagnoses an injury or ranks a kid publicly. See our <a href="/policy" className="underline">platform policy</a>.</li>
        </ul>
      </section>

      <section className="card max-w-3xl">
        <h2 className="m-0 text-base uppercase">How it shows up in a plan</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink/85">
          <li><strong>1.</strong> Coach picks age, length, and focus areas in the compiler.</li>
          <li><strong>2.</strong> Every candidate drill is matched against the rules below by age band and domain.</li>
          <li><strong>3.</strong> Hard-block rules <em>remove</em> a drill from the plan; warn-and-label rules attach a labeled note; informational rules surface as context for the coach and parent.</li>
          <li><strong>4.</strong> The compiled plan ships with rule IDs and source links so anyone can audit why a drill was kept or cut.</li>
        </ol>
      </section>

      {byKind.map((section) => (
        <section key={section.key} id={section.key} className="space-y-4 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 flex items-center gap-3">
              {section.title}
              <span className="text-sm font-normal text-slate-600">({section.rules.length})</span>
            </h2>
            <p className="text-sm text-slate-600">{section.description}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {section.rules.map((r) => (
              <article
                key={r.rule_id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 text-base">{r.rule_text}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {r.domain.replace(/_/g, " ")} · ages {r.age_band}
                    </p>
                  </div>
                  <EnforcementBadge kind={r.enforcement} />
                </header>
                <footer className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <details className="text-[11px] text-slate-400">
                    <summary className="cursor-pointer select-none">Technical details</summary>
                    <code className="mt-1 inline-block bg-slate-100 px-1.5 py-0.5">{r.rule_id}</code>
                  </details>
                  {r.source_url && !r.source_url.startsWith("internal://") ? (
                    <a
                      href={r.source_url}
                      className="text-slate-600 no-underline hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.source_name} ↗
                    </a>
                  ) : r.source_name === "Platform policy" ? (
                    <a href="/policy" className="text-slate-600 no-underline hover:underline">
                      Platform policy ↗
                    </a>
                  ) : (
                    <span className="text-slate-500">{r.source_name}</span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <header className="flex items-end justify-between">
          <h2 className="m-0">Tier-1 sources</h2>
          <span className="quote text-sm text-slate-600">Public, dated, and reviewable</span>
        </header>
        <ul className="grid gap-3 md:grid-cols-2">
          {tier1Sources.map((s) => (
            <li key={s.source_name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <a href={s.url} target="_blank" rel="noreferrer" className="text-ink no-underline hover:underline">
                <p className="m-0 text-sm font-semibold">{s.source_name} ↗</p>
              </a>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{s.topic} · ages {s.age_band}</p>
              <p className="mt-2 text-sm text-slate-700">{s.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-2 border-ink bg-dirt-100 p-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <h3 className="m-0">Ready to put these rules to work?</h3>
          <p className="mt-2 text-sm text-ink/80">Compile a plan and every drill is screened against the corpus above, with citations attached.</p>
        </div>
        <Link href="/practice/new" className="btn-primary mt-4 inline-flex md:mt-0 no-underline hover:no-underline">
          Open the compiler
        </Link>
      </section>
    </div>
  );
}

