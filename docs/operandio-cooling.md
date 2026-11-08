# Operandio cooling

Implemented for review on 8 November 2026. Not deployed or enabled. The head chef approved the [compact clock dropdown](operandio-cooling-options/brief.md), then said "lets go". The council verdict was **Build smaller** (5 of 5); the chosen dropdown supersedes its initial recommendation. Closed-app delivery still needs a billing decision and the deployment steps in [functions/README.md](../functions/README.md). The existing [free-plan decision](firestore-usage.md) has not been changed.

## What staff do

Tap the clock in the top bar. The Operandio dropdown is 248 by 155 px in its ordinary ready/running states, with 44 px controls. Anyone with current kitchen PIN access, including View only, can start a stage. Functions-only accounts cannot. The two fixed stages are:

1. Tap Start beside **2 hours**. Its server-confirmed start creates a shared deadline two hours later.
2. At that deadline, staff receive **"Operandio batch cooling time 2 hours is done."** The **4 hours** Start becomes available. A person must tap it; its deadline is four hours after that second tap.
3. At the second deadline, staff receive **"Operandio batch cooling time 4 hours is done."** A new batch can then start a fresh two-hour stage.

Got it dismisses only that person's alert on this device. It does not start a stage or silence another screen. A repeated or simultaneous Start cannot reset a deadline. There is one kitchen batch at a time, always named Operandio.

Start is a filled button; the locked second action is visibly disabled and says After 2 hours. Starting... appears immediately. Started uses the existing green stamp only after the server accepts the request and the matching canonical run arrives. Running and finished values are plain status, not buttons. Errors stay beside the action with Try again. An uncertain request is reconciled under its original ID; it is never silently replayed. A scheduling failure retains the true countdown with an explicit phone-alert warning.

The dropdown and ping use the existing overlay stack, focus trap, Escape/Back, keyboard focus and sheet queue. Pings wait for PIN unlock, typing, Undo and other sheets. In-app sound uses the head chef's existing ping sound. A push opens the fixed `#/cooling` route through the ordinary PIN gate.

## Persistence and closed-app alerts

The browser displays server-established timestamps using `LK_TIME`; it does not own the timer. Reloading, closing a tab or another person starting a stage cannot move a deadline. Local ticks do no database reads.

Personal devices can enable Operandio cooling alerts in Settings. The browser asks for notification permission and registers that device's token separately from supplier reminders. Shared devices show in-app pings while signed in, without retaining a personal background registration. iPhones need the installed home-screen app for web push. Notification permission, connectivity and phone settings determine delivery and sound; no exact-arrival or exactly-once guarantee is made. Foreground devices may show both the in-app ping and the operating-system notification. Stable notification tags reduce duplicates.

Cloud Functions accept immutable start requests transactionally, save a scheduling outbox, and queue Cloud Tasks for each deadline. The backend shares the browser's pure duration/validation source via a generated deployment copy. Dispatch validates current membership and device ownership, retries transient failures, and records successful device deliveries. An opted-in personal device may receive an accepted alert after its daily PIN session expires; a removed person, replaced session owner or reset PIN is excluded. Delivery expires 24 hours after the deadline. See the backend README for retry limits and repair.

## Authority, storage and cost

All paths are below `kitchens/<PIN>`. New client rules are additive and must publish before the client. Existing Prep write capabilities and supplier push permissions are unchanged.

| Path | Authority and use |
| --- | --- |
| `cooling/config` | Named kitchen read; server-only readiness switch. Missing/disabled means setup needed. |
| `cooling/current` | Named kitchen read; server-only canonical run and schedule status. |
| `coolingRequests/<id>` | Active kitchen PIN holder creates one strict immutable request bound to the current anonymous UID and issued session. Only that device/person can read its result. Server alone accepts/rejects. |
| `coolingRuns/<run>` | Server-only run history. |
| `coolingJobs/<run>_<stage>` and device receipts | Server-only scheduling and delivery runtime. |
| `coolingPush/<uid>` | A personal PIN session may register only its own device. Tokens cannot be read by any client, including admin. The anonymous device may delete only its own registration. |

Per authorised session the client reads one readiness document and watches one canonical document, plus its own request result after a Start write is acknowledged. A restored numeric PIN session needs one named session read on its first Start to recover the exact server-issued timestamp; subsequent starts in that session reuse it. No collection scans or countdown reads. Local dismissal markers contain bounded run/stage IDs only, partitioned by kitchen, device and person. Notification metadata stores no token locally. Existing opt-ins refresh at most once per authorised kitchen day/session: one write, no token read. Backend reads/writes scale with starts, deadline dispatches, eligible devices and retries; enabling billing does not replace the existing read budget.

## Backup and kitchen PIN changes

Browser Export includes `coolingCurrent` but no push tokens, requests, jobs or delivery receipts. Nightly recovery includes the current canonical run and bounded recent `coolingRuns`, retaining the active run even when older than the history window. Runtime and tokens are excluded. A recovered deadline is history, not authorisation to recreate jobs or replay alerts. See [backup recovery](backup-recovery.md).

Move PIN checks readiness before any destination write. If cooling is enabled, it stops with instructions to move or disable the notification service first. It also fails closed if that read fails. Blindly copying jobs or registrations would orphan or misroute alerts, so they are never included in the generic move.

Actual app screenshots: [phone ready](operandio-cooling-options/app-phone-ready.png), [phone running](operandio-cooling-options/app-phone-running.png), [tablet](operandio-cooling-options/app-tablet-running.png), [desktop](operandio-cooling-options/app-desktop-ready.png). These use synthetic test data.

## Files and verification

`js/cooling-core.js` is the pure contract, `js/cooling.js` controls requests and listeners, and `js/cooling-ui.js`/`css/cooling.css` render the approved UI. `js/prep.js` supplies session, write, clock, queue and notification adapters; `js/app.js` supplies the chip, Settings and route. All three JS files and the CSS belong to the saved shell in `index.html`, `sw.js` and both `js/upkeep.js` lists. Immutable historical shell manifests stay untouched.

Focused tests cover sequence/duration validation, races and rejected starts, write acknowledgement versus canonical acceptance, PIN locks and ownership changes, stale/offline data, personal dismissal, push payloads and routes, screen sizes and keyboard use. Real rules tests cover all kitchen roles and hostile request/token shapes. Backend unit and Firestore emulator tests cover transactions, outbox retry, dispatch receipts and token changes. CI runs those backend checks separately from the browser and rules suites. Backup recovery tests run the actual exporter and encrypted recovery flow against local emulators.

Before release: complete the full browser and rules checks, approve billing, deploy the backend and additive rules, verify actual personal-device notifications with the app closed and PIN locked, and enable `cooling/config` only after setup succeeds. Keep the application PR draft until those prerequisites are resolved. No live notifications are sent by automated tests.

## Rollback

Disable `cooling/config` first to refuse new starts and dispatches, then roll back the client through the normal saved-shell process. Leave existing canonical/history records for inspection. Stop the dedicated tasks/functions after checking pending work. Do not remove unrelated supplier notification infrastructure. Re-enabling requires reconciling pending jobs and their deadlines; never replay expired alerts automatically.
