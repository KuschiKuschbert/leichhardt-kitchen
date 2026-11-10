# Design A, Fill the gap

Functions ahead of time council, round 2, 10 November 2026. **Design preview only:** no app file changed. Every measurement here is **Preview**: static pages built from the implemented-app snapshots in `../baseline/` (main `184174e`, scripts removed, the real `css/app.css`), synthetic data, bundled Barlow, Barlow Condensed and Caveat fonts, Chromium headless shell 1243, deviceScaleFactor 1. Baseline numbers were taken from the same snapshots with the same script, so before and after use one method. Raw numbers: [`measurements.json`](measurements.json). Screenshots: [`shots/`](shots/). Run-up sheet: [`runup.html`](runup.html), [`shots/runup-1280-full.png`](shots/runup-1280-full.png).

## Central idea

Keep every surface the book has and fill the two measured gaps: on days the band would be empty, one quiet **Next function** line sits in the band's slot on every work page, and the same line sits on Home directly under Your day, so a function this week is on the first screen everywhere.

## What changes, exactly

1. **The Next function line on the work pages** (Prep, Orders, Wastage, Transfers, Recipes: every page with the band's slot, except the `#/fn` pages, which list the functions themselves).
   - Shows only when the band would show nothing: no function today, no Order today line, no Tomorrow line, no cancelled or moved notice.
   - Names the nearest confirmed function in the next 7 days (in practice 2 to 7 days ahead, because tomorrow is the band's own line), by date, then first food time, times TBC last.
   - Words, two lines on a phone, one line from 720 px: **NEXT FUNCTION · THU 12 NOV** then **Smith 60th** · 60 guests. Weekday and date in words (`dayName()`); guests through `guestsText()` ("guests not known yet").
   - **+1 more** (from 600 px "+1 more this week") when other confirmed functions fall in the same 7 days. It opens `#/fn`.
   - A tap on the line opens the existing function sheet.
   - The band's round minus hides the line on this phone for the rest of the kitchen day (the band's own `lk.fn.fold` key, out of date at midnight). The slip answers where the eye is: "Next function hidden on this phone until tomorrow. Home still shows it." with Undo, which brings the line back and puts focus on its minus.
   - Never stacked: when the band has its own line, the band shows exactly as today and the Next line steps aside.
   - No signal after the list was read: the line stays, with the band's existing words under it, "No signal. Functions last updated 13:52." Opened with no signal and nothing read: no line, never "no functions". A failed read keeps the band's existing "Could not load functions" words in the slot.
   - Cancelled within the 7 days: for the rest of the kitchen day it was cancelled (`canAt`), the line shows the existing red **Cancelled** tag, the struck name and "Do not prep", then moves on to the next function. A moved function does the same with the existing **Rescheduled** tag and "now Sat 21 Nov" (not drawn in the preview).
   - Look: quiet reference paper (`--surface-reference`), ink words, a 1.5 px ink rule under it, the date in `--small-ink` as on Home's Coming up. Not charcoal (charcoal means live) and not amber (not attention). No motion.
2. **Home: the same line directly under Your day**, on a pinned quiet card. From 720 px it sits in the left column under Your day, in space that is empty today. On Home it names the nearest confirmed function from today to 7 days ahead, whatever the band would show: "Tomorrow" the day before, "Today 18:30" on the day (Now and next keeps the round row with its Sent tick, as today). No minus on Home. Coming up leaves out the function on the line, as it already leaves out what Now and next shows, so nothing is listed twice. The rest of Home's order is unchanged.
3. **Two small gaps found while measuring:**
   - `#/fn` Upcoming shows **the next 7 days**, not 3. Today a Saturday function seen on Home on Tuesday is missing behind Home's own "Open functions" link until "Show the next 14 days" is tapped. Home's Coming up has looked a week ahead since 8 Nov 2026.
   - The function sheet's first line adds the guests: "Thu 12 Nov · Function room · event 18:00 · **60 guests**". The `#/fn` card already shows them.

Unchanged: the band and its strip on the day before and the day, the order day line on the band and the order list, the prep lines on the day, To check for chefs, the service view, pings.

## What shows on which run-up day

A confirmed function on Thursday 12 Nov, booked a week or more ahead, order day Sunday 8 Nov. Jones wedding on Saturday 14 Nov in the same week. Frames: [`runup.html`](runup.html).

| Day | Work pages (the band's slot) | Home | Other places |
| --- | --- | --- | --- |
| 7 to 5 days before (Thu 5 to Sat 7) | **New:** Next function · Thu 12 Nov · Smith 60th · 60 guests, +1 more (50 px) | **New:** the same line under Your day (first screen); Coming up lists the rest | Chefs: To check, as today |
| Order day (Sun 8) | The band's Order today lines, as today (171 px for two) | **New:** the line; Now and next's order rows, as today | Order list: Function stock line, as today |
| 3 and 2 days before (Mon 9, Tue 10) | **New:** Next function line (was nothing) | **New:** the line | `#/fn` Upcoming, now 7 days |
| Day before (Wed 11) | The band's Tomorrow line, as today (113 px) | **New:** the line says **Tomorrow** | |
| The day (Thu 12) | The band's live rounds and strip, as today (116 px) | **New:** the line says **Today 18:30**; Now and next's round row, as today | Prep list Functions lines, service view, as today |

Two functions in the same week: the line names the nearest, "+1 more" counts the rest. Saturday's function is on the work pages again on Friday as the band's Tomorrow line; from Wednesday to Thursday it is on Home ("+1 more", Coming up) and `#/fn` only.

## The main task: a cook arrives on Tuesday

Ann's first PIN of the day opens Home (since #659), Tuesday 14:00.

1. **Home, no tap:** under Your day, "NEXT FUNCTION · THU 12 NOV / Smith 60th · 60 guests" with "+1 more". The name starts at 413 px; the tab bar starts at 776 px. Today it starts at 998 px, below the first screen.
2. **One tap on the line:** the existing sheet shows Thu 12 Nov · Function room · event 18:00 · 60 guests; Next out 18:30, round 1 of 2: 3 × Antipasto, 2 × Pizza; whole function 10 platters; every round; Service and dietary notes "4 gluten free, 1 nut allergy." In the preview all four (time, guests, platters, dietaries) are on screen after that one tap, no scroll ([`shots/home-390-sheet.png`](shots/home-390-sheet.png)).
3. **Saturday:** one tap on "+1 more" opens Functions, the next 7 days: the Smith 60th card, then the Jones wedding card at 833 px (one short scroll at 390 px): event 17:00 · Beer garden · 90 guests, food 18:00, 6 × Antipasto.
4. **Prep:** the same line under the top bar. The list starts 50 px lower: 5 complete prep rows above Add a line instead of 6. The minus hides the line for today (6 rows again) with a slip and Undo. Add a line and ticks are untouched.
5. Wednesday the band's Tomorrow line takes the slot; Thursday the live band. Nothing reaches anyone who does not open the book: no ping, no push, as today.

## Measured (Preview, 390 x 844 unless stated)

| Measure | Baseline (snapshot, same method) | Design A |
| --- | --- | --- |
| Home: first "Smith 60th" | 998 px, not on the first screen | **413 px, on the first screen** |
| Home: On with you starts | 389 px | 460 px (+71) |
| Home: coworker rows above the tab bar | 5 of 5 | 5 of 5; its "View today's full team" link moves under the tab bar (card ends 739 → 811 px) |
| Home: page height | 1319 px | 1358 px (+39: the line, less the Coming up row it replaces) |
| Home 768 x 1024: first "Smith 60th" | not measured | 548 px, on the first screen |
| Head chef Home 1280 x 900: first "Smith 60th" | 801 px (just inside the window) | 518 px; Coming up still at 758 px, nothing else moves |
| Prep: added above the list | 0 px | 50 px (cancelled 54, long name 70, no signal 76) |
| Prep: complete rows above Add a line | 6 | **5** (6 after hiding for the day) |
| Orders: added above the list / rows visible | 0 px / 2 of 2 | 50 px / 2 of 2 |
| Prep, day before / on the day / order day | 113 / 116 / 171 px; 4 / 4 / 3 rows | unchanged |
| Head chef Prep during an order cut-off | cut-off bar 68 px | line 50 + cut-off bar 68 px; 4 rows |
| Sideways scroll | 0 | 0 on every page and frame at 390, 768 and 1280 px (75 checks) |
| Text contrast of the line | | label 6.21, date 4.86, words 9.91, name 14.69, +1 more and minus 16.87, Cancelled tag 6.64, no signal 4.86 (all to 1) |

## Home placements measured

The brief allowed moving Coming up or a row in Your day. All three were built and measured at 390 px ([`home-alt-card.html`](home-alt-card.html), [`home-alt-row.html`](home-alt-row.html)).

| Placement | First "Smith 60th" | On with you starts | Coworker rows on the first screen | Fit |
| --- | --- | --- | --- | --- |
| Today | 998 px, off screen | 389 px | 5 of 5 | |
| **Chosen: the quiet line under Your day** | 413 px | 460 px (+71) | 5 of 5 | Quiet reference surface; the same piece as the work pages |
| Coming up card moved under Your day | 431 px | 591 px (+202) | 3 of 5 | Costs three times as much and grows with each function and, for chefs, each cut-off |
| A row inside Your day | 403 px | 460 px (+71) | 5 of 5 | Same cost, but puts a function days away on the charcoal personal board (charcoal means live; Your day means your shift) |

## Pros and cons

**Pros**
- Answers the head chef's question with the least change: on the days the band is empty (most of the week), a function this week is now visible on every work page and on Home's first screen, with no tap.
- One new piece, the same on every page, in a slot the team already knows. The tap opens the sheet they already use.
- No new read, write, rule, listener, saved copy, top bar button, tab or pop-up.
- Never competes with the band's Order, Tomorrow and live lines; those keep their own look and words.
- Fixes the two gaps found on the way: Saturday hidden behind Home's "Open functions", and guests missing from the sheet.

**Cons**
- Costs one complete prep row on a 390 px phone on band-empty days (6 → 5 in this fixture). Hiding it for the day gives the row back.
- Moves On with you 71 px down on Home; with a bigger team, the last coworker rows go below the first screen. This departs from the staff-first order (work after people) for one line.
- Still passive: a cook who never opens Home or a work page learns nothing. Not a push and not "everyone has seen it".
- Only the nearest function is named on the work pages; Saturday's shows only as "+1 more" until Friday.
- The head chef's own phone stacks the line on the cut-off bar during a cut-off (118 px, 4 rows).

## Summary

| | Design A |
| --- | --- |
| Taps to know a function is coming | 0 on Home and every work page on band-empty days (today: a scroll of about 240 px on Home; not shown on Prep) |
| Taps to see time, guests, platters, dietaries | 1 from Home or Prep (today: Home 1 tap after a scroll of about 360 px; Prep 2 taps, chef hat then Functions) |
| Taps for Saturday's details | 1 and a short scroll (today: 2 from Home after scrolling, 3 from Prep, because `#/fn` shows 3 days) |
| Lines visible on Prep at 390 | 6 → 5 on band-empty days; unchanged on band days; 6 once hidden for the day |
| Navigation levels | Unchanged: line → sheet (1); +1 more → Functions (1) |
| Build size | 1 pull request (the line in `js/functions.js`, its Home slot in `js/prep.js` `homeSlot()`, CSS, tests); the 7 days and the guests fit in the same one, or a second small one |
| Relearning | None: the same slot and sheet, one quiet line |
| New reads, writes, rules, listeners | None. The functions listener already held (from 00:00 today, limit 150) has every upcoming confirmed function. `lk.fn.fold` reused, no new saved copy |
| Risk | Low. Main risks: the midnight change, a stale line with no signal, the lost prep row |

## Contract fit

| Check | Verdict | Evidence |
| --- | --- | --- |
| Surface purpose | **Works** | Quiet reference (`--surface-reference`, rendered rgb(242, 239, 232)) is the approved role for quiet reference information. Not charcoal (live boards and bands) and not amber. Home keeps its pinned card family; the line sits on its own quiet card, not inside Your day's charcoal. The live band on the day before and the day stays charcoal. |
| State meaning | **Works** | The date uses the book's heading orange (`--small-ink`) exactly as Coming up's dates do, not an attention fill. Cancelled uses the existing red tag with "Do not prep"; no signal uses the band's existing orange pending words. Nothing claims Saved or done. |
| Words and exceptions | **Works** | Every state has words: Next function, Tomorrow, Today 18:30, Cancelled, Do not prep, No signal, hidden until tomorrow. New and Moved tag colours are kept. The band is already hidden in print. |
| Real contrast | **Works** for text, **Not evidenced** for focus and large text | Rendered ratios in the table above, all 4.5:1 or more. The strip against the page is only 1.1:1, so its edge is the ink rule (16.16:1). Focus rings are defined (3 px `--accent-ink`) but not captured; the large text setting and 360 px were not checked. |
| Relevant states | **Works** in the preview for ordinary, two functions, folded with slip and Undo (exercised), no signal, cancelled, long name, head chef with the cut-off bar, sheet open. **Not evidenced:** moved, loading before the first server answer, failed read, the midnight change, a person with no access (signed out, Functions only) | `runup.html`, `measurements.json` `taps` and `frames` |
| Service continuity | **Needs work** | Prep loses one complete row at 390 px on band-empty days (6 → 5); Home's On with you moves 71 px. Add a line, tick and On it keep their taps and positions relative to the list. The line never moves during service and has no motion. Needs the head chef's OK under service rule 4. |

## Design references

| Principle | Design A | Why |
| --- | --- | --- |
| Linear | **Works** | One name ("Next function") and one place (the band's slot) on every page; the tap goes to the sheet the band already opens. No second navigation. |
| Things 3 | **Works** | Today (the charcoal band) and upcoming (the quiet line) look different; the upcoming detail is one line, the rest one tap away. |
| Airbnb | **Needs work** | The line shows day, name and guests; time, place, platters and dietaries need one tap (measured all on screen after it). Saturday's needs a tap and a scroll. |
| Todoist | **Not relevant** | Nothing is added or typed. |
| Flighty | **Works** | Real dates from data the phone already reads, no polling; stale data says "No signal. Functions last updated 13:52". No countdown ("in 2 days"); the date in words was the round 1 choice. |
| Duolingo | **Works** | Hide answers at once in place with the slip and Undo (exercised); no rewards. |
| Headspace | **Works** | Calm, short words; no unexplained icon; "+1 more" says "this week" from 600 px and in its spoken label. |

## Break it

| Scenario | Expected | Observed or hypothesis | Disposition |
| --- | --- | --- | --- |
| Midnight Tue → Wed while Prep is open | The Next line turns into the band's Tomorrow line once, never both, never neither | Hypothesis: both come from one `bandHTML()` paint, so never both; but if nothing repaints the band at 00:00 the old line stays until the next data change. The band's Tomorrow line has the same question today. | **Risk / Not evidenced.** Click test with the stand-in clock at 23:59:30 and 00:00:30. |
| A function cancelled or moved on another phone while this one has no signal | The line stays with "No signal. Functions last updated ..." | Checked in the preview (no signal frame). On weak Wi-Fi the phone may think it is online while the listener is quiet: no stale words, old line. | **Risk / Not evidenced** live; same exposure as the band and Home's Coming up today. |
| A cook sees "Smith 60th" on Monday, it is cancelled on Tuesday morning | Tuesday shows Cancelled · Thu 12 Nov · Smith 60th · Do not prep until midnight | Checked in the preview (cancelled frame, 54 px). After midnight the line moves on silently. Moved is specified but not drawn. | Build both, test moved. |
| Long function name on a 390 px phone | Wraps, nothing cut | Checked: 70 px, no sideways scroll. | Done. |
| The head chef's phone during a cut-off | Both show | Checked: 118 px, 4 rows. | Head chef's call (below). |
| A rushed tap meant for the top bar chips lands on the line | Opens the sheet; Close or swipe returns | Hypothesis: harmless, no write. | Accept. |
| Fold count | The line's minus and "+1 more" never push the bar sideways; folding hides it, Undo restores focus | Checked at 390, 768, 1280 (0 px sideways); Undo puts focus on the minus. | Add to the band's fold tests. |
| Wrong role | Signed out and Functions-only users see no line, as the band | Not evidenced: the line uses the band's `privateAccess()` gate. | `tests/roles.test.js` row per page. |

## Needs the head chef's OK

- **Home order:** a function card between Your day and On with you departs from the staff-first contract (work reminders and functions after the personal and team group). Cost: On with you 71 px lower.
- **A line above the list on every work page** on band-empty days: not a pop-up, not over the list, not a top bar button, but it costs one complete prep row at 390 px (6 → 5). Worth it because it is the only place a cook working on Prep can learn of a function 2 to 7 days out; the minus gives the row back for the day.
- **`#/fn` Upcoming 3 → 7 days**, and **guests on the sheet's first line**.
- **A Cancelled or Rescheduled notice on the line** for the rest of the day it changed.
- No new tab, top bar button, tab bar button or pop-up. The sheet opens only on a tap, as today.

## Build notes (for later, if chosen)

- Name the new classes apart from the sheet's `.fn-next` (Next out): for example `.fn-ahead`, `.fn-ahead-b`, `.fn-ahead-more`. Add the pattern to `docs/design-patterns.md` and its names to `tests/design-patterns.test.js`.
- `bandHTML()` returns the line only when it would otherwise return `''`; `landHTML()` leaves out the Home line's function; `pageDays` default 7; `sheetHTML()` sub line adds `guestsText(f)`.
- Tests: the line on each work page on a band-empty day, steps aside on order day and the day before, the minus with slip and Undo, the midnight change, no signal, cancelled, moved, Home first-screen position at 390 and 1280, `tests/read-budget.test.js` unchanged, `tests/roles.test.js`.

## Files

- `build.cjs`: builds every page from `../baseline/` (the only new markup and the `<style>` block are here). `node build.cjs`
- `capture.cjs`: serves the repo on 127.0.0.1:8791, screenshots and `measurements.json`. `node capture.cjs`
- Pages: `home.html`, `prep.html`, `orders.html`, `home-head-1280.html`, `runup.html`, `fn-week.html` (where "+1 more" goes), `home-alt-card.html` and `home-alt-row.html` (measured alternatives), `frames/` (run-up days and states).
- Static previews: the mascot shows its still, and the sheet, slip and Undo are driven by a small preview script; the app's own scripts are not running.
