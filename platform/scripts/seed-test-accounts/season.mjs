/** Keep resumed slots on their original schedule; start an empty season today. */
export function seasonAnchor(games, marker, teamIndex, completedCount, now = Date.now()) {
  const day = 86_400_000;
  for (const game of games) {
    if (!game.notes?.startsWith(marker)) continue;
    const slot = game.notes.slice(marker.length).match(/^(completed|upcoming):(\d+)\]$/);
    const startsAt = Date.parse(game.startsAt);
    if (!slot || !Number.isFinite(startsAt)) continue;
    const index = Number(slot[2]);
    if (slot[1] === "completed" && index < completedCount) {
      return startsAt + ((completedCount - index) * 7 + teamIndex) * day;
    }
    if (slot[1] === "upcoming" && index < 2) {
      return startsAt - (index + 3 + teamIndex) * day;
    }
  }
  return now;
}
