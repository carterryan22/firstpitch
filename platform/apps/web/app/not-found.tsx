import Link from "next/link";

export const metadata = {
  title: "Foul ball: page not found",
  robots: { index: false, follow: false },
};

/**
 * Branded 404 (game-day ref §9.1 parity). Rendered inside the root layout, so the
 * Dugout Dirt theme + fonts apply. Keeps the voice on-brand and points lost
 * visitors back to the surfaces that matter.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-16 text-center">
      <p className="eyebrow text-dirt-700">Error 404 · Foul ball</p>
      <h1 className="m-0 font-display text-5xl">Off the field</h1>
      <p className="quote mx-auto max-w-md text-ink/80">
        That page isn&apos;t on this roster. It may have been moved, renamed, or it never made the
        lineup card.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary no-underline hover:no-underline">
          Back to home plate
        </Link>
        <Link href="/coach" className="btn-ghost no-underline hover:no-underline">
          Coach dashboard
        </Link>
      </div>
      <p className="text-xs text-dirt-700">First Pitch · Real dirt on every diamond.</p>
    </div>
  );
}
