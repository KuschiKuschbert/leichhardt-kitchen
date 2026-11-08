# Operandio cooling pings: chosen clock dropdown

Design preview, 8 November 2026. The owner chose a compact clock dropdown like the chef hat, showing both timers, and asked for it to keep running with the app closed. The chosen design is now implemented for review; see [the implementation contract](../operandio-cooling.md). It has not been deployed or enabled. The earlier device-local timer remains draft PR #610.

## Confirmed behaviour

The owner asks for a timer like a shift ping, which everyone can start. The name is always **Operandio**. The first tick starts **2 hours**. When that time ends, everyone receives **“Operandio batch cooling time 2 hours is done.”** Someone must then tick **Start 4 hours**. That starts a further **4 hours from the second tick**, followed by **“Operandio batch cooling time 4 hours is done.”** The second timer does not start automatically and is not measured from the first tick.

The mock example starts at 14:00, pings at 16:00, waits until someone ticks at 16:10, and pings again at 20:10. Got it closes only that person's message. It does not start another stage or silence anyone else. A duplicate start cannot reset a shared deadline.

[Try the chosen dropdown](index.html). The stage buttons show the disabled second Start button, both countdowns, the enabled second stage and both pings. No messages are sent, no account is used and no real timer runs. [Original three options](comparison.html) remain as the review record.

## Chosen refinement

The owner's next request selects a clock dropdown in the chef hat's style. This supersedes the council's recommendation of C below. It uses the chef hat's cream panel, charcoal border and compact rows, anchored below the clock at phone, tablet and desktop widths. The existing chef hat itself becomes a bottom sheet on phones; this two-row preview stays a dropdown, as requested.

- **Operandio** is the single-line heading, with a 44 px close button.
- **2 hours** has the first available Start button. While running it shows time left, a green Started stamp and its deadline.
- **4 hours** has a disabled Start button with “After 2 hours”. After the first deadline its Start button becomes available. It never starts itself.
- Both rows remain visible. Running and completed rows are read-only status, with no button or checkbox treatment.
- The same shift-style pings appear at both deadlines. Got it remains personal.
- The clock and a timer row take two taps to start from Prep. Closing the dropdown takes one more tap. Existing Prep actions stay one tap, and the closed menu uses no list space.

The owner asked twice for a smaller dropdown, then explicitly asked for visibly touchable controls and the repository's active-button and event-status guidelines. The current ready and running panels measure **248 × 155 px**, down from the preceding **288 × 183 px**, and the original **360 × 297 px**. That is about 27% less area than the last preview and 64% less than the first. The close and Start buttons retain at least 44 × 44 px targets; ready-state rows are 50 px high. The completed state adds Start another batch and measures 248 × 204 px. Pending and error states grow to keep their words readable: pending 162 px high (174 px with Extra large text), failure 196 px (211 px with Extra large text), measured at 390 px. The menu stays centred under the clock and clamped inside the viewport.

Quick refinement check: same start sequence and tap count, no new operational permissions or reads. Start remains two taps from Prep. Closed-menu list space is unchanged. All five states were exercised at 320, 390, 768 and 1280 px with Normal and Extra large text. Buttons retain minimum targets and captions fit without clipping. These are preview checks, not verification of the backend.

### Action and status treatment

This follows [After the tap](../action-feedback.md), [design patterns](../design-patterns.md) and [loading and motion](../loading-motion.md), as required by AGENTS.md and CLAUDE.md. The preview reuses `.btn.dark`, `.btn:disabled`, `.lk-stamp`, `.p-err` and the app's shared active feedback. It does not copy the production write helpers or create real writes.

- **Ready:** a filled, labelled Start button, with action corners, keyboard focus and existing press feedback. The timer name is outside the button. Commands do not use `aria-pressed`.
- **Unavailable:** a disabled outlined Start with faint words, a light edge and “After 2 hours”. Its appearance differs from pending.
- **Pending:** the same button immediately says Starting… and gains `aria-busy`, keeps its width and prevents another submission. The adjacent words say Waiting for confirmation. No green stamp appears yet.
- **Confirmed:** after the local simulated response, the row shows time left and a green outlined Started stamp plus its deadline. An announcement names the Operandio 2-hour or 4-hour timer. The old Start button goes away and the menu stays open.
- **Failed:** a red persistent message names the timer and says it could not start, with `role="alert"` and a Try again button. Nothing starts. Retrying clears the old failure and returns to pending.
- **Finished:** green check plus Finished, without pretending the elapsed timer is an actionable button.

| Feedback question | Preview answer and production requirement |
| --- | --- |
| What changes in the tap's own frame? | Start changes in place to Starting…, keeps its width, and disables repeat submission. |
| What confirms the result? | A local simulated acknowledgement shows Started 14:00 or Started 16:10 beside that timer; an accessible announcement names Operandio and the duration. Production must wait for the accepted server start. |
| What happens to the old words? | Start, pending words and any previous failure disappear after acknowledgement. Running status and the start stamp replace them. |
| Where is the person afterwards? | In the same open dropdown. If keyboard focus was on Start, it moves to the resulting row, with no scrolling. |
| What happens on failure? | The timer remains unstarted. A named red error and Try again remain until retry or dismissal; no work is lost. |
| Can it be undone? | A shared accepted stage has no Undo in this design. This preserves the confirmed immutable deadline; cancellation is outside the requested workflow. |

Close dismisses the menu and returns focus to the clock. Start another batch is explicit after both stages finish and returns the local preview to ready. The prototype's stage selector now also exposes Starting and Couldn’t start. `result=hold` and `result=fail` are local demo modes for checking pending and failure; none contact a server.

Closed-app delivery is now part of the requested feature. Canonical server deadlines preserve the timer, and a scheduled sender plus device push provides notifications without an app window. Existing order push registration is chef-only and its ten-minute GitHub job is not a punctual alarm. Extend cooling opt-in to current kitchen staff separately from supplier reminders. Each device needs notification permission; iPhone/iPad needs the Home Screen app. OS settings and connectivity still govern arrival and sound.

The [technical note](technical-notes.md) sets out the proposed server tasks, retries, access checks and device behaviour. Repository notes record a previous choice to stay on free Firebase. The recommended Functions/Cloud Tasks path needs billing-enabled Firebase and deployment; the new request does not authorise a billing change. No plan, API, queue or live notification has been changed.

## Council

Role-based review, not research with staff. **Verdict: Build smaller (5 of 5).** All five supported one shared Operandio batch, retaining the existing ping presentation, narrow start permissions and explicit stage actions. All wanted the manual stage transition settled, which the owner then confirmed.

The second round compared A, a clock sheet; B, a compact Prep card; and C, a section inside the existing Pings sheet. Each reviewer saw the phone screenshots and first ping; the designer also checked a larger viewport. Scores are 3, 2 and 1 for first, second and third.

| Reviewer | First | Second | Third | Main concern |
| --- | --- | --- | --- | --- |
| Cook mid-service | C | A | B | Keep working rows and separate Got it from Start 4 hours |
| Head chef | C | A | B | A small addition to the existing interface |
| Skeptic | C | A | B | Avoid permanent clutter for one named timer |
| New starter | B | A | C | A visible Start action is easier to discover than a bell |
| Keeper | C | A | B | Reuse presentation without inheriting wrong expiry or permissions |
| Screen designer | C | A | B | Clear stage sequence, readable controls and preserved Prep space |
| Total | C: 16 | A: 12 | B: 8 | Five preferred C; one preferred B |

**Recommendation: C with A's explicit cooling label and stage sequence.** It keeps timers and messages in the bell without another top-bar control or a permanent Prep card. A remains the closest match to the original request for a little clock. The new starter disagreed: Pings sounds like a place to read, so discovery needs clear wording. The owner subsequently chose the compact clock dropdown recorded above.

The shared first-ping heading was refined after review to **First 2 hours finished**, with the requested Operandio sentence below it. This avoids suggesting the whole sequence is over. The second heading is **Next 4 hours finished**. These messages report elapsed time, not a recorded temperature check.

## What each design costs on screen

| Option | Start first stage from Prep | Start second stage from the ping | Prep rows at 390 px, sheet closed | Navigation | Likely build size | Main trade-off |
| --- | --- | --- | --- | --- | --- | --- |
| A: clock sheet | Clock, Start: 2 taps | 1 tap | 4, same as baseline | One sheet | Shared state plus UI, about 2 PRs | Dedicated and easy to recognise, another top-bar icon |
| B: Prep card | Start: 1 tap | 1 tap | 1, baseline 4 | Inline card; alert sheet | Same shared work, about 2 PRs | Visible immediately, uses list space |
| C: inside Pings | Bell, Start: 2 taps | 1 tap | 4, same as baseline | Existing sheet | Same shared work, about 2 PRs | Least clutter, must make the starting action discoverable |

Build sizes are estimates. All three require the same shared timing and permission work; none earns a database cost advantage from its layout. Existing prep ticks stay one tap in every option. Closing A or C after starting is another tap if the person wants the list immediately; B stays inline after its start. All use the same stage pings.

### Browser measurements

Synthetic current sous-chef Prep fixture, 844 px viewport height, app CSS. A/C measured with their sheets closed, since a deliberately opened modal covers the page. A row counts only when both its top and bottom pass hit testing inside the visible viewport, accounting for clipping and the Add dock.

| Width | Header height, all options | A/C first row | B first row | A/C full rows | B full rows |
| --- | --- | --- | --- | --- | --- |
| 390 px | 64 px | 323 px | 579.734375 px | 4 | 1 |
| 768 px | 96 px | 385.90625 px | 642.640625 px | 6 | 2 |
| 1280 px | 96 px | 327.109375 px | 583.84375 px | 4 | 1 |

No horizontal document overflow or JavaScript errors in the three options at these widths. Each primary stage action has a 50 px minimum height. Font rendering in this environment uses the app's available fallback when remote Barlow is unavailable; these figures describe this preview, not an on-device production result.

## Shared behaviour proposed for every option

- Start with one active Operandio batch for the kitchen. Multiple simultaneous batches are outside these concepts and need a distinct batch identifier before implementation.
- The start and stage transition are confirmed by the server before the app says everyone has the timer. Offline or refused actions keep their error and do not present a shared success.
- A shared record preserves the first start, the manual waiting stage and the second start. The countdown is calculated on the device, without writes every second. Two people cannot restart a stage by ticking at the same time.
- Each person's alert and Got it are separate. A late opener sees the stage they missed without restarting it. A running next stage is visible if another cook already started it.
- Reuse the kitchen-selected ping sound and sheet coordination. Keep private data behind the existing login and do not interrupt a PIN screen, typed work, another sheet or live Undo. “Everyone” needs a dedicated cooling audience rule that does not accidentally exclude people through the ordinary ping visibility switch or shared-tablet filter.
- Ordinary shift pings stay chef-written. Starting this fixed cooling sequence does not grant general ping editing.
- Current shift pings disappear after 30 minutes. Shared cooling needs an explicit persistent waiting/overdue policy rather than copying that rule blindly.
- Signed-in, open app screens show shift-style pings. The chosen refinement also requires closed-app push delivery. This is a backend and device opt-in requirement, not something the local preview implements.

The [technical note](technical-notes.md) records source-backed constraints, the proposed state model, read/write estimates and the implementation checks. These are proposals, not a deployed schema or permission change.

## Validation

The prototype uses a script-free snapshot of the current synthetic Prep page plus its own preview script. It does not load Firebase, service workers or app scripts. The examples were rendered at 390, 768 and 1280 px; both ping messages and the manual Start 4 hours transition were exercised. The stage-two example correctly says started 16:10 and due 20:10. The historical prototypes needed no application tests or rules changes; implementation verification is recorded in [the feature contract](../operandio-cooling.md). JavaScript syntax and whitespace checks pass.

Dropdown checks exercised all five states at 390, 768 and 1280 px, the two starts, both ping messages, personal Got it, Escape, backdrop close and return focus. The unavailable Start button stayed disabled until the first stage ended. The dropdown fits every viewport without horizontal overflow or JavaScript errors. With the menu closed, measured header height, first-row position and full visible rows match the baseline: 390 px: 64 / 323 / 4; 768 px: 96 / 385.90625 / 6; 1280 px: 96 / 327.109375 / 4. The stage selector in the comparison page also switches correctly between the dropdown and both pings. These are mocked browser checks, not delivery tests.

Chosen preview: [overview](dropdown-overview.png), [pending](dropdown-pending-390.png), [failure](dropdown-error-390.png), [ready](dropdown-idle-390.png), [first countdown](dropdown-first-390.png), [second stage available](dropdown-first_due-390.png), [tablet](dropdown-idle-768.png), [desktop](dropdown-idle-1280.png).

Original screenshots: [comparison](comparison.png), [first ping](ping-2h-390.png), [second ping](ping-4h-390.png), [running stage](running-390.png). The screenshots are design evidence, not proof of shared delivery, permissions or real deadlines.

## Rollback

For these static prototypes alone, remove this design directory and its documentation links. The implemented feature has a separate [rollback procedure](../operandio-cooling.md#rollback).
