# Supplier workspace

Status: implemented. Approved by the head chef on 24 October 2026 after the workspace, history, smart suggestions and catalogue editor drafts. Private catalogue loading is a separate authenticated release step; the source data is never bundled with the public app.

## Outcome

Chef-hat > Supplier order opens a collapsible supplier workspace for the head chef, sous chefs and verified Google owner. Head chef and owner manage the catalogue; sous chefs order and read history. Staff, leads and function managers have no access. Admin > Content > Suppliers & pars links to the same editor. Keep the full Google-only admin gate.

Reuse the current app shell, Barlow and Barlow Condensed fonts, action buttons, choice chips, text-size settings and focus rules. No new font or service. Keep the current staff free-text order list, recipe book, prep and wastage flows.

Cut-off settings remain under Admin > Settings > Order cut-offs. Order closes supports the same day and every day up to 14 days before delivery, with 1 week and 2 weeks labelled in the existing dropdown. Reminders still start at the selected time before the cut-off. The linked occurrence and saved order retain the actual delivery date, including across a month or year. A missing or older cut-off helper disables these controls and preserves stored settings on a People save.

## Private data contract (version 1)

All paths are below kitchens/<pin>. Never commit supplier goods, source PDFs, prices, product codes, account details, staff names or the owner email. The source catalogue is imported through the restricted editor as a private JSON file. Only the import format and synthetic examples belong in git.

- suppliers/<sid>: {name, cutoffId, v, items, at, by}. Each item has {id, name, pack, group, category, par, parUnit, orderUnit, factor, aliases, archived, manual, source}. Current par is a string: empty means unset, '0' means explicit zero. factor is zero until a conversion from one order unit to par units is verified. source is {file, page, row, name, par}. Imported source fields and names are retained; manual source fields are empty/zero. Item and supplier IDs are stable.
- suppliers/<sid>/audit/<revision>: {v, itemId, action, before, after, at, by}. Appended atomically with the next catalogue revision. No hard deletion.
- suppliers/<sid>/orders/<orderId>: {sid, supplierName, v, at, day, deliveryDay, cutoffDay, cutoffId, by, lines}. Each line is a snapshot {itemId, name, pack, qty, amount, unit, par, parUnit, source, suggestion, stock}. qty retains decimal or explicit quantity text, amount is a positive number and unit is explicit or an empty string. Number-only entries with no configured unit store e.g. qty: '2', amount: 2, unit: ''. An empty unit never means pieces and cannot participate in conversions. This retains the format already shipped by PR #382. stock is an optional current-run count encoded as a string. No record rewrites after create.
- supplierlinks/<cutoffDay>_<cutoffId>: {sid, cutoffId, day, v, orderId, at, by}. The occurrence version prevents unnoticed concurrent orders. A deliberate additional order may share an occurrence.
- Existing cutdone/<cutoffDay>_<cutoffId> keeps its existing shape {day, sid, on, at, by}; its sid is the configured cut-off ID. Save order, link version and completion in one transaction. Existing older completion ticks remain readable and never imply item quantities.

Catalogue reads and history are online-only through Firestore Lite on the existing app. Keep data in module memory and discard it when the person, kitchen or account changes. Reuse the existing PIN-session writer and pending-write tracking through a small adapter. Never weaken existing writes or cache policy to introduce this feature.

## Behaviour

Preserve all supplied PDF names and original pars. Group PFD dry goods and seafood under one supplier. Never hide zero or blank pars. Show current par separately from original source values. Manual additions, current-par edits, unit/pack details, archive and restore have revision checks and an audit trail. A concurrent edit asks the chef to refresh; failed saves preserve the form. Duplicate-name checks allow the chef to distinguish pack variants explicitly.

The latest supplier order shows weekday, date, time and individual quantities. An item absent from that supplier order says Not ordered. History is fetched on demand in bounded pages; never query history for each row. Copying or using previous quantities only fills a draft. Recording confirms an externally placed order and sends nothing to suppliers. Preserve draft IDs across retries; never duplicate a save. A record failure neither clears quantities nor marks a reminder done.

Reminder links select the supplier and occurrence. The reminder bar's **Order done** confirms an externally placed order without quantities or units for any supplier, linked or unlinked. It writes only the existing cutdone record, with the writer and time, and offers Undo after the save is confirmed. It neither loads the private catalogue nor creates an empty supplier order. Typed quantities, stock counts, history and suggestions remain intact. The tick list's linked-supplier action still opens detailed review; old clients and unlinked suppliers retain their existing completion. Unticking a reminder never deletes history. Preserve the general staff order-line tick behaviour.

Suggestions show their evidence and require Apply. Repeat previous quantities, show comparable order-day history, flag staff requests through explicit aliases/matches, warn on completed occurrences, and calculate top-ups only from current stock with confirmed compatible units/conversion. No inferred consumption, invented confidence or automatic orders. Catalogue revisions refresh suggestions but preserve typed quantities.

## Verification and release

Unit checks cover quantities, blank/zero pars, imports, repeat suggestions, unit conversions, source preservation and snapshot preparation. Browser checks cover complete catalogue/order journeys, roles, shared devices, script/read/write failures, stale revisions, duplicate retries, reminder links and 390/768/1280 widths with enlarged text. Emulator checks prove new reads/writes and transaction invariants, including staff refusal. Run the existing full click and rules suites; fix failures and rerun affected checks.

Include new data in manual backup, nightly backup and kitchen PIN migration. Publish additive rules before the client code. Ship through one feature branch and pull request, follow scripts/pre-merge.sh, and verify GitHub Pages after the green checks. A rollback removes the new routes without rewriting existing lists or saved orders.


### Verified on 24 October 2026

- All 724 emulator checks pass: 552 existing rules checks, 31 live-probe checks and 141 supplier checks. The supplier checks include actual Firebase 10.14.1 Auth and Lite clients sharing one FirebaseApp, atomic recording, pagination and sign-out refusal.
- Supplier browser coverage includes 78 checks for access, catalogue edits, immutable history, suggestions, reminders, failures, stale saves, changed-intent retries and pending-save locks. Existing click journeys run alongside these in the full suite.
- All 300 source rows across five suppliers were imported through the actual editor with synthetic Firebase, then compared to the checked private import. Names, packs, pars and source records match; no production writes were used for this check.
- The phone chef menu remains within the existing height limit with at least 48 px action rows. The existing fallback-font title wrapping issue at desktop widths is corrected.
- Nightly learning and push checks, JavaScript syntax and diff whitespace checks pass.

The release gate is a successful Publish rules run **from the feature branch**, followed by green PR checks, Pages and live click checks. The negative live lock probe also passes the previous rules, so it is not sufficient evidence of an updated rules deployment. Confirm the deployment step and authenticated catalogue access separately. No new composite index is required.

### Quantity entry correction, revised 25 October 2026

A bare positive number uses the item's confirmed order unit when available; a bare stock count uses its confirmed par unit. With no configured unit, both remain valid and explicitly unqualified. Stock may be zero; order quantities must be above zero. Number-only decimals keep their exact numeric value, including existing history with more than three decimal places. Fractions use the shared parser's three-decimal precision and store a canonical decimal that the previous client can read. Review, last order, history and copied text show e.g. 2 (unit not set). Explicit units take precedence. Units are never inferred from a name, pack or par.

Reuse and Apply preserve an unqualified snapshot even if the catalogue gains a unit later. Refresh and item edits preserve the original unit of numbers already in a draft. Unknown counts cannot drive stock conversions or top-ups. Invalid values still identify and focus the exact field, reveal hidden pages and keep other draft entries. Each in-memory draft captures the unit for a field when it is typed or reused. Review and the storage validation preserve that captured unit, including an empty one, instead of applying a changed catalogue default. Editing a field deliberately adopts the current default; explicit units still win. Supplier UI revision 7, core revision 4 and store revision 2 use versioned lazy URLs and reject mismatched modules; catalogue and order data remain version 1.

Tests: supplier-core, supplier-quantity-entry, supplier-number-entry and supplier-module-version cover numeric entry, failed-save retry, decimals/fractions, stock, immutable history, copy/reuse, changed catalogue units and mixed-version delivery. Revert through a fresh branch and PR to roll back. The immediately preceding PR #382 client can read these saved records; no data cleanup, migration or rules deployment is needed. Rolling back further than #382 requires retaining its unitless-history reader: older parsers reject a history page containing an empty-unit record. Saved records must not be deleted or relabelled to work around that older limitation.

### Reminder-only confirmation, 25 October 2026

The bar keeps its existing compact button and uses the label Order done. A saved confirmation offers Undo on the landing page, supplier workspace and prep pages. The Order list remains the later correction path. Only an existing chef session or the verified owner can confirm; an old Undo cannot run under the next person on a shared device. Repeated taps do not replace an existing completion. A failed save restores the reminder without overwriting a later tap or another chef's newer tick. No success is announced while the write is still queued. Tomorrow's early cut-off retains its own date.

No schema, security rules, dependencies or persistent caches change. There are no additional reads. Detailed order validation and transactions remain unchanged. Roll back with a revert on a fresh branch and pull request, then verify Pages and live click tests. Existing completion records remain compatible with the previous client; saved orders and history need no migration or cleanup.

Regression coverage is in tests/supplier-reminder-done.test.js. The existing supplier-cutoff-readiness tests continue to cover the detailed tick-list flow, and supplier order tests cover immutable recording, duplicates and additional orders.

### Reminder links without one linked supplier, 27 October 2026

A reminder link (bar, tick list or phone push) opens a supplier sheet only when exactly one catalogue supplier has that cutoffId. With none, or more than one, the workspace picks no supplier. It shows one short card: the cut-off's name with "is not in the supplier catalogue" or "is linked to more than one supplier", when it closes, the bar's own Order done control and a link to the Order list. Before this, the first supplier by name opened with a made-up "Selected order cut-off", and Record order placed always failed.

Order done on the card is the bar's action (data-cut in js/prep.js): it writes only the existing cutdone record and offers the same Undo. It is offered for today's and tomorrow's occurrences, the two days the shared ticks cover; the bar handler now accepts any of those, not only one whose reminder is on. The card reads no order history and loads nothing new. A tick change on the phone fires lk-cut so the card follows. The head chef is pointed to Supplier settings to link the supplier; Refresh then opens its sheet.

No schema, rules, reads or saved data change. Supplier UI revision 8 replaces 7 (js/app.js SUP_API and the lazy URL). tests/supplier-push-route.test.js covers the unlinked bar, tick-list and push routes, two links, an old push and a linked push.

### Typed work kept, 28 October 2026

Drafts still live in module memory only. A reload or closing the tab now asks first while an order draft, a catalogue form with changes, an import or a save is open (`beforeunload` in js/suppliers.js, like the other editors). Update now uses Keep working / Discard and update, so a confirmed discard reloads with no second question (`LK_UPDATE.letGo()`, 29 Oct 2026). iPhone Safari never shows that question, and a phone that drops the tab in the background never asks; keeping a draft past the page is a separate change. The person on the device (`supplierContext()` in js/prep.js) no longer includes the staff list, so a staff list saved on another phone (a new starter, another person's role) does not wipe the drafts typed here. A hand-over still resets everything, a person who may not open supplier orders any more is still reset by `supplierRead()`, and a person who may not change the catalogue any more loses its open forms. Save changes on an item and Save supplier on existing settings are off while nothing changed, and the saves refuse too, so no catalogue revision or audit entry is made for nothing. A new item or supplier keeps Save on and says what it needs.

No schema, rules, reads or saved data change. The daily-lock release uses supplier UI revision 9 and the matching lazy URL. It adds stable identity and privacy-lock retention to the existing bridge; the server schema is unchanged. tests/keep-typed-editors.test.js covers the reload question, the staff list saved elsewhere, the reset when access goes, and the unchanged saves.

### Daily PIN lock, 2 November 2026

An automatic daily or idle privacy lock hides private supplier data and keeps only the original person's draft quantities, captured units, catalogue edit and pending order id in memory. The same person's PIN restores the form; explicit handover or lost permission clears it. Catalogue/history caches and transaction contexts are invalidated, so a transaction never replays automatically under a new session. An interrupted transaction requires a fresh user retry with the same order id and stale-data checks. A renewed owner grant for that same identity also preserves the draft. Read [device sessions](device-sessions.md) before changing these boundaries.

### Order rows, design A step 2, 3 November 2026

The head chef chose design A (`docs/receiving-design-options/brief.md`). Only the order sheet's screen changes; the catalogue, order, link and audit records are unchanged.

- **On hand on the row.** The stock count (`d.stock`, the same captured-unit rules as the 25 October correction) moved out of Details onto the row as On hand. Details keeps the source record. A stock error no longer needs Details opened.
- **Top-up Use chip.** When a count is typed, the units are confirmed and the count is below par, the row shows the `C.suggestQuantity` top-up as **Top up 7 kg · Use** (`data-su="apply"`, the same Apply path as the Suggestions panel, reason in its title). Nothing fills by itself. Typing a quantity hides it without a redraw; a dismissed suggestion stays dismissed. Repeat-last-order suggestions stay in the panel only.
- **− and +.** Only where `orderUnit` is confirmed, so a number always means that unit. They move the leading number by one (three decimals kept), keep a typed unit, and empty the box at zero (never save 0). They capture the order unit like typing does.
- **Filters.** All, Below par (a counted top-up exists, whether or not a quantity is typed), Asked for (only after the requests are read) and In this order. `M.filter` is cleared by a supplier change and by a validation reveal, so an invalid field is never filtered away.
- **What staff asked for.** A tap on Show what staff asked for runs the existing `B().requests()` once (one query of today's unfilled staff order lines). Matched requests list the text, amount, who asked and when, and the matched item. Unmatched requests stay on the Order list. Nothing is ticked off.
- **Review bar.** `.su-order-actions` sticks to the bottom of the screen (above the tab bar on a phone) with the draft count and Review order.
- The help line is one sentence. The lazy file is `js/suppliers.js?v=11`; `LK_SUP.api` stays 9 because the mount contract is unchanged.

No schema, rules, reads on open or saved data change. `tests/supplier-rows.test.js` (31 checks) covers On hand on the row, the Use chip, the filters, − and +, the one-query requests strip, Review and the bar above the tabs at 390 px. The existing supplier files pass with three updated checks (the stock field is on the row, the On hand label, the lazy URL).

### Sending, design A step 3, 3 November 2026

- **Today's cut-off on the supplier list.** The sidebar chip and the phone's supplier picker show "by 15:00" for an open cut-off today and "ordered" once its tick is on, from the cut-off occurrences already on the phone (no read). Nothing shows after the cut-off passed or for a supplier with no cut-off today.
- **Send, then record.** Review shows **1. Send it your usual way** with **Share order text** (only where `navigator.share` exists; it opens the phone's own share sheet with the same text as Copy) and **Copy order text**, then **2. Then record it here** with Record order placed. A cancelled share says nothing; a failed one falls back to Copy. Sharing writes nothing; Record order placed stays the only save. No new outside service or security header change: the share sheet belongs to the phone.
- `js/suppliers.js?v=11` carries steps 2 and 3; `LK_SUP.api` stays 9. `tests/supplier-rows.test.js` (36 checks) covers the cut-off label, the Share order text and the button showing only with a share sheet.

### One list, 4 November 2026

The order sheet shows the whole supplier on one list; the 20-item pages stay only in Manage catalogue. Measured before the change, with example catalogues in Chrome at 4x slower CPU (a phone-speed stand-in), timing a keystroke in On hand and a filter tap from Node because the test clock freezes the page's own:

| Items | Keystroke, pages of 20 | Keystroke, one list redrawing everything | Keystroke, one list (as built) | Full redraw, one list (as built) |
| --- | --- | --- | --- | --- |
| 60 | 67 ms | 124 ms | 23 ms | 86 ms |
| 120 | 69 ms | 254 ms | 26 ms | 143 ms |
| 300 | 79 ms | 697 ms (worst 1.3 s) | 46 ms | 360 ms |

- **Only the row changes.** On hand, Use, − and + replace their own row (`redrawRow()` in `js/suppliers.js`), give the focus and caret back to the same box or button (after Use, the To order box), and refresh the filter counts and the Review bar. Filters, search, a supplier change and an open Suggestions panel still draw the whole sheet. A Use from the row says "Suggestion added" to screen readers instead of drawing the status line.
- **Rows off screen are skipped.** `.su-row` has `content-visibility: auto` with a 150 px placeholder height that the browser replaces with the real height once a row is drawn.
- **Category jumps.** A chip per category (catalogue order, with counts; a sideways row that fades at its edge) scrolls its heading to the top, and again two frames later once the skipped rows above it have their real height. A supplier with one category shows no chips.
- A validation reveal still clears the search and the filter and focuses the field; there is no page to switch to any more.
- `js/suppliers.js?v=12`, `LK_SUP.api` stays 9. No schema, rules, reads or saved data change.

Tests: `tests/supplier-rows.test.js` adds a 300-item example supplier: all rows on the sheet with no Next, a jump chip per category and Seafood's heading at the top after a jump, and a keystroke, Use and + replacing only their own row (another row's node survives) with the focus and caret kept. Those three checks failed while the sheet still redrew in full (3 failed of 46) and pass with the row updates (46 of 46). `tests/supplier-quantity-entry.test.js` no longer steps through pages to reach item 26 and waits for the search before checking it hid the item.

### List first on a phone, 4 November 2026

The head chef found the order sheet took a lot of scrolling on a phone before ordering could start, and asked for the same treatment as the Prep list in the work pages design (design A, Clean notebook, PR #464: the list first, extras folded to one line, the action in a bar above the tabs). Measured at 390 by 844 with the test stand-in, a supplier with a cut-off today and a last order:

| | Before | After |
| --- | --- | --- |
| First item starts | 1,186 px | 512 px |
| First To order box | 1,284 px | 656 px to its bottom edge (the Review bar starts at 709 px) |
| Visible screen above the tabs | 776 px | 776 px |

- **Under 900 px:** the heading is one line (no eyebrow or description, a smaller Refresh); the second supplier name and item count go (the picker shows the name, the All chip the count); the picker and search lose their visible labels (screen readers keep them) and sit side by side under 720 px; the filter chips are one sideways row that fades at its edge.
- **One info line** (`infoHTML()`): "Order by 15:00 today · last order Mon 2 Nov" (the weekday instead of today when it closes on another day). More opens the cut-off card and the last order; Less folds them. It opens by itself when an order is already marked as placed (Additional order lives in the card) or the last order could not be read, until a tap decides. A supplier change starts folded again. From 900 px the line is hidden and both blocks show open, as before.
- **Staff requests** is a chip at the end of the filter row (the same one query on a tap). Once the requests are in it becomes Asked for: with matches the filter switches on and the strip shows above the matched rows; with none the page says so.
- **Below the list, at every width:** the Suggestions panel, the staff requests strip when Asked for is off, the help line, then Order history.
- **Extra large text and narrow phones.** The heading may wrap, so Refresh drops under the title rather than off the screen (the first GitHub run caught Refresh 4 px past the edge at 370 px with Extra large text). Rows follow the Prep list's narrow rule (`docs/adaptive-controls.md`, narrow Prep A): below 360 px, or below 480 px with Extra large text, Par and Last order share a line and To order takes its own, so nothing is cut at a row's edge (it was 22 px at 330 px and 32 px at 320 px). Checked from 390 down to 320 px at normal and Extra large text.
- **Keeping clear of the Review bar.** The GitHub runner's fonts are slightly larger than the local test browser's: the first run there put the first To order box at 680 px against a bar at 678 px, because the bar's count wrapped it onto two rows and the picker took two lines. Now the picker is one line cut with an ellipsis, the info line is short enough for one line, the category heading has less space above it, and the Review bar stays one row (the count wraps beside the button). Locally that leaves 53 px between the box and the bar at 390 px, and 9 px at 360 px.

No schema, rules, reads or saved data change. `tests/supplier-rows.test.js` (57 checks) adds the first To order box above the Review bar at 390 px, Extra large text at 370 and 330 px (2 failed of 57 before the wrap and narrow-row fix), the folded line, More and Less, the line opening by itself for a placed order, the laptop keeping both blocks open, and the chip opening Asked for. On the old layout these fail (the first To order box at 1,330 px, no line, no chip).


### Ticked on the order list only, 5 November 2026

Head chef decision (round 2 of the work pages redesign): a supplier's order is ticked as done only on the order list. The order list's tick (`data-p="cut-tick"`, `cutConfirm()` in js/prep.js) now does what the bar's Order done did: it confirms an order placed elsewhere for any supplier, linked or unlinked, without quantities, writes only the existing cutdone record, offers Undo, and loads no supplier tools and reads no catalogue. It no longer looks up the catalogue to open a linked supplier's sheet; the supplier's name on the list opens that sheet for recording quantities. The bar keeps the reminder with no button, Chef to-do shows the list with a mark instead of a tick, and the card for a cut-off with zero or several linked suppliers says whether it is done and links to the Order list (its Order done button is gone). Recording an order on the supplier's page still marks it done in the same transaction as before. Supplier UI file revision 14 (`js/suppliers.js?v=14`); `SUP_API` stays 9, as an older copy only shows a button that no longer does anything. No schema, rules or reads change. Tests: supplier-reminder-done (the confirmation, now on the order list), supplier-cutoff-readiness (no lookup, linked and unlinked), supplier-push-route (the card), supplier-orders (Chef to-do without a tick), order-cutoffs, cutoff-push, supplier-module-version.
