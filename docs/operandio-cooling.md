# Operandio cooling

The head chef selected **B, filling desktop clock face**, with a fixed mobile ring, on 9 November 2026. On 10 November the owner approved shared confirmation and quiet reminders, then a daily **10:00 to 21:00 Queensland** operating window. At 21:00 the batch expires even if unfinished; the visible clock stays inert overnight and returns to unarmed idle at 10:00. Each stage has one device presentation and a separate **I’ve recorded this in Operandio** action during its active window. This records a staff declaration in Kitchen Book; it does not connect to or verify the external Operandio app. [Clock design](operandio-clock-motion-options/brief.md), [daily window](#daily-window-10-november-2026), [confirmation decision and checks](#shared-confirmation-10-november-2026).

## What staff do

Anyone with current kitchen PIN access, including View only, can start a stage and confirm its Operandio entry. Functions-only accounts cannot. The two fixed stages are:

1. Between 10:00 and 21:00, tap the idle clock. On desktop it smoothly expands to **Start · Operandio · 2 h**; on mobile it remains a 44px circle and shows an orange play icon. Tap Start or play to begin two hours. Availability at 10:00 never arms or starts it automatically.
2. Once the server confirms the start, desktop shows the countdown in the pill with a filling clock face. Mobile keeps the same small clock with a filling perimeter ring. Running timers show status; an outstanding recording check remains accessible through the same clock.
3. At two hours each logged-in open device can show the two-hour ping once. The ping asks staff to record the check in Operandio. After doing that in the external app, tap **I’ve recorded this in Operandio**. Once the server accepts it, this stage’s reminder closes on every connected screen and stays cleared on later logins. Four hours still waits for a separate explicit Start. Its deadline is four hours after that start; neither recording nor dismissing the first check starts it.
4. At the second deadline, if still before 21:00, the device can show the four-hour ping once. Confirm that check separately after entering it in Operandio. There is one batch per daily window, even when both stages finish early. Outstanding checks remain accessible until 21:00; a completed batch cannot restart that day.
5. At 21:00 all current-batch countdowns, outstanding prompts, queued pings and remaining chimes stop, including an unfinished stage. The clock remains visible, neutral and inert until 10:00. Desktop says **Back at 10:00**; the fixed mobile ring has an equivalent accessible description. At 10:00 the clock returns to idle and a new batch requires the usual two manual taps. Previous checks do not reappear.

**Not yet**, ×, swipe, backdrop, Escape and Back close the ping and stop its remaining chimes on this device without confirming work. A quiet outstanding state remains on the existing clock until 21:00. Showing a stage is remembered for the device, so another login, page change or reload does not keep opening it. Use the clock to return to an active check. This replaces personal **Got it** dismissal. Repeated or simultaneous starts cannot reset a deadline. There is one kitchen batch per daily window, always named Operandio. Daily expiry is not a recording confirmation and never claims that staff entered anything in Operandio.

Pending feedback appears immediately in the same control. A countdown or confirmed success never appears from a local estimate or an unresolved write. Named failures persist with an explicit retry while the batch is active; uncertain writes are reconciled against the shared record and never silently replayed. The compact details menu remains available during operating hours through `#/cooling`, existing API calls and error detail. Direct routes and synthetic clicks cannot open it overnight. Pings and details retain the existing overlay stack, focus trap, Escape/Back and sheet queue. Pings wait for PIN unlock, typing, Undo and other sheets, and expire with the batch at 21:00.

The desktop pill starts at 1280px and reserves its space so neighbouring controls and the list do not move. Narrower windows use the same fixed ring as mobile, keeping all six page tabs and the Today's team, bell and chef controls in place. Mobile never expands or hides the brand. All action targets remain at least 44px, and reduced motion removes the expansion and gentle settle. Countdown updates are not live announcements; stage changes are announced separately.

Each Operandio alert uses three stronger soft chimes, 1.65 seconds apart, through the existing audio limiter. The kitchen's sound Off setting still silences it. Other pings retain their selected single sound. Closing the cooling ping, locking or changing the session, hiding the app or leaving the page cancels remaining cooling notes. There is no new preference or permission. Device volume, silent mode and browser gesture restrictions still apply.

## Persistence and delivery

Firestore stores server-issued start timestamps. The client derives the fixed deadlines and the daily window with the existing kitchen clock, `LK_TIME`. Reloading or closing the app does not pause an accepted stage. Reopening after sign-in shows its remaining or elapsed time only while the batch belongs to the current open window. A late start still expires at 21:00, even if its two-hour or four-hour deadline would fall later. The second stage never starts itself.

Each authorised app subscribes to the current timer and its separate recording-confirmation record, and checks deadlines locally. Countdown ticks, 21:00 expiry and 10:00 availability make no database reads or writes. Closed apps send no notifications. A sleeping, suspended or disconnected screen may show a late ping when it resumes and reconciles within that batch’s open window; delivery is not guaranteed at the exact second. A locked device must unlock first. Unconfirmed checks belong to the active batch only. A recording confirmation suppresses its exact run/stage on all devices; a queued ping is checked again before opening. At 21:00 both raw records remain stored, but neither can revive a timer or reminder overnight or at 10:00. The next manual batch replaces the timer; the old confirmation record can remain until someone records a check for the new batch, but its run ID cannot confirm the new one. Local presentation markers require browser storage; clearing that storage can show an active unconfirmed stage again, but cannot undo a shared confirmation or revive an expired batch.

## Authority, storage and cost

The timer document remains `kitchens/<PIN>/cooling/current`:

```
{v: 1, run, rev, windowAt, firstAt, firstBy, secondAt, secondBy, by}
```

`firstAt` and a started `secondAt` are Firestore Timestamps. Before stage two, `secondAt` is `0` and `secondBy` is empty. A unique run ID identifies the batch; the revision increases once for each accepted start. New first starts include the immutable integer `windowAt`, the selected window’s 10:00 Queensland opening in epoch milliseconds. Rules require it to match the server’s current window, so an offline Start submitted yesterday cannot become today’s batch when its server timestamp resolves. Legacy records without this field remain readable and can finish their second stage within their original open window; stage-two writes preserve the existing field or its absence. The client never supplies an authoritative deadline.

All writes use `W()` and the original recorder's session. First/new-batch Start sets the canonical document with the window captured for that manual action. Second Start updates only its revision, second start and writer fields, preserving the exact first Timestamp and window stamp. Rules require an active kitchen session, matching writer, strict fields, next revision, allowed sequence and a start equal to server request time. The server permits starts only from 10:00 inclusive to 21:00 exclusive, Queensland time. It rejects a second batch in the same daily window and permits replacing a prior-window batch even if unfinished. Stage two requires the current window’s batch and its elapsed first deadline. Refreshes, another phone and an old client cannot bypass those checks. No client may delete the record or list cooling documents. Existing Prep and general ping write capabilities are unchanged.

Shared confirmations use the separate bounded document `kitchens/<PIN>/cooling/recorded`:

```
{v: 1, run, firstAt, firstBy, secondAt, secondBy, by}
```

Here the two timestamp/actor pairs mean **recorded in Operandio**, not timer starts. An unconfirmed pair is `0` and `''`. Each confirmed pair uses server time and the current recorder. Rules require the exact current run, an elapsed stage and the same open daily window at server request time; same-run updates can add one missing pair and must preserve every accepted confirmation. They cannot change the timer. Each new run replaces this document only when its first confirmation is accepted. Expiry never fills in a missing pair. The confirmation shape is unchanged. Older timer parsers ignore the additive window stamp, but older clients need **Update** for fresh starts and the new daily display because every new first start now requires that stamp.

The daily-window rules must be published **before** the dependent client, with the normal foundation verification and live Lock probe. This is a mixed rule change with an additive timer-field dependency: it requires a matching `windowAt` on new first starts, tightens starts and confirmations to operating hours, and permits replacing an unfinished prior-window timer. Publishing first blocks old clients and queued writes from recording after 21:00 or silently starting a new batch on another day. Each authorised app retains two named live document subscriptions. Shared confirmation adds one read on subscribe and for each accepted confirmation, subject to Firestore’s reconnect billing; the daily window adds none. Confirmation rules already read the current timer to check its run and deadline, and now also check the window using server request time. There are no reset writes, request documents, scheduling jobs, delivery scans or token registrations. Bounded local presentation markers contain run/stage IDs only, partitioned by kitchen and device. Existing personal dismissal IDs are retained when available; they are never interpreted as shared confirmation.

## Backup and kitchen PIN changes

Browser Export and the nightly backup include `coolingCurrent` and `coolingRecorded`, preserving each record’s run, actors, exact Timestamp components and the new timer’s integer `windowAt` field. Legacy unstamped records remain recoverable without inventing a stamp. There is no separate run history or scheduled work. A restored current run can show elapsed alerts only within its own open daily window and for stages without a matching restored confirmation. The daily window adds no backup section or export query. See [backup recovery](backup-recovery.md).

Move PIN checks the current timer before collecting the copy and again before the first destination write. An active unfinished or unreadable batch stops the move. A logically expired batch does not block it, even when its retained raw record is unfinished. Completed and expired timer/confirmation records remain under the old PIN and in backups; the new kitchen can start a fresh batch during the 10:00 to 21:00 window. As with the existing multi-step kitchen copy, coordinate the move while nobody is adding work or starting a new batch; the copy does not freeze other devices.

Original dropdown release screenshots: [phone ready](operandio-cooling-options/app-phone-ready.png), [phone running](operandio-cooling-options/app-phone-running.png), [tablet](operandio-cooling-options/app-tablet-running.png), [desktop](operandio-cooling-options/app-desktop-ready.png). These use synthetic data.

## Files and verification

`js/cooling-core.js` validates and derives timing, `js/cooling.js` manages both shared subscriptions and their writes, and `js/cooling-ui.js`/`css/cooling.css` render the approved UI. `js/prep.js` supplies session, write, clock and sheet adapters; `js/app.js` supplies the chip and route. All three JS files and the CSS belong to the saved shell in `index.html`, `sw.js` and both `js/upkeep.js` lists. Historical shell manifests remain unchanged.

Verification covers stage sequence, simultaneous starts, server acknowledgement, stale/offline state, locks, device presentation suppression, shared confirmation, two screens receiving the same deadline, reload recovery, screen sizes and keyboard use. Real Firestore emulator checks cover roles, strict write shapes and competing starts. Backup recovery runs the actual exporter and encrypted recovery flow against local emulators. No automated check sends a live kitchen ping.

Original timer verification passed: 11 core groups, 24 controller checks, 55 integration checks, 66 UI checks and 117 real-font header/team checks. Real emulator checks passed for 192 cooling cases and all 1,971 client calls across nine sign-ins after merging Cleaning. Combined backup recovery round-tripped 63 documents. The sheet-queue and uncertain-write conflict regressions fail on their earlier implementations.

The original timer release used additive rules published before its client. The pill, ring and chime release used those unchanged rules and needed no database deployment, configuration switch or background service. The historical midnight lockout kept that schema; the current daily window adds the immutable `windowAt` field to new first starts. Presentation history is recorded in the [motion brief](operandio-clock-motion-options/brief.md).

## Rollback

Revert the client through the normal saved-shell process while retaining both cooling records and the server’s daily-window restrictions. Older clients may show the former midnight schedule or personal alerts until **Update**, and cannot start a fresh batch without the required window stamp. The server still refuses out-of-window writes; a rollback must not remove that protection. Reverting never erases recorded confirmations or claims that an expired check was completed. Ordinary shift pings and supplier reminders are unchanged. Re-enabling reads the stored times and current window; it never restarts a stage automatically.

## Daily window, 10 November 2026

The owner approved a 21:00 Queensland reset even when the batch is unfinished, an inert clock overnight, and a return to manual availability at 10:00. This replaces the earlier midnight restart gate. Logical expiry derives from the existing start timestamps and kitchen clock. New starts add one immutable window stamp to prevent delayed writes crossing into another day, without a reset job or extra query.

| Queensland time | Behaviour |
| --- | --- |
| Before 10:00 | Visible neutral clock, **Back at 10:00** on desktop, no action, menu, ping or chime. |
| 10:00 | Idle and unarmed. Old raw records remain stored; old deadlines and confirmations cannot revive the batch. |
| 10:00 to before 21:00 | One manually started batch, separate manual two-hour/four-hour stages and independent shared recording confirmations. Completing it early does not permit another batch. |
| 21:00 | Expire the current batch and close its details/pings, cancel queued pings and remaining chimes, and disarm any prepared Start. No reset write and no inferred recording confirmation. |

`LK_COOLING.windowAt()` derives the Queensland bounds and `active()` checks whether the canonical batch belongs to the current open window. The controller exposes the active batch as `model.run` and retains the canonical record separately as `model.rawRun` for revision/conflict checks. Every action is checked again before its write; Firestore independently checks its own request time and the new start’s captured `windowAt`. Pending or late responses cannot re-arm yesterday’s batch. A fresh manual start advances the existing revision and replaces the old timer, including an unfinished one.

Adversarial review identified a cross-day queued-write failure: a first Start tapped at 20:59 could resolve its server timestamp after 10:00 the following day and silently begin a batch without a new tap. Time-of-arrival checks alone cannot distinguish that old intent. The required immutable `windowAt` binds a new start to the day selected by the manual action; rules reject it after that window. Independent review verified this repair, exact fractional-Timestamp membership at 10:00/21:00, protected uncertain writes and late confirmations that never restore an expired timer. No concrete blocker remained in that review; broader test and release gates remain separate.

### Quick service check and verification

**Verdict: Build.** The owner selected the schedule for an existing control. This refinement adds no page, top-bar button, popup or setting and preserves the chosen desktop expansion and mobile fixed ring. Flighty’s real availability supports showing only an actionable daily window; Headspace’s calm words support **Back at 10:00**; Linear’s stable frame supports keeping the clock and neighbouring controls in place. The overnight state uses neutral status, with no amber outstanding claim or green recorded claim. Existing shared surfaces, written state, accessible names, accepted-write feedback and reduced-motion contracts apply. This is a proportional role-based quick check, not new staff research or a new council vote. No further design choice is needed for the schedule the owner selected.

Focused verification passed 20 core groups, 54 controller checks, 130 UI checks and 187 real-font motion checks. Browser integration passed 41 daily-window, 58 timer-flow, 48 shared-confirmation and 47 PIN-move checks. All 171 stand-in authority checks passed, alongside the top-bar, read-budget and design-pattern regressions. Coverage includes the final instant before 21:00, exact 21:00 and 10:00, late and unfinished stages, early completion, midnight/04:00 as separate non-opening boundaries, sleeping/reloaded screens, queued pings, pending/failed writes, direct routes, synthetic clicks, competing devices and manual next-day revision increments. New regressions failed on the previous source. The complete real Firestore/Auth rules suite passed, including 1,389 cooling checks and 263 client-shape rows exercising 2,367 calls across nine sign-ins. The broader release gate remains separate; counts in later historical sections belong to earlier releases.

Implemented-app measurement compared source baseline `7f85629` with the new idle and overnight states using the same complete Prep fixture and verified Barlow font assets at 390, 768 and 1280 px. Every measured header, neighbouring control, tab and row rectangle stayed identical. There were 5 fully unobscured Prep rows on phone and 6 on tablet/desktop before and after; the phone’s sixth row remains behind the pre-existing Add dock. Header heights stayed 64, 96 and 96 px; clock dimensions stayed 44 × 44, 44 × 44 and 152 × 44 px. **Add a line** opened its full form in one tap before and after. Neutral overnight text/icon contrast measured 13.53:1. Desktop keeps its 340 ms active width transition and the complete **Back at 10:00** label fits; mobile stays fixed. Reduced motion measures 0 s/no animation. Overnight mouse, touch and keyboard attempts produce no write or overlay. These are actual full-app measurements, separate from the earlier preview and stand-in-font evidence below. See [phone overnight](operandio-daily-window/phone-night.png), [tablet overnight](operandio-daily-window/tablet-night.png), [desktop overnight](operandio-daily-window/desktop-night.png) and [paired measurements](operandio-daily-window/geometry.json).

Daily-window backup validation passed all 52 admin-tools browser checks, including export of the exact `windowAt` alongside the unchanged raw starts and recording declarations. The isolated real Firestore-emulator rehearsal exported, encrypted/decrypted and round-tripped 69 included documents. It retained the new window stamp, precise timestamps and unstamped legacy records, and checked that expired restored batches cannot revive timers or pings at the next 10:00. These checks use synthetic data, with no production kitchen write or external Operandio request.

Publish and verify the mixed rules before releasing the client through the normal queue, then verify Pages, the live Lock probe and live click tests. Existing records require no migration; new starts require the additive window stamp. There is no reset write, background job, additional listener or query. Existing clients need **Update** for fresh starts, the new display and logical expiry.

## Shared confirmation, 10 November 2026

This section records the earlier shared-confirmation release. Its midnight restart policy was subsequently replaced by the daily window above; its measurements and counts remain evidence for that earlier change.

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

The leading checks for that release were two devices confirming together, closing/reloading before acknowledgement, a session handover during a write, confirmation arriving while a ping is queued, a stale record for a replaced batch, and both midnight and 04:00 unlock. Client fixtures establish interaction behaviour; real rules-emulator checks establish server enforcement. No verification sends a production kitchen ping or writes to Operandio.

### Release order and validation

Implemented screens with synthetic data and actual Barlow fonts: [phone ping](operandio-confirmation/phone-ping.png), [tablet details](operandio-confirmation/tablet-details.png), [desktop ping](operandio-confirmation/desktop-ping.png).

Local verification passed 15 core groups, 43 controller checks, 118 UI checks, 143 motion checks, 58 timer integration checks, 48 shared-confirmation integration checks and the unchanged 27 read-budget checks. The full Firestore/Auth rules suite passed, including 361 cooling checks, 2,358 client calls across nine sign-ins and 222 private-access checks. The confirmation regressions failed on the former implementation before the changes. Independent review reproduced and verified repairs for legacy dismissal handover and reopening an uncertain confirmation after closing it. Rendered affected text contrast is 4.76:1 or better; saving, failure, keyboard focus and reduced motion were exercised. These are synthetic client/emulator checks, not production kitchen writes.

That release required publishing the additive recorded-document rules before the client, followed by Pages, the live Lock probe and live click tests. It left the timer and accepted deadlines unchanged, without a migration, schedule or external service. Local backup verification passed: all 52 admin-tools browser checks, including exact confirmation export, explicit null for missing records and a named omission when confirmation reads are refused. The isolated real Firestore-emulator rehearsal ran the nightly exporter, encrypted/decrypted its output and round-tripped 69 included documents. It preserved exact confirmation timestamps, different recording actors, an unconfirmed pair and a previous-batch record. These checks use synthetic data and do not establish production deployment or a successful scheduled backup.

## Daily lockout, 9 November 2026

Historical policy, superseded by the [10 November daily window](#daily-window-10-november-2026). The owner originally requested that the timer be disabled after four hours ran out until 00:00 Queensland time after the second deadline, independent of the device privacy unlock at 04:00. Incomplete stages previously retained their deadlines across midnight. The former `restartAt` display field derived that gate from the saved second start's exact seconds, without a reset write or extra read. It is no longer the current restart rule.

Quick service check: Build. The explicit owner request prevents accidental reuse on the completion day without a new screen, control, step or preference. The current clock/status pattern explains the disabled state. Starting the initial two hours remains two taps, starting the separate four hours remains one tap, and adding/ticking Prep remains one tap from its tab. The real-app motion fixture compares the same prep-row positions/count and header controls through the lockout at 390, 768, 1200 and 1280 px. It adds no list line or overlay. This is a proportional role-based review, not staff research.

That release’s checks covered same-day refusal, the final millisecond before midnight, exact-midnight availability, deadlines crossing midnight, nanosecond rounding, direct controller calls, synthetic clicks, open-menu recovery, refreshing and two signed-in screens. Real rules tests covered all kitchen roles, competing starts and exact request-time boundaries. Its client-before-rules release order is historical; the current daily-window rules must precede the client.

Local verification passed all seven focused cooling test files, including real Barlow geometry through the managed CA trust, plus 212 cooling emulator checks, 222 private-access checks and 2,187 client calls across nine sign-ins. The old core and stand-in allow the new same-day restart regression; the changed versions refuse it. Full CI, Pages, post-Pages rule publication with its Lock probe and live checks follow the normal release queue.

### Midnight test readiness (9 November 2026)

The midnight motion test used to tap Start as soon as the clock became idle. The separate next-day section read can still be pending then, so the existing sheet guard correctly ignores the tap. This reproduced on unchanged application commit `72d36a0`: three clock-state cases failed while the diagnostic showed `sectionWait: true`, no open overlay and an eligible signed-in person. A repeat on the modal candidate failed a different width.

The test now waits for Ann's seeded tomorrow section to be present in the same local section record that the read updates, then makes its existing Start taps. It retains the section guard, midnight boundary, write counts, manual starts and every previous assertion. No application behaviour, data, reads or rules change. This is a test-only fix with no service council required.

Verification: the unchanged application with the readiness wait passes all 135 cooling-motion assertions at 390, 768, 1200 and 1280 px. The original baseline failed 3 of 126 executed assertions before the wait.
