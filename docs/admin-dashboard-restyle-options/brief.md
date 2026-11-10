# Admin Today: Inbox and Dashboard restyle

Requested by the head chef, 10 November 2026: "should we restyle the admin panel dashboard?", then "do the dashboard too".

**Chosen 10 November 2026: R, the recommendation below** (owner: "yes most definitely"). Built on branch `ccr-87b66b00-enk63u`, pull request #666.

Source: `main` at `fbbc5dd`. Proposal: [proposal.md](proposal.md). Previews: [index.html](index.html) (`?d=A|B|C|M|R&p=inbox|dash`, `&open=1` opens the charts). Today's pages in the click-test stand-in with synthetic data: [Inbox 1280](today-inbox-1280.png), [Inbox 390](today-inbox-390.png), [Dashboard 1280](today-dashboard-1280.png), [Dashboard 390](today-dashboard-390.png). Role-based analysis, not research with real staff; example data only.

## Recommendation

**Recommend R: B's order (what needs you first), C's comparison table always visible, A's page names, and the charts behind a named Show fold.**

- **Inbox:** the page is called Inbox. What needs you comes first, each row with its state word and a button that says where it goes; today's three numbers follow as one line of links. No side pane on a laptop.
- **Dashboard:** the 7, 30, 90 day pills at the top, above everything they change. Three short headlines, each tagged with its period and a named link (Open Insights, Open Wastage, Open Timing). The week ahead lists only days with something on, then one quiet line for the rest. "Last 30 days against the 30 before": one table with the exact difference in words (Up 2, worse; Up 5 min, worse), using today's change rule, each measure a link to its report. The watch list names its period. Charts (wastage reasons, most wasted, load by weekday) sit behind "Show wastage reasons, most wasted and load by weekday".
- **Look:** headings, rules and space instead of boxes inside boxes; Not set in attention orange with its words; Usually busy as a neutral tag; weekday heat with Mon to Sun and dark text; every text link 44 px tall. The Training row goes with the cross-training change.
- **Same data and cost:** 2 reads on open, no new tiles, nightly fields, listeners or rules.

Why: on a phone the first need moves from about 736 px down (A, Preview) to 355 px (R, Preview), and the Dashboard at 390 px is 2270 px with charts closed against 3796 px today (Implemented app; the preview shell is schematic, so remeasure after the build). The numbers the page exists for stay visible on a laptop (the head chef reviewer's condition); only the charts fold. Flighty (now and next first), Things 3 (today first), Linear (one name, one place) and Headspace (words on every change). Main downside: the charts are a tap away, and removing the laptop picked-row pane reverses part of the 8 November Inbox choice, so that departure is yours to approve.

## Round 1: should we build it?

**Verdict: Build smaller (3 of 5).** Head chef, new starter and keeper: Build smaller. Cook: Your call (admin only, no service cost). Skeptic: Don't build as framed, at most quick fixes; the rail-only Inbox and the picked-row pane are the chosen 8 Nov design.

Cut by the council: new tiles for cleaning, cooling, deliveries and orders (each needs a nightly field or read), merging Inbox and Dashboard into one page, any new read on open.

## Round 2: three designs

| | A. Tidy in place | B. Needs first, trends folded | C. List and detail, one table |
| --- | --- | --- | --- |
| Central idea | Same order, unboxed, weak charts cut | Change the order; trends behind one fold | Change the interaction; tiles become one table |
| Inbox | Numbers, then needs | Needs, then a numbers strip | Need titles with a detail pane |
| Dashboard | Ruled figure row, all charts open | Headlines, week, watch list, fold | Table, 7-column week, heat |
| First need at 390 (Preview) | 736 px | 355 px | 355 px |
| Height 390 Inbox / Dashboard (Preview) | 1426 / 2678 | 1222 / 1470 | 1328 / 2713 |
| New reads | 0 | 0 | 0 |
| Departure from 8 Nov | Removes the pane | Removes the pane; trends folded | Keeps the pane (the doubling stays) |

Screenshots: `a-`, `b-`, `c-`, `m-` and `r-` `inbox|dash` at 390 and 1280 in this folder, e.g. [B Dashboard 390](b-dash-390.png), [R Inbox 390](r-inbox-390.png), [R Dashboard 390](r-dash-390.png), [R Dashboard 1280](r-dash-1280.png), [R charts open](r-dash-1280-open.png).

### Scores (out of 10, six reviewers)

| Reviewer | A | B | C | M (lead mix) | First pick |
| --- | --- | --- | --- | --- | --- |
| Cook | 5 | 8 | 5 | 8 | B, M |
| Head chef | 6 | 6 | 4 | 7 (8 unfolded) | B, then M unfolded |
| Skeptic | 6 | 7 | 4 | 5 | B |
| New starter | 5 | 7 | 5 | 7.5 | M |
| Keeper | 6 | 7 | 5 | 7.5 | M |
| Screen designer | 5 | 7 | 6 | 8 | M |
| **Total** | **33** | **42** | **29** | **43** | B best single design for all six |

Disagreement: the skeptic preferred B alone (one more tap to trends) and scored M 5 for inventing an "About the same" verdict and hiding the pills that still steer the watch list. The head chef reviewer wanted the numbers unfolded on a laptop. R answers both: today's change rule, pills on top, the table visible, only charts folded.

### Mix of all three

| Source and part | Take or reject | Principle | Kitchen benefit or cost |
| --- | --- | --- | --- |
| A, page named Inbox | Take | Linear | One name per page |
| A, ruled figure row | Reject | Airbnb | Duplicates the table |
| B, needs first | Take | Things 3, Flighty | First need in the first screen on a phone |
| B, fold over all numbers | Reject; fold only charts | Flighty | Numbers stay in view; one tap fewer on a laptop |
| C, comparison table | Take, with today's change rule | Headspace | The change in words, not colour |
| C, list and detail pane | Reject | Linear | Keeps the doubled Today's team |
| C, 7-column week strip | Reject | Airbnb | Five of seven columns empty |

## Break-it findings

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| "About the same" hides a real rise (60 vs 58 rolled over) | Checked in M preview source | R uses today's `delta()`: exact difference, "Same as before" only when nothing changed |
| Pills hidden in a fold still steer the watch list | Checked in B and M source | R puts the pills on top and names each period |
| 90 days has no earlier period | Checked in source (`delta()`), not in preview | "No earlier 90 days" in the table, never "Same as before"; test |
| A redraw (functions list change) closes the charts fold | Risk | Keep the fold state in module memory; test |
| Saved page `training` after the Training row and tab go | Checked in source | Fall back to Inbox (shared with the cross-training build) |
| Mixed versions: old `prep.js` with a new `admin-dashboard.js` | Risk | Keep `LK_DASH` API 1 and `render({view})`; bump the loader `?v=`; test the old caller |
| Read cost when the pages change | Risk | `tests/read-budget.test.js` before and after: 2 reads on Dashboard open |
| A failed `analysis/dashboard` read shows 0 | Risk | Keep `.p-err` words; test |

## Contract fit

Reads and access: no change (Works). Surface: quiet paper for admin reading, no boxes inside boxes (Works). State meaning: Not set as attention, Worse in the failure red with its word, Usually busy neutral (Works in R). Words beside colour: Works. Contrast: heat text ink on every step, 5.27:1 or more (measured in the preview); Not set 5.31:1. Tap targets: 44 px links in R (measured in the preview). Keyboard focus, dark mode and failed states: Not evidenced until built. Departure: the laptop picked-row pane (`.dsh-pick`, 8 Nov 2026) is removed; head chef decision.

## Follow-up on R

Focused follow-up on the first R preview by the skeptic (7/10, now recommends R over B with two fixes) and the screen designer (6.5/10, recommends R with two fixes). Both measured in Chromium: no sideways scroll, every link 44 px or more, the fold 44 px with its triangle and Show words, Not set 5.31:1 and no longer failure red, Usually busy neutral.

| Finding | Evidence | Disposition |
| --- | --- | --- |
| The table note claimed a 5 minute "same" rule; today's `delta()` says Same only under 0.5, so 1 h 05 m to 1 h 10 m reads "Up 5 min, worse" | Checked in source | Fixed: the preview shows "Up 5 min, worse" and the note says it is worked out as today |
| The lighter top heat step broke the "darker is busier" order | Measured | Fixed: the scale moved down one step, in order, ink text throughout |
| The Today strip split into columns at 390 | Seen in the screenshot | Fixed: one wrapped line each, 44 px |
| No failed state for "Functions today" | Not evidenced | Added to the preview (`&err=1`): the number is left out and says so, never 0 |
| The pills sit above headlines that keep their own fixed periods (Monday, last 7 days) | Reviewed | Kept, with each headline tagged with its period; a build check that the 7 day pill never makes two periods read as one |
| "Not set" for Today's team is orange every morning, before the plan is due | Reviewed | Existing Inbox behaviour, not changed here. Raise separately if it should wait for a due time |
| The current Dashboard's heat uses white on `#EB6834` | Corrected | Not an existing-app fault: the current Reports heat uses ink text. The earlier note in this brief was wrong and is removed |

Status: the lead synthesis R, repaired after this follow-up. Not re-scored after the last repairs. The removed laptop picked-row pane remains the head chef's call.

## If chosen: build

One PR in `js/admin-dashboard.js` (API 1 kept, loader `?v=` bumped), `css/app.css` and `js/prep.js` (page titles), after the cross-training retirement PR removes the Training row. Tests: `admin-dashboard`, `admin-inbox`, `admin-nav`, `admin-chefs-desk`, `read-budget`, `design-patterns` (new names). Remeasure the implemented app at 390, 768 and 1280 px against the preview numbers above. Rollback: revert the PR; nothing stored changes.
