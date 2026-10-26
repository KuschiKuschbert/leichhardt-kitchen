# Delivery temperatures

Requested by Kuschi, 26 October 2026. Status: database rules verified on the emulator; form implementation follows in a separate release.

## Outcome

Every logged-in role, including functions coordinators and view-only staff, opens **Delivery received** from the chef-hat menu. The short form records the supplier, date, 24-hour time and measured chiller / coldroom or freezer temperatures in °C. A mixed delivery can have both temperatures. Items / notes are optional. The receiver's signed-in name and id are saved automatically.

Build recommendation: build one form using the existing book style. It fills a daily receiving-record gap, takes one save for mixed deliveries and needs no new service or dependency. Date and time use `LK_TIME`, the existing Queensland clock. Staff see and record today; the verified Google admin can select a historical date. This is an explicit delivery-only exception to functions-account restrictions, not access to the supplier catalogue or other kitchen lists.

## Data contract

`kitchens/<PIN>/deliveries/<receipt id>` has exactly `day`, `receivedAt`, `recordedAt`, `supplier`, `chilled`, `frozen`, `note`, `receivedBy`, `receivedById` and `by`. Temperatures are numbers or null; at least one must be present. Zero and negative decimals are valid. The technical input range is -100 to 100 °C, not an acceptance or food-safety range. The form does not declare a delivery safe or apply unconfirmed venue limits.

Receipts are immutable. A correction is a new record with a note referring to the original. Direct writes cannot change the logged-in writer, rewrite readings, delete a receipt or expose past receipts to staff. Exact retries reuse the original id and payload. A save is announced only after acknowledgement or a matching server read. A failed or uncertain save keeps its details in memory. Sign-out, account changes and expiry clear all delivery data and drafts.

## Reads and recovery

`js/deliveries.js` loads only on `#/deliveries`. Today's page has one filtered live listener, removed when leaving. A past-date selection uses one server query and retains only successful complete results in this sign-in's memory; Refresh bypasses that copy. No extra reads at normal app startup, polling or persistent private cache. Each save checks one exact id before writing, also used to recover a lost acknowledgement. Read failures are visible and never recorded as an empty history.

The admin backup reads a single date range for the last 400 days. Nightly backups use their existing 45-day window. A kitchen PIN move copies all receipts without changing their ids, writers or timestamps. No order is marked done by logging a receipt.

## Release and rollback

Publish the additive delivery rules and verify their workflow before releasing the form. Existing private-access restrictions stay in force. The rules release can ship first with no visible menu change. Reverting the client hides the new form without deleting receipts; keep the additive collection rules and backups. Do not restore earlier public kitchen reads.

## Acceptance and evidence

- All six personal roles and the verified admin can save, reopen and read the expected records.
- Signed-out, expired, removed and reset-PIN sessions cannot read or write receipts. Functions accounts retain their other restrictions.
- Blank readings, malformed dates/times, future receipt times and invalid numbers are rejected; decimal, negative and zero readings persist.
- Failed saves retain the form. Repeating a save after a lost acknowledgement creates no duplicate.
- Phone, tablet and desktop use the existing fonts, colours and controls without horizontal overflow. Text from other people is escaped.
- Database evidence: all existing emulator suites pass, including 124 delivery access and validation checks. Browser and release checks follow with the form release.
