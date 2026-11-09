# Round 1: whether to simplify Orders

Five fresh, independent agents received the same proposal, service rules, reviewer briefs and actual-app phone screenshot. These are simulated roles, not real staff research. Each saw the current app with synthetic records and actual fonts. No design preference was supplied.

**Verdict: Build smaller, 5 of 5.** Reuse the plain request list, remove supplier nesting and repeated controls, and show supplier information once. Keep the supplier workspace and external ordering separate. Compare deadline treatments by visible requests and taps before choosing.

| Reviewer | Verdict | Main criticism | Requested constraint |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | Only two complete requests fit. Neither is urgent; Eggs Out is partly obscured and older Butter Low is far below. | Keep direct Add and item ticks; keep age visible; compare the smallest change first. |
| Head chef | Build smaller | The owner described a real mismatch, but screenshots do not establish missed orders or time saved. | Show supplier information once and measure rows/taps, including older and overdue states. |
| Skeptic | Build smaller | Staff already have a plain list and supplier preparation already has a home. | Reuse existing behaviour, remove repetition before adding controls, and do not create another purchasing workflow. |
| New starter | Build smaller | No supplier yet looks like a failed request. Identical supplier and item boxes appear to mean the same thing. | Name the action clearly and say what changed. Suggested Add request, Mark item ordered and Confirm supplier order placed. |
| Keeper of the book | Build smaller | Removing matching may save reads, but shared cut-off code, offline Undo and saved copies are risks. | No new reads/listeners/statuses. Validate actual read savings, offline Undo and updates in implementation. |

There was no verdict disagreement. The cook preferred direct access to approaching deadlines; the head chef and skeptic required a measured comparison before accepting disclosure. The new starter proposed shorter, clearer action names; other reviewers preferred retaining the familiar Add entry. Round 2 must make those tradeoffs visible rather than present a forced consensus.

## Reconciliation

- All three concepts use the same request data and preserve the manual workflow. Supplier and request completion remain independent.
- A keeps all cut-off actions visible, B puts requests first with separate deadline work, and C reduces deadlines to one disclosure line. None introduces a page, tab-bar button or automatic overlay.
- Smaller means less repeated information and fewer containers, not smaller tap targets. Use at least 44 px controls and readable fonts.
- The current phone baseline has two fully visible request rows with a 124.5 px global cut-off band. Measurements are from `baseline-measurements.json`, at 390 x 844, normal text, eight requests and two deadlines. The staff baseline already has seven full rows and no cut-off band.
- Do not claim speed improvements, fewer missed orders or database savings from a static prototype. Report those as implementation checks.
