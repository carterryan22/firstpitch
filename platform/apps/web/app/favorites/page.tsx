import Link from "next/link";
import { getFieldsRepos, starRating, stars } from "../lib/fields";
import { getSession } from "../lib/session";

export const metadata = { title: "Saved fields" };

const SURFACE_LABELS: Record<string, string> = {
  grass: "Grass",
  turf: "Turf",
  dirt: "Dirt",
  mixed: "Mixed",
};

export default async function FavoritesPage() {
  const session = await getSession().catch(() => null);
  const repos = await getFieldsRepos();

  if (!session) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1>★ Your saved diamonds</h1>
          <p className="quote">Sign in to keep a shortlist of fields and pending bookings.</p>
        </header>
        <Link href="/login?next=/favorites" className="btn-primary inline-flex no-underline hover:no-underline">
          Send magic link
        </Link>
      </div>
    );
  }

  const favs = await repos.favorites.list({ userId: session.user.id, kind: "field" });
  const fields = await Promise.all(favs.map((f) => repos.fields.byId(f.targetId)));
  const present = fields.filter((f): f is NonNullable<typeof f> => Boolean(f));
  const allReviews = await repos.fieldReviews.list();
  const reviewsByField = new Map<string, typeof allReviews>();
  for (const r of allReviews) {
    const list = reviewsByField.get(r.fieldId) ?? [];
    list.push(r);
    reviewsByField.set(r.fieldId, list);
  }

  const bookings = (await repos.fieldBookings.list({ requestedByUserId: session.user.id })).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
  const fieldById = new Map((await repos.fields.list()).map((f) => [f.id, f]));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <span className="eyebrow">Your shortlist</span>
        <h1>★ Saved diamonds</h1>
        <p className="quote">Pull this up before you book. Splinters not included.</p>
      </header>

      <section>
        <h2>Saved fields ({present.length})</h2>
        {present.length === 0 ? (
          <p className="quote">No saved fields yet. <Link href="/fields" className="underline">Browse the directory</Link> and tap ★ Save.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {present.map((f) => {
              const rs = starRating(reviewsByField.get(f.id) ?? []);
              return (
                <li key={f.id}>
                  <Link href={`/fields/${f.slug}`} className="block h-full no-underline hover:no-underline">
                    <div className="card h-full transition hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard">
                      <div className="eyebrow">{f.city.toUpperCase()}, {f.state}</div>
                      <h3 className="mt-1">{f.name}</h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {rs.count > 0 ? (
                          <span className="quote text-ink">{stars(rs.avg)} <span className="text-dirt-300">{rs.avg.toFixed(1)}</span></span>
                        ) : (
                          <span className="quote">No reviews</span>
                        )}
                        <span className="badge">{SURFACE_LABELS[f.surface] ?? f.surface}</span>
                        {f.lights ? <span className="badge-ok">Lit</span> : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Your booking requests ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="quote">No requests yet. Tap ⚾ Book a field on any diamond.</p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const f = fieldById.get(b.fieldId);
              const statusTone =
                b.status === "confirmed" ? "badge-ok" :
                b.status === "declined" ? "badge-danger" :
                b.status === "canceled" ? "badge" : "badge-warn";
              return (
                <li key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">{b.date} · {b.startTime} · {b.durationMin} min · {b.purpose}</div>
                    <div className="mt-1">
                      {f ? (
                        <Link href={`/fields/${f.slug}`}>{f.name}</Link>
                      ) : (
                        <span className="quote">Field removed</span>
                      )}
                    </div>
                    {b.notes ? <p className="mt-1 text-sm text-ink/75">{b.notes}</p> : null}
                  </div>
                  <span className={statusTone}>{b.status.toUpperCase()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
