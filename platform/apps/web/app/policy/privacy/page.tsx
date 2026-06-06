import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How First Pitch collects, uses, protects, and deletes data — with COPPA-first rules for children under 13 and parental control by default.",
};

const LAST_UPDATED = "2026-06-03";

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="text-ink/80">
          First Pitch is built for kids and the parents and coaches who look after them. This
          policy explains what we collect, why, and the controls you have. Plain language wins over
          legalese wherever we can manage it.
        </p>
        <p className="text-xs text-ink/60">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="m-0">Who we are</h2>
        <p>
          First Pitch (&quot;we&quot;, &quot;us&quot;) provides youth-baseball practice planning,
          lineup tools, field information, and player-development tracking. The data controller for
          this service can be reached at{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Children under 13 (COPPA)</h2>
        <p>
          Children do not create their own accounts. A parent, legal guardian, or a coach acting
          with parental permission adds a child to a team. Before a child profile becomes active we
          require <strong>verifiable parental consent</strong> from the parent&apos;s own email.
          See <Link href="/policy/consent" className="underline">how consent works</Link>.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>We collect the minimum needed to run training: name, jersey number, age band, and optional development metrics a coach or parent enters.</li>
          <li>We never show behavioral ads to children and never build advertising profiles.</li>
          <li>We never make a child&apos;s profile, metrics, or video public without explicit coach <em>and</em> parent action.</li>
          <li>A parent can review, export, or delete their child&apos;s data at any time — see <Link href="/policy/data-requests" className="underline">Your data rights</Link>.</li>
          <li>We do not condition a child&apos;s participation on disclosing more than is reasonably necessary.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data:</strong> email and role (coach / parent / player / admin). We use passwordless magic-link sign-in, so we never store passwords.</li>
          <li><strong>Team &amp; player data:</strong> rosters, lineups, practice plans, pitch counts, goals, missions, and metrics you enter.</li>
          <li><strong>Usage data:</strong> if enabled, privacy-friendly, cookieless analytics (Plausible) with no personal identifiers.</li>
          <li><strong>Operational logs:</strong> error and security logs that exclude children&apos;s personal identifiers wherever feasible.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">How we use it</h2>
        <p>
          To run the features you ask for: compile safe practices, enforce pitch-count and arm-care
          rules, build lineups, track progress, and send transactional email (magic links, coach
          notices). We do not sell or rent personal data, ever.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">AI processing</h2>
        <p>
          AI is used to draft text, summarize, and search a curated safety corpus — never to
          diagnose injuries, predict recruitment, or rank children. We do not send children&apos;s
          personal identifiers to third-party model providers, and we do not allow your team&apos;s
          data to train third-party models without an explicit opt-in. Details on the{" "}
          <Link href="/policy/ai-boundaries" className="underline">AI boundaries page</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Sharing</h2>
        <p>
          We share data only with service providers that help us operate (hosting, transactional
          email, optional analytics), each bound to protect it and use it only for our service. We
          may disclose information if required by law or to protect the safety of a child.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Retention &amp; deletion</h2>
        <p>
          We keep data for as long as the account or team is active. You can request export or
          deletion at any time from <Link href="/policy/data-requests" className="underline">Your
          data rights</Link>. We honor verified deletion requests within 30 days, except where law
          requires longer retention.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Your rights</h2>
        <p>
          Depending on where you live (e.g. California CCPA/CPRA, EU/UK GDPR), you may have rights
          to access, correct, export, or delete personal data, and to opt out of certain uses. We
          extend these controls to all users regardless of region. Start at{" "}
          <Link href="/policy/data-requests" className="underline">Your data rights</Link> or email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Security</h2>
        <p>
          We use encryption in transit, passwordless sign-in, scoped access controls, audit logging,
          and a hardened content-security policy. No system is perfectly secure, but we design to
          minimize what we collect and who can see it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Changes</h2>
        <p>
          If we make material changes we will update this page and, where appropriate, notify
          account holders. Continued use after an update means you accept the revised policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Contact</h2>
        <p>
          Questions, concerns, or a request about a child&apos;s data? Email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
          See also our <Link href="/policy/terms" className="underline">Terms of Service</Link> and{" "}
          <Link href="/policy" className="underline">Platform policy</Link>.
        </p>
      </section>
    </article>
  );
}
