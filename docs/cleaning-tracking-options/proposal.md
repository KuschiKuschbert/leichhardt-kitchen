# Cleaning: results by section and planning the days. Proposal for the council restart

26 November 2026. Facts and pictures are from `main` at commit `0acdaf72`. No design is chosen and no application change is authorised by this note. It holds no recommendation.

The head chef asked for the council to start again: "Well I reckon we start again from scratch with the council With all the information we got now and the UI UX designer!" So this is one fresh proposal for one feature, the screen designer sits in both rounds, and round 2 will draw three whole designs. The first council's files are kept as `first-council*.md`. They are not evidence for this round.

## What the head chef has said

His words, exactly as typed, in order.

1. "For the cleaning tasks, can we implement smart tracking? And have the results in the admin panel somewhere? Also for all tasks that don't have a set damay, can you add a button on the admin side for a smart distribution so not all repeat tasks have to be done on all sections on the same day? And maybe even have Tha[ available for repeat tasks for more than one day?"
2. "Not just limited to tasks that happen more than once a day,"
3. "Cleaning schedule is not on, so we can start counting as soon as we have the cleaning on, I'd like to track instead who did, and who missed but in a fair way. No Friday or Saturday nights stay out of clear jobs, just don't get a heavy cleaning job, maybe let the chef crating the tasks set a ranking system for jobs from light time cost to heavy time cost in 3 steps and only allow light ones on Friday and Saturday and only like 10% of the while weeks tasks co oared to sunday to Wednesday tasks? I still want to be able to move other jobs that already have a day. And maybe even group similar tasks across sections to be on the same day? Eg, if section a cleans shelves on day X section b should have a shelv cleaning take on day X too."
4. "Ah okay, just make the section jobs a section problem, not the person's problem, but track in the background that if a person was on grill for example the night before to flag if not all tasks for that section have been done in the section."
5. "Oh yeah Thursday is a heavy cleaning day too, Tuesday is a medium cleaning day, let the admin set the heavy was of th days too. Nah my closes don't finish after midnight. I don't know which one to prioritise when the] clash, what would you recommend?"

His first ask for the section cleaning that came before this was that it be "nice and well designed".

### Decided by the head chef

These are his. The council argues their cost, risk and how they are done, not whether he may want them.

| | Decided |
| --- | --- |
| D1 | Cleaning is not switched on for the team yet. Counting starts when it is. |
| D2 | A missed section job is the section's problem, not a person's. Who was on that section is kept in the background. If a section's jobs were not all done the night before, it is flagged. |
| D3 | The results are in the admin panel. |
| D4 | Every job has a time weight in three steps, light, medium or heavy, set by the chef who creates the job. |
| D5 | Every weekday has a level, set by the admin. Thursday is heavy. Tuesday is medium. Friday and Saturday take light jobs only, and only about a tenth of the week's jobs. |
| D6 | A job that already has a day can be moved. |
| D7 | Similar jobs in different sections fall on the same day ("maybe even"). |
| D8 | A close never finishes after midnight. |

### The lead's readings, to challenge

| | Reading |
| --- | --- |
| R1 | Message 2 means the planning covers every rhythm a job can have (one day a week, several days a week, every few weeks, monthly), not only some jobs. |
| R2 | A day's level is the heaviest job that day takes. Sunday, Monday and Wednesday are heavy, from his "sunday to Wednesday". |
| R3 | "10%" means Friday and Saturday together hold at most a tenth of the jobs that come round in a week. |
| R4 | "Similar" needs each job to carry a kind (shelves, fridges, behind equipment). Today a job has free text "Area or equipment". |
| R5 | "When they clash" means same-kind days (D7) against an even week (his first ask: "not all repeat tasks ... on the same day"). |
| R6 | "Not all tasks for that section" in D2 means the jobs that come round, not the nightly Pack down. |
| R7 | "The admin" in D5 is the owner's admin sign-in. Chefs (head chef and sous chefs) manage cleaning jobs today. |

### Open, put to the council by name

| | Question |
| --- | --- |
| Q1 | When same-kind days and an even week clash, which wins? The planner numbers below show three orders. |
| Q2 | Which jobs does the morning flag cover: the jobs that come round only, or nightly Pack down too? |
| Q3 | "Who was on that section": the book already lets a cook's own pick beat the plan when it is made after the plan was saved. Is that the right rule for a record with names, and what of a cook sent home early? |
| Q4 | Who may read the results and the names: the admin only, or sous chefs too? |
| Q5 | Who sets the day levels and runs the plan: the admin only (his word for levels), or the chefs who manage cleaning jobs today? |

## The problem in the kitchen

- **Who:** the head chef, and the chefs who set up cleaning. The cooks on each section live with the result every close.
- **Today:** the head chef's list gives each section weekly and monthly jobs with a day he wrote down. Nothing says how long a job takes, so nothing stops a section drawing two long jobs on a Friday close. Jobs of one kind (shelves, fridges) fall on different days in different sections. He can see one day's cleaning at a time: no view of which section keeps missing which job.
- **How often:** the plan is set once before Cleaning is switched on, then when a job is added or the menu changes. The results are read most mornings.
- **If nothing is built:** he picks every day by hand in the job form, and reads Reports, Records day by day.

## The change, in three parts

No part says how a screen looks. That is round 2.

1. **The nightly count keeps more (no screen).** For each job that comes round: the job by its root id, its section, done or not, who did it, and who was on that section. Unable to complete stays outside the totals. The first night Cleaning is on is recorded. `CLEAN_V` goes up so earlier days are counted again once.
2. **Weights, kinds, day levels and a plan of the days.** A job gets a weight and a kind. Each weekday gets a level. The book proposes a day for each job that comes round, by stated rules, and a chef confirms before anything is saved. A job that has a day can be moved.
3. **Results by section in the admin panel, and a flag the next morning.** A missed job belongs to its section. Who was on is behind it, not beside it. Nobody has a total.

## What exists today (checked on `0acdaf72` unless marked)

**Cleaning jobs and setup**

- The chef's Cleaning page has Today, Week and Repeat tasks. Repeat tasks lists every job with Edit and Archive, 6 to a page, and one editor (Add cleaning task). The form has: what needs cleaning, area or equipment, responsible section, Repeat on (a chip per weekday), how-to guide. On a 390 px phone the form is 763 px tall inside a page 3.3 screens long (Implemented app, stand-in, `baseline/counts.json`).
- 72 jobs are loaded with all three built-in lists: the general schedule (26), Pack down (25) and the head chef's section jobs (21). Of the section jobs, 15 have one weekday, 3 are monthly with no first date yet, 3 are nightly.
- The rules fix a job's fields and need at least one weekday. A repeat is every 2 to 30 days from a first date. A new job starts the day it is saved. A change to a job starts exactly tomorrow: it closes one revision and opens another, and a past day's records never change.
- A job every 7, 14, 21 or 28 days keeps its weekday. A job on any other rhythm (every 2, 3 or 10 days) falls on a different weekday each time, so it reaches Friday and Saturday whatever its weight. The lists hold one such job: Change grill drip trays, every 2 days, a Pack down step.
- `docs/cleaning-schedule.md` says: "A line with no day is left for a chef to add in Repeat tasks; never guess one." Proposing a day is a change to that rule, asked for by the head chef.
- A cook opening Cleaning reads 81 documents against a budget of 90 (`tests/read-budget.test.js`). A moved job's old and new revision are both read on the day of the change. The Cleaning page has no listener: an open page shows a new job after Refresh.
- Cleaning is held back by its release switch. The nightly count does not look at that switch, so jobs loaded before switch-on would read as missed.

**Who did a job, and who was on a section**

- A tick on a personal phone records the signed-in person. A tick on a shared kitchen screen asks "Who did this?" and records the person picked, with the signed-in recorder kept too. So "who did it" exists for every tick.
- A shared screen can be set to one section (Settings, This screen's section). That changes which list opens. It does not change who a tick records.
- Each person's section for the day is known two ways: Today's team (the chef's plan, by shift) and the person's own pick after their PIN, saved as `shifts/<day>_<person id>`. On the phone, the plan's section counts unless the person moved themselves on that shift after the chef saved the plan (`mySecNow()` in `js/prep.js`).
- Not rechecked (a reviewer's source read in the first council): the plan keeps no time a cook was sent home or moved.

**The nightly count and the admin panel**

- At 03:00 the nightly job counts each finished day with the Cleaning page's own code (`cleanDay()` in `scripts/records-core.mjs`, `CLEAN_V` 1) and keeps it on that day's row of `analysis/dashboard`: due, done, missed (a number, and up to 8 names), unable to complete (up to 8, with the note), awaiting the Pass check. Names only: no job id, no section, no person. 90 finished days are kept. A day is counted once and carried.
- It counts record-every-time jobs as due and never as done, so a perfect day reads under 100%.
- `analysis/{id}` is read by the admin only (`firestore.rules`). Sous chefs cannot read it.
- Admin, Today, Inbox: rows for what needs the head chef, each with a state word and a button, then today's numbers. Admin, Reports, Records: a month of finished days, each with its cleaning count in words ("Cleaning: 2 missed, 1 not possible"), 1 read to open. A day the count has not reached says "Count not ready".
- A job the chef typed in has no Unable to complete: it is tick or nothing. Not rechecked (a reviewer's source read in the first council).

## What a planner does with his rules

A preview engine, not the book's code: `previews/planner.js`, one pure function with 32 node checks. It takes jobs with a weight and a kind, the day levels and the tenth, and returns a day for each job with the reason. Hard rules in every order: a day takes no job heavier than its level; Friday and Saturday hold at most a tenth; a section never gets two heavy jobs on one day; a job with no weight counts as medium, never light.

The head chef has set no weight and no kind. So one example proves little. `previews/many.js` draws 2,000 sets of weights at random (and, in the second block, kinds too), plans the book's own lists with each of three orders under his day levels, and compares each with the plan that keeps every day. Same seed, same numbers.

| Weights at random, kinds as one made-up example | Some section's heaviest night heavier than with days kept | None heavier, some lighter | No change | Heaviest section night in the kitchen, average | Dated jobs moved, average of 15 | Busiest less quietest day, Sunday to Thursday | Kinds found in 2 or more sections that get a shared day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Days kept: a job that has a day keeps it, new jobs go on a light day | 0% | 0% | 100% | 4.8 | 1.8 | 4.0 | 60% |
| Kind first: same-kind days, then the section's load | 75% | 11% | 14% | 5.0 | 9.5 | 6.1 | 99% |
| Section first: a job joins its kind's day only when its section's heaviest night gets no heavier | 3% | 92% | 5% | 3.5 | 8.3 | 3.7 | 90% |

| Weights and kinds both at random | Heavier | None heavier, some lighter | No change | Heaviest night, average | Moved | Busiest less quietest | Shared day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Days kept | 0% | 0% | 100% | 4.8 | 1.8 | 3.8 | 50% |
| Kind first | 80% | 10% | 10% | 5.0 | 9.5 | 5.7 | 97% |
| Section first | 9% | 87% | 4% | 3.5 | 8.5 | 3.7 | 88% |

Weight points: light 1, medium 2, heavy 3. "Days kept" still moves 1.8 jobs on average: a heavy job sitting on a medium Tuesday, or a job heavier than light on Friday.

Also from the planner:

- **No day fits.** In about 1 run in 16 a job could be given no day: a section with more heavy weekly jobs than the week has heavy days. The plan must say so and leave the job alone.
- **A new job proposed for today is due tonight**, because a new job starts the day it is saved.
- **While Cleaning is off a move costs nothing.** Once it is on, a moved job has one uneven week: in one example up to 13 days between cleans.
- **Planning again after a save moves no job** (checked for the section-first order on one example).
- **Leaving one proposed line out can break a rule** that the whole plan kept. A check that names the broken rule exists (`check()`).

## Cost

- **Part 1:** `scripts/records-core.mjs`, `scripts/analysis.mjs` and their tests. `CLEAN_V` up means one recount of the kept days (cheap while Cleaning is off). The dashboard record grows; its size over 90 days is not measured. Whether the nightly job already reads the day's team plan and picks is not checked.
- **Part 2:** a weight and a kind on a job need a rules change (the job's fields are fixed), or one small side record that the rules then cannot hold to "light only". Day levels need one small settings record. The planner as a lazy file with node checks, a click test file, and a read budget line. On the first council's emulator run, 2 and 5 moves in one save were allowed and 10 and 20 refused, with test jobs that carried no `plan`; 6 to 9 were not tried and a real job was not tried.
- **Part 3:** no new read if it rides on `analysis/dashboard`, which the Inbox and Reports already read once. Admin only as the rules stand.
- **Risk:** part 2 has the most states to build and test, for a page used at setup and now and then.

## Limits to say out loud

- A missed weekly job is not due again until its next day. A flag reports a miss. It does not get the job cleaned.
- A night is counted once at 03:00. A plan or a tick corrected later does not change it, unless that is designed.
- A cook who cleans and forgets to tick is recorded as a miss for the section, and never sees the flag.
- A job on a rhythm that is not whole weeks cannot obey a day level.
- Role-based analysis, not research with real staff.

## Baseline pictures

Implemented app at `0acdaf72`, click-test stand-in, synthetic data, the book's fonts. 390 x 844 and 1280 x 900. Each has a `-full.png` of the whole page. Counts: `baseline/counts.json`. Taken by `baseline/shots.cjs`.

- `baseline/chef-repeat-390.png`, `-1280.png`: the chef's Repeat tasks.
- `baseline/chef-form-390.png`, `-1280.png`: Add cleaning task, the whole form.
- `baseline/chef-today-390.png`, `-1280.png`: the chef's Today.
- `baseline/cook-today-390.png`, `-1280.png`: a cook's Cleaning day, 52 rows, 5.5 screens long at 390 px.
- `baseline/admin-inbox-390.png`, `-1280.png`: Admin, Today, Inbox.
- `baseline/records-month-390.png`, `-1280.png` and `records-day-*`: Admin, Reports, Records.

## Current contracts

From `docs/cleaning-schedule.md`:

- "Do not infer service counts or times. Do not invent temperatures, chemical mixing or procedures. Unclear instructions get a review note, not a guess."
- "A line with no day is left for a chef to add in Repeat tasks; never guess one."
- Edits and archives take effect tomorrow. New jobs start today. Earlier cleaning records stay as recorded.
- "A personal device records its own cleaner. Shared screens retain the existing worker picker and authenticated recorder."
- A shared screen "still needs a PIN, locks after 10 idle minutes and at 04:00, and each tick asks who did it."

From `docs/colour-coding.md`, the Cleaning row: "Green means done; pending explicitly says Not sent; Missed, Due and not-due dot have distinct words. Use shared failure red for errors and retain the chosen attention treatment for missed work. Preserve the today tint, week legend, repeat schedule and release toggle."

From `docs/surface-colours.md`: "Prep, Orders, Chef to-do, Drinks run, Cleaning and general work blocks share the work family. Team and people blocks share the people family. ... Recipes, instructions and form fields retain quiet paper."

From `docs/design-patterns.md`, the admin panel:

- "**The Inbox** ... is Today's first page (`.dsh-inbox`): today's numbers as tiles ..., then what needs the head chef. A new thing that needs the head chef is a row there, not a new page."
- "The Inbox puts what needs you first, each row with its state word and a button to where it is done (no picked-row pane), then today's numbers as one line each. ... Today's team not set is attention (`.dsh-tag-att`), not failure."
- "**A block** is a `.set-block` with a `.label` or an `h3.a-ch-h` heading (the page's chips read them)." "**A list that grows** goes through `lvHTML()`: search, filters, sort, Show more and phone cards come with it."
- "**At a glance** ...: a report page's findings first, as cards in the Dashboard's headline form ..., with one status line saying when the counts run to or that they are old."
- No hand-built long tables, no second sticky bar (`CLAUDE.md`, coding rules).

From `docs/smart-book-options/brief.md` (Records): the food safety count is the record as kept, "never rounded or judged"; a day the nightly run has not counted says "Count not ready".

From `CLAUDE.md` and `docs/coding-rules.md`:

- "The free plan stops the book for the day at 50,000 reads. Every new read says in a comment when it runs and what it costs. No reads in a loop." "A listener is only for today's live data."
- "Anything staff must not see is locked in `firestore.rules`, not only hidden on screen. Staff pages show today."
- "Never guess, never save nothing. No match, or more than one: show a card that says so. A Save with nothing to save is off."
- "Every action answers in its own frame and says what it did, by name."
- "No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK."

## Design references named for this proposal

- **Flighty:** real dates and honest status from data already kept (the flag's date, "Count not ready", a move's wait).
- **Todoist:** a known default that is visible and editable (a proposed day, a weight).
- **Airbnb:** a job's day, section, weight, status and next action together.
- **Things 3:** occasional detail tucked away (names behind the section, the rules behind the plan).
- **Duolingo:** progress shows real work, never points (no totals per person); each save answers truthfully.
- **Headspace:** one name per thing (kind beside "Area or equipment"; "Unable to complete" beside Records' "not possible").
- **Linear:** one frame and no second way to edit a job.
