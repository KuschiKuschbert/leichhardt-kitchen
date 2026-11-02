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
| Analysis had two independent search queries on one list. | Six of 18 dedicated assertions failed: two search boxes and incomplete Reset All recovery at all three widths. | One shared committed query controls the queue. All 36 final assertions pass, including reset, Clear, contextual Back, case/whitespace normalisation and zero reads for local search/reset. Review caught and corrected three failing normalisation checks during consolidation. Deferred filtering now retains typing focus and Enter keeps the committed results. Existing review-desk checks pass 69 of 69. |
| LV header sorting parsed rendered HTML repeatedly inside comparisons. | A 240-record numeric sort parsed cells 3,118 times; a custom accessor ran 3,022 times. Four of 20 dedicated assertions failed. | Each filtered row gets one fresh typed key per sort: 240 parses or accessor calls. Amount rendering fell from 3,133 to 255 calls, including the visible page. All 20 assertions pass, including number/date/boolean order, ties, empty policy, pagination, edits and zero additional reads. This measures work, not device latency. Custom predefined comparators are unchanged. |

The independent implementation review found two further picker faults: scrolling could evict the focused option and leave focus on the document body, and a long selected row could open partly outside the phone viewport with fallback fonts. Three of 45 control checks failed before these follow-up fixes. The list now retains keyboard focus and logical option identity when a row leaves the rendered window, and target rows scroll into view using measured geometry. Those 45 checks passed before the later search-redraw checks extended the suite to 52.

The first full local run passed 174 files and exposed a load-sensitive analysis-search failure. A focused regression then reproduced the underlying fault at all three widths: the record field lacked the existing redraw identity, so deferred filtering lost focus. Adding the identity also exposed the need to distinguish deliberate focus restoration from user refocus. The shared focus-restoration helper now retains the query and cursor during own and unrelated redraws; true blur/refocus still starts a replacement search. A further check reproduced one failure of 50 when a redraw cancelled an actually pending draft. The replacement field now receives that request with its original debounce deadline, while reset, explicit replacement and composition cancel it as before. The short-draft follow-up reproduced one failure of 52: a one-character replacement was mistaken for a deliberate blur during a redraw. The host now marks only the old focused field during replacement and clears that marker in finally. Real blur restoration stays unchanged. All 52 shared-control and 36 analysis assertions pass. Six concurrent copies of the preceding 27-check analysis suite also passed. These changes use the current host redraw and shared search state, without new reads or polling.

The first GitHub run passed the other 174 files but found a detached element handle in the new picker geometry check. That assertion now queries the current row and list in one synchronous page evaluation, retaining the full viewport bounds check.

### Intentional reset integration

Pending drafts survive an ordinary redraw. A deliberate clear must cancel them. The final integration sweep checked the reachable clear, reveal and task-completion paths and reused `LK_UX.resetSearch` before their model resets.

| Path | Fail-before | Final focused result |
| --- | --- | --- |
| Analysis Reset All with a pending query and active sort | 3 of 36 failed | 36 of 36 analysis checks pass. |
| Add a person while a list query is pending | 2 of 23 failed | 23 of 23 table checks pass. The new row stays visible and focused, with no extra reads. |
| Supplier Review revealing a quantity or stock error | 2 of 50 failed | 50 of 50 quantity checks pass. All 12 supplier-related files pass, 512 assertions. Invalid fields remain visible and focused after the debounce, with other quantities and stock Details preserved. |
| Recipe and Wastage Clear actions | 2 of 15 failed | 15 of 15 page reset checks pass. Guides already passed its category-scoped reset and remains covered. All three resets add zero reads; selected Wastage dates remain unchanged. |
| Drawing Swap and ingredient Add, then library reopen | 12 of 36 failed | 36 of 36 drawing reset checks pass at all three widths. Drawing, autodraw and reuse regressions also pass, 182 assertions across four files. Fixtures stay unsaved. |

Ordinary LV and static-table reset paths already used the shared reset and remained correct. Route initialisation uses the existing hash-change cancellation. Source classification distinguished those paths from reachable intentional clears rather than changing every empty-string assignment.

### Visual and workflow evidence

Actual Barlow 400/600/700, Barlow Condensed 700 and Caveat 700 fonts were loaded from temporary local test resources and confirmed through the browser FontFaceSet. Largest-text captures use synthetic ingredient names. The selected virtual option 149 is inside the list viewport; pointer scrolling reaches option 159. These checks add no production font or dependency.

[Phone picker](images/council-controls-390.png), [tablet picker](images/council-controls-768.png) and [desktop picker](images/council-controls-1280.png) show wrapping labels in the existing Chef's Desk language.

The complete bounded workflow probe passed 29 of 29 checks after the single-search repair. Existing daily-lock handover checks passed ten of ten. Existing adaptive-control and Chef's Desk regressions passed 79 and 106 checks. Read budgets passed all nine checks: first staff open 662/680, summaries 283/300, reload 23/40, first admin 632/760 and second admin 44/60.

### Release gates and limits

The associated pull request records final full browser, Firestore emulator and nightly-processing checks, deployment and live results. No rules, backend, schema, role, write contract, private cache or production dependency changes are required. Revert the client changes through a normal PR if needed; there is no data migration to reverse.

This audit does not claim real-device user research, screen-reader speech testing, mobile OS keyboard testing or hands-on coverage of every route. The route matrix intentionally distinguishes this council's representative browser probes from source review and the broader existing regression suite.


## Whole-app audit first delivery

2 November 2026, Queensland time. The first delivery recorded discovery and design review before implementation. The owner subsequently approved the recommended repair plan and selected narrow Prep option A on 2 November 2026. Preserve the baseline below as audit evidence; each repair needs its own final checks and release state.

### Source and release baseline

- Audited application commit: `b712b0ab5aa1aa8e6552761a55873fd3752d0ee6`. Reconciled with `95525c6644b86e0780a9163c22fe54efd9fe2b5a`, which merged the execution brief in #441. The application, tests, rules, jobs and workflows are byte-identical between these commits.
- Isolated branch/worktree: `docs/whole-app-audit-20261102`, created for this audit. The original checkout and other worktrees were preserved.
- #440 is merged. Its repaired picker/search/table findings are preserved as historical evidence, then checked through current regression tests. #430 remains a historical design draft explicitly excluded from production. #441 merged during this audit.
- Pages deployment and Live click tests succeeded for both `b712b0ab` and the documentation-only `95525c6`. The earlier PR #441 required Node 22 CI also passed. [Current live check](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41382718584), [current Pages deployment](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41382667823), [earlier required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41380646157). Seven public deployed files, including the entrypoint, service worker, app, prep, controls, device module and stylesheet, match that commit by SHA-256. This is a bounded static-client check.
- The current revision's green Publish rules workflow skipped its publish job. The last inspected actual publication and post-publish Lock probe succeeded at `e121c393`; the rules file is unchanged since then. The later independent signed-out Lock probe also succeeded. These are separate evidence from a full live role matrix, which was not run.
- Initial shell network and loopback attempts failed in the default sandbox. Approved socket access allowed the ordinary configured proxy, local Chromium and emulators to run. No network bypass or production kitchen data was used.

### Verified stack and source map

| Boundary | Actual implementation | Main source |
| --- | --- | --- |
| Client | Plain HTML/CSS/JavaScript, hash router, ordered scripts, lazy feature modules, no production build | `index.html`, `js/app.js`, `js/prep.js` |
| Public recipe/drawing overlay | Static book plus public mirrors, revision handling and SVG cleaning | `js/data.js`, `js/art.js`, `js/overlay.js` |
| Private operations | Firebase web SDK 10.14.1, anonymous operational device, separate Google identity, daily PIN session and matching admin grant | `js/prep.js`, `js/device.js`, `firestore.rules`, current access/device notes |
| Shared controls | Existing adaptive pickers, committed search, report tables and managed sheets | `js/controls.js`, `docs/adaptive-controls.md` |
| Suppliers/functions/deliveries/admin | Lazy feature screens plus eager Functions schedule helper, with feature-specific data/acknowledgement contracts | `js/suppliers.js`, `js/supplier-core.js`, `js/supplier-store.js`, `js/functions.js`, `js/fnedit.js`, `js/deliveries.js`, `js/admin-intelligence.js`, `js/proofreader-admin.js` |
| Offline/update | GitHub Pages, manifest, service worker, two workerless fallback lists and guarded update controller | `sw.js`, `js/upkeep.js`, `manifest.webmanifest` |
| PDF runtime and browser tooling | Guides imports pdfjs-dist 4.10.38 from the allowed CDN; the test tree also pins it. Browser runner uses playwright-core 1.48.2 | `js/prep.js:7401`, `tests/package.json`, lockfile and CSP |
| Rules tooling | rules-unit-testing 3.0.4, Firebase 10.14.1, Firebase Tools 13.29.1 | `tests/rules/package.json` and lockfile |
| Privileged jobs | firebase-admin 12.7.0, scheduled learning/analysis/backup/cutoff jobs | `scripts/package.json`, `.github/workflows/` |
| Required CI | Node 22, Java 21, syntax, browser, rules and five processing checks in Click tests | `.github/workflows/pr-tests.yml` |

Installed tooling versions match the manifests above. Local runs use Node 24.19.0, npm 11.9.0, Java 21 and Chromium 154. Exact-revision Node 22 CI remains a separate release gate. SDKs/fonts loaded from remote resources are runtime dependencies even though there is no production npm install. There is no basis for a framework, database or build-system migration.

### Baseline execution

- JavaScript syntax: passed for the required production file glob.
- Browser suite: 175 of 177 files passed; full run exited 1 after 30.9 minutes with JOBS=4. `admin-tools.test.js` timed out waiting for the PIN-copy operation at line 51. `offline-writes.test.js` recorded one failure of 266 when step 22 tried to set a fixture mode after its object was unavailable. These are unchanged-baseline failures, not regressions from this documentation work. Unchanged serial reruns then passed both files, exit 0, with 46 Admin tools and 273 offline-write assertions in 5.5 minutes. This does not make the original full run green or establish its root cause. Earlier exact-code Node 22 CI for #441 also passed.
- Rules: all 13 named suites passed, exit 0.
- Processing: all five required learning/index/range/backup/analysis checks passed on the demo emulator, exit 0. These privileged-job checks are separate from the client-rules suite.
- Dependencies reused from the existing checkout after verifying exact installed versions; no installation or lockfile mutation was required. Security/advisory applicability is recorded privately.

Fresh rules baseline: all 13 named suites completed, exit 0. The client-shape matrix passed 174 rows and 1,566 calls across nine sign-ins, with one explicitly known waived client request. Passing expectations are not proof that the expectations themselves are correct. The private review evaluated that distinction separately.

Fresh exploratory responsive sweep: 36 synthetic contexts, 18 route entries at 320 by 740 and 568 by 320 landscape with Extra large text, zero browser errors and zero document overflow. A visible-control naming heuristic found no unnamed controls; this is not a full accessible-name audit. Six delivery-keyboard failures and the narrow Prep readability fault were reproduced separately. A further 16 actual-font contexts loaded and verified all five required font faces with zero browser errors or document overflow; the narrow Prep problem persisted.

The browser harness substitutes Firebase and normally intercepts font requests. A green browser suite establishes the tested interface/model paths, including its 390/768/1280 px checks. It does not establish actual Firebase authorisation, real-font geometry, screen-reader speech or physical-device behaviour. The emulator checks actual source rules against synthetic identities. Neither check proves production console settings or real-service persistence.

The [route inventory](whole-app-inventory.md) expands the earlier council's 25 broad families into 30 granular families without replacing their feature contracts. Every family is source reviewed. The fresh automated coverage matrix maps regression and emulator evidence per family. Exploratory narrow/large-text, keyboard and update-strip probes are additional evidence, rather than an implication that every state was manually exercised.

### Prioritised public findings

The private security register and its reproductions are deliberately absent from this public document. Implementation priority must also consider that private review.

| ID / priority | Expected and actual behaviour | Evidence and confidence | Proposed outcome and regression check |
| --- | --- | --- | --- |
| WA-01 / P1 | An unsuccessful shell update must leave a complete previous generation. A failed cache write instead leaves most files new and the failed file old, although the update reports failure. | Exact-source isolated service-worker VM: rejecting the Prep cache write left 18 entries new and Prep old. `sw.js:52-66`. High. | Repair generation publication, preserving last-good shell on failed fetch or cache write. Inject write failure and verify every shell entry still belongs to one complete generation; cover browser restart/offline launch. |
| WA-02 / P1 | A timed-out round must never overwrite a newer successful round. Releasing the old round after round 2 succeeds restores the older app file. | Exact-source VM with controlled delayed response. `sw.js:31-37`, `:52-66`. High. | Give rounds ownership/cancellation and safe publication. Prove obsolete rounds cannot publish, notify success or overwrite newer files; preserve workerless/old-worker behaviour. |
| WA-03 / P1 | Cache healing must protect typed and unacknowledged work before terminating the SDK. It currently terminates, consumes its daily attempt and tries reload with pending/dirty work. | Independent synthetic browser probes reproduce termination before the native unload safeguard. With that safeguard deliberately unavailable, a dirty form reloads empty. `js/prep.js:117-126`. High for this path; no production transaction loss claimed. | Guard termination itself, server availability and work changing during the async check. Preserve recorder/attempt identity and successful clean recovery; test without relying on native unload prompts. |
| WA-04 / P2 | Read-budget tests should model the real memory-only cache. The stand-in carries read-cache markers through reload and understates repeat-admin server reads. | Exact-source read-budget probe clearing only fake read-cache markers: repeat admin 219 reads against a 60-read budget. `pastRead()`, `tests/fake/`, `tests/read-budget.test.js`. High for fixture discrepancy. | Make the model truthful, measure the resulting cost and optimise bounded queries/summaries only if justified. Do not add persistent private reports or raise a budget silently. |
| WA-05 / P2 | Large text must leave task names readable at narrow widths. At 320 px with Extra large text, Make gravy receives 13.94 px width and a 363 px text block; the row is 370 px tall despite no overflow. | Actual Prep DOM and current CSS, synthetic data, fallback fonts. Action cluster 171.06 px plus 44 px tick with fallback fonts. With all five actual app font faces verified, the same 320 px case still has a 32.20 px text column and a 271 px row. High within these setups. | Choose one of three constrained row-reflow options. Keep existing normal-width Prep, every action, attribution, amounts and Undo. Verify 320/390/768/1280, real/fallback fonts and large text before shipping. |
| WA-06 / P2 | Small warning/status text needs applicable text contrast. White normal 16 px safety text on #E2602A is 3.535:1; a 15 px bold Finished badge on #2E8B57 is 4.245:1. | Computed current styles at required widths, WCAG luminance calculation. `css/app.css:134`, `:150`. High for sampled elements. | Use existing semantic tokens with sufficient contrast, preserving appearance and layout. Existing action orange #C2451A gives white text 5.048:1. Check all consumers and states rather than replacing the brand accent everywhere. |
| WA-07 / P2 | Invalid delivery submission should retain keyboard context and identify the field. Empty supplier and invalid chilled submissions redraw focus onto BODY. | Six synthetic keyboard cases across 390/768/1280, values retained and zero writes. `js/deliveries.js:71`, `:83`, `:140`. High. | Focus the first invalid field and associate its error; retain values, retry id, null/zero and negative temperatures. This is a keyboard-recovery defect; no blanket WCAG-failure claim. |
| WA-08 / P2 | Current working guidance should state one access/session contract. README retains kitchen-PIN-only reading, destructive idle-lock wording and an incompatible persistent-report-cache suggestion. | README current guidance near 325/332/780/817 versus current access/device notes. High. | Reconcile current wording and identify historical decisions clearly. Do not change rules or privacy behaviour to fit old prose. |
| WA-09 / P3 | A focused test command matching no files should fail clearly. It exits 0 with All 0 test files passed. | Actual deliberately unmatched filter; `tests/run.js:16`, `:41-44`. High. | Fail before browser startup for unmatched supplied filters; preserve existing substring and multiple-filter selection. Required unfiltered CI currently selects all files. |
| WA-10 / P3 | Editor confirmation/toast helpers should share the existing compatible contract. Manage/Functions still duplicate helpers already shared by other consumers. | Source and acknowledged README backlog. `js/manage.js:38-55`, `js/fnedit.js:33-47`. High for duplication, no user defect proven. | Defer consolidation behind reliability. Preserve old cached-module fallback, API compatibility, arm timing, focus, Undo and action identity. |
| WA-11 / P3 | Functions-only login should avoid an activity write known to be prohibited. The client sends and drops the refusal; the test matrix carries a known exception without a concrete repair PR. | `tests/rules/client-shapes.test.mjs:319-322`, current `bump()` versus `resume()`. Source confirmed. | Skip the unnecessary write, preserve login and permitted delivery/booking work, and replace the waiver with a meaningful regression. |
| WA-12 / P2 verification | The required browser gate must reliably exercise its selected journeys. The full unchanged local baseline failed two files. Root cause is not established by either error alone. | Complete 177-file run, 175 passed, two failed; Node 24 with concurrent audit load. High for failures, unknown cause. | Preserve the initial results, retain the passing unchanged serial rerun and compare exact-final-revision Node 22 CI. Do not increase timeouts, weaken checks or declare a UI defect from a fixture error alone. |


| Finding group | Route and role | Decision / effort estimate | Frequency, dependency and regression risk |
| --- | --- | --- | --- |
| WA-01/02 | Public shell and every installed client | Repair / medium | Exceptional storage/timeout conditions; high compatibility risk across worker versions. Needs complete-generation and stale-round tests. No data migration. |
| WA-03 | Signed-in kitchen work and editors | Repair / medium | Recognised cache faults; medium recovery risk. Must protect the same recorder and uncertain acknowledgement before terminating. |
| WA-04 | Admin historical reports | Repair evidence first / small, then measure | Repeat full reload; low risk for model correction, medium for runtime changes. Current private-cache policy is a dependency. |
| WA-05 | Prep at narrow/large-text widths, every permitted reader | Design repair / small to medium | Every row in the affected viewport; medium shared-CSS risk. Owner choice and full action parity required. |
| WA-06/07 | Recipe warnings/statuses and all delivery-recorder roles | Repair / small each | Repeated reading and validation recovery; low to medium shared-token/focus risk. Keep immutable receipt semantics. |
| WA-08/09/11 | Engineering handoff, test runner and functions-only startup | Repair / small independent units | Each affected handoff/test/login; low risk with targeted checks. No new reads or permission expansion. |
| WA-10 | Recipe and function editors | Consolidate implementation later / medium | Maintenance and repeated editor feedback; medium old-module compatibility risk. Preserve current semantics. |

Effort labels are engineering estimates, not commitments. Each approved unit is independently reversible through a normal PR, subject to retaining current work and access protection.

These findings distinguish demonstrated failures from maintenance opportunities. No claim is made that the application is regression-free, fully secure, ASVS compliant or faster.

### Independent council decisions

Five independent review workstreams covered operations/product, visual/usability/accessibility, security/data integrity, architecture/performance, and quality/release. The lead reconciled their evidence; this is engineering analysis, not invented staff research. A separate designer prepared the constrained narrow-row alternatives.

- Preserve the selected Chef's Desk, familiar Prep layout, public book, existing plain-JavaScript architecture and all distinct operational outcomes.
- Repair work-preservation and update-generation faults before cosmetic or helper consolidation work. The security workstream adds private priorities to that order.
- Repair the narrow/large-text row after the owner selects an alternative. Fix sampled contrast and keyboard-error recovery within current layouts.
- Make cache/read-budget modelling truthful before choosing a performance intervention. The old suggestion to persist private reports conflicts with the current privacy contract and is not accepted as an automatic fix.
- Consolidate repeated implementation only when behaviour and old-client compatibility are proven equivalent. Keep Apply suggestion, Record order, Mark order done and Record delivery distinct.
- Defer capability removal, full-app redesign, new services and changes to recipe amounts or kitchen policy. No operational removal is recommended.

Frequency is inferred from the affected path, not staff interviews: common rendering/keyboard use for the accessibility findings; repeat admin reload for read cost; exceptional cache/storage/timeouts for recovery findings. Rare recovery faults still have high impact because they can interrupt service work.

### Controls and visual contract proposed for implementation

Retain Barlow body text, Barlow Condensed headings, Caveat notes, warm paper, charcoal, orange, the existing 8 px action and pill selection radii. Use computed tokens rather than copying colours into new rules.

| Variant | Purpose and wording | Required states and exceptions |
| --- | --- | --- |
| Primary | One main acknowledged outcome, such as Save changes, Record delivery or Record order | Visible word label, working/loading lock, success only after acknowledgement, retained input on failure; existing action token and contrast |
| Secondary | Review, Keep editing, Back to orders | Clear destination, normal action shape, keyboard focus; Back never saves |
| Quiet | Cancel editing, Show more, contextual secondary work | Discoverable text, same focus/disabled/error discipline; no routine new confirmation |
| Destructive | Delete function, Remove item | Semantic danger distinct from Save; preserve each action's existing arm/Undo or protected removal contract |
| Selection | A filter, tab, date, person or unit | Preserve selection semantics and pill geometry; accessible name includes current value; not styled as a destructive or saving command |
| Compact/table | Dense repeated actions with a demonstrated space need | Keep 44/48 px kitchen targets where practical; verify WCAG 24 px minimum or valid exceptions; never hide the focused control under sticky bars |

All variants retain focus, hover, pressed, disabled and loading states and associated errors/status announcements. Icon-only controls need an accessible name. Preserve one managed sheet, Escape/backdrop/Cancel, focus return, and existing unsaved-work guards. The proposal is a migration contract for approved units, not permission to restyle every button.

### Concrete narrow-row design comparison



The standalone preview delivered with this audit places the current component next to these alternatives. It embeds the actual current app stylesheet and the five existing app font resources, with synthetic row markup and local demonstration handlers. The original full-screen current screenshot remains the authoritative screen baseline. The prototype is a row component, not a replacement Prep screen or production integration.

| Option | Hierarchy and interaction | Personal tick / priority / recipe / More | Decisive tradeoff |
| --- | --- | --- | --- |
| **A: actions below, recommended** | Keep the tick gutter beside the name. Amount and marks wrap below the name. Move the existing action group beneath the text. | 1 / 1 / 1 / 1 taps. Remove stays inside the existing More path. | Least movement of the main tick interaction. All current commands remain visible and direct. Rows deliberately grow to preserve readable text. |
| **B: text first, commands below** | Give the name the complete row width, then put the tick button and existing commands in a lower command rail. Tapping the name still ticks. | 1 / 1 / 1 / 1 taps. | Maximum uninterrupted text width, but the keyboard tick button moves below the words and changes the familiar checkbox position. |
| **C: tick and details** | Keep a tick gutter, name and explicit More button. Put Recipe and priority in a native, explicitly labelled disclosure beneath the name. | 1 / 2 / 2 / 1 taps when details are closed. | More primary text room and quieter action density, with an extra step and disclosure state for recipe/priority access. |

At 768 and 1280 px, all three prototypes leave the existing wide row CSS in effect. At 390 px with normal text they also preserve the current layout. The proposed exception is at widths below 360 px, plus Extra large text below 600 px. These are prototype breakpoints drawn from the reproduced cases, not a claim that the final production breakpoint has been selected. The chosen implementation must test adjacent widths and actual content before finalising them.

### Comparable measurements

All measurements below use the same synthetic `Make gravy / 5 L / Rolled` row, 320 CSS px viewport and Extra large text. Prototype baseline matches the actual app's measured narrow-row values after aligning its wrapper. The previews include an additional long synthetic name to expose wrapping, with no line truncation or hidden amount.

| Font state | Current: text / row | A: text / row | B: text / row | C: text / row |
| --- | --- | --- | --- | --- |
| Fallback | 13.94 / 370 px | 187 / 167.5 px | 238 / 168.5 px | 136 / 201.5 px |
| Existing app fonts | 32.20 / 271 px | 187 / 164 px | 238 / 166.5 px | 136 / 166.5 px |

These are component geometry measurements. They do not measure task completion time, field usability, physical touch accuracy or a production performance improvement. The wider component previews retain the current row arrangement; they do not reproduce the entire desktop book and its surrounding panels.



The owner selected A on 2 November 2026 because it preserves the tick location and every direct action. The row component was checked in 35 geometry/font/state captures, including 320/390/768/1280 and actual/fallback fonts. No browser errors or component overflow occurred in those checks. Local demo toggles do not prove real saves, permissions or shared-screen attribution.

Current and alternative actual-font component captures: [current](images/whole-app-prep-current-320.png), [A](images/whole-app-prep-a-320.png), [B](images/whole-app-prep-b-320.png), [C](images/whole-app-prep-c-320.png).

The alternatives are isolated synthetic previews. They cannot log in, write kitchen data or replace the live app. Selection authorises only the constrained narrow/large-text reflow; it does not reopen the approved normal Prep or admin design.

### Measured performance and cost

The 20-entry public shell has 3,290,659 bytes across 19 local assets, excluding the duplicate root navigation alias, with 679,025 bytes as the sum of separate gzip-9 files. This is a static estimate, not observed transfer size. Art is 1,580,976 / 196,067 bytes raw/gzip, Prep 890,307 / 255,796, and CSS 246,131 / 48,324. Earlier prose sizes are historical. Keep the measured prior art-deferral decision until a new controlled experiment changes its conclusion.

Six repeated diagnostic runs used a 390 by 844 px synthetic public context, Chromium 154, 6x CPU throttle, localhost without network throttle, blocked service worker and fallback fonts. Median route-to-visible-result timings were 38.5 ms for the first Recipes list (34-46), 50 ms for the first recipe (40-80), 42 ms for a repeat recipe (33-80), and 247.5 ms for a committed chicken filter (243-256). The filter includes the intentional search debounce. Other audit jobs ran concurrently; these are labelled diagnostics, not a controlled device/network benchmark, field INP or a performance pass. Full cold/warm installed-app and private-save timing remain open.

No before/after speed improvement is claimed because this phase changes no code. No new polling, per-row reads, service or analytics collection is proposed. Field p75 Core Web Vitals, installed-device memory/listener growth and production read consumption remain separate evidence needs. Current official targets remain LCP <=2.5 seconds, INP <=200 ms and CLS <=0.1; a lab loading run is not field INP.

### Small implementation units for approval

Each unit is planned, not implemented. Every defect needs a failing regression on the old code, a focused correction, the affected wider checks and full final Click tests. Public details of private security units belong only in their fixes, not in this audit register.

| Unit / order | Outcome, boundaries and exclusions | Acceptance and safe rollback |
| --- | --- | --- |
| U1, priority with private repairs | Safe Firestore cache recovery. Prep recovery plus existing work/reachability helpers and recovery tests. No layout, role, schema or private-cache change. | No termination/reload over dirty/pending/uncertain work, including work arriving during checks; clean online repair still works once. Revert through a client PR only if work protection remains valid; no data migration. |
| U2, priority with private repairs | Complete-generation service-worker updates and obsolete-round protection. Worker/update/saved-copy tests, both fallback paths and old-client compatibility. | Failed fetch/write/restart keeps one last-good generation; late rounds never publish over new; successful update works offline after reopening. Client/worker correction PR, never erase private work to repair an update. |
| U3 | Truthful cache/read-budget model, then a bounded cost repair if measurement supports it. Test stand-in/read budget and appropriate report readers only. | Repeat-admin cost measured with memory cache reset; explain actual budget; failed reads never cache empty; no persistent private reports. Revert independently; no data writes. |
| U4, selected design required | Narrow/large-text Prep reflow, current semantic contrast and delivery keyboard recovery in focused separate PRs. | All actions and fields retained, chosen narrow layout, keyboard/target/focus/real-font checks and all required widths. No new reads or data changes. Revert each presentation repair independently. |
| U5 | Current documentation and focused-test zero-match guard; functions-only unnecessary activity request; later editor helper consolidation. Separate themes/PRs. | One current contract, unmatched filter fails clearly, allowed workflows unchanged, no silent test waiver. Code/docs revert only. |

Client-only units require no rule publication. Permission/data units need their own documented old/new-client transition, any additive canonical preparation first, compatible client and restrictive final enforcement in the correct feature-specific order. Do not publish a generic earlier ruleset as rollback. A code revert never reverses stored writes.

Release stop triggers: unexpected access, missing/duplicated writes, lost drafts, repeated reloads, mixed shell versions, broken key journeys or a material unexplained read regression. Stop and make a compatible corrective PR. After each actual release, verify the exact Pages files, required workflows, actual rules publication when relevant, Lock probe and representative safe journeys separately.

### Gaps with owners and next actions

| Evidence gap | Owner and next action |
| --- | --- |
| Actual iOS/Android installed app, sleep/wake, low storage and OS keyboard | Engineering plus owner-designated kitchen tester: run the chosen critical tasks on the real shared screen and personal phone after repairs, with synthetic or authorised safe data. |
| Real-font full-app large text and screen-reader speech | Accessibility reviewer: expand verified font captures beyond sampled controls; keyboard plus NVDA/VoiceOver checks for key journeys and selected reflow. |
| Full production role matrix, App Check rejection settings and service-account IAM | Owner/backend reviewer: authorised read-only console/IAM evidence and approved safe probes. Existing Lock probe proves only its explicit cases. |
| Backup decrypt/restore and interruptions | Backend/release reviewer: synthetic isolated restore rehearsal before any risky migration; document intentional exclusions, compatibility and key custody privately. |
| Field performance and production read consumption | Performance reviewer: bounded observation on actual devices and existing service metrics; no new tracking service by default. |
| Complete manual cross-product of every route/state/role | Engineering: prioritise residual manual journeys using the feature-preservation matrix. Fresh automated coverage is not a claim of exhaustive manual exploration. |

### Sources rechecked on 2 November 2026

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): applicable contrast, reflow, focus, errors and target criteria. No whole-app conformity claim.
- [Core Web Vitals](https://web.dev/articles/vitals): current thresholds and lab/field distinction.
- [ASVS 5.0.0](https://asvs.owasp.org/): scoped versioned security applicability is recorded privately, not a certification.
- [Firestore rules testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator) and [conditions](https://firebase.google.com/docs/firestore/security/rules-conditions): real rule tests, query shape and Admin SDK boundary.
- [App Check](https://firebase.google.com/docs/app-check): attestation complements authentication and authorisation.

Next action: implement the approved small units and selected narrow-row A, preserving each capability and recording final checks, staged publication and release evidence. Plan and design approval have been given. No new routine merge-approval gate is introduced.

## Repair and release record, 2 November 2026

Release verification updated 3 November 2026, Queensland time.

The owner approved the recommended repair plan and selected narrow Prep A. This dated record adds implementation and release evidence to the unchanged first-delivery baseline above. Reviewed source heads and merge revisions are distinct from required CI, Pages byte checks and full mocked Live journeys. Focused assertion totals below are not full-suite file counts.

| Finding or supporting unit | Reviewed head → merge; required CI | Public app deployment and full mocked Live |
| --- | --- | --- |
| CSV text and numeric representation, [#443](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/443) | [28ba545a](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/28ba545afd71085230d4214780ef9272322badc6) → [155f29b7](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/155f29b7a8cf12271d847f28e902b5f3c5d2c2c8). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41391606069) passed 178 browser files. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41394122913) passed; 4/4 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41394161730) passed. |
| WA-01/02, complete saved shells, [#452](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/452) | [60ae0ab6](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/60ae0ab684ea9c28b52ca4ebe9b410f929fb407e) → [2f013076](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/2f013076245f4008e90da82e968129a6f559823d). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41396104566) passed 180 browser files. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41398383508) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41398427081) timed out; 179 of 180 file blocks returned, with `offline-writes.test.js` unreturned. |
| WA-12, isolated fixture teardown, [#454](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/454) | [bdc799d1](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/bdc799d1a993d21dfe73db908ed63aa928560469) → [4f7e1bcb](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/4f7e1bcbaed5ab7243d020ddd8848d82538e7f6e). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41410429543) passed 181 browser files and 5 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41413192871) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41413248676) passed. |
| Protected backup and included-data recovery, [#450](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/450) | [adcedcbb](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/adcedcbb63dbd30a458ee15d30adada5f09f1a22) → [cf973f5b](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/cf973f5b72c8791138cabae48ffa5010ce899d60). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41413572605) passed 181 browser files and 7 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41416557480) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41416615858) passed. |
| WA-03, guarded cache recovery, [#451](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/451) | [c85a0cdb](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/c85a0cdb96dea36f4b75b6108e25e73dcc87c703) → [69a5b31a](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/69a5b31a9ef0ec906c271e95780841ba21b2e556). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41417371808) passed 181 browser files and 7 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41420979178) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41421048193) passed. |
| WA-11 and canonical staff capabilities, [#453](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/453) | [b976e12c](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/b976e12c892dc0880cce7c23b1441d5e566c1a78) → [0d2a47e4](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/0d2a47e471e18390a113da22d1c030aff706c955). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41422542584) passed 183 browser files and 8 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41430723311) passed; 9/9 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41430843748) passed. |
| Rules publisher confirmation, [#455](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/455) | [902c9faf](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/902c9faf3f1e70151946a73a3cc6e17cc6506295) → [0de165df](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/0de165df33670edc7d2d38babe4d7067f61e79a6). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41436656114) passed 183 browser files and 9 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41440720664) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41440786236) passed. |
| WA-07, delivery error recovery, [#447](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/447) | [4aa12486](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/4aa12486c31825a3ca34cd256dbcf8b5f462db8f) → [b7ef6cfb](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/b7ef6cfb13198609048939ea7e7504e3272e6ed5). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41441529894) passed 184 browser files and 9 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41444446946) passed; 8/8 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41444520554) passed. |
| WA-05, selected narrow Prep A, [#448](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/448) | [41190a43](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/41190a43e1df7a6bc6172791dbf064b8d84d0c7a) → [763397de](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/763397de1d5d0920d6e5567fb702504a0e5d6033). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41444980545) passed 185 browser files and 9 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41448045499) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41448106445) passed. |
| WA-06, sampled status contrast, [#449](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/449) | [385da784](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/385da784e03f70643300e6935a333284d4c9526c) → [51a12fca](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/51a12fcaa85a573919559c87b8eab18559181c5c). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41448317603) passed 186 browser files and 9 processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41451831711) passed; 6/6 sampled files matched the deployed revision. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41451901755) passed 186 files. |
| WA-04/09, trustworthy browser checks, [#444](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/444) | [715a6f02](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/715a6f0214d4dbb92442fb149b45f3b04b7b3572) → [9353ad87](https://github.com/KuschiKuschbert/leichhardt-kitchen/commit/9353ad874cd4a047b3e7d889063ad1865a87dc80). [Required CI](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41463881724) passed 189 browser files, 15 rules suites and nine processing scripts. | [Pages](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41468029236) passed; six of six sampled controls matched, with no runtime asset changes. [Full mocked Live](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41468231530) passed 189 files. Automatic rule publication was skipped. |
| WA-08, current guidance, [#446](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/446) | Reconciles current access, device/work recovery, private-cache, shell, capability, backup and publisher guidance. Retains dated decisions, baseline failures and manual owners. | [PR446 checks and release evidence](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/446) records the current reviewed head and associated verification. |

### Repair scope and evidence limits

- **WA-01/02:** 29 native generation checks and 508 final consumer assertions cover complete publication, obsolete rounds, restart/offline use and failure recovery. Six safe public-site offline/update smoke stages passed without a private login or physical device. The original shell Live timeout above remains recorded. [Saved-shell generations](saved-shell-generations.md) explains document binding, legacy migration and compatible rollback: already loaded legacy scripts are not retroactively repaired, and a historical worker that deletes generation caches is not a safe blanket revert.
- **WA-03:** 33 dedicated cache-recovery assertions cover typed drafts, pending/uncertain acknowledgement, scoped cleanup, offline continuation and truthful failure. The original person's unsent work must stay protected before SDK termination, storage cleanup or reload. [Device sessions](device-sessions.md) remains authoritative.
- **WA-04:** the corrected stand-in loses its read cache on reload while keeping synthetic server fixtures. The lifetime regression failed three of 12 assertions before the correction and passes all 12 after it. Complete historical reports remain checked. Representative samples measured zero reads on same-page admin returns and 219 to 220 after reload, against the explained 240 ceiling. This records existing runtime cost after correcting the test model; it adds no production reads, polling or persistent private reports. Field read consumption remains unmeasured.
- **WA-05:** the selected Prep A implementation passed 131 dedicated assertions across 52 actual/fallback-font contexts, plus combined consumers. Checks retain the normal-width and landscape layouts, every permitted action, amount, attribution and Undo within the recorded setups. Prototype captures remain historical design evidence, not production save or physical-device proof.
- **WA-06:** 63 dedicated contrast assertions and ten existing keyboard/target checks cover the sampled status/warning consumers and font contexts. They establish the measured ratios, not whole-app WCAG conformity.
- **WA-07:** 39 dedicated delivery assertions plus consumer checks cover invalid-field focus and error association, retained values, zero/null/negative temperatures, original receipt identity and retry semantics.
- **WA-09:** unmatched supplied filters fail before server/Chrome startup while substring and multiple-filter selection remain intact. The selection regression failed six of eight assertions before the correction and passes all eight after it. The explicit syntax-loop guard is portable hardening, with the methodology clarification below.
- **WA-10:** shared toast/two-tap consolidation remains deferred as approved. No user fault was reproduced; any later measured unit must retain cached-module/API compatibility, focus, arm timing, Undo and action identity.
- **WA-11:** Functions-only login skips the prohibited activity request while allowed booking/delivery work and ordinary staff activity remain checked. The source-rule matrix has 174 rows, 1,566 calls, nine sign-ins and zero waivers. Capability checks add 142 assertions. [Staff capabilities](staff-capabilities.md) defines owner-approved Add/Tick/Delete, recent own-add Undo, paired function effects and the all-login delivery exception.
- **WA-12:** the disposal regression models a paused close; the controlled diagnostic reproduced a native-close stall, but its inner cause remains unproved. The model failed three of ten assertions before the correction and passes ten after it; four affected consumers passed 368 assertions. Subsequent exact-head Node 22 gates do not erase the original 175/177 local result, the two failures or the unchanged 46/273 serial reruns, and do not establish their original cause.
- **Protected backup:** 21 crypto groups and a 55-document synthetic recovery rehearsal cover the included-data path. [Backup recovery](backup-recovery.md) defines the authenticated format, trusted legacy reader, intentional omissions and compatible repair. Operational backup verification is retained privately. There is no full disaster-recovery, transactional-snapshot, downloaded-content or production-restore claim.
- **Publisher:** 38 synthetic policy groups and four full pinned prepare/deploy/release consumer cases retain all original 32 groups. [Rules publication](rules-publication.md) defines exact default-alias handling, genuine-error preservation and bounded confirmation of an uncertain result. No application/rules/dependency/version change or mutation retry is introduced. Detailed operational publication history remains private.

### Syntax methodology clarification, 2 November 2026

`tests/syntax-gate.test.js` extracts the actual workflow loop, but runs it in standalone `bash +e` with inherited `SHELLOPTS`, `BASH_ENV` and `ENV` removed. Two of four cases failed before the explicit `|| exit 1` guard and all four pass after it. Those results establish snippet behaviour with `errexit` off. The recorded earlier GitHub step used `/usr/bin/bash -e {0}`, which already stopped on an early failed `node --check`. No GitHub acceptance of invalid JavaScript was observed or established. The unmatched-filter finding and its regression are separate evidence.

Two pre-release PR444 attempts remain dated evidence. Candidate `f33ff558` failed [CI 41452108228](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41452108228) on one saved-copy assertion: 49 of 50 assertions passed in that file and all 189 browser files returned. Candidate `eb673602` failed [CI 41457722270](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/41457722270) during order-cutoff setup in `keep-typed`, with one failure among 229 partial assertions; saved-copy passed all 51 checks. All 189 browser files returned in that attempt too. Rules and processing were skipped in both runs. The original worker lifecycle and click-locator states were not recorded, so the precise causes remain unproved.

The corrected candidate retains all 50 original saved-copy assertions and adds one explicit bare-worker isolation assertion. Matching inert entry/index HTML keeps controlled navigation inside that fixture, retaining native 600-second caching, zero Playwright routes and the original polling bounds. Two cutoff setup sites now wait for their specific visible enhanced control, retaining each existing eight-second readiness budget. Failures report the complete error text. Six focused files passed 322 assertions: 234 keep-typed, 51 saved-copy and the existing 37 cache/read-budget/selection/syntax checks. These controlled proofs establish fixture preconditions; they do not establish the causes of the earlier CI failures. The 52 protected application, rules and teardown paths still match main `51a12fca`. These test-local corrections change no shared teardown helper, application code, source rules, dependency or version, and weaken no assertion or timing bound.

### Remaining verification and ownership

The final processing gate retains all nine current scripts. Older five-, seven- and eight-script runs above remain dated evidence. The emulator exercises actual source rules with synthetic identities. Browser and full mocked Live checks substitute operational data; Pages byte equality establishes sampled source identity. Actual rules publication, additive preparation, read-only foundation verification and the signed-out Lock probe are separate evidence held by the release owner. A skipped publisher is not publication, and a signed-out probe is not an authenticated production role or persistence test.

The existing [gap owners and next actions](#gaps-with-owners-and-next-actions) still govern physical iOS/Android/shared-screen tasks, sleep/wake, low storage, OS keyboards, screen-reader speech, authorised App Check/IAM evidence, real authenticated production persistence and field performance/read consumption. The synthetic backup rehearsal closes only its stated included-data check; key custody, intentional omissions, concurrent-data reconciliation and any actual restore remain separately reviewed. These repairs do not establish exhaustive manual coverage, whole-app accessibility/security certification or faster field performance.
