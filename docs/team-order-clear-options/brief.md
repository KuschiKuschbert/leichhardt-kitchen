# Today's team: time order, Clear this day, and planning the day on a time line

16 November 2026, Queensland. Head chef requests, after Monday's plan showed Smoker with 4 cooks on it (the roster file had put the Lunch cooks on Smoker before the hidden-shift change went live at 22:01 on 15 November):

1. "When I add shifts like lunch, all day etc. I'd like them to show up in order when their service times are so. ... And I'd like a remove all shifts for the shown day in the today's team for the admin."
2. Then, widening it: "We really need to rethink this workflow, now that I can import a CSV. It's super complicated to add someone to a shift and then set their breaks without seeing when they work on that day so maybe even have a bar in line from start time to end time? Mostly this workflow will be done on a computer but it needs to also be considered for phone and tablet sizes."

**Status: round 1 on the first proposal, Build smaller (5 of 5). Round 1 on the widened proposal running.** Role-based analysis, not research with staff. [First proposal](proposal.md), [widened proposal](proposal-timeline.md), [evidence packet](evidence-packet.md).

## Round 1a: time order and Clear this day

Five fresh agents read the first proposal, the evidence packet and the baseline screenshots (source `main` at `9697fd8`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | My service taps do not change. If only the planner is reordered, Home and Your day show the same shifts in another order. A wrong Clear saved for today at 18:00 takes my section and breaks off Home mid-service. Clear should leave the day "Not set", and be off on today once the first shift started. |
| Head chef | Build smaller | Time order is the real win, in `tmServiceChoices()` only. Monday needed Smoker off, not the whole day. Clear only pays if the roster can fill the day again. Skip part 3 beyond a hint line. |
| Skeptic | Build smaller | A whole-day clear is blunt for a one-column fault, and an empty saved plan looks finished (Saved, "Set by", the chip goes quiet, staff Home "Nobody is rostered today"). The cause comes back: an All day shift not hidden takes every Lunch and Dinner cook too. |
| New starter | Build smaller | Time order reads like the day. The self-explaining part must be required: "+ Smoker" has no reason given. Clear should say "Everyone taken off Monday 16 November. Not saved yet." with a way back, and Smoker be worded "Shows only when someone is on it". |
| Keeper of the book | Build smaller | Free in reads. One comparator in `tmServiceChoices()`, shared with `homeRotaHTML()`, not in `kitShifts()`. No delete: the rules' admin delete has no version check, so it can wipe a sous chef's newer save. Save the normal `v + 1` empty plan and make "nobody on" read as Not set everywhere with one helper. |

**Verdict: Build smaller, 5 of 5.**

**Cuts all five accept:**
- Time order only in the planner's own list (`tmServiceChoices()`), with one comparator shared with Home's rota (`homeRotaHTML()` already sorts by start). Not in `kitShifts()`: it feeds Your day, `tmShNow()`, the section log's shift and `tmAddShift()`'s first-service section.
- Clear is a second tap in place inside an existing fold, no pop-up, and says in words that nothing is saved yet.
- A cleared day must be able to be filled again from the roster file and Copy last weekday.

**Disagreement:**
- How a cleared day ends. Four reviewers: back to "Not set" by deleting the day's plan. The keeper: no delete (the admin delete has no version check and would silently remove a sous chef's newer save; a delete for today would also need the `pastEdit` stamp); save the versioned empty plan and treat a plan with nobody on as Not set everywhere (week list, chip, To do, roster fill, Copy last weekday). Both reach "Not set"; the keeper's way keeps the version guard. The lead takes the keeper's way into the widened proposal.
- The head chef and the skeptic would also consider clearing one service (Smoker) instead of the whole day.
- The cook would turn Clear off on today once the first shift has started.

**Break-it findings:**

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| Clear, then Save on today: staff Home says "Nobody is rostered today", every phone reads the day again, the chip and week list say Set, and the roster skips the day as saved. | Risk / Not evidenced (source, skeptic and keeper) | Nobody on reads as Not set everywhere (one helper); a click test for staff Home after Clear and Save. |
| A delete by the admin while a sous chef saved a newer version: the sous chef's work is gone with no message; his next Save says "Check your PIN and the signal". | Risk / Not evidenced (source of the rules and `W()`) | No delete. Save the versioned empty plan. Emulator rows for an empty update at `v + 1` by the admin and a sous chef. |
| Clearing the wrong date: `arm()` holds one key for 4 seconds and picking a date does not cancel it, so "Tap again" can land on another date. At 390 px the fold is about 2,300 px below the date. The existing `tm-refresh` has the same gap. | Risk / Not evidenced (source) | Arm with the date in the key and unarm on a date pick; a click test. |
| A clear that empties only `on` and `br` keeps `tmf.hrs` and `tmUi.occShow`: re-adding Ari to Lunch would save last fill's roster hours again, and Smoker would keep showing. | Risk (source, keeper) | Clear through `tmRemoveShift()` for each person and service. |
| The roster file puts a cook on every service their hours touch: with All day 10:00 to 21:00 not hidden, Lunch 10:00 to 15:00 gives Lunch and All day; Dinner 17:00 to 21:00 gives Dinner and All day. | **Reproduced** in node with `services()` from `js/roster-import.js` and synthetic shifts (skeptic, then lead) | Carried into the widened proposal. Today's rule is the head chef's (14 Nov 2026: every service a roster time overlaps). |
| Ties and missing times in the order: the same start, only a From, a To before its From, Lunch and Dinner with no times ("Add Lunch and Dinner") sorting after a timed Smoker. | Not evidenced | Define them; a unit check. |

**Corrections to the evidence packet (keeper):** no 03:00 job reads `kitShifts()`; line 1771 is Settings' `kitchenInfo()`.

## Round 1b: plan the day on a time line

The head chef widened the proposal before round 1a closed ([proposal-timeline.md](proposal-timeline.md), carrying round 1a's cuts). The same five reviewers read it with `baseline-breaks-390.png` and `baseline-breaks-1280.png`.

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | My taps do not change; the gain is that a break on my Home is one I can take. A bar on a phone is about 21 px an hour, so a 15 minute break is about 5 px: no tap target. Ship the hours-aware break picker on its own first; bars from tablet width up, the phone keeps times in words. Bars, the overview and Home must show the same finish. |
| Head chef | Build smaller | The pain is breaks, not sections: show the person's hours in the panel and offer only break times inside them. Keep the grid chosen yesterday; draw a read-only bar where the "Roster" words sit, from the Saved overview's drawing, and the overview fold can go. Not worth replacing the whole grid yet. |
| Skeptic | Build smaller | The pain is narrower than the build. The data cannot draw it yet: the roster saves the whole roster time on every service it touches (Mo 10:00 to 21:00 on Lunch and on Dinner), so a row gets matching bars and a break between services has no service. Tapping a bar is about 1.5 to 2 hours per 44 px. Decide how a roster time maps to services before replacing the grid. |
| New starter | Build smaller | Bars fix the gap, but a bar alone does not explain itself: each needs words ("Lunch · Roster 12:00 to 15:00" or "Lunch hours", the section, "Break 13:30 to 14:00" or "No break yet"). Breaks through "+ Break", never a tap on the bar. "Dinner (off)" and "+ Smoker" are two wordings for one state. Hold the grid's replacement until a preview is measured. |
| Keeper of the book | Build smaller | One hours helper (roster hours, else the service's hours; `tmShortOf()` already has it) for `tmTimes()`, `tmSpFrom()`, `tmLong()`, + Break and Spread. A read-only bar reuses `.tm-tlbar`. One page structure for every width, varied by CSS only. Three pull requests: order and Clear; hours-aware breaks and the bar; retiring old views only after the head chef has used step 2. |

**Verdict: Build smaller, 5 of 5.**

**Cuts all five accept:**
- **Fix breaks first.** One helper for a person's hours on a service: their roster hours, else the service's hours, and words that say which. Break times offered only inside them, ending by the finish; + Break's default and Spread them inside them too. A break already outside the hours is kept and said in words ("before Bea starts"), never dropped.
- **Show the hours where breaks are set**, in words.
- **Bars are read only, with words beside them.** Breaks and sections change through the pickers and "+ Break". No tap or drag on a bar.
- **One bar per distinct span**, not one per service, so the same hours on two services do not draw twice.
- Round 1a's cuts stand: time order with one comparator; Clear by a second tap keyed to the date, Save writes the empty plan, nobody on reads as Not set.

**Disagreement:**
- **Replacing the day grid.** Four keep the 15 November grid for now (head chef, cook, skeptic, keeper). The new starter would build bars per person now and decide on the grid after a measured preview.
- **The phone.** The head chef and the cook: bars from tablet width up, the phone keeps times in words. The keeper: one structure at every width, changed by CSS only (a phone-only shape is a second render path to test).
- **How a roster time maps to services** (skeptic, keeper): cut each roster time to each service's hours, or one bar per person with the services as parts of it. Today's rule is the head chef's (14 Nov 2026: every service a roster time overlaps, saved with the whole time). **A question for the head chef.**

**Break-it findings:**

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| Break times ignore the person's hours: Dev (12:00 to 15:00) is offered 10:00 to 15:00, 8 times before he starts and 15:00 as he leaves. + Break's default can fall on the finish. | **Reproduced** (`baseline-breaks-run.cjs`, stand-in) | One hours helper; times from start to finish minus the length; a click test in `team-roster-hours`. |
| Spread them puts every break from one start time whatever the hours: Spread Lunch from 10:00 all together gives Bea (11:00) and Dev (12:00) breaks before they start. Chefs included. | Risk / Not evidenced (source, skeptic and keeper) | Spread inside each person's hours; out-of-hours said in words; a click test. |
| The roster saves the whole roster time on every service it touches: Mo 10:00 to 21:00 on Lunch and Dinner; Kit 14:30 to 17:00 on Lunch alone, two hours past its end; with All day not hidden a second service with the same hours. A 10:00 to 15:00 cook also on All day gets a 2.5 hour split at 14:30, because All day counts as long. | **Reproduced** in node with `plan()` and `services()` (skeptic) | The head chef's question above; one bar per distinct span; a unit check with these spans. |
| Missing hours: Add staff sets none, Copy last weekday drops roster hours, "Add Lunch and Dinner" makes shifts with no times. | Checked in source (keeper, skeptic) | "Lunch hours" or "Hours not set" in words; nothing drawn without hours. |
| Redraw under the thumb: bars redrawn on a picker change while another picker is open could move the row. A "now" line must use the existing minute paint, no new timer. | Risk | A click test that an open picker keeps its value and place while the bars redraw; remeasure the full app at 390, 768 and 1280 px. |

## Round 2: three designs

Built as one patch on the real page, switched by `window.__tl` (`preview-prep.patch`, `preview-css.patch`, runner `preview-run.cjs`, raw numbers `measured-preview.txt`). Admin session, test stand-in, fallback fonts, the roster-day fixture (Gus 08:00 to 15:00 and 17:00 to 21:00; Ari, Bea, Cal, Dev on Lunch with their own hours; Sam, Eli, Fen on Dinner; Mo on All day 10:00 to 21:00; no sections, no breaks; Smoker hidden). Never on the live book.

**The same in all three** (round 1's cuts): services in time order (Lunch 10:00 to 15:00, All day 10:00 to 21:00, Dinner; Smoker 06:00 first in the chips); break times only inside the person's hours, ending by their finish (Dev: 12:00 to 14:30, 11 times, not 10:00 to 15:00, 21); + Break starts in the middle of their hours; their hours said in words where breaks are set; **Clear this day** in the fold, renamed "Copy, clear or spread breaks", admin only: Clear, then "Tap again to clear Monday 16 November", then "Everyone taken off Monday 16 November: 9 people. Not saved yet. Refresh brings the saved plan back."

### A: Hours in words (changes the least)

The day grid and the details panel stay as chosen on 15 November. Each row's line under the name becomes "Roster 12:00 to 15:00 · Break 13:30 to 14:00" (or "No break yet"). The panel adds "Lunch: Roster 12:00 to 15:00" above the break pickers. No bar while planning; the Saved shift overview keeps its bars. Screens: `A-plan-390.png`, `A-dev-390.png`, `A-dev-768.png`, `A-dev-1280.png`, `A-day-1280.png`.

- **For:** nothing to relearn; the same density as today; the fault (breaks outside hours, hours not shown) is fixed.
- **Against:** no picture of the day: who overlaps whom and where the gaps are still has to be read from words; the head chef asked for a bar.

### B: A bar in every row (the grid reads as a time line)

The grid and the panel stay for changing things. Under each row, a read-only bar of the person's day on one scale for the whole page, with hour marks in the sticky service heads (every hour from 600 px, every third hour on a phone), the break in orange on the bar and the same words under it. One bar per distinct span (Gus: two). The Saved shift overview fold goes: the grid shows the same day. Same structure at every width, changed by CSS only. Screens: `B-plan-390.png`, `B-dev-390.png`, `B-dev-768.png`, `B-dev-1280.png`, `B-day-1280.png`.

- **For:** the whole day can be seen down the page (overlaps, gaps, breaks); the editing is unchanged; one overview instead of two.
- **Against:** rows 18 px taller (5 rows on a laptop screen, not 6); at 1280 px the bar shares the width with the panel (about 490 px for 14 hours, 35 px an hour); a 30 minute break is a small orange mark.

### C: The day on one clock (removes the most friction)

The grid's service columns and "Off" cells go. The head lists each service with its hours and who has no section, then the hour marks. Each row: the name with **Services** (opens the panel, now only to add or remove a service), the person's bar beside the name from 600 px (under it on a phone), the words, then one line per service they work: the service and their hours, the Section picker, the break pickers and **+ Break**, all in the row. No Breaks tap. Screens: `C-plan-390.png`, `C-dev-390.png`, `C-dev-768.png`, `C-dev-1280.png`, `C-day-1280.png`.

- **For:** a cook's section and break in 3 taps, not 4 (22 a day, not 29); the bar is wide (the whole list, about 60 px an hour at 1280); the time, section and break are together in the row.
- **Against:** it replaces the day grid chosen on 15 November; on a phone a row is 211 px (1 per screen, not 3); comparing sections across people for one service is harder without columns; the panel still exists for services, a second place.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | Day grid | Day grid plus a bar row | Rows on one clock, no service columns |
| Where breaks are set | Panel | Panel | In the row |
| Time shown while planning | Words | Bar and words | Bar and words, and each service's hours |
| Saved shift overview | Kept | Removed (the grid is the overview) | Kept |
| Approved design changed | None (the 9 Nov order rule, all three) | The overview fold | The 15 Nov day grid and the panel's break role |

### Measured (Preview)

| Measure | Today | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Dev: section and a break, taps (390, 768, 1280) | 4 | 4 | 4 | **3** |
| The day: 7 cooks, a section and a break each, then Save, 1280 | 29 | 29 | 29 | **22** |
| Break times offered to Dev (roster 12:00 to 15:00) | 21, from 10:00 | **11**, 12:00 to 14:30 | 11 | 11 |
| Dev's hours where his break is set | No | Yes | Yes | Yes |
| Rows wholly in one screen, 390 / 768 / 1280 | 3 / 7 / 6 | 3 / 7 / 6 | 3 / 6 / 5 | 1 / 6 / 5 |
| Median row height px, 390 / 768 / 1280 | 123 / 104 / 104 | 123 / 104 / 104 | 141 / 122 / 122 | 211 / 117 / 117 |
| List height px, 390 / 768 / 1280 | 1176 / 1007 / 1007 | 1196 / 1007 / 1007 | 1378 / 1188 / 1188 | 2123 / 1180 / 1158 |
| Clear the whole day, 390 | 30 taps, then Save | 3, then Save | 3, then Save | 3, then Save |
| Sideways scroll, browser errors (all widths) | none | none | none | none |
| Pull requests to build (lead's estimate) | | 1 to 2 | 2 | 3 |
| New reads, listeners, rules | | none | none | none |

"Rows wholly in one screen" counts rows between the sticky head and the Save bar once the list is scrolled to its first row. Full-page captures show the sticky head over a row: a capture effect, not the layout.

### Contract fit (lead's reading, for the scorers to test)

- **Surface:** all three keep the sage people book and paper inside. Works.
- **State meaning:** "Unsaved changes", "Not saved yet" and the dated Save are unchanged; Clear says nothing is saved. The orange break on a bar follows the approved "A saved day at a glance" (break in orange) and always has the words beside it. Works by that precedent; a scorer may argue orange should stay attention only.
- **Words:** A words only; B and C words under every bar. Works.
- **Real contrast:** the beige bar track on paper, the orange break on ink, and the focus ring on C's inline pickers: Not evidenced.
- **States:** Clear armed, cleared and not saved (exercised); a failed Save, a lock and a second writer: unchanged code paths, not exercised. Not evidenced.
- **Service continuity:** rows and taps above. B costs one row on a laptop; C costs two rows a screen on a phone and saves 7 taps a day.
- **Departures for the head chef:** the 9 November order rule (all three); the Saved overview fold (B); the 15 November day grid (C).

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Flighty: real times, now and next | Needs work: words only | Works: one scale down the page | Works: one wide scale |
| Things 3: frequent actions visible, no drag-only | Works | Works | Works: section and breaks in the row |
| Airbnb: time, place, status together | Needs work: hours in the row, breaks in the panel | Needs work: same split | Works: one line per service |
| Todoist: quick, defaults visible, nothing guessed | Works: break starts mid-hours, editable | Works | Works |
| Linear: one way to do each thing | Works | Works: one overview, not two | Needs work: services in the panel, breaks in the row |
| Duolingo: honest feedback | Works | Works | Works |
| Headspace: plain words for a new starter | Works | Works | Needs work: "Services" names a panel the grid called "Breaks" |

### Break-it findings (lead, on the previews)

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| Clear: arm, tap again, everyone off, nothing saved, Save then writes the empty plan. | Checked in the preview at 390 px (all three) | Before build: a date pick cancels the arm; nobody on reads as Not set (week list, chip, To do, roster fill); click tests. |
| A break already outside the person's hours (from Spread or an old save) stays in the picker and the words add "(outside their hours)". | In the patch; not exercised | A click test with Bea broken at 10:30. |
| The same roster time on two services draws one bar (`tmSpans()`). | In the patch; not exercised (the fixture has none) | A fixture with Mo on Lunch and Dinner, 10:00 to 21:00. |
| C's inline pickers are keyed by person, service and break number (`tm-bat:<id>:<sh>:<n>`), so a held picker cannot reach another service. | Checked in the preview: a whole day of 7 cooks saved | The `tm-sec` style key check in a click test. |
| B and C redraw the bars on every picker change; an open picker elsewhere must keep its value and place. | Risk / Not evidenced | A click test before release. |
| On a phone, C's row is 211 px: 1 row a screen. | **Reproduced** (measured) | Accept, or C on a phone keeps the grid (a second render path, the keeper's concern). |
| How the roster maps a time to services (Mo 10:00 to 21:00 on Lunch and Dinner with the same hours). | Reproduced in round 1b | The head chef's question; no design fixes it alone. |
