# Prep lines for a later day

## Status

Chosen and built, 18 Nov 2026: the head chef chose the mix. Round 1 and round 2 of the service council are done. After round 1 the head chef added "But only for admins" (see Admin only). Nothing in the app has changed. Evidence: [packet](packet.md), `baseline/`, `design-*/`, `preview-measurements.json`. This is role-based analysis with fresh agents, not research with staff.

The request (head chef, 17 Nov 2026): "I'd like to add the possibility to put items on the preplists for days in the future."

## Chosen and built (18 November 2026)

The head chef: "Go with the mix" (after "But only for admins"). Taken as the recommended defaults: admin as read here (Google sign-in, head chef PIN and grant on that device), from the day after tomorrow up to 4 weeks ahead.

What was built (implemented app screens in `built/`, `capture-built.cjs`, `built/measurements.json`):

- **Rollover repair first** (`maybeRoll()`, `rollSource()`, `PAST_KEYS`): a day holding only planned lines is not a written day; its open planned lines roll too, as a plain rolled line "from Kim, Sat" (`origAt` is when its day began); a line the night list wrote again with the same amount (or none) is not copied next to the plan. `tests/prep-ahead.test.js` part 1 fails 4 of 12 on main's `js/prep.js` (the lost line, the wrong first day and label, the doubled job) and passes 12 of 12 here.
- **The page** (`listHTML()`, `rowHTML()`, `css/app.css`): as the mix. Admin only through `planOK()`; `planDayOk()` from the day after tomorrow to 28 days; `newItem()` marks the line `plan: '<day>'`; `addDayOk()` keeps the sheet's day and refuses with words when the day changed or the admin sign-in lapsed (findings 9 and 17); the slips name the day (10); nothing is ticked before its day, any line (11); read only for everyone but the admin (15); counts planned lines only (18); section heads "1 line", no bar; Prep opens on Today on the way in and after a lock; "saturday" no longer lowercase.
- **On its day:** "Planned Sun by Kim"; `firstAt()` uses the start of its day and `startHere()` never picks it as Waiting longest (finding 2).
- **Rules** (`firestore.rules`, `planKept()` and `laterDay()` in the prep lines block): a line marked `plan` before or after the write, on a day after tomorrow, only by the admin. On ordinary writes only: put on every write it pushed the largest function cancellation batches (12 lines, 8 rounds) over the 1000-expression budget (4 capability checks failed); the admin and function bookings take their own verified paths. `tests/rules/prep-ahead.test.mjs`: 15 of 15 here, 9 of 15 on main's rules (the 6 refusals are the new rule). Full rules suite green. **Stricter: publish after this merges.**
- **Backup** (`scripts/nightly-backup.mjs`): the next 28 days of prep lines (finding 4). Not covered by a node test (the script runs on import); checked by `node --check` and the next nightly run's log line.
- **Implemented app at 390, 768, 1280 px** (admin, three days ahead, two planned lines): 2 of 2 lines in view, no sideways scroll, no page errors, no new control under 44 px. Taps to put a line on Saturday: 5 (`›` x3, Add to Saturday, Add), as the preview. Today's page unchanged: chef 4 rows, staff 5 rows above the Add bar (the stand-in's fallback fonts).
- **Not done here:** the eve is not shown on today's page (no read of tomorrow). Finding 14 is handled at the rollover instead. Rendered contrast of the muted calendar, keyboard focus and reduced motion are not measured.

## Changed 19 November 2026: tomorrow too

The head chef tried to put a line on tomorrow's list and "couldn't add". The build started planning on the day after tomorrow, the skeptic's round 1 point (the night crew cannot see tomorrow's page and might write the job again). Since then the rollover skips a night-list line that matches a planned one (finding 14), so the remaining cost is a line with another amount showing Also on both. Quick check (small change, an existing button on an existing page, no new read or rule): **Build**. Taps to put a line on tomorrow: not possible before; 3 now (`›`, Add to tomorrow, Add). Today's lines unchanged.

- `planDayOk()` from tomorrow. The button reads "Add to tomorrow", the box "Write a line for tomorrow...", the sheet "Add to Fri 20 Nov", the note "Staff see these lines tomorrow, not before."
- The head chef on a device without the admin sign-in (no Google, or its grant lapsed) is told "To plan lines ahead on this device, open the Admin panel and sign in with Google." instead of "Only the head chef...".
- Rules: unchanged. Tomorrow is inside `nearDay()`'s window, where the stricter rule never applied.
- Tests: `tests/prep-ahead.test.js` parts 4 and 4b (68 checks); on main's `js/prep.js` part 4 fails (no Add on tomorrow).

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
3. Who plans: round 1 said the head chef and sous chefs (`canBrowse()`, no rules change). The head chef then asked for admins only, which needs a stricter rule (see Admin only). Either way: emulator rows for who is allowed and refused, and `tests/roles.test.js` on a later day for each role.
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

## Round 2 scores (out of 5, 5 best; fresh agents, role-based, not research with staff)

| Reviewer | A. Open the day | B. Chef panel | C. Day strip | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | 4 | 2 | 3 | A, with C's plain later day and B's tomorrow sentence |
| Head chef | 4 | 2 | 3 | A, with B's tomorrow sentence and C's "Planned ahead for Saturday" line |
| Skeptic | 4 | 2 | 3 | A trimmed: C's one-column later day, B's tomorrow sentence, a neutral count |
| New starter | 4 | 2 | 3 | A with C's named day chips |
| Keeper | 4.5 | 2 | 3 | A, with B's tomorrow sentence and C's note at the top |
| Screen designer | 4 | 2 | 3 | A, with C's note under the header; no dashed box; a graphite count |

All six ranked **A first, C second, B last**. All six said the designs differ in structure (the screen designer: B really differs, C is a variant of A in two parts).

Disagreement, one line each:
- New starter: take C's named day chips with A (one tap to a named day). The other five rejected the strip: it changes the day row chefs use for past days, offers tomorrow (which takes no adds), sits above the section tabs and adds a second form.
- Screen designer: the dashed square already means Not saved (or No section) in the book; a wet thumb will tap it. Replace it.
- Keeper: B's reads cannot use `dayCache()` (other chefs write those days), and B needs a second add path; Prep history already says "Changes are made on the prep list".

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear (one way to do one job) | Works: today's sheet for every day | Needs work: a second place and form | Needs work: a second form, a second day picker |
| Things 3 (today and later apart) | Works: a later day is its own page | Works: an Upcoming page | Needs work: later days sit above today's list |
| Todoist (quick add, visible defaults) | Works: suggestions, chips and proofreading kept | Needs work: no chips or usual lines | Needs work: no chips or usual lines |
| Flighty (no reads for the look, no stale status) | Works: no new reads | Needs work: about 7 reads per open, stale counts | Works |
| Duolingo (each tap answers truthfully) | Works in preview: the slip names the day; the slip after closing does not yet (finding 10) | Not evidenced | Works in preview |
| Headspace (plain words) | Needs work: "Planned by Sam, today" on Saturday's page | Works: the tomorrow sentence | Works: the note at the top |

### Contract fit

- **Works:** A keeps one add path (`addTyped()`, `newItem()`, `openTwin()`, `addedToast()`, `prepUndo()` follow the day on screen), no new reads, no rules change for chefs, staff pages unchanged.
- **Needs work:** the dashed box (dashed means Not saved or No section); the orange handwritten count (planned is neutral, and it competes with the orange Add at 768 and 1280 px); B's `‹ ›` 34 px and its 35 px link; C's cut placeholder ("Amount tc").
- **Not evidenced:** rendered contrast, keyboard focus, reduced motion, the keyboard over the sheet, the real slip timing, Not sent.
- **Proposed change to an approved rule** (head chef's call): "lines are added on Today only" (`docs/prep-book.md`) becomes "the admin also adds on a day from the day after tomorrow".

### Break-it findings (round 2, source review)

| # | Scenario | Evidence | Repair or check |
| --- | --- | --- | --- |
| 9 | Add sheet open for Saturday, then an idle lock, the 04:00 unlock or midnight resets Prep to Today; the chef unlocks and taps Add. `addTyped()` calls `newItem()` with no date, so the line goes to whatever `S.date` is then, and `openTwin()` checks today's lines. | Write path checked in source; the lock path Risk (skeptic, keeper) | The sheet keeps the day it opened on and passes it to the write and the twin check. A day change closes a later-day sheet and says so ("Friday is tomorrow now"). Click test: open, lock, unlock, Add; and the clock across midnight. |
| 10 | After the sheet closes, the slip says "Added Brine pork to Larder" with no day (`justClosed()`, `addedToast()`); "Corrected..." has the same gap. Undo is safe (`prepUndo()` keeps the day). | Checked in source (skeptic) | Name the day when it is not today. Click test reads the slip after closing. |
| 11 | A line on a later day can be ticked by tapping its words: `tickOk` in `rowHTML()` has no date check. This already applies to a function's platter lines on later days today. | Checked in source (keeper) | Add "not after today" to the tick check. Click test taps the box and the words on a later day. |
| 12 | Each `›` step opens a listener on the day it passes (1 read for an empty day). | Checked in source (skeptic) | Accepted: a few reads per planning trip; no new listener on today. |
| 13 | B only: a panel add reusing `addTyped()` would fold a Saturday line into today's open twin. | Checked in source (keeper) | B rejected. |

## The mix: A with small takes from B and C (recommended)

Preview: `design-mix/` (Preview, admin fixture, 390 px; `later-day` and `sheet` also at 768 and 1280).

| Source | Part | Take or reject | Why, principle |
| --- | --- | --- | --- |
| A | The day row to reach a day; today's Add sheet, titled "Add to Saturday 21 Nov"; "For Saturday 21 November. Not on today's list."; the slip "Added for Saturday 21 Nov"; the dock "Add to Saturday" | Take | One way to add (Linear); the answer names where the line went (Duolingo); usual lines, chips and proofreading kept (Todoist) |
| A | Handy on a later day ("Saturday is still to come") | Reject | Dead space; nothing is ticked before the day |
| A | Dashed square in place of the tick box | Reject | Dashed means Not saved or No section; replaced by a quiet calendar (muted ink, words carry the meaning) |
| A | Orange handwritten "2 lines planned" | Change to graphite ink | Planned is neutral information, not attention (colour contract) |
| B | "Tomorrow is written tonight on today's list" | Take, on tomorrow's page | One plain reason (Headspace) |
| B | The panel page, week counts, inline form | Reject | Second add path, reads, three levels deep (Linear, Flighty) |
| C | "Planned ahead for Saturday 21 November. Staff see these lines on Saturday, not before." at the top | Take | The day is read before adding, even on a long list (Things 3, Airbnb) |
| C | One column for a later day | Take | No empty Handy page |
| C | The day strip, the inline form | Reject (new starter disagreed on the strip) | Changes the day row, offers tomorrow, a second form |
| New starter | "Planned Wed by Sam" (not "Planned by Sam, today"; "Sun" could read "for Sunday") | Take | Plain words (Headspace) |

Why not all three: B's counts bring reads and a second add path; C's strip and A's day row cannot both stand without two ways to move between days. The light mix costs words and CSS on top of A.

### Admin only (head chef, 17 Nov 2026)

After round 1 the head chef added: **"But only for admins."** Read here as the book's own word: admin is the head chef on a device with the owner's Google sign-in, a live head chef PIN session and the matching device grant (`ownerHere()` on the page, `isAdmin()` in the rules). So:

- Only the admin sees **Add to Saturday**, Urgent, Remove and ⋯ on a later day. A sous chef who opens a later day sees its lines read only: "Planned ahead by the head chef for Saturday 21 November. Staff see these lines on Saturday, not before." (`design-mix/sous-later-day.png`). Staff still see only today.
- The head chef's PIN on a device without the Google sign-in (the shared tablet) is not admin: it cannot plan ahead.
- The rules get **stricter** for marked lines only: on a day after tomorrow, a line marked planned (new or old document) is written only by the admin (finding 16 has the shape). Unmarked lines are as today, so function bookings, the rollover, What the platters need and past-day restores keep working. Published **after** the client, in the same release window, once the client already shows a later day read only to everyone else (finding 15). Emulator rows: the admin at +5 days allowed; sous chef, function manager and staff at +5 refused, and a sous chef update that drops the mark refused; still allowed: a staff tick on the line's own day, a sous chef restore on a past day, a marked rolled copy onto today and a function booking line at +5.
- Write the stricter rule only once the head chef confirms the reading (skeptic). The gate lives in one helper on the page.
- If "admins" meant the head chef and the sous chefs, the design is the same and the rule is the one that already exists (`lineWho()`), with no rules change.

### Measured (Preview, mix, admin fixture)

| | Before | Mix |
| --- | --- | --- |
| Taps to put Brine pork on Saturday, 3 days ahead (typing not counted) | Not possible | 5: `›` x3, Add to Saturday, Add (or the date field: about 3 for the picker instead of the arrows) |
| A second line for the same day | | 1 more (Add; the sheet stays open) |
| Back to today | | 1 (Today), or by leaving Prep |
| Today's rows in view, chef and staff, 390 px | 5 and 6 | 5 and 6 (today does not change) |
| Later day rows in view, 390 px | 0 | 2 of 2, the note above them |
| New reads | | None beyond opening a day (1 read for an empty day, 1 per line) |
| Rules | | Stricter for planned lines (admin only) |
| Sideways scroll at 390, 768, 1280 | 0 | 0 |
| Under 44 px | | none new |

The date field shows 11/21/2026 in the preview browser; on an Australian phone it follows the phone's own date order. Not evidenced.

### Focused review of the mix

Fresh agents, 17 Nov 2026: the keeper, the screen designer and the skeptic, on the combined preview and the admin-only rule. **All three: keep the mix**, with conditions. Review status: the mix is the lead's synthesis of the six reviewers' own takes; these three reviewed it as drawn.

- **Screen designer:** one layout and one task flow; the calendar reads as "planned" without colour and is not a target; keep the orange dock, its words stop a wrong-day add. Changes, all taken: a graphite count (or "Nothing planned") on tomorrow and on an empty day; the byline wraps, never cuts ("Planned Sun by He..." at 390 px); from 7 days ahead the title and the dock carry the date ("Add to Sat 28 Nov"); the sous chef's note says only the head chef adds or changes lines on a later day. The preview now shows the first, second and fourth (`design-mix/tomorrow.png`, `day-arrives.png`, `sous-later-day.png`). Not evidenced: rendered contrast of the muted calendar, focus, reduced motion, Urgent and Remove at 768 px.
- **Skeptic:** the admin reading holds but is not certain ("admins" is plural; the book has one admin). The page is the same under both readings; only the stricter rule differs, so **do not write or publish it until the head chef confirms**. Keep the gate in one helper, so the other answer is a one-line change. Costs to tell the head chef: no planning from the kitchen tablet; a sous chef told "put the brisket on Saturday" cannot; a plan for a cancelled job stays until its eve if the head chef is off.
- **Keeper:** the reading is sound (`ownerHere()` needs the Google user, the head chef PIN session and a live grant, like `isAdmin()`); on the shared tablet the idle lock clears Google, so the head chef there is read only. The rule can be enforced without breaking any writer if it has the right shape (finding 16). Merge and publish in the same release window; the emulator rows prove the rule, the Lock probe does not.

Findings (focused review, source review, all to be fixed in the build):

| # | Scenario | Evidence | Repair or check |
| --- | --- | --- | --- |
| 14 | Friday night the crew writes "Brine pork 3 kg" under Tonight, for tomorrow; the admin had planned "Brine pork 2 kg" for Saturday. The crew cannot see Saturday, and the rollover skips a copy only by its rolled id. | Risk, checked in source (skeptic, keeper) | The rollover already reads Saturday's lines: it skips a line that matches an open planned line (words and section; the amount taken if the plan has none), with no new read. Different amounts keep both, each marked "Also" by the existing double-ups. Click test across Friday night. |
| 15 | Read only exists only in the preview: on a later day `rowHTML()` draws Remove (`can('del')`) and Urgent (`can('add')`) for anyone, and a tap on the words ticks. | Checked in source (keeper) | Draw a planned line on a later day read only for everyone but the admin, before the rule is published. `tests/roles.test.js`: a sous chef at 390 and 1280 px sees no Remove, Urgent or ⋯, and a tap on the words writes nothing. |
| 16 | The rule's traps: a function exemption keyed on `fn` is a hole (any `fn` value is accepted without a booking); a rule on the new document only lets an update drop the mark; a rule with no day limit refuses staff ticks on the line's own day, sous chef restores on past days and the whole rollover batch. | Checked in source (keeper, skeptic) | In the `days/{day}/items` block only, reusing the `admin` already worked out there (no new `get()`): admin, or not a later day (`nearDay()`'s own bounds), or neither the new nor the old document is marked. No function exemption is needed: function bookings never set the mark. |
| 17 | The admin's grant lapses with the Saturday sheet open (the tablet's idle lock clears Google, the 04:00 unlock before a new grant, no signal): the write goes out, is refused, and the slip says "Ask the head chef". | Checked in source (keeper); Risk on a device | Add on a later day checks `ownerHere()` at the tap and keeps the words if it fails; the later-day sheet closes, saying why, when it drops. Emulator row: head chef PIN without the grant, refused. Click test: drop the grant, tap Add, nothing written. |
| 18 | A later day that also holds a function's platter lines: the note and "2 lines planned" must count planned lines only. | Checked in source (skeptic) | Count marked lines only; a platter line in the click fixture. |

The eve itself is not previewed: today's page on Friday does not change (it reads nothing of Saturday). Finding 14 is checked on Saturday morning instead.

## Recommendation

**Recommend the mix: A's way in, with C's note and one column for a later day, B's tomorrow sentence, a neutral count, a calendar in place of the tick box and "Planned Wed by", for the admin only.** It keeps one way to add a prep line and changes nothing on today's page for anyone, which is why every reviewer put A first. The words carry the day at every step: the page title, the note at the top, the dock, the sheet title, the slip, and on the day the line itself.

Main downside: no overview of what is planned. The admin opens each day to see it (the date field reaches any day in about 3 taps). A week overview would cost reads on every open and go stale; it can come later if the head chef misses it.

Before any of this: the rollover repair ships on its own (findings 1 and 3). The build then fixes findings 2, 9, 10, 11 and 14 to 18 with their click tests and emulator rows. Admin only costs: no planning from the kitchen tablet (its idle lock clears Google), and a sous chef asked to plan a line cannot.

Questions for the head chef:
1. Choose: the mix (recommended), A, B or C.
2. Who plans ahead: the admin only, as asked (read as Google plus head chef PIN on that device), or the head chef and the sous chefs.
3. How far ahead: from the day after tomorrow up to 4 weeks (recommended), or other.

## Verification plan (before ready)

- The rollover repair's own pull request: the client test from `break-rollover.cjs` fails on main and passes after, with and without all seven past days in `lk.past`; a closed day with only planned lines, either side of midnight.
- Rules emulator: the rows in Admin only and finding 16; a row in `tests/rules/client-shapes.test.mjs` for the new call.
- `tests/roles.test.js` on a later day for each role; staff never see a later day.
- Add on a later day: the slip names the day, Undo removes the right line, a held write shows Not sent and lands on the named day, an Add sheet open across midnight keeps its day.
- On its day: "Planned by" byline, no Waiting longest, sort order.
- Prep reopens on Today after leaving it, at 04:00 and after a lock.
- 390, 768 and 1280 px on the implemented app; `tests/read-budget.test.js` unchanged.
- Nightly backup's forward days: a node test of the day list.
- The sheet keeps its day across a lock, the 04:00 unlock and midnight (finding 9); the slip after closing names the day (10); a later day's line cannot be ticked (11).
- Admin only: `tests/roles.test.js` shows a sous chef a later day read only at 390 and 1280 px (finding 15); the grant dropped with the sheet open writes nothing (17).
- Friday night's crew line and Saturday's planned line: one line, or two marked Also (finding 14); a function platter line on a planned day is not counted (18).
