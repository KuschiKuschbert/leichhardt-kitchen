# Orders: one request list, smaller cut-offs

## Status

9 November 2026. **C implemented and locally verified.** After the council and previews, the owner said "yeah lets go for c". The actual workflow remains staff request, chef prepares a separate supplier order, chef orders through the external system. This branch implements the selection; verification and release status are recorded below.

[Proposal](proposal.md) · [Round 1 council](council-round-1.md) · [Round 2 scores](council-round-2.md) · [Compare screenshots](comparison.html) · [Interactive concepts](index.html?view=compare) · [Standalone download](orders-designs.html) · [Pre-change measurements](baseline-measurements.json) · [Implementation measurements](implementation-measurements.json)

## Chosen C

Use C's native compact disclosure, with the council's written **View / Hide** cue and **Add request** wording. The closed summary keeps the next unconfirmed supplier deadline, its absolute time and due/overdue counts visible. Opening it reveals the existing supplier details, confirmation and Undo, tomorrow's early-order action and notification settings. It never opens itself during service. Its open state survives live redraws.

Today's chef requests form one list: Out first, then earlier source days, then creation time. The sort uses stable urgency and age fields so ticking a request does not move it during the existing ten-minute Undo period. Keep amounts, source age, author/time, recipe context and row actions. Following the owner's 10 November clarification, staff see one list in entry order without Since labels, earlier-day groups, creation times or rollover reminders. Author, amount, urgency and save feedback remain; chefs retain item-age context. Chef past-day access, removed records, regular suggestions and Ordered today stay.

The request list does not allocate items to suppliers or prepare an order. Supplier **Order placed / Undo** changes only its existing cut-off confirmation. Item completion still means actually ordered. Keep one page-level Delivery received link. The compact fold replaces the separate cut-off banner on today's Orders page; other pages retain their reminders. No supplier catalogue or supplier modules load merely to display Orders.

The app keeps its existing queued confirmation and Undo path when offline, with **Not sent** on the affected row and summary. A pending confirmation cannot become an acknowledged all-placed state. This intentionally differs from the isolated preview's disabled offline confirmation buttons. The existing thirty-second clock updates only cut-off content, preserving request positions and disclosure choice.

### Staff age labels, 10 November follow-up

The owner asked that staff no longer see how long requests have been waiting. Quick check: **Build smaller**. Age helps the chef prioritise purchasing; staff need the item, optional amount, Low/Out, author and recipe context. One list without age headings follows Things/Todoist's direct task view and Headspace's quiet wording. It adds no tap, control, read or write. The deliberate trade-off is that staff no longer judge waiting age; chefs retain that context and their existing priority order.

The implemented app omits staff Since badges, earlier/overdue sections, creation clocks and rollover toasts. It retains completion times and save feedback, and does not alter saved rollover history. Regression checks cover old requests remaining once, More-sheet age leakage, author/amount/urgency, unchanged stored provenance, and chef age/priority. All seven affected browser/source files pass after this follow-up. The same actual-font phone fixture now fits eight complete staff rows instead of seven; Add remains one tap to open and two through submission. All 15 captures were refreshed; chef geometry is unchanged. This is the lead's proportional check of the owner's clarification, not a new council round or score.

### Contract fit

Retain the current steel work cover, warm writing paper, orange actions and attention, green completed states and named failed/unchecked states. Native disclosure and explicit words keep the control usable without colour. No new navigation, automatic overlay, saved field, schema, listener, persistent private cache or external service. Main-task entry and item completion remain one tap; confirming a supplier from the closed fold costs two.

C keeps Things/Todoist's plain work list, Linear's direct actions, Flighty's deadline context and Headspace's quiet initial view. No additional gamification or booking-style card is needed from Duolingo or Airbnb. The existing council scores describe the reviewed previews, not a new round or staff research.

### Retrospective all-three mix assessment

This is the implementation lead's fit check against the council guidance added after the original review. It does not rerun the council, transfer scores to a new blend or replace the owner's choice.

| Concept | Retained contribution | Rejected contribution and reason | Cost in the chosen result |
| --- | --- | --- | --- |
| A: Compact rows | Full supplier details and explicit confirmation remain inline inside C. | Permanently open deadlines displace requests as the supplier count grows. | Open the fold to see the full set. |
| B: Requests first | The written View cue makes the secondary deadline task discoverable. | The separate laptop column and phone jump create two layouts and more travel. | One consistent in-place disclosure at every width. |
| C: One-line fold | The owner-selected compact summary and native disclosure, keeping every request in one list. | Automatic opening would move service rows, so it remains a user choice. | Supplier confirmation takes two taps from closed; Add and item ticking remain one. |

The result is the selected C with the copy refinement already shown to the owner. It has its own actual-app evidence below; the original A/B/C preview scores stay unchanged.

## Evidence and scope

Source baseline: `origin/main` at `2cb62ba`, fetched for this review. The open PR check found no other Orders redesign in flight; unrelated draft designs are retained. The pre-change baseline includes supplier grouping and independent request/supplier completion. Implementation was reconciled with main `2841d4d` before changes.

The pre-change screenshots use the real app, Firebase stand-ins, fictional records and actual Barlow, Barlow Condensed and Caveat fonts. The phone has eight requests, two deadlines and one older outstanding request. The pre-change chef view shows two complete rows at 390 x 844, five at 768 x 1024 and five at 1280 x 900. Staff show seven complete rows at 390 x 844. These are fixture measurements, not production usage.

Preview layouts are independently drawn interactive concepts using the same content. Their row counts measure the drawings, not a patched app. They must not omit required content just to increase density. Exact runtime geometry, asynchronous writes, permissions and update recovery require implementation checks.

## Council round 1

**Build smaller, 5 of 5.** Remove supplier nesting and repeated links; reuse the request list and show supplier information once. Keep Add and item completion directly available. All reviewers wanted measured tradeoffs, and none claimed a proven saving in staff time. [Reasons and differences](council-round-1.md).

## Three concepts

### A: Compact rows

The least change. One compact deadline block before the plain request list replaces both the global cut-off banner on Orders and the supplier group headings. Each supplier has a named Order placed action. All deadlines remain visible without opening anything.

Good: immediate deadline and confirmation access, clear separation from requests, little navigation to learn. Cost: every additional supplier pushes requests down; busy-day density can still be poor.

### B: Requests first

The list leads. A narrow nearest-cut-off strip points to a separate deadline area after the requests on a phone and beside them on a laptop. Its View action moves to that area without a new page or overlay.

Good: requests get the initial space, desktop lets the chef see both jobs, supplier work has a distinct place. Cost: phone users must scroll or use View to reach confirmations; long request lists increase the travel. The strip must retain a count of other deadlines and any overdue warning.

### C: One-line fold

The most reduced initial view. One deadline disclosure keeps the nearest supplier, absolute time and deadline count visible. Opening it shows all deadline details and named Order placed actions.

Good: bounded initial height regardless of supplier count, all requests remain one list, no duplicate banner. Cost: confirming a supplier needs an extra tap while closed; the summary must distinguish no deadlines from unknown status and must not hide overdue warnings.

## Measured comparison

Eight identical fictional requests, including all four items with recipe context, two cut-offs, one older request and two Out items. Actual fonts, normal text, unscrolled 390 x 844 phone. A full row must sit above the fixed Add dock. Prototype results are not implementation guarantees.

| Measure | Current app | A: Compact rows | B: Requests first | C: One-line fold |
| --- | --- | --- | --- | --- |
| Complete phone request rows | 2 | 3 | 5 | 5 |
| Complete tablet rows, 768 x 1024 | 5 | 6 | 8 | 8 |
| Complete laptop rows, 1280 x 900 | 5 | 5 | 7 | 7 |
| Initial deadline presentation on phone | 124.5 px banner, plus separate supplier groups below | 200.2 px full block, replacing both banner and groups | 69 px summary; full block below requests | 69 px closed summary |
| Taps to open Add / submit, excluding typing and closing | 1 / 2 | 1 / 2 | 1 / 2 | 1 / 2 |
| Taps to mark one request ordered | 1 | 1 | 1 | 1 |
| Taps to confirm a supplier on phone | 1, after scrolling to its group | 1 | 2 via View, or scroll then 1 | 2 when closed |
| Taps to confirm a supplier on laptop | 1 | 1 | 1 | 2 when closed |
| Navigation levels for requests / supplier confirmation | 1 / 1 | 1 / 1 | 1 / 1 with in-page jump | 1 / 2 with inline disclosure |
| Proposed build size | Existing | 1 focused PR | 1 focused PR | 1 focused PR |
| Relearning | Existing | Low | Medium: deadline area moves | Low to medium: open the deadline fold |
| New reads or rules | Existing | None | None | None |
| Main risk | Misleading nesting and two similar ticks | Many deadlines displace requests | Phone scroll and jump distance | Deadline details hidden until opened |

B and C use 55.5 px less initial deadline space than today's banner, about 45% less, and eliminate the additional supplier group headings. A's one full block is taller than today's banner alone; its benefit is removing the second representation, not claiming that its block is smaller than the banner. The many-deadline example makes A's cost explicit.

Staff have no deadline controls or chef ticks in any concept. The drawn staff view shows eight full fixture rows versus seven in the actual baseline; preserve the current staff renderer during implementation rather than promising this drawing's extra row. [Raw layout results](preview-measurements.json) · [Interaction checks](preview-interactions.json).

## Preserve in every implementation

- Shared requests, amounts, urgency, source age, authorship, recipe context and row actions. Keep staff permissions and today-only access; retain chef past-day access, removed records, regular suggestions and Ordered today.
- Item tick means actually ordered, not added to a supplier draft. Keep in-place feedback, the current delayed move to Ordered today, Undo and unsent/error states. Supplier confirmation changes only the existing cut-off record.
- Supplier name, absolute cut-off, delivery date, active night-before reminders, tomorrow's early-order action, closed/unconfirmed state, completed state and Undo. Keep notification opt-in, offline and failed-read states distinct. No implicit completion or quantity copying.
- No new top-bar button, tab, automatic popup, private persistent cache, read, listener, schema or rule. Other pages' cut-off display and the supplier workspace remain outside this layout review.
- Reducing the global banner here is scoped to Orders. Its content is represented in each concept's deadline treatment, with existing cut-off calculations and pushes retained.

## Council recommendation

**C with a written View cue.** Five of six reviewers placed C first; the new starter preferred B's explicit View wording. Points: C 17, B 13, A 6, using 3/2/1 per reviewer. C keeps the extra phone space and opens deadlines in place. Its cost is one additional tap to confirm a supplier while closed. [Full scores, disagreement and limitations](council-round-2.md).

The final previews add View/Hide beside C's chevron and use Add request for the shared action. The three phone images seen during scoring remain under `previews/council-*-390.png`. Scores were not rerun; measurements and interactions were checked after these copy refinements. The owner subsequently selected C.

## Preview verification

The capture script checks 75 layouts: three concepts at phone/tablet/laptop widths, eight deadline states, plus the phone staff view. All retain the eight requests and fit the viewport. The actual fonts load and no outside network request or browser error occurs. The default, many, overdue and offline phone states have retained screenshots, plus normal tablet and laptop views.

Interaction checks cover request ticks and Undo, independent supplier confirmations and Undo, optional amounts, Add entry/submission, keyboard close and focus return, offline Not sent feedback, explicitly dated tomorrow confirmation, and the standalone comparison download. These checks validate the prototype only. They do not exercise real Firestore, production permissions, shared-device concurrency, push delivery or saved-copy updates.

Run `node docs/order-list-options/capture-previews.cjs`, `node docs/order-list-options/build-download.cjs`, then `node docs/order-list-options/check-interactions.cjs` with the repository's test dependencies installed and Chromium available (`CHROME` can select it). Re-run the actual baseline with `capture-baseline.cjs`; its header documents the dependency path option.

## Implementation size and risks

One focused app PR extends the existing review branch. C adds disclosure-state handling around the current cut-off list and removes supplier grouping. Its main risk is hidden deadline detail, addressed by the written View cue, absolute time, due/overdue counts and distinct checking, offline and failed-read wording.

The implementation removes the supplier-catalogue grouping read from Orders. Existing deadline listeners, writes and notification behaviour stay. That removes one catalogue query on the first chef Orders open of a person/day scope, formerly at least one read and otherwise one per supplier. Actual savings depend on use; this is a source-derived cost change, not production usage measured here.

## Validation before shipping

Measure actual-app taps and rows again at 390, 768 and 1280 px plus large text. Check urgent and old requests, concurrent additions, delayed completed-row moves, no deadlines, many deadlines, tomorrow, closed/unconfirmed, stale/offline and failed reads. Extend the existing Orders, cut-off, role and read-budget checks; verify server acknowledgement and Undo through the existing write path. Keep saved-shell update contracts. The design prototype cannot verify these production behaviours.

## Implementation verification and release

The implemented app was captured in Chromium using synthetic Firebase and the same eight requests, recipe context, two cut-offs and actual Barlow, Barlow Condensed and Caveat fonts as the baseline. [Raw measurements and source hashes](implementation-measurements.json) distinguish the working implementation from the base commit. All 15 captures have no horizontal overflow or browser errors: normal closed/open views at 390, 768 and 1280 px, staff at 390 px, and phone Extra large text, overdue and long supplier-name states.

| Actual-app measure | Pre-change baseline | Implemented C |
| --- | --- | --- |
| Complete chef rows, 390 x 844, closed | 2 | 6 |
| Complete chef rows, 768 x 1024, closed | 5 | 8 |
| Complete chef rows, 1280 x 900, closed | 5 | 8 |
| Complete staff rows, 390 x 844 | 7 | 8 |
| Complete chef rows, 390 px Extra large text, closed | Not measured | 3 |
| Initial phone cut-off space | 124.5 px banner plus supplier groups | 69 px fold |
| Add entry / submission, excluding typing and close | 1 / 2 taps | 1 / 2 taps |
| Mark a requested item ordered | 1 tap | 1 tap |
| Confirm a supplier | 1 tap once its group is in view | 2 taps from closed |

The closed fold saves 55.5 px against the old banner alone, about 45%, and removes the additional supplier headings. Opening all deadline details intentionally pushes the requests down: the open fixture has 0 / 2 / 1 complete request rows at phone / tablet / laptop widths. Closing returns the list space. These figures describe this fixture, not every list or device. Extra large text uses the app's 125% setting; browser chrome, virtual keyboard and physical safe areas were not simulated.

[Built phone, closed](previews/built-chef-390-closed.png) · [Built phone, open](previews/built-chef-390-open.png) · [Built laptop](previews/built-chef-1280-closed.png) · [Staff without age labels](previews/built-staff-390-plain.png)

Before the 10 November staff refinement, the four focused Orders files passed 120 assertions. Together with 16 adapted integration files, live-list checks, 12 broader regression files and the design-pattern guard, **34 browser/source test files passed locally**. The staff follow-up checks are recorded above. The broader checks cover read budgets, roles and page access, Low/Out, shared order entry, offline reads, screen-reader labels, existing contrast/surfaces, modal close, safe text and Home. Changed JavaScript syntax and whitespace checks pass. Required hosted Click tests remain the release gate.

Regression and independent source review cover separate item/supplier completion, queued writes and Undo, pending/failure races, stable row height and order, the delayed Ordered today move, a closed fold that stays closed and an open fold that survives redraws, keyboard disclosure control, clock updates without request movement, long-name absolute times, focus on supplier links, and past-date behaviour. The catalogue is not read merely to open Orders. These are local stand-in and source checks, not production save, push delivery, server-role or physical-device verification. Independent rendered contrast checks in Chromium at 390 px used the actual composited ancestor backgrounds, with no opacity or background image affecting the samples. Summary title and View / Hide reach 14.69:1; supplier/time 6.21:1; expanded deadline text 6.73:1; soon/Not sent 5.27:1; done/Undo 5.48:1; failed-read text 7.35:1. The lowest sampled action border is 4.70:1. Sampled text meets 4.5:1 and borders meet 3:1. This verifies the new fold samples, not whole-app accessibility or contrast.

The first hosted run caught an outdated overdue-summary assertion and a confirmation-status wrap with a wider fallback font. The latter moved every request down by 20.3 px after acknowledgement. The expanded cut-off status now reserves two lines; the strengthened DejaVu Sans fixture reproduced 2 failures out of 34 on the old CSS and passes all 34 with the fix. All four focused files pass 120 assertions again, and the 15 actual-font captures were refreshed.

Local implementation verification is complete. Hosted CI and the normal release queue still gate publication; no live deployment is claimed here.

## Rollback

Revert the Orders renderer and scoped styles through a new branch and PR. Keep unrelated main changes, existing access rules, cut-off calculations, saved-shell recovery and supplier history. No data migration or saved-field rollback is needed. The isolated review files can be removed independently without application or data effects.
