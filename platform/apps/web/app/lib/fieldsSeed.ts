// Seed catalog used by the /fields directory.
// Modeled after the dugout-dirt.com public scouting list — Bellevue / Issaquah
// area diamonds. On first read of the fields repo we bulk-seed if empty so the
// directory is never blank, while user-submitted reviews/bookings still
// accumulate in the same store.

import type { FieldRecord } from "@platform/storage";

export type FieldSeed = Omit<FieldRecord, "id" | "createdAt">;

export const FIELD_SEEDS: FieldSeed[] = [
  {
    slug: "southwest-small-field-bellevue-wa",
    name: "Southwest Small Field",
    city: "Bellevue",
    state: "WA",
    type: "multi",
    surface: "turf",
    lights: true,
    notes: "Small diamond, shaded parent area. Snack stand opens for league games only.",
    lat: 47.5894601,
    lng: -122.1415333,
    sourceUrl: "https://www.openstreetmap.org/way/1457938045",
  },
  {
    slug: "robinswood-park-baseball-field-1-bellevue-wa",
    name: "Robinswood Park Baseball Field #1",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "grass",
    lights: true,
    notes: "Real grass infield. Backstop solid enough for cage work. Bring a rake mid-season.",
    lat: 47.5793,
    lng: -122.1496,
  },
  {
    slug: "courter-baseball-field-bellevue-wa",
    name: "Courter Baseball Field",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "mixed",
    lights: false,
    notes: "Tight foul lines — heads up on the third-base side. Decent dugouts.",
  },
  {
    slug: "federal-field-bellevue-wa",
    name: "Federal Field",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "dirt",
    lights: true,
    notes: "Full-size diamond. Parking is street-only on Saturdays.",
  },
  {
    slug: "bannerwood-park-baseball-field-bellevue-wa",
    name: "Bannerwood Park Baseball Field",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "grass",
    lights: false,
    notes: "Hidden gem. Bring water — fountain doesn't always work.",
  },
  {
    slug: "boeing-mariners-care-athletic-field-bellevue-wa",
    name: "Boeing Mariners Care Athletic Field",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "turf",
    lights: true,
    notes: "All-turf showpiece. Reserve ahead — heavy demand.",
  },
  {
    slug: "field-2-bellevue-wa-3",
    name: "Crossroads Park Field 2",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "grass",
    lights: false,
    notes: "Standard rec diamond. Best for U10–U12. Bring your own bases for warmups.",
  },
  {
    slug: "field-1-bellevue-wa",
    name: "Crossroads Park Field 1",
    city: "Bellevue",
    state: "WA",
    type: "baseball",
    surface: "grass",
    lights: false,
    notes: "Standard rec diamond next to the playground — parents have a spot to park kids during practice.",
  },
  {
    slug: "field-6-issaquah-wa",
    name: "Pickering Field 6",
    city: "Issaquah",
    state: "WA",
    type: "baseball",
    surface: "grass",
    lights: true,
    notes: "Foul balls go into the parking lot — park accordingly.",
  },
  {
    slug: "issaquah-community-ball-park-1-issaquah-wa",
    name: "Issaquah Community Ball Park #1",
    city: "Issaquah",
    state: "WA",
    type: "baseball",
    surface: "mixed",
    lights: true,
    notes: "Real fence dimensions: LF 200 / CF 220 / RF 200 ft. Decent restrooms.",
  },
  {
    slug: "issaquah-community-ball-park-2-issaquah-wa",
    name: "Issaquah Community Ball Park #2",
    city: "Issaquah",
    state: "WA",
    type: "softball",
    surface: "dirt",
    lights: true,
    notes: "Softball-size diamond. Shared parking with ICBP #1 — arrive early for tournaments.",
  },
  {
    slug: "central-park-tball-issaquah-wa",
    name: "Central Park T-Ball Diamond",
    city: "Issaquah",
    state: "WA",
    type: "tee-ball",
    surface: "grass",
    lights: false,
    notes: "Shade for parents on the first-base side. Playground 20 yards away — a win.",
  },
];

/** Compute great-circle distance in miles. Returns Infinity if either point lacks coords. */
export function milesBetween(
  a: { lat?: number; lng?: number },
  b: { lat?: number; lng?: number },
): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
