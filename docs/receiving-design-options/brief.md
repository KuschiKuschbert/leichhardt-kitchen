# Supplier order and Delivery received: design options

Requested by the head chef on 3 November 2026. **A, The Order Sheet, was selected the same day** ("I trust your recommendations"). What came in? starts on Chilled each time. B is kept below as context only; its order check and temperature limits are not being built.

The request: upgrade the supplier orders page (`#/suppliers`) and the Delivery received page (`#/deliveries`). One temperature, chilled or frozen, should be enough on a delivery. Come up with upgrades for each page and two redesigns, with a recommendation.

Review files:

- `index.html` is the comparison page with working phone mockups (example data only). Open it in a browser; the What came in? switch, − and +, Use and the filter chips work.
- `previews/` holds each phone screen at 2x: `a-supplier-order.png`, `a-delivery-received.png`, `a-review-order.png`, `b-supplier-board.png`, `b-count.png`, `b-receiving-check.png`.

## One temperature is already allowed

The save, the rules and the data contract already accept a chilled reading, a frozen reading or both (`docs/delivery-received.md`: at least one must be present). The page shows both boxes side by side under one heading, so it reads as if both are needed, and the hint that one is enough is easy to miss. Both designs fix this on screen only: the form asks **What came in? Chilled, Frozen or Both** and shows one box for one, two for Both. The saved record does not change.

## What the current pages do on a phone

Checked on 3 November 2026 with the test stand-in at 390 and 1280 px.

Supplier order:

- Stock on hand sits inside each item's Details. Counting means open, type, close, then type the order.
- Suggestions sit in a closed panel above the list, away from the item they are for.
- 20 items a page (`M.page`). A supplier with 60 items is three pages, and Review order is at the bottom of each.
- A matched staff request shows as "Staff request to check" without who asked, for what or how much.
- Each phone row stacks name, pack, Details, Par, To confirm, Last order, a box and a unit hint: about five items per screen.
- A long help paragraph sits above the list on every visit.
- No view of the day: which suppliers have a draft, are ordered or are due in.

Delivery received:

- Chiller and freezer boxes side by side; one is enough but it does not look that way.
- The chiller box opens the number pad, the freezer box the full keyboard (`inputmode="text"`, for the minus sign).
- The supplier is typed every time, so one supplier typed three ways becomes three suppliers in a report.
- The order cut-offs already hold each supplier's delivery days, but the form does not use them.
- Save sits under the notes box, behind the bottom tabs until you scroll.
- Admin sees one date at a time: no range, no supplier filter, no CSV.

## Upgrades

Tags: **Screen only** means no change to saved data or rules. **Your call** means a head chef decision first. **Data and rules** means new saved fields.

| Supplier order | A | B | Kind |
| --- | --- | --- | --- |
| On hand and To order on the same row | yes | yes | Screen only |
| Top-up to par on the row as a Use chip (existing `C.suggestQuantity`, still needs a tap) | yes | yes | Screen only |
| Filter chips: All, Below par, Asked for, In this order | yes | yes | Screen only |
| What staff asked for, in full (who, what, how much, when) from the existing request read | yes | yes | Screen only |
| Review order always in reach (a bar above the tabs) | yes | yes | Screen only |
| − and + on the order box for pack units; typing still works | yes | yes | Screen only |
| One list with category jumps instead of pages of 20 (measure on the biggest supplier) | yes | yes | Screen only |
| Share order text through the phone's own share sheet; the book sends nothing itself | yes | yes | Screen only |
| Today's suppliers at a glance (A: chip strip with cut-offs; B: docket board) | yes | yes | Screen only |
| Count walk: one category at a time, then order | no | yes | Screen only |

| Delivery received | A | B | Kind |
| --- | --- | --- | --- |
| What came in? Chilled, Frozen or Both, one box for one | yes | yes | Screen only |
| Expected today: supplier chips from the order cut-offs, plus Other | yes | yes | Screen only |
| A − key on the frozen box, number pad for both readings | yes | yes | Screen only |
| Time as one line ("14:05 today", Change) | yes | yes | Screen only |
| Items and notes fold away; Save straight under the reading | yes | yes | Screen only |
| Still expected: suppliers due today with no receipt yet | yes | yes | Screen only |
| Admin date range, supplier filter and CSV, like Wastage history | yes | yes | Screen only |
| Temperature limits; a reading over the limit asks what was done | no | yes | Your call, Data and rules |
| Check the order on arrival: Got it, Short, Missing per line (chefs only) | no | yes | Your call, Data and rules |

## The two directions

| | A. The Order Sheet, recommended | B. The Supplier Docket |
| --- | --- | --- |
| Idea | Same pages, faster on the line. Count and order on one row; Delivery received becomes a one-reading form that knows who is due. | One loop per supplier: a docket goes draft, ordered, arriving, received. Ordering is Count, Order, Record. Receiving checks the order line by line. |
| Saved data and rules | No change | New order-check record and limits. Rules, manual and nightly backups and PIN moves updated |
| Head chef calls first | Only which option | Temperature limits, who checks orders, what counts as Short |
| New reads | None on open. Admin range is one query on tap | One read of the expected order per chef receipt |
| Pull requests | Three, each on its own | Five to six, rules published first |
| Undo | Revert one pull request | Screens revert; saved checks and their rules stay |

## Recommendation: A now, B's order check later

1. It fixes what slows people today: one temperature box, one tap for the supplier, count and order on one row.
2. Nothing saved changes. Receipts, orders and the rules stay as they are, so each part ships alone and a revert is one pull request.
3. Record order placed, Order done, Apply and Save delivery keep separate buttons and outcomes, as the whole-app audit asks.
4. Nothing in A is thrown away. The expected-supplier chips, the On hand column and the Review bar are what B would build on.
5. B's value depends on the head chef's limits and order checks. Those are easier to set after a few weeks of clean records with matching supplier names.

## Head chef decisions (A selected, 3 November 2026)

1. A or B. Decided: A.
2. What came in? starts on Chilled every time, or remembers each supplier's last choice on that phone. Decided: Chilled every time, so the phone keeps no new saved copy.
3. For B only: the chilled and frozen limits. The Food Standards Code (Standard 3.2.2, clause 5) says chilled potentially hazardous food is received at 5 °C or colder and frozen food arrives frozen. The book sets no number until the head chef confirms it. Until then the mockup shows `[to come]`.

## Stays the same in both

- A saved delivery never changes. A correction is a new receipt with a note. Exact-id retries, the daily-lock draft and handover clearing stay as in `docs/delivery-received.md` and `docs/device-sessions.md`.
- One reading or both; zero and negative readings save as typed; null and zero stay different.
- Record order placed sends nothing to the supplier. Order done, Apply and Save delivery stay separate (`docs/supplier-workspace.md`).
- The catalogue, pars and order history stay with the head chef, sous chefs and verified admin. Staff never see order lines.
- Every role keeps its access. No new outside service, font, listener or polling.

## Notes for building A

Step 1, Delivery received (`js/deliveries.js`, `css/app.css`). Built 3 November 2026; see `docs/delivery-received.md`, Design A on screen. The line under today's list reads "Not received yet today" rather than "Still expected", because the cut-offs say when a supplier delivers, not whether an order was placed:

- The mode (Chilled, Frozen, Both) lives in the in-memory form only. The hidden box saves `null`, exactly as an empty box does now. A typed reading is never dropped silently: switching away from a box that holds a reading takes a second tap (the book's `arm()`), and the daily-lock draft keeps the mode.
- The − key does not start pressed. A frozen reading above 0 °C shows its sign plainly before saving. This is a typing guard, not an acceptance limit.
- Expected today comes from `config/main.cutoffs` through `LK_CUT` (a supplier whose `dd` includes today). It needs no new read. Functions-only accounts cannot read `config/main`, so they get the Other box only. A chip saves the cut-off name exactly; Still expected matches only that exact name.
- Validation keeps field focus and `aria-describedby` (WA-07); messages name the box that is showing.
- Tests: `deliveries.test.js`, `delivery-validation-focus.test.js`, `device-delivery-lock.test.js`, plus new checks for each mode, the hidden box saving `null`, a typed reading kept across a mode switch, and every role's chips.

Step 2, Supplier order rows (`js/suppliers.js`, `css/app.css`). Built 3 November 2026; see `docs/supplier-workspace.md`, Order rows. The 20-item pages stay for now: the one-list change waits for a measurement on the largest real catalogue. The Use chip shows counted top-ups only; repeat-last-order suggestions stay in the Suggestions panel so every row does not carry a chip:

- On hand moves out of Details onto the row (`d.stock`), with the captured-unit rules from the 25 October quantity correction. The Use chip runs the existing Apply path. − and + appear only when the order unit is confirmed.
- Filters are client-side on the loaded catalogue. The staff request strip uses `M.requests` and `matchInfo()`; unmatched requests stay on the Order list.
- Measure the one-list render on the largest catalogue before removing the 20-item pages; keep pages if it is slower.
- Bump the supplier UI revision (`SUP_API`) only if an older copy cannot run with the new one. Tests: the supplier files listed in `docs/supplier-workspace.md`, `keep-typed-editors`, `device-supplier-lock`.

Step 3, strip, share and history. Built 3 November 2026; see `docs/supplier-workspace.md`, Sending, and `docs/delivery-received.md`, Admin history. The admin range is up to 92 days: the supplier chip strip reads cut-off times from `LK_CUT`. Share uses `navigator.share` with the existing Copy as the fallback, so no security header change. The admin delivery range is one `day` range query on tap (admin only, existing rules), with CSV through the shared helpers in `docs/report-exports.md`. Check `tests/read-budget.test.js`.

## Notes if B is chosen later

Receipts have a fixed key list, are immutable and are written by every personal login, while order lines are private to chefs. So the order check is its own chef-only record linked to the receipt id and the supplier order id, never extra fields on the receipt. Limits live in `config/main`, written only by the verified admin. Each needs rules and emulator checks for every role, `tests/rules/client-shapes.test.mjs` rows, the manual and nightly backups, the PIN move and `tests/safe-text.test.js` lines, published before the client.
