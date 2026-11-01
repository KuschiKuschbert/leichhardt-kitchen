# Admin proofreader

Approved on 1 November 2026 after the user reported that "cut brie" became "cut brine". The admin needs to fix a saved correction and prevent a valid kitchen word being changed again on another device. Use the selected Chef's Desk and Review desk layout. This is an extension of that choice, with no new design selection or external service.

## Behaviour

Review desk, Proofreader has Corrections, Always keep and History. Corrections shows prep from the last 60 kitchen days and staff orders from the last 30, including today. It uses the existing admin report readers and their caches. Each entry identifies its source, day, original words and saved words. Removed and function-generated lines cannot be repaired here.

Restore original puts back the exact stored `orig`. Edit wording lets the admin review new words before saving, up to 160 characters for prep and 120 for orders. Neither path runs autocorrect again. Saving preserves the original input, quantity, done or ordered state, author and other operational fields. Derived recipe links are cleared because a link inferred from the previous words may no longer fit. No other line or historical copy is rewritten.

Always keep is a shared list of up to 200 individual words, stored in `config/main.proofWords`. Entries use lowercase ASCII letters, 2 to 40 characters. Protection prevents spelling replacement of that exact word across updated staff devices. It does not create a new correction target, replace a phrase or change existing lines. Normal spacing, punctuation and initial capital still apply. A word can be removed from the list. The existing Undo toast remains a device-only choice.

The editor has explicit Save and Cancel, shows pending writes and retains a failed draft. Back returns to the queue with Resume for unfinished work. A changed source or shared-word revision refuses a stale save. The admin refreshes and reviews the current record before trying again. Success appears only after the server acknowledges the atomic batch. Signing out or handing over clears private records and drafts.

History shows the most recent 100 repair and protected-word events, with who saved them and when. Load it only on History open or an explicit refresh. History is immutable. Restoring a line removes its outstanding correction from the queue but leaves its repair in History.

## Storage and access

Every path is beneath `kitchens/<pin>`:

| Path | Contract |
| --- | --- |
| `config/main` | `proofWords`, `proofV`, `proofEvent`. Existing kitchen readers receive the word list through the existing listener. |
| `days/<day>/items/<id>`, `orders/<day>/lines/<id>` | Preserve `orig`; repair `text` and clear derived recipe links, with next `proofV` and matching `proofEvent`. |
| `proofHistory/<event>` for a line | `kind: line`, `action: restore` or `edit`, `source: prep` or `orders`, `day`, `recordId`, `before`, `after`, `original`, `v`, `at`, `by`. |
| `proofHistory/<event>` for a word | `kind: word`, `action: keep` or `release`, `word`, `v`, `at`, `by`. |

Only the verified Google admin can repair lines, manage shared words or read/create history. Staff and sous chefs keep their existing list access, but cannot forge repair fields or read private audit records. Rules require a source/config revision and its matching event in the same batch. An audit event cannot be changed or deleted. Ordinary ticks and quantities still work after a repair. An old Undo cannot overwrite a manual repair. Valid admin copies during a kitchen PIN move preserve revisions and history.

All browser writes use `W()` and the existing pending-write tracker. A correction reads its source from the server, then atomically writes the source, audit event and `config/main.pastEdit.p` or `.o` stamp. The stamp also invalidates other devices' historical copies. A word change reads the current config and atomically saves the next list revision and audit event. Failed or cache-only reads never become permission to write.

Manual backup, encrypted nightly backup and PIN moves preserve the shared configuration, repaired source fields and every audit event. The admin's 100-event display limit does not truncate a backup. Never commit production history, identifying data or backup files.

## Read and write budget

Staff acquire shared protection through the listener already used for `config/main`. There is no new staff query, listener, history read or polling. A connected updated phone sees a shared-word change on that listener; a disconnected phone keeps its last received configuration until it reconnects.

Opening Corrections can start the existing 60-day prep and 30-day order report loads. They share those reports' caches rather than scanning history a second time. Refresh explicitly reloads the selected report data. Each repair adds one latest-source read and three writes in one batch. Each shared-word change adds one latest-config read and two writes in one batch. History adds one query of at most 100 records on first use or refresh. Empty queries still cost a read.

Nightly backup adds one `proofHistory` collection query, costing one read per stored event or one for an empty collection. It intentionally retains all events. It adds no production writes and keeps the existing encryption and 90-day artifact retention.

## Learning boundaries

This feature corrects source wording and prevents future spelling replacements. It does not rewrite learned usage counts or merge similar item identities. A finished day that the nightly learner has already counted remains counted under its existing learned item. Existing Learned items controls can hide a bad suggestion separately. The private nightly analysis rereads current sources, so its next successful publication includes repaired wording. These are separate from an immediate source repair.

## Acceptance and release

- Restore and Edit work for prep and orders, preserve operational fields and keep exact original input in private history.
- Shared word protection reaches a second updated staff device without an extra read and does not stop clear typos being corrected.
- Conflicts, refused writes, no signal, pending writes and handover preserve the existing access and draft boundaries.
- Each role is checked on the real rules emulator. Standalone, stale or forged repairs fail; matching batches work; history stays private and immutable.
- Phone, tablet and desktop use the selected Review desk flow with no sideways scroll, searchable lists, keyboard labels, Back and Resume.
- Manual backup, nightly backup and PIN copying preserve fields and audit records. The backup regression fails against the previous script because `proofHistory` is missing.

Run the browser suite, rules suite and the existing `scripts/delivery-backup-check.mjs` emulator check. Publish the additive repair rules from the feature branch before merging the client. Existing unmodified lines retain their previous write contract. Require green Click tests, run `scripts/pre-merge.sh`, squash merge, then check Pages, the Lock probe and live tests. Roll back client defects with a revert PR while preserving stored history and private access. Old clients ignore the new word list until updated and cannot undo an acknowledged manual repair.
