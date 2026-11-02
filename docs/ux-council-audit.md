# Kitchen workflow council audit

2 November 2026. Baseline: `5556366`. This records a bounded engineering, interaction and kitchen-workflow review after the adaptive controls rollout. The selected Chef's Desk design and current access and device contracts remain authoritative.

## Scope and evidence

The council reviewed the app's route and flow families against `CLAUDE.md`, the current feature notes and existing tests. Representative journeys were exercised in local Chromium with the synthetic Firebase fixtures from `tests/lib.js`. No live kitchen records were read or written.

Coverage below distinguishes **Browser** from **Source**. Browser means the stated journey was exercised in this audit, not that every feature or state on that route was tested. Source means code, feature contracts or existing test coverage was inspected. Naming an existing test is not a claim that it was run in this audit. Historical release totals in feature notes are not new verification evidence.

The workflow probes used a 390 by 844 px viewport. The fixture intercepts remote font requests, so these measurements establish interaction behaviour and fixture-layout clearance. They do not establish real-font visual quality, physical touch accuracy or on-device keyboard behaviour. Additional control, table and visual checks are recorded separately below as they complete.

## Council decision

- **Build:** fix reproduced interaction and performance faults, and add focused checks for their behaviour. Keep the existing dependency-free application, shared helpers, native value fields and acknowledged save paths.
- **Simplify:** prioritise repeated kitchen actions and the clarity of the current task. Measure taps, typing and recovery, not only control consistency. A small direct command does not need a modal to match a long catalogue picker.
- **Defer:** redesigns of routes that were only source-reviewed, new data requirements and changes to established business decisions without a reproduced problem or the head chef's choice.
- **Drop:** uniform modal conversion or a full visual rewrite as goals in themselves. Personal prep ticks already take one tap. Shared attribution deliberately asks who prepared the work and keeps that person separate from the recorder.

## Verified workflow observations

Tap counts start on the named open page. They exclude scrolling, focusing a field, typing and PIN entry. They are observed paths through synthetic fixtures, not user research or a comparison with an earlier release.

| Journey at 390 px | Observed result | Cost and implication |
| --- | --- | --- |
| Prep, Add from the recipes, choose Steamed Rice | Exactly one prep line saved with recipe id `rice`. | Two taps when the item is already visible. Preserve direct selection and recipe identity. Search cost was not measured. |
| Personal prep, tick a line's words | The intended line was completed. | One tap. Keep frequent commands direct. |
| Wastage, Logged often, enter amount, Log it | Item, unit, reason and section filled from established values. Amount received focus. One entry saved with the changed amount. | Two taps plus amount entry. Preserve the whole-form suggestion and easy replacement. |
| Wastage, open reason, Escape | Picker closed and focus returned to its trigger. | Cancellation did not submit the form. |
| Supplier order, enter quantity, Review, header Back | The same supplier draft retained `4 kg`. | Two taps for review and return. Back did not record an order. |
| Supplier order, Review, Record | Exactly one order saved with the entered quantity. Draft cleared after acknowledgement. | Two taps plus quantity entry. Record confirms an order placed elsewhere. |
| Admin item evidence, committed search, open item, header Back | Query `Recorded item 1`, ten results and the queue's document scroll position of 1453 px were restored on the council changes. Task heading received focus on entry. | Two taps for detail and return after search. Keep queue context instead of restarting the task. |
| Admin reference review, edit, Back, another chapter, Resume | Original subject and entered label returned. Navigation performed no reference or training writes. Resume remained visible on the People page. | Back retains work; Cancel is the explicit discard action. |
| Shared prep, tick, Others, choose preparer | No completion before the choice. Reported preparer and authenticated recorder remained distinct. | Three taps in this fixture because the preparer was under Others. Do not optimise away the approved attribution boundary. |
| Shared prep, type a draft, Not you? twice, choose another person and enter PIN | First tap retained the draft for confirmation. The next person received empty item and quantity fields. | Three taps plus PIN entry. Voluntary handover clears the previous person's private work. |
| Shared scheduled 04:00 lock and retained work | Existing handover checks passed: original drafts stayed behind the lock, explicit discard cleared them, another person could unlock without inherited values, and pending writes could not be discarded or reassigned. | Ten existing assertions passed in `device-lock-handover.test.js`. Scheduled privacy lock and voluntary handover have different purposes. |

All completed workflow probes recorded no browser errors or document overflow. An initial handover probe used the wrong test selector and timed out; correcting the probe passed. That was a test-driver mistake, not an application finding.

## Findings and acceptance

| Priority | Finding or hypothesis | Required outcome |
| --- | --- | --- |
| P1 | Observed working behaviour: interruption and recovery preserve the task while preventing unacknowledged or reassigned saves. | Changes retain the origin, committed search, queue position, typed values and field focus. Failed saves retain values. Pending saves block unsafe navigation. Back never saves. |
| P1 | Observed working behaviour: several kitchen actions have distinct outcomes despite similar labels. | Apply only fills a draft. Supplier Record confirms an externally placed order. Order done records completion. Delivery received logs temperatures without completing an order. No new inferred quantities, food acceptance limits or training competence. |
| P2 | Documentation drift was found in active recipe, route and admin descriptions. Those passages now follow the current access and device notes. Dated historical decisions remain historical context. This was not a demonstrated access defect. | Reconcile superseded wording with `private-kitchen-access.md` and `device-sessions.md`. Preserve approved roles and device grants. Update `README.md` with shipped behaviour. |
| P2 | Hypothesis: some frequent small choices may cost more effort behind a picker than as visible choices. No previous-release task-cost comparison was made. | Consider direct choices only after measuring a real task. Preserve explicit states, keyboard access and 44 px targets. Keep type-to-find for long choices and windowing for large lists. |
| P2 | Coverage gap: a checked control inventory and past passing suites do not prove end-to-end discovery or readability on every route. | Keep this coverage matrix honest. Review remaining journeys before claiming a whole-app hands-on audit. Use representative complete tasks, current fixtures, real-font captures and enlarged text. |

Newly reproduced control and table findings, implementation decisions, before-and-after measurements and final release checks belong in the change record below. Keep security findings in private artifacts as required by `CLAUDE.md`.

## Route and flow coverage

Test names below omit `.test.js`. They are pointers to existing coverage, not a list of tests executed in this audit. **Browser + Source** applies only to the representative task stated in the workflow observations.

| Route or flow family | Audit coverage | Contract and existing coverage pointers |
| --- | --- | --- |
| Landing, `#/recipes`, `#/r/...` | Source | Public recipe reading; search, filters, component trail and shelf return. `recipes`, `recipe-filters`, `recipe-multiplier`, `back-navigation`; `docs/recipe-multiplier.md`, `docs/navigation.md`. |
| `#/manage`, recipe forms | Source | Head and sous recipe management, device drafts, version guards and immutable history. `manage`, `head-chef`, `overlay`, `keep-typed-editors`, `device-editor-lock`; `docs/private-kitchen-access.md`. |
| Drawing editor and library | Source | Plate/pan/side/build selection, reuse, matching and retained same-person work. `draw`, `library`, `reuse`, `smart`, `autodraw`, `editor-navigation`, `device-editor-lock`. |
| `#/prep` | Browser + Source | Recipe addition, personal tick, shared attribution and handover exercised. Manual add, Quick add, Undo, duplicate merging and rollover remain covered by existing `prep-first`, `prep-speed`, `fill-in`, `double-ups`, `prep-attribution`, `device-prep-lock`; `docs/shared-prep-attribution.md`. |
| `#/orders` and reminders | Source | Requests, ordered ticks, Undo, rollover and supplier completion boundaries. `order-rollover`, `order-learning`, `order-cutoffs`, `supplier-reminder-done`, `offline-writes`. |
| `#/waste` | Browser + Source | Repeat entry and reason cancellation exercised. Other amounts, units, large-amount confirmation, failures and review conflicts: `waste-order-entry`, `fill-in`, `keep`, `closing-waste`, `waste-week`, `keep-typed-pages`. |
| `#/transfers` | Source | Venue movements, loans and returns; open loans do not grant historical access. `transfers`, `transfer-returns`, `roles`; `docs/transfer-returns.md`. |
| `#/suppliers...`, order/history/review | Browser + Source | Quantity, review, Back and acknowledged recording exercised. History, suggestions, retries and unit snapshots: `supplier-workspace`, `supplier-orders`, `supplier-quantity-entry`, `supplier-navigation`, `device-supplier-lock`; `docs/supplier-workspace.md`. |
| Supplier catalogue/settings/import | Source | Source names and original pars, blank versus zero, revision conflicts and retained forms. `supplier-workspace`, `supplier-core`, `supplier-module-version`, `supplier-cutoff-readiness`; `docs/supplier-workspace.md`. |
| `#/deliveries` | Source | All personal roles may record today's immutable receipt. Null and zero differ. Retry retains id. `deliveries`, `device-delivery-lock`, rules `deliveries`; `docs/delivery-received.md`. |
| `#/fn`, `#/fn/now`, `#/fn/<id>` | Source | Schedule, service rounds, read permissions and printing a labelled snapshot. `functions`, `fn-prep-feed`, `function-print`, `function-prep-print`; `docs/function-printing.md`. |
| `#/functions...` | Source | Authorised booking, review, cancellation/Undo, generated prep and recoverable removal. `functions`, `function-cancel`, `function-list-actions`, `rollover-fn-day`; `docs/function-cancellation.md`, `docs/private-kitchen-access.md`. |
| `#/guides`, `#/guides/<id>` | Source | Search, cached versions, zoom, return and feature visibility. `guides`, `admin-bundled-guides`, `food-safety-guide`, `smoker-batches`, `overlays-back`. |
| `#/minutes`, register/editor | Source | Published-version reading, immutable sign-off, private drafts and acknowledged publishing. `minutes-sign`, `minutes-publish`, `minutes-version`, `minutes-older`, `minutes-template`. |
| Shift pings, bell and editor | Source | Recipient-specific messages, expiry and one-sheet-at-a-time sequencing. `shift-pings`, `ping-recipients`, `ping-life`, `ping-times`, `ping-author`; `docs/ping-recipients.md`. |
| `#/mail` | Source | Sender status, authorised inbox access and private draft clearing. `mail`, `shared-tablet-chef`, `failed-reads`; README Kitchen mail. |
| `#/drinks` | Source | Own usual drink, grouped run, no automatic order or editing for another person. `drinks`, `shift-start`, `keep-typed-pages`; README Drinks run. |
| `#/todo` | Source | Head/sous jobs, due/assignee filters, tick, remove/Undo and bounded refresh. `todo`, `page-roles`, `read-budget`; README Chef to-do. |
| Admin Review desk and Saved records | Browser + Source | Evidence Back, draft Resume and navigation without writes exercised. Acknowledged saves, training scope and revisions: `admin-review-desk`, `admin-intelligence`, `admin-intelligence-refresh`, `admin-chefs-desk`; `docs/admin-intelligence.md`, `docs/admin-design-options/brief.md`. |
| Admin reports and history | Source | Complete-dataset filtering/sorting, stable chronological coordinates and truthful exports. `charts`, `wastage-history`, `admin-learning-clarity`, `insights-first`, `read-budget`; `docs/wastage-history.md`. |
| Admin Operations, Settings and People | Source | Staff/PIN changes, sections, conflicts, backups and kitchen-PIN migration. People was visited only to test cross-chapter Resume, not audited in full. `admin-tools`, `staff-draft`, `people-safety`, `people-ids`, `kitchen-sections`, `admin-chefs-desk`. |
| Admin proofreader | Source | Atomic manual repairs, protected words and private immutable history. `proofreader-admin`, `proofreader-cache`, rules `proofreader`; `docs/proofreader-admin.md`. |
| Settings, device choice and sign-in | Browser + Source | Voluntary shared handover and daily-lock safeguards exercised. Setup, personal binding, owner recovery and all-role matrix remain source-reviewed. `device-choice`, `device-sessions`, `device-lock-handover`, `device-head-recovery`, rules `device-auth`; `docs/device-sessions.md`. |
| Offline, updates and work recovery | Browser + Source | Existing daily-lock handover test exercised retained drafts and pending-write guards. Full offline/update journeys were not rerun. `device-work-recovery`, `device-revoked-work`, `offline-open`, `offline-reads`, `offline-writes`, `update-confirmation`, `saved-copy`, `sign-out-sent`. |
| Shared controls and accessibility | Browser + Source | Reason Escape/focus, task heading focus, fixture overflow and representative tap costs exercised. Full keyboard/screen-reader, text-size and viewport matrix remain separate checks. `adaptive-controls`, `screen-reader`, `targets`, `wide-font`, `sticky-bars`, `roles`, `page-roles`, `local-back-navigation`; `docs/adaptive-controls.md`. |

## Non-negotiable review gates

- Use current role contracts. Remembered owner Google authentication alone grants no operational access: admin also needs this device's valid head PIN session and matching grant. Device choice never grants a role. Public recipes remain public.
- Scheduled privacy locks retain the original person's work. Deliberate handover clears it after explicit confirmation. Unsent or uncertain writes cannot be discarded, replayed as another person or labelled saved before acknowledgement.
- Loading, no signal, refused reads, empty data and no search matches are distinct states. Failed or incomplete reads must not become empty saved copies or complete reports. Saved references remain accessible if an activity summary fails.
- Filter and sort the complete dataset before pagination. Keep source identity, explicit assessment scope, numeric/date meaning, selected filters and chronological matrix coordinates. Reset and empty-state recovery remain visible.
- Keep Queensland time, Australian English, short on-line wording, confirmed kitchen values, existing book typography and one shared navigation system. Use 44 px targets and verify 390, 768 and 1280 px, enlarged text, focus, dismissal and fixed-action clearance for changed surfaces.
- Add no polling, per-row reads, private persistent caches, dependencies or altered write paths for a presentation change. Run the relevant read-budget, role, offline and targeted regression checks. Shipping still requires the full repository gates in `CLAUDE.md`.

## Change and verification record

Workflow verification: a bounded local probe completed the journeys above with synthetic Firebase. All 29 assertions passed when rerun against the council changes, including the single Analysis search. The existing `device-lock-handover.test.js` passed all ten assertions. The probe and its result files are temporary local audit artifacts, not production assets or a replacement for committed regression tests.

### Reproduced faults and repairs

| Finding | Before | Repair and focused evidence |
| --- | --- | --- |
| Picker triggers hid their current value from the accessible name; focus could start on a different option. | Dedicated control suite: 21 failures of 40 across the combined faults below. | Field and value are announced together. Compact initial focus and keyboard cursor agree; extended lists place the current selection in view. |
| Long extended options clipped at large text sizes, including windowed lists. | Fixed 56 px rows hid wrapped lines. | Natural row heights are measured only in the visible window. Item identities retain measurements through filtering; width or text-size changes invalidate them. Largest-text real-font checks pass at 390, 768 and 1280 px. |
| A replacement search explained retained results only in a placeholder. | The explanation could disappear while typing or truncate in a narrow field. | Persistent text beneath the field is also associated with the input for assistive technology. Explicit refocus, two-character replacement, Enter, accidental-blur restoration and Clear behaviour remain. |
| Static reports searched cell text without current form values and lacked clear empty recovery. | A displayed edited value could not be found. | Search reads current displayed values. Reports show matching row counts and an explicit recovery action when no rows match. The final combined control suite passes all 52 assertions after these repairs and the focus, viewport and pending-draft follow-ups below. |
| Analysis had two independent search queries on one list. | Six of 18 dedicated assertions failed: two search boxes and incomplete Reset All recovery at all three widths. | One shared committed query controls the queue. All 33 final assertions pass, including reset, Clear, contextual Back, case/whitespace normalisation and zero reads for local search/reset. Review caught and corrected three failing normalisation checks during consolidation. Deferred filtering now retains typing focus and Enter keeps the committed results. Existing review-desk checks pass 69 of 69. |
| LV header sorting parsed rendered HTML repeatedly inside comparisons. | A 240-record numeric sort parsed cells 3,118 times; a custom accessor ran 3,022 times. Four of 20 dedicated assertions failed. | Each filtered row gets one fresh typed key per sort: 240 parses or accessor calls. Amount rendering fell from 3,133 to 255 calls, including the visible page. All 20 assertions pass, including number/date/boolean order, ties, empty policy, pagination, edits and zero additional reads. This measures work, not device latency. Custom predefined comparators are unchanged. |

The independent implementation review found two further picker faults: scrolling could evict the focused option and leave focus on the document body, and a long selected row could open partly outside the phone viewport with fallback fonts. Three of 45 control checks failed before these follow-up fixes. The list now retains keyboard focus and logical option identity when a row leaves the rendered window, and target rows scroll into view using measured geometry. Those 45 checks passed before the later search-redraw checks extended the suite to 52.

The first full local run passed 174 files and exposed a load-sensitive analysis-search failure. A focused regression then reproduced the underlying fault at all three widths: the record field lacked the existing redraw identity, so deferred filtering lost focus. Adding the identity also exposed the need to distinguish deliberate focus restoration from user refocus. The shared focus-restoration helper now retains the query and cursor during own and unrelated redraws; true blur/refocus still starts a replacement search. A further check reproduced one failure of 50 when a redraw cancelled an actually pending draft. The replacement field now receives that request with its original debounce deadline, while reset, explicit replacement and composition cancel it as before. The short-draft follow-up reproduced one failure of 52: a one-character replacement was mistaken for a deliberate blur during a redraw. The host now marks only the old focused field during replacement and clears that marker in finally. Real blur restoration stays unchanged. All 52 shared-control and 33 analysis assertions pass. Six concurrent copies of the preceding 27-check analysis suite also passed. These changes use the current host redraw and shared search state, without new reads or polling.

The first GitHub run passed the other 174 files but found a detached element handle in the new picker geometry check. That assertion now queries the current row and list in one synchronous page evaluation, retaining the full viewport bounds check.

### Visual and workflow evidence

Actual Barlow 400/600/700, Barlow Condensed 700 and Caveat 700 fonts were loaded from temporary local test resources and confirmed through the browser FontFaceSet. Largest-text captures use synthetic ingredient names. The selected virtual option 149 is inside the list viewport; pointer scrolling reaches option 159. These checks add no production font or dependency.

[Phone picker](images/council-controls-390.png), [tablet picker](images/council-controls-768.png) and [desktop picker](images/council-controls-1280.png) show wrapping labels in the existing Chef's Desk language.

The complete bounded workflow probe passed 29 of 29 checks after the single-search repair. Existing daily-lock handover checks passed ten of ten. Existing adaptive-control and Chef's Desk regressions passed 79 and 106 checks. Read budgets passed all nine checks: first staff open 662/680, summaries 283/300, reload 23/40, first admin 632/760 and second admin 44/60.

### Release gates and limits

The associated pull request records final full browser, Firestore emulator and nightly-processing checks, deployment and live results. No rules, backend, schema, role, write contract, private cache or production dependency changes are required. Revert the client changes through a normal PR if needed; there is no data migration to reverse.

This audit does not claim real-device user research, screen-reader speech testing, mobile OS keyboard testing or hands-on coverage of every route. The route matrix intentionally distinguishes this council's representative browser probes from source review and the broader existing regression suite.
