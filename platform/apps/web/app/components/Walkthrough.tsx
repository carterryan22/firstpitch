"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  clampStep,
  positionCard,
  seenStorageKey,
  type CardPosition,
  type Rect,
  type Tour,
} from "../lib/walkthrough";

/**
 * Guided walkthrough overlay — a dependency-free version of the game-day competitor's
 * replayable named tours (§11). Drop `<Walkthrough tour={...} />` on a page:
 *
 *   - It auto-runs once per browser (tracked in localStorage by tour id) and
 *     renders an "↺ Replay" button so coaches can re-take it any time.
 *   - Each step spotlights an element by its `data-tour="<value>"` attribute,
 *     dims the rest of the screen, and floats an explainer card beside it.
 *   - Steps without a `target` show a centered intro/outro card.
 *
 * It is purely informational (the backdrop blocks interaction) so it never
 * traps a coach mid-edit.
 */

const MARGIN = 12;

function readRect(target?: string): Rect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  if (!el) return null;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Walkthrough({ tour, autoStart = true }: { tour: Tour; autoStart?: boolean }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<CardPosition | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const stepCount = tour.steps.length;
  const step = tour.steps[clampStep(stepIndex, stepCount)];

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(seenStorageKey(tour.id), "1");
    } catch {
      /* private mode / disabled storage — non-fatal */
    }
  }, [tour.id]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  // Auto-run once per browser.
  useEffect(() => {
    if (!autoStart || stepCount === 0) return;
    let seen = true;
    try {
      seen = window.localStorage.getItem(seenStorageKey(tour.id)) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = window.setTimeout(() => setActive(true), 600);
    return () => window.clearTimeout(t);
  }, [autoStart, stepCount, tour.id]);

  // Re-measure the spotlight target whenever the step changes or the layout shifts.
  const measure = useCallback(() => {
    if (!active || !step) return;
    setRect(readRect(step.target));
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const onShift = () => measure();
    window.addEventListener("resize", onShift);
    window.addEventListener("scroll", onShift, true);
    return () => {
      window.removeEventListener("resize", onShift);
      window.removeEventListener("scroll", onShift, true);
    };
  }, [active, measure]);

  // Position the card once it (and the target rect) are known.
  useLayoutEffect(() => {
    if (!active) return;
    const card = cardRef.current;
    if (!card) return;
    setPos(
      positionCard(
        rect,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        MARGIN,
      ),
    );
  }, [active, rect, stepIndex]);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setStepIndex((i) => Math.min(i + 1, stepCount - 1));
      else if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, stepCount]);

  if (stepCount === 0) return null;

  const isLast = stepIndex >= stepCount - 1;
  const isFirst = stepIndex <= 0;

  if (!active) {
    return (
      <button
        type="button"
        onClick={start}
        className="btn-ghost no-underline hover:no-underline text-xs"
      >
        ↺ {tour.label}
      </button>
    );
  }

  const cardStyle: CSSProperties = pos
    ? { position: "fixed", top: pos.top, left: pos.left }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={tour.label}>
      {/* Interaction blocker (transparent — the dim comes from the spotlight shadow). */}
      <div className="absolute inset-0" />

      {/* Spotlight ring + surrounding dim via a huge box-shadow. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-white transition-all"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/60" />
      )}

      {/* Explainer card. */}
      <div
        ref={cardRef}
        style={cardStyle}
        className="z-[102] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-field-700">
            {tour.label}
          </p>
          <button
            type="button"
            onClick={close}
            className="text-xs text-dirt-700 hover:text-slate-700"
            aria-label="Close walkthrough"
          >
            Skip ✕
          </button>
        </div>
        <h3 className="mt-1 text-base font-bold text-slate-900">{step?.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{step?.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {tour.steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-field-700" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dirt-700">
              {stepIndex + 1} / {stepCount}
            </span>
            {!isFirst ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                className="btn-ghost text-xs"
              >
                Back
              </button>
            ) : null}
            {isLast ? (
              <button type="button" onClick={close} className="btn-primary text-xs">
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(i + 1, stepCount - 1))}
                className="btn-primary text-xs"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
