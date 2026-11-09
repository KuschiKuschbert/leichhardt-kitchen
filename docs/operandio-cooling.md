# Operandio cooling

The head chef selected **B, filling desktop clock face**, with a fixed mobile ring, on 9 November 2026. On 10 November the owner approved shared confirmation and quiet reminders after an audit of repeated pings. Each stage has one device presentation and a separate **I’ve recorded this in Operandio** action. This records a staff declaration in Kitchen Book; it does not connect to or verify the external Operandio app. [Clock design](operandio-clock-motion-options/brief.md), [confirmation decision and checks](#shared-confirmation-10-november-2026).

## What staff do

Anyone with current kitchen PIN access, including View only, can start a stage and confirm its Operandio entry. Functions-only accounts cannot. The two fixed stages are:

1. Tap the clock. On desktop it smoothly expands to **Start · Operandio · 2 h**; on mobile it remains a 44px circle and shows an orange play icon. Tap Start or play to begin two hours.
2. Once the server confirms the start, desktop shows the countdown in the pill with a filling clock face. Mobile keeps the same small clock with a filling perimeter ring. Running timers show status; an outstanding recording check remains accessible through the same clock.
3. At two hours each logged-in open device can show the two-hour ping once. The ping asks staff to record the check in Operandio. After doing that in the external app, tap **I’ve recorded this in Operandio**. Once the server accepts it, this stage’s reminder closes on every connected screen and stays cleared on later logins. Four hours still waits for a separate explicit Start. Its deadline is four hours after that start; neither recording nor dismissing the first check starts it.
4. At the second deadline the device can show the four-hour ping once. Confirm that check separately after entering it in Operandio. The timer cannot start another batch until the following Queensland midnight, but an outstanding confirmation stays accessible. Once both checks are recorded, there is no outstanding reminder. At midnight **Start another batch** becomes available; a fresh batch still needs an explicit two-hour Start.

**Not yet**, ×, swipe, backdrop, Escape and Back close the ping and stop its remaining chimes on this device without confirming work. A quiet outstanding state remains on the existing clock. Showing a stage is remembered for the device, so another login, page change or reload does not keep opening it. Use the clock to return to the check. This replaces personal **Got it** dismissal. Repeated or simultaneous starts cannot reset a deadline. There is one kitchen batch at a time, always named Operandio.

Pending feedback appears immediately in the same control. A countdown or confirmed success never appears from a local estimate or an unresolved write. Named failures persist with an explicit retry; uncertain writes are reconciled against the shared record and never silently replayed. The compact details menu remains available through `#/cooling`, existing API calls and error detail. Pings and details retain the existing overlay stack, focus trap, Escape/Back and sheet queue. Pings wait for PIN unlock, typing, Undo and other sheets.

The desktop pill starts at 1280px and reserves its space so neighbouring controls and the list do not move. Narrower windows use the same fixed ring as mobile, keeping all six page tabs and the Today's team, bell and chef controls in place. Mobile never expands or hides the brand. All action targets remain at least 44px, and reduced motion removes the expansion and gentle settle. Countdown updates are not live announcements; stage changes are announced separately.

Each Operandio alert uses three stronger soft chimes, 1.65 seconds apart, through the existing audio limiter. The kitchen's sound Off setting still silences it. Other pings retain their selected single sound. Closing the cooling ping, locking or changing the session, hiding the app or leaving the page cancels remaining cooling notes. There is no new preference or permission. Device volume, silent mode and browser gesture restrictions still apply.

## Persistence and delivery

Firestore stores server-issued start timestamps. The client derives the fixed deadlines and displays them with `LK_TIME`. Reloading or closing the app does not pause an accepted stage. Reopening after sign-in reads the current shared state and shows the remaining or elapsed time. The second stage never starts itself.

Each authorised app subscribes to the current timer and its separate recording-confirmation record, and checks deadlines locally. Countdown ticks and deadlines make no database reads or writes. Closed apps send no notifications. A sleeping, suspended or disconnected screen may show a late ping when it resumes and reconciles; delivery is not guaranteed at the exact second. A locked device must unlock first. Unconfirmed checks belong to the current batch. A recording confirmation suppresses its exact run/stage on all devices; a queued ping is checked again before opening. The old batch’s confirmation record can remain until someone records a check for the new batch, but its run ID cannot confirm the new one. Starting a new batch replaces the preceding timer as before. Local presentation markers require browser storage; clearing that storage can show an unconfirmed stage again, but cannot undo a shared confirmation.

## Authority, storage and cost

The timer document remains `kitchens/<PIN>/cooling/current`:

```
{v: 1, run, rev, firstAt, firstBy, secondAt, secondBy, by}
```

`firstAt` and a started `secondAt` are Firestore Timestamps. Before stage two, `secondAt` is `0` and `secondBy` is empty. A unique run ID identifies the batch; the revision increases once for each accepted start. The client never supplies an authoritative deadline.

All writes use `W()` and the original recorder's session. First/new-batch Start sets the canonical document. Second Start updates only its revision, second start and writer fields, preserving the exact first Timestamp. Rules require an active kitchen session, matching writer, strict fields, next revision, allowed sequence and a start equal to server request time. New batches are allowed only from the Queensland midnight after the preceding second deadline. The server checks its own date; refreshes, another phone and an old client cannot bypass the lockout. A four-hour deadline at or after midnight belongs to that new day and stays locked until the next midnight. No client may delete the record or list cooling documents. Existing Prep and general ping write capabilities are unchanged.

Shared confirmations use the separate bounded document `kitchens/<PIN>/cooling/recorded`:

```
{v: 1, run, firstAt, firstBy, secondAt, secondBy, by}
```

Here the two timestamp/actor pairs mean **recorded in Operandio**, not timer starts. An unconfirmed pair is `0` and `''`. Each confirmed pair uses server time and the current recorder. Rules require the exact current run and an elapsed stage; same-run updates can add one missing pair and must preserve every accepted confirmation. They cannot change the timer. Each new run replaces this document only when its first confirmation is accepted. Keeping it separate preserves the original timer contract for saved older clients while they update. Older clients retain their old personal reminders until updated.

The 10 November rules are additive and must be published **before** the dependent client, with the normal foundation verification and live Lock probe. The earlier daily restart gate remains enforced. Each authorised app now has two named live document subscriptions, one extra read on subscribe and for each accepted confirmation, subject to Firestore’s reconnect billing. The confirmation rules also read the current timer to check its run and deadline. Clock ticks do no reads or writes. There are no request documents, scheduling jobs, delivery scans or token registrations. Bounded local presentation markers contain run/stage IDs only, partitioned by kitchen and device. Existing personal dismissal IDs are retained when available; they are never interpreted as shared confirmation.

## Backup and kitchen PIN changes

Browser Export and the nightly backup include `coolingCurrent` and `coolingRecorded`, preserving each record’s run, actors and exact Timestamp components. There is no separate run history or scheduled work. A restored current run can show elapsed alerts only for stages without a matching restored confirmation. See [backup recovery](backup-recovery.md).

Move PIN checks the current timer before collecting the copy and again before the first destination write. An unfinished or unreadable batch stops the move. Finish both stages before changing the kitchen address so an outstanding timer stays with the kitchen using it. Completed timer and confirmation records remain under the old PIN and in backups; the new kitchen begins ready for a fresh batch. As with the existing multi-step kitchen copy, coordinate the move while nobody is adding work or starting a new batch; the copy does not freeze other devices.

Original dropdown release screenshots: [phone ready](operandio-cooling-options/app-phone-ready.png), [phone running](operandio-cooling-options/app-phone-running.png), [tablet](operandio-cooling-options/app-tablet-running.png), [desktop](operandio-cooling-options/app-desktop-ready.png). These use synthetic data.

## Files and verification

`js/cooling-core.js` validates and derives timing, `js/cooling.js` manages both shared subscriptions and their writes, and `js/cooling-ui.js`/`css/cooling.css` render the approved UI. `js/prep.js` supplies session, write, clock and sheet adapters; `js/app.js` supplies the chip and route. All three JS files and the CSS belong to the saved shell in `index.html`, `sw.js` and both `js/upkeep.js` lists. Historical shell manifests remain unchanged.

Verification covers stage sequence, simultaneous starts, server acknowledgement, stale/offline state, locks, device presentation suppression, shared confirmation, two screens receiving the same deadline, reload recovery, screen sizes and keyboard use. Real Firestore emulator checks cover roles, strict write shapes and competing starts. Backup recovery runs the actual exporter and encrypted recovery flow against local emulators. No automated check sends a live kitchen ping.

Original timer verification passed: 11 core groups, 24 controller checks, 55 integration checks, 66 UI checks and 117 real-font header/team checks. Real emulator checks passed for 192 cooling cases and all 1,971 client calls across nine sign-ins after merging Cleaning. Combined backup recovery round-tripped 63 documents. The sheet-queue and uncertain-write conflict regressions fail on their earlier implementations.

The original timer release used additive rules published before its client. The pill, ring and chime release used those unchanged rules and needed no database deployment, configuration switch or background service. The daily lockout below adds a stricter same-schema rule. Its presentation verification is recorded in the [motion brief](operandio-clock-motion-options/brief.md).

## Rollback

Revert the client through the normal saved-shell process. Leave both cooling records and additive rules for inspection and compatible older clients. The older timer ignores `cooling/recorded` and may show its former personal alerts; reverting does not erase recorded confirmations. Removing the new UI does not change ordinary shift pings or supplier reminders. Re-enabling reads the stored times; it never restarts a stage automatically.

## Shared confirmation, 10 November 2026

The owner reported persistent Operandio pings on login and across pages, accepted the audit’s recommendations and requested implementation and live release. The audit reproduced reload repetition after closing without **Got it**, an old two-hour ping after starting four hours, and both previous-day pings for another person. Ordinary navigation through five page routes did not repeat the same stage. The deployed core, controller, UI and cooling adapter matched the audited source. Five existing focused test files passed during that audit; those results describe the old behaviour, not this implementation.

### Quick service check

**Verdict: Build.** This is the owner-approved refinement of the existing ping and clock. It adds no page, top-bar button or new popup, and keeps explicit timer starts. One clear confirmation replaces **Got it**; **Not yet** retains cancellation without claiming the external job is finished. The service benefit is fewer interruptions and one shared answer to whether the check has been recorded. This is a proportional role-based check, not staff research or a new five-person council vote.

Flighty’s now/next distinction supports separate timer and recording states. Duolingo’s truthful feedback supports waiting for the accepted write before clearing the reminder. Headspace’s plain action words support **I’ve recorded this in Operandio** and **Not yet**. No additional navigation or decorative progress is needed. Shared purpose surfaces, amber attention, green confirmed outcomes and red failure tokens remain governed by the existing design contracts; words carry the state as well as colour.

The popup confirmation takes one tap, as **Got it** did. Returning after **Not yet** uses the existing clock and then the named confirmation. The initial timer still takes two taps; four hours remains a separate Start. Implemented-app measurement compared the baseline idle clock with the quiet outstanding state, using the same synthetic staff fixture and stand-in fonts at 390, 768 and 1280 px: all six Prep rows stayed fully visible, every row rectangle was unchanged, and header heights stayed 64, 96 and 96 px. **Add a line** opened the full form in one tap before and after. These are full-app measurements, not preview density claims. Real-font, focus, contrast and pending/error checks are recorded with the release validation.

| Action feedback | Behaviour |
| --- | --- |
| Tap confirmation | The same button immediately shows saving; duplicate attempts are blocked. |
| Server accepts | The corresponding shared reminder closes; the details retain its recorded time. Other connected screens stop that stage’s ping and sound when they receive the confirmation. |
| Old words | The outstanding request for that stage disappears after acceptance. |
| Person’s place | The underlying work page and list position stay where they were. |
| Failure or uncertainty | Keep named pending/failure feedback and an explicit recovery path. Do not claim the external entry was recorded from a local estimate or cached response. |
| Undo | No automatic undo of a staff declaration. Starting or confirming another stage cannot erase it. |

Leading checks are two devices confirming together, closing/reloading before acknowledgement, a session handover during a write, confirmation arriving while a ping is queued, a stale record for a replaced batch, and both midnight and 04:00 unlock. Client fixtures establish interaction behaviour; real rules-emulator checks establish server enforcement. No verification sends a production kitchen ping or writes to Operandio.

### Release order and validation

Implemented screens with synthetic data and actual Barlow fonts: [phone ping](operandio-confirmation/phone-ping.png), [tablet details](operandio-confirmation/tablet-details.png), [desktop ping](operandio-confirmation/desktop-ping.png).

Local verification passed 15 core groups, 43 controller checks, 118 UI checks, 143 motion checks, 58 timer integration checks, 48 shared-confirmation integration checks and the unchanged 27 read-budget checks. The full Firestore/Auth rules suite passed, including 361 cooling checks, 2,358 client calls across nine sign-ins and 222 private-access checks. The confirmation regressions failed on the former implementation before the changes. Independent review reproduced and verified repairs for legacy dismissal handover and reopening an uncertain confirmation after closing it. Rendered affected text contrast is 4.76:1 or better; saving, failure, keyboard focus and reduced motion were exercised. These are synthetic client/emulator checks, not production kitchen writes.

Publish the additive recorded-document rules before the client, then release the client through the existing queue. Verify Pages, the live Lock probe and live click tests. The timer and its accepted deadlines remain unchanged; no migration, schedule or external service is needed. Local backup verification passed: all 52 admin-tools browser checks, including exact confirmation export, explicit null for missing records and a named omission when confirmation reads are refused. The isolated real Firestore-emulator rehearsal ran the nightly exporter, encrypted/decrypted its output and round-tripped 69 included documents. It preserved exact confirmation timestamps, different recording actors, an unconfirmed pair and a previous-batch record. These checks use synthetic data and do not establish production deployment or a successful scheduled backup.

## Daily lockout, 9 November 2026

The owner requested that the timer be disabled after four hours runs out until the next day. Next day means 00:00 Queensland time after the second deadline, independent of the device privacy unlock at 04:00. Incomplete first or second stages retain their accepted deadlines across midnight. The client derives `restartAt` from the saved second start's exact seconds; it is a display model field only, never a Firestore write. This prevents rounding the final nanosecond before midnight into another locked day. Neither midnight nor completion writes a reset or adds a read.

Quick service check: Build. The explicit owner request prevents accidental reuse on the completion day without a new screen, control, step or preference. The current clock/status pattern explains the disabled state. Starting the initial two hours remains two taps, starting the separate four hours remains one tap, and adding/ticking Prep remains one tap from its tab. The real-app motion fixture compares the same prep-row positions/count and header controls through the lockout at 390, 768, 1200 and 1280 px. It adds no list line or overlay. This is a proportional role-based review, not staff research.

Checks cover same-day refusal, the final millisecond before midnight, exact-midnight availability, deadlines crossing midnight, nanosecond rounding, direct controller calls, synthetic clicks, open-menu recovery, refreshing and two signed-in screens. Real rules tests cover all kitchen roles, competing starts and exact request-time boundaries. Publish the stricter same-schema rules after the client; roll back the client independently while retaining the server's day gate.

Local verification passed all seven focused cooling test files, including real Barlow geometry through the managed CA trust, plus 212 cooling emulator checks, 222 private-access checks and 2,187 client calls across nine sign-ins. The old core and stand-in allow the new same-day restart regression; the changed versions refuse it. Full CI, Pages, post-Pages rule publication with its Lock probe and live checks follow the normal release queue.

### Midnight test readiness (9 November 2026)

The midnight motion test used to tap Start as soon as the clock became idle. The separate next-day section read can still be pending then, so the existing sheet guard correctly ignores the tap. This reproduced on unchanged application commit `72d36a0`: three clock-state cases failed while the diagnostic showed `sectionWait: true`, no open overlay and an eligible signed-in person. A repeat on the modal candidate failed a different width.

The test now waits for Ann's seeded tomorrow section to be present in the same local section record that the read updates, then makes its existing Start taps. It retains the section guard, midnight boundary, write counts, manual starts and every previous assertion. No application behaviour, data, reads or rules change. This is a test-only fix with no service council required.

Verification: the unchanged application with the readiness wait passes all 135 cooling-motion assertions at 390, 768, 1200 and 1280 px. The original baseline failed 3 of 126 executed assertions before the wait.
