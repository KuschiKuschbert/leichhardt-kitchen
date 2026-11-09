# Orders: one request list, smaller cut-offs

## Status

9 November 2026. **Design review only. No design selected. No app implementation.** The owner asked for the design council and previews before implementation. The actual workflow is staff request, chef prepares a separate supplier order, chef orders through the external system.

[Proposal](proposal.md) · [Round 1 council](council-round-1.md) · [Round 2 scores](council-round-2.md) · [Compare screenshots](comparison.html) · [Interactive concepts](index.html?view=compare) · [Standalone download](orders-designs.html) · [Actual-app measurements](baseline-measurements.json)

## Evidence and scope

Source baseline: `origin/main` at `2cb62ba`, fetched for this review. The open PR check found no other Orders redesign in flight; unrelated draft designs are retained. The previous audit's grouping and independent completion behaviour still exist on this main.

Current screenshots use the real app, Firebase stand-ins, fictional records and actual Barlow, Barlow Condensed and Caveat fonts. The phone has eight requests, two deadlines and one older outstanding request. The chef sees two complete rows at 390 x 844, five at 768 x 1024 and five at 1280 x 900. Staff see seven complete rows at 390 x 844. These are fixture measurements, not production usage.

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

The final previews add View/Hide beside C's chevron and use Add request for the shared action. The three phone images seen during scoring remain under `previews/council-*-390.png`. Scores were not rerun; measurements and interactions were checked after these copy refinements. No design is selected.

## Preview verification

The capture script checks 75 layouts: three concepts at phone/tablet/laptop widths, eight deadline states, plus the phone staff view. All retain the eight requests and fit the viewport. The actual fonts load and no outside network request or browser error occurs. The default, many, overdue and offline phone states have retained screenshots, plus normal tablet and laptop views.

Interaction checks cover request ticks and Undo, independent supplier confirmations and Undo, optional amounts, Add entry/submission, keyboard close and focus return, offline Not sent feedback, explicitly dated tomorrow confirmation, and the standalone comparison download. These checks validate the prototype only. They do not exercise real Firestore, production permissions, shared-device concurrency, push delivery or saved-copy updates.

Run `node docs/order-list-options/capture-previews.cjs`, `node docs/order-list-options/build-download.cjs`, then `node docs/order-list-options/check-interactions.cjs` with the repository's test dependencies installed and Chromium available (`CHROME` can select it). Re-run the actual baseline with `capture-baseline.cjs`; its header documents the dependency path option.

## Expected implementation size and risks

One focused app PR after a choice, if no new behaviour is added. A uses the existing request list and compact deadline rows; B adds a responsive split and in-page jump; C adds disclosure-state handling. A has the lowest navigation risk, B the largest layout surface, and C the greatest summary/discoverability risk.

All options intend to remove the supplier-catalogue grouping read from Orders. Existing deadline listeners, writes and notification behaviour stay. This is a source-derived expectation, not a measured runtime saving. Prove request completion, supplier confirmation and partial external orders remain separate.

## Validation before shipping

After the owner selects a design, measure actual-app taps and rows again at 390, 768 and 1280 px plus large text. Check urgent and old requests, concurrent additions, delayed completed-row moves, no deadlines, many deadlines, tomorrow, closed/unconfirmed, stale/offline and failed reads. Extend the existing Orders, cut-off, role and read-budget checks; verify server acknowledgement and Undo through the existing write path. Keep saved-shell update contracts. The design prototype cannot verify these production behaviours.

## Rollback

This proposal adds docs and isolated preview assets only. Removing them has no application or data effect. A later implementation needs its own rollback note. Do not mark a design as selected or ship an app change until the owner chooses.
