# Operandio cooling

Implemented for review on 8 November 2026. The head chef approved the [compact clock dropdown](operandio-cooling-options/brief.md), then said "lets go". The council verdict was **Build smaller** (5 of 5). The latest decision removes closed-app notifications: only logged-in, open app screens need the ping. This uses the existing Firestore service with no extra timer library, notification permission, backend deployment or billing upgrade. Release verification is recorded below.

## What staff do

Tap the clock in the top bar. The Operandio dropdown is 248 by 155 px in its ordinary ready/running states, with 44 px controls. Anyone with current kitchen PIN access, including View only, can start a stage. Functions-only accounts cannot. The two fixed stages are:

1. Tap Start beside **2 hours**. The server records its start time.
2. Two hours later, each logged-in open screen shows **"Operandio batch cooling time 2 hours is done."** The **4 hours** Start becomes available. Someone must tap it; the next deadline is four hours after that second start.
3. At the second deadline, each logged-in open screen shows **"Operandio batch cooling time 4 hours is done."** A new batch can then start a fresh two-hour stage.

Got it dismisses only that person's alert on this device. It does not start a stage or silence another screen. Repeated or simultaneous starts cannot reset a deadline. There is one kitchen batch at a time, always named Operandio.

Start is a filled button; the locked second action is disabled and says After 2 hours. Starting... appears immediately. Started uses the existing green stamp only after server confirmation. Running and finished values are plain status. Errors stay beside the action with Try again. An uncertain write is reconciled against the shared record and never silently replayed.

The dropdown and ping use the existing overlay stack, focus trap, Escape/Back, keyboard focus and sheet queue. Pings wait for PIN unlock, typing, Undo and other sheets. Sound uses the head chef's existing ping sound. There is no separate notification preference. The fixed `#/cooling` route opens through the normal PIN gate.

## Persistence and delivery

Firestore stores server-issued start timestamps. The client derives the fixed deadlines and displays them with `LK_TIME`. Reloading or closing the app does not pause an accepted stage. Reopening after sign-in reads the current shared state and shows the remaining or elapsed time. The second stage never starts itself.

Each authorised app subscribes to the same current record and checks its deadlines locally. Countdown ticks and deadlines make no database reads or writes. Closed apps send no notifications. A sleeping, suspended or disconnected screen may show a late ping when it resumes and reconciles; delivery is not guaranteed at the exact second. A locked device must unlock first. Unseen messages belong to the current batch; starting a new batch replaces the preceding batch's shared state.

## Authority, storage and cost

The only cooling document is `kitchens/<PIN>/cooling/current`:

```
{v: 1, run, rev, firstAt, firstBy, secondAt, secondBy, by}
```

`firstAt` and a started `secondAt` are Firestore Timestamps. Before stage two, `secondAt` is `0` and `secondBy` is empty. A unique run ID identifies the batch; the revision increases once for each accepted start. The client never supplies an authoritative deadline.

All writes use `W()` and the original recorder's session. First/new-batch Start sets the canonical document. Second Start updates only its revision, second start and writer fields, preserving the exact first Timestamp. Rules require an active kitchen session, matching writer, strict fields, next revision, allowed sequence and a start equal to server request time. New batches are allowed only after the preceding second deadline. No client may delete the record or list cooling documents. Existing Prep and general ping write capabilities are unchanged.

The rules are additive relative to the released app and must publish before the client. One live document subscription costs a read on subscribe and for each accepted shared change, subject to Firestore's ordinary reconnect billing. There are no request documents, scheduling jobs, delivery scans or token registrations. Personal dismissal markers contain bounded run/stage IDs only, partitioned by kitchen, device and person.

## Backup and kitchen PIN changes

Browser Export and the nightly backup include the current canonical run and its exact server start times. There is no separate run history or scheduled work. A restored current run can show elapsed alerts when authorised screens open it. See [backup recovery](backup-recovery.md).

Move PIN checks the current timer before collecting the copy and again before the first destination write. An unfinished or unreadable batch stops the move. Finish both stages before changing the kitchen address so an outstanding timer stays with the kitchen using it. A completed record remains under the old PIN and in backups; the new kitchen begins ready for a fresh batch. As with the existing multi-step kitchen copy, coordinate the move while nobody is adding work or starting a new batch; the copy does not freeze other devices.

Actual app screenshots: [phone ready](operandio-cooling-options/app-phone-ready.png), [phone running](operandio-cooling-options/app-phone-running.png), [tablet](operandio-cooling-options/app-tablet-running.png), [desktop](operandio-cooling-options/app-desktop-ready.png). These use synthetic data.

## Files and verification

`js/cooling-core.js` validates and derives timing, `js/cooling.js` manages the shared subscription and writes, and `js/cooling-ui.js`/`css/cooling.css` render the approved UI. `js/prep.js` supplies session, write, clock and sheet adapters; `js/app.js` supplies the chip and route. All three JS files and the CSS belong to the saved shell in `index.html`, `sw.js` and both `js/upkeep.js` lists. Historical shell manifests remain unchanged.

Verification covers stage sequence, simultaneous starts, server acknowledgement, stale/offline state, locks, personal dismissal, two screens receiving the same deadline, reload recovery, screen sizes and keyboard use. Real Firestore emulator checks cover roles, strict write shapes and competing starts. Backup recovery runs the actual exporter and encrypted recovery flow against local emulators. No automated check sends a live kitchen ping.

Focused verification passed: 11 core groups, 24 controller checks, 55 integration checks, 66 UI checks and 117 real-font header/team checks. Real emulator checks passed for 192 cooling cases and all 1,971 client calls across nine sign-ins after merging Cleaning. Combined backup recovery round-tripped 63 documents. The sheet-queue and uncertain-write conflict regressions fail on their earlier implementations.

Before release: complete the browser and rules gates, publish the additive rules from this branch, verify the foundation and live Lock probe, then mark the application PR ready for the normal release queue. No cooling configuration switch or background service is needed.

## Rollback

Revert the client through the normal saved-shell process. Leave the canonical record and additive rules for inspection and compatible older clients. Removing the new UI does not change ordinary shift pings or supplier reminders. Re-enabling reads the stored times; it never restarts a stage automatically.
