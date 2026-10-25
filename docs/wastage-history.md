# Wastage history

Implemented from the design approved 25 October 2026. Release is gated by the
required Click tests check, rules publication and the live lock probe.

## Outcome

Admin panel, Reports, Wastage opens History first, with Summary and Daily reviews
beside it. Keep the book's existing fonts, colours, controls and responsive lists.
The staff Wastage page still logs today. Private history still requires the head
chef's verified Google account and the existing shared-device chef gate.

## Contract

- Periods: last 7, 14 or 30 days; this month to date; previous calendar month;
  previous three complete calendar months; custom inclusive dates, up to 366 days.
- Dates use the book's Queensland clock. Display the exact start and end dates.
- Item search, section, reason, weekday, person and unit apply to History,
  Summary and CSV. Removed records are optional in History and CSV, clearly
  marked, and never count in wastage totals. Grams combine with kg; litres,
  portions and pieces stay separate.
- History lists date/time, item, amount, reason, section and logger. Notes expand.
  Use lvHTML for sorting, pagination and phone cards.
- Summary preserves daily patterns, reasons, repeated items and logging coverage.
  Compare with the immediately preceding period of equal length.
- Daily reviews lists the period's dates, saved reviews and the existing review
  editor, including its check for a newer review before replacing one.
- A failed history read shows an error and retry. It never produces a successful
  empty report, a cached empty range or an apparently complete CSV.

## Storage and reads

Keep waste/<date>/lines/<id> and waste/<date> authoritative. No migration, new
collection or outside dependency. An owner-only collection-group list rule lets
the report query existing lines by their full document paths between two dates;
orders and transfers are outside those bounds. Reviews use one document-id range
query. Staff and sous-chef PIN sessions cannot run the history query.

Past ranges are read on demand and cached for the kitchen day. Today is read
fresh on opening and on Refresh. Filters and view switches reuse loaded records.
Only a complete read is cached. Past corrections stamp config/main.pastEdit.w;
other admin devices discard older copies. No polling or per-day query loops.

Publish the additive owner-only read rule before merging the app. Existing
clients continue to work. Revert the app commit to roll back; saved waste and
reviews are unchanged. The additive read rule and w stamp validation can stay in place for older
clients. To remove the group query permission later, remove only that match and
keep w accepted while config/main.pastEdit contains it. Publishing an unchanged
older template would make older sous-chef stamps that preserve w fail. Saved
wastage and reviews need no rollback; older clients ignore the added stamp.

## Verification

- Nine affected click-test files passed locally, including date boundaries, leap
  years, year changes, a different phone time zone, old records beyond 60 days,
  matching filters/totals/CSV, removal failure, restore, partial-load failure and
  retry, cache invalidation, malicious text and object-key names, review conflict
  handling and shared-device access.
- Layouts checked at 390, 768 and 1280 px with no sideways overflow. The phone
  heading stays available to screen readers. Reference screenshots use only
  synthetic data: `images/wastage-history-phone.png` and
  `images/wastage-history-desktop.png`.
- Full rules checks passed locally: 593 core checks, 31 lock probes, 145 supplier
  checks, plus the new owner-only history and path-bound checks.
- Nightly learning, transfer-index and read-only history-query checks passed on
  the emulator. `scripts/waste-range-check.mjs` also runs before rules publication
  to prove the same range query works with the production indexes, without
  printing records or changing data.
- The required PR check runs the complete 127-file click suite and emulator
  checks. Publish the tested rules before merging; live click tests run after
  the Pages deploy.
- The existing read-budget fixture fell from 732 admin reads to 616 on first
  open, and stays at 28 on the same-day reload. No budget increase.

Official query guidance checked 25 October 2026:
https://firebase.google.com/docs/firestore/security/rules-query
