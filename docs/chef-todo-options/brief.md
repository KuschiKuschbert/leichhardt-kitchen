# Chef to-do: two notebook designs

8 November 2026. Status: **B, Open notebook, implemented and checked locally; awaiting pull request checks and release**. The head chef explicitly requested two designs before coding, superseding the usual three in the service council and build-apps workflows. The choice changes presentation only: access, data and saved-shell contracts stay.

Read first: `CLAUDE.md`, `docs/design-patterns.md`, `docs/code-contracts.md` (Chef to-do), `docs/whole-app-redesign-options/brief.md` (Chosen and Build, step 7). Existing state: one private shared list, one add form, shared search and filters through `lvHTML()`, due-first sort, lazy Done in the last 30 days.

## Verdict and recommendation

Verdict: Build smaller (3 of 5 round 1 reviewers; the other 2 said Build). Improve responsive presentation while retaining the existing jobs and actions. These are independent role-based reviews, not research with real kitchen staff.

All six round 2 reviewers preferred A. Scores before small corrections:

| Reviewer | A /20 | B /20 |
| --- | ---: | ---: |
| Cook mid-service | 18 | 13 |
| Head chef | 19 | 14 |
| Skeptic | 17 | 13 |
| New starter | 16 | 13 |
| Keeper of the book | 18 | 14 |
| Kitchen screen designer | 17 | 13 |

Corrections applied to the previews after review: A's desktop deadlines moved beneath the job; the repeated unfiltered count was removed; tablet spacing was reduced; visible buttons were measured at a minimum of 44 by 44 px. These corrections and the scores describe the previews, before the head chef chose B.

Council recommendation: A. It retains visible one-tap filters, gives jobs the available width and uses one notebook sheet at every size. B is useful if a permanently visible laptop add form matters more than list space.

## Chosen

The head chef chose **B, Open notebook**, on 8 November 2026. That choice settles the layout despite the council's recommendation of A. The chosen notebook puts jobs and their controls on the left, a single add or change editor on the right from 1100 px, and one flow below that width. No further layout choice is pending.

The implementation is complete locally. Preview measurements are retained below as design history; the separate implementation validation records the built page. Pull request checks, release and live validation are still to come.

## A: Single notebook sheet

Cream ruled paper, red margin, handwritten job words, typed dates and attribution. Quick add beside search and filters on a laptop, above them on phones and tablets. Optional date and chef assignment appear after typing. Dates stay beneath the job; Change and Remove stay visible. Whole page scrolls naturally, without an inner list scrollbar.

Trade-off: less of the open-book appearance, and no permanent blank editor on a laptop.

## B: Open notebook (chosen)

From 1100 px, jobs, search, filters and sort on the left, one add or change form on the right, joined by the Prep-style spine. Optional fields are visible beside the jobs on a laptop. Below 1100 px it becomes one sheet, with the same form above the list and optional fields appearing after typing. Phone filters use the existing shared dropdown. CSS changes the position of the same form, without duplicate controls or draft state. The page scrolls naturally, without an inner list scrollbar. Add is disabled until the job has words; Save changes is enabled only after the job being changed differs from its saved version.

Trade-off: less width for job words on a laptop; one extra tap to pick a phone filter; a more substantial responsive transition.

## Preview measurements

These are design-preview measurements only. Same six synthetic job names, including a long job, project Barlow/Caveat fonts, normal text, 844 px viewport height. Count complete rows above the fixed bottom navigation on phones/tablets and the viewport bottom on laptops. Supplier cut-offs are not configured in this fixture. The preview baseline is origin/main 613b3fc.

| Measure | Current | A | B |
| --- | ---: | ---: | ---: |
| Complete jobs at 390 x 844 | 1 | 3 | 3 |
| Complete jobs at 768 x 844 | 1 | 3 | 3 |
| Complete jobs at 1280 x 844 | 1 | 4 | 3 |
| First row top, 390 px | 536 px | 427 px | 427 px |
| Tick a visible job | 1 tap | 1 tap | 1 tap |
| Add without optional details | focus + submit | focus + submit | focus + submit |
| Pick a phone filter | open + choose | 1 tap | open + choose |
| New navigation levels | 0 | 0 | 0 |
| New database reads or rules | 0 | 0 | 0 |
| Expected implementation size | n/a | 1 focused PR | 1 focused PR |
| Relearning | n/a | Low | Medium |
| Main risk | Narrow jobs | Styling shared controls | Editor position and draft retention |

Typing is excluded from tap counts. Optional date and assignee selection retain their existing work. Counts describe these sample jobs, not every live list or a measured speed improvement.

## Preserved implementation contract

- Head chef and sous chef sessions only. No new permission path.
- One source for form state (`tdf`, including text, date, assignee and edit id) and search/filter state. Responsive layout must move the same controls with CSS, not create duplicate forms. Resizing must preserve an add draft or a job being changed.
- Existing tick/Undo, Change, Remove/recovery and second taps for unsaved work, assignment, due dates, Refresh, search, filters, sorting, Show more and lazy Done remain. Keep the existing shared controls and their thresholds; Done in the last 30 days is still read only when opened.
- Existing conditional supplier reminders remain visible above the notebook. They stay view-only, linking to Orders for ticking. The fixture has no configured cut-offs, so they are absent from both mockups.
- No new listener, read, storage, schema, service, dependency, page route, bar button or popup.
- Implement with existing tokens and helpers in `css/app.css` and the to-do rendering in `js/prep.js`. Reuse `todoPageHTML()`, `todoFormHTML()`, `todoRow()`, `lvHTML()`, `W()`, `canW()`, `esc()` and the existing save/error feedback.
- The notebook pattern is registered in `docs/design-patterns.md` and its existing test: `todo-notebook`, `todo-book`, `todo-bookhead`, `todo-spine`, `todo-work`, `todo-formtitle`, `todo-status`, `todo-privacy`. The existing reading maps point here.

## Preview verification

Previewed both designs at 390, 768 and 1280 px. No sideways overflow or page errors at these widths. Measured visible button hit areas, exercised preview search, and retained a draft while resizing 390 to 1280 and back. Previews implement only local search, filter and form expansion to aid review. Save, tick, Change, Remove, Undo and database access are not connected. This is not live behaviour validation or a WCAG certification.

## Implementation validation (local, 8 Nov 2026)

Built B in `js/prep.js` and `css/app.css`, retaining one form and `tdf`. The empty Add is disabled until there are words; Save changes stays disabled until the edited job differs. No reads, rules, authority, schema or saved storage change. Add and tick tap counts are unchanged, and phone filters retain the shared adaptive picker.

With the project fonts loaded, the same six synthetic jobs and a viewport height of 844 px, the built page measured:

| Width | Original complete jobs | Built complete jobs | Built first row top | Screenshot |
| --- | ---: | ---: | ---: | --- |
| 390 px | 1 | 3 | 417 px | [Built phone](previews/built-390.png) |
| 768 px | 1 | 3 | 438 px | [Built tablet](previews/built-768.png) |
| 1280 px | 1 | 3 | 410 px | [Built laptop](previews/built-1280.png) |

At 390 px complete jobs are counted above the bottom navigation, which starts at 776 px; at 768 px navigation is at the top. The original 390 px first row started at 536 px. These fixture measurements describe visibility, not a measured service speed improvement.

Focused local browser checks passed: `todo.test.js`, `safe-text.test.js`, `design-patterns.test.js`, `supplier-reminder-done.test.js` and `supplier-orders.test.js`. The new `todo-notebook.test.js` passed 34 assertions for the responsive book, one form, draft retention through resizing and service redraws, long words and dates at the largest text size, 44 px row action targets, no sideways overflow or page errors, and no extra to-do read until Done opens. Additional largest-text checks passed at 320, 360, 1099, 1100, 1150 and 1280 px, with edit state and focus retained through reflow. Independent source and layout review found no issues.

These are local checks with the Firebase stand-in, not live validation. Implementation is complete locally; pull request checks and release are pending. The choice is recorded in `docs/head-chef-decisions.md`, the reading maps, `README.md`, `docs/prep-book.md`, `docs/code-contracts.md` and `docs/design-patterns.md`.
