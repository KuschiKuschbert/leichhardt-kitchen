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

Three figures above came from reviewers' own throwaway scripts. Each is now an option in `previews/planner.js` (37 node checks, defaults untouched) and a column in `previews/many.js` (2,000 random weightings, seeded).

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

## Round 2

Three whole designs are drawn inside the book's real pages (`designs/`, built by `designs/build.cjs`): A, on the job; B, one list; C, set up once. Their descriptions, the differences table and the counts are in [round2-packet.md](round2-packet.md). Six fresh reviewers are scoring them. No recommendation yet.

## Open with the head chef

1. "Not all tasks for that section": the jobs that come round only, or nightly Pack down too? Five of six reviewers would flag only the jobs that come round, and three said to ask you.
2. Are Sunday, Monday and Wednesday days that take heavy jobs? That is the lead's reading.
3. "Not just limited to tasks that happen more than once a day": every rhythm, or jobs done at each service?
4. A shared job that names a role ("Grill chef"): does it count toward that section's night and its results?
5. Who was on a section, for the record: the closing shift's plan, a cook's own pick, or both shown with their source?
6. Who sets the day levels and runs the plan: the admin, or the chefs who manage cleaning jobs?

## Chosen

Not chosen yet. The head chef decides.
