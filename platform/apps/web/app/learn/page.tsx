import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Triple Play — Think Fast, Play Smart",
  description:
    "Interactive baseball-IQ scenarios for Little League players and parents. Pick a position, choose a difficulty, and learn what to do before the ball is hit.",
};

export default function LearnPage() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Learning game
          </p>
          <h1 className="m-0">Triple Play — Think Fast, Play Smart</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Position-aware baseball-IQ scenarios. Pick what you play, answer
            what you&apos;d do, and review why each answer is right. Great
            before practice or in the car on the way to a game.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/learn/roles"
            className="btn-secondary text-sm no-underline"
          >
            Roles &amp; positions →
          </a>
          <a
            href="/triple-play/index.html"
            target="_blank"
            rel="noopener"
            className="btn-secondary text-sm"
          >
            Open full-screen ↗
          </a>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          src="/triple-play/index.html"
          title="Triple Play Baseball learning game"
          className="block h-[calc(100vh-220px)] min-h-[640px] w-full border-0"
          // The vendored game is fully self-contained; it does not need to
          // reach into the parent frame. Keep it sandboxed but allow scripts,
          // same-origin (for localStorage progress), and popups for the
          // print-coach-sheet flow.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
        />
      </div>

      <p className="text-xs text-slate-500">
        Adapted from the open-source{" "}
        <a
          href="https://github.com/rc22-dev/TriplePlay"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Triple Play
        </a>{" "}
        project. See <code>app/learn/ATTRIBUTION.md</code> for attribution and{" "}
        <code>app/learn/MAINTENANCE.md</code> for the sync workflow.
      </p>
    </div>
  );
}
