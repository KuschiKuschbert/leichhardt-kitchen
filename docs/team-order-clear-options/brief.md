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
