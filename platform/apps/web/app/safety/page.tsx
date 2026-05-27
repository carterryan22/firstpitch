import { loadSafetyRules } from "@platform/corpus";
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
    description: "Surfaced as context — no enforcement.",
  },
];

export const metadata = { title: "Safety rules" };

export default function SafetyPage() {
  const { rules } = loadSafetyRules();
  const byKind = SECTIONS.map((section) => ({
    ...section,
    rules: rules.filter((r) => r.enforcement === section.key),
  }));

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1>Tier-1 safety rules</h1>
        <p className="mt-2 text-slate-600">
          {rules.length} rules pulled from USA Baseball Pitch Smart, NSCA, the CDC, and platform
          policy. Every rule is keyed by <code>rule_id</code> and cited in the practice compiler.
        </p>
      </header>

      {byKind.map((section) => (
        <section key={section.key} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 flex items-center gap-3">
              {section.title}
              <span className="text-sm font-normal text-slate-500">({section.rules.length})</span>
            </h2>
            <p className="text-sm text-slate-500">{section.description}</p>
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
                  <code className="bg-slate-100 px-1.5 py-0.5">{r.rule_id}</code>
                  <a
                    href={r.source_url}
                    className="text-slate-600 no-underline hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.source_name} ↗
                  </a>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

