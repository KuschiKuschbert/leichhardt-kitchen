# Cleaning: three compact chef workspaces

9 November 2026. **Design exploration. No layout chosen or application change made.** Baseline `2cb62ba`. [Interactive concepts](index.html) · [Screenshot comparison](comparison.html) · [Proposal](proposal.md).

For a single-file preview, download [cleaning-designs.html](cleaning-designs.html) and open it in a browser. It embeds the fonts, CSS and task drafts; A/B/C navigation was checked over local HTTP with no additional network requests. It is a generated copy of the editable preview sources, not an app runtime file.

The request is to replace the endless management list for admin, head chef and sous chefs. These are three alternatives for one workspace, not three features to build together. They use the existing notebook type, work surfaces and task programme.

## Evidence and scope

The real app, loaded with all 26 general templates and 25 pack-down drafts through the Firebase stand-in, displays 47 task rows on Monday 9 November. The phone document is 4,241 px tall. Opening Set repeat tasks adds 51 templates beneath it, producing a 10,770 px document. On desktop the corresponding heights are 3,288 and 8,155 px. The main progress count is 45 known occurrences, distinct from the 47 task rows. No real kitchen records were loaded or changed.

Native Barlow, Barlow Condensed and Caveat faces were loaded for the baseline and previews. These are the app's existing fonts, with official sources and OFL licences in `fonts/`. [Baseline data](previews/baseline.json), [current phone](previews/baseline-today-390.png), [current setup](previews/baseline-setup-390.png).

All three concepts retain Today, Week and Repeat tasks, shared work, search across all groups, ordered pack down and one task editor. Repeat tasks replaces the daily content rather than appending another list. Add is before the template rows. Long groups use six-row pages. Blocked work and Pass checks have a visible, cross-kitchen entry above every operational view. No main navigation destination, service popup, extra listener or read is proposed.

This is role-based design analysis, not research with kitchen staff. Preview completion states and workers are fictional. The shared task count is labelled as tasks, with an explicit repeat-event caveat. It is not an occurrence-completion rate. The temperature reminder still belongs to the existing flow; temperature logging is not connected by this change.

## Round 1

**Verdict: Build smaller, 5 of 5.**

| Reviewer | Decisive concern |
| --- | --- |
| Cook mid-service | Later stations are below the phone screen. Grouping must not hide shared work or unsent checks. |
| Head chef | Less scrolling has value; keep familiar wording and measure added navigation. |
| Skeptic | Existing headings already help. Moving Add and using lightweight groups may be enough. |
| New starter | Make next actions and remaining work explicit; distinguish records from service coverage. |
| Keeper | Reuse one completion/editor path and loaded data. No new persistent copy or background reads. |

There was no verdict disagreement. Cook, head chef and skeptic would prototype the smallest grouped version first. All three requested alternatives are supplied for comparison; only one should be implemented.

## A. Grouped notebook

[Phone](previews/a-390.png) · [Tablet](previews/a-768.png) · [Desktop](previews/a-1280.png) · [Try A](index.html?design=a).

Keep the notebook, but start with five named folds: General cleaning, Hot larder, Grill, Pans and Final floor clean. Every group shows remaining work and exception context. Opening one group shows at most six ordered tasks; task checks expand inline. Today, Week and Repeat tasks reuse this grouping.

**Strength:** smallest change and the clearest overview of all work on a phone. All five groups fit in the first screen of the concept frame. Add and search are easy to reach in setup.

**Cost:** no task rows appear until a group is opened. A late Pans task also needs the second page. This trades one or two deliberate taps for a much shorter scroll. Keep visible summaries when closed.

## B. Cleaning desk

[Phone](previews/b-390.png) · [Tablet](previews/b-768.png) · [Desktop](previews/b-1280.png) · [Try B](index.html?design=b).

A group rail, a short task browser and one detail/editor pane. On desktop, instructions and checks stay beside the task list. On phones, selecting Checks opens the task with a named Back button. Tablet details follow the short list. Schedule setup uses the same workspace.

**Strength:** best for frequent method review and template editing on a laptop. One task occupies the editor; no long form follows 51 rows.

**Cost:** phone group controls push the first task down. Only one full initial task row fits in the concept frame. More selection and responsive state to maintain than A.

## C. Week board

[Phone](previews/c-390.png) · [Tablet](previews/c-768.png) · [Desktop](previews/c-1280.png) · [Try C](index.html?design=c).

Replace the full weekly matrix with five group rows by seven days. Cells show tasks due and today's recorded tasks; select a cell for that day and group's bounded checklist. Phones show the same information as a day strip and five group summaries. Today gives a single-day agenda; Repeat tasks opens the compact task browser.

**Strength:** strongest weekly overview. The 51-row matrix becomes five stable summary rows, while actual task records remain available below.

**Cost:** daily completion requires drilling into the group. Due counts describe workload, not expected prep/service/use events or missed cleaning. This alternative has the most layout states and needs careful future/past read-only behaviour.

## Measured comparison

844 px-high browser viewports, native fonts. Prototype screenshots use `frame=1`: design-lab controls and explanatory footer are excluded, but the visible header says Design preview, not live. These are schematic previews, not an implementation density or speed guarantee. Current-app measurements include its real shell. The baseline has zero completions; the concepts have the same illustrative progress across all three.

| Measurement | Current app | A | B | C |
| --- | --- | --- | --- | --- |
| Complete task rows initially at 390 px | 4 | 0 | 1 | 0 |
| Complete group summaries initially at 390 px | Not a group overview | 5 | 5 | 5 |
| Task rows rendered initially | 47 | 0 | 5 | 5 below overview |
| Initial concept frame height at 390 px | Actual document 4,241 px | 900 px | 1,181 px | 1,305 px |
| Complete task rows initially at 1280 px | 7 | 0 | 4 | 0, weekly summary first |
| Open Clean impingers, select its two required checks, Record | 4 taps | 5 if Hot larder is closed | 4 in selected group; 5 in another | 5 in another group |
| Open Repeat tasks, then Add | 2 taps plus long scroll | 2 taps | 2 taps | 2 taps |
| Navigation levels within Cleaning | View, task | View, group, task | View, group, task | Week/day, group, task |
| Expected build size after selection | Existing | 1 focused PR | 1–2 PRs | 2 PRs |
| Relearning | Existing | Low | Medium | Highest |
| Additional database reads or rules | Existing bounded range | None proposed | None proposed | None beyond existing requested range |

Tap counts exclude scrolling and typing, start with Cleaning open, and count required check taps individually. A checked task with K checks takes disclosure + K + Record once visible. Selecting another closed group adds one; reaching the next six-task page adds another. Shared tablets retain the existing worker choice. C's default Week already selects today; choosing Today adds one optional view tap. The real app's existing event creation, Pass mapping, recorder-only Undo, correction and unsent states must be reused, not reimplemented from the simplified preview.

The scheduled editor is a layout sketch: it demonstrates placement, not every editable field. Check drafts survive group changes in the previews; editor-form draft recovery, real saves, uncertain acknowledgements, concurrency and device locks remain implementation acceptance criteria, not claims about the prototype.

## Verification

117 browser assertions passed across A/B/C at 390, 768 and 1280 px. They check all 51 distinct templates, one existing floor task, Pans numeric order across six-row pages, shared search, check drafts surviving group changes, separate schedule content, reachable Add, one open form, future read-only controls, no page overflow, 44 px measured control targets and no JavaScript errors. [Results and dimensions](previews/measurements.json).

These are local in-memory prototype checks. Actual role fixture checks in the baseline establish that canonical head, sous and verified admin reach the existing setup. No live writes, Firestore emulator tests or production deployment are claimed. Full keyboard/screen-reader verification is part of a chosen implementation.

## Round 2 and recommendation

Six fresh reviewers saw all three phone and desktop screenshots and the same measurements, without a preferred design. First place scores 3, second 2, third 1.

| Reviewer | A | B | C | Main concern |
| --- | --- | --- | --- | --- |
| Cook mid-service | 3 | 2 | 1 | A exposes every work group and exception; opening a group adds a tap. |
| Head chef | 3 | 2 | 1 | A is the cheapest adequate change; B suits detailed laptop editing. |
| Skeptic | 3 | 2 | 1 | Start with A and test whether six-row pages earn the extra tap. |
| New starter | 3 | 2 | 1 | A's next action needs clear words; B starts with done jobs on the phone. |
| Keeper | 3 | 2 | 1 | A introduces the fewest view states; reuse existing drafts and saves. |
| Screen designer | 3 | 2 | 1 | A has the clearest phone hierarchy; verify contrast and keyboard semantics in implementation. |
| **Total** | **18** | **12** | **6** | **A first for all six.** |

There was no ranking disagreement. The refinement priorities differ: the head chef wants the next incomplete task in each summary, the new starter wants an explicit Open tasks label, and the skeptic questions six-row pagination. These are advice for the chosen implementation, not claimed user decisions. No reviewer claims these schematics prove service speed, staff acceptance or accessibility conformance.

**Recommendation: A, Grouped notebook.** It makes every work group visible on a phone and removes the stacked setup list with the least relearning. Keep Repeat tasks as its own content view and reuse the real task/editor paths. Keep B and C as alternatives rather than combining their extra navigation into A.

## Follow-up: possible mixes

The owner requested a fresh mix council. Six new reviewers compared A with B's setup editor, A with C's Week view, and the full A+B+C composition. Scores were **17, 13 and 6** respectively. Five preferred the A+B setup mix; the head-chef reviewer preferred A+C Week. **All six still recommend plain A for the first build.** The best later mix borrows B's adjacent list/editor only for desktop Repeat tasks, with one inline form on phones. Defer C until weekly review earns the extra date and coverage state. [Full votes, sketches, disagreement and recommendation](mix-council.md).

The subsequent request to see that mix is illustrated in [a concrete M1 preview](mix-preview.md), with an [interactive version](mix.html), [visual overview](previews/mix-presentation.png) and [self-contained download](cleaning-mix.html). Its 75 local checks pass at phone, tablet and desktop sizes; the original 117 checks also pass after the shared preview changes. This is a reviewable illustration, not a chosen application implementation.

## Chosen

Awaiting the owner's choice. No application source, navigation, completion model, permissions, saved records or team release switch changed. Any chosen implementation must extend `js/cleaning.js` and the existing shared `css/app.css`, with focused Cleaning, navigation, release-switch, draft/session and read-budget checks. Update the design-pattern registry only for the actual chosen pattern.
