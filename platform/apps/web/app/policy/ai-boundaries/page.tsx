import Link from "next/link";

export const metadata = {
  title: "AI boundaries · Policy",
  description:
    "How First Pitch uses AI safely — what it will and won't do, and what gets escalated to a real human.",
};

export default function AiBoundariesPolicy() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm">
        <Link href="/safety">← Safety rules</Link>
      </p>
      <header>
        <p className="eyebrow">Platform policy</p>
        <h1>AI boundaries</h1>
        <p className="text-ink/80">
          First Pitch uses AI to compile practice plans, suggest drills, and summarize team data.
          It does not — and will not — diagnose injuries, prescribe rehab, give medical advice, or
          generate supplement plans for kids. These limits are enforced in code, not just on this
          page.
        </p>
      </header>

      <section className="card space-y-3">
        <h2 className="m-0 text-base uppercase">What the AI will do</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Build age- and tier-appropriate practice plans gated by our safety corpus.</li>
          <li>Suggest published drills filtered by age band, equipment, and environment.</li>
          <li>Summarize team rosters, games, and goals when a coach asks a grounded question.</li>
          <li>Translate coach plans into parent- and player-friendly versions.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="m-0 text-base uppercase">What the AI will not do</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Diagnose injuries, concussions, or mental-health conditions.</li>
          <li>Prescribe rehab, return-to-play timelines, or medication.</li>
          <li>Recommend supplements, training drugs, or weight-management plans for youth athletes.</li>
          <li>Replace a parent, coach, athletic trainer, or qualified medical professional.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="m-0 text-base uppercase">What gets escalated</h2>
        <p className="text-sm">
          Concerning observations — head impacts, persistent pain, signs of anxiety/depression,
          arm overuse — are routed to parents/guardians and qualified professionals. The AI does
          not attempt to handle these directly.
        </p>
      </section>

      <p className="text-xs text-ink/60">
        This policy is enforced by the <code>NO_AI_DIAGNOSIS</code> rule in our safety corpus and
        applies to every AI-generated surface in the app.
      </p>
    </article>
  );
}
