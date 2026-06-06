import Link from "next/link";
import { GEAR_CATALOG, GEAR_DISCLOSURE, categoryLabel } from "@platform/gear";
import { Hero } from "../components/ui";
import { GearTest } from "./GearTest";
import { GearCard } from "./GearCard";

export const metadata = {
  title: "Gear test — what your player actually needs",
  description:
    "Answer four questions and get a tailored youth-baseball gear kit, cheapest rep-getters first. Honest picks with ratings — no signup.",
};

export const dynamic = "force-dynamic";

const AMAZON_TAG = process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG;

export default function GearPage() {
  // Group the full catalog by category for the buyer's-guide section.
  const byCategory = new Map<string, typeof GEAR_CATALOG>();
  for (const p of GEAR_CATALOG) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  const categories = Array.from(byCategory.keys()).sort((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b)),
  );

  return (
    <div className="space-y-10">
      <Hero
        eyebrow="Gear, sorted"
        title={
          <>
            Stop guessing what <em>gear</em> to buy.
          </>
        }
        description="Take the gear test and we'll build a kit for your player's age, focus, and budget — cheapest thing that gets the rep done, first. Every pick is a real recommendation, not a catalog dump."
        primary={{ href: "#gear-test", label: "Take the gear test" }}
        secondary={{ href: "#guide", label: "Browse all gear" }}
        stats={[
          { value: GEAR_CATALOG.length, label: "Picks reviewed" },
          { value: categories.length, label: "Categories" },
          { value: "$0", label: "To get started" },
        ]}
      />

      <div className="card border-l-4 border-warn bg-warn/5">
        <p className="m-0 text-sm text-ink/80">
          <strong className="uppercase tracking-[0.1em]">Heads up:</strong> {GEAR_DISCLOSURE}
        </p>
      </div>

      <GearTest amazonTag={AMAZON_TAG} />

      <section id="guide" className="space-y-8">
        <div>
          <p className="eyebrow">The full list</p>
          <h2 className="m-0 text-3xl">Every pick, by category</h2>
          <p className="mt-1 text-sm text-ink/70">
            Want the plan that uses this gear?{" "}
            <Link href="/practice/new" className="underline">Build a practice</Link> or{" "}
            <Link href="/drills" className="underline">browse drills</Link>.
          </p>
        </div>

        {categories.map((cat) => {
          const products = (byCategory.get(cat) ?? []).slice().sort((a, b) => a.price_tier - b.price_tier);
          return (
            <div key={cat} className="space-y-3">
              <h3 className="m-0 text-lg uppercase">{categoryLabel(cat)}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <GearCard key={p.id} product={p} amazonTag={AMAZON_TAG} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-xs italic text-ink/60">{GEAR_DISCLOSURE}</p>
    </div>
  );
}
