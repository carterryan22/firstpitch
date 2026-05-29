import Link from "next/link";
import { notFound } from "next/navigation";
import { getFieldsRepos } from "../../../lib/fields";
import { LocationEyebrow } from "../../../components/ui";
import { getSession } from "../../../lib/session";
import { BookForm } from "./BookForm";

interface Params { slug: string }

export const metadata = { title: "Book a field" };

export default async function BookFieldPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const repos = await getFieldsRepos();
  const field = await repos.fields.bySlug(slug);
  if (!field) notFound();
  const session = await getSession().catch(() => null);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href={`/fields/${field.slug}`} className="quote text-sm">← Back to {field.name}</Link>
        <LocationEyebrow city={field.city} state={field.state} />
        <h1>Request booking help for <em>{field.name}</em>.</h1>
        <p className="quote">
          We&apos;ll collect the details and send you the official booking link or contact for the
          field manager. We don&apos;t yet auto-confirm slots — but we get you to the right person
          fast.
        </p>
      </header>

      {session ? (
        <BookForm slug={field.slug} defaultName={session.user.name ?? session.user.email} />
      ) : (
        <div className="card max-w-lg">
          <h3 className="m-0">Sign in to send the request</h3>
          <p className="mt-2 text-sm">No password — we email you a magic link.</p>
          <Link href={`/login?next=/fields/${field.slug}/book`} className="btn-primary mt-3 inline-flex no-underline hover:no-underline">
            Send magic link
          </Link>
        </div>
      )}
    </div>
  );
}
