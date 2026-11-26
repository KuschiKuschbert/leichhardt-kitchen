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

1. **Prep at 1920:** picture and measure the Wall board as it is, and the notebook after its quick win (running to the bottom of the window), with each section kept whole. Draw designs only if neither shows enough.
2. **Orders' rows at a reading width** so the ⋯ sits near its tick. CSS only, the same `rowHTML()` row.
3. **Cleaning** once its results work has merged, against the new `main`.

Switched on above 1280 px (the laptop stays as it is), one breakpoint, tested at the breakpoint, 1 px either side, 1536 and 1920, with touch and a mouse. Out: the top bar, text size, Home, Wastage, Transfers and the recipe card (the fold and quick wins cover them), the front of house Functions pages (step 3), the admin and chef panels (step 4).

Evidence to gather before round 2's design frame: the Wall board at 1920 (busy, default and Extra large text), Prep after the notebook quick win, a long order day (20 or more requests), a full roster on Today's team, 19:30 with a round due (the band open), a section's last line ticked (does anything move), and 1536 px.

**The head chef decides:** round 2 at this smaller scope once A and the quick wins are live, or stop after them.
