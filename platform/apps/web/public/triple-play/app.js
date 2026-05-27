/* ================================================================
   TRIPLE PLAY BASEBALL — Little League Edition
   Features: XP leveling, category tabs, second-chance answers,
   diamond animations, streak quotes + fireworks, localStorage save
   ================================================================ */

// ─── FIELD COORDINATES (SVG viewBox 240×250) ───
const P = {
    home:{x:170,y:269}, first:{x:216,y:223}, second:{x:170,y:177}, third:{x:124,y:223},
    p:{x:170,y:238}, c:{x:170,y:294},
    '1b':{x:222,y:218}, '2b':{x:198,y:198}, ss:{x:142,y:198}, '3b':{x:118,y:218},
    lf:{x:72,y:172}, cf:{x:170,y:140}, rf:{x:268,y:172}
};

// ─── LEVELS ───
const LEVELS = [
    { name:'Tee Ball', xpNeeded:0 },
    { name:'A',        xpNeeded:500 },
    { name:'AA',       xpNeeded:1000 },
    { name:'AAA',      xpNeeded:2000 },
    { name:'Minors',   xpNeeded:3500 },
    { name:'Majors',   xpNeeded:5000 }
];

// ─── CATEGORY LABELS ───
const CAT_LABELS = {
    throwTo:'Where to Throw', coverBase:'Base Coverage', backup:'Backup',
    baserunning:'Baserunning', fielding:'Fielding', pitching:'Pitching', catcher:'Catcher'
};

// ─── FAMOUS BASEBALL QUOTES (shown on streaks) ───
const QUOTES = [
    '"Every strike brings me closer to the next home run." — Babe Ruth',
    '"It\'s hard to beat a person who never gives up." — Babe Ruth',
    '"Baseball is 90% mental and the other half is physical." — Yogi Berra',
    '"Never let the fear of striking out keep you from playing the game." — Babe Ruth',
    '"There may be people that have more talent than you, but there\'s no excuse for anyone to work harder than you do." — Derek Jeter',
    '"You can\'t put a limit on anything. The more you dream, the farther you get." — Mike Trout',
    '"The way a team plays as a whole determines its success." — Babe Ruth',
    '"I see great things in baseball." — Walt Whitman',
    '"Heroes get remembered, but legends never die." — The Sandlot',
    '"Just keep swinging." — Hank Aaron',
    '"Don\'t look back. Something might be gaining on you." — Satchel Paige',
    '"How can you not be romantic about baseball?" — Moneyball',
    '"You gotta believe!" — Tug McGraw',
    '"Play the game like your hair is on fire!" — Little League wisdom'
];

// ─── SCENARIOS ───
const scenarios = [
    // ===== WHERE TO THROW =====
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are playing third base. No runners on, no outs. A ground ball is hit right to you.',
        answers:['Throw to first base','Throw to second base','Throw to home plate','Hold the ball'],
        correct:0,
        explanation:'Throw to first base!',
        detail:'With no runners on base, the only play is at first. Field the ball cleanly, set your feet, and make a strong throw to first base to get the batter out.',
        wrongExplanations:[
            null,
            'Nobody is on first to force at second — the runner has to BE on first for that to be a force play.',
            'There\'s nobody on third to throw out at home, and no force play exists at home in this situation.',
            'Holding the ball lets the batter reach first safely. You have time — make the throw.'
        ],
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'3b'},{type:'throw',from:'3b',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are the shortstop. No runners on, one out. A ground ball is hit to you.',
        answers:['Throw to first base','Throw to third base','Throw to home','Hold it and tag the runner'],
        correct:0,
        explanation:'Throw to first!',
        detail:'Just like any ground ball with no runners on — field it and throw to first for the out. The batter-runner is the only person to worry about.',
        isOut:true, runners:{}, outs:1,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are playing second base. Runner on third, one out. A ground ball is hit to you.',
        answers:['Throw to first base — get the sure out','Throw to home plate','Throw to the pitcher','Throw to third base'],
        correct:0,
        explanation:'Throw to first for the sure out!',
        detail:'At the Little League level, throwing home on a ground ball is very hard and risky. Get the sure out at first base. The run may score, but you avoid a throwing error that lets more runners advance.',
        isOut:true, runners:{third:true}, outs:1,
        anim:[{type:'hit',to:'2b'},{type:'throw',from:'2b',to:'first'},{type:'runBatter',out:true},{type:'runnerScores',from:'third'}]
    },
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are the pitcher. No runners on base. A ground ball is hit back to you on the mound.',
        answers:['Throw to first base','Throw to second base','Run to tag the batter','Throw to home'],
        correct:0,
        explanation:'Throw to first!',
        detail:'Field the ball on the mound, turn toward first, and make a good throw. With no runners on, first base is always the play for pitchers fielding comebackers.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'p'},{type:'throw',from:'p',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are the shortstop. Bases loaded, 2 outs. A ground ball is hit to you.',
        answers:['Step on second base for the force out','Throw home','Throw to first base','Throw to third base'],
        correct:0,
        explanation:'Step on second base!',
        detail:'With 2 outs and bases loaded, every base is a force out. Second base is the closest to you. Just step on the bag — it ends the inning and you don\'t risk a long throw.',
        wrongExplanations:[
            null,
            'Throwing home is a long, hard throw across your body. Second base is right next to you — take the easy out.',
            'First base ends the inning too, but it\'s the longest throw available. Step on second instead.',
            'Third is also a force, but you\'d have to turn and throw across the diamond. Second is closer and safer.'
        ],
        isOut:true, runners:{first:true,second:true,third:true}, outs:2,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'second'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are playing first base. Runner on second, no outs. A ground ball is hit to you near the bag.',
        answers:['Step on first base for the out','Throw to third to get the lead runner','Throw to home','Throw to second'],
        correct:0,
        explanation:'Step on first base!',
        detail:'You\'re right there at the bag — step on it! At the Little League level, trying to throw to third to get the lead runner is risky because the throw is long and you might miss the easy out at first.',
        isOut:true, runners:{second:true}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'baseStep',base:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are the pitcher. Runner on first, no outs. A ground ball is hit back to you.',
        answers:['Turn and throw to first base for the sure out','Throw to second to start a double play','Throw home','Run toward second base yourself'],
        correct:0,
        explanation:'Throw to first for the sure out!',
        detail:'Double plays are hard for Little Leaguers — the timing and two quick throws often lead to errors. Getting the sure out at first is the smart play. Let the runner move to second; you still got an out.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'p'},{type:'throw',from:'p',to:'first'},{type:'runBatter',out:true},{type:'runnerAdvance',from:'first',to:'second'}]
    },
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are the second baseman. No runners on, no outs. A pop fly is hit near you in shallow right field.',
        answers:['Call "I got it!" and catch it','Let the right fielder always take it','Duck out of the way','Throw your glove at it'],
        correct:0,
        explanation:'Call for it and catch it!',
        detail:'If you can get under it, call "I GOT IT!" loud and clear so the right fielder and first baseman back off. Communication prevents collisions. Catching a pop fly is an easy out!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'fly',to:'2b'}]
    },
    {
        cat:'throwTo', difficulty:'advanced',
        situation:'You are the shortstop. Runner on third, one out. A ground ball is hit to you.',
        answers:['Throw to first base for the sure out','Throw home to stop the run','Throw to second base','Hold the ball and check the runner'],
        correct:0,
        explanation:'Throw to first for the sure out!',
        detail:'In Little League, throwing home on a ground ball to the shortstop is a very long, difficult throw. The runner on third will likely score either way. Get the sure out at first and avoid an error that could cause more damage.',
        isOut:true, runners:{third:true}, outs:1,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'runBatter',out:true},{type:'runnerScores',from:'third'}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are playing left field. Runner on second, one out. A single is hit to you on the ground.',
        answers:['Throw to third base (cutoff man)','Throw to home plate','Throw to second base','Hold the ball'],
        correct:0,
        explanation:'Throw toward third!',
        detail:'The runner on second is heading to third. Throw to your cutoff man near third base. In Little League, throwing all the way home from left field usually ends up wild. Hit the cutoff man and let them decide where the ball goes.',
        isOut:false, runners:{second:true}, outs:1,
        anim:[{type:'hit',to:'lf'},{type:'cutoff',from:'lf',via:'ss',to:'third'},{type:'runnerAdvance',from:'second',to:'third'}]
    },
    {
        cat:'throwTo', difficulty:'advanced',
        situation:'You are the center fielder. Runner on third, less than 2 outs. You just caught a fly ball.',
        answers:['Throw to the cutoff man lined up with home','Throw directly to home plate','Throw to second base','Hold the ball'],
        correct:0,
        explanation:'Throw to the cutoff man!',
        detail:'The runner on third will tag up and try to score. Throw to your cutoff man who is lined up between you and home plate. In Little League, overthrowing the cutoff results in extra bases. Hit the cutoff and let them relay the ball home.',
        isOut:false, runners:{third:true}, outs:0,
        anim:[{type:'fly',to:'cf'},{type:'cutoff',from:'cf',via:'p',to:'home'},{type:'runnerAdvance',from:'third',to:'home'}]
    },

    // ===== BASE COVERAGE =====
    {
        cat:'coverBase', difficulty:'beginner',
        situation:'You are the second baseman. The first baseman fields a ground ball far from the bag. Who covers first base?',
        answers:['You (second baseman) run to cover first','The pitcher covers first','The shortstop covers first','Nobody needs to cover first'],
        correct:0,
        explanation:'You cover first!',
        detail:'When the first baseman fields a ball away from the base, the second baseman sprints over to cover first and receive the throw. This is one of the most important responsibilities of the second baseman!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'fielderMove',who:'2b',to:'first'},{type:'throw',from:'1b',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'coverBase', difficulty:'beginner',
        situation:'You are the pitcher. A ground ball is hit to the right side and the first baseman fields it. What do you do?',
        answers:['Sprint to first base to cover the bag','Stay on the mound','Run toward home plate','Back up second base'],
        correct:0,
        explanation:'Sprint to first to cover!',
        detail:'When the first baseman fields a ball and can\'t reach the bag, the pitcher MUST run hard to cover first base. Run to the base, get there before the runner, and receive the throw from the first baseman while touching the bag.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'fielderMove',who:'p',to:'first'},{type:'throw',from:'1b',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'coverBase', difficulty:'intermediate',
        situation:'You are the shortstop. A ground ball is hit to the third baseman with a runner on first. Who covers second base?',
        answers:['You (shortstop) cover second base','The second baseman covers second','The pitcher covers second','Nobody covers second'],
        correct:0,
        explanation:'You cover second!',
        detail:'When the ball is hit to the left side of the infield (third baseman or pitcher), the shortstop is responsible for covering second base for the force out. The second baseman covers when the ball is on the right side.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'3b'},{type:'fielderMove',who:'ss',to:'second'},{type:'throw',from:'3b',to:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true}]
    },
    {
        cat:'coverBase', difficulty:'intermediate',
        situation:'You are the second baseman. A ground ball is hit to the shortstop with a runner on first. Who covers second base?',
        answers:['You (second baseman) cover second base','The shortstop covers second','The pitcher covers second','The first baseman covers second'],
        correct:0,
        explanation:'You cover second!',
        detail:'When the ball is hit to the LEFT side (shortstop or third baseman), the second baseman covers second base. When the ball is hit to the RIGHT side, the shortstop covers second. Remember: the player NOT fielding the ball covers the bag.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'fielderMove',who:'2b',to:'second'},{type:'throw',from:'ss',to:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true}]
    },
    {
        cat:'coverBase', difficulty:'advanced',
        situation:'You are the catcher. A runner on first attempts to steal second. Who should be covering second base?',
        answers:['The shortstop or second baseman — depending on the batter','The pitcher','The third baseman','The first baseman'],
        correct:0,
        explanation:'Shortstop or second baseman!',
        detail:'On a steal attempt, either the shortstop or second baseman covers second base. Usually the shortstop covers against a right-handed batter, and the second baseman covers against a left-handed batter. Your job as catcher is to make a quick, accurate throw to whoever is covering.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'throw',from:'c',to:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true}]
    },
    {
        cat:'coverBase', difficulty:'beginner',
        situation:'You are the third baseman. A runner is on second base. The ball is hit to left field. Where should you be?',
        answers:['At third base ready for the throw','Running toward left field','At second base','On the pitcher\'s mound'],
        correct:0,
        explanation:'Be at third base!',
        detail:'The runner on second will try to advance to third on a hit to the outfield. You need to be at third base, ready to receive a throw and tag the runner. Always get to your base when the ball is in the outfield!',
        isOut:false, runners:{second:true}, outs:0,
        anim:[{type:'hit',to:'lf'},{type:'runnerAdvance',from:'second',to:'third'}]
    },

    // ===== BACKUP =====
    {
        cat:'backup', difficulty:'beginner',
        situation:'You are the right fielder. A ground ball is hit to the second baseman. What should you do?',
        answers:['Move toward first base to back up the throw','Stay in right field','Run to second base','Run toward home plate'],
        correct:0,
        explanation:'Back up first base!',
        detail:'As the right fielder, you should always move toward first base on ground balls hit to the infield. If the throw to first gets past the first baseman, you\'re there to stop the ball and prevent the runner from taking extra bases.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'2b'},{type:'fielderMove',who:'rf',to:'first'},{type:'throw',from:'2b',to:'first'}]
    },
    {
        cat:'backup', difficulty:'beginner',
        situation:'You are the center fielder. A single is hit to left field. What should you do?',
        answers:['Run toward left field to back up the play','Stay in center field','Run to second base','Run toward home plate'],
        correct:0,
        explanation:'Back up left field!',
        detail:'As the center fielder, you always back up the other outfielders. If the left fielder bobbles the ball or it gets past them, you\'re right there to keep the runner from getting extra bases. Hustle toward the ball!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'lf'},{type:'fielderMove',who:'cf',to:'lf'}]
    },
    {
        cat:'backup', difficulty:'intermediate',
        situation:'You are the left fielder. A ground ball is hit to the third baseman who throws to first. You see the ball is in the air. What should you do?',
        answers:['Back up third base in case of a return throw','Back up first base','Run to second base','Stay in left field'],
        correct:0,
        explanation:'Back up third base!',
        detail:'As the left fielder, your backup responsibility on plays at first base is third base. If the first baseman catches it and a runner tries to advance to third, or if a throw comes back to third, you\'re there as the safety net.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'3b'},{type:'throw',from:'3b',to:'first'},{type:'fielderMove',who:'lf',to:'third'}]
    },
    {
        cat:'backup', difficulty:'intermediate',
        situation:'You are the pitcher. A fly ball is hit to the outfield with a runner on third. After the catch, where do you go?',
        answers:['Back up home plate in case the throw gets away from the catcher','Stay on the mound','Cover first base','Cover third base'],
        correct:0,
        explanation:'Back up home plate!',
        detail:'When there\'s a runner tagging up from third, the outfielder will throw home. If the throw gets past the catcher, the pitcher needs to be behind home plate as backup so the runner doesn\'t score on a wild throw.',
        isOut:false, runners:{third:true}, outs:0,
        anim:[{type:'fly',to:'cf'},{type:'throw',from:'cf',to:'home'},{type:'fielderMove',who:'p',to:'home'}]
    },
    {
        cat:'backup', difficulty:'advanced',
        situation:'You are the center fielder. A fly ball is hit to right field with a runner on second. The right fielder catches it. What is your job?',
        answers:['Back up the right fielder and be ready if the ball gets past them on the throw','Run to third base','Run to second base','Stay where you are'],
        correct:0,
        explanation:'Back up right field!',
        detail:'Even though the right fielder caught it, you should have been moving toward them the whole time. Now if their throw to third goes wild, you\'re in position to cut it off. Never stand still when the ball is in play!',
        isOut:false, runners:{second:true}, outs:0,
        anim:[{type:'fly',to:'rf'},{type:'fielderMove',who:'cf',to:'rf'}]
    },

    // ===== BASERUNNING =====
    {
        cat:'baserunning', difficulty:'beginner',
        situation:'You are the runner on first base. The batter hits a ground ball to the shortstop. What do you do?',
        answers:['Run hard to second base — it\'s a force play and you HAVE to go','Stay on first base','Run back to first base','Run to third base'],
        correct:0,
        explanation:'Run to second!',
        detail:'On a ground ball, when a runner is behind you (the batter), you are FORCED to go to the next base. You must run to second as fast as you can. There\'s no choice — staying at first would result in being an easy out.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'runnerAdvance',from:'first',to:'second'}]
    },
    {
        cat:'baserunning', difficulty:'beginner',
        situation:'You are the runner on second base. A fly ball is hit to center field. What do you do?',
        answers:['Stay near second base and wait to see if it\'s caught','Run to third immediately','Run back to first','Run home'],
        correct:0,
        explanation:'Stay near second and wait!',
        detail:'On a fly ball, you must wait to see if the fielder catches it. If they catch it, you need to be on or near second base so you can tag up. If they drop it, then you run. Going too early means you could be doubled off if the ball is caught.',
        isOut:false, runners:{second:true}, outs:1,
        anim:[{type:'fly',to:'cf'}]
    },
    {
        cat:'baserunning', difficulty:'intermediate',
        situation:'You are the runner on third base. A fly ball is caught in the outfield with one out. What can you do?',
        answers:['Tag up — touch third base and run home after the catch','Immediately run home','Stay on third base the whole time','Run back to second base'],
        correct:0,
        explanation:'Tag up and run home!',
        detail:'After a fly ball is CAUGHT, you can "tag up" — touch your base (third base) and then run to the next base (home). Wait until the fielder catches the ball, touch third, then sprint home. The outfielder will try to throw you out, so GO FAST!',
        isOut:false, runners:{third:true}, outs:1,
        anim:[{type:'fly',to:'cf'},{type:'runnerAdvance',from:'third',to:'home',tagUp:true}]
    },
    {
        cat:'baserunning', difficulty:'intermediate',
        situation:'You are the runner on first base. The batter hits a line drive right at the shortstop who catches it. What should you do?',
        answers:['Get back to first base as fast as you can','Keep running to second','Run to third','Stay halfway between first and second'],
        correct:0,
        explanation:'Get back to first!',
        detail:'The batter is already out because the shortstop caught the line drive. If you left first base (which runners usually do on contact), you MUST get back before the shortstop throws to first base, or you\'ll be doubled off for a double play!',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'fly',to:'ss'},{type:'runnerRetreat',from:'first'}]
    },

    // ===== FIELDING =====
    {
        cat:'fielding', difficulty:'beginner',
        situation:'You are the third baseman. A ground ball is rolling slowly toward you. What do you do?',
        answers:['Charge forward toward the ball aggressively','Wait for it to come to you','Let the shortstop field it','Back up and wait'],
        correct:0,
        explanation:'Charge the ball!',
        detail:'On a slow roller, you must run TOWARD the ball. If you wait for it to come to you, the batter will beat the throw to first. Charge hard, field it on the run, and make a strong throw. That\'s the only way to get the out on a slow grounder.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'3b',slow:true},{type:'fielderMove',who:'3b',to:{x:135,y:250}},{type:'throw',from:{x:135,y:250},to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'fielding', difficulty:'beginner',
        situation:'A pop fly is hit between you (second baseman) and the right fielder. You can both reach it. What happens?',
        answers:['The player who calls "I got it!" first catches it, the other backs up','Both players try to catch it','The infielder always gets priority','The outfielder always gets priority'],
        correct:0,
        explanation:'Call it and the other backs up!',
        detail:'Communication is king! Whoever calls "I GOT IT!" first and loudest gets the ball. The other player immediately backs off and positions behind in case the ball is dropped. NEVER both go for it — that causes collisions!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'fly',to:'2b'}]
    },
    {
        cat:'fielding', difficulty:'intermediate',
        situation:'You are the center fielder. A ball is hit over your head going toward the fence. How do you run to get it?',
        answers:['Turn your back to the infield and sprint to where the ball will land','Run backward while watching the ball','Stand still and see where it goes','Let the left or right fielder get it'],
        correct:0,
        explanation:'Turn and sprint!',
        detail:'When a ball is hit over your head, turn your body in the direction of the ball and RUN. You are much faster running forward than backward. Find the ball again once you get to the area. Great outfielders learn to track the ball over their shoulder.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'fly',to:{x:170,y:110}},{type:'fielderMove',who:'cf',to:{x:170,y:110}}]
    },
    {
        cat:'fielding', difficulty:'intermediate',
        situation:'You are the shortstop. The ball is hit hard on the ground to your left (toward third base). What do you do?',
        answers:['Move to your left, field it, set your feet, and throw to first','Dive for it','Let the third baseman take it','Just watch it go by'],
        correct:0,
        explanation:'Move left and field it!',
        detail:'In Little League, diving is risky — you\'ll likely knock the ball away or not be able to throw. Instead, move your feet quickly to the left, get in front of the ball, field it cleanly, plant your feet, and make a strong throw to first.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:{x:130,y:205}},{type:'fielderMove',who:'ss',to:{x:130,y:205}},{type:'throw',from:{x:130,y:205},to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'fielding', difficulty:'beginner',
        situation:'You are the first baseman. A throw from the infielder is going to land in the dirt before it reaches you. What do you do?',
        answers:['Stay on the base and try to scoop/block the ball','Jump off the base to catch it higher','Duck out of the way','Let it go past you'],
        correct:0,
        explanation:'Stay on the base and block it!',
        detail:'Your #1 job is to keep the ball in front of you. Put your foot on the base, get low, and scoop or block the throw. Even if you don\'t catch it cleanly, keeping it close means the runner can\'t advance. A ball that gets past you means extra bases for the other team.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'runBatter',out:true}]
    },

    // ===== PITCHING =====
    {
        cat:'pitching', difficulty:'beginner',
        situation:'You are pitching. There is a runner on first base. Before you pitch, what should you do?',
        answers:['Look at the runner on first to keep them close to the base','Ignore the runner and just pitch','Look at the scoreboard','Look at your coach in the dugout'],
        correct:0,
        explanation:'Check the runner!',
        detail:'Runners will try to take a big lead off first base. By looking at them, you keep them honest. This is called "holding the runner." You can also step off the rubber and fake a throw to first to keep them close. Don\'t let them get a huge lead!',
        isOut:false, runners:{first:true}, outs:0,
        anim:[]
    },
    {
        cat:'pitching', difficulty:'intermediate',
        situation:'You are pitching. A ball is hit to the right side of the infield and the first baseman is fielding it far from the bag. What do you do?',
        answers:['Sprint to cover first base','Stay on the mound and watch','Go cover home plate','Go back up second base'],
        correct:0,
        explanation:'Sprint to first!',
        detail:'This is one of the most important pitcher responsibilities. When the first baseman fields the ball away from the bag, you MUST run as hard as you can to first base to receive the throw. Run toward the foul line, then along it to the base so you\'re out of the runner\'s way.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'fielderMove',who:'p',to:'first'},{type:'throw',from:'1b',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'pitching', difficulty:'intermediate',
        situation:'You are pitching. A bunt is laid down in front of the mound. Runner on first, no outs. What do you do?',
        answers:['Field the bunt and throw to first for the sure out','Field it and try to throw to second for the force','Field it and throw home','Hold the ball'],
        correct:0,
        explanation:'Throw to first for the sure out!',
        detail:'On a bunt with a runner on first, the safest play in Little League is to get the sure out at first. Trying to throw to second for the force on a bunt is tough — it\'s a harder throw and the runner has a head start. Get the easy out!',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'p',slow:true},{type:'throw',from:'p',to:'first'},{type:'runBatter',out:true},{type:'runnerAdvance',from:'first',to:'second'}]
    },
    {
        cat:'pitching', difficulty:'advanced',
        situation:'You are pitching. Runners on first and third, one out. A ground ball is hit back to you. What do you do?',
        answers:['Look the runner at third back, then throw to first for the sure out','Immediately throw home','Throw to second base','Throw to third base'],
        correct:0,
        explanation:'Look the runner back, then throw to first!',
        detail:'LOOK at the runner on third — this freezes them so they don\'t run home. Then throw to first for the sure out. In Little League, trying for a double play (throwing to second first) usually ends in an error or the runner scoring from third.',
        isOut:true, runners:{first:true,third:true}, outs:1,
        anim:[{type:'hit',to:'p'},{type:'throw',from:'p',to:'first'},{type:'runBatter',out:true}]
    },

    // ===== CATCHER =====
    {
        cat:'catcher', difficulty:'beginner',
        situation:'You are the catcher. The pitcher throws a ball in the dirt with runners on base. What do you do?',
        answers:['Drop to your knees and block the ball — keep it in front of you','Try to catch it normally','Jump out of the way','Let the umpire stop it'],
        correct:0,
        explanation:'Block it!',
        detail:'When a pitch bounces in the dirt, your job is to BLOCK it, not catch it. Drop to your knees, tuck your chin, and use your chest protector and body to keep the ball in front of you. Runners advance on passed balls, so keeping it close is critical!',
        isOut:false, runners:{first:true}, outs:1,
        anim:[]
    },
    {
        cat:'catcher', difficulty:'beginner',
        situation:'You are the catcher. A pop fly goes straight up behind home plate. What do you do?',
        answers:['Rip off your mask, find the ball, and catch it','Keep your mask on','Let the pitcher catch it','Let the third baseman get it'],
        correct:0,
        explanation:'Mask off, catch it!',
        detail:'Pop flies near home plate are the catcher\'s ball. Throw your mask OFF (away from where you\'re running) so you can see clearly, get under the ball, and make the catch. Remember: the ball will spin back toward the field, so start behind it!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'fly',to:'c'}]
    },
    {
        cat:'catcher', difficulty:'intermediate',
        situation:'You are the catcher. A runner on first tries to steal second. What do you do?',
        answers:['Catch the pitch cleanly, then make a quick, strong throw to second','Throw to third base','Run after the runner','Throw to the pitcher'],
        correct:0,
        explanation:'Catch it and throw to second!',
        detail:'Receive the pitch first — that\'s most important. Then quickly transfer the ball from your glove to your throwing hand, and make a strong, accurate throw to second base. Your shortstop or second baseman should be there covering the bag. A quick release matters more than a hard throw!',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'throw',from:'c',to:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true}]
    },
    {
        cat:'catcher', difficulty:'intermediate',
        situation:'You are the catcher. Runner on third, less than 2 outs. A fly ball is hit to the outfield and caught. What do you do?',
        answers:['Set up at home plate and get ready for the tag play','Run to third base','Run to back up first base','Stay crouched behind the plate'],
        correct:0,
        explanation:'Set up at home for the tag!',
        detail:'The runner on third will tag up and try to score after the catch. Position yourself at home plate where you can receive the throw from the outfielder. Give the outfielder a target to throw at. When the runner arrives, catch the ball and tag them!',
        isOut:true, runners:{third:true}, outs:0,
        anim:[{type:'fly',to:'cf'},{type:'throw',from:'cf',to:'home'},{type:'runnerAdvance',from:'third',to:'home',out:true,tagUp:true}]
    },
    {
        cat:'catcher', difficulty:'advanced',
        situation:'You are the catcher. Bases loaded, nobody out. The batter hits a ground ball right in front of you.',
        answers:['Pick it up, step on home plate for the force out','Throw to first base','Throw to second base','Throw to third base'],
        correct:0,
        explanation:'Step on home plate!',
        detail:'With bases loaded, home plate is a force play — the runner from third HAS to come to you. Just pick the ball up and step on home plate. It\'s the easiest and closest out possible. No need to throw anywhere!',
        isOut:true, runners:{first:true,second:true,third:true}, outs:0,
        anim:[{type:'hit',to:'c'},{type:'baseStep',base:'home'}]
    },

    // ===== MORE SCENARIOS =====
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are the right fielder. A single is hit to you on the ground. No runners were on base. Where do you throw?',
        answers:['Throw to second base','Throw home','Throw to third base','Throw to the pitcher'],
        correct:0,
        explanation:'Throw to second base!',
        detail:'The batter is now a runner heading to first. Your throw to second base keeps them from advancing to second (or stops them at first if the cutoff man cuts it). Always throw AHEAD of the runner to the next base they might try to reach.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'rf'},{type:'throw',from:'rf',to:'second'},{type:'runBatter'}]
    },
    {
        cat:'backup', difficulty:'beginner',
        situation:'You are the left fielder. A ground ball is hit to the shortstop who throws to first base. What is your job?',
        answers:['Move toward third base to back it up','Back up the shortstop','Run to second base','Stay in left field'],
        correct:0,
        explanation:'Back up third base!',
        detail:'As the left fielder, you are the backup for third base. If there\'s a runner on first and they round second hard, or if there\'s an overthrow at third on a subsequent play, you\'re there to save it. Always be moving toward the play!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'fielderMove',who:'lf',to:'third'}]
    },
    {
        cat:'fielding', difficulty:'beginner',
        situation:'You are any infielder. A ground ball is coming at you. How should you field it?',
        answers:['"Alligator hands" — glove on the ground, bare hand on top to trap it','One hand only — just the glove','Kick it to stop it','Wait for it to take a hop into your glove'],
        correct:0,
        explanation:'Alligator hands!',
        detail:'Get your body in front of the ball, put your glove down on the ground with fingers pointing down, and use your bare hand on top like an alligator mouth snapping shut. This way the ball can\'t get under your glove AND if it pops out, your top hand traps it.',
        isOut:false, runners:{}, outs:0,
        anim:[]
    },
    {
        cat:'baserunning', difficulty:'beginner',
        situation:'You are the batter. You hit a ground ball. What do you do?',
        answers:['Sprint as fast as you can to first base','Watch to see where the ball goes','Jog to first base','Run toward the pitcher'],
        correct:0,
        explanation:'Sprint to first!',
        detail:'RUN! Drop the bat (don\'t throw it) and sprint as hard as you can to first base. Run THROUGH the base — don\'t slow down as you get close. You should be running at full speed when you touch the bag. Always hustle, even on routine ground balls!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'runBatter'}]
    },
    {
        cat:'baserunning', difficulty:'advanced',
        situation:'You are the runner on second base. No runner on first. The ball is hit on the ground to the shortstop. What do you do?',
        answers:['Run to third base — you are forced to go','Stay at second — you are NOT forced since nobody is on first','Run back to first base','Tag up at second'],
        correct:1,
        explanation:'Stay at second — you are NOT forced!',
        detail:'With no runner on first base, you are NOT forced to go to third. You only have to run if a runner behind you is forcing you forward. Since nobody is on first, you can CHOOSE to stay safely at second. Only go to third if the ball gets through and it\'s clearly safe!',
        wrongExplanations:[
            'You\'re only forced if a runner behind you is being forced forward too. Nobody is on first, so no force.',
            null,
            'You can\'t go BACKWARD on a batted ball — you\'d be tagged out easily.',
            'Tagging up only matters on FLY balls that are caught. This is a ground ball.'
        ],
        isOut:false, runners:{second:true}, outs:1,
        anim:[]
    },
    {
        cat:'coverBase', difficulty:'advanced',
        situation:'You are the first baseman. A runner on second tries to steal third. Where should you be?',
        answers:['Stay at first base in case there\'s a play back to first','Run to cover third','Go to the pitcher\'s mound','Back up the catcher'],
        correct:0,
        explanation:'Stay at first base!',
        detail:'Even though the action is at third base, you need to hold your position at first. If the catcher throws to third and the runner gets in a rundown, you might receive a throw back at first on another runner. Stay disciplined and hold your position!',
        isOut:false, runners:{first:true,second:true}, outs:0,
        anim:[{type:'throw',from:'c',to:'third'}]
    },
    {
        cat:'fielding', difficulty:'advanced',
        situation:'You are the second baseman. A line drive is hit right at you and you catch it. Runner on first was running on contact. What do you do?',
        answers:['Step on second base or throw to first to double off the runner','Throw home','Throw to third','Hold the ball'],
        correct:0,
        explanation:'Double off the runner!',
        detail:'You caught the line drive — that\'s one out! The runner on first was running on contact, so they\'re now far from first base. Quickly step on second base (or throw to first) before the runner can get back. That\'s a double play! The runner must return to first because the ball was caught.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'fly',to:'2b'},{type:'baseStep',base:'second'},{type:'runnerRetreat',from:'first',out:true}]
    },

    // ===== ADDITIONAL SCENARIOS =====

    // --- WHERE TO THROW (new) ---
    {
        cat:'throwTo', difficulty:'beginner',
        situation:'You are the third baseman. No runners on, two outs. A ground ball is hit right to you.',
        answers:['Throw to first base','Throw to second base','Hold the ball','Tag third base'],
        correct:0,
        explanation:'Throw to first base!',
        detail:'Two outs or zero outs — with no runners on, the play is always at first. Field the ball, set your feet, and make a strong throw to end the inning!',
        isOut:true, runners:{}, outs:2,
        anim:[{type:'hit',to:'3b'},{type:'throw',from:'3b',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are the shortstop. Runner on first, no outs. A ground ball is hit to you. The runner on first is already close to second.',
        answers:['Step on second base for the force out, then the second baseman throws to first','Throw to first base','Throw home','Hold the ball'],
        correct:0,
        explanation:'Step on second for the force!',
        detail:'If you are close to second base and can step on it yourself, that is the easiest force out. The second baseman can then relay to first if there is time. Getting one guaranteed out is always better than trying a tougher throw.',
        isOut:true, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'baseStep',base:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true},{type:'throw',from:'second',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are the right fielder. Runner on first, one out. A base hit single comes to you. Where do you throw?',
        answers:['Throw to third base through the cutoff man','Throw to home plate','Throw to first base','Hold the ball'],
        correct:0,
        explanation:'Throw to third through the cutoff!',
        detail:'The runner on first will try to go to third on a base hit to right field. Throw to the cutoff man lined up with third base. Hitting the cutoff gives your team the best chance to get the runner at third or hold them at second.',
        isOut:false, runners:{first:true}, outs:1,
        anim:[{type:'hit',to:'rf'},{type:'cutoff',from:'rf',via:'2b',to:'third'},{type:'runnerAdvance',from:'first',to:'third'}]
    },
    {
        cat:'throwTo', difficulty:'advanced',
        situation:'You are the left fielder. Bases empty, no outs. You field a single cleanly. The batter-runner rounds first base hard. Where do you throw?',
        answers:['Throw to second base through the cutoff man','Throw to first base','Throw to home','Hold the ball'],
        correct:0,
        explanation:'Throw to second through the cutoff!',
        detail:'The batter-runner is rounding first aggressively looking to take second. Throw quickly to the cutoff man lined up with second base. A quick, accurate throw can hold the runner at first or even get them out if they went too far.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'lf'},{type:'cutoff',from:'lf',via:'ss',to:'second'},{type:'runBatter'}]
    },
    {
        cat:'throwTo', difficulty:'advanced',
        situation:'You are the third baseman. Runner on second, no outs. A bunt is placed down the third base line. What do you do?',
        answers:['Field the bunt and throw to first base for the sure out','Throw to third to get the runner from second','Throw home','Hold the ball and chase the runner'],
        correct:0,
        explanation:'Throw to first for the sure out!',
        detail:'The runner on second will advance to third during the bunt — let them. Trying to throw to third while fielding a bunt is very difficult and risky. Get the easy out at first base. The sacrifice bunt works for the offense, but you still get an out.',
        isOut:true, runners:{second:true}, outs:0,
        anim:[{type:'hit',to:'3b',slow:true},{type:'throw',from:'3b',to:'first'},{type:'runBatter',out:true},{type:'runnerAdvance',from:'second',to:'third'}]
    },
    {
        cat:'throwTo', difficulty:'intermediate',
        situation:'You are the center fielder. No runners on, one out. You catch a fly ball. Where do you throw?',
        answers:['Throw the ball back to the infield (to the cutoff man or pitcher)','Throw to home plate','Throw to third base','Hold the ball in the outfield'],
        correct:0,
        explanation:'Throw it back to the infield!',
        detail:'After catching a fly ball with no runners on, get the ball back to the infield quickly. A lazy return allows the other team\'s players to see how weak or slow your throws are. Always hustle the ball back in — it shows good habits and keeps the game moving.',
        isOut:true, runners:{}, outs:1,
        anim:[{type:'fly',to:'cf'},{type:'throw',from:'cf',to:'p'}]
    },

    // --- BASE COVERAGE (new) ---
    {
        cat:'coverBase', difficulty:'beginner',
        situation:'You are the second baseman. The ball is hit to right field. Where should you be?',
        answers:['Near second base ready for a throw from the outfield','Running to first base','Backing up right field','Standing still and watching'],
        correct:0,
        explanation:'Get to second base!',
        detail:'When the ball is hit to the outfield, infielders must cover their bases. As the second baseman, your job is to be at or near second base ready to receive a throw, in case the batter tries to stretch a single into a double.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'rf'},{type:'fielderMove',who:'2b',to:'second'}]
    },
    {
        cat:'coverBase', difficulty:'intermediate',
        situation:'You are the shortstop. A fly ball is hit to left field with a runner on first. The left fielder catches it. Where should you be?',
        answers:['At second base in case the runner didn\'t tag up and can be doubled off','At third base','On the mound','Backing up left field'],
        correct:0,
        explanation:'Cover second base!',
        detail:'After a fly ball catch, the runner on first must tag up (touch first base) before advancing. If they forgot to tag up or left early, the outfielder can throw to second to appeal and get the runner out. You need to be there covering the bag.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'fly',to:'lf'},{type:'fielderMove',who:'ss',to:'second'}]
    },
    {
        cat:'coverBase', difficulty:'advanced',
        situation:'You are the pitcher. The catcher throws to second base on a steal attempt. Nobody else is covering third. Where should you go?',
        answers:['Move toward third base to cover it','Stay on the mound','Cover first base','Back up home plate'],
        correct:0,
        explanation:'Cover third base!',
        detail:'If the shortstop and second baseman are both involved in the play at second, third base can be left empty. As the pitcher, you must be aware and move to cover third in case the runner rounds second and tries to advance. Always be thinking ahead!',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'throw',from:'c',to:'second'},{type:'fielderMove',who:'p',to:'third'}]
    },
    {
        cat:'coverBase', difficulty:'intermediate',
        situation:'You are the first baseman. A ball is hit to the outfield with runners on first and second. Nobody out. Where should you be?',
        answers:['At first base — the batter-runner might try to come back after rounding first','Backing up second base','Running to home plate','Backing up the outfielder'],
        correct:0,
        explanation:'Stay at first base!',
        detail:'With runners moving, you need to hold your position at first base. If the batter-runner rounds first too aggressively on the hit, the outfielder or cutoff man can throw behind them to first and catch them off the base for an out.',
        isOut:false, runners:{first:true,second:true}, outs:0,
        anim:[{type:'hit',to:'cf'},{type:'runnerAdvance',from:'first',to:'second'},{type:'runnerAdvance',from:'second',to:'third'}]
    },

    // --- BACKUP (new) ---
    {
        cat:'backup', difficulty:'beginner',
        situation:'You are the right fielder. A fly ball is hit to center field. What should you do?',
        answers:['Run toward center field to back up the center fielder','Stay in right field','Run to first base','Run to second base'],
        correct:0,
        explanation:'Back up center field!',
        detail:'Outfielders always back up each other. If the center fielder drops the ball or it gets past them, you\'re right there to pick it up and keep runners from taking extra bases. Always be moving toward the play!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'fly',to:'cf'},{type:'fielderMove',who:'rf',to:'cf'}]
    },
    {
        cat:'backup', difficulty:'intermediate',
        situation:'You are the catcher. The pitcher is covering first base on a ground ball to the first baseman. Where should you be?',
        answers:['Back up first base along the foul line','Stay at home plate','Back up third base','Back up the pitcher\'s mound'],
        correct:0,
        explanation:'Back up first base!',
        detail:'When the pitcher is covering first and receiving a throw, an overthrow could go down the right field foul line. As the catcher, hustle up the first base line behind the play to stop any overthrows. Always be backing up the throw!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'fielderMove',who:'p',to:'first'},{type:'fielderMove',who:'c',to:'first'}]
    },
    {
        cat:'backup', difficulty:'advanced',
        situation:'You are the left fielder. A runner on second tries to steal third. The catcher throws to third base. What should you do?',
        answers:['Back up third base in case the throw gets past the third baseman','Run to second base','Stay in left field','Run to home plate'],
        correct:0,
        explanation:'Back up third base!',
        detail:'Anytime there\'s a throw to third base, the left fielder must be moving to back it up. If the throw from the catcher gets past the third baseman, you\'re there to prevent the runner from scoring. This kind of hustle saves runs!',
        isOut:false, runners:{second:true}, outs:0,
        anim:[{type:'throw',from:'c',to:'third'},{type:'fielderMove',who:'lf',to:'third'}]
    },
    {
        cat:'backup', difficulty:'intermediate',
        situation:'You are the center fielder. A ground ball is hit to the shortstop who throws to second base for a force out. What should you do?',
        answers:['Move toward second base to back up the throw','Stay in center field','Run to third base','Run to home plate'],
        correct:0,
        explanation:'Back up second base!',
        detail:'As the center fielder, you are the backup for throws to second base. If the throw from the shortstop gets past the fielder covering second, you\'re there to stop the ball and prevent runners from taking extra bases.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'second'},{type:'fielderMove',who:'cf',to:'second'}]
    },

    // --- BASERUNNING (new) ---
    {
        cat:'baserunning', difficulty:'beginner',
        situation:'You are the runner on third base. A ground ball is hit to the pitcher. What do you do?',
        answers:['Stay on third base — the pitcher is too close to home to risk it','Run home immediately','Run back to second','Tag up and run'],
        correct:0,
        explanation:'Stay at third!',
        detail:'With a ground ball hit to the pitcher, they are standing right between you and home plate. If you run, the pitcher can just throw to the catcher (or run at you) for an easy tag out. Stay at third and wait for a better opportunity to score.',
        isOut:false, runners:{third:true}, outs:1,
        anim:[{type:'hit',to:'p'}]
    },
    {
        cat:'baserunning', difficulty:'intermediate',
        situation:'You are the runner on second base. The ball is hit on the ground to the first baseman. No runner on first. What do you do?',
        answers:['Advance to third base — there\'s no force on you and the first baseman has to deal with the batter-runner','Stay at second','Run home','Run back to first'],
        correct:0,
        explanation:'Advance to third!',
        detail:'Since there is no runner on first, there is no force play on you at third. The first baseman has to get the batter-runner out at first, which means nobody is throwing to third. Take advantage and advance to third base!',
        isOut:false, runners:{second:true}, outs:0,
        anim:[{type:'hit',to:'1b'},{type:'runnerAdvance',from:'second',to:'third'},{type:'runBatter',out:true}]
    },
    {
        cat:'baserunning', difficulty:'intermediate',
        situation:'You are the runner on first base. The batter hits a ball to the outfield gap. Your coach at third base is waving you around. What do you do?',
        answers:['Run hard to second, look at the third base coach, and keep running to third','Stop at second base no matter what','Run back to first','Run directly to third base skipping second'],
        correct:0,
        explanation:'Follow the coach!',
        detail:'When the ball is hit to the outfield, run hard. As you approach second base, look at the third base coach. If they\'re waving you on, round second and keep going to third. You MUST touch every base — never skip one or you can be called out on appeal!',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'cf'},{type:'runnerAdvance',from:'first',to:'third'}]
    },
    {
        cat:'baserunning', difficulty:'advanced',
        situation:'You are the runner on third base. There is one out. A fly ball is hit to shallow left field. What should you do?',
        answers:['Stay close to third — a shallow fly is too short to tag up on safely','Tag up and sprint home','Run halfway and see what happens','Run back to second'],
        correct:0,
        explanation:'Stay close to third!',
        detail:'A shallow fly ball means the left fielder is close and can make a quick throw home. Tagging up on a shallow fly is very risky because the throw will be short and fast. Wait on third and look for a better chance to score, like a ground ball or a deeper fly.',
        isOut:false, runners:{third:true}, outs:1,
        anim:[{type:'fly',to:{x:95,y:190}}]
    },
    {
        cat:'baserunning', difficulty:'advanced',
        situation:'You are the batter-runner. You hit a ball down the right field line. It might be fair or foul. What do you do?',
        answers:['Run hard to first no matter what — let the umpire decide','Stop and watch to see if it\'s fair','Jog to first slowly','Run to second base right away'],
        correct:0,
        explanation:'Run hard no matter what!',
        detail:'Always run! Never assume a ball is foul. If it turns out to be fair and you didn\'t run, you just gave away a free base hit. Sprint to first base at full speed and let the umpire make the call. You can always go back to the dugout if it\'s foul.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'rf'},{type:'runBatter'}]
    },

    // --- FIELDING (new) ---
    {
        cat:'fielding', difficulty:'beginner',
        situation:'You are the left fielder. A fly ball is hit to you. How do you position yourself to catch it?',
        answers:['Get under it with your glove up, line it up above your head','Catch it at your waist','Catch it one-handed at arm\'s length','Close your eyes and reach up'],
        correct:0,
        explanation:'Get under it with your glove up!',
        detail:'Get to the spot where the ball will land. Position your glove above your throwing shoulder with your fingers pointing up. Use two hands to secure the catch — glove hand catches, bare hand claps on top. This gives you the best grip for a quick throw after the catch.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'fly',to:'lf'}]
    },
    {
        cat:'fielding', difficulty:'intermediate',
        situation:'You are the shortstop. The ball is hit on the ground just to your right (toward second base). The second baseman also moves toward the ball. What should you do?',
        answers:['Call for the ball if you have a better angle, or let the second baseman take it if they\'re closer','Always take it since you\'re the shortstop','Let it go through to the outfield','Both go for it together'],
        correct:0,
        explanation:'Communicate and let the closer player take it!',
        detail:'The key is COMMUNICATION. If the second baseman has a better angle or is closer, let them take it — they have an easier throw to first. If you\'re closer, call "Mine!" loudly. Never both go for it and never let it go through. Talk to each other!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:{x:160,y:200}},{type:'throw',from:{x:160,y:200},to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'fielding', difficulty:'intermediate',
        situation:'You are the right fielder. A ground ball single is hit to you. How should you field it?',
        answers:['Get in front of the ball, field it on one knee to block it, then throw','Charge it and try to barehand it','Let it roll to you','Try to field it between your legs'],
        correct:0,
        explanation:'Get in front and block it!',
        detail:'In the outfield, your #1 priority is keeping the ball in front of you. Get your body in front of the ball, drop to one knee to create a wall so it can\'t get past you, field it cleanly, then pop up and throw. A ball that gets past an outfielder means extra bases!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'rf'},{type:'throw',from:'rf',to:'second'}]
    },
    {
        cat:'fielding', difficulty:'advanced',
        situation:'You are the first baseman. A throw from the shortstop pulls you off first base toward the infield. What do you do?',
        answers:['Catch the ball first, then try to tag the runner or get back to the base','Leave the ball and stay on the base','Duck','Let the ball go past you'],
        correct:0,
        explanation:'Catch the ball first!',
        detail:'ALWAYS catch the ball first! A ball that gets past you is much worse than the runner being safe. If the throw pulls you off the base, catch it and try to swipe tag the runner as they go by. If you can\'t tag them, that\'s okay — at least you have the ball.',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'runBatter'}]
    },
    {
        cat:'fielding', difficulty:'beginner',
        situation:'You are any fielder. After you make the third out of the inning, what should you do?',
        answers:['Sprint off the field to your dugout quickly','Walk slowly off the field','Throw the ball into the stands','Do a celebration dance on the field'],
        correct:0,
        explanation:'Sprint to the dugout!',
        detail:'Good teams hustle on AND off the field! When the third out is made, sprint to your dugout. This keeps the game moving fast, shows good sportsmanship, and gets your team ready to bat sooner. Hustle is a habit — do it every time!',
        isOut:false, runners:{}, outs:2,
        anim:[]
    },

    // --- PITCHING (new) ---
    {
        cat:'pitching', difficulty:'beginner',
        situation:'You are pitching. The batter hits a pop fly near the mound. What should you do?',
        answers:['Call "I got it!" and catch the pop fly yourself','Let the catcher always take it','Duck and get out of the way','Run to first base'],
        correct:0,
        explanation:'Call it and catch it!',
        detail:'If the pop fly is in your area and you can get under it, call "I GOT IT!" loud and clear. The pitcher has priority on pop flies near the mound. Make sure to communicate so you don\'t collide with the catcher, first baseman, or third baseman.',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'fly',to:'p'}]
    },
    {
        cat:'pitching', difficulty:'intermediate',
        situation:'You are pitching. A ball is hit back to the mound hard and bounces off your glove. It rolls toward the first base side. What should you do?',
        answers:['Chase the ball down quickly, pick it up, and throw to first','Leave it for the first baseman','Stay on the mound','Run to cover home plate'],
        correct:0,
        explanation:'Chase it and throw to first!',
        detail:'Don\'t give up on the play! If the ball bounces off your glove, sprint after it. Pick it up and check if you still have a play at first. A quick recovery can still get the out. Every second counts — hustle after that ball!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'hit',to:'p'},{type:'throw',from:'p',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'pitching', difficulty:'advanced',
        situation:'You are pitching. Runner on third, one out. The batter hits a ground ball to the second baseman. What is your job as the pitcher?',
        answers:['Move toward home plate to back up the catcher in case of a throw','Stay on the mound','Run to first base','Cover second base'],
        correct:0,
        explanation:'Back up home plate!',
        detail:'The runner on third may try to score on the ground ball. The second baseman will throw to first, but if the runner breaks for home, there could be a throw to the plate. Move toward home as backup so if a throw gets past the catcher, you\'re there to stop it.',
        isOut:false, runners:{third:true}, outs:1,
        anim:[{type:'hit',to:'2b'},{type:'throw',from:'2b',to:'first'},{type:'fielderMove',who:'p',to:'home'},{type:'runBatter',out:true}]
    },
    {
        cat:'pitching', difficulty:'beginner',
        situation:'You are pitching. The ball gets hit to the left side of the infield. After the throw is made to first, what should you be doing?',
        answers:['Watch the play and be ready to back up any base that needs it','Walk back to the mound immediately','Sit down and rest','Go talk to the catcher'],
        correct:0,
        explanation:'Stay alert and be ready to back up!',
        detail:'A pitcher\'s job isn\'t done after the ball is hit. Watch the play develop and be ready to back up bases. If there\'s an overthrow at first, back it up. If a runner tries to advance, back up the appropriate base. The pitcher is the ultimate utility backup player!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'3b'},{type:'throw',from:'3b',to:'first'},{type:'runBatter',out:true}]
    },

    // --- CATCHER (new) ---
    {
        cat:'catcher', difficulty:'beginner',
        situation:'You are the catcher. The batter swings and misses for strike three, but you drop the ball. It rolls a few feet in front of you. What do you do?',
        answers:['Pick it up quickly and throw to first base or tag the batter','Just pick up the ball and toss it back to the pitcher','Wait for the umpire to pick it up','Let the pitcher come get it'],
        correct:0,
        explanation:'Pick it up and throw to first!',
        detail:'On a dropped third strike, the batter can run to first base! You must pick up the ball quickly and either tag the batter before they leave the box, or throw to first to get them out. This is one of the trickiest rules — always be ready on a third strike!',
        isOut:true, runners:{}, outs:0,
        anim:[{type:'throw',from:'c',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'catcher', difficulty:'intermediate',
        situation:'You are the catcher. Runners on first and third, one out. The runner on first tries to steal second. You know the runner on third might try to score on your throw. What do you do?',
        answers:['Fake the throw to second, then look the runner on third back to the base','Always throw to second no matter what','Throw to third base','Hold the ball and do nothing'],
        correct:0,
        explanation:'Fake to second and check third!',
        detail:'This is a common trick play by the offense. If you throw to second, the runner on third sprints home. Instead, pump-fake a throw to second and quickly look at the runner on third. If they\'re running home, throw to third or run at them. If they stay, then throw to second.',
        isOut:false, runners:{first:true,third:true}, outs:1,
        anim:[{type:'throw',from:'c',to:'third'}]
    },
    {
        cat:'catcher', difficulty:'intermediate',
        situation:'You are the catcher. A pitch bounces in the dirt with nobody on base. What do you do?',
        answers:['Block it and keep it close, even though nobody is on base','Let it go to the backstop since nobody is on base','Catch it with one hand','Jump out of the way'],
        correct:0,
        explanation:'Block it anyway!',
        detail:'Good catchers block EVERY ball in the dirt, even with nobody on base. It builds good habits so that when there ARE runners on base, blocking is automatic. Plus, you don\'t want your pitcher to lose confidence because balls are getting past you.',
        isOut:false, runners:{}, outs:0,
        anim:[]
    },
    {
        cat:'catcher', difficulty:'advanced',
        situation:'You are the catcher. Runner on second, two outs. The pitcher throws a pitch that the batter doesn\'t swing at. You catch the ball and notice the runner on second took a big lead. What can you do?',
        answers:['Throw to second base quickly to try to pick off the runner','Throw to third base','Throw to the pitcher and ignore the runner','Throw to first base'],
        correct:0,
        explanation:'Throw to second for the pickoff!',
        detail:'A catcher who pays attention can catch runners napping! If the runner takes too big a lead off second, snap a quick throw to second base where the shortstop or second baseman should be covering. This is called a "pickoff" play and can end the inning!',
        isOut:true, runners:{second:true}, outs:2,
        anim:[{type:'throw',from:'c',to:'second'},{type:'runnerAdvance',from:'second',to:'second',out:true}]
    },

    // --- MIXED GAME SITUATIONS ---
    {
        cat:'fielding', difficulty:'intermediate',
        situation:'You are the center fielder. A ball is hit in front of you and bouncing. You aren\'t sure if you can catch it on the fly. What should you do?',
        answers:['Play it safe — charge hard and field it on one hop to keep runners from advancing','Try a diving catch','Let it bounce past you so the left or right fielder can get it','Stand still and wait'],
        correct:0,
        explanation:'Charge and play it safe on one hop!',
        detail:'In the outfield, a ball that gets past you is a disaster — runners score and extra bases happen. Unless you are SURE you can make the diving catch, play it safe. Charge the ball, field it on a short hop, and throw it in quickly. Good outfielders limit damage.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[{type:'hit',to:'cf'},{type:'throw',from:'cf',to:'third'}]
    },
    {
        cat:'throwTo', difficulty:'advanced',
        situation:'You are the shortstop. Runners on first and second, no outs. A ground ball is hit to you. What\'s the best play?',
        answers:['Step on second base for the force out — get the sure out','Throw to third base for the lead runner','Throw home','Throw to first'],
        correct:0,
        explanation:'Step on second for the force out!',
        detail:'With runners on first and second, second base is a force play and it\'s the closest base to you. Step on second to get the sure out. You might be able to then relay to first for a double play, but the most important thing is to get at least one out.',
        isOut:true, runners:{first:true,second:true}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'baseStep',base:'second'},{type:'runnerAdvance',from:'first',to:'second',out:true},{type:'runnerAdvance',from:'second',to:'third'}]
    },
    {
        cat:'coverBase', difficulty:'beginner',
        situation:'You are the pitcher. A ground ball is hit to the shortstop with nobody on base. After the shortstop throws to first, where should you be?',
        answers:['Near the mound and ready to back up first base on an overthrow','Sitting on the mound resting','Running to home plate','Running to third base'],
        correct:0,
        explanation:'Ready to back up!',
        detail:'Even though the shortstop is making the throw, the pitcher should be alert and positioned to react. If the throw goes wild past the first baseman, you should be moving toward first to back up the play. Always stay engaged!',
        isOut:false, runners:{}, outs:0,
        anim:[{type:'hit',to:'ss'},{type:'throw',from:'ss',to:'first'},{type:'runBatter',out:true}]
    },
    {
        cat:'baserunning', difficulty:'beginner',
        situation:'You are the runner on first base. The pitcher is taking a long time. Can you leave the base before the pitch?',
        answers:['No — in Little League, you must stay on the base until the ball reaches the batter','Yes, you can take a big lead anytime','You can leave after the pitcher starts the windup','You can leave whenever you want'],
        correct:0,
        explanation:'Stay on the base!',
        detail:'In Little League, runners cannot leave the base until the pitch reaches the batter. This is different from Major League Baseball. If you leave early, the umpire will call you out! Wait until the pitch crosses home plate, THEN you can go.',
        isOut:false, runners:{first:true}, outs:0,
        anim:[]
    },
    {
        cat:'baserunning', difficulty:'intermediate',
        situation:'You are the runner on second base. The ball is hit on the ground back to the pitcher. Runner on first behind you. What do you do?',
        answers:['Run to third — you are forced because the runner on first is being forced to second','Stay at second','Run home','Run back to first'],
        correct:0,
        explanation:'Run to third!',
        detail:'You ARE forced! The batter must go to first, which forces the runner on first to second, which forces YOU to third. When there are runners behind you being forced forward, you must advance too. Run hard to third!',
        isOut:false, runners:{first:true,second:true}, outs:0,
        anim:[{type:'hit',to:'p'},{type:'runnerAdvance',from:'second',to:'third'},{type:'runnerAdvance',from:'first',to:'second'}]
    },
    {
        cat:'catcher', difficulty:'advanced',
        situation:'You are the catcher. The opposing team has a very fast runner on third with less than two outs. The pitcher is about to pitch. What should you communicate?',
        answers:['Tell the pitcher and infielders to check the runner and be ready for a squeeze play','Say nothing','Tell the outfielders to move in','Tell the pitcher to throw harder'],
        correct:0,
        explanation:'Communicate with your teammates!',
        detail:'The catcher is the field general — you see the whole field. With a fast runner on third, warn your pitcher about a possible squeeze bunt or steal of home. Tell your infielders to be alert. Good communication prevents surprise plays by the offense.',
        isOut:false, runners:{third:true}, outs:1,
        anim:[]
    },
    {
        cat:'backup', difficulty:'advanced',
        situation:'You are the pitcher. The ball is hit to the outfield with runners on base. Several throws might happen. What is the general rule for your backup position?',
        answers:['Back up the base where the throw is going — usually home plate or third base','Stay on the mound','Back up first base','Stand between second and third'],
        correct:0,
        explanation:'Back up the base where the throw is going!',
        detail:'As the pitcher, you need to read the play and figure out where the throw will go. If it\'s going home, back up home. If it\'s going to third, back up third. Position yourself 20-30 feet behind the base so you can field an overthrow. The pitcher is the ultimate backup player!',
        isOut:false, runners:{first:true,second:true}, outs:0,
        anim:[{type:'hit',to:'cf'},{type:'fielderMove',who:'p',to:'home'}]
    }
];

// ─── GAME STATE ───
const SAVE_KEY = 'tripleplay_save';
const STATE_VERSION = 2;
let state = loadState();

function defaultPlayer(name = '') {
    return {
        name, xp: 0, level: 0, correct: 0, total: 0, streak: 0, bestStreak: 0,
        // per-category and per-difficulty tracking: { cat: {correct, total} }
        catStats: {}, diffStats: { beginner:{c:0,t:0}, intermediate:{c:0,t:0}, advanced:{c:0,t:0} },
        position: 'all', // favorite position used for weighting
        playedDates: [], // YYYY-MM-DD strings, for daily streak
    };
}

function defaultState() {
    return {
        version: STATE_VERSION,
        questionIdx: 0,
        twoPlayer: false,
        currentPlayer: 0, // 0 or 1
        players: [defaultPlayer('')],
        // legacy flat fields kept as compatibility shims
        get playerName() { return this.players[0].name; },
    };
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function migrateLegacy(s) {
    // v1 format: flat { xp, level, correct, total, streak, bestStreak, playerName, ... }
    if (s && s.version === STATE_VERSION) return s;
    const next = defaultState();
    if (!s) return next;
    const p = defaultPlayer(s.playerName || '');
    p.xp = s.xp || 0;
    p.level = s.level || 0;
    p.correct = s.correct || 0;
    p.total = s.total || 0;
    p.streak = s.streak || 0;
    p.bestStreak = s.bestStreak || 0;
    next.players = [p];
    return next;
}

function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) return migrateLegacy(JSON.parse(raw));
    } catch(e) {}
    return defaultState();
}

function saveState() {
    // Strip getters before save
    const clean = JSON.parse(JSON.stringify({
        version: state.version,
        questionIdx: state.questionIdx,
        twoPlayer: state.twoPlayer,
        currentPlayer: state.currentPlayer,
        players: state.players,
    }));
    localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
}

// Convenience access to the active player.
function P_() { return state.players[state.currentPlayer] || state.players[0]; }

// Mark today as played, return new day-streak count.
function markPlayedToday() {
    const p = P_();
    const today = todayStr();
    if (!p.playedDates.includes(today)) {
        p.playedDates.push(today);
        p.playedDates = p.playedDates.slice(-60); // keep last 60 days
    }
    return computeDayStreak(p);
}

function computeDayStreak(p) {
    const set = new Set(p.playedDates);
    let streak = 0;
    const d = new Date();
    while (true) {
        const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (set.has(s)) { streak++; d.setDate(d.getDate() - 1); }
        else break;
    }
    return streak;
}

// ─── DOM REFS ───
const $ = id => document.getElementById(id);
const correctEl = $('correct-count'), totalEl = $('total-count'), streakEl = $('streak-count');
const levelNameEl = $('current-level'), xpTextEl = $('xp-text'), xpFillEl = $('xp-fill');
const situationTextEl = $('situation-text'), answersEl = $('answers-container');
const feedbackEl = $('feedback'), feedbackIcon = $('feedback-icon'), feedbackMsg = $('feedback-msg'), feedbackDetail = $('feedback-detail');
const nextBtn = $('next-btn'), resetBtn = $('reset-btn');
const qNumEl = $('q-number'), catBadge = $('cat-badge'), diffBadge = $('diff-badge');
const streakBanner = $('streak-banner'), streakQuote = $('streak-quote');
const outsEl = $('diamond-outs');
const outText = $('out-text');
const canvas = $('fireworks-canvas');
const ctx = canvas.getContext('2d');

// Play overlay elements
const playOverlay = $('play-overlay');
const playOverlayDiamond = $('play-overlay-diamond');
const playOverlayIcon = $('play-overlay-icon');
const playOverlayMsg = $('play-overlay-msg');
const playOverlayDetail = $('play-overlay-detail');
const playOverlayClose = $('play-overlay-close');
const playOverlayReplay = $('play-overlay-replay');
const setupReplayBtn = $('setup-replay-btn');

// V2 elements (some may be null if HTML not updated, code guards for that)
const feedbackWrongList = $('feedback-wrong-list');
const turnBanner = $('turn-banner');
const turnNameEl = $('turn-name');
const dayStreakChip = $('day-streak-chip');
const dayStreakNum = $('day-streak-num');
const positionSelect = $('position-select');
const twoPlayerToggle = $('two-player-toggle');
const playerName2Input = $('player-name-2');
const statsBtn = $('stats-btn');
const coachBtn = $('coach-btn');
const statsModal = $('stats-modal');
const statsBody = $('stats-body');
const coachModal = $('coach-modal');
const coachBody = $('coach-body');
const coachPrintBtn = $('coach-print');

let currentScenario = null;
let filteredScenarios = [];
let secondChanceUsed = false;
let activeCategory = 'all';
let animTimers = [];
let resetFielderTimer = null;

// ─── SHUFFLE ───
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
}

// ─── FILTER & LOAD ───
// Adaptive difficulty: weight by player accuracy.
// Position weighting: scenarios mentioning the player's position get a boost.
function filterScenarios() {
    const player = P_();
    let pool = activeCategory === 'all'
        ? scenarios.slice()
        : scenarios.filter(s => s.cat === activeCategory);

    // Adaptive difficulty: figure out target mix based on overall accuracy.
    const acc = player.total > 0 ? player.correct / player.total : 0.5;
    // Target weights for [beginner, intermediate, advanced]
    let weights;
    if (acc < 0.5) weights = { beginner: 3, intermediate: 1, advanced: 0.3 };
    else if (acc < 0.75) weights = { beginner: 1, intermediate: 2, advanced: 1 };
    else weights = { beginner: 0.5, intermediate: 1.5, advanced: 2.5 };

    const posKey = player.position || 'all';

    // Build a weighted shuffled list. Same scenario can appear with extra weight.
    const weighted = pool.map(s => {
        let w = weights[s.difficulty] || 1;
        if (posKey !== 'all') {
            // Boost scenarios that mention this position in situation/anim.
            const sit = (s.situation || '').toLowerCase();
            const positionWords = {
                p:['pitcher','mound','pitch'], c:['catcher'],
                '1b':['first base','first baseman'], '2b':['second base','second baseman'],
                ss:['shortstop'], '3b':['third base','third baseman'],
                lf:['left field'], cf:['center field'], rf:['right field']
            };
            const words = positionWords[posKey] || [];
            if (words.some(w2 => sit.includes(w2))) w *= 2.2;
        }
        return { s, w: w + Math.random() * 0.4 };
    }).sort((a,b) => b.w - a.w);

    filteredScenarios = weighted.map(x => x.s);
    state.questionIdx = 0;
}

let pendingReplayAnim = null; // for replay-button on overlay

function loadQuestion() {
    if (!filteredScenarios.length) filterScenarios();
    if (state.questionIdx >= filteredScenarios.length) {
        state.questionIdx = 0;
        filterScenarios();
    }
    currentScenario = filteredScenarios[state.questionIdx];
    secondChanceUsed = false;
    clearAnimations();

    // Update header
    qNumEl.textContent = `#${state.questionIdx + 1}`;
    catBadge.textContent = CAT_LABELS[currentScenario.cat] || currentScenario.cat;
    diffBadge.textContent = currentScenario.difficulty;
    diffBadge.className = 'diff-badge ' + currentScenario.difficulty;

    // Situation
    situationTextEl.textContent = currentScenario.situation;

    // Diamond state
    setDiamondState(currentScenario.runners, currentScenario.outs);

    // Hide feedback & next + wrong list
    feedbackEl.classList.add('hidden');
    feedbackEl.classList.remove('is-correct','is-wrong','is-tryagain');
    nextBtn.classList.add('hidden');
    if (feedbackWrongList) { feedbackWrongList.classList.add('hidden'); feedbackWrongList.innerHTML = ''; }

    // Pre-answer SETUP animation: show only the initial action (the hit/fly),
    // skipping any throws/runs so the question is unanswered visually.
    // Skipped under reduced-motion.
    const hasSetup = currentScenario.anim && currentScenario.anim.some(s => s.type === 'hit' || s.type === 'fly');
    if (setupReplayBtn) setupReplayBtn.classList.toggle('hidden', !hasSetup);
    playSetupAnimation();

    // Render answers (shuffled)
    answersEl.innerHTML = '';
    const sArr = shuffle(currentScenario.answers.map((t,i)=>({text:t,idx:i})));
    sArr.forEach((a, displayIdx) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.dataset.origIdx = a.idx;
        btn.dataset.keyNum = String(displayIdx + 1);
        btn.textContent = `${displayIdx + 1}. ${a.text}`;
        btn.setAttribute('aria-label', `Answer ${displayIdx + 1}: ${a.text}`);
        btn.onclick = () => handleAnswer(a.idx, btn);
        answersEl.appendChild(btn);
    });
}

// ─── DIAMOND STATE ───
function setDiamondState(runners = {}, outs = 0) {
    ['runner-1','runner-2','runner-3'].forEach(id => $(id).classList.add('hidden'));
    if (runners.first)  $('runner-1').classList.remove('hidden');
    if (runners.second) $('runner-2').classList.remove('hidden');
    if (runners.third)  $('runner-3').classList.remove('hidden');
    outsEl.textContent = outs;
    // Reset highlights
    document.querySelectorAll('.fielder-dot').forEach(d => d.classList.remove('highlight'));
    document.querySelectorAll('[id^="base-"]').forEach(b => b.classList.remove('base-lit'));
}

// Replay the pre-answer setup beat (hit/fly only), reusable from button + load.
function playSetupAnimation() {
    if (!currentScenario || !currentScenario.anim || !currentScenario.anim.length) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const setup = currentScenario.anim
        .filter(s => s.type === 'hit' || s.type === 'fly')
        .slice(0, 1);
    if (!setup.length) return;
    // Reset diamond state to scenario starting condition before replaying.
    clearAnimations();
    setDiamondState(currentScenario.runners, currentScenario.outs);
    runAnim($('diamond-svg'), setup, false);
}

// Update per-category and per-difficulty stats for a player.
function recordResult(player, scenario, gotIt) {
    const cat = scenario.cat;
    if (!player.catStats[cat]) player.catStats[cat] = { c:0, t:0 };
    player.catStats[cat].t++;
    if (gotIt) player.catStats[cat].c++;
    const dif = scenario.difficulty || 'beginner';
    if (!player.diffStats[dif]) player.diffStats[dif] = { c:0, t:0 };
    player.diffStats[dif].t++;
    if (gotIt) player.diffStats[dif].c++;
}

// ─── ANSWER HANDLING (second chance) ───
function handleAnswer(selectedIdx, btn) {
    const isCorrect = selectedIdx === currentScenario.correct;
    const allBtns = answersEl.querySelectorAll('.answer-btn');
    const player = P_();

    if (isCorrect) {
        // ✅ CORRECT
        allBtns.forEach(b => b.disabled = true);
        btn.classList.add('correct');

        const xpGain = secondChanceUsed ? 5 : 10;
        player.correct++;
        player.total++;
        player.streak++;
        if (player.streak > player.bestStreak) player.bestStreak = player.streak;
        player.xp += xpGain;
        recordResult(player, currentScenario, !secondChanceUsed);
        const dayStreak = markPlayedToday();
        saveState();

        feedbackIcon.textContent = secondChanceUsed ? '✅ Correct on your second try!' : '🎉 Correct!';
        feedbackMsg.textContent = currentScenario.explanation;
        feedbackDetail.textContent = currentScenario.detail;
        feedbackEl.classList.remove('hidden','is-wrong','is-tryagain');
        feedbackEl.classList.add('is-correct');

        updateStatsUI();
        updateXpUI();
        updateDayStreakChip(dayStreak);

        // Show play overlay with big diamond + animation
        showPlayOverlay(
            secondChanceUsed ? '✅ Correct on your second try!' : '🎉 Correct!',
            currentScenario.explanation,
            currentScenario.detail,
            currentScenario.anim,
            currentScenario.isOut
        );

        // Streak milestones
        if (player.streak >= 3 && player.streak % 3 === 0) showStreakCelebration(player.streak);

    } else if (!secondChanceUsed) {
        // ❌ FIRST WRONG — give second chance
        secondChanceUsed = true;
        btn.classList.add('wrong');
        btn.disabled = true;

        feedbackIcon.textContent = '🤔 Not quite — try again!';
        // Use per-distractor explanation if provided, else generic.
        const we = currentScenario.wrongExplanations && currentScenario.wrongExplanations[selectedIdx];
        feedbackMsg.textContent = we || 'That\'s not the best play. Read the situation again and pick another answer.';
        feedbackDetail.textContent = '';
        feedbackEl.classList.remove('hidden','is-correct','is-wrong');
        feedbackEl.classList.add('is-tryagain');

    } else {
        // ❌❌ SECOND WRONG — reveal answer
        allBtns.forEach(b => {
            b.disabled = true;
            const oi = parseInt(b.dataset.origIdx, 10);
            if (oi === currentScenario.correct) b.classList.add('correct');
        });
        btn.classList.add('wrong');

        player.total++;
        player.streak = 0;
        recordResult(player, currentScenario, false);
        const dayStreak = markPlayedToday();
        saveState();

        feedbackIcon.textContent = '❌ Here\'s the right answer:';
        feedbackMsg.textContent = currentScenario.explanation;
        feedbackDetail.textContent = currentScenario.detail;
        feedbackEl.classList.remove('hidden','is-correct','is-tryagain');
        feedbackEl.classList.add('is-wrong');

        // Render per-distractor "why wrong" if provided
        if (currentScenario.wrongExplanations && feedbackWrongList) {
            feedbackWrongList.innerHTML = '';
            currentScenario.answers.forEach((ans, i) => {
                if (i === currentScenario.correct) return;
                const why = currentScenario.wrongExplanations[i];
                if (!why) return;
                const li = document.createElement('li');
                li.innerHTML = `<b>${escapeHtml(ans)}:</b> ${escapeHtml(why)}`;
                feedbackWrongList.appendChild(li);
            });
            if (feedbackWrongList.children.length) feedbackWrongList.classList.remove('hidden');
        }

        updateStatsUI();
        updateDayStreakChip(dayStreak);

        // Show play overlay with big diamond + animation on wrong too
        showPlayOverlay(
            '❌ Here\'s the correct play:',
            currentScenario.explanation,
            currentScenario.detail,
            currentScenario.anim,
            currentScenario.isOut
        );
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ─── STATS UI ───
function updateStatsUI() {
    const p = P_();
    correctEl.textContent = p.correct;
    totalEl.textContent = p.total;
    streakEl.textContent = p.streak;
}

// ─── DAILY STREAK CHIP ───
function updateDayStreakChip(streak) {
    if (!dayStreakChip) return;
    if (streak == null) streak = computeDayStreak(P_());
    if (streak > 0) {
        dayStreakChip.classList.remove('hidden');
        dayStreakNum.textContent = streak;
        dayStreakChip.title = `${streak} day${streak === 1 ? '' : 's'} in a row`;
    } else {
        dayStreakChip.classList.add('hidden');
    }
}

// ─── XP / LEVEL UI ───
function updateXpUI() {
    const p = P_();
    const lvl = calcLevel(p.xp);
    const prevLvl = p.level;
    p.level = lvl;
    saveState();

    const cur = LEVELS[lvl];
    const next = LEVELS[lvl + 1];
    levelNameEl.textContent = cur.name;

    if (next) {
        const progress = p.xp - cur.xpNeeded;
        const needed = next.xpNeeded - cur.xpNeeded;
        const pct = Math.min(100, (progress / needed) * 100);
        xpTextEl.textContent = `${p.xp} / ${next.xpNeeded} XP`;
        xpFillEl.style.width = pct + '%';
    } else {
        xpTextEl.textContent = `${p.xp} XP — MAX LEVEL!`;
        xpFillEl.style.width = '100%';
    }

    // Milestone markers
    document.querySelectorAll('.ms').forEach(el => {
        const l = parseInt(el.dataset.lvl);
        el.classList.toggle('reached', l <= lvl);
        el.classList.toggle('current', l === lvl);
    });

    if (lvl > prevLvl) showLevelUp(cur.name);
}

function calcLevel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpNeeded) return i;
    }
    return 0;
}

// ─── LEVEL-UP OVERLAY ───
function showLevelUp(name) {
    const pName = P_().name || 'Player';
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `<div class="level-up-box">
        <h2>⬆️ LEVEL UP!</h2>
        <div class="new-level">${name}</div>
        <p>${pName}, you're getting smarter every play!</p>
        <button class="btn btn-primary" onclick="this.closest('.level-up-overlay').remove()">Let's Go! ⚾</button>
    </div>`;
    document.body.appendChild(overlay);
    launchFireworks(3000);
}

// ─── STREAK CELEBRATION ───
function showStreakCelebration(streak) {
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    streakQuote.textContent = `🔥 ${streak} in a row! ${quote}`;
    streakBanner.classList.remove('hidden');
    // Re-trigger animation
    streakBanner.style.animation = 'none';
    void streakBanner.offsetHeight;
    streakBanner.style.animation = '';

    launchFireworks(2000);
    setTimeout(() => streakBanner.classList.add('hidden'), 5000);
}

// ═══════════════════════════════════════
// ─── PLAY OVERLAY (big diamond + explanation) ───
// ═══════════════════════════════════════
function showPlayOverlay(icon, msg, detail, anim, isOut) {
    // Clone the diamond SVG into the overlay at large size
    const svgOriginal = $('diamond-svg');
    const svgClone = svgOriginal.cloneNode(true);
    svgClone.removeAttribute('id');
    // Reset clone state
    svgClone.querySelectorAll('.runner').forEach(r => r.classList.add('hidden'));
    svgClone.querySelectorAll('.fielder-dot').forEach(d => d.classList.remove('highlight'));
    svgClone.querySelectorAll('[id^="base-"]').forEach(b => b.classList.remove('base-lit'));
    const cloneBall = svgClone.querySelector('.anim-ball');
    const cloneRunner = svgClone.querySelector('.anim-runner');
    const cloneTrail = svgClone.querySelector('.anim-trail');
    const cloneOut = svgClone.querySelector('.out-text');
    if (cloneBall) cloneBall.classList.add('hidden');
    if (cloneRunner) cloneRunner.classList.add('hidden');
    if (cloneTrail) cloneTrail.classList.add('hidden');
    if (cloneOut) { cloneOut.classList.add('hidden'); cloneOut.classList.remove('show','fade'); }

    // Set runners for this scenario
    if (currentScenario.runners.first) { const r = svgClone.querySelector('#runner-1'); if(r) r.classList.remove('hidden'); }
    if (currentScenario.runners.second) { const r = svgClone.querySelector('#runner-2'); if(r) r.classList.remove('hidden'); }
    if (currentScenario.runners.third) { const r = svgClone.querySelector('#runner-3'); if(r) r.classList.remove('hidden'); }

    playOverlayDiamond.innerHTML = '';
    playOverlayDiamond.appendChild(svgClone);

    playOverlayIcon.textContent = icon;
    playOverlayMsg.textContent = msg;
    playOverlayDetail.textContent = detail;
    playOverlay.classList.remove('hidden');

    // Run animation on the CLONED SVG
    runAnim(svgClone, anim, isOut);
}

// Thin wrapper kept for backward-compat / clarity at call sites.
async function runOverlayAnimation(svg, steps, isOut) {
    return runAnim(svg, steps, isOut);
}

playOverlayClose.addEventListener('click', () => {
    playOverlay.classList.add('hidden');
    playOverlayDiamond.innerHTML = '';
    nextBtn.classList.remove('hidden');
});

// ═══════════════════════════════════════
// ─── DIAMOND ANIMATIONS ───
// ═══════════════════════════════════════
function clearAnimations() {
    animTimers.forEach(t => clearTimeout(t));
    animTimers = [];
    if (resetFielderTimer) { clearTimeout(resetFielderTimer); resetFielderTimer = null; }
    resetFielderPositions();
    const ball = $('anim-ball'), runner = $('anim-runner'), trail = $('anim-trail');
    const shadow = $('anim-ball-shadow');
    ball.classList.add('hidden');
    if (shadow) shadow.classList.add('hidden');
    runner.classList.add('hidden');
    trail.classList.add('hidden');
    outText.classList.add('hidden');
    outText.classList.remove('show','fade');
    document.querySelectorAll('.fielder-dot').forEach(d => d.classList.remove('highlight'));
    document.querySelectorAll('.touch-bubble').forEach(b => b.remove());
    document.querySelectorAll('.diamond-wrap').forEach(w => w.classList.remove('playing'));
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED ANIMATION ENGINE
// Works on any SVG root that contains the standard diamond shape
// (.anim-ball, .anim-runner, .anim-trail, .out-text, #pos-*, #base-*).
//
// Step features:
//   - any step may have `parallel: true` to start ALONGSIDE the
//     previous step instead of awaiting it (used to race ball vs
//     runner so kids see who beats the throw)
//   - touch-number bubbles appear on each fielder/base that the
//     ball passes through (1, 2, 3, ...) -- shows ball flow
// ═══════════════════════════════════════════════════════════════
const BASE_MAP = {home:'base-home',first:'base-1',second:'base-2',third:'base-3'};
const FIELDER_KEYS = new Set(['p','c','1b','2b','ss','3b','lf','cf','rf']);

function resolvePos(p) {
    if (typeof p === 'string') return P[p] || P.home;
    return p; // {x,y} literal
}

// Shared per-frame tween. Cancels via versionRef so stale frames stop.
function animateElement(el, from, to, duration, versionRef, currentVersion) {
    return new Promise(resolve => {
        const start = performance.now();
        const fx = from.x, fy = from.y, dx = to.x - from.x, dy = to.y - from.y;
        el.classList.remove('hidden');
        function step(now) {
            if (versionRef && versionRef.v !== currentVersion) { resolve(); return; }
            const t = Math.min(1, (now - start) / duration);
            const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out
            el.setAttribute('cx', fx + dx * ease);
            el.setAttribute('cy', fy + dy * ease);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}

// Pseudo-3D ball motion: ball follows an arc above the ground, while a
// shadow tracks the ball's HORIZONTAL position only (stays on the ground).
// Ball also scales up at apex to fake depth. `arcHeight` controls peak lift.
function animateBall(svg, from, to, duration, arcHeight, versionRef, currentVersion) {
    const ball = svg.querySelector('.anim-ball');
    const shadow = svg.querySelector('.anim-ball-shadow');
    if (!ball) return Promise.resolve();
    const baseR = 4;
    return new Promise(resolve => {
        const start = performance.now();
        const fx = from.x, fy = from.y, dx = to.x - from.x, dy = to.y - from.y;
        ball.classList.remove('hidden');
        if (shadow) shadow.classList.remove('hidden');
        function step(now) {
            if (versionRef && versionRef.v !== currentVersion) { resolve(); return; }
            const t = Math.min(1, (now - start) / duration);
            const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            // Linear ground position (where the shadow lives)
            const gx = fx + dx * ease;
            const gy = fy + dy * ease;
            // Parabolic lift -- 4t(1-t) peaks at t=0.5
            const lift = arcHeight * 4 * t * (1 - t);
            ball.setAttribute('cx', gx);
            ball.setAttribute('cy', gy - lift);
            // Scale ball with lift -- bigger when "closer to camera"
            const scale = 1 + lift / 30;
            ball.setAttribute('r', baseR * scale);
            if (shadow) {
                shadow.setAttribute('cx', gx);
                shadow.setAttribute('cy', gy + 1.5);
                // Shadow fades and shrinks as ball rises
                const shadowOpacity = Math.max(0.15, 0.5 - lift / 60);
                const shadowScale = Math.max(0.5, 1 - lift / 50);
                shadow.setAttribute('rx', 4 * shadowScale);
                shadow.setAttribute('ry', 1.5 * shadowScale);
                shadow.setAttribute('opacity', shadowOpacity);
            }
            if (t < 1) requestAnimationFrame(step);
            else { ball.setAttribute('r', baseR); resolve(); }
        }
        requestAnimationFrame(step);
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Append a small numbered bubble at the given (x,y) on the svg.
function addTouchBubble(svg, pos, num) {
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'touch-bubble');
    g.setAttribute('transform', `translate(${pos.x + 6},${pos.y - 8})`);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('r', '5');
    c.setAttribute('fill', '#1976d2');
    c.setAttribute('stroke', '#fff');
    c.setAttribute('stroke-width', '1');
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('y', '2.5');
    t.setAttribute('font-size', '7');
    t.setAttribute('font-weight', '800');
    t.setAttribute('fill', '#fff');
    t.textContent = String(num);
    g.appendChild(c); g.appendChild(t);
    svg.appendChild(g);
}

// Keep small-diamond legacy wrapper -- adds the post-play fielder reset.
async function runAnimation(steps, isOut) {
    await runAnim($('diamond-svg'), steps, isOut);
    resetFielderTimer = setTimeout(() => { resetFielderPositions(); resetFielderTimer = null; }, 2000);
}

// The unified engine. Runs `steps` against any SVG root.
async function runAnim(svg, steps, isOut) {
    const ball = svg.querySelector('.anim-ball');
    const shadow = svg.querySelector('.anim-ball-shadow');
    const runner = svg.querySelector('.anim-runner');
    const trail = svg.querySelector('.anim-trail');
    const outEl = svg.querySelector('.out-text');
    const versionRef = { v: 0 }; // reserved for future cancellation

    // Pop the field forward during animation for visibility (only inline diamond).
    const wrap = svg.parentElement && svg.parentElement.classList.contains('diamond-wrap')
        ? svg.parentElement : null;
    if (wrap) wrap.classList.add('playing');

    let showedOut = false;
    const touchCounter = { n: 0 };

    const showOutInline = async () => {
        if (!outEl) return;
        outEl.classList.remove('hidden','fade'); outEl.classList.add('show');
        await sleep(1400);
        outEl.classList.add('fade');
        await sleep(500);
        outEl.classList.add('hidden'); outEl.classList.remove('show','fade');
    };

    if (!steps || !steps.length) {
        if (isOut) await showOutInline();
        return;
    }

    const showTrail = (from, to) => {
        trail.setAttribute('x1', from.x); trail.setAttribute('y1', from.y);
        trail.setAttribute('x2', to.x);   trail.setAttribute('y2', to.y);
        trail.classList.remove('hidden');
    };

    const highlightFielder = (who) => {
        const el = svg.querySelector('#pos-' + who);
        if (el) el.classList.add('highlight');
        return el;
    };

    // Mark a touch on a fielder (string code) or base (string key) -- numbered bubble.
    const touchAtFielder = (who) => {
        const el = svg.querySelector('#pos-' + who);
        if (!el) return;
        const pos = { x: parseFloat(el.getAttribute('cx')), y: parseFloat(el.getAttribute('cy')) };
        addTouchBubble(svg, pos, ++touchCounter.n);
    };
    const touchAtBase = (baseKey) => {
        const pos = P[baseKey]; if (!pos) return;
        addTouchBubble(svg, pos, ++touchCounter.n);
    };

    // Execute a single step, returning a promise that resolves when it ends.
    // Does NOT await the trailing pause -- the caller controls pacing.
    const runStep = (step) => {
        switch (step.type) {
            case 'hit': {
                const to = resolvePos(step.to);
                // Ground ball -- minimal lift, shadow hugs the ball
                return animateBall(svg, P.home, to, step.slow ? 1000 : 650, 2, versionRef, versionRef.v).then(() => {
                    if (typeof step.to === 'string' && FIELDER_KEYS.has(step.to)) {
                        highlightFielder(step.to);
                        touchAtFielder(step.to);
                    }
                });
            }
            case 'fly': {
                const to = resolvePos(step.to);
                // Big arc -- height proportional to distance, capped
                const dist = Math.hypot(to.x - P.home.x, to.y - P.home.y);
                const arc = Math.min(60, dist * 0.55);
                return animateBall(svg, P.home, to, 950, arc, versionRef, versionRef.v).then(() => {
                    if (typeof step.to === 'string' && FIELDER_KEYS.has(step.to)) {
                        highlightFielder(step.to);
                        touchAtFielder(step.to);
                    }
                });
            }
            case 'throw': {
                const from = resolvePos(step.from), to = resolvePos(step.to);
                trail.classList.add('hidden');
                showTrail(from, to);
                // Throws have a slight lift -- proportional to distance
                const dist = Math.hypot(to.x - from.x, to.y - from.y);
                const arc = Math.min(20, dist * 0.18);
                return animateBall(svg, from, to, 600, arc, versionRef, versionRef.v).then(() => {
                    const bid = BASE_MAP[step.to];
                    if (bid) { const b = svg.querySelector('#' + bid); if (b) b.classList.add('base-lit'); touchAtBase(step.to); }
                    else if (typeof step.to === 'string' && FIELDER_KEYS.has(step.to)) {
                        highlightFielder(step.to); touchAtFielder(step.to);
                    }
                });
            }
            case 'runBatter': {
                runner.setAttribute('fill', '#ff7043');
                return animateElement(runner, P.home, P.first, 800, versionRef, versionRef.v).then(async () => {
                    if (step.out && !showedOut) { showedOut = true; await showOutInline(); }
                    runner.classList.add('hidden');
                });
            }
            case 'runnerAdvance': {
                const from = resolvePos(step.from), to = resolvePos(step.to || 'second');
                runner.setAttribute('fill', '#ef5350');
                return animateElement(runner, from, to, 750, versionRef, versionRef.v).then(async () => {
                    if (step.out && !showedOut) { showedOut = true; await showOutInline(); }
                    runner.classList.add('hidden');
                });
            }
            case 'runnerScores': {
                const from = resolvePos(step.from);
                runner.setAttribute('fill', '#ef5350');
                return animateElement(runner, from, P.home, 800, versionRef, versionRef.v).then(() => {
                    runner.classList.add('hidden');
                });
            }
            case 'runnerRetreat': {
                const base = resolvePos(step.from);
                const mid = { x: (base.x + P.second.x) / 2, y: (base.y + P.second.y) / 2 };
                runner.setAttribute('fill', '#ef5350');
                runner.classList.remove('hidden');
                runner.setAttribute('cx', mid.x); runner.setAttribute('cy', mid.y);
                return animateElement(runner, mid, base, 650, versionRef, versionRef.v).then(async () => {
                    if (step.out && !showedOut) { showedOut = true; await showOutInline(); }
                    runner.classList.add('hidden');
                });
            }
            case 'fielderMove': {
                const posEl = svg.querySelector('#pos-' + step.who);
                if (!posEl) return Promise.resolve();
                const from = { x: parseFloat(posEl.getAttribute('cx')), y: parseFloat(posEl.getAttribute('cy')) };
                const to = resolvePos(step.to);
                return animateElement(posEl, from, to, 650, versionRef, versionRef.v).then(() => {
                    posEl.classList.add('highlight');
                });
            }
            case 'baseStep': {
                const bid = BASE_MAP[step.base];
                if (bid) { const b = svg.querySelector('#' + bid); if (b) b.classList.add('base-lit'); touchAtBase(step.base); }
                return sleep(350);
            }
            case 'cutoff': {
                // Cutoff throw: ball goes from outfielder, stops at cutoff fielder, then continues to base.
                // step: { from: <outfielder pos>, via: <cutoff fielder>, to: <base or fielder> }
                const from = resolvePos(step.from);
                const via = resolvePos(step.via);
                const to = resolvePos(step.to);
                trail.classList.add('hidden');
                showTrail(from, via);
                const dist1 = Math.hypot(via.x - from.x, via.y - from.y);
                const arc1 = Math.min(20, dist1 * 0.18);
                return animateBall(svg, from, via, 550, arc1, versionRef, versionRef.v).then(async () => {
                    if (typeof step.via === 'string' && FIELDER_KEYS.has(step.via)) {
                        highlightFielder(step.via); touchAtFielder(step.via);
                    }
                    await sleep(200); // pause at cutoff
                    showTrail(via, to);
                    const dist2 = Math.hypot(to.x - via.x, to.y - via.y);
                    const arc2 = Math.min(20, dist2 * 0.18);
                    await animateBall(svg, via, to, 550, arc2, versionRef, versionRef.v);
                    const bid = BASE_MAP[step.to];
                    if (bid) { const b = svg.querySelector('#' + bid); if (b) b.classList.add('base-lit'); touchAtBase(step.to); }
                    else if (typeof step.to === 'string' && FIELDER_KEYS.has(step.to)) {
                        highlightFielder(step.to); touchAtFielder(step.to);
                    }
                });
            }
            default:
                return Promise.resolve();
        }
    };

    // Walk the steps. A step with `parallel:true` joins the previous group.
    // Auto-parallel rule: a `runBatter` or `runnerAdvance` immediately after
    // a `throw` runs concurrently -- so kids see the race to the bag.
    let pending = [];
    let prevStep = null;
    const flush = async () => {
        if (!pending.length) return;
        await Promise.all(pending);
        pending = [];
        await sleep(300);
    };

    const isAutoRace = (prev, cur) => prev && prev.type === 'throw'
        && (cur.type === 'runBatter' || cur.type === 'runnerAdvance' || cur.type === 'runnerScores');

    for (const step of steps) {
        const joinPrev = (step.parallel || isAutoRace(prevStep, step)) && pending.length > 0;
        if (joinPrev) {
            pending.push(runStep(step));
        } else {
            await flush();
            pending.push(runStep(step));
        }
        prevStep = step;
    }
    await flush();

    if (isOut && !showedOut) await showOutInline();

    // Clean up shadow + zoom-out the field.
    if (shadow) shadow.classList.add('hidden');
    if (wrap) wrap.classList.remove('playing');
}

function resetFielderPositions() {
    const defaults = {
        'pos-p':{x:170,y:238}, 'pos-c':{x:170,y:294},
        'pos-1b':{x:222,y:218}, 'pos-2b':{x:198,y:198},
        'pos-ss':{x:142,y:198}, 'pos-3b':{x:118,y:218},
        'pos-lf':{x:72,y:172}, 'pos-cf':{x:170,y:140}, 'pos-rf':{x:268,y:172}
    };
    for (const [id, pos] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) { el.setAttribute('cx', pos.x); el.setAttribute('cy', pos.y); }
    }
}

// ═══════════════════════════════════════
// ─── FIREWORKS ───
// ═══════════════════════════════════════
let fwParticles = [];
let fwActive = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchFireworks(duration) {
    fwActive = true;
    const end = Date.now() + duration;

    function spawnBurst() {
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * canvas.height * 0.5;
        const hue = Math.random() * 360;
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 1.5 + Math.random() * 3;
            fwParticles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60 + Math.random() * 30,
                hue, size: 2 + Math.random() * 2
            });
        }
    }

    function tick() {
        if (!fwActive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Date.now() < end && Math.random() < 0.12) spawnBurst();

        for (let i = fwParticles.length - 1; i >= 0; i--) {
            const p = fwParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // gravity
            p.life--;
            if (p.life <= 0) { fwParticles.splice(i, 1); continue; }
            const alpha = p.life / 90;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
            ctx.fill();
        }

        if (fwParticles.length > 0 || Date.now() < end) {
            requestAnimationFrame(tick);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            fwActive = false;
        }
    }
    requestAnimationFrame(tick);
}

// ─── CATEGORY TABS ───
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.cat;
        filterScenarios();
        loadQuestion();
    });
});

// ─── NEXT / RESET ───
nextBtn.addEventListener('click', () => {
    state.questionIdx++;
    advanceTurn();
    saveState();
    loadQuestion();
});

resetBtn.addEventListener('click', () => {
    if (confirm('Reset all progress? Your XP, level, and stats will be cleared.')) {
        state = defaultState();
        saveState();
        updateStatsUI();
        updateXpUI();
        filterScenarios();
        loadQuestion();
        // Return to welcome screen
        appMain.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        nameInput.value = '';
        if (playerName2Input) { playerName2Input.value = ''; playerName2Input.classList.add('hidden'); }
        if (twoPlayerToggle) twoPlayerToggle.checked = false;
        nameInput.focus();
    }
});

// ─── WELCOME / NAME ENTRY ───
const welcomeScreen = $('welcome-screen');
const appMain = $('app-main');
const nameInput = $('player-name-input');
const startBtn = $('start-btn');
const greetingEl = $('player-greeting');

function showApp() {
    welcomeScreen.classList.add('hidden');
    appMain.classList.remove('hidden');
    updateGreeting();
    updateTurnBanner();
}

function updateGreeting() {
    const p = P_();
    greetingEl.textContent = p.name ? `Hey, ${p.name}!` : 'Little League Edition';
}

function updateTurnBanner() {
    if (!turnBanner) return;
    if (state.twoPlayer && state.players.length > 1) {
        turnBanner.classList.remove('hidden');
        turnNameEl.textContent = P_().name || `Player ${state.currentPlayer + 1}`;
    } else {
        turnBanner.classList.add('hidden');
    }
}

function advanceTurn() {
    if (state.twoPlayer && state.players.length > 1) {
        state.currentPlayer = 1 - state.currentPlayer;
        updateGreeting();
        updateTurnBanner();
        updateStatsUI();
        updateXpUI();
        updateDayStreakChip();
    }
}

function handleStart() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); nameInput.style.borderColor='#ef5350'; return; }

    // First player setup
    state.players[0].name = name;
    if (positionSelect) state.players[0].position = positionSelect.value || 'all';

    // Two-player setup
    if (twoPlayerToggle && twoPlayerToggle.checked) {
        const name2 = (playerName2Input.value || '').trim();
        if (!name2) { playerName2Input.focus(); playerName2Input.style.borderColor='#ef5350'; return; }
        state.twoPlayer = true;
        if (state.players.length < 2) state.players.push(defaultPlayer(name2));
        else state.players[1].name = name2;
        state.players[1].position = state.players[0].position; // same weighting
    } else {
        state.twoPlayer = false;
        state.currentPlayer = 0;
    }

    saveState();
    showApp();
    initGame();
}

startBtn.addEventListener('click', handleStart);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleStart(); });
nameInput.addEventListener('input', () => { nameInput.style.borderColor=''; });

if (twoPlayerToggle && playerName2Input) {
    twoPlayerToggle.addEventListener('change', () => {
        playerName2Input.classList.toggle('hidden', !twoPlayerToggle.checked);
        if (twoPlayerToggle.checked) playerName2Input.focus();
    });
    playerName2Input.addEventListener('keydown', e => { if (e.key === 'Enter') handleStart(); });
    playerName2Input.addEventListener('input', () => { playerName2Input.style.borderColor=''; });
}

// ─── REPLAY BUTTON ───
if (setupReplayBtn) {
    setupReplayBtn.addEventListener('click', playSetupAnimation);
}

if (playOverlayReplay) {
    playOverlayReplay.addEventListener('click', () => {
        const svg = playOverlayDiamond.querySelector('svg');
        if (!svg || !currentScenario) return;
        // Reset clone to its starting state first.
        svg.querySelectorAll('.runner').forEach(r => r.classList.add('hidden'));
        svg.querySelectorAll('.fielder-dot').forEach(d => d.classList.remove('highlight'));
        svg.querySelectorAll('[id^="base-"]').forEach(b => b.classList.remove('base-lit'));
        svg.querySelectorAll('.touch-bubble').forEach(b => b.remove());
        if (currentScenario.runners.first) { const r = svg.querySelector('#runner-1'); if(r) r.classList.remove('hidden'); }
        if (currentScenario.runners.second) { const r = svg.querySelector('#runner-2'); if(r) r.classList.remove('hidden'); }
        if (currentScenario.runners.third) { const r = svg.querySelector('#runner-3'); if(r) r.classList.remove('hidden'); }
        runAnim(svg, currentScenario.anim, currentScenario.isOut);
    });
}

// ─── STATS MODAL ───
function openStats() {
    if (!statsModal || !statsBody) return;
    const p = P_();
    const acc = p.total ? Math.round(100 * p.correct / p.total) : 0;
    const dayStreak = computeDayStreak(p);

    let html = `
        <div class="stats-row">
            <div class="stat-block"><span class="v">${p.xp}</span><span class="l">XP</span></div>
            <div class="stat-block"><span class="v">${LEVELS[p.level].name}</span><span class="l">Level</span></div>
            <div class="stat-block"><span class="v">${acc}%</span><span class="l">Accuracy</span></div>
            <div class="stat-block"><span class="v">${p.bestStreak}</span><span class="l">Best Streak</span></div>
            <div class="stat-block"><span class="v">${dayStreak}</span><span class="l">Day Streak</span></div>
        </div>
        <h3 style="font-size:.95rem;color:#444;margin:14px 0 8px">By Category</h3>
        <div class="cat-progress">`;

    const cats = Object.keys(CAT_LABELS);
    cats.forEach(cat => {
        const s = p.catStats[cat] || { c:0, t:0 };
        const pct = s.t ? Math.round(100 * s.c / s.t) : 0;
        html += `<div class="cat-row">
            <span class="name">${CAT_LABELS[cat]}</span>
            <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
            <span class="num">${s.c}/${s.t} · ${pct}%</span>
        </div>`;
    });

    html += `</div><h3 style="font-size:.95rem;color:#444;margin:14px 0 8px">By Difficulty</h3><div class="cat-progress">`;
    ['beginner','intermediate','advanced'].forEach(d => {
        const s = p.diffStats[d] || { c:0, t:0 };
        const pct = s.t ? Math.round(100 * s.c / s.t) : 0;
        html += `<div class="cat-row">
            <span class="name" style="text-transform:capitalize">${d}</span>
            <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
            <span class="num">${s.c}/${s.t} · ${pct}%</span>
        </div>`;
    });
    html += `</div>`;

    if (state.twoPlayer && state.players.length > 1) {
        html += `<p style="margin-top:14px;font-size:.85rem;color:#666;text-align:center">
            Showing stats for <b>${escapeHtml(p.name)}</b> &middot;
            <a href="#" id="switch-stats-player" style="color:#3a7d3d">View ${escapeHtml(state.players[1 - state.currentPlayer].name)}</a></p>`;
    }

    statsBody.innerHTML = html;
    const switchLink = $('switch-stats-player');
    if (switchLink) switchLink.onclick = (e) => {
        e.preventDefault();
        state.currentPlayer = 1 - state.currentPlayer;
        openStats();
    };

    statsModal.classList.remove('hidden');
}

if (statsBtn) statsBtn.addEventListener('click', openStats);

// ─── COACH CHEAT SHEET ───
function openCoach() {
    if (!coachModal || !coachBody) return;
    const byCat = {};
    scenarios.forEach(s => {
        if (!byCat[s.cat]) byCat[s.cat] = [];
        byCat[s.cat].push(s);
    });

    let html = '';
    Object.keys(CAT_LABELS).forEach(cat => {
        const list = byCat[cat] || [];
        if (!list.length) return;
        html += `<div class="coach-cat"><h3>${CAT_LABELS[cat]} (${list.length})</h3>`;
        list.forEach(s => {
            html += `<div class="coach-q">
                <div class="sit">${escapeHtml(s.situation)}</div>
                <div class="ans">${escapeHtml(s.answers[s.correct])}</div>
                <div class="det">${escapeHtml(s.detail)}</div>
            </div>`;
        });
        html += `</div>`;
    });

    coachBody.innerHTML = html;
    coachModal.classList.remove('hidden');
}

if (coachBtn) coachBtn.addEventListener('click', openCoach);
if (coachPrintBtn) coachPrintBtn.addEventListener('click', () => window.print());

// Generic modal close (× buttons or backdrop click)
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close');
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
    });
});
[statsModal, coachModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
});

// ─── KEYBOARD NAVIGATION ───
document.addEventListener('keydown', (e) => {
    // Skip if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    // Close modals on Escape
    if (e.key === 'Escape') {
        [playOverlay, statsModal, coachModal].forEach(m => { if (m) m.classList.add('hidden'); });
        return;
    }

    // Number keys 1-4 select an answer
    if (/^[1-4]$/.test(e.key)) {
        const target = answersEl.querySelector(`.answer-btn[data-key-num="${e.key}"]:not(:disabled)`);
        if (target) { e.preventDefault(); target.click(); }
        return;
    }

    // Enter advances to next when next button is visible
    if (e.key === 'Enter') {
        if (playOverlay && !playOverlay.classList.contains('hidden')) {
            playOverlayClose.click();
        } else if (!nextBtn.classList.contains('hidden')) {
            nextBtn.click();
        }
    }

    // R key replays the animation when overlay is open
    if (e.key === 'r' || e.key === 'R') {
        if (playOverlay && !playOverlay.classList.contains('hidden') && playOverlayReplay) {
            playOverlayReplay.click();
        }
    }
});

// ─── INIT ───
function initGame() {
    updateStatsUI();
    updateXpUI();
    updateDayStreakChip();
    filterScenarios();
    loadQuestion();
}

// Check if returning player
if (P_().name) {
    showApp();
    initGame();
} else {
    nameInput.focus();
}
