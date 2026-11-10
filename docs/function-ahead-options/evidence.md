# Functions ahead of time: shared evidence (council, 10 Nov 2026)

Source commit: `184174e` (main). Every reviewer and designer gets this file. Measurements are labelled **Implemented app** (the real book in the click-test stand-in, synthetic data, `baseline/`) or **Preview**.

## The head chef's question

> "If there is a function during the week, and I want everyone's attention on it, when does it show exactly, and how can I improve that best? Run the council and design 3 ideas for Home and all other pages."

Background: on Tuesday 10 Nov the head chef could not find a Saturday function anywhere on the work pages and thought the function band was lost. It was not lost. It is hidden on most days before a function by design (below).

## When a function shows today (source: `js/functions.js`)

Example: a confirmed function on **Thursday 19 Nov**, booked a week or more ahead. Its order day (`od`) is the last Sunday at least 4 days before: **Sunday 15 Nov**. Booked later than that, the order day is the day it was confirmed ("Short notice").

| Day | Band on the work pages (Prep, Orders, Wastage, Transfers, Recipes...) | Home | Other places |
| --- | --- | --- | --- |
| 7 to 5 days before (Thu 12 to Sat 14) | Nothing (band hidden, 0 px) | **Coming up** card only, the last card on Home | Chefs: To check card (times TBC, changed or unfinished platters, allergens) |
| Order day (Sun 15) | "Order the stock for Smith 60th" line, all day | Now and next: the same order row | Order list: "Function stock: Smith 60th, Thu 19 Nov: 3 Antipasto, 2 Pizza" line, rolls over until ticked |
| 3 and 2 days before (Mon 16, Tue 17) | **Nothing** | Coming up only | `#/fn` Upcoming (next 3 days) |
| Day before (Wed 18) | "Tomorrow · Smith 60th · event 18:00 · food 18:30 · 3 × Antipasto..." (113 px at 390) | Coming up only | |
| The day (Thu 19, from 00:00) | Today's rounds, Sent ticks, "In 10 min"; a one-line strip pins to the top while scrolling (115 px band) | Now and next row with the next round | Prep list: one line per platter under the section **Functions** (written at booking, on that day only); service view `#/fn/now` |

Nothing reaches a person automatically: no ping, no push. The band's minus folds it to one line for the rest of that kitchen day on that phone. Since 10 Nov (#659) the first PIN of a person's day opens Home.

## Measured baseline (Implemented app, 390 x 844, synthetic data, a saved two-shift team, functions Thu 12 Nov and Sat 14 Nov)

From `baseline/measurements.json` and the screenshots in `baseline/`:

- **Home, staff (Ann):** Coming up starts at **955 px** down a 1341 px page. The first screen ends at about 780 px (the tab bar). So a function 2 days away is **not on the first screen**. Order on the page: greeting, Your day (charcoal), On with you team board (sage), Prep by section (steel), Coming up (paper). Now and next is hidden when nothing is due today.
- **Home, head chef:** Coming up at 970 px (390 px wide); 758 px on a 1280 px laptop (just inside a 900 px window).
- **Prep, Orders (staff):** band 0 px, no mention of either function.
- **Prep, the day before:** band 113 px (about 1.5 prep lines). **On the day:** 115 px.
- On the head chef's own phone the order cut-off bar already takes about 100 CSS px under the top bar on every work page except today's Orders.
- **Reads:** the kitchen already holds one live listener on `functions` with `kq` from 00:00 today (limit 150), so every upcoming confirmed function is already on every phone. Showing upcoming functions costs **no new reads, listeners or rules**. Anything that records who has seen something (a receipt) is a new write and rules change.

## Council round 1 (10 Nov 2026): Build smaller, 5 of 5

The head chef's first idea (always show the week's functions in the band) was judged against the evidence above.

- **All five:** do not show a full week in the band on every page. It costs about 1.5 prep lines every day on every work page, mixes today's work with next week's (a cook could start next week's platters), and buries the rare Order and Tomorrow warnings.
- **Agreed fix:** one quiet line in the band's slot on days it would otherwise be empty: "Next function: Thu 19 Nov, Smith 60th", weekday and date in words, tap opens it, never stacked with the band's own lines, folds with the minus.
- **Skeptic:** first move Home's Coming up up the page (it sits about 950 px down); the line second.
- **Colour unresolved:** the band is charcoal (= current live boards and bands). An upcoming function is not live, and neutral upcoming information is not amber.
- **Break-it risks (not evidenced):** a cancelled or moved function staying up offline from the saved copy; the midnight change from "Next" to "Tomorrow" showing both or neither; a new line not counted in the fold check.

## Contracts every design must keep (excerpts; read the sources)

- **Service rules** (`CLAUDE.md`): main job one tap from its tab; no new tab, top bar or tab bar button or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; added taps or lost lines must say why.
- **Head chef decisions** (`docs/head-chef-decisions.md`): 22 Oct, the band under the top bar, one line per function, tap opens its sheet, minus folds for the day, order reminder on the order day, tomorrow's line. 8 Nov redesign: band and cut-off bar on every page except Home, where the board shows them; Home's Coming up looks a week ahead. 9 Nov surfaces: steel = work, sage = people, charcoal = current live boards and bands, quiet ivory/paper = reference and forms; amber = attention or pending; green confirms a stated success; red = errors. Neutral upcoming information is not automatically amber.
- **Top bar** (`CLAUDE.md`): pings, chef hat, Today's team chip, all bell-sized; anything more is a head chef decision (it wraps or cuts "Kitchen Book" on a phone).
- **Home** (`docs/home-staff-first.md`, `docs/whole-app-redesign-options/brief.md` Chosen): staff-first Home, personal shift and break first, coworkers, then work.
- **Pings** (`docs/ping-recipients.md`): Everyone and individual pings with the bell, Got it, a 30-minute lifetime; individual pings have read receipts chefs can see.
- **Design patterns** (`docs/design-patterns.md`), **action feedback** (`docs/action-feedback.md`), **loading and motion** (`docs/loading-motion.md`).
- **Reads:** no new listeners or polling; the free plan is 50,000 reads a day.

## Files

- `baseline/*.png`: screenshots of the implemented app. `*-full.png` are whole pages.
- `baseline/*.html`: static snapshots of those rendered pages (scripts removed; `<base href="../../../">` loads the real `css/app.css`; bundled preview fonts from `docs/order-list-options/assets/`). Serve the repo root over HTTP to view them (e.g. `python3 -m http.server 8790` from the repo root, then `/docs/function-ahead-options/baseline/home-staff.html`).
- `capture-baseline.cjs`: how the baseline was made.
