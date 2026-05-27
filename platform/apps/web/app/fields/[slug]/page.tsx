import Link from "next/link";
import { notFound } from "next/navigation";
import { getFieldsRepos, starRating, stars } from "../../lib/fields";
import { milesBetween } from "../../lib/fieldsSeed";
import { getSession } from "../../lib/session";
import { ReviewForm } from "./ReviewForm";
import { FavoriteButton } from "./FavoriteButton";

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const repos = await getFieldsRepos();
  const field = await repos.fields.bySlug(slug);
  if (!field) return { title: "Field not found" };
  return {
    title: field.name,
    description: `Honest reviews and quick facts for ${field.name} in ${field.city}, ${field.state}.`,
  };
}

const ROLE_TAG: Record<string, string> = {
  parent: "PARENT",
  coach: "COACH",
  player: "PLAYER",
  umpire: "UMP",
  other: "REGULAR",
};

const SURFACE_LABELS: Record<string, string> = {
  grass: "Grass",
  turf: "Turf",
  dirt: "Dirt",
  mixed: "Mixed",
};

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const repos = await getFieldsRepos();
  const field = await repos.fields.bySlug(slug);
  if (!field) notFound();

  const reviews = (await repos.fieldReviews.list({ fieldId: field.id })).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
  const rs = starRating(reviews);

  const allFields = await repos.fields.list();
  const nearby = allFields
    .filter((f) => f.id !== field.id)
    .map((f) => ({ field: f, distance: milesBetween(field, f) }))
    .filter((n) => n.field.city === field.city || n.distance < 5)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  const session = await getSession().catch(() => null);
  const userId = session?.user.id;
  const isFavorited = userId
    ? await repos.favorites.has(userId, "field", field.id)
    : false;

  const mapsHref = field.lat != null && field.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${field.lat},${field.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${field.name} ${field.city} ${field.state}`)}`;

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <Link href="/fields" className="quote text-sm">← All fields</Link>
        <div className="eyebrow">
          <Link href={`/fields?city=${encodeURIComponent(field.city)}`}>{field.city.toUpperCase()}</Link>, {field.state}
        </div>
        <h1>{field.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {rs.count > 0 ? (
            <span className="quote text-ink">{stars(rs.avg)} <span className="text-dirt-300">{rs.avg.toFixed(1)} · {rs.count} review{rs.count === 1 ? "" : "s"}</span></span>
          ) : (
            <span className="quote">No reviews yet — be the first to spill the dirt.</span>
          )}
          <FavoriteButton fieldId={field.id} initial={isFavorited} signedIn={Boolean(userId)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/fields/${field.slug}/book`} className="btn-primary no-underline hover:no-underline">
            ⚾ Book this field →
          </Link>
          <a href={mapsHref} target="_blank" rel="noreferrer" className="btn-ghost no-underline hover:no-underline">
            ↗ Open in Maps
          </a>
          {field.sourceUrl ? (
            <a href={field.sourceUrl} target="_blank" rel="noreferrer" className="btn-ghost no-underline hover:no-underline">
              ↗ Source
            </a>
          ) : null}
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h2 className="m-0">Quick facts</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Fact label="City" value={`${field.city}, ${field.state}`} />
              <Fact label="Type" value={field.type === "tee-ball" ? "T-Ball" : field.type.charAt(0).toUpperCase() + field.type.slice(1)} />
              <Fact label="Surface" value={SURFACE_LABELS[field.surface] ?? field.surface} />
              <Fact label="Lights" value={field.lights ? "Yes" : "No"} />
            </dl>
            {field.notes ? (
              <p className="mt-4 text-sm text-ink/80">{field.notes}</p>
            ) : null}
          </div>

          <div className="card">
            <h2 className="m-0">What folks are saying</h2>
            {reviews.length === 0 ? (
              <p className="mt-3 quote">No reviews yet. Played here? Spill the dirt below.</p>
            ) : (
              <ul className="mt-4 space-y-5">
                {reviews.map((r) => (
                  <li key={r.id} className="border-t border-dirt-200 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="font-semibold text-ink">{r.authorName}</span>
                      <span className="badge">{ROLE_TAG[r.authorRole] ?? r.authorRole.toUpperCase()}</span>
                      <span className="quote text-ink">{stars(r.rating)}</span>
                      <span className="quote">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink/85">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t-2 border-dirt-200 pt-5">
              <h3 className="m-0">Played here? Spill the dirt.</h3>
              {session ? (
                <ReviewForm slug={field.slug} defaultName={session.user.name ?? session.user.email} defaultRole={(session.user.role === "coach" || session.user.role === "parent" || session.user.role === "player") ? session.user.role : "other"} />
              ) : (
                <p className="mt-3 text-sm">
                  <Link href={`/login?next=/fields/${field.slug}`} className="btn-dark no-underline hover:no-underline">Sign in to review</Link>
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {field.claimedByUserId ? (
            <div className="card">
              <span className="badge-ok">Claimed</span>
              <p className="mt-2 text-sm">A coach or manager is keeping this field&apos;s info up to date.</p>
            </div>
          ) : (
            <div className="card">
              <h3 className="m-0">Run, coach, or maintain this field?</h3>
              <p className="mt-2 text-sm text-ink/80">Claim it free. Update rental rates, contact info, and renter notes.</p>
              <Link href={`/fields/${field.slug}/claim`} className="btn-dark mt-3 inline-flex no-underline hover:no-underline">Claim this field →</Link>
            </div>
          )}

          {nearby.length > 0 ? (
            <div className="card">
              <h3 className="m-0">Nearby diamonds</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {nearby.map((n) => (
                  <li key={n.field.id}>
                    <Link href={`/fields/${n.field.slug}`} className="no-underline hover:underline">
                      <div className="font-semibold text-ink">{n.field.name}</div>
                      <div className="quote">
                        {n.field.city.toUpperCase()}, {n.field.state}
                        {Number.isFinite(n.distance) ? ` · ${n.distance.toFixed(1)} MI` : ""}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
