# Cleaning: results by section and planning the days. Council brief

26 November 2026. Facts and pictures from `main` at `0acdaf72`. The head chef asked for the council to start again from scratch, with the screen designer in both rounds. This brief is that second council. The first council's record is [first-council.md](first-council.md); its recommendation is not current.

Role-based analysis, not research with real staff. Nothing in the book has changed.

- Proposal, with the head chef's words, what he decided, the lead's readings and the open questions: [proposal.md](proposal.md).
- Round 1 packet: [round1-packet.md](round1-packet.md). Today's pages: `baseline/`.

## Round 1: should we build it?

Six fresh reviewers, each given the skill's text word for word, the proposal and the pictures, and no opinion from the lead. The screen designer sat in round 1 at the head chef's word, with a round 1 brief written for the seat (a departure from the skill, recorded in the packet). Three reviewers were stopped by a usage limit part way and finished when resumed.

**Verdict: Build smaller, 6 of 6.** Nobody said Don't build and nobody said Build as proposed. They did not vote on what the head chef has decided (D1 to D8); they cut how it is done.

| Reviewer | Verdict | What to cut or change | The one change that would most improve it |
| --- | --- | --- | --- |
| Cook | Build smaller | Count by section and plan once before switch-on. Nothing new on a cook's page | Count the real night: a chef names the section for each shared job its cook does, and the level caps that section's total |
| Head chef | Build smaller | Keep D1 to D8, shrink the mechanism. The plan rewrites his own days: 10 of 15 moved | A fourth order, fewest moves: the button places jobs with no day; each dated move is offered singly, only when a level refuses it or its section's heaviest night drops |
| Skeptic | Build smaller | Records already does much of part 3. No Plan button until real weights exist | Ship part 1, weights, day levels and the rule check as warnings in the job form and Repeat tasks |
| New starter | Build smaller | Parts 1 and 3 with honest names. Part 2 without a new Kind field: reuse Area | Every counted job offers Unable to complete, under that one name |
| Keeper | Build smaller | Part 1 first and alone, part 3 on top, part 2 proven in a preview before any rules change | Keep per-job detail only for jobs that come round, with a node size test, and read the team before the cleaning block |
| Screen designer | Build smaller | No new room, nothing new on the cook's list, no form trip per weight, no trend page before there are weeks to show | One list by section with Light, Medium, Heavy chips on each row and one Save. The plan lands in that list |

### The open questions, as each reviewer answered

| | Cook | Head chef | Skeptic | New starter | Keeper | Screen designer |
| --- | --- | --- | --- | --- | --- | --- |
| Q1 Clash | Section first | Section first, fewest moves, kind breaks ties | Section first, if a planner is built | Section first | Section first | Section first, from the screen side only |
| Q2 What the flag covers | Jobs that come round only | Jobs that come round; Pack down as one quiet count | Jobs that come round only | Jobs whose row says how often | Jobs that come round only | Jobs that come round |
| Q3 Who was on | No. The closing shift's plan, else "not known" | No single winner. Say "on that section", never "closed it" | Not sound enough for names. Say "rostered on" | No. Name the closing shift, else "Not known" | Not as it stands: two rules exist | Cannot judge the rule. Show the source: "own pick 16:10" or "plan" |
| Q4 Who reads it | Names admin only; section counts would help sous chefs | Admin only | Admin only at first | Cannot judge | Admin only as the rules stand | Admin only |
| Q5 Who sets levels and runs the plan | Cannot judge | Levels the admin; the plan, the chefs | Chefs run it; splitting levels to the admin adds a hand-off | Cannot judge | Cannot judge who. Chefs already write jobs | Admin sets levels; chefs read them and run the plan |

- **Q1:** all six said the section's night comes before same-kind days. Kind first made a section's heaviest night heavier in 75 to 80% of the random draws.
- **Q2:** cook, skeptic, keeper and screen designer said jobs that come round only. The head chef said the same for the flag, with Pack down as one quiet count beside it. The new starter drew the line at jobs whose row says how often, which lets two Pack down jobs in. The head chef, the cook and the screen designer said to ask him: he wrote "all tasks for that section".
- **Q3:** nobody accepted the book's present rule for a record with names.
- **Q5:** not settled. Three want the chefs to run the plan; the skeptic would not split levels off to the admin.

### The lead's readings, challenged

| Reading | Challenge |
| --- | --- |
| R1 any rhythm | Head chef: "more than once a day" may mean jobs done at each service. Ask him |
| R2 a day's level; Sunday, Monday, Wednesday heavy | Skeptic: a guess, ask him. New starter and cook: a level is a ceiling, not an amount, so a medium Tuesday can still be a section's heaviest night. Screen designer: "heavy day" reads as a busy service; say "takes heavy jobs" |
| R3 a tenth | Skeptic: that is 2 places of 29, and one is already held by a general job on Friday with no weight |
| R4 a kind on each job | New starter: wrong, reuse Area, whose suggestions already include Shelves and Behind equipment. Screen designer: it would be a fourth grouping beside Work group, Area and Section; use a short fixed list |
| R6 jobs that come round | Head chef, cook, screen designer: narrower than his words. Ask him |
| R7 the admin | Keeper: conflicts with the rules if chefs run the plan, since chefs write the jobs |

### What round 1 found that the proposal did not say

Each is one reviewer's finding unless more are named. "Source read" means read in the code at `0acdaf72`, not exercised.

| Finding | Who, and how checked | What it changes |
| --- | --- | --- |
| D1 is not met today: the nightly scripts never read the release switch, and no first night is stored. `config/main` is already read, so honouring it costs no read | Keeper, skeptic (source read) | Part 1 must do this first |
| The nightly record has a 700,000 byte limit that stops the whole nightly publish, outside the cleaning block's own error handling. Per-job rows for every due job over 90 days came to about 515 KB in a synthetic estimate | Keeper (source read, estimate) | Keep detail only for jobs that come round; size check inside the cleaning block; a node size test |
| The nightly job already reads team plans (56 days) and picks (30 days), but after the cleaning block and for fewer days than the 90 kept | Keeper, cook, skeptic, head chef, new starter (source read) | Names cost no new read. Order and window must change |
| Two rules for "on a section" exist. The phone lets a later pick beat the plan (`mySecNow()`); the nightly side keeps the plan and every pick, by shift (`teamStints()`), so a moved cook lands on two sections. The plan keeps no sent-home time | Keeper, new starter, cook (source read) | One stated rule, tested, before any name is shown |
| "Your section today" opens with "Not on a section today" pressed. Closing it saves no section and does not ask again that day | New starter (source read, not exercised) | A cook can be "on no section" by accident |
| Jobs that come round with no single section: 5 of 20 weekly (head chef), 6 of 24 by template (new starter). Shared kitchen rows name a role ("Grill chef") | Head chef, new starter, screen designer, cook (ran the lists, pictures) | The results need a Shared kitchen line; whose job a shared job is stays open |
| The planner's "heaviest night" misses the real close: shared jobs a section's cook does, and monthly jobs, are not in it | Cook (ran the planner) | Say so on any screen that shows a section's night |
| His list is already kind to the weekend: 0 of 15 dated section jobs fall on Friday or Saturday, and only 3 of 12 section nights hold two section jobs | Head chef, cook (ran the lists) | The plan guards more than it fixes |
| Fewest moves: a brute force over 2,000 weightings reached the same heaviest nights with 3.4 moves against section first's 8.3 | Head chef (own script, same-kind days not scored) | A fourth order to test in round 2 |
| Adding one job after a saved plan and planning again moved a saved job in 25% of runs (kind first) and 43% (section first) | Skeptic (own node fixture, preview engine) | Plan only the new job by default; say "moves N saved jobs" before Save |
| Planning with no weights set still moves jobs, on a guessed medium | Skeptic (own node fixture) | No plan until every chosen job has a weight; show "No weight yet", never medium |
| More than 9 changed jobs in one day puts a cook's Cleaning open over its read budget of 90 for that day; a 15-job plan cannot be one save | Keeper (source read; the save limit is the first council's emulator run, not seen by him) | Raise the budget with the reason; a part-saved plan is a real state |
| A tick that fails with no signal shows an error and is not held, so it becomes a miss the cook never sees | Cook (source read) | Open: hold it, or say so |
| A job the chef typed in has no Unable to complete | New starter (source read) | Give it one, under one name |
| Weighing has no screen today. Repeat tasks shows no whole job on its first 390 px screen, its Work group filter puts every section job in General cleaning, and Edit, chip, Save for 21 jobs is 63 taps. A loaded job's Edit form has at least five more fields than Add | Screen designer (pictures, source read; taps counted, not exercised) | Weigh in a list, not one form at a time |
| "Light" has three meanings (a job's time, a day's limit, a quiet night) and the planner called a heavy-level Monday "a light day for Hot larder" | New starter (ran the planner) | Say "takes up to: light jobs" for a day; fix the planner's words |
| Missed has no look of its own: `.cln-missed` is in `docs/colour-coding.md` but in no CSS or JS, and Records draws missed in failure red. The Inbox's attention row always draws a filled orange button | Screen designer (source read) | A missed section is attention, not failure, with a quiet button: a new look, his call |
| An Inbox row needs a button to where the thing is done, but a past day cannot be ticked | Head chef | The flag's button can only open the record |
| The cook pictures in the packet are hidden behind the section sheet | Screen designer, new starter, cook | Retaken for round 2 |

Correction to the proposal: "about 1 run in 16" counted jobs. A job fits no day in about 1 run in 19 (105 of 2,000, head chef's count).

### Break-it findings, round 1

| Scenario and role | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| The 03:00 job with per-job rows and names for every due job over 90 days, or a recount | The cleaning count is left out and the rest publishes | The size limit sits outside the cleaning block: no Dashboard, Records or team summary that night | Risk / Not evidenced (keeper, synthetic size estimate) | A node test of a 90-day record at full lists; cap the rows; size check inside the cleaning block | Before part 1 is ready |
| A chef saves a 15-job plan and one step is refused or the signal drops | All or nothing, or a named part-saved state | Hypothesis: the first step lands, the rest do not, and the saved part can break the tenth or the two-heavy rule | Risk / Not evidenced (keeper) | An emulator run of 6 to 9 moves with real jobs; the rule check on the saved state after every step | Before part 2 is ready |
| A recount after switch-on reaches a day 31 to 90 days back | Who was on, for every kept day | Picks are read for 30 days only; jobs loaded before switch-on count as missed | Risk / Not evidenced (keeper, source read) | A node test: a day before the first night is not counted; an old day keeps its stored names | Before part 1 is ready |
| A chef adds one job after a saved plan and plans again | Only the new job gets a day | A saved job moved in 25% (kind first) and 43% (section first) of runs | Checked in the skeptic's node fixture, preview engine | Plan only the new job by default; "moves N saved jobs" before Save | Design rule for round 2 |
| A chef plans before weights are set | Nothing moves | With no weights, section first moves 3; with example kinds, 8 to 10 of 15 | Checked in the skeptic's node fixture, preview engine | No plan until every chosen job has a weight | Design rule for round 2 |
| A section is flagged and a cook was moved or sent home, or the plan was saved again later | The record names who was on at close | Hypothesis: a later plan save beats the cook's earlier pick; no leave time is kept | Risk / Not evidenced (skeptic, source read) | A fixture: pick, save the plan again, the 03:00 count; word it "rostered" | Before any name is shown |

Survived the skeptic's challenge: planning again after a save moved nothing in 1,000 runs in both orders; the rule check gave a message for every leave-one-out break, and every broken full plan had a "No day fits" job that it named. He did not check that it named the right rule each time.

### Contract fit, round 1

Keeper, skeptic, new starter and screen designer said Needs work. The cook said Works if it stays off the service pages. The head chef gave no label and named one unresolved issue (the Inbox button).

- **Service rules:** Works if nothing is added to a cook's page (cook, screen designer, head chef). No new tab or pop-up is proposed.
- **"Never guess a day":** proposing a day is a named change to that rule, asked for by the head chef. His to OK (keeper, head chef, skeptic, cook; the other two did not speak to it).
- **Records "never judged":** a flag with names behind it is a judgement; names plus misses is a discipline record (skeptic). Admin only.
- **State words:** Proposed, Not sent, Saved and refused need words; counting no weight as medium guesses a time (new starter). Every flag and plan state is Not evidenced until drawn.
- **Missed is attention, not failure:** no such look exists today (screen designer). A proposed new look.
- **Server enforcement** of "light only on Friday and Saturday" is Not evidenced, and a side record cannot be held to it (keeper).

### What round 2 must bring (from the screen designer, with the others' asks)

- The real page frame at 390 and 1280 px (768 where a tablet matters), the full Edit form of a loaded job, and a long job name.
- States: no weight yet, proposed, no day fits, Saving, Not sent, part saved, refused, Saved but starts tomorrow, empty, failed read, Count not ready, Cleaning off, nobody set.
- The taps to weigh 21 jobs and to save a plan; rendered contrast; keyboard focus.
- Words only for weight, level and Proposed: no amber, red, green or heat scale.
- Nothing on a cook's page, shown by a before and after of that page.

### What round 1 means for the designs

Each line names who asked for it. These are not one agreed list.

| Rule for the designs | Who asked |
| --- | --- |
| No new room, and nothing new on a cook's page | Screen designer, cook; the head chef noted no new tab or pop-up is proposed |
| Weigh jobs in a list, not one form at a time | Screen designer |
| The section's night before same-kind days | All six (Q1) |
| Move as few dated jobs as the rules need | Head chef |
| Never plan a job that has no weight; show "No weight yet" | Skeptic, new starter |
| Once a plan is saved, plan only the new job | Skeptic |
| Part 1 first | Keeper, head chef, skeptic |
| No Plan button until real weights exist | Skeptic alone. The head chef's first ask was a button, so every design keeps one; this is taken as build order |

### The reviewers' numbers, run again in the planner

Three figures above came from reviewers' own throwaway scripts. Each is now an option in `previews/planner.js` (37 node checks then, 40 now, defaults untouched) and a column in `previews/many.js` (2,000 random weightings, seeded).

| Order, weights at random and kinds as one example | A section's heaviest night heavier than with days kept | None heavier, some lighter | Heaviest section night, average | Dated jobs moved, of 15 | Kinds with a shared day | One job added after a save, planned again: a saved job moves | The same, planning only the new job |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Days kept | 0% | 0% | 4.8 | 1.8 | 60% | 0% | 0% |
| Kind first | 75% | 11% | 5.0 | 9.5 | 99% | 41% | 0% |
| Section first | 3% | 92% | 3.5 | 8.3 | 90% | 52% | 0% |
| Fewest moves | 0% | 89% | 3.8 | 2.8 | 82% | 11% | 0% |

With kinds at random too: fewest moves is heavier in 7% of runs, moves 2.8 jobs, and 68% of kinds get a shared day. A job fits no day in 105 of 2,000 runs (113 with random kinds).

- **Fewest moves** is the lead's build of the head chef reviewer's idea: a job that has a day keeps it unless its day's level refuses it; jobs with no day are placed section first; then one dated job at a time is moved, only when its section's heaviest night gets lighter. He reported 3.4 moves from a brute force; this build moves 2.8 and stops a little short of section first's nights (3.8 against 3.5).
- **A saved job moving when one job is added:** the skeptic reported 25% and 43%; this run gives 41% and 52%, with a different seed and added job. Planning only the new job moves none.
- The planner's reason no longer calls a night "a light day" (new starter): it says "Hot larder has the least on that night (4 points with it)".

## Round 2: designs

Packet, with each design in full: [round2-packet.md](round2-packet.md). Side by side: [index.html](index.html). Six fresh reviewers (not the round 1 agents), each given the skill's text word for word and no favourite.

The designs are drawn inside the book's real pages at `0acdaf72` (`designs/build.cjs`, `designs/frame.cjs`): the click-test stand-in opens the real page and the design's parts, built from the book's classes, are put into it. So the frame, forms, fonts and colours are the Implemented app's and the new parts are Preview. Nothing was tapped, saved or timed. Weights, kinds, people and counts are made up.

- **A. On the job.** Weight, kind (the Area box, retyped) and day in the job's own form. The book checks and suggests, one job at a time, and never moves a job. Results in Records, that night.
- **B. One list.** One view in Repeat tasks: every job that comes round is a row with three weight chips; Plan the days proposes the fewest moves and shows only the rows that change; one Save. Results on a new Reports page.
- **C. Set up once.** Four steps while Cleaning is off: weigh a section at a time, say what each day takes, see the whole week replanned, switch on. After that the job form suggests a day. Results in the Inbox, then Records.

### How they differ

| | A. On the job | B. One list | C. Set up once |
| --- | --- | --- | --- |
| Where a job is weighed | Its own Edit form | A row in one list | A row in a setup step, one section at a time |
| The plan's unit | One job | The list of changes | The whole week, once |
| Who moves a dated job | Only the chef, by hand | The book proposes the fewest moves, any time | The book replans the week before switch-on; after that only the chef |
| Where results are read | Records, that night | A new Reports page, 4 weeks | The Inbox, then Records |
| New places | None | One view in Repeat tasks; an eighth Reports tab | A block on Repeat tasks that goes away |
| After Cleaning is on | The same forms | The same view | The job form only |

### Counts

390 x 844 and 1280 x 900. Frame: Implemented app. New parts: Preview. Taps are counted from the pictures, not exercised.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Weigh the 20 jobs that come round: taps | cannot | 60 (Edit, chip, Save each), plus finding each job 6 to a page | 22 (open, a chip each, Save) | 25 (a chip each, Save per section) |
| Set the kind on 20 jobs | cannot | retype Area in each form | 40 (picker, choice) | 40 |
| Get every job a day that fits, from weighed jobs | by hand in each form | 3 per job that needs one (Edit, the day, Save) | 2 (Plan the days, Save) | 2 (open step 3, Save) |
| Read why a section was flagged | cannot | 1 (the Inbox button), names 1 more | 1, names 1 more | 1, names 1 more |
| Whole job rows on the first phone screen while weighing | 0 | 0 (one job, in its form) | 1 | 1 |
| Screens long at 390: weighing | Edit page 3.3 | 3.8 | 4.7 | 3.5 |
| Screens long at 390: the plan | none | Repeat tasks 3.1 (today 2.5) | 3.2 (part saved 3.4) | 4.3 |
| Screens long at 390: results | Records day 1.3 | 2.0 | 1.8 | Records day 2.0; Inbox 1.4 (today 1.2) |
| Screens long at 1280: weighing, plan, results | | 2.9, 2.3, 2.5 | 2.7, 2.4, 1.5 | 2.5, 3.2, 2.5 |
| Controls under 44 px | | 0 | 0 | 0 |
| Lowest text contrast, rendered | | 4.86:1 | 4.76:1 | 5.05:1 |
| Lowest control edge against its surround | | 15.9:1 | 4.84:1 | 4.84:1 |
| Keyboard focus, reached with Tab | | 3 px ring, 3.33:1 | 3 px ring, 3.33:1 | 3 px ring, 3.33:1 |
| Navigation levels to the plan | | Cleaning, Repeat tasks, Edit | Cleaning, Repeat tasks, Weigh and plan | Cleaning, Repeat tasks |
| Build size, pull requests | | 3 | 4 | 4 |
| Relearning | | Least: the same forms | A new view | A one-off run of steps |
| New reads or rules | | Rules: weight and kind on a job, one day-levels record | The same, and a plan saved in steps | The same, and a plan saved in steps |
| Main risk | | Slow: 60 taps, and no bulk plan | A part-saved plan; the longest list | The whole week replanned on made-up weights; nothing plans in bulk after switch-on |

### Rankings

| Reviewer | Ranking | Recommended | Main downside they named |
| --- | --- | --- | --- |
| Cook | B, C, A | A blend: B's list and moves, C's once-only timing and week strip, A's Records and form suggestion. Condition: one named section on the two shared jobs that name sections | Later imbalance is the chef's to spot |
| Head chef | B, C, A | A blend with B's list as the only bulk editor and fewest moves only; C's strip and form suggestion; no new tab; results first; kind optional | No pattern page until weeks exist |
| Skeptic | A, B, C | A, in order: the count, the Inbox row and Records first; then weights with B's weigh list; no Plan button until real weights exist | Days set by hand, and the outcome depends on the order of edits |
| New starter | B, A, C | B with A's "light only" words, C's due-tonight warning and A's Records | A rarely used view, relearned |
| Keeper | B, A, C | B's list with C's gate (the book plans in bulk only while Cleaning is off) and no new report page, built after part 1 | After switch-on a replan is by hand, one job at a time |
| Screen designer | B, C, A | B's list and plan, A's weight chips in the form, C's results in the Inbox and Records | Nothing shows a section missing the same job week after week |

B first: 5 of 6 (all but the skeptic, who put A first). Last place split: A for the cook, head chef and screen designer; C for the skeptic, new starter and keeper. Structurally different: yes for all six on planning. The cook and the screen designer noted that A and C share one results page and B and C one weigh row.

### The mix (A + B + C)

Five reviewers said a blend beats their preferred single design (cook, head chef, new starter, keeper, screen designer). The skeptic said A with B's weigh list beats A alone, and that all three does not: "C adds a rule, not a screen".

| Part | Who took or rejected it | Principle | Why |
| --- | --- | --- | --- |
| B: weigh every job in one list | Take: all six | Todoist, Airbnb | 22 taps against 60; job and weight together |
| B: the plan as changes only, fewest moves, with a way to keep the old day | Take: cook, head chef, new starter, keeper, screen designer. The skeptic would hold any Plan button until real weights exist | Things 3, Todoist | 3 of 15 days move in the example, not 10 |
| B: planning in bulk at any time | Reject: keeper, skeptic; the cook named it as B's weakness ("days shift under us") | | Once Cleaning is on, each moved job costs an uneven week and extra reads |
| B: a new Reports page as an eighth tab | Reject or hold: keeper, skeptic, screen designer, head chef, new starter. The cook rejected its clock times beside names and its wording | Linear, Flighty | Off screen at 390 px, nothing to show for weeks, and Records exists |
| C: the book plans in bulk only while Cleaning is off; after that only the new job | Take: keeper, skeptic, cook. Not agreed: the head chef reviewer said switch-on need not wait for the planner and kept B's list as the bulk editor, and the head chef's own D6 says a job that has a day can be moved | Flighty | While it is off nobody waits and no cook reads the jobs |
| C: the four steps | Reject: keeper, skeptic, new starter, head chef, screen designer | Linear | They duplicate B's list and are used once |
| C: the whole week replanned, section first | Reject: head chef. Named as C's weakness by the other five | | 10 moves reach the same heaviest nights as 3 in the example |
| C: the week strip, each night was and now | Take: cook, head chef. Reject: screen designer ("56 point numbers") | Airbnb | Split. Not settled |
| C: a Cleaning line in the Inbox's numbers | Take: head chef. Reject: cook, skeptic, screen designer | Airbnb, Linear | One miss shown twice |
| C: the new job's suggested day and the "today means tonight" warning | Take: head chef, new starter, skeptic; the cook took A's form suggestion | Todoist, Flighty | A visible default, and it stops a job landing tonight unseen |
| A: Records, that night, as the results page | Take: all six | Linear, Things 3 | One frame; names behind |
| A: the kind as the Area box, retyped | Reject: cook, keeper, skeptic, head chef. The screen designer's own mix keeps the kind in Area. The head chef would make the kind optional | Headspace | Free text will not match across sections, and Area prints on a cook's row |
| A: weight chips in the job's form | Take: screen designer. The head chef took each night's points under the day chips; the screen designer rejected those second lines | Todoist | A second place to weigh, so the same chips and words |
| A: the "To look at" list | Take: keeper; the screen designer would add one line to the existing attention block. The cook noted it missed Hot larder's 5-point Sunday | Flighty | Honest status from what is kept |

### Break-it findings, round 2

| Scenario and role | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| A chef adds a heavy Hot larder job after a saved plan; only the new job is planned (B, C after switch-on, and any form suggestion) | A day inside the rules, or "No day fits" | A night at 7 points with the reason "has the least on that night (7 points with it)", while the rule check says over 5 | Reproduced in `planner.js` on the example (skeptic) | The suggestion runs the rule check and says "over" in words; decide whether the 5-point limit is a hard rule | Fix in the planner, node check |
| B: the chef presses Keep on one row and saves the rest | The other rows are still true | With the stove kept on Tuesday the planner would put two other jobs elsewhere; the pictured rows stay. None of the 256 part-saves of the 8 changes broke a new rule | Reproduced (stale rows) and checked in the example (skeptic) | Plan again on every Keep, or mark the rows that changed | In the combined preview |
| A weight is saved for 18 jobs in one Save (B), or 7 (C) | All saved, or a named part-saved state | A weight on a job is a close and a create, each permanent: 36 writes for 18 weights. One save of 10 moves was refused in an earlier emulator run; 6 to 9 and real jobs are untried. With Cleaning on, cooks read both versions that day: over the budget of 90 | Risk / Not evidenced; rule shape read in source (keeper) | An emulator run of 6, 7 and 18 real jobs; then steps with the part-saved states on the weigh list too, or one side record of weights | Before part 2 is ready. A build choice for the head chef |
| A chef weighs a job, then plans it the same day; or a save's steps straddle midnight | One version per job, one start day | Hypothesis: a version not yet in force is replaced, leaving a zero-length one; later steps stop and the saved part starts a day earlier | Risk / Not evidenced (keeper, source read) | Emulator test: replace twice in a day; a client test with the clock moved between steps | Before part 2 is ready |
| The morning after switch-on, or after the 03:00 run failed | A flag only for counted nights; "Count not ready" otherwise | The nightly job never reads the release switch, so jobs loaded before switch-on count as missed; a record over 700,000 bytes stops the whole publish | Checked in source for the switch and the limit (keeper); size and how the row clears, Not evidenced | Part 1 first: the switch, a stored first night, the size check inside the cleaning block, a node test at full lists | Before part 1 is ready |
| A: the chef presses the suggested day | The job moves to it | The day chips toggle, so the old day stays pressed: the job is now twice a week | Source read, not exercised (new starter) | The suggestion is a button that swaps the day | In the combined preview |
| Shared jobs that name sections (the pass shelves, behind the deep fryers) | They count toward those sections' nights | They are planned as Shared kitchen, so a section's real night is heavier than shown: Pans 3 to 5 if counted in full | Checked in the cook's node run, made-up weights | Ask the head chef for one named section on each | Open with the head chef |

### Faults found in the drawings

Each is fixed in the combined preview or listed as open.

- **The Save bar** sat at the foot of the window, under the tab bar on a phone, and covered the first row's chips (cook, head chef, new starter, screen designer). The contract is the docked Save bar above the tab bar. So "1 whole row on the first screen" was 0 usable rows.
- **A wrong reason:** the stove moves because Tuesday does not take a heavy job, but its row said "with the other jobs of its kind" (head chef, screen designer, skeptic).
- **Words:** "Weigh the jobs" reads as scales; "FRI light" reads as a quiet night; "jobs that come round" should be "weekly and monthly jobs"; "points" is not explained; "Nothing is saved yet ... Saved 5 at a time" contradicts itself (new starter). "Not ticked", "Nothing missed" and Records' own "Missed" are three names; so are "Unable to complete" and Records' "not possible" (new starter, cook, screen designer).
- **Part-saved rows:** a Saved row still showed "Keep Tue"; "Try again keeps it" sat beside "Keep Sun"; Refused had no tag; Waiting did not say for what; "No day fits" sat outside the count of changes; Saved had no time (new starter, screen designer).
- **Results:** the person led and the miss was small and below the first screen, against "a section problem, not a person's" (screen designer). B's report printed doers' names on the row face (keeper, head chef). The made-up results did not match the lists, and one Unable to complete was dated before counting began (cook, head chef).
- **C's form suggestion** was hard-coded, disagreed with C's own week, and suggested for a section before one was chosen (cook, skeptic, new starter, screen designer). C's week grid left out the monthly jobs' nights (skeptic).
- **The cook's page:** the before and after pictures were different days (Monday and Wednesday), so they did not prove "unchanged" (cook, new starter, screen designer). A's retyped Area would print on a cook's row, so "nothing changes" did not hold for A (head chef, source read).
- **New rows dropped the handwritten job name**, and the day strip looked tappable with a faint edge (screen designer; edge 1.39:1 from the tokens, not rendered).
- **"Jobs that come round"** was 20 in the weigh list but 25 to the planner: 5 dated general jobs sat outside, one on Friday with no weight (skeptic).

### Contract fit, round 2

Head chef, skeptic, new starter, keeper and screen designer said Needs work. The cook gave results by item: the cook's page Works, B's Save bar Needs work, a moved row Not evidenced. The screen designer found no state that relied on colour alone.

| Check | A | B | C |
| --- | --- | --- | --- |
| Service rules: nothing on a cook's page | Needs work: retyped Area prints on the cook's row (head chef) | Works in the picture; the before and after were different days, so Not evidenced | The same as B |
| No second sticky bar; Save docked above the tab bar | Works: the form's own Save | Needs work: the drawn bar was wrong (four reviewers) | Works: the steps' Save was not sticky |
| "Never guess a day" | A proposed change he asked for; nothing saves unconfirmed (skeptic, keeper) | The same | The same |
| State words | Works for Not saved | Needs work: the part-saved rows (above) | Not evidenced: no failure drawn (new starter) |
| Missed is attention, not failure | Works in the Inbox row; Records prints "Missed" in failure red today and the picture hid that (screen designer) | Works in the Inbox; the report has no cue | The same as A |
| Rendered contrast, 44 px targets, focus | Lowest text 4.86:1, no control under 44 px, 3 px ring at 3.33:1 | 4.76:1, none, the same ring | 5.05:1, none, the same ring |
| Not evidenced in any design | Every tap and save, 768 px, large text, focus under the dock, several sections flagged at once, a failed read as a page, names opened | | |

### Reference fit, round 2

| Principle | A | B | C |
| --- | --- | --- | --- |
| Todoist: a known default, visible and editable | Works: the suggested day; Needs work: pressing it leaves the old day on | Works: Keep the old day; Needs work: no way to pick a third day (head chef) | Works in the new-job form |
| Things 3: occasional detail tucked away | Works: names behind a button | Works: only the changes are shown | Needs work: the week is 56 numbers (screen designer) |
| Airbnb: time, place, state together | Needs work: one job at a time, 1,273 px down the form | Works: each row has the day, the old day, the reason and the state | Needs work: the numbers line repeats the flag |
| Flighty: honest status from kept data | Works: Records, "Count not ready" | Needs work: "4 weeks" after 24 nights | Works: plan while off, the tonight warning |
| Linear: one frame, one way to edit | Works: no new place | Needs work: an eighth tab | Needs work: steps beside the list they duplicate |
| Duolingo: truthful saves, no points | Not evidenced | Works: the only design that draws Not sent and Refused | Not evidenced |
| Headspace: one name per thing | Needs work: kind as Area | Needs work: the words above | Needs work: "3 of 20 done" beside "Not saved" |


### The combined design (lead's synthesis, with a focused follow-up)

Packet: [round2-followup.md](round2-followup.md). Pictures: `designs/m1-entry` to `designs/m7-records`. Drawn inside the real pages like the three designs. Review status: a lead synthesis; the skeptic, the keeper and the screen designer checked its first drawing, and the lead redrew it after them. No reviewer has seen the redraw, and the cook, head chef and new starter have seen neither.

**What it is.** No new room and no new Reports tab.

1. **Results.** One Inbox row the next morning with a quiet button: "Not ticked", the section, the job, its date, and "also not ticked" for an earlier week. It opens that night in Records, where today's lines stay and the weekly and monthly jobs follow by section: the miss first in the attention look, "Who was rostered" a link last. Shared kitchen has a line and no names.
2. **Weights and days.** One view inside Repeat tasks, opened from one line there. Every weekly and monthly job is a row by section with its handwritten name and Light, Medium, Heavy. A kind is optional, from a short list, and on a phone it is set in the job's form.
3. **Suggest the days.** Each change sits in its row: the new day and the old day, the reason, Keep the old day or Another day. No Keep where the old day breaks what that day takes. One Save, "20 weights and 8 days". A save that stops part way says so on each row in words.
4. **Once Cleaning is on** the book suggests a day for new jobs only. A night that would become a section's heaviest says so.

| | First drawing | Redrawn |
| --- | --- | --- |
| Screens long at 390: weights, changes, part saved, Cleaning on | 5.2, 4.5, 4.7, 2.6 | 4.5, 3.3, 3.8, 2.0 |
| Screens long at 1280: weights, changes, Cleaning on | 3.0, 2.4, 1.7 | 2.8, 2.1, 1.4 |
| Whole job rows on the first screen above the Save bar: phone, laptop | 0, 3 | 1, 3 on weights; 0, 2 on changes |
| Controls on the changes page | 49 | 16 |
| Controls under 44 px; lowest text contrast; focus ring | 0; 4.76:1; 3 px at 3.33:1 | The same |

Preview inside the Implemented app's frame. Nothing was tapped or saved.

**The follow-up.** All three said change it, then build. All three said the book should suggest in bulk only while Cleaning is off.

| Reviewer | Changes asked | Done in the redraw |
| --- | --- | --- |
| Keeper | Store weights and kinds in one side record keyed by the job's root id: one write, read by chefs when the view opens, never by cooks. Then only the jobs whose day changes are saved again (8, inside the 9 spare reads), and weights need no gate | Save now reads "20 weights and 8 days". The store is a build choice, recommended below |
| Skeptic | Ship the count, the Inbox row and Records first, alone. No Keep on a row whose old day breaks a day's level. Any Keep or Another day plans the rest again before Save. The 5 dated general jobs get rows, or the "29" goes. Hold "A move on offer" out of the first build | No Keep there; the offer is gone; the "29" is gone. Planning again after Keep is not drawn. The 5 general jobs still have no row |
| Screen designer | Rows first, with the scope and day sentences in the fold. In Changes, weight and kind as words and tags only for exceptions. Refused in failure ink, what needs the chef first. Lift the Save bar only to 719 px. A lasting link to the view. One word for a miss, his call. Correct the Cleaning-on picture | The weights and changes pages, the Save bar and the Cleaning-on picture. Not done: the one word, which is his call; fixed columns at 1280 px; and the Records night, which was not redrawn, so on a phone the miss still sits below the first screen under today's red "Missed" line |

Break-it, follow-up:

| Scenario and role | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| Cleaning on; the first drawing warned that Monday would become Hot larder's heaviest night and offered a move onto that Monday | One consistent state | The picture mixed two states; taking the offer would have made the night worse | Reproduced: picture against `planner.js` (skeptic, screen designer) | Draw from one state; no offers in the first build; a node check that an offer never raises a flagged night, when offers are built | Redrawn; offers held |
| Keep Tuesday on a heavy job, under "Tuesday takes up to medium jobs" | The head chef's own day rule holds | The button let it stay, and two other rows went stale | Reproduced in `planner.js` (skeptic) | No Keep where the old day breaks a level; plan again on any Keep | First part redrawn; planning again is before ready |
| Weights saved as a field on each job after switch-on | A cook's Cleaning opens inside 90 reads | 81 + 18 = 99 that day | Checked in source, not run (keeper) | The side record | Recommended |
| One Save in steps; an acknowledgement is lost | The row says Saved | The book remembers one uncertain save at a time, so a saved job may read Refused | Risk / Not evidenced (keeper, source read) | Check the new version's id before Send again; a client test with a dropped acknowledgement | Before part 2 is ready |
| "Also not ticked 18 November" for a job that moved, was Unable to complete, or on a night Cleaning was off | Only real earlier misses of that job | Hypothesis: a lookback by name or weekday misreads it | Risk / Not evidenced (keeper) | A node test: lookback by root id over done, missed, unable, not counted and earlier rows; say nothing for a night never counted | Part of step 1 |
| One Save of weights and days; one job is refused | Its weight is still saved | Hypothesis: with weights on the job, the refused job keeps neither | Risk / Not evidenced (skeptic) | The side record saves every weight in one write, apart from the days | Recommended |

## Recommendation

**Recommend the combined design: B's one list leads, the results are the Inbox row and that night in Records, and it is built results first.** Five of six ranked B first and five said a blend beats any one design. The skeptic ranked A first. Taken from him: results first, no Keep on a day that breaks a level, no offers in the first build, and bulk suggestions only while Cleaning is off. Not taken: his main cut, no button that suggests days until real weights exist.

Build order, each step its own pull request:

1. **The nightly count.** It honours the release switch and stores the first night Cleaning is on (D1). For weekly and monthly jobs only it keeps each job by its root id, its section, done or not, who did it and who was rostered; Unable to complete outside the totals. The size check moves inside the cleaning block, with a node test at full lists. No screen.
2. **The Inbox row and that night in Records** (`m6`, `m7`). Admin only as the rules stand.
3. **Weights and days, the list** (`m1`, `m2`). Weights and the optional kind in one side record keyed by root id. That is the keeper's pick and the lead's: one write, no new version of any job, no cook reads, and a weight can be set before or after switch-on. Its cost: the server checks the record's shape, not each job against its weight.
4. **Suggest the days** (`m3`, `m4`), fewest moves, in bulk only while Cleaning is off. After switch-on, new jobs only (`m5`), and no offers in the first build. A job cannot be saved with no day under today's rules, so a new job gets its day in the Add cleaning task form, with the suggestion and the "today means tonight" warning drawn in `a1` and `c3`. The "No day yet" rows in `m3` and `m5` stand for jobs a chef is adding: the list cannot hold them until that form has given them a day, or the rules change.

Why it beats the three as drawn: A never gets the weights set (60 taps, one form at a time) and has no button, his first ask. B alone plans in bulk at any time and adds a Reports tab that is off screen on a phone and empty for weeks. C replans 10 of 15 of his days to reach the same heaviest nights as 3 moves in the example (over 2,000 random weightings, 3.5 points against 3.8), and builds steps used once. The mix keeps B's list and A's Records night, which all six took, and C's timing, which three took in round 2 and which is not agreed (below).

Principles that help: Todoist (a suggested day you can keep or change), Airbnb (the day, the old day, the reason and the state in one row), Things 3 (only the changes; names behind a link), Flighty (honest dates, "Count not ready"), Linear (no new room, one Save bar), Duolingo (Saved, Not sent and Refused in words; no totals per person).

Main downside: on a phone the weights list is 4.5 screens with one job on the first screen. It is a desk job, done once. And nothing shows a section missing the same job week after week beyond one "also not ticked" line, until there are weeks enough to judge a pattern page.

Not hidden by the ranking:

- **The skeptic dissents.** He would hold any button that suggests days until real weights exist and the head chef has seen what his own days leave wrong. Steps 1 to 3 come first, so that choice can be made then.
- **The gate is not agreed.** Cook, keeper and skeptic took it in round 2 and all three follow-up reviewers backed it. The head chef reviewer kept the list as a bulk editor at any time, and D6 says a job that has a day can be moved. In the mix a dated job still moves after switch-on, by hand, one at a time.
- **Two planner rules are the lead's, not the head chef's:** no section gets two heavy jobs on one night, and a night over 5 points is too heavy. "No day fits" comes from the first. They are drawn as suggestions he can change or drop.
- **Every number about days rests on made-up weights and kinds.** Across 2,000 random weightings, fewest moves moved 2.8 of 15 dated jobs and left a section's heaviest night heavier in 0 to 7% of runs.
- **Kinds buy shared days only** (head chef reviewer's run: leaving them out made no night heavier). So the kind is optional.
- **Shared jobs that name sections** (the pass shelves, behind the deep fryers) are planned and reported as Shared kitchen, so a section's real night can be heavier than shown.
- **A missed weekly job is not due again until next week.** The flag reports it; it does not get it cleaned. A cook who cleaned and did not tick reads as the section's miss, and a job the chef typed in has no Unable to complete.
- **The five dated general-list jobs** (one on Friday with no weight) have no row in the list yet.

Proposed changes to approved rules, each his to OK: the book suggesting a day ("never guess one"); a view inside Repeat tasks; an attention row with a quiet button in the Inbox; a miss drawn as attention in Records beside today's red "Missed" line; the two suggested planner rules.

Before ready, on the implemented app at 390, 768 and 1280 px: every save state exercised with a refused and a dropped step; planning again after Keep; a lock, a reload and the day changing with suggestions on screen; a cook's page on the same day before and after, and in the week a job moved; several sections flagged on one morning; "Count not ready", Cleaning off and a failed read as whole pages; large text and focus past the first control; and on the rules emulator, 6 to 9 and 18 jobs in one save with real jobs, a second change to a job in one day, either side of midnight, and that staff and sous chefs cannot read the names.

## Open with the head chef

Answered on 26 November 2026 by "Yes proceed with your recommendations": build it in the recommended order; the book suggests in bulk only while Cleaning is off; the flag covers weekly and monthly jobs, not nightly Pack down. Answered the same day: the one word for a miss is "Missed", as Records and Cleaning say today ("That's fine"), with "not ticked by midnight" as its explanation; and Cleaning is switched on at Leichhardt first, then at the Strand.

1. ~~Do Sunday, Monday and Wednesday take heavy jobs?~~ Answered: Sunday, Monday, Wednesday and Thursday, and the book learns from staffing (Step 4a below).
2. "Not just limited to tasks that happen more than once a day": every rhythm, or jobs done at each service?
3. A shared job that names sections (the pass shelves, behind the deep fryers): which one section owns it?
4. Who sets what each day takes and presses Suggest the days: ~~the admin, or the chefs?~~ What each day takes: the admin, so the head chef or the admin (Step 4a). Suggest the days: still his call, with step 4b.
5. The two suggested planner rules: keep, change or drop?

Who was rostered is no longer a question for him: step 1 keeps both the closing plan and a cook's own pick, each with its source.

## Chosen

**The combined design, built results first** (head chef, 26 November 2026: "Yes proceed with your recommendations", spelling tidied). Recorded in `docs/head-chef-decisions.md`.

| Step | What | Pull request |
| --- | --- | --- |
| 1 | The nightly count: the release switch and the first night, weekly and monthly jobs by root id with section, who did it and who was rostered, the size check inside the cleaning block | [#890](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/890), merged 26 November 2026. What it keeps: [the cleaning note](../cleaning-schedule.md#what-the-nightly-count-keeps) |
| 2 | The Inbox row and that night in Records | Built, 26 November 2026. What the admin sees: [the cleaning note](../cleaning-schedule.md#what-the-admin-sees-of-it). As built: `built/` |
| 3 | The weights list, weights in one side record | Built 26 November 2026: weights and the optional kind. What each day takes is in the same record's rule, set with step 4. [The cleaning note](../cleaning-schedule.md#weights-and-days) |
| 4a | What each day takes: his days until changed, set by the head chef or the admin, a suggestion from staffing | Built 26 November 2026. [The cleaning note](../cleaning-schedule.md#what-each-day-takes); quick check below |
| 4b | Suggested days, in bulk only while Cleaning is off, fewest moves | To come |
| 4c | A suggested day in the Add form after switch-on, with the "today means tonight" warning | To come |

## Step 4a: what each day takes (quick check)

The council drew what each day takes as a row of seven levels on the weights list (`m1`, `m2`) and asked the head chef questions 1 and 4. His answer (26 November 2026) added something the council did not see: "learn then based on what days we have more staff on". So step 4 is split: 4a sets the days, 4b suggests the jobs' days, 4c is the Add form. 4a adds no page, tab, button bar or pop-up; it is a fold on a view the council chose. Quick check, no new review round.

- **Is it needed?** Yes: step 4b cannot suggest a day without knowing what each day takes, and he asked for it to learn.
- **Taps.** Head chef: Repeat tasks, Weights and days, What each day takes, Use the suggestions, Save the days: 4 taps from Repeat tasks; one tap more for each day he changes by hand. A sous chef reads the days in the line under the fold with no tap.
- **Lines.** Implemented app, click-test stand-in, synthetic jobs and a made-up team count (`built/days-shots.cjs`, `built/days-counts.json`). Closed, the fold and its line are 64 px: whole job rows on the first screen go from 0 to 0 at 390 x 844, 3 to 2 at 768 x 900 and 4 to 3 at 1280 x 900; the list is 6.3 screens at 390, was 6.2. Open, the days are 922 px at 390 (1.1 screens) and 656 px at 1280. A desk job, done once, so worth the row.
- **Contract fit.** Works: chips and the fold are existing patterns; chosen is ink, words carry every state ("Not saved.", "Saved 14:05.", "Refused: ..."), the summary line and "Light only" say it without colour; every control is 44 px; no sideways scroll at 390, 768 and 1280. The days have their own Save line, not the list's Save bar, so "Save jobs" and "Save the days" never share a button. Not evidenced: contrast was not measured again (no new colour; the chips and hint are the step 3 ones).
- **Reference fit.** Todoist: known defaults visible and editable (his days, shown before anything is saved). Flighty: the staffing words come from data the page may already hold, never stale as live ("The team count is not up to date"). Duolingo: each tap answers at once, Saved only after the write. Headspace: "About 6 on. Suggests heavy." in plain words.
- **A departure, his to OK.** The book suggests ("never guess one"). Here it never fills a day by itself: Use the suggestions is his tap, and Save the days a second one.

Break-it findings, each checked in `tests/cleaning-days.test.js` (stand-in) or `tests/rules/cleaning.test.mjs` (emulator):

| Scenario | Expected | Observed |
| --- | --- | --- |
| A sous chef writes `d` by hand | Refused | Checked on the emulator: refused, first save or change; a sous chef's weight save leaves the days |
| Another chef saves weights while the head chef has unsaved days | Both kept | Checked: one merged write keeps the other chef's weight |
| A refused save | Says so, keeps the change | Checked: "Refused: only the head chef or the admin sets the days. Nothing was saved." with the chip still on |
| Back with unsaved days | Stays and says so | Checked, focus on Save the days |
| An old, short, missing or unreadable team count | No suggestion, the reason in words | Checked for all four; a failed read is never "no count" |
| A roster that is busy on Friday | Friday stays light | Checked: Friday and Saturday never take a suggestion |
| Risk, not evidenced | A day with many people on a function, not cleaning | The suggestion counts people, not their jobs. It is a suggestion only. |

## Step 2 as built, against the previews

Implemented app on the click-test stand-in, synthetic data, 390 x 844, 768 x 900 and 1280 x 900 (`built/shots.cjs`, `built/counts.json`). Pictures: `built/inbox-*.png`, `built/records-night-*.png`, `built/records-night-open-*.png`.

| | Preview (`m6`, `m7`) | Built |
| --- | --- | --- |
| The Inbox row | "Not ticked", one section in the title | "Missed", the head chef's word. One row for the night: one section named in the title, or "2 weekly or monthly cleaning jobs missed last night", with each section and job in the detail (a shared job has no section, so the row does not count sections) |
| Inbox, screens long at 390 | 1.4 | 1.4; the row is whole on the first screen at all three widths; its button is 143 x 44 px |
| Records night, screens long at 390 | 1.8 | 1.9 |
| Where the miss is when opened from the Inbox, at 390 | Below the first screen, under today's red "Missed" line | The page lands on the heading, 149 px from the top, with the missed section's block whole on screen and the heading in focus |
| Who was on | "Who was rostered", a link | "Who was on Hot larder", the page's fold, 44 px tall, closed until asked for. Not "rostered": it lists the plan and each cook's own pick, with the source said |
| People's names | None on the face of the page | None on the face of the page. Who did a job sits behind the section's fold too ("Who did Grill's jobs" on a section that finished). A first build printed them beside each done job; that was a departure from the chosen picture and was changed before it went ready |
| Earlier misses | One line, "also not ticked 18 November" | "Also missed Wed 18 Nov" by the job's own key, and "Last done Wed 11 Nov". A day whose jobs were not kept one by one is never called a miss |

Differences that were not in a preview: a night not counted yet is its own row ("Not counted yet"); a section or shift no longer on the list is said in words; a job that was not possible sits in its section with its note. Still as before: Records' own red "Missed:" line above the block (a colour clash noted in `docs/open-work.md`), and Print and CSV, which carry none of the new lines.
