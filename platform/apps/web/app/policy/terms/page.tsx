import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "The agreement for using First Pitch — youth-baseball practice planning, lineups, fields, and player development. Safety-first, no guarantees of outcomes.",
};

const LAST_UPDATED = "2026-06-03";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p className="text-ink/80">
          These terms govern your use of First Pitch. By using the service you agree to them. If you
          are using First Pitch on behalf of a team or organization, you agree on its behalf.
        </p>
        <p className="text-xs text-ink/60">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="m-0">Who can use First Pitch</h2>
        <p>
          You must be at least 18 to create an account (coach, parent, or admin). Children
          participate only through a profile a parent or authorized coach manages, with{" "}
          <Link href="/policy/consent" className="underline">verifiable parental consent</Link>. You
          are responsible for activity under your account and for keeping your sign-in email secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Safety is guidance, not a guarantee</h2>
        <p>
          First Pitch enforces pitch-count and arm-care rules drawn from USA Baseball Pitch Smart,
          Little League International, the NSCA, the CDC, and other sources. These tools reduce risk
          but <strong>do not guarantee</strong> any health, safety, performance, or recruiting
          outcome. You remain responsible for the supervision and well-being of every athlete. In an
          emergency, contact local emergency services — First Pitch is a planning tool, not an
          emergency or medical service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Not medical or professional advice</h2>
        <p>
          Content, plans, AI output, and metrics are for general informational and coaching purposes
          only and are not a substitute for advice from a qualified physician, athletic trainer, or
          other professional. Never disregard professional advice because of something you read here.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Acceptable use</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Don&apos;t upload data you don&apos;t have the right to share, or another child&apos;s data without their parent&apos;s consent.</li>
          <li>Don&apos;t use the service to harass, endanger, or publicly rank or shame children.</li>
          <li>Don&apos;t attempt to breach security, scrape at scale, or interfere with the service.</li>
          <li>Don&apos;t misrepresent your role or your authority over a team or roster.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Your content</h2>
        <p>
          You keep ownership of the rosters, plans, notes, and metrics you create. You grant us a
          limited license to host and process that content solely to operate the service for you. We
          handle personal data as described in our{" "}
          <Link href="/policy/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Subscriptions &amp; billing</h2>
        <p>
          Some features may require a paid plan. Pricing, billing cycle, and trial terms are shown
          at checkout. Unless stated otherwise, subscriptions renew automatically until canceled;
          you can cancel anytime and retain access through the paid period. Taxes may apply. We may
          change pricing prospectively with reasonable notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Third-party services</h2>
        <p>
          The service may link to or integrate with third parties (e.g. GameChanger imports, field
          managers, payment processing). We are not responsible for third-party services and their
          own terms apply to your use of them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Disclaimers &amp; limitation of liability</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind, to the maximum
          extent permitted by law. To the extent permitted by law, First Pitch is not liable for
          indirect, incidental, or consequential damages, and our total liability is limited to the
          amount you paid us in the 12 months before the claim. Some jurisdictions don&apos;t allow
          these limits, so they may not fully apply to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Termination</h2>
        <p>
          You may stop using the service at any time and request deletion of your data via{" "}
          <Link href="/policy/data-requests" className="underline">Your data rights</Link>. We may
          suspend or terminate accounts that violate these terms or put a child at risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Changes to these terms</h2>
        <p>
          We may update these terms. If changes are material we will update this page and, where
          appropriate, notify account holders. Continued use after an update means you accept the
          revised terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:hello@firstpitch.app" className="underline">hello@firstpitch.app</a>. See
          also our <Link href="/policy/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </section>
    </article>
  );
}
