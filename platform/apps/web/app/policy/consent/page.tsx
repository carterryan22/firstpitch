import Link from "next/link";

export const metadata = {
  title: "Parental consent",
  description:
    "How First Pitch gets verifiable parental consent before a child under 13 has an active profile (COPPA).",
};

type Status = "granted" | "expired" | "invalid" | "already" | "missing";

const STATUS_COPY: Record<Status, { tone: string; title: string; body: string }> = {
  granted: {
    tone: "badge-ok",
    title: "Consent confirmed — thank you!",
    body:
      "Your child's profile is now active. You stay in control: you can review, export, or delete their data anytime from Your data rights.",
  },
  already: {
    tone: "badge-info",
    title: "Already confirmed",
    body: "This profile was already approved. No further action is needed.",
  },
  expired: {
    tone: "badge-warn",
    title: "This link has expired",
    body:
      "Consent links are valid for 30 days. Ask the coach to re-send the approval email, or contact us and we'll help.",
  },
  invalid: {
    tone: "badge-danger",
    title: "We couldn't verify this link",
    body:
      "The link may be incomplete or already used. Ask the coach to re-send the approval email, or contact privacy@firstpitch.app.",
  },
  missing: {
    tone: "badge-danger",
    title: "Missing verification token",
    body: "Open the approval link directly from the email we sent you.",
  },
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const known = (["granted", "expired", "invalid", "already", "missing"] as Status[]).includes(
    status as Status,
  )
    ? (status as Status)
    : undefined;
  const result = known ? STATUS_COPY[known] : undefined;

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">For parents</p>
        <h1>Parental consent, in plain English.</h1>
        <p className="text-ink/80">
          First Pitch is built for kids, so a parent or guardian is always in charge. Children never
          create their own accounts.
        </p>
      </header>

      {result && (
        <div className="card space-y-2">
          <span className={`badge ${result.tone}`}>{result.title}</span>
          <p className="m-0 text-ink/80">{result.body}</p>
          <p className="m-0 text-sm">
            <Link href="/policy/data-requests" className="underline">Your data rights →</Link>
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="m-0">How it works</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>A coach (or you) adds your child to a team with your email address.</li>
          <li>We email you a one-time approval link. The profile stays inactive until you click it.</li>
          <li>Once you approve, the profile activates and you control it from your parent dashboard.</li>
          <li>You can withdraw consent at any time, which deactivates the profile.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">What we collect for a child</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Name, jersey number, and age band — to build lineups and practices.</li>
          <li>Optional development metrics and goals a coach or you enter.</li>
          <li>Nothing more than is reasonably necessary to run training.</li>
        </ul>
        <p className="text-ink/80">
          We never show children ads, never build advertising profiles, and never make a child&apos;s
          profile or metrics public without your explicit action. Full detail in our{" "}
          <Link href="/policy/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="m-0">Your controls</h2>
        <p className="text-ink/80">
          Review, export, or delete your child&apos;s data anytime from{" "}
          <Link href="/policy/data-requests" className="underline">Your data rights</Link>, or email{" "}
          <a href="mailto:privacy@firstpitch.app" className="underline">privacy@firstpitch.app</a>.
        </p>
      </section>
    </article>
  );
}
