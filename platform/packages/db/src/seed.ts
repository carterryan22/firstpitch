// Seed script — populates the canonical Metric rows used by the diagnosis layer
// and creates one demo Org / Team / Player so the UI has something to render.
//
// Run: `npm run seed -w @platform/db` (requires DATABASE_URL).

import { PrismaClient, AgeBand, Sport, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const METRICS: Array<{ key: string; label: string; unit: string; sport: Sport; ageBands: AgeBand[] }> = [
  // Hitting
  { key: "EV_TEE",          label: "Exit Velo (Tee)",         unit: "mph", sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "EV_FRONT_TOSS",   label: "Exit Velo (Front Toss)",  unit: "mph", sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "EV_LIVE",         label: "Exit Velo (Live)",        unit: "mph", sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "BAT_SPEED",       label: "Bat Speed",               unit: "mph", sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "ATTACK_ANGLE",    label: "Attack Angle",            unit: "deg", sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "DISTANCE",        label: "Batted-ball Distance",    unit: "ft",  sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "HARD_HIT_PCT",    label: "Hard Hit %",              unit: "%",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "K_RATE",          label: "Strikeout Rate",          unit: "%",   sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "BB_RATE",         label: "Walk Rate",               unit: "%",   sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "OPS",             label: "On-base + Slugging",      unit: "ratio", sport: Sport.both,   ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  // Speed / base running
  { key: "HOME_TO_FIRST",   label: "Home to First",           unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "HOME_TO_SECOND",  label: "Home to Second",          unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "FIRST_TO_THIRD",  label: "First to Third",          unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "SPRINT_10",       label: "10-yard Sprint",          unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "SPRINT_20",       label: "20-yard Sprint",          unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "SPRINT_30",       label: "30-yard Sprint",          unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "SB_SUCCESS_PCT",  label: "Stolen Base Success %",   unit: "%",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "REACTION_MS",     label: "Visual Reaction Time",    unit: "ms",  sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  // Pitching — baseball
  { key: "FB_VELO",         label: "Fastball Velocity",       unit: "mph", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "FB_SPIN",         label: "Fastball Spin Rate",      unit: "rpm", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "CH_SEPARATION",   label: "Changeup Velo Separation", unit: "mph", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "STRIKE_PCT",      label: "Strike %",                unit: "%",   sport: Sport.baseball, ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "FIRST_PITCH_STRIKE_PCT", label: "First-Pitch Strike %", unit: "%", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "NINE_BOX_SCORE",  label: "9-Box Command Score",     unit: "score", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "WHIP",            label: "Walks + Hits per IP",     unit: "ratio", sport: Sport.baseball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  // Pitching — softball
  { key: "RISE_DROP_BREAK", label: "Vertical Break (Rise/Drop)", unit: "in", sport: Sport.softball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "SB_FB_VELO",      label: "Fastball Velocity (Softball)", unit: "mph", sport: Sport.softball, ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  // Catcher / fielding
  { key: "POP_TIME",        label: "Catcher Pop Time",        unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "OF_ARM_VELO",     label: "Outfield Arm Velocity",   unit: "mph", sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "IF_EXCHANGE_TIME",label: "Infield Exchange Time",   unit: "s",   sport: Sport.both,     ageBands: [AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  { key: "FIELDING_PCT",    label: "Fielding %",              unit: "%",   sport: Sport.both,     ageBands: [AgeBand.AGE_9_12, AgeBand.AGE_13_15, AgeBand.AGE_16_PLUS] },
  // Participation (younger)
  { key: "PARTICIPATION",   label: "Participation Count",     unit: "sessions", sport: Sport.both, ageBands: [AgeBand.AGE_6_8, AgeBand.AGE_9_12] },
];

async function main() {
  console.log("Seeding metrics...");
  for (const m of METRICS) {
    await prisma.metric.upsert({ where: { key: m.key }, create: m, update: m });
  }

  console.log("Seeding demo org/team/player...");
  const org = await prisma.org.upsert({
    where: { slug: "demo-club" },
    create: { name: "Demo Baseball Club", slug: "demo-club" },
    update: {},
  });

  const coach = await prisma.user.upsert({
    where: { email: "coach@demo.local" },
    create: { email: "coach@demo.local", name: "Coach Demo", role: UserRole.coach, orgId: org.id },
    update: {},
  });

  const team = await prisma.team.create({
    data: { orgId: org.id, name: "11U Demo", ageBand: AgeBand.AGE_9_12, sport: Sport.baseball, season: "Spring 2026" },
  });

  const player = await prisma.player.create({
    data: {
      firstName: "Alex",
      lastName: "Demo",
      dob: new Date("2014-04-01"),
      ageBand: AgeBand.AGE_9_12,
      sport: Sport.baseball,
      positions: ["SS", "P"],
      handedness: "R",
    },
  });

  await prisma.teamMember.create({
    data: { teamId: team.id, userId: coach.id, role: "head_coach" },
  });
  await prisma.teamMember.create({
    data: { teamId: team.id, playerId: player.id, role: "player" },
  });

  console.log(`Seeded org=${org.id} team=${team.id} player=${player.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
