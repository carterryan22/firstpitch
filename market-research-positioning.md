# Market Research & Positioning Brief

**Companion to:** `player-development-metric-schema.md` (core engineering spec) and `product-feature-addendum.md` (product/feature layer). This document holds the market analysis, competitive map, personas, pricing, go-to-market, and validation plan. It does not define product behavior — see the other two for that.

> ## ⚠️ Data-verification notice — read first
> Many figures below (market sizes, company revenues, user counts, competitor prices, participation numbers) come from a research draft and **have not been independently verified against primary sources.** They are marked **[VERIFY]**. Before using any of them externally — investor decks, partner pitches, grant applications — confirm each against the original source, because several are the kind of number that changes year to year and a wrong figure in a pitch costs credibility fast. The **strategic conclusions** in this brief do not depend on the exact figures and are supported by the broader competitive analysis; the **specific numbers** are the part that needs checking. Ask and I'll run a verification pass with live sources.

---

## 1. Executive take

This is **not a blue-ocean idea.** The market already has stat apps, sensor apps, training programs, recruiting profiles, facility tech, and team-management platforms. The specific **wedge** that is still open:

> A **parent-owned, player-centered development app** that connects home/facility drills, objective measurables, coach feedback, safety guardrails, and age-scaled gamification into one **closed loop.**

Winning positioning is **not** "track your kid's stats." It is: **"Know what your player should work on next, how to do it safely, and whether it's actually working."** That is the gap between scorekeeping apps, showcase platforms, velo radars, YouTube drills, private lessons, and facility tech.

---

## 2. Market timing

**The buyer already spends money and time** — so the product must *save confusion, not add a chore.*
- [VERIFY] Aspen Project Play: average U.S. sports family spent ~$1,016 on a child's primary sport in 2024, up ~46% since 2019.
- [VERIFY] Project Play: sports parents spend ~3h23m on days their child has a practice/game.
- [VERIFY] MLB: combined U.S. baseball + softball participation ~25.3M, highest since 2018; softball up ~500K YoY.
- [VERIFY] U.S. youth-sports industry commonly estimated ~$40B/yr, with PE and large operators targeting clubs, tournaments, academies, tech, and facilities.

**Software spend is already validated:**
- [VERIFY] The dominant scorekeeping app: >9M users, 1M teams, 9M games/yr; its parent company's FY2025 SEC filing cited ~10M unique active users and ~$150M revenue.
- [VERIFY] The leading team-management app: ~30M users (2025); registration, scheduling, comms, coaching resources, streaming.

**Implication:** families already pay for youth-sports software. The open question isn't "will they use an app" — it's whether they need *another* one badly enough. Yes, **only** if it lives outside the team-admin lane and solves "what should my kid do next?"

---

## 3. Current market map

### A — Team management / scorekeeping
The dominant scorekeeping app (baseball/softball; game/event-first), the team-admin incumbent (admin-first, multi-sport), and B2B league/club platforms (league/club infra). **Gap:** none is a kid-owned *development* record.
**Implication:** do not compete as a better scorekeeping app — that's a trap. Let it track games; this app interprets practice, progress, and next actions.

### B — Measurement hardware / sensor apps
Velocity radars (velo + video, hardware-tethered), swing sensors ([VERIFY] ~$120 sensor + subscription; hitting-only), bat sensors + games (hitting-focused, closest to kid-engagement), ball-flight trackers ([VERIFY] elite/facility tier ~$3,500), hitting launch-monitors ([VERIFY] home ~$49.99/mo up to 4 players), video-feedback apps (video + coach feedback).
**Implication:** the market already *measures.* The gap is **measurement translation** — "this number means this, therefore do this next."

### C — Training content / programs
Training-bat programs (bat-speed/exit-velo tied to training bats; hardware/content funnel), subscription content apps ([VERIFY] ~$19.99/mo; content-first, baseball-first), training-subscription apps ([VERIFY] ~$34.99/mo or lifetime; training not measurement OS), narrow speed programs, YouTube/IG (infinite, no sequencing/personalization/accountability).
**Implication:** don't try to be the best drill author first. Be the **routing layer** — based on the kid's data, age, gear, schedule, and soreness, here's the right plan.

### D — Recruiting / showcase / verified profile
The dominant showcase platform (showcase profiles, grades, rankings; exposure-first, older-player bias, [VERIFY] expensive), recruiting-profile services (recruiting profile + college search), event-based verified-metrics services (event-first verified metrics).
**Implication:** recruiting is **Phase 4, not MVP.** Leading with recruiting enters a crowded, mistrusted category. Lead with development.

### E — The closest direct competitor: a club-tied metrics-hub platform
**Study this hardest.** [VERIFY] It describes a central metrics hub (60-yd, exit velo) tracked over time + recruiting profile, with 12-week re-testing, daily plans off a composite test score, mobility correctives, and a three-pillar (physical/skill/mental) assessment model; positioned as an individualized, often club/academy-tied platform with AI testing and workload management.
**The concept is not novel.** Novelty must come from **execution + wedge:** (1) parent-owned not academy-owned, (2) home-first not testing-center-first, (3) baseball + softball day one, (4) coach-assigned / parent-executed, (5) U10 gamified but U14 serious, (6) safety-first / workload-aware, (7) vendor-neutral integrations not a closed ecosystem.

---

## 4. Customer pain signals
*(These are the qualitative signals that most directly justify the wedge; they echo the r/Homeplate research from the start of this project.)*

1. **"The stats are nice — but now what?"** The strongest pain. Coaches/parents see contact %, hard-hit %, QAB, K-rate, etc. in their scorekeeping app and don't know what to *do* with it. **This is the core product gap.**
2. **Youth game stats create drama and are often garbage.** Errors scored as hits, kids over-focused on stats, coaches editing stats. → **Design rule:** build around repeatable skill tests, personal progress, and coach-approved goals, *not* youth game stats.
3. **Families want structure between lessons/practices** — the "between practices" wedge.
4. **Parents distrust showcase economics** — early showcase invites seen as "money grabs." → Room for an anti-waste message: *"Don't pay for a showcase yet; your player's verified metrics suggest focusing on X for 8 weeks."*
5. **Sensor subscriptions frustrate people** — e.g., metrics gated after a daily swing limit. → Opening for a **neutral** app that doesn't trap the development record in one vendor.

---

## 5. Target personas

**Primary buyer — "committed but sane parent":** pays for lessons, gear, tournaments, maybe a velo radar or swing sensor; not trying to make a 10-year-old pro; wants **clarity.** Jobs-to-be-done: tell me what to work on this week · make home practice useful without me becoming a coach · don't let me overdo it · show progress without comparison · help me understand what the coach meant.

**Secondary user — the kid (by age):** U8–10 fun missions/points/streaks; U11–12 skill challenges/PRs; U13–14 serious progress/position ladders; U15+ verified metrics/recruiting readiness. → one engine, different skins.

**Coach:** doesn't want another admin tool. Wants: assign a focus → give parents a home version → know who did it → see if it helped → build practice from team weaknesses. **Killer workflow: coach assigns, parent executes, player completes, coach sees progress.**

**Facility:** wants recurring revenue, better session value, premium differentiation. A "verified combine kit" gives a reason to run testing nights, baseline weeks, winter progress checks.

---

## 6. Strategic gap analysis

Everyone has stats, video, metrics, drills, programs, recruiting profiles, team comms, facility tech. **Almost nobody has, in one family-owned product:**

| Gap | Why it matters |
|---|---|
| Parent profile + kid profile | Buyer and athlete need different UX |
| Home-to-facility drill ladder | Families have different equipment access |
| Closed-loop diagnosis | Numbers must trigger next actions |
| Coach-speak translator | Parents often don't know what feedback means |
| Safety / workload gating | Trust advantage, esp. pitchers/catchers |
| Progress without comparison | Prevents U10 stat anxiety |
| Softball parity | Most tools are baseball-first |
| Vendor-neutral metric storage | Avoids hardware lock-in |
| Team baseline week | Coach-adoption wedge |
| Verified profile ladder | Trust/recruiting bridge later |

That list **is** the product. (All are specified in the core spec / addendum.)

---

## 7. Positioning

**Bad positioning (all owned by incumbents):** "a stat tracker" (scorekeeping apps), "a recruiting profile" (showcase/recruiting platforms), "a training app" (training subscriptions/YouTube), "a sensor app" (hardware makers).

**Strong positioning:** *The youth baseball/softball development app that turns real measurements and coach feedback into safe, age-appropriate home and facility training plans.*

| Audience | Line |
|---|---|
| Sharper | "Scorekeeping apps show what happened. This shows what to work on next." |
| Parent | "Know what to practice, how much is enough, and whether your player is improving." |
| Coach | "Assign between-practice missions families can actually do." |
| Facility | "Run verified player baselines, generate reports, and keep athletes coming back." |

**The "Switzerland" thesis:** be the neutral layer *between* apps, devices, coaches, facilities, and parents — not another silo.

---

## 8. Differentiation matrix

| Feature | Scorekeeping app | Velo radar | Bat sensors | Training subs | Club metrics hub | This app |
|---|---|---|---|---|---|---|
| Game stats | ✅ | ❌ | ❌ | ❌ | Limited | Optional |
| Player-owned profile | Partial | Partial | Partial | Partial | Club-dependent | ✅ Core |
| Parent + kid profiles | Partial | ❌ | Partial | ❌ | ✅/partial | ✅ Core |
| Home-first drills | ❌ | ❌ | Some | ✅ | Some | ✅ Core |
| Facility upgrade path | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Vendor-neutral metrics | ❌ | ❌ | ❌ | ❌ | ❌/limited | ✅ |
| Age-scaled gamification | ❌ | Some | Some | Some | Unknown | ✅ Core |
| Safety/workload gating | Pitch counts only | ❌ | ❌ | Some | ✅ | ✅ Core |
| Coach-assigned / parent-executed | ❌ | ❌ | ❌ | ❌ | Club-dependent | ✅ Core |
| Softball equal day one | ✅ scoring | ✅ radar | Some | Some | Unclear | ✅ Core |
| Recruiting profile | ❌ | ❌ | ❌ | ❌ | ✅ | Later |

---

## 9. Safety as a moat
Not just legal cover — a **brand wedge.** [VERIFY] Pitch Smart provides age-appropriate guidelines (pitch-count limits, required rest, avoiding breaking pitches young, months off from throwing yearly); ASMI identifies overuse as the principal risk factor for adolescent pitching injuries. Visible stance: **"We don't reward reckless volume. We reward smart progress."** Much of the market sells "add velo fast" — this app can own the **parent-trust** position. (Implemented in core spec §11–§12 and addendum §C.)

---

## 10. Privacy / compliance (COPPA)
Because the product involves children under 13, **parent ownership is foundational, not optional.** [VERIFY] COPPA applies to services directed to under-13s or that knowingly collect their personal info; parental notice + consent are triggered when a user is determined under 13. Design: parent account owns login/consent/payment/sharing; kid profile is parent-controlled; kid mode limited/safe; no public U10 profiles; no behavioral ads to kids; no DMs from unknown adults; coach/facility access permissioned; recruiting locked to older + parent-approved. (This is *why* the parent+kid model in addendum §A is correct, not just convenient. Treat COPPA specifics as **[VERIFY] with counsel** before launch.)

---

## 11. Pricing (recommended; competitor prices [VERIFY])
Market signals of willingness to pay: the dominant scorekeeping app at scale, content subscriptions [VERIFY] ~$19.99/mo, training subscriptions [VERIFY] ~$34.99/mo, home launch-monitors [VERIFY] ~$49.99/mo, video-feedback apps' individual/coach tiers.

| Tier | Price | User |
|---|---|---|
| Free | $0 | One kid, basic profile, limited missions |
| Player Plus | $7.99–$9.99/mo | Full missions, progress, player cards |
| Family | $14.99–$19.99/mo | Multiple kids, parent dashboard |
| Coach Team | $99–$199/season | Assign missions, team baseline week |
| Facility | $149–$299/mo | Combine mode, verified reports, dashboard |
| Verified Event | $10–$25/player | Testing/report fee |

**Best initial paid product:** Family Plan + Player Progress Report. *Parents pay for clarity, not charts.*

---

## 12. Go-to-market

**Beachhead:** U9–U14 committed baseball/softball families and coaches who already use a scorekeeping app but don't know what to do between practices. (Already app-trained, already spending, development-focused, burnout-sensitive, don't need recruiting proof yet.)

**Channels:** coaches ("assign one thing this week") · facilities ("run baseline week / progress reports") · parents ("what should we practice at home?") · travel teams ("development dashboard without exposing kid stats") · softball communities ("softball equal, not an afterthought") · Reddit/FB groups (problem-led education, not hard selling) · radar/tee/net affiliates.

**Strongest paid channel — facility-led "Baseline Night in a Box":** check-in, standardized protocols, player profiles, EV/throwing/speed/9-box tests, auto player cards, recommended home plan, 6–8 week retest. Facility value: more premium than cage rental, repeat visits, parent report, verified data, off-season programming.

### Influencer / creator outreach targets

Youth-baseball coaching creators for seeding, affiliate, and content partnerships. Audience-size figures are from secondary sources (IG/YouTube counts, Feedspot) and are **[VERIFY]** before any outreach deck or contract. Reach matters less than parent/coach relevance and "one cue you can use tonight" content style.

| # | Influencer / brand | Best for | Audience [VERIFY] | Why follow |
|---|---|---|---|---|
| 1 | Coach RAC | Viral youth-energy, make-baseball-fun; drills, practice energy, culture, kid buy-in | 1.5M+ across YT/TikTok/IG; ~953K IG | Best fun-first youth account. |
| 2 | Coach Lisle — Matt Lisle | Hitting + coaching messaging (now mixed with business/family content) | 1M+ (USF bio); 3M (own site) | Huge coach/instructor audience. |
| 3 | Coach Ballgame — James Lowe | 4–12U fun-first coaching, character, engagement, anti-toxic culture | ~308K IG | Teaches ages 4–12; tied to MLB Play Ball. |
| 4 | Ultimate Baseball Training — Coach Justin | Hitting, throwing, fielding, confidence/fundamentals (player-training focus) | ~407K YT | Big YouTube training channel. |
| 5 | CHIPS Performance — Alex Hale | Hitting, catching, pitching, strength/speed; modern training | ~331K IG | Works with youth, HS, and college players. |
| 6 | Antonelli Baseball — Matt Antonelli | Hitting, fielding, team situations, youth/travel commentary | ~285K YT (3.7K videos); ~101K IG | One of the best overall instruction libraries. |
| 7 | YouGoProBaseball — John Madden | Pitching, throwing, infield, hitting; coach self-education | ~66K IG; 300K+ YT | Former SD Padres / NY Mets / Auburn. |
| 8 | D.R. Hitting — Drew Richard | Swing concepts, "box" approach; hitter-development focus | ~267K IG | Popular hitting-specific account. |
| 9 | Coach Murph / iCoachBaseball | Youth coaching + hitting; practical simple cues for parents/coaches | ~203K IG | Self-styled "home for youth baseball coaching." |
| 10 | Youth coaching brand (coach-the-coach) | Youth drills, practice plans, coach-pitch, 8U–12U, team fundamentals | ~195K IG | Best "coach the coach" account on this list. |
| 11 | Coach Ferber — Jason Ferber | Youth hitting, energy, simple cues | ~226K IG | Big youth-baseball account. |
| 12 | Hitting Done Right / Baseball Doctor — Josh Cathcart | Hitting drills, swing fixes | ~193K IG | Feedspot ranks him high among baseball coach influencers. |
| 13 | Coach Lou Colon | Infield work, footwork, hands, transfers | ~152K IG | Strong infield-specific content. |
| 14 | The Hitter's Lab — Lucas Kephart | Youth hitting, dad/parent-friendly instruction | ~139K IG | Bio/content aimed directly at helping dads develop hitters. |
| 15 | Northern Baseball Training — Doug Clark | Youth drills, confidence, simple practice ideas | ~114K IG | Explicitly targets parents/coaches helping kids improve. |
| 16 | Coach Dan Blewett | Pitching mechanics, throwing, workouts | ~113K YT | Large library of pitching drills and training content. |
| 17 | Out Front Hitting — Casey Smith | Hitting progressions, swing work | ~100K IG | Site says he has coached players of all ages for 20+ years. |
| 18 | Tread Athletics — Ben Brewster / team | Pitching development, arm care, velocity education | 750K+ reach | More HS+ than U10, but huge reach across players/coaches/parents. |
| 19 | Coach Roger / Baseball Whisperer | Quick baseball drill clips and instruction | ~45K IG | Smaller but useful quick-clip format. |
| 20 | Xan Barksdale / Catching-101 / Own Home or Go Home | Catcher-specific training | Niche | Team USA coach, former pro catcher, founder of CatcherCON/Catching-101. |

---

## 13. Competitive threat & defense
- **Highest — the club-tied metrics-hub platform:** clearest overlap. Defend by staying parent-owned, cheaper/lighter, home-first, equipment-aware, coach/facility-optional (not club-dependent), truly softball-equal, U10–U14 usability over elite-pipeline language.
- **Medium — the dominant scorekeeping app:** could add development features; huge distribution. Defend by *not depending on its data*, owning the cross-team player record, centering home practice + parent workflow, building trust around safety not stats.
- **Medium — sensor apps (swing/bat sensors, velo radars, launch-monitors):** could add plans. Defend by integrating them **neutrally**, owning the cross-skill record, keeping data useful without hardware.

---

## 14. The real moat
Not the app — the **dataset and workflow.** Longitudinal player-owned data · age-banded progression norms that improve with scale · **drill-to-metric outcome data** ("for 11U players with low contact quality but average bat speed, this 3-week home plan improves hard-contact score X% more often than generic tee work") · safety/workload history · coach/facility verification network · softball-specific benchmarks · the parent/kid UX split · team baseline+retest cadence. The drill-to-outcome data is the killer long-term defensibility — and it's only buildable by being the closed loop first.

---

## 15. What to avoid
Public U10 leaderboard · recruiting-first · scorekeeping-app clone · giant drill library with no guidance · sensor-dependent product · max-effort throwing plans for young kids · fake percentiles before you have data · social features letting strangers contact minors · "AI swing diagnosis" as the first wedge · anything that makes parents *more* anxious.

---

## 16. Validation plan (do this before heavy build)

**30-day interviews:** 10 baseball parents (U9–U14), 10 softball parents, 5 coaches, 3 facility operators, 2 private instructors. Key questions: what do you use now · what do you do after "work on X" · what do you track at home · what gear do you own · would you pay for one weekly plan · for a progress report · would your kid use a mission app · what would make you trust the numbers · what would make you quit · what should the app never show your kid.

**Smoke test:** landing page — *"One Thing This Week: a development plan for your player based on age, position, equipment, schedule, and goals."* CTAs: free weekly mission · $19 progress report · coach beta · team baseline week.

**Paid pilot (2–3 teams):** baseline week → 4 weekly missions → retest → parent report → coach feedback.

| Metric | Target |
|---|---|
| Parents completing onboarding | 70%+ |
| Kids completing 2+ missions | 50%+ |
| Parents opening weekly card | 60%+ |
| Coaches assigning a 2nd mission | 50%+ |
| Families willing to pay $9.99/mo | 20–30% |
| Facilities willing to host a retest night | 2+ |

---

## 17. Verdict
- **Market attractiveness:** High — big, emotionally urgent, already spending, already app-trained.
- **Competition:** High — stat tracking, content, sensors, recruiting, facility tech all crowded.
- **White space:** Real — the closed-loop, family-owned development layer.
- **Best wedge:** between-practice development for U9–U14 baseball + softball.
- **Best MVP promise:** *Know the one thing your player should work on this week — and how to do it at home.*

> Reminder: reverify all **[VERIFY]** figures against primary sources before any external use.
