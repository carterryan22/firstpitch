import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFieldsRepos } from "../../../lib/fields";
import { LocationEyebrow } from "../../../components/ui";
import { getSession } from "../../../lib/session";

interface Params { slug: string }

export const metadata = { title: "Claim this field" };

export default async function ClaimFieldPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const repos = await getFieldsRepos();
  const field = await repos.fields.bySlug(slug);
  if (!field) notFound();

  const session = await getSession().catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/fields/${slug}/claim`)}`);
  }

  if (field.claimedByUserId) {
    return (
      <article className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm">
          <Link href={`/fields/${field.slug}`}>← Back to {field.name}</Link>
        </p>
        <h1>Already claimed</h1>
        <p className="text-ink/80">
          A coach or manager has already claimed <strong>{field.name}</strong>. If that&apos;s a
          mistake, email us at <a href="mailto:hello@firstpitch.app" className="underline">hello@firstpitch.app</a>{" "}
          and we&apos;ll sort it.
        </p>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm">
        <Link href={`/fields/${field.slug}`}>← Back to {field.name}</Link>
      </p>
      <header className="space-y-2">
        <p className="eyebrow">Claim a field</p>
        <h1>{field.name}</h1>
        <LocationEyebrow city={field.city} state={field.state} />
      </header>

      <section className="card space-y-3">
        <h2 className="m-0 text-base uppercase">Coming soon</h2>
        <p className="text-sm">
          We&apos;re finishing the claim workflow now. Tell us you want this field and we&apos;ll
          verify and hand you the keys (figuratively — please don&apos;t mail us actual keys).
        </p>
        <p className="text-sm">
          For now, email{" "}
          <a className="underline" href={`mailto:hello@firstpitch.app?subject=${encodeURIComponent(`Claim field: ${field.name}`)}`}>
            hello@firstpitch.app
          </a>{" "}
          with proof you run, coach, or maintain this diamond. We&apos;ll verify within a couple of
          days and update the listing.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={`mailto:hello@firstpitch.app?subject=${encodeURIComponent(`Claim field: ${field.name}`)}&body=${encodeURIComponent(`Field: ${field.name}\nLocation: ${field.city}, ${field.state}\nMy role:\nOrg / team:\nHow I can verify:`)}`}
            className="btn-primary no-underline hover:no-underline"
          >
            Email claim request →
          </a>
          <Link
            href={`/fields/${field.slug}`}
            className="btn-ghost no-underline hover:no-underline"
          >
            Cancel
          </Link>
        </div>
      </section>

      <p className="text-xs text-ink/60">
        Once claimed, you&apos;ll be able to update rental rates, hours, contact info, and renter
        notes. Reviews stay community-owned.
      </p>
    </article>
  );
}
