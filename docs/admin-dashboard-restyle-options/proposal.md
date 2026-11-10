# Admin Inbox and Dashboard restyle: round 1 proposal

Requested by the head chef, 10 November 2026: "should we restyle the admin panel dashboard?", then "do the dashboard too".

Source: `main` at `fbbc5dd`. Screenshots drawn in the click-test stand-in with synthetic data (90 days, Larder/Grill/Garnish, admin on Google plus PIN), real app shell, test fonts:

| Page | 1280 px | 390 px |
| --- | --- | --- |
| Inbox (Today's first page) | [today-inbox-1280.png](today-inbox-1280.png) | [today-inbox-390.png](today-inbox-390.png) |
| Dashboard | [today-dashboard-1280.png](today-dashboard-1280.png) | [today-dashboard-390.png](today-dashboard-390.png) |

## Why now

The Dashboard was chosen and built on 3 and 4 November (A, The Pass board, with B's headlines; `docs/admin-dashboard-options/brief.md`). The Inbox was added on 8 November. Since then the book changed around it: the whole-book redesign (8 Nov), four admin rooms with a dark rail, shared surface colours (9 Nov), Today's team, Cleaning, Operandio cooling, the Orders request list, supplier last orders and On it job times. `js/admin-dashboard.js` has not changed since 8 November.

## What looks wrong today (observed in the screenshots)

1. **Two navigations for one place.** The rail has Inbox and Dashboard above "Admin panel", but both pages are titled "Today" with tabs Item links, Training, Proofreader, Kitchen mail, and neither Inbox nor Dashboard is a tab.
2. **Today's team says it twice.** At 1280 px the Inbox shows "Not set, Today's team" as a row and again in the picked pane beside it.
3. **Boxes in boxes.** Bordered tiles inside cards with grey header bands and underlines. Contract: "Groups use space and headings first... not a reason to box every group" (`docs/design-patterns.md`, The look).
4. **Charts that say little.** "Prep list each day" draws Written and Ticked off lines that sit on top of each other. Transfers trend is a zigzag. The week ahead is seven rows, five reading "Nothing booked".
5. **Newer work is missing.** No cleaning checks, Operandio cooling, team cover, deliveries, order requests or On it job times. The Inbox Training row never empties (see the cross-training proposal, which removes it).
6. **Long on a phone.** The Dashboard at 390 px is a long single column: headlines, five tiles, week ahead, watch list, four charts.

## The change

Restyle Today's Inbox and Dashboard on the current contracts, keeping their data (`analysis/dashboard`, `analysis/health`, `dashwatch/main`, loaded mail/minutes/transfers/team, functions list), their links into reports, honest failed states and read budget (2 reads on open plus existing checks). Exact shape is round 2. Candidate directions:

- Keep the two pages, fix navigation (Inbox and Dashboard as Today's first tabs or the rail only), remove the doubled pane, unbox to headings and space, cut the weak charts.
- Merge Inbox and Dashboard into one Today page: what needs you, then today, then the week, then trends behind a fold.
- A kitchen-areas board: one block per area (Prep, Waste, Team cover, Cleaning, Cooling, Orders, Functions) with its single most useful number and its need, each opening its page.

## Limits kept

Verified head chef admin only (the chef panel's Today is a separate contract). No prices, GP or supplier codes. Waste in lines and amounts, never dollars. A number that did not load says so, never 0. Reports keep their pages. No new listeners or polling. Any new number must come from data the admin already reads or the nightly record.

## Cost

Mostly `js/admin-dashboard.js` (588 lines, lazy, `LK_DASH` API 1) and `css/app.css` admin rules; `js/prep.js` for the Today tabs. Tests: `tests/admin-dashboard.test.js`, `tests/admin-nav.test.js`, `tests/admin-chefs-desk.test.js`, `tests/read-budget.test.js`, `tests/design-patterns.test.js`. New tiles for cleaning or cooling may need a nightly field (no rules change: `analysis/*` is already admin-only and server-written). Risk: low to medium; admin only, no staff page.

## Design references that apply

- **Linear**: one navigation, work more prominent than navigation.
- **Flighty**: now and next first, real times, status from data already read.
- **Airbnb**: each need with its time, place, status and next action together.
- **Headspace**: calm, short labels.
