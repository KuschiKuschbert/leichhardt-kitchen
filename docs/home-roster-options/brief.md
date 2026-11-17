# Home's team board and the roster hours

17 November 2026. The head chef asked: "With the new roster data and today's team should we upgrade the today's team view on home page?" Proposal: [proposal.md](proposal.md). Evidence: [evidence-packet.md](evidence-packet.md) (source `547a1b3`, stand-in, fallback fonts, synthetic roster day at 14:00). Role-based analysis, not research with kitchen staff.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** Fix the hours on Home as a repair of the 15 November contract; do not regroup the board or add now/next/finished status.

| Reviewer | Verdict | In one line |
| --- | --- | --- |
| Cook mid-service | Build smaller | The hours are wrong, a repair; "On now" headings cost lines, push Prep by section down and move rows under a hand. |
| Head chef | Build smaller | The problem is a wrong time on every roster double, not the layout; the board was chosen 7 days ago and Team changed three times since, so no relearning. |
| Skeptic | Build smaller | A regression since the 16 November cut, and `tmHoursWords()` already joins touching parts; "finished" claims presence the saved plan cannot know. |
| New starter | Build smaller | Mo's own card says 10:00 to 15:00 while their break is 15:00 to 15:30: a new cook could leave at 15:00. Now and next only ever as words. |
| Keeper | Build smaller | No new read, listener, rule, field or file; now/next would add a second clock that disagrees with Your day and the welcome. |

**Agreed cuts:** no "On now", "Coming in" or "Finished" groups or words; no one-row-per-person board (that changes the chosen board C, 10 November, where a chef on a double is in both columns); no change to how On with you picks its service.

**Disagreement, one line each:**
- New starter: would show each person once with words ("Mo until 21:00", "Eli starts 17:00"), and the head chef could choose that later.
- Keeper: one shared helper for "a person's day" should also feed `tmNow()` and the welcome (`homeGreet()`), so Home never runs two clocks. The others limit the fix to the hours shown.

**Reference fit:** Flighty: real times from data the phone already holds (Works for the fix). Things 3: now versus later is the useful idea for a later choice, not needed for the fix. Airbnb: the person, their time and place together (the cell already does this; the fix makes the time true).

**Contract fit:** the fix restores the 15 November contract ("Your day: Lunch · 10:00 to 21:30"; everyone sees who comes in when). No colour or surface change. Not evidenced: real Barlow fonts, 768 px, contrast of the hours line.

### Break-it findings (round 1)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- |
| A double changes section: Mo on Larder at Lunch, Grill at Dinner, rostered 10:00 to 21:00 (skeptic) | On with you at 14:00 does not read as Larder until 21:00 | Hypothesis: "Larder · Mo 10:00 to 21:00" reads as Larder all day | Risk / Not evidenced | Say the move in the cell ("Grill from 17:00"); a check in `tests/home-rota.test.js` |
| A service added by hand with no roster hours in it (skeptic, keeper) | Its hours still count in the person's day | Joining only saved hours would show 10:00 to 15:00 again | Checked in source, not run | Fall back to the service's own hours, as Today's team does; a check |
| A split: Gus 08:00 to 15:00 and 17:00 to 21:00 (cook, head chef, keeper) | The gap stays | Joining every part would read 08:00 to 21:00 | Risk | Join only parts that touch (`tmHoursWords()` does); a check |
| Clock edges: Dev rostered to 20:00, Cal to 14:30 (keeper, skeptic) | Times stay true at 14:29, 14:30, 15:00, 17:00, 19:59, 20:00 | `tmNow()` and the welcome use service hours, so Cal reads on shift until 15:00 | Checked in source | Out of scope for the fix (the welcome and service choice are unchanged); listed below |
| The fold and Prep jump on the minute paint | Nothing moves | The fix changes words only, no regrouping | Not evidenced | The existing paint test keeps the fold open |

### Open for the head chef

1. **Build the fix?** The recommendation below.
2. **The head chef on the plan:** in the evidence, Gus (head chef, on Lunch) gets On with you and the full-team fold, not the whole day. The 10 November note says "Head chef, or anyone not on today's plan: On today holds the whole saved day". The code applies the whole day only when the person is not on a shift now. Which is right?
3. **Later, not now:** the welcome and the service picked for On with you follow the service's hours, not the roster's (Cal, rostered to 14:30, reads on shift until 15:00).

## Recommendation

Recommend the fix only, as a repair:
- Each person on the board shows their whole rostered day: back-to-back services joined (Mo "10:00 to 21:00"), a split keeping its gap (Gus "08:00 to 15:00, 17:00 to 21:00"), a service added by hand counting with its own hours.
- A double that moves section later says so in its cell ("Grill from 17:00").
- Your day says the person's whole roster time ("Lunch · 10:00 to 21:00").
- No status words, no regrouping, no new read, listener, rule or field.
- Tests: `tests/home-rota.test.js` at 14:00, 15:00, 17:00, 19:59 and 20:00 with a section change, a split and a service added by hand, failing on the old code first.

Main downside: the full-day fold still shows a double in each column it works (board C as chosen), now with the whole day each time.

## Head chef's answers (17 November 2026)

"Yes build the fix, and always show me the whole day and maybe make some layout/style improvements for that?"

- **The fix:** built on this branch (below).
- **The head chef always sees the whole day:** On today, with no fold, whether or not they are on the plan. A decision for `docs/head-chef-decisions.md`.
- **Layout for the whole day:** a small change on an existing card (no tab, button, pop-up or step), so the council's quick check: three options drawn and measured by the lead, no extra agents. The head chef chooses.

## The fix (built)

- **One day per person:** each person on the board shows their whole roster day (`homePersonDay()`, sharing `tmJoin()` with `tmHoursWords()`). Back-to-back parts are joined, a split keeps its gap, and a service added by hand without roster hours counts with its own hours. A person with no roster hours gets no hours line, as before.
- **A later move of section:** a double that moves section later says so where that later column is not on the same board: "Prep from 15:00" (`homeSecMove()`). The time is never before that service starts.
- **Your day:** the joined part that holds the service on now: "Lunch · 10:00 to 21:00"; on a split, "Lunch · 10:00 to 14:00".
- **The head chef:** always gets On today, the whole day, with no fold and the Today's team link.

Checks: `tests/home-rota.test.js` "roster day" (12 checks; 5 fail on the code before), `tests/team-roster-hours.test.js` (a split reads with its gap in each column; no "from" note where both columns show).

## Round 2 (quick check): the whole day's layout

The whole day is the head chef's On today and the staff's View today's full team. On with you (staff, their own service) keeps board C either way.

- **Preview:** each option is a changed copy of `js/prep.js` and `css/app.css` served to the stand-in (`preview-run.cjs`, `preview/`).
- **Fixture:** synthetic people at 14:00, fallback fonts, Mo moving from Larder to Grill at 17:00.

| Option | Central idea | How the day is read |
| --- | --- | --- |
| **A: one service at a time** (changes least) | The same board, split into one block per service, stacked; each name and their day on one line | Service, then section, then person |
| **B: the day on one clock** (rethinks) | One row per person in start order, their day as a bar on one scale with a mark at the time now (the look of Today's team), their sections and breaks in words | Person and time |
| **C: sections across the day** (least to read) | One block per section, who works it and when, in time order, and a quiet "Nobody 15:00 to 17:00" where a section has a gap | Section, then time |

| Measured (Preview) | Today (hours fixed) | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Head chef's card, 390 px | 898 px | 952 px | 793 px | 583 px |
| Head chef's card, 768 px | 928 px | 952 px | 793 px | 583 px |
| Head chef's card, 1280 px | 614 px | 796 px | 793 px | 426 px |
| Staff fold opened, 390 px | 856 px | 910 px | 751 px | 541 px |
| Entries for 9 people | 15 | 15 | 9 | 11 |
| Taps: head chef / staff fold | 0 / 1 | 0 / 1 | 0 / 1 | 0 / 1 |
| Sideways scroll, errors (390, 768, 1280) | none | none | none | none |

**Pros and cons:**

- **A:**
  - Pro: the board everyone knows, now readable on a phone (no wrapping times).
  - Con: the longest, and a double is listed in every service.
- **B:**
  - Pro: one row per person and the same picture as the planner.
  - Pro: who is in when, and who is on a break at the time mark, is seen at once without status words. The board stays a saved plan.
  - Con: sections are words under each name, not a column to scan.
  - Con: on a busy day the list grows with people, not with services.
- **C:**
  - Pro: the shortest, and it answers "who is on Grill when".
  - Con: a person's day is split across the sections they work.
  - Con: a gap note on a service where a section is not needed (Grill during All day dining) is noise every day.

**Contract fit:** all three keep the sage people card, words for every state, "back 14:30" bold while on a break, no read, listener or saved copy. B reuses the approved timeline bar (`.tm-tlbar`: ink day, orange break block, which is a break, not attention). C's gap note is quiet words, not amber: a gap in a plan is information. Not evidenced: Barlow fonts, contrast of the quiet lines, keyboard order.

**Reference fit:** Linear: B gives one picture for the same thing on Home and in the planner. Flighty: B shows what is on now against real times from the held plan. Things 3: C tucks the person detail away behind the section. Airbnb: A and B keep person, time and place together.

**Break-it:**
- A long name or a split day wraps inside its row in all three (checked: Gus "08:00 to 15:00, 17:00 to 21:00" at 390 px, no sideways scroll).
- The minute paint moves B's time mark only; rows keep their order (start time), so nothing jumps under a thumb.
- A plan without roster hours: B draws each person's services' own hours. Not evidenced in this preview.
- Four or more services: not evidenced.

**Mix:** B's rows with C's gap notes was considered and not recommended: the notes would fire every day for sections that All day dining does not use. A adds nothing to B that B lacks.

**Recommendation: B, the day on one clock.** It shows each person once, with their whole day on the same clock as Today's team, so the head chef reads Home and the planner the same way. Main downside: sections are words under each name, and C is 210 px shorter on a phone. In the build, only "back 14:15" is bold, not the whole line under the name.

### The mix, and D (17 November 2026)

The head chef, after A, B and C: "Any verdict on mix? Would it be easier to also somehow implement just the name for people on on the day and the rosters start time? ... It still doesn't read super easy to me for an at a glance feature."

**Mix verdict:** a blend of A, B and C does not fix the glance, because all three put sections, hours and breaks in one card and the eye sorts them each time. The mix that wins splits the jobs:
- **The glance:** who is in and when they start, one entry per person in time order (from B), as short as possible (from C).
- **The detail:** sections, breaks and finishes, one tap away in Today's team (Things 3: tuck the detail away).
- **From A:** nothing.

**D: who starts when.** Names grouped by roster start time, in time order. A line at the time now ("NOW 14:00") sits between the starts already passed and those still to come. "back 14:15" in bold for anyone on a break now. A split's second start lists them again, marked "split". The Today's team link stays under it. Preview: `preview/d.js`, `preview/d.css`; screenshots `d-gus-390.png`, `d-gus-1280.png`, `option-d.png`.

| Measured (Preview) | Today (hours fixed) | B | C | **D** |
| --- | ---: | ---: | ---: | ---: |
| Head chef's card, 390 px | 898 px | 793 px | 583 px | **354 px** |
| Head chef's card, 1280 px | 614 px | 793 px | 426 px | **354 px** |
| Lines for 9 people | 15 entries | 9 rows | 11 entries | **6 start times** |
| Taps: the whole day / sections and breaks | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 1** (Today's team) |

**Trade-off:** sections, break windows and finish times leave the card. They are one tap away in Today's team. A break now still shows. Not evidenced: a day without roster hours, four or more services, real fonts.

**Lead's recommendation now: D** for the head chef's On today. It is the only option that reads at a glance (6 lines for 9 people). The detail the head chef already set lives in Today's team. Open: whether the staff's View today's full team keeps the board (they look for who is on which section) or takes D too.

**D with the section now** (head chef: "And maybe the section they're rostered on at the current time?"):
- **Each name** has a quiet second line: the section they are rostered on now; before their day, the one they start on; after it, the last one. A chef with no section reads as their role ("Head chef").
- **A part of the day already over** goes grey and says "until 15:00", from the roster, not a claim about who is still there.
- **The "NOW" line** sits before the first start still to come: at the top before anyone starts, at the end once everyone has.
- **Height:** 467 px at 14:00 on a phone, 482 at 07:00, 435 at 17:30 (Preview). Screenshots `d-gus-390.png`, `d-through-the-day.png`, `option-d.png`.

## Round 2 scores (17 November 2026)

Six fresh reviewers (the five plus the kitchen screen designer), each given only `round2-packet.md`, `evidence-packet.md` and the screenshots, no favourite. All six said the four options differ structurally (A by service, B by person on a clock, C by section, D by start time; the designer called A mostly a restack of today's board).

| Reviewer | Ranking | Open question 1 | Open question 2 (staff fold) |
| --- | --- | --- | --- |
| Cook mid-service | D, C, B, A | D, with "Grill from 17:00" under a cook who moves later | Keep the section board |
| Head chef | D, C, B, A | D on the head chef's card, plus a "No start time" group | Keep the section board |
| Skeptic | D, C, B, A | D on the head chef's card only | Keep the board (staff cannot open Today's team) |
| New starter | D, C, B, A | D with clearer words | Keep the board |
| Keeper | D, C, B, A | D, with three repairs | Keep the board; switch D on by role, not by the row count |
| Screen designer | D, C, B, A | D | Keep the board (only chefs can open Today's team) |

**Verdict: D, 6 of 6. Staff's View today's full team keeps the section board, 6 of 6.**

**Disagreement, one line each:**
- Head chef only (head chef, skeptic, new starter) or every chef (keeper, designer: `teamOK()`).
- The cook wants "Grill from 17:00" under a cook who moves later now. The head chef reviewer would wait for a real day of doubles.
- Words: the new starter would say "finished 15:00". Round 1's skeptic warned against status words that claim presence, so "until 15:00" stays.

**D against the seven references (all six):**
- **Flighty, Things 3, Linear:** Work. Now against later, detail tucked away, one place for one job.
- **Headspace:** Works for four reviewers, Needs work for two: "split" already means a break of 150 minutes or more in the book.
- **Airbnb:** Needs work: finish times leave the card. This is the trade the head chef asked for.
- **Todoist, Duolingo:** Not relevant. Nothing is added or ticked on this card.

**Rejected from the others:**
- A's stacked services repeat people.
- B's bar on Home: it belongs in the planner; on a wet phone the 6 px bar and 11 px labels fail.
- C's "Nobody 15:00 to 17:00": noise every day, and Today's team already warns when too few are on.

**Mix:** no layout blend beats D (a second way of grouping fights for the eye). The blend that wins is D plus repairs.

### Break-it findings (round 2) and repairs for the build

| Finding | Evidence | Repair |
| --- | --- | --- |
| A person on a service with no hours, and no roster hours, vanishes from D; a plan where nobody has hours shows only the NOW line | Checked in source (skeptic, keeper, head chef) | A "No start time" group at the end; with no times at all, the section board |
| A split's finished first part takes the section of the time now ("Grill, until 14:00" for a Pans morning); a dinner break's "back 19:30" shows under the grey first part; plans saved on 15 November hold the whole day on each service, so Mo would read Larder at 18:00 | Checked in source (skeptic, keeper) | Each entry takes the section and break of its own part, each part cut to its service's hours |
| D picked by "the card holds the whole day", so staff not on the plan get D with no Today's team link | Checked in source (skeptic, keeper) | Choose D by role; staff keep the board; a check in the role tests |
| "NOW 14:00" changes the card's text every minute, so the minute paint rebuilds it and keyboard focus is lost | Risk (keeper) | The line says "Now" without the time (Your day shows the clock); the card changes only when a start passes or a break starts or ends |
| At 14:00 Mo reads Larder, so dinner Grill looks a cook short | Seen in `d-gus-390.png` (cook) | "Larder, Grill from 17:00" under a cook who moves later |
| "split" means a long break elsewhere in the book | Words (skeptic, designer, new starter) | "again" for a second start |

Before release, measure the implemented app with Barlow at 390, 768 and 1280 px:
- the head chef on and off the plan, staff on and off the plan, and a sous chef;
- four services, 15 people, long names, a shift with no hours;
- the minute paint at a start and at a break's start and end.

### D with the round 2 repairs (preview)

`preview/d.js` and `preview/common.js` now carry the repairs above. Measured with a split cook added to the fixture (Jo: Pans 10:00 to 14:00, then Larder 17:00 to 21:00 with a dinner break at 19:00):
- **Height (Preview):** the head chef's card is 513 px at 14:00 on a phone, 482 px at 07:00, 498 px at 19:10 and 467 px at 1280.
- **The staff fold** keeps the section board (913 px).
- **Words:** Mo reads "Larder, then Grill from 17:00" until dinner and "Grill" from then on. Jo's morning part goes grey at 14:00 ("Pans, until 14:00"). At 19:10 "Jo again, Larder, back 19:30" sits under 17:00.
- **Gus** starts at 08:00, before Lunch: parts are cut to the service's start only where they overlap (plans saved on 15 November).

Screenshots `d-repaired.png` (07:00, 14:00, 19:10) and `d-repaired-1280.png`.

## Chosen (17 November 2026)

The owner asked "We build it for everyone don't we?", then, shown the council's split (D for chefs, the board for staff, 6 of 6) and the trade-off, "What would be the best for everyone?". The lead recommended **D for everyone, with each person's finish time on their quiet line**, and the build follows it:

- **Why everyone:** the board the head chef found hard to read at a glance is as hard for staff, and one picture of the day is one thing to learn.
- **The council's main reason** for keeping the board for staff was that finish times and break windows would be out of reach (staff cannot open Today's team). With "until 21:00" on every name, finish times stay on Home. Only other services' break windows leave the whole day; staff keep their own On with you board with breaks for their service, and their own Your day.
- **Departure from the council:** the staff fold (6 of 6 said keep the board). Recorded here and in `docs/head-chef-decisions.md`.

## Built (17 November 2026)

- `js/prep.js`:
  - `homeStartsHTML()`, `homeStartParts()` and `homeStartSec()`, with the round 2 repairs: no one vanishes ("No start time"; the board with no start times at all), a split's own section and break, parts cut only where they overlap, "Now" with no time, "again".
  - The whole day uses it in `homeWithHTML()` (not scoped) and `homeTeamHTML()` (the fold).
- `css/app.css`: the `.hm-starts` block.

Measured in the implemented app (stand-in, fallback fonts, the 9-person roster day plus Jo's split, 14:00): the head chef's card 627 px at 390, 643 at 768, 543 at 1280; the staff fold 585 px at 390. No sideways scroll, no browser errors.

Checks:
- `tests/home-rota.test.js` (54): the whole day by start time at 390, 768 and 1280, the staff fold, and four and three services.
- `tests/team-roster-hours.test.js` (20): a split listed at each start, a plan saved on 15 November, broken stored times.
- `tests/home-board.test.js`, `tests/home-staff-first.test.js`, `tests/home-staff-roster.test.js`: rewritten to the new whole day, each keeping its intent.
