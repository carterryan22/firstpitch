import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  description:
    "What cookies and local storage First Pitch uses: a single strictly-necessary sign-in cookie plus optional cookieless analytics. No ads, no cross-site tracking.",
};

const LAST_UPDATED = "2026-06-10";

export default function CookiePolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Legal</p>
        <h1>Cookie Policy</h1>
        <p className="text-ink/80">
          We keep this short because we keep it minimal: First Pitch uses one strictly-necessary
          sign-in cookie and, if enabled, privacy-friendly analytics that don&apos;t use cookies at
          all. No advertising cookies, no cross-site tracking, ever.
        </p>
        <p className="text-xs text-ink/60">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="m-0">What is a cookie?</h2>
        <p>
          A cookie is a small text file a website stores in your browser. &quot;Local storage&quot;
          is a similar browser feature. Some are essential to make a site work; others track you for
          advertising. We only use the essential kind.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Cookies we use</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dirt-200 align-top">
                <td className="py-2 pr-4 font-mono">platform_session</td>
                <td className="py-2 pr-4">
                  Keeps you signed in after you click your magic link. The app does not work without
                  it.
                </td>
                <td className="py-2 pr-4">Strictly necessary</td>
                <td className="py-2">Session / until sign-out or expiry</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-ink/80">
          Our sign-in cookie is set with <code>HttpOnly</code>, <code>Secure</code>, and{" "}
          <code>SameSite</code> protections so it can&apos;t be read by scripts or sent from other
          sites.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Analytics (optional, cookieless)</h2>
        <p>
          If analytics is enabled for our site, we use{" "}
          <a href="https://plausible.io/data-policy" className="underline" rel="noopener noreferrer" target="_blank">
            Plausible Analytics
          </a>
          , which is designed to be privacy-friendly: it sets <strong>no cookies</strong>, collects
          no personal identifiers, and does not track you across other websites. It only helps us
          count visits and see which pages are useful, in aggregate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">No advertising or tracking cookies</h2>
        <p>
          We do not use advertising cookies, third-party tracking pixels, or cross-site
          fingerprinting. We never show behavioral ads, and we never build advertising profiles,
          and we especially never do this for children.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Managing cookies</h2>
        <p>
          Because the only cookie we set is strictly necessary to sign in, there is nothing to
          &quot;opt out&quot; of. Turning it off would simply log you out. You can clear or block
          cookies and local storage anytime in your browser settings; doing so means you&apos;ll
          need to sign in again.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">More information</h2>
        <p>
          For the full picture of what we collect and your rights, see our{" "}
          <Link href="/policy/privacy" className="underline">Privacy Policy</Link>. Questions? Email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
        </p>
      </section>
    </article>
  );
}
