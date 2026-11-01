# Shared-screen prep attribution

Approved for Prep first, 1 November 2026. Transfers, Wastage, orders, delivery checks and sign-offs retain their current behaviour. The [release pull request](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/434) records current CI, deployment and live verification.

## Interaction

Keep the existing notebook sheet, handwritten rows, function strip, section/date controls, Add, quantities, suggestions, Quick add, Handy, completion controls and navigation. No replacement prep layout or extra progress system.

On a device marked **Shared kitchen device**, ticking an unfinished prep item opens **Who did this?**, with the item and quantity. It uses the existing responsive sheet pattern: bottom sheet on narrow screens, compact centred dialog on wider screens. People authenticated on this device during the current Queensland kitchen day appear first, most recent first. **Others** reveals remaining active kitchen members. Name selection records the task without another confirmation. Cancel, backdrop, Escape or Back leaves an unsubmitted task unticked. The existing Undo remains available to the authenticated recorder under its current limits.

Personal-phone ticking stays one tap and credits the current named person. Picking a worker never signs them in, changes their session, adds them to device-login recency or grants permissions. A recorder still needs their existing tick permission. A reported worker needs active canonical kitchen membership and cannot be functions-only; they do not need permission to submit ticks themselves.

Use the already loaded roster and the existing `hereGet()` / `hereAdd()` device-day list. This list includes successful sign-ins and valid restored sessions. It is not attendance or proof of physical identity. The name choice is a report of who prepared the item.

## Data and compatibility

Existing `doneBy`, `doneById`, `doneAt` retain the authenticated recorder and completion time. `W()` supplies the real writer in `by` as before. Do not switch the authenticated identity to submit someone else's work.

New completions add:

| Field | Meaning |
| --- | --- |
| `preparedBy` | Reported worker's name snapshot. |
| `preparedById` | Reported worker's stable staff ID. |
| `preparedAt` | Same timestamp as this completion's `doneAt`. |

Treat the worker as valid only for a completed item with a complete bounded name/ID pair and positive `preparedAt === doneAt`. Otherwise use the legacy recorder identity. A new Undo clears all three prepared fields. An older cached app may leave unchanged metadata after Undo or a later tick; its old timestamp then makes that attribution inert. Do not silently inherit a previous worker.

Completion labels, historical prep views, weekly completion credit and derived analysis use the valid reported worker. Raw `activity.ticked` remains the authenticated recorder's action count, with matching native debit on Undo. Those two measures answer different questions. No historical identities are rewritten. Full-document manual/nightly backups and kitchen-PIN copies retain the added fields.

## Saving and boundaries

The shared picker keeps its item, recorder and selection while saving. Do not display acknowledged completion or offer a second submission before the result is known. Revalidate identity, kitchen/date, source item and membership before submitting. Close stale choices after access, identity, route or date changes. Preserve failure details and a retry path without duplicate ticks or duplicate activity credit; reconcile an uncertain acknowledgement against the same completion cycle.

Use existing write wrappers, pending/update guards, overlay history, focus handling and access checks. Add no polling, startup listener or new collection. The picker itself needs no additional Firestore read. A bounded exact-record reconciliation may be needed after an uncertain save. Existing list/history and analytics read budgets remain.

## Verification and release

Required: focused browser interaction checks, existing app browser suite, real Firestore emulator rules and client-shape checks, analysis and backup checks, JavaScript parsing, and current-main/pre-merge checks. Include signed-out, staff, lead, view-only, functions-only, sous, head PIN, Google-only owner and named/shared-owner cases without widening access.

The new attribution validation is stricter. Existing rules already permit the extra fields while retaining `doneById == by`; release the compatible client first, then publish the tested rules through **Publish rules**. Preserve all private-read restrictions. Confirm Pages, live click tests and the live Lock probe before calling the release complete. No data migration is required.

Local evidence: 265 focused browser checks passed before the full app run, including 133 new attribution checks. The full real emulator suite passed, including 46 new attribution checks, the role/client-shape matrix and existing private-access checks. The new rules checks fail 19 of 46 against the old rules and pass all 46 with this contract. Analysis unit, analysis emulator and backup emulator checks also pass. Full browser, required GitHub CI, Pages, rules publication and live verification results are maintained in the release pull request. Do not infer a live deployment from local checks alone.

Synthetic captures of the production interface: [phone](images/shared-prep-phone.png) and [tablet](images/shared-prep-tablet.png).

## Rollback

Revert the client on a new branch and pull request. Retain private-access restrictions and the compatibility-aware attribution rules. Old clients ignore the extra fields; their next completion uses legacy recorder attribution when the cycle stamp no longer matches. Existing saved reports and backups remain intact.
