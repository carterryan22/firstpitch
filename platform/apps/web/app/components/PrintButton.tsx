"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => (typeof window !== "undefined" ? window.print() : undefined)}
      className="btn-ghost text-sm no-underline hover:no-underline"
    >
      🖨 Print / save PDF
    </button>
  );
}
