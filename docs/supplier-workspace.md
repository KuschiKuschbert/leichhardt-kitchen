# Supplier workspace

Status: implemented. Approved by the head chef on 24 October 2026 after the workspace, history, smart suggestions and catalogue editor drafts. Private catalogue loading is a separate authenticated release step; the source data is never bundled with the public app.

## Outcome

Chef-hat > Supplier order opens a collapsible supplier workspace for the head chef, sous chefs and verified Google owner. Head chef and owner manage the catalogue; sous chefs order and read history. Staff, leads and function managers have no access. Admin > Content > Suppliers & pars links to the same editor. Keep the full Google-only admin gate.

Reuse the current app shell, Barlow and Barlow Condensed fonts, action buttons, choice chips, text-size settings and focus rules. No new font or service. Keep the current staff free-text order list, recipe book, prep and wastage flows.

## Private data contract (version 1)

All paths are below kitchens/<pin>. Never commit supplier goods, source PDFs, prices, product codes, account details, staff names or the owner email. The source catalogue is imported through the restricted editor as a private JSON file. Only the import format and synthetic examples belong in git.

- suppliers/<sid>: {name, cutoffId, v, items, at, by}. Each item has {id, name, pack, group, category, par, parUnit, orderUnit, factor, aliases, archived, manual, source}. Current par is a string: empty means unset, '0' means explicit zero. factor is zero until a conversion from one order unit to par units is verified. source is {file, page, row, name, par}. Imported source fields and names are retained; manual source fields are empty/zero. Item and supplier IDs are stable.
- suppliers/<sid>/audit/<revision>: {v, itemId, action, before, after, at, by}. Appended atomically with the next catalogue revision. No hard deletion.
- suppliers/<sid>/orders/<orderId>: {sid, supplierName, v, at, day, deliveryDay, cutoffDay, cutoffId, by, lines}. Each line is a snapshot {itemId, name, pack, qty, amount, unit, par, parUnit, source, suggestion, stock}. qty retains explicit quantity text or a canonical numeric snapshot, amount is a positive number and unit is explicit or the reserved unspecified marker. Number-only entries with no configured unit store e.g. qty: '2 unspecified', amount: 2, unit: 'unspecified'. This marker means no physical unit was established; it never means pieces and cannot participate in conversions. Existing readers can parse it as a custom label. stock is an optional current-run count encoded as a string. No record rewrites after create.
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

A bare positive number uses the item's confirmed order unit when available; a bare stock count uses its confirmed par unit. With no configured unit, both remain valid and explicitly unqualified. Stock may be zero; order quantities must be above zero. Whole numbers, decimal commas and fractions use the existing parser's three-decimal precision. Review, last order, history and copied text show e.g. 2 (unit not set). Explicit units take precedence. Units are never inferred from a name, pack or par.

Reuse and Apply preserve an unqualified snapshot even if the catalogue gains a unit later. Refresh and item edits preserve the original unit of numbers already in a draft. Unknown counts cannot drive stock conversions or top-ups. Invalid values still identify and focus the exact field, reveal hidden pages and keep other draft entries. Supplier UI revision 6 and core revision 3 use versioned lazy URLs and reject mismatched modules; catalogue and order data remain version 1.

Tests: supplier-core, supplier-quantity-entry, supplier-number-entry and supplier-module-version cover numeric entry, failed-save retry, decimals/fractions, stock, immutable history, copy/reuse, changed catalogue units and mixed-version delivery. Revert through a fresh branch and PR to roll back. Previous clients can read and reuse these saved records, displaying the literal unspecified label; no saved data cleanup, migration or rules deployment is needed.

### Reminder-only confirmation, 25 October 2026

The bar keeps its existing compact button and uses the label Order done. A saved confirmation offers Undo on the landing page, supplier workspace and prep pages. The Order list remains the later correction path. Only an existing chef session or the verified owner can confirm; an old Undo cannot run under the next person on a shared device. Repeated taps do not replace an existing completion. A failed save restores the reminder without overwriting a later tap or another chef's newer tick. No success is announced while the write is still queued. Tomorrow's early cut-off retains its own date.

No schema, security rules, dependencies or persistent caches change. There are no additional reads. Detailed order validation and transactions remain unchanged. Roll back with a revert on a fresh branch and pull request, then verify Pages and live click tests. Existing completion records remain compatible with the previous client; saved orders and history need no migration or cleanup.

Regression coverage is in tests/supplier-reminder-done.test.js. The existing supplier-cutoff-readiness tests continue to cover the detailed tick-list flow, and supplier order tests cover immutable recording, duplicates and additional orders.
