# The service pages on the 1920 x 1080 screens: council brief

26 November 2026. The head chef: "Yes all recommendations and I think we need to run a full council on the new 1920". This is round 1 (should we build it?) on [the proposal](proposal.md), with [the packet](round1-packet.md) every reviewer read. **Round 2 waits for the head chef.** Evidence: the implemented app on the click-test stand-in, synthetic data, role-based review. Nobody has watched a cook use these screens.

## Round 1 verdict: Build smaller (five of five)

| Reviewer | Verdict | Their one change |
| --- | --- | --- |
| Cook mid-service | Build smaller | Prep only, each section kept whole, switched on above 1280 px. Orders at a reading width. |
| Head chef | Build smaller | Measure again once the decided work ships; build only where work still sits below the opening screen. |
| Skeptic | Build smaller | Ship A and the quick wins, measure again, take only what is still hidden to round 2, above 1280 px. |
| New starter | Build smaller | The row stays the phone's row everywhere: the room shows more rows, never a different row. |
| Keeper | Build smaller | Every row keeps a fixed place: CSS only, one breakpoint, checks for rows in view and reach. |

### What all five agree on

1. **Ship the decided work first, then measure again.** With the fold (A) and the quick wins, Wastage, Transfers, Orders and Home already show everything on a busy afternoon, and the recipe card shows all of Into the pan. What is still hidden is Prep (9 of 18 complete lines at 1920, the same as the tablet), Cleaning (9 of 46 jobs after the fold) and the reach from Orders' tick to its ⋯ (about 1,020 px).
2. **Leave the 132 px top bar out.** It starts at 720 px, so trimming it at 1920 alone makes two top bars. A whole-book question for the head chef.
3. **Text size stays out.** The screens read "nice and clean" from the bench.

### Where they differ

- **Prep's Wall board.** Skeptic, head chef, new starter and keeper: Prep already shows its sections side by side on the Wall board (`wallOn()` in `js/prep.js`, `.wb-cols` in `css/app.css`), one tap away and remembered. Nobody has pictured it at 1920. Measure it before drawing a second Prep layout. The keeper and the head chef add that it hides More and Remove on each row, so it may not do the whole job. The cook wants Prep's notebook itself to show more, each section kept whole.
- **The reach to ⋯ and ▾.** New starter and head chef: bring them beside their row. Skeptic: Cleaning's job name is itself the open button, 1,112 px wide ([taps.json](taps.json)), so the ▾ is a hint, not the target; and Orders' ⋯ is a rare action with the tick leading the row.
- **The breakpoint.** Cook and skeptic: above 1280 px. Keeper: above 1400 px. The step 2 findings said 1100 px, which would change the 1280 laptop the proposal keeps.
- **Cleaning.** Head chef, keeper and skeptic: wait until the other session's Cleaning results work merges.

### Try to break it (Skeptic and Keeper, with the cook and new starter)

| Scenario | Status | Smallest check |
| --- | --- | --- |
| **A column jumps.** Ann ticks Grill's last line at 1920 touch. A section with nothing left drops out (`pageBody()` returns `''`) and the board's columns fill the gap, so Sauce slides under her next tap. | Risk: read in the source, not reproduced | Tick a section's last line and check no other row moved. |
| **The breakpoint edge.** A screen set to 125 % is 1536 px wide and lands in a layout nobody named. | Risk / Not evidenced | Test at the breakpoint, 1 px either side, and at 1536. |
| **Layouts drift apart.** On Today's team at 1920 one person's controls spread over about 960 px; the same miss was fixed at 1280 and did not carry up. `tests/pages-wide.test.js` checks only sideways scroll, errors and words. | Seen in the step 2 fixture | At every width, each row's controls sit near that row. |
| **Narrow columns wrap the words.** A Wall board column is about 366 px; tick, On it and Urgent take about 170 px, so "Marinate chicken thighs 5 kg" wraps, worse at Extra large. | Risk: worked out from the CSS | Wall board at 1920 touch, busy fixture, default and Extra large, counting complete lines. |
| **The finished section's words go missing.** "Larder is done." checks that its words fit (`finFit`); a new notebook shape can drop them. | Risk | `tests/mascot-wide-finish.test.js` passes unchanged. |
| **A list moving under a wet thumb.** If Prep runs across the spread, one tick (yours or another cook's) moves a line between pages, or splits a section's numbered Urgents. | Risk / Not evidenced | Same check as the column jump. |
| **The answer lands far from the hand.** From 720 px the slip sits bottom middle, so a tick at a column's edge is answered elsewhere; a failed tick on a shared screen is untested. | Risk / Not evidenced | A failed tick on a shared screen at 1920. |

### Found on today's `main`, not caused by this change

- **The phone's row is not the section screen's row (Measured).** At 390 a Prep row reads tick, words, Urgent, On it, ⋯; at 768 and 1920 it reads tick, words, On it, Urgent, ⋯ ([taps.json](taps.json)). A cook who learns Urgent's place on their phone may press On it at the bench. The new starter: a wide layout must not add a third arrangement.
- **Prep keeps your place by the window's scroll.** From 900 px the list scrolls inside `.nb-body`, so it may not keep it (keeper; Risk / Not evidenced).

## The fold, measured after it was built (26 Nov 2026)

The decided fold (A) on the session branch, the step 2 busy afternoon (three routine functions tonight, 14:00), a cook on a shared screen, Today's team as the sous chef. Complete items in view, not under a dock or a bar.

| Page | 390 phone | 768 tablet | 1920 section screen |
| --- | --- | --- | --- |
| Band height | 218 → 50 px | 218 → 50 px | 218 → 50 px |
| Wastage entries | 3 → 5 of 6 | 6 → 6 of 6 | 6 → 6 of 6 |
| Transfers loans | 1 → 3 of 3 | 3 → 3 of 3 | 3 → 3 of 3 |
| Cleaning jobs | 1 → 4 of 46 | 6 → 9 of 46 | 6 → 9 of 46 |
| Today's team people | 0 → 0 of 4 (first starts 757 → 590 px) | 1 → 2 of 4 | 1 → 2 of 4 |
| Recipe card, Into the pan | below the drawing (first line 1372 → 1204 px) | below the drawing | 3 → 5 of 5 |

## Recommendation for round 2

**Build smaller.** Take only what is still hidden after the fold and the quick wins, and keep every row the same row:

1. **Prep at 1920:** picture and measure the Wall board as it is, and the notebook's height, with each section kept whole. Draw designs only if neither shows enough. The notebook running to the bottom of the window moved here from the quick wins (head chef, 26 Nov 2026): measured, it gives 9 to 10 lines at 1920 on a quiet day and none on a busy day, unless the page's 40 px bottom margin goes and the slip with Undo (19 px up, 60 px tall) covers the bottom line's On it, Urgent and ⋯ for a few seconds after each tick.
2. **Orders' rows at a reading width** so the ⋯ sits near its tick. CSS only, the same `rowHTML()` row.
3. **Cleaning** once its results work has merged, against the new `main`.

Switched on above 1280 px (the laptop stays as it is), one breakpoint, tested at the breakpoint, 1 px either side, 1536 and 1920, with touch and a mouse. Out: the top bar, text size, Home, Wastage, Transfers and the recipe card (the fold and quick wins cover them), the front of house Functions pages (step 3), the admin and chef panels (step 4).

Evidence to gather before round 2's design frame: the Wall board at 1920 (busy, default and Extra large text), the notebook's height against the slip, a long order day (20 or more requests), a full roster on Today's team, 19:30 with a round due (the band open), a section's last line ticked (does anything move), and 1536 px.

**The head chef decides:** round 2 at this smaller scope once A and the quick wins are live, or stop after them.

**Chosen (head chef, 26 Nov 2026):** "Yes, smaller". Round 2 runs at the smaller scope once the fold (#900) and the quick wins are live: first the evidence above, then designs for Prep at 1920 and Orders at a reading width, Cleaning after its weights work settles. Above 1280 px only, CSS only, the same rows.

## Round 2 evidence (26 November 2026, after the fold and quick wins went live)

Implemented app on `main` at 4967d46 (the fold, the quick wins and your own section first are in), on the click-test stand-in with the step 2 busy afternoon: 20 prep lines in five sections, a cook (Ann) on Larder on a shared section screen, Sam the sous chef. Synthetic data, role-based. Pictures and numbers in [round2/](round2/) ([metrics.json](round2/metrics.json), made by [evidence.cjs](round2/evidence.cjs)). Complete rows count only rows wholly in view, not under a bar or a dock.

### Prep at 1920 x 1008

| | Notebook (today's opening) | Wall board (one tap: Wall board) |
| --- | --- | --- |
| Open lines in view, default text | 9 of 18 | **18 of 18**, in five columns of 367 px |
| Open lines in view, Extra large | 6 of 18 | 13 of 18 |
| Your own section first | Yes (Larder leads All) | No: Grill, Sauce, Larder, Fryer, Pastry |
| Tick, On it, Urgent on each row | Yes | Yes |
| ⋯ (More: Remove, fix) on each row | Yes, 453 px from the tick | **Hidden** on every row |
| Handy (Done today, quick add) and section tabs | Yes | No (Back to the prep list) |
| Rows that wrap | none (53 px each) | Grill and Fryer: 82 px ("Marinate chicken thighs 5 kg", "Blanch chips 4 trays"); 137 px at Extra large |

**A section's last line ticked** (Fryer's two lines, ticked where they are, no scroll; on Ann's own device, because a shared screen first asks who did the line):
- Wall board: Pastry's 3 rows jump sideways from the middle column into Fryer's place under Grill (x 786 to x 399). **Reproduced** (round 1's keeper predicted it from `.wb-cols` auto-fill).
- Notebook: Pastry's rows move up within the list, below the first screen. No row in view changes column.
- Both: every row moved down 60 px once, because the test data starts with no ticks in the last 7 days and the first tick draws Top tickers above the book. In a kitchen that ticks every day the strip is already there; reported, not counted.

The notebook running to the window bottom (moved here from the quick wins): 9 to 10 lines on a quiet day at 1920, none on a busy day, unless the page's 40 px bottom margin goes and the slip with Undo (19 px up, 60 px tall) covers the bottom line's On it, Urgent and ⋯.

### Orders at 1920 x 1008, a long order day (26 requests)

| | Cook (Ann, shared) | Sous chef (Sam, with the cut-offs) |
| --- | --- | --- |
| Requests in view | 10 of 26 (70 px each) | 9 of 26 |
| Row width | 1,083 px | 667 px |
| Tick to ⋯ | **1,000 px** | 584 px |
| At 18:45, the 18:30 round due (band opens, 279 px) | | 6 of 26 |

### A section screen set to 125 % (1536 x 806)

Prep 6 of 18, Orders 8 of 26, no sideways scroll; the same layouts as 1920 (Prep rows 536 px, Orders rows 1,083 px). A breakpoint above 1536 would leave a screen at 125 % on today's layout.

### What this changes for round 2

- The Prep question is now: should the section screens open on the Wall board, mended (columns that keep their place, ⋯ on each row, your own section first), or should the notebook show more? The board already shows every line at 1920.
- Orders' reach is a cook's problem: 1,000 px from tick to ⋯ on a shared screen; the chef's rows are 667 px because the cut-offs sit beside them.
- Cleaning waits: its day levels (#901) landed today; it joins round 2 once that settles.


## Round 2 design frame (UX and interaction designer, 26 November 2026)

Role-based; Implemented app, synthetic data. In the designer's words, lightly shortened.

1. **Must stay visible at 390 px.** Nothing changes below the breakpoint. On the busiest day: the slim strip, the chips, "Lunch: Larder", own section first, each row's tick, Urgent, On it, ⋯, the docked Add. Before equals after: Prep 6, Orders 7 complete lines.
2. **Loudness budget.** Nothing here earns loud; numbered Urgent and the due cut-off keep their rules. No added colour or band: own section first by place.
3. **Devices.** Phone and tablet unchanged (Urgent before On it on the phone, as today). Section screen and the head chef's computer: more lines of the 768 row, no third order; from the bench the words, amounts, numbered Urgent and own section read; nothing slides after a tick or needs hover. Laptop 1280 unchanged.
4. **Placements** (none is a new pop-up):
   - Prep layout: (1) the notebook to the window bottom: keeps everything, +0 lines on a busy day unless the slip covers the last; (2) the list runs on across the spread: about double, but a tick moves lines across the spine; (3) the Wall board mended (⋯ back, columns hold their place, own section first), opened by width or remembered per screen: 18 of 18 unmended (13 at Extra large), wraps to 82 px, more with ⋯.
   - Handy: the right page (40 %, two lines); a fold under the list (frees the page, repeats "2 of 20 done"); off the board (Done today costs a Back).
   - The Undo slip: bottom middle (covers the bottom row's controls); a kept bottom margin (one line less).
   - Orders: a reading width near Sam's 667 px (⋯ 584 px from the tick); two columns (about 20 in view, reflow Not evidenced); as now (1,000 px).
   - Breakpoint: 1281 (also wider laptops); 1536 (a real width: test 1535 to 1537); 1600 (125 % keeps Prep 6, Orders 8).
5. **Fiftieth use.** The slip covered Pastry's bottom On it and Urgent (Seen once): every tick down a column risks it. A hidden ⋯ sends every fix Back to the prep list.

Not evidenced: the mended board's count, the board at 1536 x 806, how often ⋯ is used, laptop widths, more than 20 lines, quick add, reordering at a handover.

## Round 2 designs (Preview over the implemented app, 26 November 2026)

Each design is CSS, with a little preview-only script, laid over the implemented app on the click-test stand-in at `main` 4967d46 ([previews.cjs](previews/previews.cjs), pictures and [metrics.json](previews/metrics.json) in [previews/](previews/), the tick test in [reflow.cjs](previews/reflow.cjs) and [reflow.json](previews/reflow.json)). The step 2 busy afternoon: Ann, a cook on Larder, on a shared section screen; Sam the sous chef; 26 order requests. **Preview, not a build**: the rows, words and controls are the app's own, but the layout rules are a sketch; what needs code is said.

### A. The notebook stays (changes the least)

From 1536 px. Prep opens on the notebook as today, with the Handy page; the notebook runs to the window bottom with the page's own margin kept. Orders rows sit at a reading width (47 rem), so ⋯ is nearer the words. The section screen at 125 % gets the same.

- For: nothing to relearn, the same opening on every device, every control where it is now, no row ever changes column.
- Against: Prep gains nothing on a busy day at 1920 (9 of 18, the same), 1 line at 1536; Orders' ⋯ is still 600 px from the tick; the chef's narrowed Orders rows wrap (82 px), so Sam sees 8 of 26, one fewer.

### B. The mended Wall board (rethinks the flow)

From 1600 px. A section screen's Prep opens on the Wall board, mended: ⋯ back on each row, the cook's own section's column first, and a column that empties keeps its place (code: the drawing keeps a finished section's column with its words; a still picture cannot show it). Handy (Done today, quick add) is off the board: Back to the prep list. Orders in two columns, read down then across. A screen at 125 % keeps today's layout.

- For: 17 of 18 lines at 1920 (12 at Extra large), every section at a glance, ⋯ 276 px from the tick; a cook's Orders 21 of 26 with ⋯ 438 px away, Sam 14 of 26.
- Against: a different opening on the section screen than on the phone and tablet (the frame's "no third order" holds for the row, not the page); Done today and quick add cost a Back; at 367 px a column breaks words mid-word with ⋯ back ("barramun / di", Seen); three pieces of code beyond CSS (open by width or per screen, own section first in the board, columns that hold); the unmended board's column jump is Reproduced on `main` today.

### C. The notebook spread (removes the most friction)

From 1281 px. The notebook's list runs on across both pages, each section kept whole; Handy becomes a fold under the list ("Done today (2) and quick add"). The section tabs stay. Orders at a reading width, as A.

- For: 13 of 18 at 1920 (9 at Extra large and at 1536), your own section on the left page, the tabs and ⋯ in place (374 px from the tick), one layout from 1281 px up.
- Against: **a tick moves lines across the spine** (Reproduced in the preview: ticking one Larder line moved 6 of Grill's lines from the right page to the left, because the two pages balance); Done today moves under the list; wider laptops change too.

### The numbers

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps to tick a line | 1 | 1 | 1 | 1 |
| Lines at 390 (unchanged) | 6 of 18 | 6 | 6 | 6 |
| Prep at 1920, default text | 9 of 18 | 9 | **17** | 13 |
| Prep at 1920, Extra large | 6 | 7 | **12** | 9 |
| Prep at 1536 (125 %) | 6 | 7 | 6 (today's) | **9** |
| Prep, tick to ⋯ at 1920 | 453 px | 453 | **276** | 374 |
| Orders at 1920, cook | 10 of 26, ⋯ 1,000 px | 10, 600 px | **21, 438 px** | 10, 600 px |
| Orders at 1920, sous chef | 9 of 26, ⋯ 584 px | 8, 246 px | **14**, 230 px | 8, 246 px |
| A tick moves a line in view to another column | No | No | Only when a section empties (mended: no; Not evidenced until built) | **Yes** (Reproduced in preview) |
| Done today and quick add | Handy page | Handy page | Back to the prep list | Fold under the list |
| Opening on a section screen | Notebook | Notebook | Wall board | Notebook spread |
| Breakpoint | | 1536 | 1600 | 1281 |
| Build size | | 1 pull request (CSS and a height measure) | 2 to 3 (open rule, own section first and held columns in the board, Orders columns) | 1 to 2 (CSS spread, the Handy fold) |
| New reads, rules or saved data | | None | None (a per-screen choice would be device-local, like This screen's section) | None |

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Prep layout | One page list plus Handy | Columns per section, no Handy | One list across two pages, Handy folded |
| Task sequence for Done today | In view | One Back | One fold |
| Orders | Reading width | Two columns | Reading width |
| What moves | Nothing | Columns (unless mended) | Lines across the spine |

## Round 2 scores (seven reviewers, 26 November 2026)

Role-based analysis on Preview over the implemented app, synthetic data; not research with staff. Every reviewer said the designs differ structurally on Prep. The screen designer noted A's and C's Orders are the same.

| Reviewer | Ranking | Their recommendation |
| --- | --- | --- |
| Cook mid-service | A, B, C | A now; next preview: own section and Handy on the left page, other sections pinned to the right, B's Orders |
| Head chef | **B**, A, C | A smaller B: mend the board, set each screen to it once, no opening by width, Orders alone |
| Skeptic | **B**, A, C | Don't build a new layout: fix the board's column jump now, fixed column order with your own section first and ⋯ back, set each screen once, Orders alone |
| New starter | A, B, C | A now, then B's mends on the Wall board already one tap away |
| Keeper | A, B, C | A's Orders width for the cook only, plus held board columns as a fix; the board opt-in per screen |
| Kitchen screen designer | A, C, B | C's two wide pages with each section pinned to its page and held when done, A's margin, Handy as a fold, the cook-only Orders width (Not evidenced) |
| UX designer (scoring) | A, B, C | A, plus B's mended board as a set-once screen setting |

First place: A five, B two. C is last for six of seven: the tick that moved 6 lines across the spine was decisive.

### What they agree on

- **Mend the Wall board's columns (seven of seven).** A column that empties keeps its place, and the columns follow the kitchen's section list, not the urgent lines. The jump is Reproduced on `main` today, so this is a fix (skeptic, keeper). The skeptic adds a second trigger, read in the source: a line marked urgent on another phone reorders the columns on the board, because their order follows the first line of each section (`sortItems`); the notebook does the same up and down.
- **Do not open the board by width (six of seven; the head chef also wants no width code).** A screen at 125 % would open a different page (UX designer); "Back to the prep list" is a page a new starter never saw.
- **Reject C's balanced pages (seven of seven).** Every tick rebalances them.
- **Leave the notebook's height alone** (head chef, keeper): it gains nothing on a busy day and would have to follow the band.

### Where they differ

- **⋯ and your own section first on the board:** wanted by the head chef, skeptic, new starter and UX designer; the keeper says the board hiding ⋯ was a decided choice, so it is the head chef's call.
- **Orders:** the cook-only reading width (keeper, UX designer, screen designer), or leave Orders alone (head chef, skeptic); the cook alone would take B's two columns; three reviewers reject two columns until a reflow test runs (Risk: a request added on another phone rebalances them under a finger).
- **The opening:** five keep the notebook as the opening; the head chef and skeptic would set each section screen to the board once.

### Corrections to the previews (found by the keeper and skeptic)

- **C as drawn hides Fryer and Pastry off to the side**, not below: the notebook body has a fixed height, so the CSS columns spilled sideways past the page edge (Reproduced in the preview). C's 13 of 18 counts only what is in view; the rest could not be scrolled to. A fixed C would scroll down; its spine move stands either way.
- **B's 12 moved rows after an ordinary tick are a preview fault**: the redraw dropped the preview's own-section-first class. The brief's "only when a section empties" overstated the evidence: held columns and own section first are Not evidenced until drawn in `pageBody()` and tick-tested.
- **The board as an opening loses** the finished-list mascot and its words (the mascot contract leaves them off the board), Done today, Pace and Stuck lines (keeper); C's hidden Handy also drops Closing soon and the waste note.

### The mix of all three

| Part | Take or reject | Why | Principle |
| --- | --- | --- | --- |
| A: the notebook as the opening | **Take** (six of seven) | Nothing moves, Done today in view, the same on every device | Flighty, Things 3 |
| A: the notebook to the window bottom | Reject | Nothing on a busy day; must follow the band | |
| A: Orders at a reading width | Take for the cook only, or leave (split) | Reach 1,000 to 600 px; the chef's rows wrap and lose a line | Linear, Airbnb |
| B: held columns in the section list's order | **Take** (seven of seven), as a fix | Reproduced fault on `main` | Flighty |
| B: ⋯ back and your own section first on the board | Take (four), head chef's call (keeper) | Fixes on the board without a Back; changes a decided board choice | Things 3 |
| B: opening the board by width | Reject (six) | A different page at 125 %; a Back to a page never seen | Linear, Headspace |
| B: two Orders columns | Reject until tested (three), take (one) | 21 of 26, but rebalancing is Not evidenced | Flighty, Todoist |
| C: balanced pages | Reject (seven) | A tick moves lines across the spine (Reproduced) | Flighty |
| C: sections pinned to a page, Handy as a fold | Keep in reserve | Untested; conflicts with A's Handy page | |

All three cannot blend: the board and the spread are rival Prep layouts that every later change would have to keep in step, and three breakpoints would have to become one. A and B blend cleanly, because the board already exists one tap away.

## Recommendation

**Recommend A's notebook as the opening, plus B's mends on the existing Wall board: columns in the kitchen's section list order that keep their place, ⋯ back on each row, and your own section's column first. The board stays one tap away and is remembered per screen, so a section screen can be set to it once.** Orders stays as it is for now; the cook-only reading width is a separate, smaller question.

Why it beats the alternatives: it removes the one Reproduced fault (columns jumping under a finger), gives a section screen all 18 lines whenever its cooks choose the board, and changes nothing for the phone, the tablet, the laptop or anyone who keeps the notebook. It reuses a layout the book already has instead of adding a third.

Main downside: a section screen still opens at 9 of 18 unless it is set to the board, and on the board Done today and quick add cost a Back. And the board is remembered per screen: when one cook taps Back to the prep list, the screen stays on the notebook until someone taps Wall board again (new starter, UX designer).

Combined preview: the opening is today's notebook ([prep-notebook-1920-default.png](round2/prep-notebook-1920-default.png)), the board is B's preview with ⋯ and your own section first ([B-prep-1920.png](previews/B-prep-1920.png)). **Review status: a lead synthesis of what five reviewers named themselves (head chef, skeptic, new starter, keeper, UX designer); held columns are Not evidenced until built**, with a tick test from this screen and another (0 rows moved), a section emptying, an urgent mark from another phone, Extra large, 1536 and the breakpoint.

**The head chef decides:**
1. The column fix (a fix of a Reproduced fault; it will ship with its test).
2. ⋯ back and your own section first on the board (a change to a decided board choice).
3. Whether the section screens are set to the board (by a tap on each screen; no code).
4. Orders: the cook-only reading width, or leave it.
