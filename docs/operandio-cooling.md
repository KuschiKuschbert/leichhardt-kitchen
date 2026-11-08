# Operandio cooling

The head chef selected **B, filling desktop clock face**, with a fixed mobile ring, and authorised implementation and release on 9 November 2026. Each deadline plays three louder chimes. The shared timer, permissions and open-screen delivery remain the previously approved feature. [Design comparison and decision](operandio-clock-motion-options/brief.md).

## What staff do

Anyone with current kitchen PIN access, including View only, can start a stage. Functions-only accounts cannot. The two fixed stages are:

1. Tap the clock. On desktop it smoothly expands to **Start · Operandio · 2 h**; on mobile it remains a 44px circle and shows an orange play icon. Tap Start or play to begin two hours.
2. Once the server confirms the start, desktop shows the countdown in the pill with a filling clock face. Mobile keeps the same small clock with a filling perimeter ring. Running timers are read-only status.
3. At two hours the clock turns green and each logged-in open screen gets **"Operandio batch cooling time 2 hours is done."** The desktop action says **Done / Start 4 h**; mobile shows a green tick. Four hours waits until someone explicitly starts it from that control or the ping. Its deadline is four hours after that separate start.
4. At the second deadline each logged-in open screen gets **"Operandio batch cooling time 4 hours is done."** The green control can arm another batch; a further explicit Start begins its two-hour stage. The compact timer details also retain Start another batch.

Got it dismisses only that person's alert on this device and stops any remaining chimes there. It does not start a stage or silence another screen. Repeated or simultaneous starts cannot reset a deadline. There is one kitchen batch at a time, always named Operandio.

Pending feedback appears immediately in the same control. A countdown or confirmed success never appears from a local estimate or an unresolved write. Named failures persist with an explicit retry; uncertain writes are reconciled against the shared record and never silently replayed. The compact details menu remains available through `#/cooling`, existing API calls and error detail. Pings and details retain the existing overlay stack, focus trap, Escape/Back and sheet queue. Pings wait for PIN unlock, typing, Undo and other sheets.

The desktop pill reserves its space so neighbouring controls and the list do not move. Mobile never expands or hides the brand. All action targets remain at least 44px, and reduced motion removes the expansion and gentle settle. Countdown updates are not live announcements; stage changes are announced separately.

Each Operandio alert uses three stronger soft chimes, 1.65 seconds apart, through the existing audio limiter. The kitchen's sound Off setting still silences it. Other pings retain their selected single sound. Closing the cooling ping, locking or changing the session, hiding the app or leaving the page cancels remaining cooling notes. There is no new preference or permission. Device volume, silent mode and browser gesture restrictions still apply.

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

The existing additive rules shipped with the original timer. The pill, ring and chime update changes no rules or data contract. One live document subscription costs a read on subscribe and for each accepted shared change, subject to Firestore's ordinary reconnect billing. There are no request documents, scheduling jobs, delivery scans or token registrations. Personal dismissal markers contain bounded run/stage IDs only, partitioned by kitchen, device and person.

## Backup and kitchen PIN changes

Browser Export and the nightly backup include the current canonical run and its exact server start times. There is no separate run history or scheduled work. A restored current run can show elapsed alerts when authorised screens open it. See [backup recovery](backup-recovery.md).

Move PIN checks the current timer before collecting the copy and again before the first destination write. An unfinished or unreadable batch stops the move. Finish both stages before changing the kitchen address so an outstanding timer stays with the kitchen using it. A completed record remains under the old PIN and in backups; the new kitchen begins ready for a fresh batch. As with the existing multi-step kitchen copy, coordinate the move while nobody is adding work or starting a new batch; the copy does not freeze other devices.

Original dropdown release screenshots: [phone ready](operandio-cooling-options/app-phone-ready.png), [phone running](operandio-cooling-options/app-phone-running.png), [tablet](operandio-cooling-options/app-tablet-running.png), [desktop](operandio-cooling-options/app-desktop-ready.png). These use synthetic data.

## Files and verification

`js/cooling-core.js` validates and derives timing, `js/cooling.js` manages the shared subscription and writes, and `js/cooling-ui.js`/`css/cooling.css` render the approved UI. `js/prep.js` supplies session, write, clock and sheet adapters; `js/app.js` supplies the chip and route. All three JS files and the CSS belong to the saved shell in `index.html`, `sw.js` and both `js/upkeep.js` lists. Historical shell manifests remain unchanged.

Verification covers stage sequence, simultaneous starts, server acknowledgement, stale/offline state, locks, personal dismissal, two screens receiving the same deadline, reload recovery, screen sizes and keyboard use. Real Firestore emulator checks cover roles, strict write shapes and competing starts. Backup recovery runs the actual exporter and encrypted recovery flow against local emulators. No automated check sends a live kitchen ping.

Focused verification passed: 11 core groups, 24 controller checks, 55 integration checks, 66 UI checks and 117 real-font header/team checks. Real emulator checks passed for 192 cooling cases and all 1,971 client calls across nine sign-ins after merging Cleaning. Combined backup recovery round-tripped 63 documents. The sheet-queue and uncertain-write conflict regressions fail on their earlier implementations.

The original timer release used additive rules published before its client. The current presentation update uses those unchanged rules and needs no database deployment, configuration switch or background service. Its current verification is recorded in the [motion brief](operandio-clock-motion-options/brief.md).

## Rollback

Revert the client through the normal saved-shell process. Leave the canonical record and additive rules for inspection and compatible older clients. Removing the new UI does not change ordinary shift pings or supplier reminders. Re-enabling reads the stored times; it never restarts a stage automatically.
