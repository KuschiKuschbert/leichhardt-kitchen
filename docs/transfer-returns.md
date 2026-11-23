# Transfers returned in full

Staff log a transfer as before. Today's lines stay on today's list. Open loans from every earlier date also appear under Still outstanding, oldest first. Both directions are loans: stock taken from us and stock we borrowed. There is no age limit and no automatic return.

Returned confirms the whole original quantity came back. It records the confirming person and time on the dated line. Partial returns are outside this change. Original amounts, units, people and venues are preserved. A staff member can undo their own confirmation for two minutes; a chef can reopen it later from the dated history. Shared tablets ask for a personal PIN first. View-only staff have no return control.

Since the redesign's step 4 (8 Nov 2026) the open loans show as cards, one a pick-up: the lines one person logged together for one venue (`xCardsHTML()` in `js/prep.js`, worked out on the phone from the lines already read, no new field). Each card says Lent to or Borrowed from, how long (red from 7 days), when, who came or gave it and who logged it, then each item with its own **Mark returned** button (`data-p="tr-return"`, the same `returnXfer()`). A return is still one item, all of it.

## While a return is waiting

Tap **Mark returned** once for the full item. The same card shows **Return pending** and still counts the item in **Still out**. Until the write is acknowledged, an earlier loan stays on its card and a loan logged today stays out of **Done today**. A refused write leaves the loan available to retry and shows the usual failure message. An accepted return removes it from Still out and names the item on the slip with **Undo**.

The phone holds a copy of the original row in memory for the person who tapped. This keeps the list truthful when the open index drops the loan on the phone before the server answers. The existing lock keeps the loan and its status private. The original dated line, index batch, return permissions and read budget stay the same.

Verdict: Not needed (bug fix). The action remains one tap in the original row. The existing feedback pattern gives the wait a name and confirms completion only on acknowledgement. See [After the tap](action-feedback.md#the-rule).

In the complete app with a synthetic staff session and one older loan, the original build showed **Nothing out** during a 4.2 second hold. The repair keeps the row at its original height and position at 390, 768 and 1280 px with the app fonts. The existing button remains 44 px high and the waiting words contrast 6.21:1 against the white card in the fixture. `tests/transfer-returns.test.js` checks older and today loans, both acknowledgement orders, a refused write, Undo and the original person's 04:00 PIN recovery.

## Data and reads

The dated line at `transfers/<date>/lines/<id>` stays authoritative. Return fields are optional on older lines: `returned`, `returnedBy`, `returnedById`, `returnedAt`. Missing means unconfirmed, so old loans start outstanding.

`transferOpen/<date>_<id>` holds `{date, lineId, record, open, by?}`. `record` exactly matches the dated line, and `open` means neither removed nor returned. New lines, returns, removal and restoration save both records in one batch through `W()`. Returning an older loan also stamps the transfer history cache in that batch, so the head chef sees the new status on other phones. Rules check the copy against the final original with `getAfter`; a return without its matching index is refused. A second phone cannot re-stamp a completed return or change its quantity. The original history remains private to the head chef's Google account for older dates.

One extra listener queries only `open == true` across dates. It starts with the transfer page and stops when the kitchen connection stops. Cost is one read per open loan initially, then changed loans. It does not poll or scan historical days on phones. Loading and errors are stated; a failed read is never presented as an empty list.

The index contains closed records for recovery but phones query only open ones. The nightly backup and admin backup include the index, including loans outside their usual date window. Moving the kitchen PIN copies the original and index together, including older loans. CSV exports include return status, confirmer and timestamp.

## Migration and release

1. Run the normal PR checks, including the emulator.
2. Run **Publish rules** on this feature branch before merging app code. It first runs `scripts/transfer-index.mjs` using the existing private Actions secrets, then publishes rules and runs the live lock probe. The script enumerates missing parent documents too, reads all dated transfers and creates the index in transactions. Re-running preserves current return state and skips unchanged records. It prints counts only.
3. Check that Publish rules succeeded, then merge the app PR. Check Pages and the live click tests.

The existing nightly learning job also repairs the index. This covers stock logged or removed on phones still running the previous app: those changes appear in the open index after that repair. Updated phones save the index immediately. Old records cannot prove whether stock already came back, so staff must confirm those returns manually. Nothing is assumed returned.

## Rollback

Revert the app commit on its own branch and PR. Original transfer logging and dated history remain compatible: the old app ignores return fields and the index. Keep the additive rules while any new app remains open, so its pending writes can finish. After phones have refreshed to the old code, publish the previous rules and run the lock probe. Do not delete saved return data. Reapplying this change and rerunning the index script preserves it.

## Working rules (moved from CLAUDE.md, 3 Nov 2026)

Dated lines now allow return updates through `xWrite()`, which atomically maintains `transferOpen`. Staff read older outstanding loans through one open-only listener, never the private dated history. Return fields must stay in backups, PIN moves and CSV exports. Run the Publish rules workflow on the feature branch before merging this app change; it indexes all existing loans before deploying rules. `scripts/transfer-index-check.mjs` verifies the migration on the emulator.

## Phone card width, 16 November 2026

The owner reported cards running off the right edge after main-tab swipes shipped. The same fault reproduces with the pre-swipe `9697fd8` app and stylesheet: `.tr-cards` had an implicit automatic grid column, so a long metadata line or venue word made every loan card wider than the notebook. This repair sets one `minmax(0, 1fr)` column, allows the venue heading to shrink and wrap, and lets quantities wrap before the return button. It does not clip the page to hide the fault.

Verdict: Not needed (bug fix). The approved loan cards, order, colours, type sizes, return buttons, More controls and dock stay. Mark returned remains one tap, with Undo, and all controls retain 44 px targets. Long entries may take more lines because their words now fit inside the screen. No Firestore reads, writes, fields, rules or saved copies change.

Implemented-app verification uses synthetic loans, a signed-in head chef, the complete shell and actual Caveat/Barlow fonts at 360, 390, 768 and 1280 px, with normal, large and extra-large text. The same regression fails 11 of 60 checks on the pre-swipe code and passes all 60 with the repair; fallback-font checks pass all 48. It checks notebook/card edges, visible return targets, quantities not overlapping buttons and page errors. Existing transfer logging/return/Undo and main-tab swipe tests also run before release. Physical-device feel remains unverified.

Synthetic 390 px captures with large text: [before](images/transfer-width-before.png), [after](images/transfer-width-after.png). The single-word sample venue deliberately exercises the widest allowed heading. Revert this CSS repair to roll back; there is no data migration.
