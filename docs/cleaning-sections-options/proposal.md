# Section cleaning: proposal and evidence packet

25 November 2026. Source commit `27ae8275`. Round 1 of the service council. No design is chosen and no application change is authorised by this note. The head chef's answers to the open questions below are still to come.

## The problem

The head chef supplied a written cleaning list for four kitchen areas, one set of jobs per area, with a mix of nightly, weekday, weekly and monthly work. The Cleaning page today has two imported lists: 26 general tasks (`c01` to `c26`) and 25 ordered Pack down steps for Hot larder, Grill and Pans (`pd-*`). Neither holds this list. Cooks cannot see "my section's weekly and monthly clean" in the book, and the head chef cannot see whether it was done. Today it lives on paper or in heads.

Who has it: line cooks and the head chef, every service week. How often: nightly and weekly. What people do today: nothing recorded in the book.

## The supplied list (spelling tidied, no wording added)

Weekdays use the book's numbering: 0 is Sunday. "Open" means the list gave no day or frequency.

**Grill**
1. Clean the flat grill with grill cleaner. (Open frequency. Overlaps Pack down `pd-grill-10`.)
2. Brush the chargrill with a wire brush. (Open. Overlaps `pd-grill-01`.)
3. Every night take out the drip tray, clean it and hose it down. (Nightly. Clashes with `pd-grill-03`, every 2 days from 9 Nov, and overlaps the flat-top drip tray in `pd-grill-10`.)
4. 2 times a week, all grill elements in the OZ tank. (Days open. Clashes with `pd-grill-02`, Sunday only.)
5. Every Monday clean the drawers.
6. Every Wednesday wipe down the shelves above the pass. (Same as Pans line 8.)
7. Daily wipe under the grill and flat top. (Overlaps `pd-grill-04`.)
8. Shelves in the dishpit. (Open.)
9. Once a week sort the meat doneness sticks. (Day open.)
10. Wipe under the meat sticks and clean the screen with degreaser and sanitise, every day. (Overlaps `pd-grill-07`.)
11. Clean the wall behind the hand washing sink. (Open.)
12. Clean behind the grill once a month.

**Pans**
1. Every night take the stove tops off and clean, brush with a wire brush, take the drip trays out, scrub and hose down. (Overlaps `pd-pans-04` to `06`.)
2. No more foil. (A standing rule. Already in `pd-pans-05` and `pd-grill-03`.)
3. Every night take the resting rack above the grill and stove apart, put it in the oven, scrub the frame. (Overlaps `pd-grill-05` and `pd-pans-03`.)
4. Every night wipe down the kick oven door. (Partly new: `pd-pans-08` only turns the oven off.)
5. Every Tuesday pull the infill benches forward and clean both sides of the stove.
6. Once a month pull the stove forward and clean behind.
7. Once a week wipe out and sanitise the drawer fridge. (Day open.)
8. Every Wednesday clean the plate shelf above the pass. (Same as Grill line 6.)
9. Wipe down screens with degreaser and sanitise. (Open.)

**Fryers, salads and dessert**
1. Every night skim the fryers, clean the lids, wipe the front, check no crumbs lie on the resting surface in the fryer. (Overlaps `pd-hot-04`.)
2. Wipe down the oven, all sides and door, open the door and scrub the frame. (Open.)
3. Once a week, step up on [a step, wording unclear] and clean the top. (Which top is open. Day open.)
4. Clean the rack shelves under the oven. (Open.)
5. Every Thursday clean out the left fridge with the topper ingredients, wipe the bottom.
6. Every day wipe the doors of all fridges.
7. Every Monday clean the shelves with the takeaway containers, wipe down.
8. Every Tuesday clean out the salad fridge, wipe the bottom, clean the shelves.
9. Every Thursday clean the shelves under the microwave.
10. Every night clean the microwave. (The general `c06` microwave task is already daily.)
11. Every Sunday clean the shelves in the corner above the sink.
12. Once a month pull the deep fryers forward and clean behind them. (Same as Hot larder line 4.)
13. Wipe down screens with degreaser and sanitise. (Open.)

**Hot larder**
1. Every Monday clean out the fridges, wipe the bottom.
2. Every night wipe down all fridge doors and the impinger. (Overlaps `pd-hot-03`.)
3. Every Wednesday pull the impinger forward, clean the back of the pizza ovens and the wall behind them.
4. Once a month pull the deep fryers forward and clean behind them. (Same as Fryers line 12.)
5. Every night wipe out and clean the parmie ingredients tabletop fridge. (Overlaps `pd-hot-02`.)
6. Wipe down screens with degreaser and sanitise. (Open.)
7. Every Sunday clean down the shelves in the Hot larder section.
8. Every Sunday deep clean the coldroom floors.
9. Every Tuesday wipe down the oil drum from all sides.
10. Every Tuesday clean the rack trolley.
11. Every Thursday deep clean the oil filter machine.
12. Once a week empty out the fridges, clean the bottom. (Day open. May be line 1.)

**Everyone**
- Weekly: check the outside area, clean and reorganise the takeaway containers in the dry goods storage room. (Day open. One task or two is open.)
- Daily, for everyone: decant sauces into smaller containers.
- Keep the fridge and freezer tidy and organised. (A standing rule.)

About 37 distinct new jobs remain if every overlap with Pack down is skipped and the two shared jobs are each one task. This count is the lead's reading of the list, not a measured figure.

## Open questions for the head chef (not yet answered)

1. Skip the lines already in Pack down, or add them as separate jobs?
2. Drip tray: nightly or every 2 days. OZ tank: which two days.
3. A day for each "once a week" line with no day.
4. Is every "open" line daily?
5. Monthly: the book repeats every 2 to 30 days from an anchor date, not by calendar month. Proposed: every 28 days from a date the head chef sets. A repeat with no anchor date is never due, so it waits for setup.
6. The two jobs in two sections each become one shared job or two.
7. What the step in Fryers line 3 is, and which top it cleans.

## The change proposed

A third importable list, **Section cleaning**, beside the 26 general tasks and the 25 Pack down steps. Same pattern as Pack down: drafts in `js/cleaning-schedule.js`, stable IDs, an explicit chef Load button in Cleaning setup, no automatic seeding, nothing live until a chef loads it. Same checks, saves, audit trail, Pass rules, recurrence and Queensland clock. Staff would see each job on its due day grouped under its section. The design of that grouping is round 2's question. No new tab, top bar button or pop-up is proposed. "Nice and well designed" is the head chef's request: how a section's weekly and monthly work reads, what the frequency looks like on a row, and how it sits with Pack down.

Cost, from source reading: no new collection, no rules change (the shape already allows `repeat` with an empty anchor, 2 to 30 days, 12 checks, 1000 character method) and no new query (import is one bounded server query, then the normal two-query reload). Corrected after round 1 (the Keeper): no new query is not no new reads. `cleaningLoad()` reads every live task document on each Cleaning open or Refresh, so each new task is one more read per open per device, and the nightly backup and analysis read them too. `tests/read-budget.test.js` has no Cleaning line yet. The staff and chef grouping also need code: `packSection()` and `chefGroupId()` know only the `pd-` prefixes. The batch cap is 100 drafts per import and 500 task documents in all; after this list there would be roughly 51 + 37. Pinned counts (26, 25 and 51) in `tests/cleaning-schedule.test.js` and `tests/cleaning-chef-layout.test.js` would need new tests, not edits. The nightly Records count reads the same core, so new tasks join it. Likely 1 to 3 pull requests. Section ownership uses `area` and the template prefix, as Pack down does, not live section IDs, so "Fryers, salads and dessert" needs no live section to exist.

## What exists today (Source review, not measured)

- The staff daily view (`daily()` in `js/cleaning.js`) lists every due task, grouped by owning section or Shared kitchen, then Pack down (Hot larder, Grill, Pans), then floors. It has no folds. The chef view (`chefDaily()`) folds into five named groups, six rows a page, collapsed at start.
- Due on a day: general tasks 22 to 25 by weekday (162 task-days over the week) plus up to 25 Pack down steps (one Sunday only, one every second day). So a full day today is roughly 45 to 50 staff rows if both lists are imported. Whether the kitchen has imported them is not evidenced.
- At 390 px with native fonts the contract records 7 complete rows on the first phone screen (`docs/cleaning-schedule.md`). No baseline screenshot of the staff day with both lists loaded was taken for this round.
- Frequency is shown only as weekday chips in chef setup and "Every N days from date" in Repeat tasks. A staff row's meta line shows area and state, not how often the job comes round.

## Current contracts the reviewers must respect

From `docs/cleaning-schedule.md`:
- The schedule is unbranded. Imported responsibility text is guidance, never an access grant.
- Import is an explicit chef action. Deterministic IDs avoid duplicates. No fuzzy title matching, no automatic production seeding. Firestore is the source of truth after import; built-ins are never re-applied over a chef's edits.
- "The broad general tasks and section-specific closing steps may describe related physical work. They remain distinct records unless the chef explicitly revises the programme; ticking one must not silently claim that another task, service or verification was completed."
- An unset repeat anchor requires setup and never counts as due or completed.
- Do not infer service counts or times. Do not invent temperatures, chemical mixing or procedures. Unclear instructions get a review note, not a guess.
- Required checks come from the saved revision, client and server. Legacy single-tick jobs keep one tap and a two-minute Undo.
- Edits and archives take effect tomorrow. New jobs start today.
- The head chef's 9 November 2026 anchor for the two-day grill drip tray stands.

From `docs/cleaning-chef-options/implementation.md`: chef Today and Week use groups General cleaning, Hot larder, Grill, Pans, Final floor clean, collapsed, six rows a page, with search across all groups. Pack down steps keep numeric order. Grouping, search and pages are local over the bounded loaded range. No new query, listener, polling, schema or cache.

From `CLAUDE.md` and the service rules: Writing style is Australian English, no em dashes, only head-chef-confirmed content, anything else in `[square brackets]` and shown as "To come". Nothing from AVC Live beyond ingredient names. Held-back pages check `featOn()`. Every write goes through `W()`.

Colour and surface: Cleaning is in the steel work family with quiet paper writing surfaces (`docs/surface-colours.md`). Green means done, pending says Not sent, Missed and Due and not-due have distinct words (`docs/colour-coding.md`, Cleaning row). Cleaning notebook patterns are in `docs/design-patterns.md` (Cleaning notebook). `.cln-fold`, `.cln-packdown-group` and the `Go to Pack down` jump already exist.

## Evidence still needed

Baseline screenshots of the staff day at 390 px and 1280 px with both existing lists imported (synthetic fixture), and per-weekday due counts for the new list once the head chef's answers fix the days. Mark any reviewer claim about density Not evidenced until then.
