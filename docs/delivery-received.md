# Delivery temperatures

Requested by Kuschi, 26 October 2026. Status: implementation verified. Current deployment evidence is recorded in the release pull requests and GitHub Actions.

## Outcome

Every logged-in role, including functions coordinators and view-only staff, opens **Delivery received** from the chef-hat menu. The short form records the supplier, date, 24-hour time and measured chiller / coldroom or freezer temperatures in °C. A mixed delivery can have both temperatures. Items / notes are optional. The receiver's signed-in name and id are saved automatically.

Build recommendation: build one form using the existing book style. It fills a daily receiving-record gap, takes one save for mixed deliveries and needs no new service or dependency. Date and time use `LK_TIME`, the existing Queensland clock. Staff see and record today; the verified Google admin can select a historical date. This is an explicit delivery-only exception to functions-account restrictions, not access to the supplier catalogue or other kitchen lists.

## Data contract

`kitchens/<PIN>/deliveries/<receipt id>` has exactly `day`, `receivedAt`, `recordedAt`, `supplier`, `chilled`, `frozen`, `note`, `receivedBy`, `receivedById` and `by`. Temperatures are numbers or null; at least one must be present. Zero and negative decimals are valid. The technical input range is -100 to 100 °C, not an acceptance or food-safety range. The form does not declare a delivery safe or apply unconfirmed venue limits.

Receipts are immutable. A correction is a new record with a note referring to the original. Direct writes cannot change the logged-in writer, rewrite readings, delete a receipt or expose past receipts to staff. Exact retries reuse the original id and payload. A save is announced only after acknowledgement or a matching server read. A failed or uncertain save keeps its details in memory. Explicit sign-out and handover clear delivery data and drafts. A daily or idle privacy lock hides private rows and retains the same person's exact form and pending attempt in memory until their PIN unlocks it again. Another identity cannot resume it. See [device sessions](device-sessions.md). Clear form over a typed supplier, reading, note or a changed date or time asks a second tap ("Tap again to clear", 28 Oct 2026, the book's `arm()` through `LK_PREP.book()`); an untouched form clears in one tap, and a keyboard's Enter keeps the focus on the button, so the second Enter clears (29 Oct 2026). Update now uses the explicit Keep working / Discard and update choice over a typed reading (`LK_UPDATE.letGo()`). The page uses API 2 (`js/deliveries.js?v=3`) so a cached older module cannot silently clear a daily-lock draft. Open it once with signal after this update; its revised saved module then opens offline (`tests/saved-copy.test.js`).

## Design A on screen, 3 November 2026

The head chef chose design A (`docs/receiving-design-options/brief.md`). Only the screen changes; the data contract above is unchanged.

- **What came in?** Chilled, Frozen or Both, a radio group with arrow keys. It starts on Chilled every time and lives in the form's memory only (nothing in `lk.*`). It survives the clock tick on an untouched form, the daily-lock draft and leaving the page; Clear form, a confirmed save and a hand-over reset it. Only the boxes for the choice show. A box that is not showing saves `null`. A reading typed into a box that then hides stays in memory and the page says it is not saved with that choice. Both asks for both readings; one choice asks for its own.
- **The − key.** Both boxes use `inputmode="decimal"` (the iPhone number pad has no minus). The key in front of each box adds or takes away the leading minus in the box, so the typed text stays the one truth and a keyboard can still type `-`. It never starts pressed. A frozen reading above 0 °C shows "Reads as +18 °C. Tap − if it is below zero." This is a typing guard, not an acceptance limit.
- **Due today.** Chips from `config/main.cutoffs` (through `LK_PREP.book().cuts`, no new read) for suppliers whose delivery days include the form's day. A chip fills the supplier box with the exact name. Functions-only logins cannot read `config/main`, so they get the plain box. Under today's list, once the server has answered, **Not received yet today** names the suppliers due today with no receipt of exactly that name (trimmed, any case). It says nothing offline or on a past date.
- **Time on one line.** "Name · 14:00 today" with Change time, which opens the date and time boxes. A day or time error opens them by itself. **Add items or notes** opens the notes box; a typed note keeps it open.
- The module is loaded as `js/deliveries.js?v=5`. `LK_DELIVERY.api` stays 2: the mount, unmount, reset and dirty contract is the same, and an older `js/prep.js` without `cuts` just shows no chips.

- **Admin history (step 3).** The verified admin picks From and To, up to 92 days; the other end follows so From is never after To. A single day reads as before (today's listener or one past day); a range is one `day >= From` and `day <= To` query from the server (`tests/rules/client-shapes.test.mjs` has the row, admin only). Complete past ranges are reused in this sign-in's memory, a range reaching today is read again, and Refresh always reads. A supplier filter narrows what is loaded without a read. **Download CSV** goes through the shared `downloadCSV()` (`LK_PREP.book().csv`, `docs/report-exports.md`): Date, Time, Supplier, Chilled (°C), Frozen (°C), Items / notes, Received by, oldest first, numbers kept as numbers and an empty cell for a reading not taken. The module is loaded as `js/deliveries.js?v=6`.

Tests: `tests/deliveries.test.js` (108 checks: the three choices, the hidden reading not saved, the − key and sign note, arrow keys, the clock tick, due-today chips for staff and a sous chef with no read on a tap, Not received yet, Functions-only with no chips, the admin range in one query, the supplier filter and the CSV), plus the updated `delivery-validation-focus`, `device-delivery-lock` and `functions-activity` journeys.

## Reads and recovery

`js/deliveries.js` loads only on `#/deliveries`. Today's page has one filtered live listener, removed when leaving. A past-date selection uses one server query and retains only successful complete results in this sign-in's memory; Refresh bypasses that copy. No extra reads at normal app startup, polling or persistent private cache. Each save checks one exact id before writing, also used to recover a lost acknowledgement. Read failures are visible and never recorded as an empty history. With no signal, Today says so until the server answers (27 Oct 2026), and shows only this phone's receipts still waiting to send, never "No deliveries recorded for this date".

The admin backup reads a single date range for the last 400 days. Nightly backups use their existing 45-day window. A kitchen PIN move copies all receipts without changing their ids, writers or timestamps. No order is marked done by logging a receipt.

## Release and rollback

Publish the additive delivery rules and verify their workflow before releasing the form. Existing private-access restrictions stay in force. The rules release can ship first with no visible menu change. Reverting the client hides the new form without deleting receipts; keep the additive collection rules and backups. Do not restore earlier public kitchen reads.

## Acceptance and evidence

- All six personal roles and the verified admin can save, reopen and read the expected records.
- Signed-out, expired, removed and reset-PIN sessions cannot read or write receipts. Functions accounts retain their other restrictions.
- Blank readings, malformed dates/times, future receipt times and invalid numbers are rejected; decimal, negative and zero readings persist.
- Invalid keyboard saves focus and scroll to the first correction field. The alert is associated through `aria-describedby` and the field has `aria-invalid`; a missing either/or temperature identifies both fields. Editing an affected field clears its stale error without losing focus or other values. Unrelated edits retain the error. These form checks make no receipt writes and do not alter exact-id retry.
- Failed saves retain the form. Repeating a save after a lost acknowledgement creates no duplicate.
- Phone, tablet and desktop use the existing fonts, colours and controls without horizontal overflow. Text from other people is escaped.
- Real database rules: all existing emulator suites passed, including 124 delivery access and validation checks. The daily-lock release adds same-person draft and exact-attempt recovery checks without changing the receipt schema.
- Receiving browser flows passed for all six roles and Google-only admin, retries after refused/offline saves and a lost acknowledgement, history errors and 390 / 768 / 1280 px layouts.
- Manual backup and PIN move checks passed with receipt fields preserved. The nightly backup emulator fixture passed the date window, zero, negative readings, notes and original receiver.
- All 132 local browser files passed across the full run and the focused rerun for the new menu entry. The final receiving, head-chef menu and backup/PIN-move checks passed (139 checks). Existing read budgets pass without an increase.
- The prerequisite database release is [PR #391](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/391). The form release records its full CI, Pages and live-check results in its pull request. No test receipts are written to the live kitchen.

## Working rules (moved from CLAUDE.md, 3 Nov 2026)

`#/deliveries` loads `js/deliveries.js` only when opened. Every personal login may record and read today's temperatures, including Functions and View only; this grants no other kitchen access. The verified admin can pick a From and To range of up to 92 days (Design A on screen, above). `deliveries/<id>` records are immutable, including their receiver. A retry checks the same id before writing. Preserve null versus zero, negative readings, the Queensland clock and in-memory draft clearing on handover. Keep receipts in manual/nightly backups and PIN moves. `tests/deliveries.test.js`, the real rules suite and `scripts/delivery-backup-check.mjs` cover the flows. Do not invent food acceptance limits from the technical numeric input range.
