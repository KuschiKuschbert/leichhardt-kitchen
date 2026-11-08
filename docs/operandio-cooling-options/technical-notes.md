# Operandio shared timer: proposed technical contract

Source review only, 8 November 2026. This note proposes behaviour for the design comparison, not a final storage schema or an implemented feature. The personal timer in draft PR #610 stays unshipped while the shared design is considered.

## Confirmed sequence

The name is always **Operandio**. Any active kitchen worker can tick to start the first 2 hours. Its deadline produces the first ping. The next 4 hours start only when someone explicitly ticks **Start 4 hours**. Their deadline produces the second ping. A pause between stages makes the total elapsed time longer than six hours.

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

A bounded kitchen-wide current-run record is a suitable candidate. It needs a unique run identity, a revision, the two start times and their actors. Fixed durations can be derived from those starts, keeping the saved shape small. Final field names and timestamp representation remain implementation choices.

The server must enforce one valid transition from the current revision and prevent changes to a previously accepted start. Prefer server-established start times; any millisecond representation must have equivalent server validation. Stage two is allowed only after the first deadline. Clients use `LK_TIME` for comparisons and Queensland display. A browser's countdown repaint never writes to the database, and crossing a deadline need not require a phone to write an expiry event.

Two simultaneous ticks must yield one accepted start. The other client reads the accepted state and shows who started it. Each request retains its identity until its result is known; a timeout cannot create a second run. Never claim “Started for everyone” from a pending snapshot or offline cache. Existing `W()` acknowledgement, failure and unsent-work guards still apply.

## Reuse the ping presentation, keep the permission narrow

The current ping code already provides `noteOpen()`, the standard sheet, `sheetBusy()`/`sheetNext()`, personal Got it and `noteChime()` using the head chef's chosen sound. Reuse those behaviours or extract a common presentation helper. Do not give every worker the general ping editor or broaden `notes` and `directnotes` writes.

Create a narrowly validated cooling action for active, authenticated kitchen workers, including the requested staff-side starts. Keep public, expired, removed and functions-only accounts outside private kitchen access. Roles that cannot add or tick ordinary Prep still need separate checks for this requested cooling action; do not borrow a broader write capability.

“Everyone” must not silently lose people through the ordinary pings visibility switch or the shared-tablet filter that currently admits only urgent ping types. Define a dedicated cooling audience and delivery policy while keeping other ping permissions unchanged. Test this policy for every current kitchen role before release.

## Personal acknowledgement and shared progress

Key each stage's alert by run identity and stage. **Got it closes that person's alert only**. It does not start the next stage, silence anyone else, change the shared timer or record a temperature check. **Start 4 hours** is a separate shared action. A worker who arrives after another person starts stage two should see that stage's current state; any retained first-stage message must say it is already underway and cannot offer a stale start button.

Ordinary pings have a 30-minute display lifetime in `todaysNotes()` and `noteRefresh()`. A waiting cooling stage must not disappear just because that window elapsed. Keep the shared status until the explicit next transition. Preserve relevant unseen stage messages without a repeated alarm on every render. Cross-device read receipts, completed-run retention and cancellation authority need a deliberate implementation choice; do not add them implicitly to the mockups.

## Delivery, lock and recovery

The existing daily/30-minute ping refresh is not sufficient to discover shared starts promptly. A candidate is one bounded subscription to the current cooling run, only while authorised. This is live service data, not polling all pings. Derive deadlines locally from the received canonical times. Reconcile on visibility, reconnect and sign-in.

A signed-in, visible app queues the ping behind typing, login, another sheet and live Undo, then uses the kitchen's ping sound once. A late or suspended app should show “Time reached” with its actual deadline, not suggest the alarm fired on time. Closed apps, sleeping devices and disabled sound are not guaranteed by this approach. Lock-screen push delivery would be a separate capability; the current cut-off push job is chef-targeted and is not a precise cooling scheduler.

A shared tablet clears the previous person's private view on handover. An active run survives midnight and the 04:00 authentication lock; access and listeners pause while locked, then the newly authorised person sees the latest shared state. Do not retain private timer records in persistent browser storage to bypass that lock. Offline reads show when the state is stale, and an unsent start stays visibly unconfirmed.

## Cost and evidence still needed

For a one-record subscription, estimate one current-record read per authorised attachment, plus one per delivered record change, with reconnects and rule lookups adding cost. A normal run needs two successful start writes; an explicit new run and optional receipts add their own writes. There are no per-second writes or per-person query loops. These are planning estimates, not measured bills.

Before implementation ships: test simultaneous starts, stale second-stage actions, both deadlines, personal acknowledgement, long suspension, midnight and 04:00, role removal, shared handover, offline/uncertain saves, malformed records and clock correction. Measure the actual read budget, prove rules on the emulator, publish compatible additive rules before dependent clients, and verify the live lock separately. Extend backup and kitchen-PIN migration only after the final record contract is settled.

Sources: [ping recipients](../ping-recipients.md), [ping sound](../ping-sound.md), [code contracts](../code-contracts.md), [private access](../private-kitchen-access.md), [device sessions](../device-sessions.md); `js/prep.js` ping, writer and sheet helpers; `firestore.rules` current note and session boundaries.
