"use client";

import { useMemo, useState } from "react";
import {
  recommendGear,
  ownableCategories,
  AGE_BAND_OPTIONS,
  FOCUS_OPTIONS,
  BUDGET_OPTIONS,
  type AgeBandKey,
  type BudgetLevel,
  type GearFocus,
} from "@platform/gear";
import { GearCard } from "./GearCard";

export function GearTest({ amazonTag }: { amazonTag?: string }) {
  const [ageBand, setAgeBand] = useState<AgeBandKey>("9-12");
  const [focus, setFocus] = useState<GearFocus>("allaround");
  const [budget, setBudget] = useState<BudgetLevel>("standard");
  const [owned, setOwned] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const categories = useMemo(() => ownableCategories(), []);
  const kit = useMemo(
    () => (submitted ? recommendGear({ ageBand, focus, budget, owned }) : null),
    [submitted, ageBand, focus, budget, owned],
  );

  const toggleOwned = (value: string) =>
    setOwned((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  return (
    <section id="gear-test" className="space-y-6">
      <div className="card space-y-6">
        <div>
          <p className="eyebrow">The gear test</p>
          <h2 className="m-0 text-2xl">Answer 4 things, get a kit.</h2>
          <p className="mt-1 text-sm text-ink/70">No signup. We point you at the cheapest thing that gets the rep done first.</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">Who's it for?</legend>
          <div className="flex flex-wrap gap-2">
            {AGE_BAND_OPTIONS.map((o) => (
              <Chip key={o.value} active={ageBand === o.value} onClick={() => setAgeBand(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="label">What are you working on?</legend>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((o) => (
              <Chip key={o.value} active={focus === o.value} onClick={() => setFocus(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="label">Budget?</legend>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((o) => (
              <Chip key={o.value} active={budget === o.value} onClick={() => setBudget(o.value)} title={o.hint}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="label">Already own any of these? (we'll skip them)</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c.value} active={owned.includes(c.value)} onClick={() => toggleOwned(c.value)}>
                {owned.includes(c.value) ? "✓ " : ""}{c.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <button type="button" className="btn-primary" onClick={() => setSubmitted(true)}>
          {submitted ? "Update my kit" : "Build my gear kit →"}
        </button>
      </div>

      {kit ? (
        <div className="space-y-6">
          <div className="card border-2 border-ink bg-chalk">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-xl">Your kit</h3>
              <span className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
                ~${kit.priceLow}{kit.priceHigh > kit.priceLow ? `–$${kit.priceHigh}` : ""}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink/80">{kit.note}</p>
          </div>

          {kit.essentials.length > 0 ? (
            <div className="space-y-3">
              <h3 className="m-0 text-lg uppercase">Start here</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {kit.essentials.map((p) => (
                  <GearCard key={p.id} product={p} amazonTag={amazonTag} />
                ))}
              </div>
            </div>
          ) : (
            <p className="card text-sm text-ink/70">
              Looks like you're already stocked for that. Tweak the answers above to see other options.
            </p>
          )}

          {kit.niceToHave.length > 0 ? (
            <div className="space-y-3">
              <h3 className="m-0 text-lg uppercase">Nice to have</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {kit.niceToHave.map((p) => (
                  <GearCard key={p.id} product={p} amazonTag={amazonTag} />
                ))}
              </div>
            </div>
          ) : null}

          {kit.owned.length > 0 ? (
            <p className="text-sm text-ink/60">
              Skipped because you've got them: {kit.owned.map((p) => p.name).join(", ")}.
            </p>
          ) : null}

          <p className="text-xs italic text-ink/60">{kit.disclosure}</p>
        </div>
      ) : null}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center border-2 px-3 py-2 text-sm no-underline transition-colors ${
        active ? "border-ink bg-ink text-cream" : "border-ink/30 bg-transparent text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
