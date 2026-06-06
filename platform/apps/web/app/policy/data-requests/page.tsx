import Link from "next/link";
import { getSession } from "../../lib/session";
import { DataRequestPanel } from "./DataRequestPanel";

export const metadata = {
  title: "Your data rights",
  description:
    "Access, export, correct, or delete your First Pitch data. Parents can review and remove a child's data anytime (GDPR/CCPA/COPPA).",
};

export const dynamic = "force-dynamic";

export default async function DataRequestsPage() {
  const session = await getSession().catch(() => null);

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Your data</p>
        <h1>Your data rights.</h1>
        <p className="text-ink/80">
          You own your data. Export it or delete it anytime. Parents can review and remove a
          child&apos;s data on the same controls. See our{" "}
          <Link href="/policy/privacy" className="underline">Privacy Policy</Link> for the full
          detail.
        </p>
      </header>

      <DataRequestPanel signedIn={!!session} />

      <section className="space-y-3">
        <h2 className="m-0">Correcting data</h2>
        <p className="text-ink/80">
          Most fields (roster, metrics, goals) are editable directly in the app. For anything you
          can&apos;t change yourself, email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>{" "}
          and we&apos;ll fix it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Children&apos;s data</h2>
        <p className="text-ink/80">
          Under COPPA, a parent or guardian can review, export, or delete their child&apos;s data
          and can withdraw consent at any time. Withdrawing consent deactivates the child&apos;s
          profile. See <Link href="/policy/consent" className="underline">how consent works</Link>.
        </p>
      </section>
    </article>
  );
}
