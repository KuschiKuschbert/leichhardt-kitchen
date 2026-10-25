# Transfers returned in full

Staff log a transfer as before. Today's lines stay on today's list. Open loans from every earlier date also appear under Still outstanding, oldest first. Both directions are loans: stock taken from us and stock we borrowed. There is no age limit and no automatic return.

Returned confirms the whole original quantity came back. It records the confirming person and time on the dated line. Partial returns are outside this change. Original amounts, units, people and venues are preserved. A staff member can undo their own confirmation for two minutes; a chef can reopen it later from the dated history. Shared tablets ask for a personal PIN first. View-only staff have no return control.

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
