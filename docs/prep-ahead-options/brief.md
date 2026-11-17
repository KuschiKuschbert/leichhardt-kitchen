# Prep lines for a later day

## Status

Study only, 17 Nov 2026. Round 1 and round 2 of the service council are done; the head chef has not chosen yet. Nothing in the app has changed. Evidence: [packet](packet.md), `baseline/`, `design-*/`, `preview-measurements.json`. This is role-based analysis with fresh agents, not research with staff.

The request (head chef, 17 Nov 2026): "I'd like to add the possibility to put items on the preplists for days in the future."

## Baseline (Implemented app, main `70ce8f4`, click-test stand-in, synthetic data, 390 x 844, 14:00 Wednesday 18 Nov)

- Staff see only today on Prep. The head chef and sous chefs have a day row (`‹ Today [date] ›`) and can open any day, but on any day other than today the add form is not drawn: "You are looking at Saturday. Lines are added on Today only." (`baseline/chef-ahead-3.png`).
- The rules already let the head chef, sous chefs and function managers write any day; staff write yesterday, today and tomorrow (`nearDay()`, `lineWho()`).
- Tomorrow's list is written tonight on today's page; lines after the night list's start sit under **Tonight, for tomorrow** and leave today's counts.
- Taps to add a line for today: **Add a line**, type, **Add** (2). For a day 3 days ahead: **not possible**.
- Rows fully above the Add a line bar at 390 x 844 (fixture of 6 lines): staff 5, sous chef 4 with app fonts blocked by the stand-in (`baseline/measurements.json`); staff 6, sous chef 5 with the preview fonts (`preview-measurements.json`, `before`). Compare like with like.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** Fresh agents: the cook mid-service, the head chef, the skeptic, the new starter and the keeper of the book, each with the [packet](packet.md).

What all five cut or kept:

- **Chefs only** (head chef and sous chefs). No rules change: `lineWho()` already allows it. Staff's page and Add sheet stay exactly as they are (Things 3: a later day is its own place).
- **No list of waiting lines on today's page** in the first build: it costs reads every day on every chef phone (7 to 15 by the keeper's count) and goes stale (Flighty), and staff would ask "do I do this now?" (rule 3).
- **No day chip in the shared Add sheet** (cook, skeptic, keeper): it adds a row to every add, gives a way to send tonight's gravy to Saturday, and `openTwin()` checks only the day on screen, so a Friday line would fold into today's twin.
- **Name the day everywhere** (Duolingo, After the tap): the sheet title, the slip and, on the day, the line ("Planned by Sam, Mon").
- **Repair the rollover first**, in its own pull request, with the reproduced failure as its failing test (keeper).

Disagreement, one line each:
- Skeptic: only from the **day after tomorrow**; tomorrow stays on tonight's list, or the night crew writes it twice (the merge needs matching amounts). Others did not restrict tomorrow.
- Keeper: a **staged release**: the repair first, then adding on later days only once phones run the repaired code, because a phone on old code that opens first after a closed day still loses lines.
- Cook and keeper: **Prep always reopens on Today** for a chef; today a chef's Prep stays on the last day opened.

### Break-it findings (round 1)

| # | Scenario | Evidence | Repair or check |
| --- | --- | --- | --- |
| 1 | A closed day nobody opens holds only a line written ahead. The next day's rollover takes that line only ("Rolled from Sam, Fri", the day it was written) and leaves the open lines of the day before behind for good. | **Reproduced** (stand-in, `break-rollover.cjs`, `baseline/break-rollover.json`) | A new field on lines written for a later day (not `ahead`, which already means "written tonight"). `rollSource()` skips it the way it skips a function's platters, the open lines of the skipped days roll too (not `rollGone()`), the field goes in `PAST_KEYS` for the `lk.past` fast path, and `firstDay()` names the day the line was for. Skeptic: the obvious one-line repair only moves the loss to the planned line. Client test from `break-rollover.cjs`, with and without `lk.past`, failing on main first. |
| 2 | On its day a line written days before reads "Sam 16:05" at 14:00, is the oldest line, sits first in its section and is picked as **Waiting longest** with a Start here number. | **Reproduced** (stand-in, `baseline/staff-day-arrives.png`) | Byline "Planned by Sam, Sun"; not picked as Waiting longest on its own day; sorted as written at the start of its day. Preview: `design-shared/day-arrives.png`. |
| 3 | A phone on old code (or with today's `lk.past` without the field) opens first after a closed day. | Risk, checked in source | Staged release (keeper). |
| 4 | Lines on later days are in no backup: `scripts/nightly-backup.mjs` reads only today and earlier. A restore silently loses the plan. | Checked in source (keeper) | Read 14 to 28 days forward in the backup (about 14 to 28 reads a night when empty). Node test of the day list. |
| 5 | The night crew cannot see a line a chef put straight on tomorrow and writes it again with another amount: both stay, prepped twice. | Risk / Not evidenced (skeptic) | From the day after tomorrow only. |
| 6 | Wrong day: the chef leaves Prep on Saturday and later adds what was meant for today. | Risk, checked in source (cook) | Prep reopens on Today; the sheet title and slip name the day. |
| 7 | A line on a later day cannot be changed before its day: the line menu (`lineMenuOk()`) is drawn for today only. | Risk, checked in source (skeptic) | Chefs get Urgent, Remove and the ⋯ menu on a later day; no tick box before the day. |
| 8 | A write held with no signal to a later day. | Risk / Not evidenced | It shows in the Not sent band and Undo lands on the day the slip named. Click test. |

Also checked in source: the night list clock (`listStart()`) and `writtenLate()` count only lines written on their own day, so lines written ahead cannot fake a night batch.

## Agreed under every design (technical)

1. Rollover repair (finding 1) ships first, on its own, with its failing test. No adding on later days until it is out.
2. A new field marks a line written for a later day (name to settle in the build; never `ahead`). On its day the line reads "Planned by Sam, Sun", is not Waiting longest, and counts as written at the start of its day.
3. Head chef and sous chefs only (`canBrowse()`), no rules change. Emulator rows: a chef 7 days ahead is allowed, a staff member 2 days ahead is refused. `tests/roles.test.js` on a later day for each role.
4. From the day after tomorrow, up to 4 weeks ahead (head chef's call, below). Tomorrow stays on tonight's list.
5. Prep reopens on Today when a chef leaves it, at the 04:00 unlock and after a lock.
6. On a later day: no tick box (nothing is ticked before its day), Urgent, Remove and the ⋯ menu for chefs; "Saturday", not "saturday"; Handy says "Saturday is still to come", not "Nothing was ticked".
7. The nightly backup reads 28 days forward.
8. Reads on today's page do not change; `tests/read-budget.test.js` stays as it is.

## Round 2: three designs

Main task for every design: a sous chef on today's Prep (Wednesday 18 Nov) puts **Brine pork, 2 kg, Larder** on **Saturday 21 Nov**. Previews are the real page snapshots edited per design (`capture-previews.cjs`), synthetic data, the book's own CSS and the local copy of its fonts. A preview runs no app code: taps, slips, timing, reads and failures are not exercised.

### A. Open the day (changes the least)

The chef uses the day row they already have (`›` three times, or the date field) to open Saturday. Saturday's notebook page is the same page: its lines (no tick box yet), "2 lines planned" where the done count sits, a note "Planned ahead. These lines are on everyone's list on Saturday. Staff do not see them before.", and the docked button reads **Add to Saturday**. The Add sheet is today's sheet, titled **Add to Saturday 21 Nov**, with "For Saturday 21 November. Not on today's list." over the box; suggestions, proofreading, section and unit chips are the same. The slip in the sheet says "Added for Saturday 21 Nov: Brine pork to Larder" with Undo. Handy says "Saturday is still to come".

Screens: `design-a/later-day.png` (also `-768`, `-1280`), `design-a/sheet.png`.

- Pros: nothing new to learn; one add form for every day; the page itself says which day in its biggest words; no new reads (opening a day already reads it); smallest build.
- Cons: three taps of `›` (or the date picker) before adding; stepping through tomorrow on the way; nothing on today hints that later days hold lines.

### B. Plan ahead in the chef panel (rethinks the flow)

Planning moves off the service page into the chef panel, next to the section standards: Prep room, **Plan ahead** tab. A week of day buttons (Fri 20 to Thu 26, previous and next week) each say what is planned ("2 lines", "Nothing yet"). Under the chosen day: an add form that is always open ("Write a line for Saturday...", Section, Amount, Add), the slip under it, then the day's lines by section. On Prep a chef browsing Saturday sees the lines read only, with "Change them in the chef panel, Prep, Plan ahead ›".

Screens: `design-b/plan-page.png` (also `-scrolled`, `-768`, `-1280`, `-full`), `design-b/plan-slip-scrolled.png`, `design-b/prep-later-day.png`.

- Pros: a week at a glance with counts, so a chef sees which days already have a plan (Things 3 Upcoming); planning happens in the office, away from the line; the service page does not change at all.
- Cons: the most taps from Prep (chef hat, panel, Prep room, Plan ahead, day, Add); a second place to add a prep line, with its own form (Linear: one way to do one job); the counts cost reads (7 day reads, at least 7, each time the page opens); the day buttons' `‹ ›` measured 34 px wide in the preview.

### C. Day strip on Prep (removes the most friction)

The chef's day row becomes a strip that scrolls sideways: `‹`, **Today**, then Thu 19 to Tue 24 by name and date, and **Other day** (the date picker) at the end. It takes the day row's place, so today's page keeps its lines. Tapping Sat 21 opens Saturday as one plain column (no Handy page): "Planned ahead for Saturday 21 November. Staff see these lines on the day.", an add form already open at the top (no sheet), the slip under it, then the lines.

Screens: `design-c/today.png`, `design-c/later-day.png` (also `-768`, `-1280`), `design-c/later-slip.png`.

- Pros: one tap to any of the next six days; adding is two taps (day, Add); the day's name is on the strip, the title and the form; no new reads.
- Cons: the strip changes the day row every chef uses to look back at past days (`‹` stays, the date field moves behind Other day); Thu 19 (tomorrow) is on the strip but tomorrow is written tonight, so it must say so; a second add form shape (inline) next to today's sheet; on a phone only Today to Sat show before scrolling.

### On its day (every design)

`design-shared/day-arrives.png`: Thaw brisket, planned on Sunday for today, reads "Planned by Sam, Sun", has no Start here number and no Waiting longest; Slice onions is number 3 again. Before: `design-before/staff-day-arrives.png`.

### How they differ

| | A. Open the day | B. Chef panel | C. Day strip |
| --- | --- | --- | --- |
| Where you plan | Prep, on that day's page | Chef panel, Prep room | Prep, on that day's page |
| How you reach the day | Step with `›` or the date field | Week of day buttons with counts | Strip of named days, one tap |
| How you add | Today's Add sheet, named for the day | Inline form, always open | Inline form, always open |
| What a later day looks like | The notebook, Handy says still to come | Panel page, lines by section | One plain column |
| Overview of what is planned | None (open each day) | Counts per day for a week | None |

### Measured (Preview at 390 x 844 unless said; before is the implemented app through the same pipeline)

| | Before | A | B | C |
| --- | --- | --- | --- | --- |
| Taps to put Brine pork on Saturday (from Prep, typing not counted) | Not possible | 5: `›` x3, Add to Saturday, Add (date field: about 3 for the picker instead of 3 arrows) | 6 the first time: chef hat, panel, Prep, Plan ahead, Sat, Add; 2 more for each further line or day | 2: Sat, Add |
| Taps for a day 10 days ahead | Not possible | 5 to 6 with the date field | 5 to 6 (next week, day, Add) + panel | 4 to 5 (Other day, picker, Add) |
| Back to today | | 1 (Today), or leaving Prep | 1 (Prep tab) | 1 (Today) |
| Chef's today rows fully in view (fixture of 6) | 5 | 5 (unchanged) | 5 (unchanged) | 5 (strip is one row) |
| Staff's today rows in view | 6 | 6 | 6 | 6 |
| Later day: rows in view (2 planned) | 0 (cannot add) | 2 of 2 | 0 on the first screen, 2 after scrolling | 2 of 2, form open above |
| New reads | | None (opening a day already reads it) | About 7 day reads each time Plan ahead opens, plus 1 per line | None |
| Navigation levels from Prep | | 1 (that day) | 3 (panel, room, tab) | 1 |
| Build size (after the rollover repair) | | 1 pull request, small | 1 to 2, medium (new panel page and its reads) | 1, medium (strip, inline form, one-column day) |
| Relearning | | None | A second place to add prep | The day row changes |
| Rules change | | None | None | None |
| Under 44 px | | none new | `‹ ›` 34 px wide | none new |
| Sideways scroll | | 0 at 390, 768, 1280 | 0 | 0 |

Contrast, focus, reduced motion and the real slip timing are **Not evidenced** in previews.

## Round 2 scores

To come: six fresh agents (the five reviewers and the kitchen screen designer).

## The mix

To come.

## Recommendation

To come.

## Verification plan (before ready)

- The rollover repair's own pull request: the client test from `break-rollover.cjs` fails on main and passes after, with and without all seven past days in `lk.past`; a closed day with only planned lines, either side of midnight.
- Rules emulator: chef 7 days ahead allowed, staff 2 days ahead refused; a row in `tests/rules/client-shapes.test.mjs`.
- `tests/roles.test.js` on a later day for each role; staff never see a later day.
- Add on a later day: the slip names the day, Undo removes the right line, a held write shows Not sent and lands on the named day, an Add sheet open across midnight keeps its day.
- On its day: "Planned by" byline, no Waiting longest, sort order.
- Prep reopens on Today after leaving it, at 04:00 and after a lock.
- 390, 768 and 1280 px on the implemented app; `tests/read-budget.test.js` unchanged.
- Nightly backup's forward days: a node test of the day list.
