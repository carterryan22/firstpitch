// Game helpers for server components.

import { getRepos } from "@platform/storage";
import type { GameRecord } from "@platform/storage";

export async function gamesForTeam(teamId: string): Promise<GameRecord[]> {
  const all = await getRepos().games.list({ teamId });
  return all.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
}

export function splitUpcomingPast(games: GameRecord[], now: Date = new Date()): {
  upcoming: GameRecord[];
  past: GameRecord[];
} {
  const upcoming: GameRecord[] = [];
  const past: GameRecord[] = [];
  for (const g of games) {
    if (g.status === "completed" || new Date(g.startsAt) < now) past.push(g);
    else upcoming.push(g);
  }
  upcoming.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  past.sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
  return { upcoming, past };
}

export function statusLabel(s: GameRecord["status"]): { label: string; cls: string } {
  switch (s) {
    case "scheduled":
      return { label: "Scheduled", cls: "badge-info" };
    case "in_progress":
      return { label: "In Progress", cls: "badge-warn" };
    case "completed":
      return { label: "Completed", cls: "badge-ok" };
  }
}

export function formatGameWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
