import type { Tour } from "./walkthrough";

/**
 * Named walkthrough definitions, mirroring Who's on Second's per-surface tours
 * (Dashboard / Roster / Lineup / Team rules). Copy lives here so it can be
 * tweaked without touching the overlay component, and so each `data-tour`
 * anchor has a single source of truth.
 */

export const TEAM_HOME_TOUR: Tour = {
  id: "team-home",
  label: "Team tour",
  steps: [
    {
      title: "Welcome to your team HQ",
      body: "This is home base for the season. Take 20 seconds and I'll show you where everything lives.",
    },
    {
      target: "team-nav",
      title: "Five tabs, everywhere",
      body: "Home, Games, Roster, Pitching, and More. The same five tabs show up on your phone's bottom bar — so it's the same muscle memory at the field.",
    },
    {
      target: "team-roster",
      title: "Your roster",
      body: "Add players, mark who can pitch or catch, and invite parents. Everything downstream — lineups, fairness, missions — reads from here.",
    },
    {
      target: "team-build-practice",
      title: "Build a safety-gated practice",
      body: "One tap compiles a Pitch Smart-aware plan for this team's age band, with a parent-friendly version you can share.",
    },
    {
      target: "team-practices",
      title: "Your practices live here",
      body: "Scheduled, past, and draft plans stack up in this column so you can reuse what worked. That's it — you're ready to coach.",
    },
  ],
};
