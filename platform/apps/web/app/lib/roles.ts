// Tiny character lookup for batting-order slots and fielding positions.
// Used in two places:
//   - /learn/roles  (the kid-facing explainer page)
//   - BattingOrder / FieldBoard chips (so kids/parents see the character
//     names in the actual lineup, not just on the learning page)
//
// The data lives here (not in app/learn/roles) so server and client components
// can both import it without crossing the page boundary. The /learn/roles
// page is the only place that renders the long descriptions; everywhere else
// uses {emoji, name, tagline}.

export interface RoleChip {
  emoji: string;
  name: string;
  tagline: string;
}

/**
 * Batting-order characters indexed by 1-based slot number. Spots 10-12 are
 * for continuous-lineup leagues where everyone bats.
 */
export const BATTING_ROLE_BY_SLOT: Record<number, RoleChip> = {
  1: { emoji: "⚡", name: "Spark", tagline: "Get on base and start the offense." },
  2: { emoji: "🔗", name: "Link", tagline: "Move Spark along and connect to the big bats." },
  3: { emoji: "⭐", name: "Barrel", tagline: "Hit it hard and drive the inning." },
  4: { emoji: "💥", name: "RBI", tagline: "Bring runners home." },
  5: { emoji: "🚀", name: "Rocket", tagline: "Keep pressure on with hard contact and speed." },
  6: { emoji: "🔥", name: "Igniter", tagline: "Start the next wave." },
  7: { emoji: "🥊", name: "Battler", tagline: "Compete, walk, foul off pitches, be hard to strike out." },
  8: { emoji: "💨", name: "Turbo", tagline: "Run hard and pressure the defense." },
  9: { emoji: "🌉", name: "Bridge", tagline: "Flip the lineup back toward the top." },
  10: { emoji: "⚔️", name: "Charger", tagline: "Create something when the inning feels quiet." },
  11: { emoji: "🏃", name: "Hustle", tagline: "Run everything out and help the team." },
  12: { emoji: "🧨", name: "Fuse", tagline: "Get on base and light it up for the top." },
};

export function battingRoleFor(slot: number): RoleChip | undefined {
  return BATTING_ROLE_BY_SLOT[slot];
}

/**
 * Fielding-position characters indexed by position code (P, C, 1B...RF).
 * RV (Rover, used in Standard 10) reuses the centerfielder character because
 * it plays the same "extra outfielder" role.
 */
export const FIELDING_ROLE_BY_POSITION: Record<string, RoleChip> = {
  P: { emoji: "🔥", name: "Engine", tagline: "Starts every play, controls the pace, attacks the zone." },
  C: { emoji: "🧠", name: "Captain", tagline: "Leads the defense, blocks, communicates, keeps everyone locked in." },
  "1B": { emoji: "🧲", name: "Anchor", tagline: "Catches everything, saves throws, owns the bag." },
  "2B": { emoji: "⚡", name: "Flash", tagline: "Quick feet, quick hands, turns small plays into outs." },
  SS: { emoji: "🎖️", name: "Quarterback", tagline: "Runs the infield, covers ground, makes the big decisions." },
  "3B": { emoji: "🧱", name: "Wall", tagline: "Brave corner, hard shots, no fear." },
  LF: { emoji: "🦅", name: "Hawk", tagline: "Tracks fly balls, backs up third, protects the line." },
  CF: { emoji: "🏃‍♂️", name: "Ranger", tagline: "Covers the most grass, leads the outfield, backs up everyone." },
  RF: { emoji: "🎯", name: "Cannon", tagline: "Strong throws, backs up first, keeps runners honest." },
  RV: { emoji: "🦅", name: "Rover", tagline: "Extra outfielder — read the ball, run it down, back up the gap." },
};

export function fieldingRoleFor(position: string): RoleChip | undefined {
  return FIELDING_ROLE_BY_POSITION[position];
}
