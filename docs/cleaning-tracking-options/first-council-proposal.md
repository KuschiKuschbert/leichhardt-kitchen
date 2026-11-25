# Cleaning: tracking and spreading the days. Proposal and evidence packet

26 November 2026. Source commit `91c5bc4b`. Round 1 of the service council. No design is chosen and no application change is authorised by this note.

## What the head chef asked

After section cleaning (steps 1 to 3, `docs/cleaning-sections-options/brief.md`), in his words:

1. "For the cleaning tasks, can we implement smart tracking? And have the results in the admin panel somewhere?"
2. "For all tasks that don't have a set day, can you add a button on the admin side for a smart distribution so not all repeat tasks have to be done on all sections on the same day?"
3. "And maybe even have that available for repeat tasks for more than one day?"

These are two proposals. Each gets its own verdict.

## Proposal 1: cleaning tracking in the admin panel

**The problem.** The head chef can see one day's cleaning at a time. He cannot see whether a weekly job has been missed three weeks running, which day or which jobs slip most, or whether cleaning is getting better or worse. Who has it: the head chef and sous chefs, weekly. What they do today: open Reports, Records, and read day after day, or nothing.

**What exists (source read).**

- Every night the 03:00 job counts each finished day's cleaning with the Cleaning page's own code (`cleanDay()` in `scripts/records-core.mjs`) and keeps it on that day's row of `analysis/dashboard`, as `fs.c`: jobs due, done, missed (`missN`, and up to 8 names in `miss`), unable to complete (up to 8, with the note), awaiting the Pass check, and how many record-every-time jobs had a record.
- The dashboard keeps 90 finished days. A day's count is worked out once and carried after that.
- A count holds job names only: no job id, no section, no person, and no more than 8 missed names for a day.
- Admin, Reports, Records shows these counts day by day (1 read to open, none more for a finished day's food safety part).
- The chef Week view on the Cleaning page shows the current week, job by job (it reads at most a week of completions).

**The change.** A cleaning summary for the head chef and sous chefs in the admin panel, built from the 90 days of counts the admin already reads:

- done out of due, by week, with the weeks side by side;
- the jobs missed most often, by name, with how many times;
- which weekdays slip most;
- jobs marked unable to complete, with the notes.

"Smart" would mean the page says the pattern in words, for example "Clean the drawers: missed 3 Mondays running" or "Tuesdays: 4 weekly jobs, the lowest finish rate".

**Cost as proposed.** No new read: the summary is arithmetic over a record the Reports pages already read once. One new block in the admin panel (`js/prep.js` or a lazy admin module), its tests, a line in the read budget. No rules change.

**What costs more, and is not in the base proposal.** By section, or by person, or "last done" for one job: the nightly count would have to keep each job's id, section and who did it. That changes `cleanDay()`, bumps `CLEAN_V` so every one of the 90 days is counted again once (the completions of the window read once that night), and makes the dashboard record larger. Naming people in a tracking report is also a head chef decision about the team, not a technical one.

**Limits to say out loud.**

- With more than 8 jobs missed on a day, the names past the eighth are not kept, so "most missed" under-counts on bad days. The whole numbers (`missN`) are always right.
- A weekly or monthly job that is missed is not due again until its next day. The book does not know it is "overdue". Whether a missed job should stay due is still an open question with the head chef.
- Tracking counts nothing until Cleaning is switched on for the team and the lists are loaded. Whether that is so in the live book is not known.

**Corrected after round 1.**

- "No rules change" holds for the admin only. `analysis/{id}` is read by the admin alone (`firestore.rules`), so a tracking page for sous chefs needs a looser rule or a second record (keeper, head chef).
- Done out of due cannot reach 100%. `cleanDay()` counts the record-every-time jobs (floors, food labels, mixers, bench tops) as due and never as done, so a perfect day with the built-in lists reads 46 to 49 of 50 to 53 (cook, new starter and head chef, each from a node run of `cleanDay()` on synthetic days). A rate must leave those jobs out.
- The 8-name cap drops the weekly job on a bad night: with a section's Pack down unticked, the weekly job's name was the one not kept (head chef, cook, new starter, node runs).
- The nightly count does not look at the team switch, so jobs loaded before Cleaning is switched on would read as missed (head chef, source read).

## Proposal 2: a button that spreads repeat jobs across the week

**The problem.** The head chef's list has weekly jobs with no day ("once a week sort the meat doneness sticks") and a twice-a-week job with no days. He does not want to pick a day for each by hand, and he does not want every section's weekly jobs landing on the same day. Who has it: the head chef, when setting up and when adding jobs. How often: at setup, then now and then.

**What exists (source read).**

- A cleaning job is saved with its weekdays. The rules and the page refuse a job with no day, so a job cannot be kept as "once a week, any day".
- Add cleaning task has a section picker and a day chip for each weekday. A chef can already choose several days.
- A change to a job's days starts tomorrow. Moved mid-week, the week it moves is uneven. Checked with the book's own `due()`: a Thursday job moved to Monday on a Wednesday is not due that Thursday, so 11 days pass between cleans; a Monday job moved to Thursday on a Tuesday is due twice that week.
- With the section jobs loaded, the weekday jobs fall: Monday 3, Tuesday 4, Wednesday 2, Thursday 3, Friday 0, Saturday 0, Sunday 3. Friday and Saturday are empty because the head chef gave no job those days.
- Yesterday's contract (`docs/cleaning-schedule.md`, Section cleaning): "A line with no day is left for a chef to add in Repeat tasks; never guess one."

**What the button would act on.** From his list: the five "once a week" lines with no day (meat doneness sticks, the Pans drawer fridge, the step and top, the second Hot larder "empty out fridges", the outside area with the takeaway containers), the OZ tank "2 times a week", and the three monthly jobs that wait for a first date. The seven lines with no frequency at all cannot be spread: nobody has said how often.

**The change.** In Repeat tasks, a chef says how often a job happens (once, twice or three times a week) without choosing days, and taps a button. The book proposes days for the chosen jobs so that each section's jobs, and the kitchen's jobs as a whole, are spread over the week, and a job on several days has its days apart. The proposal is shown as day chips the chef can change. Nothing is saved until the chef confirms. The same button could be used on jobs that already have days, to rebalance the ones a chef selects.

This is a deliberate departure from "never guess a day", asked for by the head chef: the book would propose a day, and a chef would confirm it.

**Cost as proposed.** No new read and no rules change: the proposal is worked out from the loaded jobs, and what is saved is an ordinary job with ordinary days. One pure function (same jobs in, same days out), a new control in the Repeat tasks editor, and tests. The five lines with no day would need a home before they have days: a short list in setup, "Jobs waiting for a day".

**Limits to say out loud.**

- The book does not know which days are busy. It would need the head chef to say which days to keep clear (today Friday and Saturday hold no weekly job).
- Moving a job that already has a day changes that week's rhythm, as measured above.
- A proposed day is not a confirmed day until a chef accepts it. The page must show which is which.

**Corrected after round 1.**

- "No rules change" holds only for the final save. The rules need at least one weekday on a job and a fixed list of fields, so "once a week, no day" and a "Jobs waiting for a day" list have nowhere to be saved (keeper, skeptic, head chef).
- The weekday load counted section jobs only. With all three built-in lists the jobs that are not nightly fall Sunday 7, Monday to Thursday 4 each, Friday 1, Saturday 0 (cook, source count), so an even spread heads for Friday and Saturday.
- Only two of the six weekly lines are ready to load: the meat doneness sticks and the Pans drawer fridge. The step is unclear, the second Hot larder line may be Monday's job, the outside area may be two jobs, and the OZ tank is already the Sunday Pack down step, whose method says "Every Sunday" (`docs/cleaning-sections-options/first-council-proposal.md`; cook, new starter, head chef).
- New jobs start today and moved jobs tomorrow, so a job confirmed on a Friday night with Friday chosen is due that night (cook, new starter, source read).
- A move closes one revision and opens another. Both are read on the day of the change, and Cleaning opens at 81 reads against a budget of 90 (keeper, source read).

## Baseline pictures

Existing pictures of the implemented pages, taken when each was built (not retaken for this round):

- Records, the month: `docs/smart-book-options/built/records-month-1280.png` and `records-month-390.png`. Records, one day: `docs/smart-book-options/built/records-day-1280.png` and `records-day-390.png`.
- The chef's Repeat tasks: `docs/cleaning-chef-options/implementation/chef-repeat-1280.png` and `chef-repeat-390.png`. The chef's Today: `chef-today-1280.png` and `chef-today-390.png`, and the chef's Week: `chef-week-1280.png` and `chef-week-390.png`, in the same folder.
- Add cleaning task, with the section picker and day chips: `docs/cleaning-sections-options/previews/today-add-task-390.png`. The Load panel: `docs/cleaning-sections-options/implementation/chef-load-390.png`.

No measurement was taken for this round. Any claim about density or taps is Not evidenced.

## Current contracts the reviewers must respect

From `docs/cleaning-schedule.md`:

- "Do not infer service counts or times. Do not invent temperatures, chemical mixing or procedures. Unclear instructions get a review note, not a guess."
- "A line with no day is left for a chef to add in Repeat tasks; never guess one."
- Edits and archives take effect tomorrow. New jobs start today. Earlier cleaning records stay as recorded.
- A repeat with no first date is never due and never counted.
- A past day's cleaning records cannot change. `firestore.rules` keeps its own check of a due day: the page and the rules change together.

From `CLAUDE.md` and `docs/coding-rules.md`:

- "The free plan stops the book for the day at 50,000 reads. Every new read says in a comment when it runs and what it costs. No reads in a loop."
- "Totals that every phone needs from many past days are worked out by the nightly job into one small record that phones read once a day."
- "Staff pages show today. Past days, totals and corrections live in the admin panel for the head chef and sous chefs."
- "Anything staff must not see is locked in `firestore.rules`, not only hidden on screen."
- "Never guess, never save nothing. When no item matches, or more than one does, show a short card that says so."
- Admin panel: "A new block gets a `.label` or `h3.a-ch-h` (the nav chips read them). Lists that grow go through `lvHTML()`. No hand-built long tables, no second sticky bar."
- "No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK."

From `docs/smart-book-options/brief.md` (Records, chosen and built 13 November 2026): the food safety count is the record as kept, "never rounded or judged"; a day the nightly run has not counted says "Count not ready".

Colour and surface: the admin panel uses the Chef's Desk look; Cleaning is in the steel work family with quiet paper writing surfaces (`docs/surface-colours.md`). Green means done; Missed, Due and not due have distinct words (`docs/colour-coding.md`, Cleaning row).

## Open with the head chef

1. Is Cleaning switched on for the team, and are the lists loaded? Tracking has nothing to count until then.
2. Should tracking name people, or only jobs, sections and days?
3. Which days should the button keep clear of weekly jobs?
4. Should a missed weekly or monthly job stay due until it is done?
