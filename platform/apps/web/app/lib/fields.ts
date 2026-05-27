// Helper that lazily seeds the fields directory on first read and returns the
// repos handle. Idempotent — bulkSeedIfEmpty is a no-op once any field exists.

import { getRepos } from "@platform/storage";
import { FIELD_SEEDS } from "./fieldsSeed";

let seeded = false;

export async function getFieldsRepos() {
  const repos = getRepos();
  if (!seeded) {
    try {
      await repos.fields.bulkSeedIfEmpty(FIELD_SEEDS);
    } catch {
      /* non-fatal: continue with whatever's there */
    }
    seeded = true;
  }
  return repos;
}

export function starRating(reviews: { rating: number }[]): { avg: number; count: number } {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function stars(avg: number): string {
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}
