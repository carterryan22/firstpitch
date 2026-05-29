import Link from "next/link";
import { getFieldsRepos, starRating, stars } from "../lib/fields";
import { Hero, LocationEyebrow } from "../components/ui";

export const metadata = { title: "Find your diamond" };

const SURFACE_LABELS: Record<string, string> = {
  grass: "Grass",
  turf: "Turf",
  dirt: "Dirt",
  mixed: "Mixed",
};

interface SearchParams {
  q?: string;
  city?: string;
  surface?: string;
  lights?: string;
}

export default async function FieldsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const repos = await getFieldsRepos();
  const query = sp.q?.trim() ?? "";
  const validSurfaces = ["grass", "turf", "dirt", "mixed"];
  const rawSurface = sp.surface;
  const surface = rawSurface && validSurfaces.includes(rawSurface) ? rawSurface : undefined;
  const invalidSurface = rawSurface && !surface ? rawSurface : null;
  const allFields = await repos.fields.list({
    query,
    city: sp.city || undefined,
    surface,
    lights: sp.lights === "1" ? true : sp.lights === "0" ? false : undefined,
  });
  const allReviews = await repos.fieldReviews.list();
  const reviewsByField = new Map<string, typeof allReviews>();
  for (const r of allReviews) {
    const list = reviewsByField.get(r.fieldId) ?? [];
    list.push(r);
    reviewsByField.set(r.fieldId, list);
  }
  const totalFields = (await repos.fields.list()).length;
  const cities = Array.from(new Set(allFields.map((f) => f.city))).sort();

  return (
    <div className="space-y-10">
      <Hero
        eyebrow="Fields directory"
        title={
          <>
            Find your <em>diamond</em>.
          </>
        }
        description="Reviews from people who actually played there. Real fence dimensions. Real bathroom situations. Real warnings about where the foul balls go."
        primary={{ href: "#list", label: "Browse fields" }}
        secondary={{ href: "/favorites", label: "★ Saved fields" }}
        stats={[
          { value: totalFields, label: "Fields scouted" },
          { value: allReviews.length, label: "Honest reviews" },
          { value: cities.length, label: "Cities covered" },
        ]}
      />

      <form
        id="list"
        className="card flex flex-wrap items-end gap-3"
        action="/fields"
        method="get"
      >
        <div className="flex-1 min-w-[240px]">
          <label className="label" htmlFor="q">City, ZIP, or field name</label>
          <input id="q" name="q" defaultValue={query} className="input" placeholder="Bellevue, Issaquah, Robinswood…" />
        </div>
        <div>
          <label className="label" htmlFor="surface">Surface</label>
          <select id="surface" name="surface" defaultValue={sp.surface ?? ""} className="input">
            <option value="">Any</option>
            <option value="grass">Grass</option>
            <option value="turf">Turf</option>
            <option value="dirt">Dirt</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lights">Lights</label>
          <select id="lights" name="lights" defaultValue={sp.lights ?? ""} className="input">
            <option value="">Any</option>
            <option value="1">Lit</option>
            <option value="0">No lights</option>
          </select>
        </div>
        <button type="submit" className="btn-dark">⌖ Search</button>
        {(query || sp.surface || sp.lights) ? (
          <Link href="/fields" className="quote text-sm underline">Clear</Link>
        ) : null}
      </form>

      <section>
        {invalidSurface ? (
          <p className="card text-sm">
            Unknown surface <code>{invalidSurface}</code>. Try {validSurfaces.join(", ")}, or{" "}
            <Link href="/fields" className="underline">clear filters</Link>. Showing unfiltered list.
          </p>
        ) : null}
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">{allFields.length} of {totalFields} fields</span>
          <Link href="/fields?book=1" className="btn-primary no-underline hover:no-underline">⚾ Book a field</Link>
        </div>
        {allFields.length === 0 ? (
          <p className="quote">
            No diamonds match those filters. Try{" "}
            <Link href="/fields" className="underline">clearing filters</Link>.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allFields.map((f) => {
              const rs = starRating(reviewsByField.get(f.id) ?? []);
              return (
                <li key={f.id}>
                  <Link
                    href={`/fields/${f.slug}`}
                    className="block h-full no-underline hover:no-underline"
                  >
                    <div className="card h-full transition hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard">
                      <LocationEyebrow city={f.city} state={f.state} />
                      <h3 className="mt-1">{f.name}</h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {rs.count > 0 ? (
                          <span className="quote text-ink">{stars(rs.avg)} <span className="text-dirt-300">{rs.avg.toFixed(1)} · {rs.count}</span></span>
                        ) : (
                          <span className="quote">No reviews yet</span>
                        )}
                        <span className="badge">{f.type === "tee-ball" ? "T-Ball" : f.type.toUpperCase()}</span>
                        <span className="badge">{SURFACE_LABELS[f.surface] ?? f.surface}</span>
                        {f.lights ? <span className="badge-ok">Lit</span> : null}
                      </div>
                      {f.notes ? <p className="mt-3 text-sm text-ink/75">{f.notes}</p> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
