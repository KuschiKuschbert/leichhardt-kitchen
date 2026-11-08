# Operandio shared timer: proposed technical contract

Source review and proposed implementation, 8 November 2026. The latest requested placement is a clock dropdown like the chef hat, headed **Operandio**, with the 2-hour and 4-hour rows together. Continuing and sending notifications with the app closed are now part of the requested scope. This note is not a final storage schema or an implemented feature. No cooling backend, queue, permission change or live notification delivery has been deployed or verified. Live project billing has not been checked. The personal timer in draft PR #610 stays unshipped.

## Confirmed sequence

The name is always **Operandio**. Any active kitchen worker can tick to start the first 2 hours. Its deadline produces **“Operandio batch cooling time 2 hours is done.”** The 4-hour row is disabled until that deadline. The next 4 hours start only when someone explicitly ticks **Start 4 hours**. Their deadline produces **“Operandio batch cooling time 4 hours is done.”** A pause between stages makes the total elapsed time longer than six hours. Closing the app must not pause either accepted stage or require a phone to be open when it ends.

| Visible state | How it begins | Next action |
| --- | --- | --- |
| Ready | No active batch | Tick Start 2 hours |
| Starting | The start is being sent | Wait for the server; retain the request |
| 2 hours running | Server confirms the first start | Show the shared deadline and time left |
| 2 hours done, waiting | First deadline passes | Everyone gets the first ping; someone ticks Start 4 hours |
| 4 hours starting | The second start is being sent | Wait for the server |
| 4 hours running | Server confirms the second start | Show its own deadline and time left |
| 4 hours done | Second deadline passes | Everyone gets the second ping; show the completed batch |

Begin with **one active Operandio batch**. This is a scope assumption for these designs, not a confirmed requirement for multiple simultaneous batches. Starting another batch must be explicit and use a new run identifier. Do not reset a running stage with another tick or use a normal Prep completion tick without an explicit cooling action label.

## One shared source of truth

A bounded kitchen-wide current-run record is a suitable candidate. It needs a unique run identity, a revision, the two start times and their actors. Each accepted start establishes its immutable deadline, exactly 2 or 4 hours later. The server can store that deadline or derive it from the immutable start and fixed duration; the client cannot choose or extend it. Final field names and timestamp representation remain implementation choices.

The server must enforce one valid transition from the current revision and establish the start time itself. Stage two is allowed only after the first deadline and a separate authorised request, never automatically. Clients use `LK_TIME` for comparisons and Queensland display. A browser's countdown repaint never writes to the database, and crossing a deadline never requires a phone to write an expiry event. A saved deadline keeps the timer correct after closing or restarting the app; a scheduled server sender is separately needed to notify closed devices.

Two simultaneous ticks must yield one accepted start. The other client reads the accepted state and shows who started it. Each request retains its identity until its result is known; a timeout cannot create a second run. Never claim “Started for everyone” from a pending snapshot or offline cache. Existing `W()` acknowledgement, failure and unsent-work guards still apply.

## Reuse the ping presentation, keep the permission narrow

The current ping code already provides `noteOpen()`, the standard sheet, `sheetBusy()`/`sheetNext()`, personal Got it and `noteChime()` using the head chef's chosen sound. Reuse those behaviours or extract a common presentation helper. Do not give every worker the general ping editor or broaden `notes` and `directnotes` writes.

Create a narrowly validated cooling action for active, authenticated kitchen workers, including the requested staff-side starts. Keep public, expired, removed and functions-only accounts outside private kitchen access. Roles that cannot add or tick ordinary Prep still need separate checks for this requested cooling action; do not borrow a broader write capability.

“Everyone” must not silently lose people through the ordinary pings visibility switch or the shared-tablet filter that currently admits only urgent ping types. Define a dedicated cooling audience and delivery policy while keeping other ping permissions unchanged. Test this policy for every current kitchen role before release.

## Personal acknowledgement and shared progress

Key each stage's alert by run identity and stage. **Got it closes that person's alert only**. It does not start the next stage, silence anyone else, change the shared timer or record a temperature check. **Start 4 hours** is a separate shared action. A worker who arrives after another person starts stage two should see that stage's current state; any retained first-stage message must say it is already underway and cannot offer a stale start button.

Ordinary pings have a 30-minute display lifetime in `todaysNotes()` and `noteRefresh()`. A waiting cooling stage must not disappear just because that window elapsed. Keep the shared status until the explicit next transition. Preserve relevant unseen stage messages without a repeated alarm on every render. Cross-device read receipts, completed-run retention and cancellation authority need a deliberate implementation choice; do not add them implicitly to the mockups.

## Delivery with the app open or closed

The existing daily/30-minute ping refresh is not sufficient to discover shared starts promptly. A candidate is one bounded subscription to the current cooling run, only while authorised. This is live service data, not polling all pings. Derive deadlines locally from the received canonical times. Reconcile on visibility, reconnect and sign-in.

A signed-in, visible app queues the ping behind typing, login, another sheet and live Undo, then uses the kitchen's ping sound once. A late or suspended app should show “Time reached” with its actual deadline, not suggest the alarm fired on time. Reconcile foreground alerts and push events by the same run and stage identity so receiving both does not repeat the in-app alarm.

The existing Firebase Cloud Messaging registration, token renewal/removal and `sw.js` push handler can be reused. The worker already displays an OS notification without an open app window. Its click handler currently routes to supplier orders; add a validated cooling message type and a fixed local destination that opens the Operandio dropdown after the normal access checks. Never follow an arbitrary URL from a push.

The current implementation is chef-only in three places: `pushWhoId()`, `firestore.rules` push registration and the sender's current-chef filter. Add an explicit cooling subscription for every eligible kitchen worker's device, with narrow registration/removal rules and current membership checks. Keep push addresses unreadable to clients. Preserve supplier reminder preferences and their chef audience separately. “Everyone” means all eligible workers in the shared in-app audience; closed-app delivery additionally needs that person's device to support and allow push.

### Recommended server path

Use Firebase task queue functions backed by Google Cloud Tasks, with one scheduled deadline job per accepted stage. This avoids relying on a browser timer or a frequently polled kitchen collection.

1. Submit a uniquely identified start request through the existing `W()` session and unsent-work contract, with a narrowly validated cooling action. A request acknowledgement means the request was stored, not that a shared timer has started. A server handler validates the current device session, kitchen membership and expected run revision, then transactionally accepts one start and establishes its canonical time and deadline. The private backend uses its service identity; clients gain no privileged write path.
2. Persist a scheduling intent with that accepted transition. An event-driven dispatcher enqueues the deadline job and records scheduling progress, with retries enabled. Firestore commits and task creation are separate operations: a crash between them must leave recoverable pending work, not an accepted timer with no alarm job. Use the run/stage identity to make repeated dispatch attempts safe. Keep a bounded repair path for failed scheduling and expose that failure rather than claiming alerts are ready.
3. At the scheduled time, re-read the canonical run and stage event, reject invalid or superseded jobs, and check current kitchen membership and device subscriptions. Send the fixed Operandio text through FCM. A delayed first-stage alert must reflect an already-started second stage and must not offer a stale start action.
4. Track each device's FCM submission result separately. Retry transient failures with bounded backoff, remove invalid tokens and retain unresolved failures for operational inspection. The current cut-off job marks a stage sent once any phone succeeds; that would lose retries for other phones and must not be copied. FCM acceptance is not proof that a person saw or heard the notification. Delivery bookkeeping is separate from personal Got it.

Task execution and network retries can repeat. Stable run/stage notification tags and delivery records limit duplicates, but a crash after FCM accepts a message and before its result is saved prevents an exactly-once delivery promise. Set a deliberate useful delivery window and retain missed-stage state for the next authorised open, instead of using the ordinary 30-minute ping expiry.

The existing `cutoff-push.yml` job runs every 10 minutes on GitHub, can start late or miss runs, and public-repository schedules can be disabled after 60 days without activity. It is useful reference code for FCM sending and dead-token cleanup, not a timely cooling scheduler. The current read-budget note also records missed cut-off runs. Do not present the documented “about 15 minutes” delay as a guaranteed maximum.

### Phone setup and delivery limits

Each personal device needs an explicit **Turn on cooling alerts** action and notification permission. Show whether that device is ready, unsupported or blocked; starting a shared stage must not falsely imply every device is enrolled. Supported browsers need HTTPS, the service worker and Push API support. On iPhone and iPad, Web Push requires iOS/iPadOS 16.4 or later and a web app added to the Home Screen, with permission requested from a direct user action. A normal Safari tab is not sufficient.

The server deadline remains valid when every app is closed. A server job can submit the alert without any of those apps running. Exact receipt and sound still depend on connectivity, browser/OS delivery, notification permission, Focus/silent settings and device power state. The existing Web Audio kitchen chime is foreground-only; closed-app alerts use the OS notification sound. Do not promise the chosen in-app chime or an alarm that bypasses the phone's settings.

## Lock and recovery

A shared tablet clears the previous person's private view on handover. An active run survives midnight and the 04:00 authentication lock; access and listeners pause while locked, then the newly authorised person sees the latest shared state. Do not retain private timer records in persistent browser storage to bypass that lock. Offline reads show when the state is stale, and an unsent start stays visibly unconfirmed.

A personal device's explicit cooling subscription may outlast its daily app lock, so closed-app delivery does not require an open PIN session at dispatch. It does not grant private reads or starting rights: those still need a current session. Dispatch checks current membership and subscription ownership independently. Shared screens must not silently retain a departed person's notification subscription on handover. Resolve device binding and revocation before release, and require the normal PIN screen when a notification opens locked kitchen content.

## Backend setup boundary

This repository currently contains a static GitHub Pages app and scheduled Admin SDK scripts, not a deployed cooling task queue. The proposed Firebase Functions deployment requires a Blaze billing plan, enabled Functions/Cloud Tasks and related deployment APIs, a configured queue and region, restricted service-account permissions, retry settings and failure monitoring. FCM registration also requires the Firebase Installations and FCM Registration APIs to be allowed by the browser key restrictions, and FCM HTTP v1 to be enabled. Credentials remain in the existing secret-management channels, never the public repository or browser.

The recorded head-chef decision in [Firestore usage](../firestore-usage.md) is to stay on the free plan, with pay as you go later on the head chef's word. This proposal does not change that decision or verify the live project's plan. Billing enablement and backend deployment remain a separate setup decision before this delivery path can ship. Budget alerts warn rather than cap spending. No billing change, cloud resource or live push is part of these design previews.

## Cost and evidence still needed

For a one-record subscription, estimate one current-record read per authorised attachment, plus one per delivered record change, with reconnects and rule lookups adding cost. A normal run has two accepted starts, with request, canonical-state and scheduling writes for each. Task dispatch adds bounded run/config reads, one audience query and delivery bookkeeping; retries, an explicit new run and optional receipts add their own operations. Batch audience reads instead of a per-person query loop. There are no per-second writes or client polling. Functions and task usage must be included in the deployment estimate. These are planning estimates, not measured bills.

Before implementation ships: test simultaneous starts, stale second-stage actions, both deadlines, personal acknowledgement, long suspension, midnight and 04:00, role removal, shared handover, offline/uncertain saves, malformed records and clock correction. Add scheduling-failure recovery, duplicate task execution, partial FCM failure, invalid tokens, permission denial and a late first alert after stage two has started. Verify closed-app delivery on supported real devices, including an installed iPhone app, separately from emulator and source review. Measure the actual read budget, prove rules on the emulator, publish compatible additive rules before dependent clients, and verify the live lock separately. Extend backup and kitchen-PIN migration only after the final record contract is settled.

Sources: [ping recipients](../ping-recipients.md), [ping sound](../ping-sound.md), [code contracts](../code-contracts.md), [private access](../private-kitchen-access.md), [device sessions](../device-sessions.md), [Firestore usage](../firestore-usage.md), [order cut-off pushes](../prep-book.md); `js/prep.js` ping, writer, sheet and push helpers; `firestore.rules` current note, session and push boundaries; `sw.js`; `scripts/cutoff-push.mjs`; `.github/workflows/cutoff-push.yml`.

Official platform references, checked 8 November 2026: [Firebase task queue functions](https://firebase.google.com/docs/functions/task-functions) (scheduled execution, retries and queue configuration), [Firebase Functions setup](https://firebase.google.com/docs/functions/get-started) (Blaze deployment requirement), and [WebKit: Web Push for web apps on iOS and iPadOS](https://webkit.org/blog/13966/web-push-for-web-apps-on-ios-and-ipados/) (Home Screen, OS version and permission requirements).
