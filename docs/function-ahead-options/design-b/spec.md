# Design B: The run-up

Council round 2, functions ahead of time, 10 Nov 2026. A design preview only: no app file is changed. Every number below is **Preview** unless it says **Implemented app**.

**Central idea.** A function is a short run-up with three milestones (order the stock, prep ahead, the service), and each milestone shows inside the page where that work happens: the week sits on Home as a strip of days, Prep carries the function in its own list frame, Orders carries the stock line's state, and the band keeps only the day itself.

How this differs from a "quiet line in the band" design: the week lives on Home as a day strip with an in-place run-up card, not in the band; Prep's mention is a line inside the notebook's own frame, not a bar under the top bar; the band loses its order-day and Tomorrow lines instead of gaining a line; and what shows changes with the milestone day, not with a single "next function" rule.

## Files

- `home.html` (Ann, staff, 390), `prep.html` (Ann, 390, two days before Smith 60th), `orders.html` (Ann, 390), `home-head-1280.html` (Bo, head chef, 1280), `runup.html` (27 framed phones: every run-up day and every added state).
- `states/*.html`: the run-up frames on their own. `src/b.css` and `src/b.js`: the preview styles and the in-place open and fold (inlined into each page by `build.cjs`).
- `build.cjs` builds every page from the baseline snapshots of the real app (`../baseline/*.html`, real `css/app.css`, bundled fonts). `capture.cjs` builds, serves the repo on 127.0.0.1:8792, screenshots to `shots/` and writes `measurements.json`. Run: `cd docs/function-ahead-options/design-b && node capture.cjs`.
- Synthetic data: Tuesday 10 Nov 2026, 14:00 Queensland. Smith 60th, Thu 12 Nov, 60 guests, event 18:00, food 18:30 and 19:15, 5 Antipasto and 5 Pizza platters, 4 gluten free, 1 nut allergy, Function room. Jones wedding, Sat 14 Nov, 90 guests, food 18:00, 6 Antipasto, Beer garden. Both ordered on Sunday 8 Nov (the order day rule in `js/functions.js`). Extra state: Lee engagement, Sat 14 Nov, 40 guests.

## What shows on which page on which run-up day

A Thursday function, Smith 60th (Thu 12 Nov). Its order day is Sun 8 Nov (the last Sunday at least 4 days before). Changes from today are in bold.

| Day | Home | Prep | Orders | Band (Prep, Orders, Wastage, Transfers, Recipes...) |
| --- | --- | --- | --- | --- |
| 8 or more days before | No strip unless another function falls in the next 7 days | Nothing | Nothing | Nothing (as today) |
| 7 to 5 days before (Thu 5 to Sat 7) | **This week strip under the greeting: the Thu cell says Smith 60th, 60 guests.** Coming up no longer lists functions | **This week line at the top of the list body, folded: "Thu Smith 60th · Show"** (46 px) | Nothing | Nothing (as today) |
| Order day (Sun 8) | **Strip, with "Order the stock today" in its label line.** Now and next keeps its order row (as today) | **This week line with an "Order today" tag** | **The function stock line (as today) carries an "Order today" tag and "For Thu 12 Nov"** | **No "Order today" line** (moved to Orders, Home and the Prep line) |
| After the order day, line not ticked | Strip | This week line | **The rolled stock line says "Not ordered yet" and "order day was Sun 8 Nov"** | Nothing |
| 3 and 2 days before (Mon 9, Tue 10) | Strip | This week line, folded | Nothing new | Nothing (as today) |
| The day before (Wed 11) | **Strip: the cell says Tomorrow; label line "Prep ahead today"** | **Prep ahead entry, open by itself at the top of the list: Tomorrow: Smith 60th; platters and dietaries; What the platters need (moved from Handy) with Add; "[Prep ahead list] To come". Hide folds it to one line for the day** (135 px open, 46 px hidden) | Nothing | **No Tomorrow line** (moved into the Prep list) |
| The day (Thu 12) | **Strip: the cell is charcoal and says Today.** Now and next shows the next round (as today) | Band as today (115 px). Platter lines under Functions (as today). **The This week line moves to the end of the list** for the other functions | Nothing | Today's rounds, Sent ticks, In 10 min, the pinned strip (as today) |
| After the day | Gone | Gone | Gone | Gone |

Rules behind the table:

- The strip shows confirmed functions in the next 7 days, today first. Drafts never show. A cancelled function shows struck through with the word Cancelled until its date passes [or for 2 kitchen days after the cancellation, head chef's choice]. A rescheduled function shows on its new day with the existing Rescheduled tag.
- Plain days are not buttons. A function day is a paper button; tapping it opens that day's run-up card in place under the strip (not a pop-up). The card holds the day, place, guests, event and food times, platters, dietaries, The run-up (Order the stock, Prep ahead, Service with dates and Next), Open the full sheet and Close. Chefs also get To check (the existing checks) and Change this function.
- The Order step never says Ordered on Home: Home does not hold the order list, so it says "Function stock stays on the order list until a chef ticks it." A true done tick would need an ordered stamp on the function (a new write and a rules change), which is not proposed.
- Prep's This week line lists the functions after today in the next 6 days. It is folded by default; opening it shows each function in two to four short lines (day, name, guests and food times, platters with dietaries in bold, the next milestone); each row opens the existing function sheet. Its open or hidden state lasts for the kitchen day on this phone (`lk.*`, like `lk.fn.fold`).
- The line only appears or disappears when Prep is opened, never while the list is on screen, so it never moves a row under a finger (see Break it, 1).
- No new reads, writes, rules or listeners: everything comes from the functions listener every phone already holds (`kq` from today, limit 150), the order list's existing listener on Orders and each order line's existing `fn` field.

## Main task walkthrough

**A cook arrives on Tuesday 10 Nov.** Ann types her PIN; the first PIN of her day opens Home (#659).

1. Under "Hello, Ann, Tuesday 10 November", the This week strip shows Tue 10 to Mon 16. Thursday's cell reads **THU 12, Smith 60th, 60 guests**; Saturday's reads **SAT 14, Jones wedding, 90 guests**. No tap, no scroll: the first mention starts 211 px down, on the first screen (Preview, 390 x 844; the tab bar starts at 776 px).
2. She taps Thursday (1 tap). The run-up card opens in place: Function room, event 18:00, food 18:30 and 19:15, 5 Antipasto and 5 Pizza (10 platters), Dietaries 4 gluten free, 1 nut allergy, then The run-up: Order the stock (Sun 8 Nov, past), **Prep ahead, Next, Wed 11 Nov, tomorrow**, Service (Thu 12 Nov). The whole card ends at 715 px, still above the tab bar. Close, or tap Thursday again, folds it.
3. She taps Saturday the same way for the Jones wedding (1 tap).
4. She opens Prep. Her list starts as usual; one folded line in the list's own frame says **This week: Thu Smith 60th · Sat Jones wedding · Show**. Tapping it (1 tap) shows both with guests, food times, platters, dietaries and their next milestone.
5. On Orders she sees the Jones stock line still open: "Not ordered yet, For Sat 14 Nov, order day was Sun 8 Nov". She tells a chef; staff cannot tick it.
6. **Wednesday**, the strip's Thursday cell says Tomorrow and the label says Prep ahead today. Prep opens with the Prep ahead entry at the top: Smith 60th's platters and dietaries, What the platters need: 13 (Add puts an item on the list, as today), and [Prep ahead list] To come. The band no longer repeats it.
7. **Thursday**, the band shows the rounds as today; the strip's cell turns charcoal (Today).

## Pros and cons

Pros
- The head chef's case is fixed where people look first: a function this week is on the first screen of Home at every first sign-in (Preview: 211 px, was 998 px and below the fold in the same conditions; **Implemented app** baseline 955 px).
- Each mention is useful in its place: Prep says what to prep ahead (and the dietaries) on the day it matters; Orders says whether the stock is still to order; Home shows the shape of the week.
- The band gets quieter, not louder: on 6 of the 7 run-up days it shows nothing, on the day it is unchanged. No week of functions over every work page.
- One tap to every detail from Home or Prep, without leaving the page; no new pop-up, top bar button or tab.
- No new reads, writes, rules or listeners; cancellations and stale copies are shown in words.

Cons
- Three pages change, plus the band: the most relearning of a small set of designs, and 3 pull requests.
- Prep loses one visible row on the days a function is coming (6 to 5 at 390), and the Prep ahead entry on the day before is 22 px taller than the band it replaces (4 rows either way).
- Home's staff-first order changes: the strip comes before Your day, so the coworker board's last rows move below the tab bar on a 390 phone.
- The order and Tomorrow reminders leave Wastage, Transfers and Recipes. Someone who never opens Home, Prep or Orders that day misses them.
- Home cannot say a stock order is done without a new write.

## Comparison table (Preview unless marked)

| Measure | Baseline | B, The run-up |
| --- | --- | --- |
| First mention of Smith 60th on Home, 390 x 844 | 998 px, not on the first screen (Preview of the baseline snapshot); **Implemented app**: Coming up at 955 px | 211 px, on the first screen |
| First mention on Home, head chef, 1280 x 900 | 801 px | 293 px |
| Taps from Home to Smith 60th's time, guests, platters and dietaries | 1 tap and a scroll (scroll to Coming up, Open functions, read the card; counted from `js/functions.js`, not measured) | 1 tap, no scroll (measured: card ends at 715 px) |
| Taps from Prep to the same details | 2 taps and a scroll (back to Home, scroll, Open functions; counted, not measured) | 1 tap (measured: details end at 464 px) |
| Prep rows fully visible above Add a line, 390, Tue (2 days before) | 6 | 5 (the 46 px This week line) |
| Prep rows, 390, the day before | 4 (band 113 px) | 4 (Prep ahead entry 135 px; 46 px when hidden, 5 rows) |
| Prep rows, 390, the day | 4 (band 116 px) | 4 (unchanged) |
| Prep rows with This week opened (chosen by the cook) | not applicable | 3 (two functions), 1 (three functions) |
| Orders: added above the list | 0 | 0 (the tag sits in the line) |
| Home: Your day card top / coworker board bottom, 390 | 169 / 739 px (above the 776 px tab bar) | 293 / 863 px (last rows below the tab bar) |
| Home, head chef 1280: Your day top / coworker bottom | 251 / 617 px | 381 / 747 px (inside 900 px) |
| Main task taps (add a line, tick a line, add a request) | 1 | 1 (unchanged) |
| Navigation levels | Home, then #/fn, then the card | Home, the card opens in place (no new level); Prep, the line opens in place |
| Build size | | 3 pull requests: Home strip and card; Prep line and Prep ahead entry with the band change; Orders tags |
| Relearning | | Medium: a new strip on Home, a new line on Prep, the band's order and Tomorrow lines move |
| New reads, writes, rules, listeners | | None. One per-day fold flag on the phone (`lk.*`) |
| Sideways overflow, every page and state at 390, 768, 1280 and the 1440 frames page | 0 | 0 |
| Risk | | Medium: the band change and the staff-first order are departures; the Prep line could move rows if drawn live (designed out, not evidenced) |

## Contract fit

Evidence: `measurements.json`, `shots/`, `runup.html` (Preview: static snapshots with the real stylesheet; no live data, clock, mascot or keyboard runs).

| Check | Fit | Evidence |
| --- | --- | --- |
| Surface purpose | **Works** | The strip is a quiet reference surface (`--surface-reference`), function days quiet paper (`--surface-paper`) with an ink edge, today's function the live charcoal (`--bar`, as the band and Your day). Prep's line sits inside the steel-covered notebook on its paper page, with no new surface. Orders keeps its steel book. No new palette: `src/b.css` uses app tokens only. |
| State meaning | **Works**, one item for the head chef | Upcoming is neutral ink on paper, never amber. Amber appears only with named attention: "Order the stock today", "Order today", "Not ordered yet" (the existing `fn-t-order` tag). Cancelled uses the error family with the word and a strike. The open day uses the chosen-chip orange with `aria-expanded`, as the Prep section chips do; the head chef should confirm that orange reads as "chosen" here and not as "late". The Order step never claims Ordered without data. |
| Words and exceptions | **Works**; Moved **Not evidenced** | Every state has words: Today, Tomorrow, Next, Cancelled, Do not prep or send, Order today, Not ordered yet, No signal, Could not load, [Prep ahead list] To come. Dietaries are words, not a colour; nothing implies food is safe. The Rescheduled tag is kept by rule but not drawn in a frame. Print unchanged. |
| Real contrast | **Works** for every added part measured; focus **Not evidenced** | Lowest measured ratios on their real backgrounds (`contrastWorst`): open day text 5.05:1, plain weekday and count 6.21:1, guests and step words 6.73:1, cancelled words 6.64:1, Prep ahead label 4.76:1, all others 6.2 to 15.9:1. Found and repaired: the shared `fn-t-order` tag is 4.04:1 with `--accent-ink` words and 4.46:1 with `--small-ink` on its tint, so B uses ink words (13.48:1), as the band already does on charcoal. This also affects the existing tag wherever it sits on paper (an existing issue to check). Focus rings are styled (3 px, `--accent-ink`) but not captured. |
| Relevant states | **Works** for the drawn states; others **Not evidenced** | Drawn: ordinary, open, folded, Hide on the day before, cancelled (strip, card, Prep), no signal with a copy (Home, Prep), failed read with no copy (never "nothing on"), an empty week (no strip), two functions on one day, three in a week, the head chef. Not drawn: Rescheduled, drafts (never shown), short-notice order day, Checking (loading), large and extra-large text, four or more functions in a week, Functions-only and signed-out Home. Save, Saved and Not sent do not apply: B adds no write. |
| Service continuity | **Needs work** | Main tasks stay one tap. Prep at 390 loses one of six rows on the days before a function; the day before and the day keep 4. Home's coworker board ends 124 px lower (crosses the tab bar at 390). Tap targets (measured at 390): function cells 87 x 74 px with two functions in the week; plain days are not buttons; the Prep line and its rows are 44 px or more. |

## Design references

| Principle | B | Reason |
| --- | --- | --- |
| Linear (consistent frame, work over navigation) | **Needs work** | One name for each thing (This week, Prep ahead, The run-up) on every page and each mention sits in its page's own frame. But on Home the strip is placed before the person's own day, so upcoming information leads the personal work. |
| Things 3 (today and upcoming distinct) | **Works** | Today's list leads Prep; the week is one folded line; on the day before only tomorrow's prep shows; on the day the line moves to the end. Details are one tap away, frequent actions untouched. |
| Airbnb (time, place, needs, status and next step together) | **Works** | The card shows day, place, guests, times, platters, dietaries, milestone status and the next step in one place, one tap from Home (measured). |
| Todoist (quick adding, known defaults) | **Not relevant** | B adds no form. The existing What the platters need Add (amounts filled in) is kept, moved into the list on the day before. |
| Flighty (now and next with real times, no polling) | **Works**, one gap | Real dates for each milestone, Next marked, Today and Tomorrow in words, from data already held. Gap: Home cannot show the order milestone's real state without a new write. |
| Duolingo (truthful progress, clear next step) | **Works** | Past steps are grey with their date, never ticked; Next is named; nothing says done or Saved without data. |
| Headspace (calm short labels, words on actions) | **Works**; new words **Not evidenced** | Show, Hide, Close, Open the full sheet; no unexplained icons. "Prep ahead" and "The run-up" are new words for new starters, untested with staff. |

## Break it (foreseeable, not reproduced unless said)

1. **A row moves under a finger** (Prep, any role, during service). A booking confirmed on another phone makes the This week line appear above the rows; drawn live, every row drops 46 px as a cook taps. Design: the line appears or changes only when Prep is opened, never mid-view; a later change to an existing line changes words, not height. Risk / Not evidenced: needs a click test that confirms a booking while the list is open and checks the first row's position, like the header-height rule.
2. **Offline copy shows a cancelled function** (Home and Prep, a phone without signal). A cook could prep ahead for a function cancelled since. The strip and the line keep the copy with "No signal. Functions last updated 13:42."; a phone opened offline with no copy says "Could not load functions. Check the signal." and never shows an empty week. Platter lines still only appear on the day. Checked in the preview frames only; the listener paths need an emulator check.
3. **The reminders leave the band** (order day and day before, on Wastage, Transfers and Recipes). A chef who works from Recipes on Sunday no longer sees "Order today" there. Mitigation: Home's Now and next row, the strip's label, the Prep line, the Orders tag and the head chef's existing cut-off bar. If the head chef wants a safety net, keep the band's order line only (smallest repair).
4. **An order day outside the strip.** A Monday or Tuesday function is ordered 8 to 10 days ahead (the Sunday rule), so it is not yet in the 7-day strip on its order day. The label line must name it ("Order the stock today: Mon 16 Nov, Brown 40th") and open its card. Not drawn; needs a frame and a test.
5. **Midnight.** At 00:00 Queensland the Prep ahead entry must hand over to the band on the same clock paint, never both or neither. Both come from the same list and clock in `js/functions.js`. Risk / Not evidenced: needs a clock test either side of midnight.
6. **Long names and busy weeks.** Names wrap to two lines in a cell and stay whole in the card; four or more functions in a week narrow each cell (about 50 px with seven). Not drawn beyond three.
7. **The mascot's card spot.** When the welcome words fill the corner, the mascot stands on Your day's header and peeks above it, which could now reach the strip. The preview cannot run the mascot (measured no overlap with its corner box only). The mascot clearance check needs the strip added.

## Needs the head chef's OK (service rules)

1. **The band** stops showing the order-day line and the Tomorrow line (a change to the 22 Oct decision). They move to Orders, Home and the Prep list.
2. **Staff-first Home**: a This week strip before Your day (a change to the 9 Nov order); the coworker board's last rows fall below the tab bar on a 390 phone. Coming up loses its functions part to the strip.
3. **Prep**: a new line inside the list (not over it) on the days a function is coming, costing one of six visible rows; on the day before, the Prep ahead entry at the top of the list, and What the platters need moves there from Handy. This changes where a prep tool sits, not how lines are added or ticked.
4. **Not proposed, listed for a decision**: putting the function's platter prep lines on the list the day before (today they appear on the day). That would change how the service task is done.
5. **To come**: what is prepped ahead for each platter. Until the head chef confirms it, the preview shows only "[Prep ahead list] To come" and the existing What the platters need (from the platter cards).
6. No new tab, top bar or tab bar button, and no pop-up: the card and the line open in place. An "Ordered" stamp on Home would need a new write and a rules change and is not part of B.
