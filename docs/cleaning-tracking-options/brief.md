# Cleaning tracking and spreading the days: council brief

26 November 2026. Source commit `91c5bc4b`. The head chef asked for "smart tracking" of cleaning with the results in the admin panel, and for a button that spreads repeat jobs across the week so not every section's jobs fall on the same day, for any rhythm. Two proposals: [proposal.md](proposal.md). Packet: [round1-packet.md](round1-packet.md). Nothing is built and no design is chosen.

This is role-based analysis by five fresh reviewers reading the source and the notes, each given the skill's text word for word, the proposal and the baseline pictures, with no leads from the lead. It is not research with real staff. Three of them ran the nightly count's own code on synthetic days; nobody ran the app. No measurement was taken, so every tap and density claim is Not evidenced. Each reviewer answered each proposal in under 200 words.

## Round 1, proposal 1: cleaning tracking in the admin panel

**Verdict: Build smaller, five of five.**

What they cut:

- The "smart" sentences ("missed 3 Mondays running", "the lowest finish rate") and any ranking (all five). The counts hold job names only, capped at 8 a day, so a streak can be false; and Records keeps its numbers as recorded, not judged.
- People (new starter, cook, head chef). Nobody asked for names.
- Sous chefs, for now (keeper, head chef): only the admin can read the nightly counts.

What they asked for instead, and where they split:

| Reviewer | The smaller thing |
| --- | --- |
| Skeptic | One plain block: done out of due by week, whole numbers, with uncounted days shown as "Count not ready" |
| Keeper | Done out of due by week and by weekday, plus the Unable notes, admin only. Hold "most missed" until the nightly count keeps each job's id. Change the count now, while the recount is days, not 90 |
| Cook | Count out of the jobs that can be done, put the unable-to-complete notes first, no pattern sentences until the midnight question is answered |
| New starter | One list in Records: weekly and monthly jobs only, every name kept, with dates ("Clean the drawers: missed 9, 16, 23 November"), and the words "Missed means not ticked by midnight". The nightly count must change first |
| Head chef | After about four weeks of live counts. Keep id and section, uncapped, for missed jobs that are not nightly, and report only those, inside Records |

**Disagreement.** Totals now from what is already kept (skeptic, keeper) against a list of missed weekly and monthly jobs with dates, which needs the nightly count changed first (new starter, head chef; the cook's "jobs that can be done" also needs it). The head chef reviewer would wait four weeks; the keeper would change the count now because the recount is cheap while there are few days.

## Round 1, proposal 2: the spread button

**Verdict: Build smaller, four of five. The skeptic: Don't build.**

What all five cut: rebalancing jobs that already have a day. A moved job skips a week or comes twice (11 days between cleans, or two in one week), a cook's "Every Monday" changes under them, and many moves are many writes.

Also cut: proposed first dates for monthly jobs (keeper: a repeat's start date is weightier than a weekday; skeptic: undefined); the OZ tank (new starter, cook, head chef: it is the Sunday Pack down step); the "Jobs waiting for a day" list as drawn (keeper, skeptic, head chef: nowhere to save it).

Where they split:

| Reviewer | The smaller thing |
| --- | --- |
| Skeptic (Don't build) | No button. On Add or Edit, each day chip shows how many weekly jobs that section already has that day ("Mon 3"). The chef spreads them himself; nothing is guessed |
| Head chef | The same: no button, counts on the chips. Cheapest of all: send him days to confirm |
| Keeper | A first cut for the unloaded no-day lines only, kept in the built-in list and proposed in the Load panel as day chips he can change, saved as new jobs |
| New starter | Only the weekly lines, on one screen, each row "Proposed, not saved. First due Tuesday 1 December", then "Saved" |
| Cook | Suggest days for new jobs only, with keep-clear days set first, all three lists counted, first due tomorrow or later |

**Disagreement.** Two reviewers want no button, only counts on the day chips. Three want a button that proposes days for new jobs only. Nobody supports it for jobs that already have a day, or for every rhythm.

**For the head chef.** He asked for the button for every repeat job, "not just limited" to some. The council's advice is narrower than his request on three points: no rebalancing of jobs with a day, no proposed monthly start dates, and only lines that are ready (two of six today). These are his to decide.

## Break-it findings (round 1)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| A perfect day is read as a rate (P1) | 100% | 46 to 49 of 50 to 53: record-every-time jobs are due and never done | Checked in three reviewers' node runs of `cleanDay()` on synthetic days; not rerun by the lead | Count out of jobs that can be done | Must be designed in |
| A bad night, 9 or more missed (P1) | The weekly job is named | Only 8 names are kept, and the weekly job was the one dropped | Checked in a reviewer's node run (id order; live order Not evidenced) | Keep every missed job that is not nightly, by id | Needs the nightly count changed |
| A job is reworded, or two jobs share a name (P1) | One job, one tally | Hypothesis: the history splits, or two jobs merge | Risk / Not evidenced; name-only storage is a source read | A `cleanDay()` fixture with a rename and a duplicate; key by id | Needs the nightly count changed |
| A week with a day not counted, or before Cleaning was on (P1) | The gap is shown | Hypothesis: read as zero due, lifting the rate; jobs loaded before switch-on read as missed | Risk / Not evidenced | Fixture weeks with no count; say which days are not counted | Check before ready |
| A close finished after midnight (P1) | Counted as done | A tick is refused once the date changes, so the job reads Missed | Risk (recorded in the sections brief; closing time unknown) | Say "Missed means not ticked by midnight" | Open with the head chef |
| A sous chef opens tracking (P1) | The page | The rules let only the admin read the counts | Source read (`firestore.rules`) | Admin only, or a rule change with an emulator test | Head chef's call |
| A proposal is on screen and unconfirmed (P2) | Proposed days are never taken for saved days | Hypothesis: after a lock, a reload or a second chef's edit, proposed chips look saved, or one confirm overwrites another | Risk / Not evidenced | "Proposed, not saved" in words on each row | Must be designed in |
| Rebalancing mid-week (P2) | The week keeps its rhythm | 11 days between cleans, or two in one week, across sections at once | Checked by the lead with the book's own `due()` for one job | Never move a job that has a day | Cut by all five |
| The button is pressed again after one job is added (P2) | Confirmed days stay put | Hypothesis: a different set of jobs gives different days | Risk / Not evidenced | Only jobs with no day are proposed | Carried into the smaller version |
| A new job confirmed on a busy night (P2) | First due on a later day | New jobs start today, so it is due tonight | Source read | First due tomorrow or later | Must be designed in |
| An even spread (P2) | Quiet nights stay quiet | With all lists: Sunday 7, Monday to Thursday 4, Friday 1, Saturday 0, so it fills Friday and Saturday | A reviewer's source count | Keep-clear days chosen first | Open with the head chef |

## Contract fit (round 1)

- **Fits:** both are on admin and chef setup screens, so no service page gains a tab, button or pop-up. The base tracking adds no read for the admin.
- **Proposed changes to an approved rule, for the head chef to choose, not violations:** the book proposing a day against "never guess one" (he asked for it; every reviewer said nothing may save unconfirmed); a tracking page that judges ("lowest finish rate") against Records' numbers kept as recorded.
- **Needs work:** a sous chef audience (rules); a rate that cannot reach 100%; one state with two names ("Unable to complete" on Cleaning, "Not possible" in Records).
- **Not evidenced:** everything on screen. Density, taps, "Count not ready", an empty or failed read, proposed against confirmed without colour.

## Reference fit (round 1)

Flighty: real status from data the page already holds, and never stale status shown as fact (skeptic, keeper, cook). Todoist: a known default that is visible and can be changed, nothing guessed from unclear text (all five, for the day chips). Headspace: one name for each thing (new starter). Duolingo's streaks were rejected for cleaning (cook); its "progress shows real completed work" is what the rate fails today (head chef). Linear, Things 3 and Airbnb were not used.

## Open with the head chef

1. Is Cleaning switched on for the team, with the lists loaded? Tracking counts nothing until then.
2. Tracking with no people's names, and for the admin only at first: is that right?
3. Which nights stay clear of weekly jobs? Today Friday has one and Saturday none.
4. The button: counts on the day chips with no button, or a button that proposes days for new jobs only? And does he still want it to move jobs that already have a day, against all five reviewers?
5. Should a missed weekly or monthly job stay due until it is done? (Carried from the sections brief.)

## The head chef's decisions after round 1 (26 November 2026)

He read round 1 and set the scope himself. In his words, spelling tidied:

- "Cleaning schedule is not on, so we can start counting as soon as we have the cleaning on."
- "I'd like to track instead who did, and who missed but in a fair way."
- "No Friday or Saturday nights stay out of clear jobs, just don't get a heavy cleaning job, maybe let the chef creating the tasks set a ranking system for jobs from light time cost to heavy time cost in 3 steps and only allow light ones on Friday and Saturday and only like 10% of the whole week's tasks compared to Sunday to Wednesday tasks."
- "I still want to be able to move other jobs that already have a day."
- "And maybe even group similar tasks across sections to be on the same day."

Three of these go past round 1's advice (people, moving dated jobs, Friday and Saturday open to light jobs). The weight in three steps and the same-kind day were not in round 1: they went straight to designs at his word.

Then, while round 2 was being scored: "just make the section jobs a section problem, not the person's problem, but track in the background that if a person was on grill for example the night before to flag if not all tasks for that section have been done in the section." So no page by person; a missed job is its section's, with who was on kept in the background, and a flag the next morning.

## Round 2: designs

Packet: [round2-packet.md](round2-packet.md). Designs side by side: [index.html](index.html). Six fresh reviewers, each given the skill's text word for word and no leads, ranked two sets of three. All measurements are **Preview**: schematic static pages with the book's stylesheet, no app shell, nothing tapped, saved or timed.

Pinned before drawing:

- On the rules emulator, 2 and 5 moves in one save were allowed and 10 and 20 refused, for the chef rows `owner`, `ownkit`, `kit` and `sam` of `tests/rules/client-shapes.test.mjs`. The test jobs carried no `plan`; a loaded section job carries one, and 6 to 9 moves were not tried. So "5 at a time" is a safe guess, not a measured limit: test it with real jobs before any build.
- A change to a job starts exactly tomorrow by the rules; a new job starts today.
- A job's fields are fixed in the rules, so a weight or a kind on the job needs a rules change and makes a revision; the other home is one small record read when the planner opens.
- The planner behind the previews is one pure function, `previews/planner.js`, with 25 node checks, run on the book's own lists with example kinds and weights made up by the lead.

### Planning the days

- **P-A, in the job.** Today's form with a weight, a kind and day chips that say what the section has each day; a suggested day with its reason.
- **P-B, the week as a board.** Every job that comes round under its day; proposals dashed; one Save.
- **P-C, a list of changes.** One tap proposes; each line gives old day, new day, reason and the wait; Confirm.

| | P-A | P-B | P-C |
| --- | --- | --- | --- |
| Unit | One job | The week | The change |
| Whole week visible | No | Yes | No |
| What a move does to this week | Not shown | Not shown | On each line |
| Moving 10 jobs | 10 forms | One Save | One Confirm |
| Page length at 390 px (Preview) | 1.0 screens | 2.7 | 3.3 |
| Build size | 1 pull request | 2 to 3 | 2 to 3 |
| New reads or rules | A rules change if weight and kind sit on the job | The same, or 1 read for a side record | The same |
| Risk | Low | False totals, a second way to edit a job | A long list saved blind |

| Reviewer | Ranking | Recommended |
| --- | --- | --- |
| Cook | P-C, P-A, P-B | P-C's list, P-A's fields, P-B as a before-and-after strip |
| Head chef | P-B, P-A, P-C | A blend on P-B's page, run before Cleaning is switched on |
| Skeptic | P-A, P-C, P-B | P-A with P-C's wait line; bulk moves held until real weights and kinds exist |
| New starter | P-C, P-A, P-B | P-C with P-A's fields and "Proposed, not saved" on each line |
| Keeper | P-C, P-A, P-B | P-C with P-A's fields and B's limit as one line |
| Screen designer | P-C, P-A, P-B | A day strip of counts, P-C's lines below, a line opens P-A's chips |

P-C first: 4 of 6 (cook, new starter, keeper, screen designer). P-B last: 5 of 6 (all but the head chef, who put it first). Structurally different: yes for five; the head chef said P-B and P-C are one planner and one save, read by week or by change.

### Tracking

- **T-A, by job.** The missed jobs that come round, with dates and who was on.
- **T-B, by section.** Sections against weeks, done out of due; a week opens.
- **T-C, by person.** A row per person: days on, jobs ticked, and what was missed on their days.

| Reviewer | Ranking | Recommended |
| --- | --- | --- |
| Cook | T-A, T-B, T-C | T-A, each job opening to who did, missed by shift, or Unable |
| Head chef | T-A, T-C, T-B | T-A's jobs opening to every date, T-B's done by and time; the nightly count first, the page after four weeks |
| Skeptic | T-A, T-B, T-C | T-A with done jobs named beside each person |
| New starter | T-C, T-A, T-B | T-C blended, the big number removed |
| Keeper | T-A, T-B, T-C | T-A with who did each job that came round |
| Screen designer | T-A, T-C, T-B | T-A as one list with a Done fold naming who and when |

T-A first: 5 of 6 (all but the new starter). Every reviewer rejected T-C's tick total as a score. Structurally different: yes for four; the skeptic said partly (one set of counting rules, grouped three ways) and the head chef said T-A and T-B are the same data turned round. The head chef then ruled out a page by person, which removes the new starter's first choice.

### The mix (A + B + C), for each set

| Part | Who took or rejected it | Principle | Why |
| --- | --- | --- | --- |
| P-C: old day, new day, reason, wait | Take: all six took the line or its wait | Flighty, Airbnb | The only place a move's cost is shown |
| P-C: the rules box on top | Reject: skeptic, cook, head chef, screen designer. The keeper named it as a weakness; the new starter did not mention it | Things 3 | It filled the first screen; folded at the bottom |
| P-C: a tick meaning "move this" | Reject: new starter (the tick), screen designer (the word "Change"). The cook and the head chef took the untick; the keeper took it only with a re-check | Headspace | A tick means done in Cleaning; the mix uses a button with words |
| P-A: weight and kind in the job's form | Take: cook, head chef, new starter, keeper. The skeptic and the screen designer named it as P-A's strength. The head chef, new starter and screen designer rejected the label "Kind" beside today's "Area or equipment" | Todoist | The one place they are set |
| P-A: day chips with what the section has | Take: skeptic, cook, screen designer. The head chef and the new starter warned that a suggested day drawn pressed looks chosen | Todoist | A known default, visible and editable |
| P-A: as the mover | Reject: keeper. All six named "ten forms for ten moves" as its weakness; the skeptic still recommended it | | Ten forms for ten moves |
| P-B: each day's count, before and after | Take: skeptic, cook, head chef, screen designer. The keeper took only the Friday and Saturday line, the new starter only the "proposed" tag | Flighty, Linear | It shows the week bunching or evening out |
| P-B: the board | Reject: skeptic, keeper, cook, new starter, screen designer. The head chef put P-B first and would keep its page | Linear | A second way to edit a job; false totals in the preview |
| P-B: one Save for everything | Reject: head chef only. The mix still has one Save, in steps of 5: a disagreement, not settled | | He gave no reason |
| T-A: the job with its dates and who was on | Take: all six | Airbnb | Job, date, section and names together |
| T-B: "done by, with the time" on an opened row | Take: cook, head chef, new starter, keeper, screen designer; the skeptic in his recommendation | Flighty | It shows the work that was done, not only the misses |
| T-B: the table | Reject: all six | Linear | Words break at 390 px; no hand-built long tables |
| T-C: the tick total | Reject: all six | Duolingo | A score, whatever the words say |
| T-C: "Not enough days yet" | Take: all six | | Not needed once nobody has a total |

Keeping all three pages whole was rejected for planning by the skeptic, the keeper and the cook, and for tracking by five (the new starter wanted a blend built on T-C's rows). The reviewers did not ask for one planning blend. Cook, new starter, keeper and screen designer wanted P-C's list with P-A's fields. Of those, the cook (per section) and the screen designer asked for P-B's week as a strip of counts, the keeper for one limit line, the new starter for the "Proposed" tag. The head chef wanted the blend on P-B's page. The skeptic wanted P-A with P-C's wait line. P-mix and T-mix are the lead's part-blends of these.

### The two mixes (lead's synthesis, with a focused follow-up)

Packet: [round2-followup.md](round2-followup.md). Previews: `previews/p-mix-390-full.png`, `previews/t-mix-390-full.png`.

**P-mix, Plan the days.** One page in Repeat tasks, drawn twice: with same-kind days off (how the page opens, at the skeptic's word; which side opens is the head chef's call) and on. A switch that says how many jobs each choice moves; a strip of the seven days with weekly jobs under the plan and now; each section's heaviest night, now and with the plan; lines for new days, moves and monthly first dates, each "Proposed, not saved" with a button in words; a new job whose day is today marked "due tonight" and left out until the chef puts it in; every move with its wait; a note that a job every few days is not planned; one Save, 5 at a time, with "0 of 5 saved". Weight and kind are set in the job's form. Preview, 390 px: 3.0 screens with the switch off (5 changes), 5.3 with it on (14 changes, all ten moves drawn).

**T-mix, Cleaning by section.** No person has a total. A flag in the admin Inbox the next morning, worded "Hot larder: 1 job not ticked by midnight", with the job, its date, and who was on at close one tap behind it; it says it covers weekly and monthly jobs, not nightly Pack down. Two example mornings when it cannot know: "Count not ready" and "nobody was on the plan". A row per section for the last 4 weeks, opening to each missed job with its dates and who was on, and each done job with who did it and when; Unable to complete apart and outside the totals; Shared kitchen counted with no names; the four things to settle before the flag is switched on, printed on the page. Preview, 390 px: 2.4 screens with the counting rules open.

Follow-up (the same three reviewers, continued with their context):

| Reviewer | P-mix | T-mix |
| --- | --- | --- |
| Skeptic | Build the mix, changed: Off as the default, no dated job moved onto Friday or Saturday, every wait visible | Build the mix: Reports rows first, the Inbox flag only after the midnight cut-off and "which wins, plan or pick" are settled |
| Keeper | Build the mix, with the switch stored, per-line save states and a re-plan when the day changes | Build the mix, but hold the Inbox flag until the midnight question is answered, or word it "not ticked by midnight" |
| Cook | Change the mix, then build: a new job whose day is today says "Due tonight" and stays out unless the chef puts it in; each section's heaviest night, now and after; fix the untrue lines | Change the mix, then build: names one tap behind the flag, as he said "in the background"; say which jobs count; settle midnight and Unable for typed jobs before switching on |

Faults the follow-up found in the planner, fixed in `planner.js` with a node check each: with same-kind days off a dated job (Clean the drawers) still moved, onto Saturday; now every dated job keeps its day when the switch is off, a dated job is never moved onto Friday or Saturday, and a quiet day is allowed for a light job but never preferred. The rule check now names a job already on Friday that is not marked light. With the switch on the plan still moves 10 of 15 dated jobs and the week goes from 7,4,4,4,4,1,0 to 5,7,2,7,4,1,0 (Sunday to Saturday). With it off, no dated job moves and the week is 7,5,5,4,4,1,0.

Redrawn by the lead after the follow-up, and seen by no reviewer since: each section's heaviest night, now and with the plan; the strip with one number per day, so nothing spills at 390 px; "suggested" readable on the pressed chip; all ten moves with their waits; "due tonight" for a new job proposed for today, left out by default; the names one tap behind the flag; "not ticked by midnight" in place of "left 1 job"; which jobs the flag covers; "Count not ready"; the Grill row's counts matching its lines. Still not drawn: a line once it is Saved, Not sent or Refused; the page after a lock; what a cook's Cleaning row says in the week a job moved; the label for kind beside today's "Area or equipment".

What the redraw shows on the lead's example weights (`previews/plan.json`): with same-kind days on, no section's heaviest night gets lighter. Hot larder keeps 5 (Sunday becomes Thursday), Fryers goes from 3 to 4, Grill stays 2 and Pans 3. With them off, no heaviest night changes. Friday and Saturday hold 1 job now, already there and not marked light; the plan adds none either way, against a limit of 2 (a tenth of 29: 26 weekly, 3 monthly).

### Break-it findings (round 2 and the follow-up)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| Same-kind days on the book's own list | A more even week | Less even: Monday and Wednesday 7, Tuesday 2 | The skeptic and the head chef ran `planner.js`, the cook summed `plan.json`, the lead reran it. The kinds and weights are the lead's examples | A visible switch with both results | In P-mix |
| One line left out of a proposal | The rules still hold | Hot larder Wednesday at weight 7, over 5, with nothing said | Checked in `planner.js` by the skeptic and the keeper | `check()` runs on every change and names the rule | Fixed in the engine; the page state is Not evidenced |
| The switch flipped after a save | The days go back | Before the planner fix: 3 (skeptic) or 4 (keeper) more jobs moved. Rerun by the lead on the fixed planner: Off after a saved On moves no job and puts none back; On after a saved Off moves 10 | Checked in `planner.js` | Store the choice; say "this does not put days back"; Save names how many saved jobs move again | Words in P-mix; storing it is to design |
| 15 changes saved in steps of 5 across midnight, or with the signal lost | One start day, and the page says where it stopped | Hypothesis: steps land on two days, or are refused; the waits printed are stale | Risk / Not evidenced | A rules-emulator test either side of midnight; a client test with a refused second step; re-plan when the day changes | Before ready |
| A new job whose proposed day is today | The chef knows it is due tonight | A new job starts today, and Cleaning has no listener, so an open page stays quiet until Refresh | Source read | "Due tonight on Pans", left out unless the chef puts it in | Drawn in P-mix with the switch on; `tonight()` and 3 node checks, one proving the page the chef first sees breaks no rule. The quiet open page on a cook's phone is still open |
| A cook's "Every Tuesday" becomes Wednesday | The cook is told | Nothing tells the cook | Risk / Not evidenced | Open: what the staff row says in the week a job moved | Open |
| A job already on Friday with no weight | Counted against "light only" or flagged | Shown under "light jobs only" as if it passed | Checked in `planner.js` | `check()` names it for the chef | Fixed in the engine |
| A close finished after midnight | The job counts as done | A tick is refused once the date turns, so the flag names the section and its closers | Risk / Not evidenced (closing time unknown) | Ask the head chef; a fixture with a tick dated the next day; one cut-off for "missed" and "on at close" | Open with the head chef; holds the Inbox flag |
| The plan says Grill, the cook's own pick says Pans; or a cook sent home early | One stated rule | Hypothesis: named either way; the plan keeps no move times | Risk / Not evidenced (source read) | Decide which wins and print it; a fixture where they differ | Before the flag |
| The 03:00 count did not run, or nobody set a plan | "Count not ready", "nobody on the plan" | Hypothesis: an old night shown as last night, or a false all clear | Risk / Not evidenced | Fixtures with a missing and a stale row; the flag carries its date | Both states drawn in T-mix as examples; the fixtures are before ready |
| A typed job that could not be done | Marked Unable with a reason | A typed job has no Unable: it is tick or flag | Source read | Give typed jobs Unable, or say so | Before the flag |
| A job is moved or renamed | One history | Tracking by document id or by name splits it | Risk / Not evidenced | Key by the job's root id; a `cleanDay()` fixture across a move | Needs the nightly count changed |
| A past day's plan is corrected later | The record follows | A day is counted once at 03:00 and carried | Source read | Decide whether a counted day can be counted again | Open |
| "Not all tasks for that section" | The flag he meant | The mix flags weekly and monthly jobs only; with nightly Pack down the Inbox would flag most mornings | Not evidenced | Ask him | Open with the head chef |

### Contract fit (round 2)

| Check | P-mix | T-mix |
| --- | --- | --- |
| Service rules | Works: chef setup, no service page gains a control | Works: admin pages only |
| "Never guess a day" | Proposed change, asked for by the head chef; nothing saves unconfirmed | Not relevant |
| Records "as kept, never judged" | Not relevant | Proposed change: "left 1 job" judges. His call; the head chef reviewer would keep it out of Records and in Reports |
| State words without colour | Works for Proposed; Not sent, Saved and Refused per line are Not evidenced | Missed in words works; Unable has two names in the book today (Needs work) |
| Surface and look | Not evidenced: schematic pages, no steel header or Chef's Desk frame | The same |
| Contrast | Sampled by the screen designer on the six previews: lowest text 5.05:1. Focus, Extra large text: Not evidenced | The same |
| Who can read it | Chefs, as Repeat tasks today | Admin only as the rules stand; sous chefs need a rules change |

Before ready, on the implemented app at 390, 768 and 1280 px: every save state, a refused and a held step, a lock with a proposal on screen, the day changing under a proposal, the staff Cleaning page after a saved plan, "Count not ready", an empty and a failed read, and the rules emulator proving staff and sous chefs cannot read the names.

### Reference fit (round 2)

| Principle | P-mix | T-mix |
| --- | --- | --- |
| Flighty: real dates, honest status | Works: each move's wait and each monthly date are printed | Works in the preview: the flag carries its date and "Count not ready" is drawn; Not evidenced on the app |
| Todoist: a known default, visible and editable | Works: suggested day on the chips | Not relevant |
| Airbnb: time, place, state together | Works on a line | Works on a row: job, date, section, who was on |
| Things 3: occasional detail tucked away | Works: the rules are folded | Works: the names sit one tap behind the flag. The counting rules are drawn open here so they can be read |
| Headspace: one name per thing | Needs work: "Kind of job" beside today's "Area or equipment" | Needs work: Unable to complete against Records' "Not possible" |
| Duolingo: progress shows real work, no points | Not relevant | Works: no totals per person |
| Linear: one frame, no second way to edit | Works: the strip never edits | Works: rows, no table |

## Recommendation

**Recommend both mixes, built in this order, with the morning flag held until the head chef answers the midnight question.**

1. **The nightly count, now.** Keep each missed and done job that comes round by its root id, with its section and who did it, leave Unable out of the totals, record the first night Cleaning is on, and bump `CLEAN_V`. It is cheapest before Cleaning is switched on, and nothing can be shown until it has run.
2. **Weight and kind in the job's form, then Plan the days (P-mix)** with same-kind days as a switch, each section's heaviest night shown, and a job due tonight said plainly. It carries weights, Friday and Saturday light only, moving dated jobs and same-kind days, for weekly and monthly jobs. A job that comes every few days gets only a start day, not a weekday: he asked for any rhythm, and that is as far as that rhythm can go (see Not hidden by the ranking). It and shows what each choice does to the week before anything is saved.
3. **Cleaning by section in Reports (T-mix), then the Inbox flag** with names one tap behind it.

Why these beat the originals: P-C alone hid the week and could break its own rules on one untick; P-B alone hid what a move costs; T-A alone showed only blame. The mixes keep each design's strongest part and drop the parts most reviewers rejected, each named in the mix table above. In the follow-up all three reviewers said build the mix, each with changes; none preferred an original design.

Main downside: Plan the days has the most states of any option to build and test, for a page used at setup and now and then; and tracking shows nothing until the count has run for a few weeks.

Not hidden by the ranking:

- His two wishes pull against each other on his list as the lead tagged it: the kinds and weights are made-up examples, and his own may change the result. With them, same-kind days cost 10 moves and a less even week. The switch makes that his choice each time; which way it starts is his to say.
- A job that comes every few days cannot be given a day. It falls on a different weekday each time, so it reaches Friday and Saturday whatever its weight and the light-only rule cannot hold for it. The planner only starts two such jobs of one section on different days (1 node check). The lists hold one such job today (Change grill drip trays, every 2 days, a Pack down step, never moved).
- He named Sunday to Wednesday for heavier work. The planner also uses Thursday.
- A moved job has one uneven week, up to 13 days between cleans in the example (saved on a Wednesday; another save day gives other waits).
- A missed weekly job is not due again until its next day, so a flag reports a miss and does not get it cleaned.
- The skeptic would hold bulk moves until real weights and kinds exist, and the head chef reviewer would build the tracking page only after four weeks of counts. Step 1 does not conflict with either.
- The mixes are a lead synthesis. Three reviewers (skeptic, keeper, cook) checked the first drawing and asked for changes. The lead redrew both; no reviewer has seen the redraw, and the head chef, new starter and screen designer have seen neither.

## Open with the head chef

1. Does a close ever finish after midnight? It decides whether the morning flag can be trusted.
2. "Not all tasks for that section": weekly and monthly jobs only, or nightly Pack down too?
3. Same-kind days: on or off to start with?
4. Is Thursday a day for heavy jobs?
5. When the plan and a cook's own pick differ, which is "on that section"?
6. The flag and the rows for the admin only, or for sous chefs too (a rules change)?

## Chosen

Not chosen yet. The head chef decides.
