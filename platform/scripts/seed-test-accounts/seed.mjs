#!/usr/bin/env node
// Seeds a realistic test team so the QA/UX agents exercise POPULATED surfaces
// instead of empty states. Idempotent: re-running reuses the existing team.
//
//   node scripts/seed-test-accounts/seed.mjs
//
// Requires a running dev server with PLATFORM_ALLOW_DEV_LOGIN=1 (the seed signs
// in through the legacy dev-login endpoint) and a persistent PLATFORM_DATA_DIR.
//
// Env:
//   SEED_BASE_URL  default http://localhost:3000
//   SEED_SEASON    "1" (default) also builds a sample season on FRESH creation
//                  only, because player ids are only known at that point. To
//                  rebuild the season, delete platform.json in PLATFORM_DATA_DIR.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.SEED_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const WITH_SEASON = (process.env.SEED_SEASON ?? "1") !== "0";
const DOMAIN = "firstpitch.test";
const TEAM_NAME = "Test Squad";
const TEAM_AGE_BAND = "13-15";
const SESSION_COOKIE = "platform_session";

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
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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

// 12 players. dob years land the whole roster in the 13-15 band as of 2026.
const ROSTER = [
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

async function main() {
  console.log(`[seed] target ${BASE}`);
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error(`[seed] cannot reach ${BASE}. Start the dev server first.`);
    process.exit(1);
  }

  // 1. Owner coach.
  const owner = await login(`coach1@${DOMAIN}`, "coach", "Coach Riley");
  console.log(`[seed] signed in as ${owner.user.email}`);

  // 2. Team (idempotent).
  const { teams = [] } = await api("GET", "/api/teams");
  let team = teams.find((t) => t.name === TEAM_NAME);
  const fresh = !team;
  if (!team) {
    ({ team } = await api("POST", "/api/teams", { name: TEAM_NAME, ageBand: TEAM_AGE_BAND }));
    console.log(`[seed] created team ${team.name} (${team.id})`);
  } else {
    console.log(`[seed] reusing existing team ${team.name} (${team.id})`);
  }

  // 3. Roster — only on fresh creation (there is no GET roster endpoint, so
  // re-adding on an existing team would silently duplicate players).
  let players = [];
  if (fresh) {
    for (let i = 0; i < ROSTER.length; i++) {
      const spec = ROSTER[i];
      const parentEmail = i < 5 ? `parent${i + 1}@${DOMAIN}` : undefined;
      const { player } = await api("POST", `/api/teams/${team.id}/players`, { ...spec, parentEmail });
      players.push(player);
    }
    console.log(`[seed] created ${players.length} players (5 with linked parents)`);

    // 4. Staff + athlete accounts. Athletes link to the first 5 roster players
    // so a signed-in player sees their own assigned missions.
    for (let i = 2; i <= 4; i++) {
      await api("POST", `/api/teams/${team.id}/members`, { email: `coach${i}@${DOMAIN}`, role: "coach", name: `Assistant Coach ${i}` });
    }
    for (let i = 0; i < 5; i++) {
      await api("POST", `/api/teams/${team.id}/members`, {
        email: `athlete${i + 1}@${DOMAIN}`,
        role: "player",
        name: `${players[i].firstName} ${players[i].lastName}`,
        playerId: players[i].id,
      });
    }
    console.log("[seed] linked 3 assistant coaches + 5 athlete accounts");
  } else {
    console.log("[seed] roster already present - skipping player/member creation");
  }

  // 5. Sample season, fresh creation only.
  if (fresh && WITH_SEASON && players.length) {
    const results = [
      { us: 7, them: 4 }, { us: 3, them: 5 }, { us: 8, them: 2 },
      { us: 6, them: 6 }, { us: 2, them: 9 }, { us: 5, them: 1 },
    ];
    const pitchers = players.filter((p) => p.canPitch);
    const now = Date.now();
    const DAY = 86_400_000;

    for (let g = 0; g < results.length; g++) {
      const startsAt = new Date(now - (results.length - g) * 7 * DAY).toISOString();
      const { game } = await api("POST", `/api/teams/${team.id}/games`, {
        opponent: OPPONENTS[g],
        startsAt,
        venue: g % 2 === 0 ? "Memorial Field" : "Away - Riverbend Park",
        homeAway: g % 2 === 0 ? "home" : "away",
        innings: 6,
      });

      // Attendance MUST land before stats: the stats route reads it to compute
      // each player's kind rating.
      const attendance = {};
      const absent = new Set(g % 3 === 0 ? [players[(g + 4) % players.length].id] : []);
      for (const p of players) attendance[p.id] = absent.has(p.id) ? "absent" : "present";
      await api("PATCH", `/api/games/${game.id}`, { attendance });

      // Pitchers alternate so no arm carries back-to-back outings. Rotate over
      // the pitchers actually present, or the starter could be the absentee.
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
      console.log(`[seed]   game ${g + 1}/6 vs ${OPPONENTS[g]} ${results[g].us}-${results[g].them}`);
    }

    for (let u = 0; u < 2; u++) {
      await api("POST", `/api/teams/${team.id}/games`, {
        opponent: OPPONENTS[6 + u],
        startsAt: new Date(now + (u + 3) * DAY).toISOString(),
        venue: u === 0 ? "Memorial Field" : "Away - Fairview HS",
        homeAway: u === 0 ? "home" : "away",
        innings: 6,
      });
    }
    console.log("[seed] season built: 6 completed (3-2-1) + 2 upcoming");
  } else if (!fresh) {
    console.log("[seed] season skipped (team already existed) - delete platform.json in PLATFORM_DATA_DIR to rebuild");
  }

  const lines = [
    "# Test accounts",
    "",
    "Generated by `node scripts/seed-test-accounts/seed.mjs`. All passwordless:",
    "sign in at **/login** and use the inline dev magic link, or POST",
    "`/api/auth/login` with `{email, role}` while `PLATFORM_ALLOW_DEV_LOGIN=1`.",
    "",
    `- Team: **${TEAM_NAME}** (${TEAM_AGE_BAND}) - id \`${team.id}\`, slug \`${team.slug}\``,
    "",
    "| Role | Email | Notes |",
    "| --- | --- | --- |",
    `| coach | coach1@${DOMAIN} | owner |`,
    ...[2, 3, 4].map((i) => `| coach | coach${i}@${DOMAIN} | assistant |`),
    ...[1, 2, 3, 4, 5].map((i) => `| player | athlete${i}@${DOMAIN} | linked to roster player ${i} |`),
    ...[1, 2, 3, 4, 5].map((i) => `| parent | parent${i}@${DOMAIN} | linked to roster player ${i} |`),
    "",
    "Bind the QA/UX agents to these personas so they exercise populated screens:",
    "",
    "```powershell",
    `$env:PERSONA_COACH_EMAIL="coach1@${DOMAIN}"`,
    `$env:PERSONA_PARENT_EMAIL="parent1@${DOMAIN}"`,
    `$env:PERSONA_PLAYER_EMAIL="athlete1@${DOMAIN}"`,
    "```",
    "",
  ];
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`[seed] wrote ${REPORT}`);
  console.log("[seed] done.");
}

main().catch((e) => {
  console.error("[seed] FAILED:", e.message);
  process.exit(1);
});
