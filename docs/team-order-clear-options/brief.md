# Today's team: time order, Clear this day, and planning the day on a time line

16 November 2026, Queensland. Head chef requests, after Monday's plan showed Smoker with 4 cooks on it (the roster file had put the Lunch cooks on Smoker before the hidden-shift change went live at 22:01 on 15 November):

1. "When I add shifts like lunch, all day etc. I'd like them to show up in order when their service times are so. ... And I'd like a remove all shifts for the shown day in the today's team for the admin."
2. Then, widening it: "We really need to rethink this workflow, now that I can import a CSV. It's super complicated to add someone to a shift and then set their breaks without seeing when they work on that day so maybe even have a bar in line from start time to end time? Mostly this workflow will be done on a computer but it needs to also be considered for phone and tablet sizes."

**Status: round 1a Build smaller (5 of 5); round 1b Build smaller (5 of 5); round 2 C 18, B 10, A 8; the combined preview D (the mix) reviewed by the designer, the skeptic and the new starter and repaired. Recommendation: D, built in three pull requests. Waiting for the head chef's choice.** Role-based analysis, not research with staff. [First proposal](proposal.md), [widened proposal](proposal-timeline.md), [evidence packet](evidence-packet.md).

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

## Head chef's direction during round 2 (16 November 2026)

"You can completely restyle the whole today's team room in the admin panel if needed, refactor what needs to be refactored to get the best UI/UX and DX. Make it easier but keep the functionality. If those chips are too complicated get rid of them or replace them."

So replacing the 15 November day grid, the details panel and its service chips ("Lunch", "Dinner (off)", "+ Smoker") is the head chef's own direction, not a departure to ask about. The scorers were told while scoring. The same page serves the sous chefs' chef panel and `#/team`, so a restyle reaches them too.

### What the room does today (every function to keep)

Each must still be possible after a restyle, at 390, 768 and 1280 px, for the head chef (admin) and a sous chef (chef panel) where they have it today. Source: `teamPageHTML()` and its handlers in `js/prep.js`.

| Part | Functions today (`data-p` / `data-k`) |
| --- | --- |
| Date | The date and its week list with each day's state (Saved, Draft, Not set, Checking, Retry), week back and forward, Today (`tm-date-toggle`, `tm-day`, `tm-week-prev`, `tm-week-next`, `tm-today`); "Planning Monday 16 November. The live board still shows today's saved breaks." |
| State | Unsaved changes, Saved 13:00 · Gus, Not saved. Changes kept., Refresh (a second tap when there is a draft) (`tm-refresh`) |
| Who is on | Add staff: Who's working? with people ticks and service ticks, a hidden shift as "+ Smoker", Add selected staff (`tm-add-staff`, `tm-quick-person`, `tm-quick-shift`, `tm-occ-show`, `tm-quick-add`); Find a person by name or section (`tm-q`) |
| Each person | A section per service with Usually, Often and Same as offered first, chefs read Head chef or Sous chef (`tm-sec`); add or remove a service, a hidden one as "+ Smoker" (`tm-on`, `tm-sh`); up to three breaks a service, each a time and a length, splits of 150 minutes or more (`tm-addbr`, `tm-at`, `tm-len`); overlap warnings between a person's breaks; roster hours; "break when too few" marks; Usually and Also on hints |
| Each service | Its hours and how many have no section (the grid heads) |
| Whole day | Whole day review: each person's services, sections, hours and breaks in words with Edit links (`tm-whole`) |
| Tools | Copy last weekday (`tm-use`); Spread them for one service: from, one/two/all, length, gap (`tm-tool-sh`, `tm-spfrom`, `tm-spmode`, `tm-splen`, `tm-spgap`, `tm-spread`); overlap review |
| Roster file (admin) | Choose roster file, fill the week's empty days, link roster names, save each day or all (`tm-roster-choose`, `tm-roster-file`, `tm-roster-day`, `tm-roster-link`, `tm-roster-unlink`, `tm-roster-pick`, `tm-roster-saveall`) |
| Save | The dated, versioned Save with its words ("Team for Monday 16 November saved at 13:00: 9 people on. Still no section: ..."), the Too few line (`tm-save`) |
| Today only | On break now (the charcoal live strip) and its Saved details, Next planned breaks today, the Saved shift overview (`tm-live-toggle`, `tm-next-toggle`, `tm-overview-toggle`) |
| Other | No shifts yet: Set up the shifts (`tm-setup`); PIN again (`tm-pin`); a past day read-only with its saved timeline |

## Round 2 scores

Six fresh agents ranked A, B and C with the same evidence; the head chef's restyle direction reached them while scoring. Points: 3 for first, 2 for second, 1 for third.

| Reviewer | 1st | 2nd | 3rd | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | C | B | A | The mix on C's row; no bar below 600 px; chips become one "+ Service" picker and a "Remove" with a second tap; it beats C only if a phone shows 2 or more people |
| Head chef | C | B | A | A's fixes first, then the restyled C once the roster-to-service mapping is decided |
| Skeptic | C | A | B | A trimmed C after A's hours fix; keep the Saved overview (the only view of the saved plan while the draft changes); drop Whole day review instead |
| New starter | C | B | A | C with the chips and panel gone, B's one bar picture and A's one sentence; the break mark needs a shape, not only orange |
| Keeper of the book | C | A | B | The mix in three pull requests, A's fixes first; one hours helper and one bar renderer; one structure at every width |
| Kitchen screen designer | C | B | A | The C-based mix; keep the Saved overview (the only by-section view once the columns go); hours said once; the bar track on paper is 1.08:1 |

**Totals: C 18, B 10, A 8.** All six put C first.

**Disagreement:**
- The Saved shift overview: drop it (cook, new starter, head chef) or keep it (skeptic, keeper, designer: the only view of the saved plan and the only one grouped by section once the columns go). The mix keeps it.
- The bar on a phone: hide it (cook) or keep it as the picture a reader without much English uses (new starter). The mix keeps it, thin.
- B or A second: four put B second (a picture of the day); the skeptic and the keeper put A second (it fixes the fault without a second bar renderer).

**Break-it findings from scoring:**

| Scenario | Evidence | Repair in the mix |
| --- | --- | --- |
| + Break puts both breaks of a double shift (Mo on Lunch and Dinner, 10:00 to 21:00 on each) at 15:15, between services, with no overlap warning. | **Reproduced** in the preview (skeptic) | The default is the middle of the person's hours cut to that service's hours (`tmCut()`): Lunch about 12:15, Dinner about 18:45. |
| Spread them gives Bea (11:00) and Dev (12:00) a 10:00 break. | **Reproduced** in preview A (skeptic) | Spread keeps each break inside the person's hours on that service. |
| C's row drops the cross-training hint (`tmLearnHints`) and the overlap warning. | Checked in the patch (skeptic, keeper) | Both are in the mix's row. |
| Two bar renderers already drift: unrounded widths ("7.1000000000000005%"); the saved bar uses service hours, the planner bar roster hours. `tests/kitchen-pages.test.js` counts `.tm-tlbar i`. | **Reproduced** in node (keeper) | Widths rounded in the preview; the build has one bar and hours helper for the planner, the saved overview and the past day. |
| The patch broke the grid's accessible name on the default path (`aria-label=""Sections ...`). | Checked in the patch (keeper) | Fixed in the patch; an aria-label check in `tests/team-grid.test.js` at build. |
| "Breaks not set" and "No break yet", "(off)", "+ Smoker" and "Off": several words for one state. | Checked in screenshots (new starter, designer, skeptic) | The mix has one wording: "No break yet", and "Add a service" names every service a person is not on. |

## Mix of A, B and C

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A: the hours helper, break times inside the hours, time order, Clear | Take, as pull request 1 | Todoist | Fixes the reproduced fault on the current grid, small | None | Dev 11 times, not 21 |
| A: one sentence for hours and break ("Roster 12:00 to 15:00 · Break 13:30 to 14:00") | Take, beside every bar | Headspace | Readable at arm's length, no colour needed | None | All six |
| A: keeping the grid and the Breaks panel | Reject | Things 3, Airbnb | | Breaks stay a hop away from the hours | 4 taps |
| B: one hour scale in the sticky head, one structure changed by CSS only | Take | Flighty, Linear | One picture of the day at every width | None | Keeper, designer |
| B: a bar row under an unchanged grid | Reject | Things 3 | | A second left-to-right meaning in one row; no taps saved | Designer, skeptic |
| B: removing the Saved shift overview | Reject | Duolingo | | It is the only view of the saved plan and the only one by section | Skeptic, designer, keeper |
| C: one line per service with section, breaks and + Break | Take | Airbnb, Things 3 | 3 taps a cook, 22 a day | Rewrites the team tests | Measured |
| C: the Services panel and its chips | Reject; replace with an "Add a service" picker and "Take off" with a second tap | Linear, Headspace | One place and one wording for services | A new control and its design pattern entry | All six |
| Whole day review | Retire | Linear | The rows are the whole day | | Skeptic, keeper |

A blend of all three layouts is not possible: A and B keep the grid that C removes, and both together would be two render paths. The mix takes C's layout, A's words and fixes, and B's single scale.

## Combined preview: D, the mix

Lead's synthesis of the scorers' own parts; **review status: focused follow-up by the designer, the skeptic and the new starter on the new flows (Add a service, Take off) and the phone layout; their must-fix items were repaired in the preview (below). Not re-scored by the whole council.** Same patch (`window.__tl = 'D'`), runner `preview-run-mix.cjs`, raw `measured-mix.txt`.

- **Head (sticky):** each service in time order with its hours and how many have no section (on a phone, only the counts), then the hour marks (every hour from 600 px, every third on a phone).
- **Each person, from 600 px:** a name column (the name, and Head chef or Sous chef); beside it their bar on the day's scale (6 px, the break a taller orange block edged in paper), the sentence under it ("Roster 12:00 to 15:00 · Break 13:30 to 14:00"; two roster times say their services: "Roster: Lunch 08:00 to 15:00, Dinner 17:00 to 21:00"), then one line per service: the service with **Take off Lunch** (ink at rest; "Tap again to take off" in red once armed), the Section picker (Usually, Often and Same as first, as now; a chef's reads Head chef with a solid edge), the break pickers ("Break 13:30", "Length 30 min") and **+ Break** straight after them; at the spare end of the last line, **Add a service** (a quiet solid picker listing the services they are not on, in time order, a hidden one as "Smoker 06:00 to 15:00 (hidden until someone is on it)"); then the cross-training hint, any overlap warning and, after a Take off, "Cal taken off Lunch and its breaks. Not saved yet. **Undo**". Below 1100 px the breaks take their own line; on a phone + Break sits beside the section and Add a service ends the row.
- **Gone:** the day grid's columns and "Off" cells, the details panel and its chips, the Breaks link, Whole day review.
- **Kept:** Add staff (Who's working?, with "+ Smoker"), Find, the date and its week list, Refresh, the dated Save and its words, the Too few line and marks, the fold (Copy last weekday, Clear, Spread), Fill from roster file, On break now, Next planned breaks, the Saved shift overview, the past day's read-only view.

| Measure (Preview) | Today | C | **D, the mix** |
| --- | ---: | ---: | ---: |
| Dev: section and a break, taps (390, 768, 1280) | 4 | 3 | **3** |
| The day: 7 cooks, a section and a break each, then Save, 1280 | 29 | 22 | **22** |
| Break times offered to Dev | 21 | 11 | **11** |
| Rows wholly in one screen from the first row, 390 / 768 / 1280 | 3 / 7 / 6 | 1 / 6 / 5 | **1 / 5 / 5** (Gus, two services, is tall) |
| Rows wholly in one screen from Ari (one service each), 390 / 768 / 1280 | not measured reliably | not measured | **2 / 6 / 6** |
| Median row px, 390 / 768 / 1280 | 123 / 104 / 104 | 211 / 117 / 117 | **202 / 118 / 111** |
| Add a service (Ari onto Dinner), 390 | Breaks, Dinner (off), Add Dinner: 3 | Services, then the chip: 3 | **1** |
| Take someone off a service (Cal off Lunch), 390 | Breaks, Remove Lunch and its breaks: 2 | 3 | **2** (Take off Lunch, Tap again); **Undo** in place puts back the service, section, breaks and roster hours (1) |
| Clear the whole day, 390 | 30, then Save | 3, then Save | **3, then Save** |
| A sous chef on `#/team`, 390 | grid | | **9 rows, no Clear, no sideways scroll, no errors** |
| Sideways scroll, browser errors (390, 768, 1280) | none | none | **none** |

Screenshots: `D-plan-390.png`, `D-dev-390.png`, `D-dev-768.png`, `D-dev-1280.png`, `D-day-1280.png`, `D-takeoff-390.png`. The "from Ari" count for today's page came out short of room (the scroll stopped early), so the first-row count is the comparison.

**Contract fit:** sage book and paper: Works. Words on every state ("No break yet", "Not saved yet", "Tap again to take Cal off Lunch"): Works. The break as a shape and colour with words: Works by precedent; the bar track is gone (the 1.08:1 finding). Real contrast, keyboard focus on the new picker and links, reduced motion: Not evidenced. A failed Save, a lock and a second writer: unchanged code paths, Not evidenced. "Nobody on reads as Not set": not in the preview; pull request 1.

**Not evidenced:** real fonts on a phone; a day with no roster hours (the sentence then says "Lunch hours 10:00 to 15:00"); five services in the sticky head on a phone; about 20 people; a picker held open while bars redraw; the roster-to-service mapping (the head chef's question).

### Follow-up on D (designer, skeptic, new starter) and the repairs

| Finding | Who | Evidence | Repaired in the preview |
| --- | --- | --- | --- |
| "Take off" alone is vague; red at rest on ten lines competes with Save; the armed words wrapped to three lines at 390 px | New starter, designer | Screenshots | "Take off Lunch" in ink; red "Tap again to take off" once armed; the full words for a screen reader |
| "(shows only when someone is on it)": "it" is unclear | New starter | Words | "(hidden until someone is on it)" |
| Take off drops the service's breaks and roster hours without a word; the message pointed to a picker that had gone with the row; focus fell to the page | New starter, skeptic | **Reproduced** at 390 px (skeptic) | "Cal taken off Lunch and its breaks. Not saved yet. Undo", in the row or where the row was; Undo puts back the service, section, breaks and roster hours ("Undone: Cal is back on Lunch ..."); focus moves to Undo. Checked in the preview: Cal's words read "Roster 10:00 to 14:30" again |
| Add a service's dashed edge reads as No section; at the row's top corner it is the first thing seen | Designer | Screenshots | A quiet solid picker at the spare end of the last service line (its own line at the end on a phone) |
| Add a service did not carry the date | Skeptic | Checked in source | It carries the date like the other row controls |
| A chef's "Head chef" picker looked empty (dashed) | New starter | Screenshot | Solid edge, ink words |
| + Break sat 340 px from its section at 1280; break pickers wrapped at 768 | Designer | Screenshots | + Break straight after the breaks; below 1100 px the breaks take their own line; at 1280 the line wraps whole items |
| The bars outweigh the controls; Eli's bar read as an underline at 390 | Designer | Screenshots | 6 px bars with space above |
| Spread "one at a time" can put several on break together once breaks are kept inside hours, and says nothing | Skeptic | **Reproduced** at 1280 px | Spread names who it moved: "Moved inside their hours: Cal 14:00, Dev 14:30" (checked in the preview) |
| Two roster times in the sentence did not say their services | Skeptic | Words | "Roster: Lunch 08:00 to 15:00, Dinner 17:00 to 21:00" |
| A hidden shift added by hand (Bea onto Smoker 06:00 to 15:00) takes the service's hours, gets a split at 10:30 before she starts, and widens the day's scale to 06:00 | Skeptic | **Reproduced** at 1280 px | Not repaired: a question for the head chef (should a service added by hand take that day's roster hours?) |
| Take off armed, then a date change | Skeptic | Checked in source: the arm is keyed by date | Safe |

Contrast computed from tokens, not rendered (designer): Take off 7.35:1 at rest; the break block 4.77:1 on the bar, its paper edge 15.9:1. Keyboard focus on the new controls, a picker held open while bars redraw, a failed Save, a lock and a second writer: **Not evidenced**; click tests before release.

## Recommendation

**Recommend D, the mix: C's rows on one clock, A's words and fixes, B's single scale, with the chips and the Breaks panel replaced by Add a service and Take off (with Undo).** It is what all six scorers asked for, it fits the head chef's direction to restyle the room, and it keeps every function on the keep list. A cook's section and break take 3 taps, not 4; a day of 7 cooks 22, not 29; adding someone to a service 1, not 3; clearing a day 3 and Save, not 30. Break times sit inside each person's hours (Dev: 11 times from 12:00, not 21 from 10:00). The time, the section and the break are on one line next to the bar (Airbnb, Things 3), one scale reads the day (Flighty), one place for each job (Linear), plain words on every state (Headspace, Duolingo).

**Main downside:** everyone relearns the room a day after the grid was chosen, and a phone shows two one-service people a screen, not three (202 px rows against 123). The test files for the grid, the panel and Whole day review are rewritten.

**Build in three pull requests** (keeper): (1) on the current grid: time order, one hours helper, break times, + Break and Spread inside each person's hours with the moved names said, Clear this day, and a plan with nobody on reads as Not set everywhere; (2) the restyle: D's rows replace the grid, the panel and its chips, and Whole day review, in one go with no switch; (3) after the head chef has used it: the saved overview and the past day on the same bar and hours helper, dead code and CSS out, design pattern entries.

**Open for the head chef:**
1. How a roster time maps to services: the roster now saves the whole time on every service it touches (Mo 10:00 to 21:00 on Lunch and on Dinner). Cut it to each service's hours?
2. A service added by hand (Bea onto Smoker): take that day's roster hours, or the service's hours?
3. The 9 November rule (Lunch, then Dinner, then saved order) changes to time order.
