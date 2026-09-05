#!/usr/bin/env node
// Seeds four realistic test teams so the QA/UX agents exercise POPULATED
// surfaces instead of empty states. Idempotent: re-running reuses existing
// teams and does not duplicate their rosters or seasons.
//
//   node scripts/seed-test-accounts/seed.mjs
//
// Requires a running dev server with PLATFORM_ALLOW_DEV_LOGIN=1 (the seed signs
// in through the legacy dev-login endpoint) and a persistent PLATFORM_DATA_DIR.
//
// Env:
//   SEED_BASE_URL  default http://localhost:3000
//   SEED_SEASON    "1" (default) builds/resumes a tagged sample season. Existing
//                  untagged seasons are preserved. No database deletion needed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seasonAnchor } from "./season.mjs";
import { validateSeedHealth } from "./preflight.mjs";
import { automationHeaders } from "../automation-access.mjs";

const BASE = (process.env.SEED_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const WITH_SEASON = (process.env.SEED_SEASON ?? "1") !== "0";
const DOMAIN = "firstpitch.test";
const SESSION_COOKIE = "platform_session";

const DIRECTOR = { email: `coach1@${DOMAIN}`, name: "Coach Riley Morgan" };
const TEAM_SPECS = [
  { key: "cascade", name: "Cascade Comets", ageBand: "13-15", coaches: ["Jordan Lee", "Taylor Brooks"] },
  { key: "harbor", name: "Harbor Hawks", ageBand: "13-15", coaches: ["Casey Rivera", "Morgan Chen"] },
  { key: "summit", name: "Summit Sparks", ageBand: "13-15", coaches: ["Avery Patel", "Quinn Foster"] },
  { key: "valley", name: "Valley Vipers", ageBand: "13-15", coaches: ["Reese Thompson", "Cameron Davis"] },
];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(HERE, "../../reports/test-accounts.md");

// Deterministic PRNG so re-seeding a fresh store yields the same season.
let _seed = 20260803;
const rnd = () => ((_seed = (_seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

let cookie = "";

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "error",
    headers: { "content-type": "application/json", ...automationHeaders(`${BASE}${path}`), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`${method} ${path} did not return First Pitch JSON. Check deployment protection and the target URL; seeding stopped.`);
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    if (c.startsWith(`${SESSION_COOKIE}=`)) cookie = c.split(";")[0];
  }
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

const login = (email, role, name) => api("POST", "/api/auth/login", { email, role, name });

// Twelve roster templates. Names are rotated per team so all 48 demo players
// are distinct; DOB years land every roster in the 13-15 band as of 2026.
const ROSTER_TEMPLATES = [
  { firstName: "Mason", lastName: "Reyes", jerseyNumber: "2", dob: "2012-04-11", bats: "R", throws: "R", battingSkill: 4, canPitch: true, canCatch: false, positionRatings: { SS: "preferred", "2B": "ok", P: "ok" } },
  { firstName: "Eli", lastName: "Nakamura", jerseyNumber: "5", dob: "2011-09-02", bats: "L", throws: "R", battingSkill: 5, canPitch: true, canCatch: false, positionRatings: { CF: "preferred", P: "preferred", SS: "ok" } },
  { firstName: "Jonah", lastName: "Alvarez", jerseyNumber: "7", dob: "2012-01-23", bats: "R", throws: "R", battingSkill: 3, canPitch: false, canCatch: true, positionRatings: { C: "preferred", "1B": "ok", RF: "avoid" } },
  { firstName: "Theo", lastName: "Brennan", jerseyNumber: "9", dob: "2013-03-30", bats: "R", throws: "R", battingSkill: 3, canPitch: false, canCatch: false, positionRatings: { "1B": "preferred", LF: "ok" } },
  { firstName: "Amara", lastName: "Okafor", jerseyNumber: "11", dob: "2012-07-19", bats: "L", throws: "L", battingSkill: 4, canPitch: true, canCatch: false, positionRatings: { RF: "preferred", P: "ok", "1B": "ok" } },
  { firstName: "Diego", lastName: "Santos", jerseyNumber: "12", dob: "2011-11-05", bats: "S", throws: "R", battingSkill: 4, canPitch: false, canCatch: true, positionRatings: { C: "ok", "3B": "preferred" } },
  { firstName: "Kai", lastName: "Whitfield", jerseyNumber: "14", dob: "2013-05-14", bats: "R", throws: "R", battingSkill: 2, canPitch: false, canCatch: false, positionRatings: { LF: "preferred", RF: "ok", SS: "avoid" } },
  { firstName: "Rowan", lastName: "Petrov", jerseyNumber: "17", dob: "2012-10-08", bats: "R", throws: "R", battingSkill: 3, canPitch: true, canCatch: false, positionRatings: { "2B": "preferred", P: "ok" } },
  { firstName: "Silas", lastName: "Dubois", jerseyNumber: "21", dob: "2011-06-27", bats: "L", throws: "L", battingSkill: 4, canPitch: false, canCatch: false, positionRatings: { "1B": "preferred", RF: "ok" } },
  { firstName: "Nico", lastName: "Ferrante", jerseyNumber: "24", dob: "2013-02-16", bats: "R", throws: "R", battingSkill: 2, canPitch: false, canCatch: false, positionRatings: { "3B": "ok", LF: "ok" } },
  { firstName: "Ari", lastName: "Lindqvist", jerseyNumber: "27", dob: "2012-12-01", bats: "R", throws: "R", battingSkill: 3, canPitch: true, canCatch: false, positionRatings: { P: "preferred", CF: "ok" } },
  { firstName: "Beau", lastName: "Castellanos", jerseyNumber: "33", dob: "2011-08-22", bats: "R", throws: "R", battingSkill: 5, canPitch: false, canCatch: true, positionRatings: { C: "preferred", "3B": "ok" } },
];

const PLAYER_NAMES = [
  "Mason Reyes", "Eli Nakamura", "Jonah Alvarez", "Theo Brennan", "Amara Okafor", "Diego Santos",
  "Kai Whitfield", "Rowan Petrov", "Silas Dubois", "Nico Ferrante", "Ari Lindqvist", "Beau Castellanos",
  "Liam Carter", "Noah Bennett", "Mia Robinson", "Lucas Martinez", "Zoe Campbell", "Ethan Nguyen",
  "Sofia Ramirez", "Caleb Wilson", "Layla Anderson", "Owen Thomas", "Ivy Jackson", "Miles Harris",
  "Jack Turner", "Aiden Parker", "Emma Lewis", "Henry Walker", "Nora Hall", "Leo Young",
  "Ruby King", "Isaac Wright", "Lena Scott", "Wyatt Green", "Maya Baker", "Ezra Adams",
  "Finn Nelson", "Jude Hill", "Chloe Rivera", "Cole Mitchell", "Sadie Roberts", "Max Phillips",
  "Lucy Evans", "Sam Edwards", "Grace Collins", "Alex Stewart", "Piper Morris", "Ben Rogers",
];

function rosterForTeam(teamIndex) {
  return ROSTER_TEMPLATES.map((template, playerIndex) => {
    const [firstName, lastName] = PLAYER_NAMES[teamIndex * 12 + playerIndex].split(" ");
    return { ...template, firstName, lastName };
  });
}

function personaEmail(kind, teamIndex, playerIndex) {
  if (teamIndex === 0 && playerIndex === 0) {
    return `${kind === "parent" ? "parent" : "athlete"}1@${DOMAIN}`;
  }
  const key = TEAM_SPECS[teamIndex].key;
  return `${kind}.${key}.${String(playerIndex + 1).padStart(2, "0")}@${DOMAIN}`;
}

const OPPONENTS = ["Northside Cardinals", "Riverbend Rays", "Oak Hill Owls", "Granite Falls Grizzlies", "Lakeshore Locos", "Cedar Park Pilots", "Fairview Foxes", "Millbrook Miners"];

function battingLine(skill) {
  const ab = int(2, 4);
  const hits = Math.min(ab, Math.max(0, Math.round((skill / 5) * rnd() * 3)));
  const xbh = hits > 0 && rnd() > 0.7 ? 1 : 0;
  const bb = rnd() > 0.75 ? 1 : 0;
  return {
    pa: ab + bb,
    ab,
    h: hits,
    "1b": Math.max(0, hits - xbh),
    "2b": xbh,
    r: Math.min(hits + bb, int(0, 2)),
    rbi: int(0, Math.max(1, hits)),
    bb,
    so: Math.max(0, Math.min(ab - hits, rnd() > 0.6 ? 1 : 0)),
    qab: Math.min(ab + bb, hits + bb + (rnd() > 0.6 ? 1 : 0)),
  };
}

// Pitch Smart: 13-15 daily max is 95, and anything 66+ demands 4 rest days.
// Seeded outings stay under 70 so the sample season never models an unsafe week.
function pitchingLine() {
  const ip = int(2, 3);
  const pitches = int(38, 66);
  return {
    ip,
    bf: ip * int(3, 5),
    pitches,
    strikes: Math.round(pitches * (0.58 + rnd() * 0.12)),
    h: int(1, 4),
    r: int(0, 3),
    er: int(0, 2),
    bb: int(0, 2),
    so: int(2, 6),
  };
}

const fieldingLine = (position, innings) => ({
  position,
  innings,
  po: int(0, 3),
  a: int(0, 2),
  e: rnd() > 0.85 ? 1 : 0,
});

function primaryPosition(p) {
  const prefer = Object.entries(p.positionRatings || {}).find(([, v]) => v === "preferred");
  if (prefer) return prefer[0];
  const ok = Object.entries(p.positionRatings || {}).find(([, v]) => v === "ok");
  return ok ? ok[0] : "LF";
}

async function seedSeason(team, players, teamIndex) {
  const marker = `[firstpitch-demo:${TEAM_SPECS[teamIndex].key}:`;
  const { games: existingGames = [] } = await api("GET", `/api/teams/${team.id}/games`);
  if (existingGames.length && !existingGames.some((game) => game.notes?.startsWith(marker))) {
    console.log(`[seed] ${team.name}: existing season preserved`);
    return;
  }
  const results = [
    { us: 7, them: 4 }, { us: 3, them: 5 }, { us: 8, them: 2 },
    { us: 6, them: 6 }, { us: 2, them: 9 }, { us: 5, them: 1 },
  ];
  const pitchers = players.filter((p) => p.canPitch);
  const now = seasonAnchor(existingGames, marker, teamIndex, results.length);
  const DAY = 86_400_000;

  for (let g = 0; g < results.length; g++) {
    _seed = 20260803 + teamIndex * 100 + g;
    const notes = `${marker}completed:${g}]`;
    let game = existingGames.find((candidate) => candidate.notes === notes);
    if (game?.status === "completed") continue;
    const startsAt = game?.startsAt ?? new Date(now - (results.length - g) * 7 * DAY - teamIndex * DAY).toISOString();
    if (!game) ({ game } = await api("POST", `/api/teams/${team.id}/games`, {
      opponent: OPPONENTS[(g + teamIndex * 2) % OPPONENTS.length],
      startsAt,
      venue: g % 2 === 0 ? "Memorial Field" : "Away - Riverbend Park",
      homeAway: g % 2 === 0 ? "home" : "away",
      innings: 6,
      notes,
    }));

    const attendance = {};
    const absent = new Set(g % 3 === 0 ? [players[(g + 4) % players.length].id] : []);
    for (const p of players) attendance[p.id] = absent.has(p.id) ? "absent" : "present";
    await api("PATCH", `/api/games/${game.id}`, { attendance });

    const availablePitchers = pitchers.filter((p) => !absent.has(p.id));
    const starter = availablePitchers[g % availablePitchers.length];
    const entries = players
      .filter((p) => !absent.has(p.id))
      .map((p) => ({
        playerId: p.id,
        batting: battingLine(p.battingSkill ?? 3),
        pitching: p.id === starter.id ? pitchingLine() : undefined,
        fielding: [fieldingLine(primaryPosition(p), 6)],
      }));
    await api("POST", `/api/games/${game.id}/stats`, { format: "manual", entries });

    const starterPitches = entries.find((e) => e.playerId === starter.id)?.pitching;
    await api("PATCH", `/api/games/${game.id}`, {
      finalScore: results[g],
      battingOrder: players.filter((p) => !absent.has(p.id)).slice(0, 9).map((p) => p.id),
      pitchCounts: {
        [starter.id]: { pitches: starterPitches.pitches, innings: starterPitches.ip, recordedAt: startsAt },
      },
      markCompleted: true,
    });
  }

  for (let u = 0; u < 2; u++) {
    const notes = `${marker}upcoming:${u}]`;
    if (existingGames.some((game) => game.notes === notes)) continue;
    await api("POST", `/api/teams/${team.id}/games`, {
      opponent: OPPONENTS[(6 + u + teamIndex * 2) % OPPONENTS.length],
      startsAt: new Date(now + (u + 3 + teamIndex) * DAY).toISOString(),
      venue: u === 0 ? "Memorial Field" : "Away - Fairview HS",
      homeAway: u === 0 ? "home" : "away",
      innings: 6,
      notes,
    });
  }
  console.log(`[seed] ${team.name}: 6 completed games + 2 upcoming`);
}

async function main() {
  console.log(`[seed] target ${BASE}`);
  try {
    const response = await fetch(`${BASE}/api/health`, { headers: automationHeaders(`${BASE}/api/health`), redirect: "error", signal: AbortSignal.timeout(15000) });
    const health = response.headers.get("content-type")?.includes("application/json")
      ? await response.json() : null;
    validateSeedHealth(response.status, health, process.env.SEED_ALLOW_NO_EMAIL === "1");
  } catch (error) {
    throw new Error(
      `preflight failed for ${BASE}; no seed writes attempted. (${error?.message || error})`,
    );
  }

  const owner = await login(DIRECTOR.email, "coach", DIRECTOR.name);
  console.log(`[seed] signed in as ${owner.user.email}`);

  const { teams: existingTeams = [] } = await api("GET", "/api/teams");
  const seededTeams = [];
  const accountRows = [["coach", DIRECTOR.email, "director; access to all four teams"]];

  for (let teamIndex = 0; teamIndex < TEAM_SPECS.length; teamIndex++) {
    const spec = TEAM_SPECS[teamIndex];
    let team = existingTeams.find((candidate) => candidate.name === spec.name);
    if (!team) {
      ({ team } = await api("POST", "/api/teams", { name: spec.name, ageBand: spec.ageBand }));
      console.log(`[seed] created ${team.name} (${team.id})`);
    } else {
      console.log(`[seed] reusing ${team.name} (${team.id})`);
    }

    for (let coachIndex = 0; coachIndex < spec.coaches.length; coachIndex++) {
      const email = `coach.${spec.key}.${coachIndex + 1}@${DOMAIN}`;
      await api("POST", `/api/teams/${team.id}/members`, {
        email,
        role: "coach",
        name: spec.coaches[coachIndex],
      });
      accountRows.push(["coach", email, `${team.name} ${coachIndex === 0 ? "lead" : "assistant"}`]);
    }

    const { players: existingPlayers = [] } = await api("GET", `/api/teams/${team.id}/players`);
    const byJersey = new Map(existingPlayers.map((player) => [player.jerseyNumber, player]));
    const players = [];
    const roster = rosterForTeam(teamIndex);
    for (let playerIndex = 0; playerIndex < roster.length; playerIndex++) {
      const rosterSpec = roster[playerIndex];
      const parentEmail = personaEmail("parent", teamIndex, playerIndex);
      const athleteEmail = personaEmail("athlete", teamIndex, playerIndex);
      let player = byJersey.get(rosterSpec.jerseyNumber);
      if (!player) {
        ({ player } = await api("POST", `/api/teams/${team.id}/players`, { ...rosterSpec, parentEmail }));
      }
      players.push(player);
      const fullName = `${player.firstName} ${player.lastName}`;
      await api("POST", `/api/teams/${team.id}/members`, {
        email: athleteEmail,
        role: "player",
        name: fullName,
        playerId: player.id,
      });
      await api("POST", `/api/teams/${team.id}/members`, {
        email: parentEmail,
        role: "parent",
        name: `${player.firstName}'s Parent`,
        playerId: player.id,
      });
      accountRows.push(["player", athleteEmail, `${team.name} #${player.jerseyNumber} ${fullName}`]);
      accountRows.push(["parent", parentEmail, `linked to ${fullName} on ${team.name}`]);
    }
    console.log(`[seed] ${team.name}: ${players.length} players, 12 parents, 12 athlete accounts, 3 coaches`);

    if (WITH_SEASON) {
      await seedSeason(team, players, teamIndex);
    }
    seededTeams.push(team);
  }

  const lines = [
    "# Test accounts",
    "",
    "Generated by `node scripts/seed-test-accounts/seed.mjs`. All accounts are passwordless.",
    "Use the inline dev link or `POST /api/auth/login` only on a preview with",
    "`PLATFORM_ALLOW_DEV_LOGIN=1`; production should use configured email magic links.",
    "",
    "## Seeded teams",
    "",
    ...seededTeams.map((team) => `- **${team.name}** (${team.ageBand}) — id \`${team.id}\`, slug \`${team.slug}\``),
    "",
    "Each team has 12 roster players, 12 linked athlete accounts, 12 linked parent accounts,",
    "one shared director, two team coaches, six completed games, and two upcoming games.",
    "",
    "## Accounts",
    "",
    "| Role | Email | Notes |",
    "| --- | --- | --- |",
    ...accountRows.map(([role, email, notes]) => `| ${role} | ${email} | ${notes} |`),
    "",
    "## Primary QA personas",
    "",
    "```powershell",
    `$env:PERSONA_COACH_EMAIL="${DIRECTOR.email}"`,
    `$env:PERSONA_PARENT_EMAIL="parent1@${DOMAIN}"`,
    `$env:PERSONA_PLAYER_EMAIL="athlete1@${DOMAIN}"`,
    "```",
    "",
  ];
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`[seed] wrote ${REPORT}`);
  console.log(`[seed] done: ${seededTeams.length} teams, 48 players, 48 parents, 48 athlete accounts, 9 coaches.`);
}

main().catch((e) => {
  console.error("[seed] FAILED:", e.message);
  process.exitCode = 1;
});
