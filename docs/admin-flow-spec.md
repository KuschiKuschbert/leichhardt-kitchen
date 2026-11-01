# Admin flow redesign

Status: concepts prepared; awaiting the user's design choice. Production behaviour is unchanged.

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

All three include evidence, explicit reference confirmation, explicit training assessment and access to saved records. Operations and Settings remain available. No direction is selected yet. The previous grouped design is the current live behaviour, not approval for one of these alternatives.

## Contract shared by all concepts

- Put the primary action and current subject before optional explanation. Help, advanced fields and older records use progressive disclosure.
- A tap opens a visible, focused detail or editor beside the source list on desktop or as a focused view on a phone.
- Preserve search, period, selected subject and list position when returning. Provide contextual Back and a visible route to any unfinished draft.
- Keep source identity when moving from evidence to reference review. Navigation never saves or confirms a record.
- Save offers a clear outcome, a return destination and an appropriate next action. Failed saves keep the form and its values visible.
- Keep confirmed links and assessments independent of activity periods. A recipe assessment never confirms a whole section. Prep ticks never imply competence.
- Preserve permissions, private in-memory state, access-context guards, read budgets, generation freshness, stable ids and revision history.
- Retain staff entry behaviour and existing operational routes. No new backend service, schema, data import, automatic quantity change or rules expansion is needed.

## Concept verification

The standalone preview passed 46 interaction probes across phone (390 px) and desktop (1280 px) views, with no horizontal overflow, unnamed controls, browser errors or external requests. Keyboard checks cover Tab and the concept selector arrow/Home controls. Known, unlinked and supplier references display different example targets; an unlinked target cannot be confirmed until selected. This verifies the comparison only, not a production implementation.

## Verification after a choice

Write focused regression journeys for the approved flow, including contextual Back, visible draft resumption, evidence identity, Save/Next, failure retention, keyboard use and 390/768/1280 px layouts. Prove the relevant regressions on old code, then run the affected checks and required PR CI. Use the normal pre-merge, squash-merge, Pages and live-verification flow.

## Resume

Choose A, B or C with the user. Then update this document and `docs/admin-intelligence.md` with the selected contract before changing production UI. Worktree: `.claude/worktrees/admin-workflow`; branch: `design/admin-workflow`. The prototype, comparison image and this note are the only new files for the comparison. README and the existing admin note record the design status and completed previous release.
