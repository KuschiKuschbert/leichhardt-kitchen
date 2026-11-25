# Section cleaning: council brief

25 November 2026. Source commit `27ae8275`. The head chef asked for his written cleaning list to go into Cleaning for each section, "nice and well designed". The proposal and evidence packet: [proposal.md](proposal.md). Nothing is built and no design is chosen.

This is role-based analysis by five fresh reviewers reading the source and the notes. It is not research with real staff. Nobody ran the app, so every density and tap claim below is Not evidenced until measured.

## Round 1: should we build it?

**Verdict: Build smaller, five of five.**

What the reviewers said (names show who said it; nobody objected to any of these):

- The real gap is the weekly, weekday and monthly work. It is not in the book and nobody can see it was done (head chef; the skeptic and the cook cut down to the same jobs).
- 13 of the 49 supplied lines are marked in the proposal as already in Pack down or the general Microwave task, or as clashing with them (the skeptic counted about 20; the 13 is the lead's recount against the proposal). Do not add them again: two rows for one wipe means a cook ticks both blind, or one reads Missed (skeptic, cook, keeper, new starter).
- The drip tray (nightly against every 2 days from 9 November) and the OZ tank (twice a week against Sunday only) contradict live Pack down steps. Change those existing jobs in Repeat tasks; do not load a second job beside them (skeptic, keeper, head chef). The cook called them proposed changes to an approved rule, for the head chef to choose.
- Load nothing with a guessed day. The seven open questions come first (all five).

What to cut, exactly:

1. Every line that overlaps Pack down or `c06`.
2. Required checks on the new jobs: one tap each (cook, head chef).
3. "No more foil", "keep the fridge and freezer tidy" and the unclear step line as tick rows.

What to add to the proposal:

1. The rhythm in words on a staff row, before the state: "Every Thursday", "Every 4 weeks" (new starter, cook). Today weekly, monthly and nightly jobs all read the same.
2. Headings that tell a section's own clean from its Pack down, so two "Grill" headings cannot be confused (new starter).
3. A "needs a first date" count in setup for jobs loaded without an anchor date, so a monthly job cannot wait unseen for ever (skeptic, keeper).
4. A Cleaning-open line in `tests/read-budget.test.js` in the same pull request (keeper).

## How round 1 was run, and its limits

Five fresh reviewers, each with the proposal and the reviewer brief from the council skill. Departures from the skill, so the result is read with care:

- The design references and Try to break it text were shortened in the reviewers' packets, not pasted whole.
- No baseline screenshot was supplied. The baseline was taken afterwards (see Round 2).
- The skeptic and the keeper were given 250 words, not 200.
- The lead gave the skeptic and the new starter leads of his own to test (overlap with Pack down, the empty repeat date, the 28-day month, jobs in two sections; rhythm on the row, lookalike headings). Their findings on those points are partly prompted, not fully independent. Round 2 gives no such leads.

## Disagreement

- **How small.** The skeptic, the head chef and the cook: weekday, weekly and monthly jobs only (3). The new starter and the keeper: any line with a set frequency and no overlap, which lets in the three new nightly lines: kick oven door, fridge doors, decant sauces (2).
- **Whether to build at all for most of it.** The head chef reviewer: Add cleaning task already takes a section and weekdays with no code, so the weekday jobs could be typed in today. Only monthly jobs, the rhythm words and a section that is not live need a build. Nobody else raised it.

## Proposal corrections

- "No new read" was wrong (keeper). There is no new query, but each new task document is one more read on every Cleaning open or Refresh, per device, plus the nightly backup and analysis. About 37 jobs is about 37 more reads per open.
- The grouping code was not stated (keeper, cook). `packSection()` and `chefGroupId()` in `js/cleaning.js` know only the `pd-` prefixes, so new built-in tasks would fall into Shared kitchen for staff and General cleaning for chefs.
- The draft helper `task()` in `js/cleaning-schedule.js` turns blank days into every day (new starter). A line with no confirmed day must not go through it.

## Break-it findings

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| Grill cook at close sees the two-day drip tray step and a new nightly drip tray job | One record of one job | Hypothesis: one is ticked, the other reads Missed and Records counts a failure, or both are ticked blind | Risk / Not evidenced | One record. The head chef picks the frequency and edits `pd-grill-03` in Repeat tasks | Carried into the build: overlaps are not loaded |
| A drip tray answer is written into the built-in drafts | Every kitchen follows the head chef's answer | Hypothesis: import skips existing IDs, so a kitchen already loaded keeps every 2 days | Risk / Not evidenced | Never edit a loaded template in the file. The chef edits it in Repeat tasks; the 9 November anchor note is updated | Carried into the build |
| Monthly jobs load with no anchor date | The chef is told to set a first date | Client and rules agree the job is never due, Records never counts it, nothing prompts setup | Risk / Not evidenced (source read only: `due()` in `js/cleaning-core.js`, `cleanInterval()` in `firestore.rules`) | A "needs a first date" count in setup, with a client test | Needs building |
| "Once a month" as every 28 days | 12 cleans a year | 13 a year, always the same weekday | Risk / Not evidenced (source read only: repeat is 2 to 30 days) | The head chef accepts every 4 weeks, or asks for calendar months (core, rules and `CLEAN_V` change together) | Head chef's call |
| A weekly or monthly job missed on its day | The head chef's choice | It is not due again until next week or 28 days on | Risk / Not evidenced (source read only) | Ask whether a missed job stays due. That changes recurrence and the rules | Head chef's call |
| A close that runs past 00:00 | The night's jobs can still be ticked | The cleaning day turns at midnight, so Sunday's jobs finished at 00:10 cannot be ticked and read Missed | Risk / Not evidenced (source read only: `cleaningAct()` needs today; how late the kitchen closes is unknown) | Out of scope here: it is today's behaviour for Pack down too | Recorded for the head chef |
| A job listed under two sections (deep fryers behind; shelf above the pass) | One job, one owner | Hypothesis: as two records each section assumes the other did it | Risk / Not evidenced | One shared job with one named owner | Carried into the build, pending question 6 |
| Two chefs press Load together | Both see the tasks loaded | Hypothesis: the second batch is refused and that chef sees an error although the tasks loaded | Not evidenced | A rules-emulator double import | Check before ready |

## Contract fit (round 1)

- **Fits:** the import pattern, the empty-anchor rule, no new tab, top bar button or pop-up, state in words without colour.
- **Proposed changes to an approved rule, for the head chef to choose, not violations:** a nightly drip tray against the 9 November two-day anchor; OZ tank twice a week against Sunday only; a 28-day month; a sixth chef group beside the chosen five; rhythm words on the staff row, a new pattern for `docs/design-patterns.md`.
- **Needs care:** `.nb-meta` is one line with the state last and cuts off with an ellipsis, so rhythm words must not push the state out of sight.
- **Not evidenced:** staff density at 390 px with three lists, row length, Extra large text, whether Cleaning is switched on for the team and whether both existing lists are loaded in the live book.

## Reference fit (round 1)

Things 3: tonight's work apart from work that comes round weekly or monthly. Airbnb: a job's rhythm, place and state together on the row. Todoist: no guessing a day from unclear text. Headspace: one name per thing, so a section's clean and its Pack down never share a heading. Flighty and Duolingo: no new polling, never Done before the save is acknowledged; both already hold. Linear adds nothing here.

## Still open with the head chef

The seven questions in the proposal, plus two from the council:

8. Should a weekly or monthly job that was missed stay due until it is done?
9. Is Cleaning switched on for the team, and are the general list and Pack down both loaded?
10. Are the fridge doors their own nightly job, or part of the daily general fridge task (round 2)?
11. Which Pack down does a Fryers cook do, and is "Fryers, salads and dessert" one cleaning list for both sections (round 2)?

## Round 2: designs

Run on 25 November 2026 before the head chef answered the open questions, because he asked to see designs. The previews therefore hold only jobs whose day he gave. Packet: [round2-packet.md](round2-packet.md). Designs side by side: [index.html](index.html). Numbers: [previews/measurements.json](previews/measurements.json), made by [previews/build.cjs](previews/build.cjs).

All measurements are **Preview**, not Implemented app: the real Cleaning page on the click tests' Firebase stand-in at `27ae8275`, a line cook on Grill, synthetic Monday 30 November 2026, 390 x 844 and 1280 x 844, Barlow, Barlow Condensed and Caveat loaded, both built-in lists loaded, eight new jobs seeded as ordinary tasks, the real rows moved into each layout by script. Not exercised in any preview: ticking, Undo, saving, no signal, opening a closed row, Extra large text, dark mode, focus, 768 px, a chef's view.

### The designs

- **A. Same page, clearer rows.** Today's order, no folds. Each section's own clean is a group headed "Grill: section clean"; Pack down groups are headed "Grill: pack down". A job that is not nightly says how often on its small line.
- **B. Today only, on top.** Ordered by how often. Every job due today that is not nightly leads, from every section, each row naming its section and rhythm. The nightly lists follow.
- **C. My section first, rest closed.** Ordered by person. The cook's section is open (section clean, then Pack down). Every other section, Shared kitchen and Floors are closed rows that open in place.

| | A | B | C |
| --- | --- | --- | --- |
| Ordered by | Section, as today | How often | The cook's own section |
| A section's weekly job sits | In its own group at the top | With every section's, first | With that section's Pack down |
| Disclosure | All open | All open | Own section open, the rest closed |
| New structure | Group names only | One new group and title | Closed rows on the staff page; uses the chosen section |

| 390 x 844, Preview | Today | Typed in, no build | A | B | C |
| --- | --- | --- | --- | --- | --- |
| Jobs on the page | 46 | 54 | 54 | 54 | 54 (10 open) |
| Whole jobs on the first screen | 5 | 4 | 4 | 4 | 4 |
| Page length, phone screens | 4.9 | 5.7 | 5.7 | 5.7 | 2.2 |
| Screens down to Grill pack down | 2.9 | 3.7 | 3.8 | 3.6 | 0.7 |
| Taps to tick an own new job (read, not exercised) | not in the book | 1 | 1 | 1 | 1 |
| Taps to tick a Shared kitchen job | as today | as today | as today | as today | 1 more |
| Navigation levels | 1 | 1 | 1 | 1 | 1, plus open and close |
| Build size | none | none | 1 to 2 pull requests | 2 | 2 to 3 |
| Relearning | none | none | New headings | A new top block | A page that differs per person |
| Risk | none | Two rows for one job if overlaps are typed in | Low: words and headings | Medium: Pack down order, mixed owners | Medium: hidden state, a stale section |
| New reads or rules | none | 1 read per new task per open | the same | the same | the same |

The reviewers were shown 6 whole jobs for Today and "not measured" for Grill pack down. The first count had not taken the tab bar off. Remeasured on the same script: 5 and 2.9.

### Scores

No numeric scores were asked for. Rankings, best first, as each reviewer gave them:

| Reviewer | Ranking | Recommended |
| --- | --- | --- |
| Cook | A, C, B | A's words, Shared kitchen first as today, each section's clean above its Pack down, everything open |
| Head chef | A, C, B | Answer the questions, type the weekday jobs in, run two weeks, then a trimmed A |
| Skeptic | A, C, B | Type the weekday jobs in; build A's headings, rhythm words and monthly setup only |
| New starter | C, A, B | A blend: A's words, C's order, B's nightly jobs after the numbered steps, only other sections folded |
| Keeper | A, C, B | A with the cook's own section first and no folds |
| Screen designer | A, C, B | Draw a blend: A's frame, own section first, non-nightly jobs first, no fold; build A if it fails |

A first: 5 of 6. B last: 6 of 6. Structurally different: B and C yes (6 of 6); A is the typed-in page reworded (skeptic, cook, head chef, screen designer).

### The mix (A + B + C)

| Part | Take or reject | Principle | Why | Evidence |
| --- | --- | --- | --- | --- |
| A: rhythm words before the state | Take, 6 of 6 | Airbnb | A weekly job reads differently from a nightly one | Preview; 13 px grey is weak on a wet phone (screen designer) |
| A: paired headings | Take, 5 of 6 | Headspace | Two "Grill" headings are told apart | Head chef: do not repeat "pack down" under the Pack down title |
| A: "Every night" on new nightly rows | Reject (skeptic, new starter, cook, screen designer) | Headspace | His words were "every day" and "daily"; filler | Dropped from D |
| A: sections above Shared kitchen in name order | Reject (cook, new starter, screen designer) | Flighty | A Grill cook's page opens on Fryers | Preview: Grill pack down 3.8 screens down |
| B: the Today only block | Reject, 6 of 6 | Things 3 at a cost | Mixes owners; pulls the Sunday and two-day Grill steps and the chemical room task out of their lists; "Every night" sits over daytime jobs | `previews/build.cjs`; Monday hides the Pack down case |
| B: a section's nightly jobs after its numbered steps | Take (new starter, cook) | Things 3 | "Section clean" then means the rare work; the kick oven door is wiped after the oven is off | Not exercised |
| B: the section named on the row | Take where sections are mixed (skeptic, keeper) | Airbnb | Not needed when the heading names it | |
| C: own section first | Take (keeper, skeptic, new starter, screen designer; the cook took section clean beside Pack down) | Things 3 | Own Pack down at 0.7 screens against 2.9 today | Preview |
| C: closed rows | Reject, 5 of 6. The new starter would fold other sections, but not Shared kitchen or Floors | Flighty | 44 of 54 jobs hidden; a closed row can hide Missed, Not sent or Awaiting Pass check; one more tap for 23 shared jobs | Folds never opened: Not evidenced |
| C: "10 jobs" count | Reject (new starter, cook, head chef) | Duolingo | General tasks naming Grill chef stay under Shared kitchen, so the count is untrue | Source read |

An all-three blend cannot work whole: B and C both claim the top of the page (cook, skeptic, head chef). The part-blend above is design D. The head chef reviewer held that a blend is not better than A; the skeptic said it "might".

### The head chef's request after seeing A, B and C

In his own words: set a section per device, so a screen at Hot larder, Grill or Pans shows that section's cleaning, and on every other device show the cleaning list for the section the person is rostered on. That is own section first, which the council took from C, plus one new setting.

### D: your section first, nothing hidden (lead's draft)

Packet: [round2-followup.md](round2-followup.md). Previews: `previews/d-390.png`, `d-screen-390.png`, `d-tue-390.png`, `d-settings-390.png`.

The page opens on one section: a title with its name, "Section clean" (its weekly and monthly jobs due today, each saying how often), then "Pack down" (its numbered steps, then its new nightly jobs) with today's floor reminder kept. Then Shared kitchen, then every other section, then Floors after shelving. Nothing is folded.

- On a person's own device the section is theirs today: `mySec()` already gives it from the Today's team plan or their own pick. No new read.
- On a shared kitchen screen with "This screen's section" set, that section leads whoever signs in, and the page says so.
- With no section (a head or sous chef, Pass, Prep, a screen with none set) the page keeps today's order with A's words.
- The setting is one Settings row on a shared screen, changed by the head chef only, kept on the device beside `lk.device.v2`: no read, write or rule. It orders the Cleaning page and nothing else. The screen still needs a PIN and still locks.

| 390 x 844, Monday, Preview | Today | A | D |
| --- | --- | --- | --- |
| Whole jobs on the first screen | 5 | 4 | 4 (3 before the trim) |
| Page length, phone screens | 4.9 | 5.7 | 5.8 |
| Screens down to "Clean the drawers" | not in the book | 0.7 | 0.5 |
| Screens down to Grill pack down | 2.9 | 3.8 | 0.7 |

D costs one whole job on the first screen against today (the section title and two headings take the room) and saves 2.2 screens of scrolling to the cook's own Pack down. Open in D when drawn, settled in step 2 (below): an explicit link between a kitchen section and its cleaning groups (the previews match by name, which the contract bars); Fryers and Salads and dessert are two sections with one list; fryer shutdown is a Hot larder step.

Review status: a lead synthesis with a focused follow-up from three reviewers, below. Not a council-endorsed design.

### Follow-up on D (skeptic, keeper, cook)

The same three reviewers, continued with their round 2 context, saw D before it was trimmed.

| Reviewer | Recommended | Main point |
| --- | --- | --- |
| Skeptic | D in two steps: A's words plus own section first on personal devices, with the reminder cut back; the screen's section only after the explicit link exists | First screen 5 jobs to 3 with no stated reason; "typing in does most of it" gets worse |
| Keeper | A's words and headings first; D's ordering as a second pull request once the section link is designed; the screen's section last | No new read if the link lives in a document already loaded; about three new client tests and a read-budget line |
| Cook | D, trimmed: the reason on the title line, the reminder one line, the link "Go to Pans pack down"; remeasure 4 jobs Monday and 3 Tuesday, or go back to A | He asked for section first and A cannot do it. Service-time Shared kitchen records move about a screen further down |

After the follow-up D was trimmed as the cook asked and remeasured (Preview, 390 x 844): 4 whole jobs on the first screen on Monday, 3 on Tuesday; the leading Pack down 0.7 screens down; the page 5.8 screens long. The one-line floor reminder is the lead's proposed wording, not the head chef's. The reviewers have not seen the trimmed D.

Break-it findings on D, all Risk / Not evidenced:

| Scenario | Expected | Hypothesis | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- |
| A section is renamed or removed, or a Fryers cook opens Cleaning (skeptic, keeper) | The right section still leads | The previews match by name, so no section or the wrong one leads, silently | An explicit link set by a chef, keyed by section id; a client test with a renamed and a removed section; the page says when no section is linked | Must be designed before step 2 |
| A cook is moved from Grill to Pans mid-shift (skeptic, keeper) | Pans leads | The page still leads with Grill and says "Your section today". By source `mySec()` prefers the plan over the pick, but the plan is read with a maximum age, not live | A client test that changes the plan after the pick, then reopens Cleaning | Check in step 2 |
| A station tablet is carried to another station, or its site data is cleared (skeptic, keeper) | The page says which section it is set to, or that none is set | The wrong section or none leads until the head chef resets it | A client test for set, clear and Forget this device, and that a cook cannot change it | Low impact: nothing is hidden and the title names the section. The head-chef-only limit is on the device only; no rule enforces it |
| A Pans cook at the Grill screen starts Grill's list (cook) | The cook finds their own Pack down | Small grey words are the only cue; their Pack down is about 4.2 screens down | The link reads "Go to Pans pack down" | Drawn in the trimmed D; not exercised |
| A cook reads a station screen mid-service (cook) | The list | After 10 idle minutes the screen shows the PIN screen, and each tick on a shared screen asks who did it (`openPicker` in `js/cleaning.js`, source read) | None proposed: both are today's shared screen rules | Told to the head chef |
| "Floor checks follow this list" under the leading Pack down (cook) | True words | False once Shared kitchen and other sections follow | Reword | Reworded in the trimmed D as proposed wording |

### Contract fit (round 2)

| Check | A | B | C | D |
| --- | --- | --- | --- | --- |
| Surface purpose (steel work book, quiet paper) | Works: no new surface | Works | Works | Works |
| State meaning and words | Works: state words unchanged | Needs work: state wraps mid-phrase | Needs work: closed rows hide state; 0/52 beside 10 rows | Works on the open rows; Not evidenced when ticked |
| Pack down numeric order (`docs/cleaning-chef-options/implementation.md`) | Works | Needs work: lifts steps out | Works inside a section | Works; new nightly jobs follow the steps |
| Hot larder, Grill, Pans order and one Pack down block | Works | Works | Proposed change | Proposed change, for the head chef |
| `.cln-fold` is a chef pattern | Not relevant | Not relevant | Proposed change | Not relevant: no folds |
| Staff pages show today | Works | Works | Works | Works |
| Real contrast | Preview, light, sampled by the screen designer: headings 4.76:1, small line 6.73:1, count on steel 3.89:1 (large). Dark, focus, pending, done, disabled: Not evidenced | the same | the same | Not evidenced |
| Relevant states | Not evidenced: only To do is drawn | the same | the same | the same |
| Service continuity | 5 to 4 whole jobs; no new tap | 5 to 4 | 5 to 4; one more tap for shared jobs | 5 to 4 after the trim; no new tap |

Before ready, on the implemented app at 390, 768 and 1280 px: tick, Undo, a held and a refused save, Not sent, Done and Missed rows, a wrapped small line gaining the worker and time without the row jumping, Extra large text, dark mode, focus, a cook with no section, a day with no weekly job.

### Reference fit (round 2)

| Principle | A | B | C | D |
| --- | --- | --- | --- | --- |
| Things 3: today's rare work apart from the nightly | Needs work: scattered by section | Works, at the cost of ownership | Works inside a section | Works inside each section |
| Airbnb: rhythm, place and state together | Works | Works, but wraps | Works | Works |
| Flighty: what matters now and next, honest status | Needs work: opens on another section | Works for rare jobs | Needs work: status hidden | Works: own section first, nothing hidden |
| Headspace: one name per thing | Works | Needs work: "Every night" over daytime jobs | Needs work: "Show" against the chef's "Open tasks" | Works |
| Duolingo: truthful progress | Works | Works | Needs work: "10 jobs" | Works: no count claimed |
| Todoist, Linear | Not relevant: no adding, no new frame | | | |

### Break-it findings (round 2)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| Shared tablet, section chosen by an earlier cook; the next cook opens Cleaning (C) | The next cook sees their own jobs | Hypothesis: their jobs sit behind Show | Risk / Not evidenced | A handover fixture | Removed with the folds; D keys the lead section to the person signed in or the screen |
| A closed row over jobs that are Missed, Not sent or Awaiting Pass check (C) | The state is seen | Hypothesis: hidden until opened | Risk / Not evidenced | No folds | Fixed in D |
| A small line that wraps, then gains the worker and time on tick (A, D) | The row does not jump | Hypothesis: row height changes against the notebook pattern | Risk / Not evidenced | Tick at 390 px and Extra large text | Check before ready |
| The 28-day job with an unset start date | The chef is told | Never due, nothing prompts | Risk / Not evidenced (source read) | A "needs a first date" count; rules emulator: unset anchor | Carried from round 1 |
| Today only on a Sunday or a drip tray day (B) | Pack down keeps its order | By the preview's own rule the Sunday OZ tank step and the two-day drip tray leave Pack down | Checked in `previews/build.cjs`; Monday does not show it | Do not build B's block | B not recommended |
| Fridge doors | One record of one job | The new Fryers and Hot larder door jobs sit beside the daily general fridge task, which names doors | Source read (`c04` in `js/cleaning-schedule.js`) | The head chef says whether doors are their own job | Added to the open questions |

Discounted: the skeptic's scenario that Your section today opens over Cleaning. The packet wrongly tied the sheet to cleaning tasks. The book asks it once a day after the PIN whenever kitchen sections exist, on any page; that is today's behaviour.

Corrected: the packet said the 28-day job opens its details first. By source its box is a one-tap box (`flow-quick` in `js/cleaning.js`) and only its words open the method (screen designer). Not exercised.

### Recommendation

**Recommend D, trimmed, built in three steps.** It is the only design that does what the head chef asked for after seeing A, B and C: a section first, per person and per screen. It keeps what the reviewers took (rhythm words, 6 of 6; clear headings; nothing folded, 5 of 6) and drops what they rejected (B's top block, 6 of 6; C's closed rows, 5 of 6).

1. **The jobs and the words (this is A).** The head chef's jobs that are not already in Pack down, one tap each, with how often said on the row, the paired headings, monthly jobs as repeats with a "needs a first date" count, and a Cleaning line in the read budget. Nothing is loaded with a guessed day.
2. **Your section first.** The page opens on the person's section today, with an explicit link between a kitchen section and its cleaning groups, set by a chef. No name matching.
3. **This screen's section.** The Settings row on a shared kitchen screen.

Why it beats A: it is what the head chef asked for, and A cannot do it (cook). The cook's own Pack down is 0.7 screens down in D against 2.9 today and 3.8 in A, with the same 4 whole jobs on the first screen as A, and nothing hidden (Preview). The cook and the head chef reviewer both said the scroll figures overstate the saving: the existing Go to Pack down link already takes a cook to Pack down in one tap (not exercised). So D's case rests on the request first and the scroll second. Things 3 and Flighty fit it: the section's rare work beside its nightly work, and what matters to this person first.

Main downside: Shared kitchen records made during service move about a screen further down, the page no longer looks the same on every phone, and it is three pull requests where A is one or two.

Still open and not hidden by the ranking:

- The section link is not designed. Step 2 does not start until it is.
- The first screen holds 4 whole jobs against 5 today (3 on a day when the first job's words take two lines). The reason given under service rule 4: the cook's own Pack down comes 2.2 screens closer.
- Moving sections out of the Hot larder, Grill, Pans order and splitting the one Pack down block departs from the approved cleaning layout. It is the head chef's choice.
- A station screen still asks for a PIN, locks after 10 idle minutes and asks who did each job. D does not change that.
- No state but To do has been drawn, and nothing has been ticked. The checks under Contract fit come before ready.
- One design choice left for the head chef: on a station screen, the rest of the kitchen open below the screen's section (D as drawn, 5 of 6 against closed rows), or closed there. His words were to show "the corresponding cleaning tasks for that screen".
- Disagreement: the head chef reviewer held that a blend is not better than A and would type the weekday jobs in and run two weeks first. The keeper would build A before D's ordering. Steps 1 to 3 follow that order, so stopping after step 1 leaves A.
- The trimmed D and its numbers are the lead's, measured after the follow-up. No reviewer has seen them.

### Asked by the head chef after the recommendation

Can jobs with a day come up on that day, and can the head chef, sous chefs and admin enter and change tasks in every section with a day picker? Both are in the book today (source `27ae8275`, checked on the stand-in, `previews/today-add-task-390.png`): Cleaning, Repeat tasks, Add cleaning task has What needs cleaning, Area or equipment, Responsible section (Shared kitchen or any kitchen section) and Repeat on with a chip for each weekday; Edit and Archive sit beside each task. A task shows only on its days. Not there today: a new task that repeats every so many days (only a loaded built-in task can), and one list for two sections. So step 1 needs no build for the weekday jobs: only the words on the row, the monthly repeats, and a ready-made list to load if the head chef does not want to type them.

### Chosen

**D, in three steps, 25 November 2026.** The head chef: "implement the tasks I have given you for now with the recommended design". Step 1 is built first: the jobs and the words. Steps 2 and 3 (your section first; This screen's section) are their own pull requests. The station screen choice (the rest of the kitchen open below, or only the screen's section) is still his to make before step 3.

Changed from the previews while building step 1, with the reason:

- The loaded jobs belong to a kitchen section, chosen by the chef for each group when loading, not to a name prefix. A job the head chef types in Add cleaning task and a loaded job then sit in the same group, and step 2 has its link by section id. A group with no section chosen loads under Shared kitchen.
- A line the list gives to two sections (the Wednesday shelf above the pass, the monthly clean behind the deep fryers) is one Shared kitchen job that names both, with a note for the chef to set one owner.
- Pack down group headings stay as they are under the Pack down title (head chef reviewer).

### Built: step 1 (25 November 2026)

Twenty-one jobs in `sectionClean` (`js/cleaning-schedule.js`): Grill 3, Pans 3, Fryers with salads and dessert 5, Hot larder 7, shared 3. Loaded by a chef in Repeat tasks, **Load section cleaning**, with a kitchen section chosen for each group. [The contract](../cleaning-schedule.md#section-cleaning-25-november-2026).

Every one of the 49 lines, by its number in the [proposal](proposal.md), and where it went:

| Where it went | Lines | Count |
| --- | --- | --- |
| Loaded, 21 jobs | Grill 5, 6, 10 (wipe under the meat sticks), 12. Pans 4, 5, 6, 8. Fryers 5, 7, 8, 9, 11, 12. Hot larder 1, 3, 4, 7, 8, 9, 10, 11. Everyone: decant sauces | 23 |
| Already in Pack down or the general list, not loaded | Grill 1, 2, 7 and the screen in 10. Pans 1, 3. Fryers 1, 6 (the daily general fridge task names doors), 10. Hot larder 2, 5 | 10 |
| Differs from a saved Pack down step, not loaded | Grill 3 (drip tray every night; saved: every 2 days). Grill 4 (OZ tank twice a week; saved: Sunday) | 2 |
| No day given, left for a chef to add | Grill 8, 9, 11. Pans 7, 9. Fryers 2, 3, 4, 13. Hot larder 6, 12. Everyone: the outside area and the takeaway containers | 12 |
| A standing rule, not a job | Pans 2 (no more foil). Everyone: keep the fridge and freezer tidy | 2 |

Two pairs of lines are one job each: Grill 6 with Pans 8 (the shelves above the pass, Wednesday) and Fryers 12 with Hot larder 4 (behind the deep fryers, monthly). Each is a Shared kitchen job that names both sections, with a note to set one owner. Fryers 6 (the fridge doors) was drawn in the previews as its own job and is not loaded: the daily general fridge task already names doors.

Measured on the **Implemented app** (the click tests' Firebase stand-in, source of this pull request, line cook on Grill, synthetic Monday 30 November 2026, 844 px tall, Barlow, Barlow Condensed and Caveat, both existing lists loaded, then the 21 jobs as a chef would load them; `implementation/measure.cjs`, `implementation/measurements.json`):

| | Before, 390 | After, 390 | Before, 768 | After, 768 | Before, 1280 | After, 1280 |
| --- | --- | --- | --- | --- | --- | --- |
| Jobs on the page that Monday | 46 | 53 | 46 | 53 | 46 | 53 |
| Whole jobs on the first screen | 5 | 5 | 7 | 5 | 8 | 5 |
| Page length, screens | 4.9 | 5.7 | 4.0 | 4.7 | 3.8 | 4.4 |
| Screens down to Grill pack down | 2.9 | 3.7 | 2.5 | 3.2 | 2.3 | 3.0 |
| Lines that say how often, cut off | 0 of 1 | 0 of 5 | 0 of 1 | 0 of 5 | 0 of 1 | 0 of 5 |
| Other small lines cut off (as before) | 4 | 4 | 0 | 0 | 0 | 0 |
| Sideways scroll, buttons under 44 px | none | none | none | none | none | none |

Taps to tick one of the new jobs: 1, exercised (`tests/cleaning-sections.test.js`), and the row does not move or change height when ticked. On a shared kitchen screen a tick still asks who did it, as before. Under service rule 4: a phone's first screen still holds 5 whole jobs, but a tablet and a laptop lose 2 and 3, and Grill pack down moves 0.8 screens further down on a phone, because the section groups sit above Shared kitchen as in design A. The reason it is worth it for now is that the weekly and monthly jobs are in the book at all; step 2 brings the cook's own section, with its Pack down, to the top.

Differences from the preview of A: the headings under the Pack down title keep their names; the rows are planned rows, so the words open the method and the box is the one tap; a group's long name ("Fryers, salads and dessert") makes that group's small line wrap to two lines.

Checked on the Firestore emulator (`tests/rules`, `client-shapes` and `cleaning`): one Load batch with a job saved to a kitchen section, an undated 28-day job and a shared job is allowed for the owner, the kitchen admin and a sous chef, and refused for staff, a lead, view only, Functions only and the shared tablet; 312 client shape rows and 742 cleaning rule checks pass. No rule changed.

Exercised in the click tests: load, the offered and chosen sections, loading twice, the first date notice and setting a date, the row at three widths, one tap and Undo, a held save reading Not sent, the chef's groups and editor. Not exercised: two chefs pressing Load at the same moment (the second batch would be refused, since each task is a create; nothing is doubled, and that chef would see an error and Refresh), Extra large text, dark mode, keyboard focus order, contrast, a refused save on these rows. Not live: nothing is loaded in the real book until a chef presses Load.

A first date set to today does not bring the job up today: a change to a job starts tomorrow, so it first comes up 28 days later. The notice says to choose tomorrow or later.

The row's wrap is also set on the line itself, because the Cleaning page is lazy and can be newer than the stylesheet a phone has saved.

### Built: step 2, your section first (26 November 2026)

For a cook, Cleaning opens on the section they are on today, as in the trimmed D: the section's name with "Your section today", Section clean, Pack down, then Shared kitchen, Rest of the kitchen and floors, nothing folded. [The contract](../cleaning-schedule.md#your-section-first-26-november-2026-step-2).

**Quick check on the Pack down link (lead, 26 November 2026; a small change inside the chosen design, so no new round).** The follow-up asked for an explicit link set by a chef, never a name match. Two ways were costed. A stored field in `config/main` needs a rules change published first, and only the verified admin could set it. The section a chef already chooses for each group at Load is by id, is saved on the loaded jobs, and needs no storage, rule or read. Chosen: the second, with three conditions from the break-it findings: the link holds only while every job of the group in force is in the same live section (never the most common one); Repeat tasks says which section each Pack down opens with and which is not tied; and a group that is not tied stays with the rest under its own name. Reference fit: Todoist (a known default that is visible and can be changed, nothing guessed from text), Headspace (one name per thing). Contract fit: no fuzzy matching, no new read, no rule. Its cost: a kitchen that never loads the section jobs has no link, so there only a section's own typed jobs lead.

Also settled while building, from the follow-up:

- One place per job in both staff layouts: where a Pack down is tied to a section, that section's own nightly jobs follow its numbered steps. Step 1 had them under "section clean"; they moved, for every cook on the staff page, so a job does not sit under a different heading depending on which cook is looking. The chef's grouped view is unchanged.
- The leading section is fixed when the list is read, not on a redraw. Found before ready: on a real shift the section often arrives after the list is read, so the page stayed in the usual order until Refresh. Repaired: when none was known at the read, the first section that becomes known is taken once, never while a tick is sending. The check for it fails on the code before the repair (1 failed of 108) and passes with it (0 of 109).
- "Floor checks follow this list" would be untrue under the leading Pack down, so the reminder there is one line: "Overhead shelves and frames first. Floors are last." The usual order keeps the old words.

Measured on the **Implemented app** (the same stand-in, day, fonts and data as step 1; `implementation/measure.cjs`: "before" is a Grill cook before the section jobs, "usual" a cook on Prep with them loaded, "section first" a Grill cook with them loaded):

| 390 x 844 | Before | Usual order | Section first | Trimmed D preview |
| --- | --- | --- | --- | --- |
| Jobs on the page that Monday | 46 | 53 | 53 | 54 |
| Whole jobs on the first screen | 5 | 4 | 4 | 4 |
| Page length, screens | 4.9 | 5.6 | 5.6 | 5.8 |
| Screens down to Grill pack down | 2.9 | 3.5 | 0.7 | 0.7 |
| Lines that say how often, cut off | 0 | 0 | 0 | not measured |
| Sideways scroll | none | none | none | none |

At 768 and 1280 px, section first shows 6 whole jobs on the first screen (7 and 8 before the section jobs) with Grill pack down 0.7 screens down (2.5 and 2.3 before). The usual order now shows 4 whole jobs on a phone, one fewer than step 1 measured, because the nightly Grill job moved under Pack down and the next heading takes its room.

Exercised in the click tests (`tests/cleaning-sections.test.js`, 109 checks): a cook with no pick answering Your section today, a cook whose section comes from the Today's team plan, the order of every heading at three widths, the rows under Section clean and Pack down, the kick oven door after the Pans steps, Go to Pack down, a tick in the leading section with no row or heading moving, a move to another section holding until Refresh, the link with one job moved, the group left on Shared kitchen, a renamed section and a removed one, and the setup line. Checked in source, not exercised: a second cook signing in on a shared screen (the page starts again with a new read). Not exercised: a plan changed by a chef mid-shift (the cook's own move is), Extra large text, dark mode, focus order, contrast. The reviewers have not seen the built page.

### After step 3

The head chef, 26 November 2026, on a new name for the tab: "wait until all other steps are done and then we can brainstorm name and design again". Names tried on the tab bar are in `docs/head-chef-decisions.md`.

