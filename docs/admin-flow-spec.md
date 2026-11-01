# Admin flow redesign

New visual design round, 1 November 2026: the user has requested three fresh layouts and will choose before implementation. See [current visual options](admin-design-options/brief.md). The selected flow below describes the existing baseline, not a selection in the new visual round.

Status: A selected and implemented. Local verification is recorded below; [PR #427](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/427) tracks required CI and deployment evidence. The user selected A on 1 November 2026; no further layout approval is needed.

## Problem and evidence

The user reports that the admin panel's new training and reference screens do not flow well. On current main `cb9da05`, the explanation, lists, evidence and forms compete on long pages:

- Analysis renders a selected item's details after as many as 40 list rows. Selecting an item does not focus or reveal the result.
- Training places its editor below opportunities, station coverage and saved records. Reference review places its editor above its list. The same task starts in different places.
- Save closes the editor with a generic message and no next task or contextual return.
- A reference or training draft remains in module memory when its page is hidden. A second task is blocked without a direct Resume action.
- Header Back and browser history do not retrace the new admin task flow. Cross-page evidence and reference actions lose the selected item or known source ids.

The previous release's full live suite passed: [run 41252929409](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41252929409).

## Recommendation

Simplify. Keep current data and permissions, and organise the work around a decision and its outcome. The primary path should be: choose a job, choose a person or item, review its context, save, see the outcome and continue.

## Three concepts

The self-contained [interactive comparison](admin-flow-concepts.html) uses example data only. It makes no network requests or production writes. These are interaction concepts, not completed application screens.

| Concept | Primary path | Tradeoff |
| --- | --- | --- |
| A. Review desk, recommended | Task queue, focused review, Save, next task or return to the queue. Desktop keeps list and review beside each other; phones open a focused task. | Fast for routine review. Exploring arbitrary connections is secondary. |
| B. People and items | Search for a subject, open a workspace, switch between activity, links, assessments and history, return to the same subject. | Strong connected exploration. More navigation when processing many unrelated tasks. |
| C. Guided tasks | Choose a job, review context, record a decision, see completion and choose the next job. | Clear for occasional use. More steps for bulk review. |

All three include evidence, explicit reference confirmation, explicit training assessment and access to saved records. Operations and Settings remain available. A is selected. The other two concepts are retained as design context. The live app receives this implementation after the PR release gates pass; the PR records the deployed revision.

## Contract shared by all concepts

- Put the primary action and current subject before optional explanation. Help, advanced fields and older records use progressive disclosure.
- A tap opens a visible, focused detail or editor beside the source list on desktop or as a focused view on a phone.
- Preserve search, period, selected subject and list position when returning. Provide contextual Back and a visible route to any unfinished draft.
- Keep source identity when moving from evidence to reference review. Navigation never saves or confirms a record.
- Save offers a clear outcome, a return destination and an appropriate next action. Failed saves keep the form and its values visible.
- Keep confirmed links and assessments independent of activity periods. A recipe assessment never confirms a whole section. Prep ticks never imply competence.
- Preserve permissions, private in-memory state, access-context guards, read budgets, generation freshness, stable ids and revision history.
- Retain staff entry behaviour and existing operational routes. No new backend service, schema, data import, automatic quantity change or rules expansion is needed.

## Selected Review desk contract

- Five primary destinations: Review desk, Reports, Saved records, Operations and Settings. Existing page ids still open the corresponding job or report.
- Item links and Training are the Review desk queues. A first visit opens the item queue. Queue counts use already requested data; inactive queues do not trigger extra queries merely to decorate navigation.
- Desktop keeps the queue beside the focused task. Phone and tablet use a focused task view with contextual Back. Optional explanation and fields are disclosed within that task.
- Confirmed links and saved assessments live in Saved records. They remain available during source-summary failures and independently of activity dates.
- Back leaves a draft in memory and restores the queue. A visible unfinished-task banner has a direct Resume control, including when another admin page is open. Explicit Cancel discards the form.
- Save returns to the originating list or report with an outcome. Save and next advances only after acknowledgement. A refused or pending save keeps the current record; Back is disabled while its outcome is unresolved.
- Selecting an analysis item reveals its evidence in a focused view. Moving to reference review retains known source ids and returns to the source item after Save or Back.
- Local page/filter controls continue to avoid extra browser-history entries. The shared header arrow closes the current task before leaving admin. Links to recipes, guides and supplier pages retain the existing route trail.

## Concept verification

The standalone preview passed 46 interaction probes across phone (390 px) and desktop (1280 px) views, with no horizontal overflow, unnamed controls, browser errors or external requests. Keyboard checks cover Tab and the concept selector arrow/Home controls. Known, unlinked and supplier references display different example targets; an unlinked target cannot be confirmed until selected. This verifies the comparison only, not a production implementation.

## Implementation verification

The untouched previous implementation failed all four initial visibility/focus assertions. The production Review desk passes its focused journeys for contextual Back, draft resumption on legacy pages, source identity, acknowledged Save and next, failure retention and 390/768/1280 px layouts. Additional checks reproduced and fixed heading focus loss during redraw, editable pending saves, training review cycling and delayed initial list reads. The five focused files pass 228 checks. Seven related files also pass, covering Back navigation, roles, safe text, hidden admin data and read budgets. Synthetic layout checks pass at 390/768/1280 px and 24 px root text. The desktop sidebar also keeps its navigation sections from shrinking when Reports has many pages; the outer sidebar scrolls. The real-control layout check failed 1 of 68 checks before this fix and passes all 68 after it. Required PR CI and deployed verification remain the release gates. These checks use synthetic Firebase data, not a real Google admin session.

## Resume

Read PR #427 for current CI, merge and live-verification results. If it is open, complete those release gates; if merged, verify its Pages/live result before starting new work. The selected flow and focused regression work are already implemented. Worktree: `.claude/worktrees/admin-workflow`; branch: `design/admin-workflow`. The prototype, comparison image and this note are the only new files for the comparison. README and the existing admin note record the design status and completed previous release.
