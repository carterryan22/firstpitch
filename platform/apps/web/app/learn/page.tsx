import type { Metadata } from "next";
import { TriplePlayFrame } from "./TriplePlayFrame";

export const metadata: Metadata = {
  title: "Triple Play: Think Fast, Play Smart",
  description:
    "Interactive baseball-IQ scenarios for Little League players and parents. Pick a position, choose a difficulty, and learn what to do before the ball is hit.",
};

export default function LearnPage() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Learning game</p>
          <h1 className="m-0">Triple Play: Think Fast, Play Smart</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/80">
            Position-aware baseball-IQ scenarios. Pick what you play, answer
            what you&apos;d do, and review why each answer is right. Great
            before practice or in the car on the way to a game.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/learn/roles" className="btn-ghost text-sm no-underline hover:no-underline">
            Roles &amp; positions →
          </a>
          <a
            href="/triple-play/index.html"
            target="_blank"
            rel="noopener"
            className="btn-ghost text-sm no-underline hover:no-underline"
          >
            Open full-screen ↗
          </a>
        </div>
      </header>

      <TriplePlayFrame />

      <p className="text-xs text-ink/60">
        Adapted from the open-source{" "}
        <a
          href="https://github.com/rc22-dev/TriplePlay"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Triple Play
        </a>{" "}
        project, with permission, under its original license.
      </p>
    </div>
  );
}
