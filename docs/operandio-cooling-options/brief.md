# Operandio cooling pings: three designs

Designs only, 8 November 2026. No placement has been chosen and no shared timer has been implemented or released. The earlier device-local timer remains draft PR #610.

## Confirmed behaviour

The owner asks for a timer like a shift ping, which everyone can start. The name is always **Operandio**. The first tick starts **2 hours**. When that time ends, everyone receives **“Operandio batch cooling time 2 hours is done.”** Someone must then tick **Start 4 hours**. That starts a further **4 hours from the second tick**, followed by **“Operandio batch cooling time 4 hours is done.”** The second timer does not start automatically and is not measured from the first tick.

The mock example starts at 14:00, pings at 16:00, waits until someone ticks at 16:10, and pings again at 20:10. Got it closes only that person's message. It does not start another stage or silence anyone else. A duplicate start cannot reset a shared deadline.

[Try the interactive comparison](index.html). Each example is local demonstration state only. The stage buttons above the three phones show both alerts and both running stages. No messages are sent, no account is used and no real timer runs.

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

**Recommendation: C with A's explicit cooling label and stage sequence.** It keeps timers and messages in the bell without another top-bar control or a permanent Prep card. A remains the closest match to the original request for a little clock. The new starter disagreed: Pings sounds like a place to read, so discovery needs clear wording. No user choice is recorded.

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
- Signed-in, open app screens can show these pings. Closed or suspended phones require separate notification delivery; these previews do not promise it.

The [technical note](technical-notes.md) records source-backed constraints, the proposed state model, read/write estimates and the implementation checks. These are proposals, not a deployed schema or permission change.

## Validation

The prototype uses a script-free snapshot of the current synthetic Prep page plus its own preview script. It does not load Firebase, service workers or app scripts. The examples were rendered at 390, 768 and 1280 px; both ping messages and the manual Start 4 hours transition were exercised. The stage-two example correctly says started 16:10 and due 20:10. No application tests or rules changes are needed for these docs-only prototypes. JavaScript syntax and whitespace checks pass.

Screenshots: [comparison](comparison.png), [first ping](ping-2h-390.png), [second ping](ping-4h-390.png), [running stage](running-390.png). The screenshots are design evidence, not proof of shared delivery, permissions or real deadlines.

## Rollback

Remove this design directory and its documentation links. There is no application, data, rule or saved-shell change to reverse.
