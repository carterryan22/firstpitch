// Kid-friendly character profiles for each batting-order spot and fielding
// position. The voice is intentionally warm and concrete: every kid should be
// able to point at one of these and say "that's me, and my job matters."
//
// Sources behind the descriptions:
// - Batting-order construction: standard youth/HS coaching guidance (leadoff
//   = OBP & speed, 2 = contact/bat control, 3-4 = best hitters, 5 = protect
//   the cleanup, 6-7 = secondary RBI, 8-9 = table-setters in youth ball where
//   the order recycles fast).
// - Fielding position descriptions: MLB/Little League position primers
//   adapted to ~9-12 year-old language and responsibilities.

export interface RoleCharacter {
  id: string;
  code?: string; // e.g. "SS" for fielding badge
  name: string;
  subtitle: string;
  emoji: string;
  tagline: string;
  job: string;
  superpower: string;
  whyMatters: string;
  proTip?: string;
}

export const BATTING_ORDER_CHARACTERS: RoleCharacter[] = [
  {
    id: "1",
    name: "Spark",
    subtitle: "Leadoff hitter",
    emoji: "⚡",
    tagline: "Get on base and start the offense.",
    job: "Lead off the game and lead off innings. See pitches, work the count, get on any way you can — walk, bunt, hit-by-pitch, line drive, infield hit. They all count the same.",
    superpower:
      "Patience plus speed. You take close pitches and turn singles into doubles on the bases.",
    whyMatters:
      "The whole lineup behind you is built to drive runs in. If you reach base, the team scores. If you make an out on the first pitch, four hitters never come up.",
    proTip:
      "Your stat is on-base percentage, not batting average. A walk is a win.",
  },
  {
    id: "2",
    name: "Link",
    subtitle: "Two-hole hitter",
    emoji: "🔗",
    tagline: "Move Spark along and connect to the big bats.",
    job: "Move the runner. Bat control is your thing — hit-and-runs, bunts, opposite-field grounders, and long at-bats that let Spark steal.",
    superpower:
      "You put the bat on almost any pitch and choose where the ball goes.",
    whyMatters:
      "You're the bridge between the spark and the bashers. A good two-hole turns a single into a runner on third with one out.",
    proTip:
      "Choke up with two strikes. A strikeout here wastes Spark's hard work.",
  },
  {
    id: "3",
    name: "Barrel",
    subtitle: "Three-hole hitter",
    emoji: "⭐",
    tagline: "Hit it hard and drive the inning.",
    job: "Be the most complete hitter on the team. Hit for average, hit for power, run hard, and almost never strike out looking.",
    superpower:
      "You barrel up the baseball. A single drives in a runner from second; a double clears the bases.",
    whyMatters:
      "You come up in almost every big inning. The top of the order is supposed to be on base when you walk up — and you cash them in.",
  },
  {
    id: "4",
    name: "RBI",
    subtitle: "Cleanup hitter",
    emoji: "💥",
    tagline: "Bring runners home.",
    job: "Drive runners in. You're often the strongest hitter — line drives in the gaps, deep fly balls, hard contact that scores runners from anywhere.",
    superpower:
      "Power. When you square one up, the outfielders take a step back.",
    whyMatters:
      "Your single can score two. Your double can score three. Coaches build the whole lineup so this spot comes up with people on base.",
    proTip:
      "A strikeout with the bases loaded hurts more than anywhere else in the order. Stay short to the ball.",
  },
  {
    id: "5",
    name: "Rocket",
    subtitle: "Five-hole hitter",
    emoji: "🚀",
    tagline: "Keep pressure on with hard contact and speed.",
    job: "Punish the pitcher for being careful with RBI. Drive in any runners cleanup didn't, take the extra base, and keep the rally alive.",
    superpower:
      "Power plus speed. You stretch singles into doubles and force the defense to rush.",
    whyMatters:
      "If you're a threat, the pitcher has to throw strikes to #4. That's how the heart of the order does damage.",
  },
  {
    id: "6",
    name: "Igniter",
    subtitle: "Six-hole hitter",
    emoji: "🔥",
    tagline: "Start the next wave.",
    job: "Restart the inning when the top of the order goes quiet. Tough at-bats, situational hitting, never give an out away.",
    superpower:
      "You re-light innings. A leadoff hit from the six spot turns the lineup over with momentum.",
    whyMatters:
      "If the heart of the order goes 1-2-3, you decide whether the inning dies or a second rally begins.",
  },
  {
    id: "7",
    name: "Battler",
    subtitle: "Seven-hole hitter",
    emoji: "🥊",
    tagline: "Compete, walk, foul off pitches, be hard to strike out.",
    job: "Wear the pitcher down. Foul off close pitches, take ball four, find a way on base no matter how the at-bat starts.",
    superpower:
      "Grit. Long at-bats from the bottom of the order break a pitcher's count and pitch limit.",
    whyMatters:
      "Innings die in the bottom of the order. Every time you keep one alive, the top comes back around.",
  },
  {
    id: "8",
    name: "Turbo",
    subtitle: "Eight-hole hitter",
    emoji: "💨",
    tagline: "Run hard and pressure the defense.",
    job: "Get on base however you can — then run. Beat out grounders, take the extra base, steal when the catcher isn't looking.",
    superpower:
      "Hustle and speed. You turn fielders' small mistakes into bases.",
    whyMatters:
      "A runner on with Bridge and Spark coming up = an instant rally. The kid who never stops running changes the game.",
  },
  {
    id: "9",
    name: "Bridge",
    subtitle: "Nine-hole hitter",
    emoji: "🌉",
    tagline: "Flip the lineup back toward the top.",
    job: "Get on base for the top of the order. Speed and a good eye matter more than power here. Bunt for a hit if it's there.",
    superpower:
      "You're the second leadoff. A walk and a stolen base is the same as a double.",
    whyMatters:
      "In youth games the lineup turns over fast. A 9-1-2 mini-rally is how scores explode in the late innings.",
    proTip:
      "Hitting ninth is NOT a punishment — great coaches put a fast, smart hitter here on purpose.",
  },
  {
    id: "10",
    name: "Charger",
    subtitle: "Ten-hole (continuous lineup)",
    emoji: "⚔️",
    tagline: "Create something when the inning feels quiet.",
    job: "When the bottom of the order keeps batting, you're the one who has to manufacture a run. Move a runner, slap a single, lay down a bunt — make something happen.",
    superpower:
      "You play with no pressure and nothing to lose. That's a weapon.",
    whyMatters:
      "Continuous lineups (every kid bats) live or die at #10-12. If you go down quietly, the inning ends. If you charge, the rally rolls into Spark again.",
  },
  {
    id: "11",
    name: "Hustle",
    subtitle: "Eleven-hole (continuous lineup)",
    emoji: "🏃",
    tagline: "Run everything out and help the team.",
    job: "Never give an at-bat away. Sprint out of the box on every ball you put in play, take the extra base, slide hard but safe.",
    superpower:
      "Effort. You make the defense rush — and rushed defenses make errors.",
    whyMatters:
      "The team that hustles late in the order wins more youth games than the team with the bigger bats. Effort is contagious.",
    proTip:
      "Run hard to first on EVERY ground ball. The kid who hustles is the kid who hits leadoff next year.",
  },
  {
    id: "12",
    name: "Fuse",
    subtitle: "Twelve-hole (continuous lineup)",
    emoji: "🧨",
    tagline: "Get on base and light it up for the top.",
    job: "Light the fuse for Spark. Reach base any way you can — a walk, an error, a bloop, a hard grounder — and pass the bat back to the top.",
    superpower:
      "You set up the explosion. The biggest innings start with the kid at the bottom getting on.",
    whyMatters:
      "A two-out walk from #12 turns into a three-run inning when Spark, Link, and Barrel follow. That's how blowouts begin.",
  },
];

export const FIELDING_CHARACTERS: RoleCharacter[] = [
  {
    id: "P",
    code: "P",
    name: "Engine",
    subtitle: "Pitcher",
    emoji: "🔥",
    tagline: "Starts every play, controls the pace, attacks the zone.",
    job: "Throw strikes, change speeds, and field your position — comebackers, bunts, and covering first base on grounders to the right side.",
    superpower:
      "Control. A pitcher who throws strikes beats a pitcher who throws hard but wild — every single time.",
    whyMatters:
      "Nothing happens until you throw the ball. Strikes keep your defense awake; walks put runs on the board for free.",
    proTip:
      "After your pitch, you're a fielder. Glove up, watch the ball, and move.",
  },
  {
    id: "C",
    code: "C",
    name: "Captain",
    subtitle: "Catcher",
    emoji: "🧠",
    tagline: "Leads the defense, blocks, communicates, keeps everyone locked in.",
    job: "Catch every pitch, block balls in the dirt, throw out base-stealers, field bunts, tag runners at home, and call pitches with the coach.",
    superpower:
      "Toughness and brains. You wear all the gear, take all the foul tips, and know what every fielder is doing on every pitch.",
    whyMatters:
      "You're the only player facing the field. You see things nobody else can — and you're the one who keeps the runner at third instead of letting them score on a wild pitch.",
    proTip:
      "Talk. Loud. Call the outs, remind cutoffs, fire up the pitcher. Quiet catchers don't lead.",
  },
  {
    id: "1B",
    code: "1B",
    name: "Anchor",
    subtitle: "First baseman",
    emoji: "🧲",
    tagline: "Catches everything, saves throws, owns the bag.",
    job: "Catch every throw from the infield — high, low, in the dirt. Hold runners on, scoop short-hops, and cover first on bunts.",
    superpower:
      "Soft hands and a long reach. You turn bad throws into outs.",
    whyMatters:
      "Almost every infield out ends at first. A first baseman who can scoop saves your shortstop, second baseman, and third baseman from errors all game.",
  },
  {
    id: "2B",
    code: "2B",
    name: "Flash",
    subtitle: "Second baseman",
    emoji: "⚡",
    tagline: "Quick feet, quick hands, turns small plays into outs.",
    job: "Field grounders on the right side, turn double plays with the shortstop, cover first on bunts, and be the cutoff on balls to right field.",
    superpower:
      "Quick feet and a quick release. Your throws are short but they have to be fast and accurate.",
    whyMatters:
      "More balls are hit between first and second than almost anywhere else in youth ball. You stop a single from becoming a runner in scoring position.",
  },
  {
    id: "SS",
    code: "SS",
    name: "Quarterback",
    subtitle: "Shortstop",
    emoji: "�",
    tagline: "Runs the infield, covers ground, makes the big decisions.",
    job: "Cover the most ground of any infielder. Field grounders, take throws from the catcher on steals, turn double plays, and be the relay on balls to left and center.",
    superpower:
      "Range, arm, and instincts. You read the swing before the bat hits the ball.",
    whyMatters:
      "Coaches put their best athlete here for a reason — more plays come your way than anywhere on the infield, and a great shortstop hides a lot of weaknesses.",
    proTip:
      "Communicate on every pitch. Who's covering on a steal? Who has the bag on a bunt? You decide.",
  },
  {
    id: "3B",
    code: "3B",
    name: "Wall",
    subtitle: "Third baseman",
    emoji: "🧱",
    tagline: "Brave corner, hard shots, no fear.",
    job: "Guard the line, field bunts and slow rollers barehanded, make the long throw to first, and tag runners coming from second on a hit.",
    superpower:
      "Quick reactions and a strong arm. You don't have time to think — you react.",
    whyMatters:
      "Right-handed hitters pull the hardest balls right at you. A third baseman who isn't afraid saves doubles down the line every inning.",
  },
  {
    id: "LF",
    code: "LF",
    name: "Hawk",
    subtitle: "Left fielder",
    emoji: "🦅",
    tagline: "Tracks fly balls, backs up third, protects the line.",
    job: "Catch fly balls in left, back up every throw to second and third base, charge ground balls, and hit the cutoff.",
    superpower:
      "Hustle and reads. The ball is in the air longer here — your first step decides if it's a catch or a triple.",
    whyMatters:
      "Most youth hitters are right-handed and pull the ball. That means more balls come to left field than anywhere else in the outfield.",
    proTip:
      "Back up EVERY throw. Even when nothing happens 9 times, the 10th time saves a run.",
  },
  {
    id: "CF",
    code: "CF",
    name: "Ranger",
    subtitle: "Center fielder",
    emoji: "👟",
    tagline: "Covers the most grass, leads the outfield, backs up everyone.",
    job: "Cover the biggest piece of grass on the field. Call off the other outfielders on anything you can catch, back up second base, and run down balls in the gaps.",
    superpower:
      "Speed and confidence. You're the captain of the outfield — everyone else takes a step back when you call it.",
    whyMatters:
      "A great centerfielder turns extra-base hits into outs. One robbed double can save the whole inning.",
    proTip:
      'Call it loud — "Ball! Ball! Ball!" — and call it early. Collisions happen when nobody calls it.',
  },
  {
    id: "RF",
    code: "RF",
    name: "Cannon",
    subtitle: "Right fielder",
    emoji: "🎯",
    tagline: "Strong throws, backs up first, keeps runners honest.",
    job: "Catch fly balls in right, throw out runners trying to take an extra base, back up first base on EVERY ground ball, and back up second on throws from the catcher.",
    superpower:
      "The strongest outfield arm. Your throw to third is the longest one on the field — and it has to be on a line.",
    whyMatters:
      "Right field is NOT where you hide a player. Backing up first base saves overthrown grounders from becoming runs every game — and a left-handed pull hitter sends rockets your way.",
    proTip:
      "When a ground ball is hit ANYWHERE on the infield, sprint toward first base. Every time. No exceptions.",
  },
];
