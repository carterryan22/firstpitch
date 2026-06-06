/**
 * Pure helpers for the guided walkthrough overlay (`components/Walkthrough.tsx`).
 *
 * Kept framework-free so the tricky geometry (where to place the tooltip card
 * relative to the spotlighted element, clamped to the viewport) is unit-tested
 * without a DOM. The component is a thin shell over these functions.
 */

export interface TourStep {
  /** `data-tour` value of the element to spotlight. Omit for a centered card. */
  target?: string;
  title: string;
  body: string;
}

export interface Tour {
  /** Stable id — also the localStorage key suffix for "seen" state. */
  id: string;
  /** Button label, e.g. "Replay the team tour". */
  label: string;
  steps: TourStep[];
}

/** Minimal rect shape (a subset of DOMRect) so callers can pass real rects. */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CardSize {
  width: number;
  height: number;
}

export interface CardPosition {
  top: number;
  left: number;
  /** Where the card landed relative to the target, for arrow/styling. */
  placement: "below" | "above" | "center";
}

export const WALKTHROUGH_SEEN_PREFIX = "walkthrough:seen:";

export function seenStorageKey(tourId: string): string {
  return `${WALKTHROUGH_SEEN_PREFIX}${tourId}`;
}

/** Clamp `value` into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Decide where to render the tooltip card.
 *
 * Preference order: directly below the target, then above it if there isn't
 * room below, then dead-center as a last resort (or when there is no target).
 * The card is always clamped fully inside the viewport with a uniform margin.
 */
export function positionCard(
  rect: Rect | null,
  card: CardSize,
  viewport: Viewport,
  margin = 12,
): CardPosition {
  const centered: CardPosition = {
    top: Math.max(margin, (viewport.height - card.height) / 2),
    left: Math.max(margin, (viewport.width - card.width) / 2),
    placement: "center",
  };
  if (!rect) return centered;

  const maxLeft = viewport.width - card.width - margin;
  const maxTop = viewport.height - card.height - margin;
  const left = clamp(rect.left + rect.width / 2 - card.width / 2, margin, maxLeft);

  const belowTop = rect.top + rect.height + margin;
  if (belowTop + card.height <= viewport.height - margin) {
    return { top: belowTop, left, placement: "below" };
  }

  const aboveTop = rect.top - margin - card.height;
  if (aboveTop >= margin) {
    return { top: aboveTop, left, placement: "above" };
  }

  // No room either side (target taller than viewport, or pinned bar): center
  // vertically but keep the horizontal alignment to the target.
  return { top: clamp(centered.top, margin, Math.max(margin, maxTop)), left, placement: "center" };
}

/** Clamp a step index into the tour's valid range. */
export function clampStep(index: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return clamp(Math.round(index), 0, stepCount - 1);
}
