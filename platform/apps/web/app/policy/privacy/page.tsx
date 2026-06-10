import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How First Pitch collects, uses, protects, and deletes data, with COPPA-first rules for children under 13 and parental control by default.",
};

const LAST_UPDATED = "2026-06-10";

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
          lineup tools, field information, and player-development tracking. We are based in the
          United States and offer the service to users in the United States. You can reach us about
          privacy at{" "}
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
          <li>A parent can review, export, or delete their child&apos;s data at any time. See <Link href="/policy/data-requests" className="underline">Your data rights</Link>.</li>
          <li>We do not condition a child&apos;s participation on disclosing more than is reasonably necessary.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data:</strong> email and role (coach / parent / player / admin). We use passwordless magic-link sign-in, so we never store passwords.</li>
          <li><strong>Team &amp; player data:</strong> rosters, lineups, practice plans, pitch counts, goals, missions, and metrics you enter.</li>
          <li><strong>Usage data:</strong> if enabled, privacy-friendly, cookieless analytics (Plausible) with no personal identifiers, and only on our public marketing pages. We never load third-party analytics or advertising scripts in the signed-in app, where a child&apos;s data may appear.</li>
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
          AI is used to draft text, summarize, and search a curated safety corpus, never to
          diagnose injuries, predict recruitment, or rank children. We do not send children&apos;s
          personal identifiers to third-party model providers, and we do not allow your team&apos;s
          data to train third-party models without an explicit opt-in. Details on the{" "}
          <Link href="/policy/ai-boundaries" className="underline">AI boundaries page</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Automated decisions &amp; profiling</h2>
        <p>
          We do not make decisions that produce legal or similarly significant effects about you or
          a child based <strong>solely</strong> on automated processing. AI features assist a
          coach&apos;s judgment; a human always decides. We never profile children for advertising,
          and we never rank or score children publicly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Sharing &amp; service providers</h2>
        <p>
          We share data only with service providers (sub-processors) that help us operate, each
          bound by contract to protect it and use it only for our service. Depending on your
          settings, these may include:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Hosting &amp; storage:</strong> Vercel (application hosting/CDN) and Vercel KV / Upstash (database).</li>
          <li><strong>Transactional email:</strong> Resend (magic-link and coach notices).</li>
          <li><strong>Analytics (optional):</strong> Plausible. Privacy-friendly, cookieless, no personal identifiers.</li>
          <li><strong>AI features (optional):</strong> OpenAI, used only to draft and summarize text; we do not send children&apos;s personal identifiers.</li>
          <li><strong>Billing (optional):</strong> Stripe, if you subscribe to a paid plan.</li>
          <li><strong>Error monitoring (optional):</strong> Sentry or a webhook, with children&apos;s identifiers excluded wherever feasible.</li>
        </ul>
        <p>
          We may disclose information if required by law or to protect the safety of a child. We do
          not sell or share personal information for cross-context behavioral advertising. Email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>{" "}
          for the current list of sub-processors.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Retention &amp; deletion</h2>
        <p>
          We keep personal data only as long as we need it for the purposes above, then delete or
          anonymize it. As a guide:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account, team &amp; player data:</strong> while the account or team is active; removed within 30 days of a verified deletion request.</li>
          <li><strong>Sign-in (magic-link) tokens:</strong> expire within 15 minutes and are then unusable.</li>
          <li><strong>Parental-consent records:</strong> kept for the life of the child&apos;s profile plus a reasonable period to evidence that consent was given.</li>
          <li><strong>Security &amp; audit logs:</strong> a limited period (typically up to 12 months), then deleted or aggregated.</li>
          <li><strong>Backups:</strong> purged on a rolling cycle after deletion from the live service.</li>
        </ul>
        <p>
          Request export or deletion anytime from{" "}
          <Link href="/policy/data-requests" className="underline">Your data rights</Link>. We honor
          verified deletion requests within 30 days, except where law requires longer retention.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Your privacy rights</h2>
        <p>
          You can access, correct, export, or delete your personal data at any time. Depending on
          your state, U.S. privacy laws, such as the California Consumer Privacy Act (CCPA/CPRA)
          and comparable laws in Virginia, Colorado, Connecticut, and other states, may also give
          you the right to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Know &amp; access</strong> what personal information we collect and get a copy.</li>
          <li><strong>Correct</strong> inaccurate personal information.</li>
          <li><strong>Delete</strong> your personal information.</li>
          <li><strong>Port</strong> your data in a portable, machine-readable format.</li>
          <li><strong>Opt out</strong> of the sale or sharing of personal information and of targeted advertising.</li>
        </ul>
        <p>
          We extend these controls to all users regardless of state, and we will not discriminate
          against you for using them. Because we <strong>do not sell or share</strong> personal
          information and do not run targeted advertising, there is nothing to opt out of, but you
          can still exercise every other right. Start at{" "}
          <Link href="/policy/data-requests" className="underline">Your data rights</Link> or email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">California residents (CCPA/CPRA)</h2>
        <p>
          California residents have the rights listed above, plus the right to limit the use of
          sensitive personal information. We collect only the minimum needed to run training and do
          not use sensitive personal information beyond providing the service. In the prior 12
          months we did not sell or share personal information, and we never sell or share the
          personal information of anyone we know to be under 16.
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
        <h2 className="m-0">Cookies</h2>
        <p>
          We use only a strictly-necessary sign-in cookie to keep you logged in, plus optional
          cookieless analytics. We do not use advertising or cross-site tracking cookies. Full
          detail is on our <Link href="/policy/cookies" className="underline">Cookie Policy</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Contact</h2>
        <p>
          First Pitch is responsible for the personal data processed through this service, and can
          be reached at{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>{" "}
          for any question, concern, or request about your data or a child&apos;s data. See also our{" "}
          <Link href="/policy/terms" className="underline">Terms of Service</Link>,{" "}
          <Link href="/policy/cookies" className="underline">Cookie Policy</Link>, and{" "}
          <Link href="/policy" className="underline">Platform policy</Link>.
        </p>
      </section>
    </article>
  );
}
