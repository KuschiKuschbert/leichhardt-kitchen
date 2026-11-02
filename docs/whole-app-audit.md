# Whole-app engineering audit and improvement prompt

Prepared 2 November 2026 for `KuschiKuschbert/leichhardt-kitchen`.

This is an execution brief, not a completed audit or a claim that fixes are live. The stack snapshot was checked against main commit `555636632c44ab79afc7750710056e6be1ea78fb`. Recheck the current branch, deployed version and open work before executing it. Use the following brief as the task for the engineering agent.

## 1. Mission and limits

Act as the senior software engineer responsible for the whole Leichhardt Kitchen Book, supported by independent product, kitchen-operations, usability, visual-design, accessibility, security, performance and test reviews.

Assess the complete application. Find and resolve defects, inconsistency, confusing journeys, unjustified duplication, fragile code and measurable performance problems. Make the app safer, clearer, faster and easier to maintain while preserving its approved appearance, staff familiarity, data and operational capabilities.

Work in phases: discover and establish evidence; audit and run the council; design necessary changes; obtain approval for design-dependent work; implement small approved units; verify and release under the existing repository rules. Complete the audit work that is possible before asking for design choices. Do not stop at a generic checklist.

The first delivery is the evidence-backed audit, prioritised recommendations and concrete design comparisons. Do not change application behaviour or layouts during that discovery/design phase. Isolated prototypes with synthetic data, documentation and baseline verification are allowed. After the plan and any necessary designs are approved, carry authorised implementation through to verified completion. An already approved design does not need another approval merely because implementation continues.

Treat preservation of functionality as a testable requirement, not a promise that any change can be risk-free. Never claim the app is fully secure, compliant, faster or regression-free without evidence that supports the specific claim.

## 2. Establish the current source of truth

Read root and scoped instructions, `CLAUDE.md`, the relevant parts of `README.md`, feature notes, manifests, lockfiles, CI, deployment and rules configuration before editing. Respect the latest explicit owner decisions. Never silently resolve a genuine product-policy conflict by choosing the easier implementation.

Read these existing contracts in particular:

- `docs/private-kitchen-access.md` and `docs/device-sessions.md` for current access, device ownership, Google identity, daily PIN unlock, handover and unfinished work. They supersede historical access wording.
- `docs/adaptive-controls.md`, `docs/navigation.md`, `docs/admin-flow-spec.md` and `docs/admin-design-options/brief.md` for existing controls, Back/Resume behaviour and selected admin designs.
- The notes for supplier orders, wastage history, transfers and returns, function cancellation/printing, delivery records, shared prep attribution, admin intelligence and proofreader repairs before changing those features.
- `README.md` sections for owner decisions, open items and older code awaiting consolidation. Reproduce listed issues before assuming they remain unfixed.

Inspect open PRs and active branches first. At preparation, PR #440 (`ux/council-usability`) was in flight and included `docs/ux-council-audit.md`, a bounded council audit of 25 route/flow families. Establish whether it has merged, reuse its evidence where still valid, and explicitly close its untested areas. Do not duplicate or overwrite that work. Historical preview drafts are not shipping branches.

Use an isolated worktree on a fresh topic branch from current `main`, as `CLAUDE.md` requires. Preserve other sessions' changes and worktrees. Record the starting commit, branch, deployed version, open related PRs and any environmental limitations. Never edit, commit or push directly to `main`.

## 3. Verify the stack and tailor the work to it

This is the verified starting point, not a reason to skip discovery:

| Area | Observed implementation | Evidence to recheck |
| --- | --- | --- |
| Frontend and routing | Plain HTML, CSS and JavaScript; hash routes; ordered scripts, shared `LK_*` helpers and lazy feature modules; no production build step | `index.html`, `js/app.js`, `js/prep.js` |
| Hosting | GitHub Pages | repository settings, workflows, deployed files |
| Data and identity | Firebase web SDK 10.14.1; Firestore, anonymous device identity, separate Google authentication, App Check, server rules and PIN sessions/device grants | `js/prep.js`, `js/firebase-config.js`, `firestore.rules`, current access notes |
| Installable app | Manifest, `sw.js`, atomic shell updates, `js/upkeep.js`, public saved copies and guarded private state | manifest, service worker, cache/update/session tests |
| Visual system | Barlow body text, Barlow Condensed headings, Caveat handwriting; warm paper, charcoal and orange; existing CSS tokens and shared controls | `index.html`, `css/app.css`, `js/controls.js` |
| Browser verification | Custom Node runner using `playwright-core` 1.48.2; PDF checks use `pdfjs-dist` 4.10.38; Firebase stand-ins | `tests/package.json`, lockfile, `tests/run.js`, `tests/lib.js`, `tests/fake/` |
| Rules verification | Firebase emulator; `@firebase/rules-unit-testing` 3.0.4, Firebase 10.14.1, Firebase Tools 13.29.1 | `tests/rules/` |
| Server jobs | Node scripts with `firebase-admin` 12.7.0; scheduled Actions for learning, analysis, backups and reminders | `scripts/`, workflows |
| Required CI | Node 22, Java 21, browser checks, rules checks and processing checks within the required `Click tests` job | `.github/workflows/pr-tests.yml` |

Record actual versions and distinguish runtime dependencies from test/server tooling and externally loaded resources. Check current official documentation and relevant advisories for those exact versions. Prioritise demonstrated exposure and compatibility over automatic major upgrades.

Do not introduce React, Next.js, TypeScript, Tailwind, a bundler, a new database, a component framework or a new service merely to modernise the app. Any architectural change must solve a measured problem, explain costs and migration/rollback, and receive the appropriate product approval. Reuse the existing architecture when it serves the need.

## 4. Inventory the whole app and capture a baseline

Create a route and feature matrix covering landing, public recipes/search/detail/multipliers, recipe and drawing management, Prep, Orders, suppliers/catalogues/history/cutoffs, Deliveries, Wastage and reports, Transfers/returns, Functions/service/editor/print, Guides, Minutes/sign-offs, Pings, Kitchen mail, Drinks, Chef to-do, staff/permissions, Admin analysis/review/training/proofreader/settings, device setup and recovery. Discover any additional routes from the code.

For each family, record entry points, allowed roles, important controls, expected outcomes, reads/writes, persistence, draft/undo behaviour, empty/error/offline states and connected jobs. Trace complete user journeys, including where the user returns after saving or cancelling. Map cross-feature effects such as function revisions updating prep/order lines and catalogues feeding ordering.

Keep a coverage matrix distinguishing: source reviewed; browser exercised; emulator verified; real-service verified; real-device/manual checked; blocked; not applicable. Every discovered family needs an explicit status. A large test count is not proof that every journey was exercised.

Capture the current commit, exact baseline test results, representative screenshots, read counts, resource sizes and controlled task/performance timings. Include 390, 768 and 1280 px as existing required widths, plus relevant narrow, landscape, large-text and installed-app cases. Use synthetic fixtures, realistic long lists, long names, empty data and large bookings. Keep private data and security details out of this public repository and its CI artifacts.

Separate existing failures from new regressions. Record environment failures without weakening the gate or inventing a pass. Verify that the deployed client, rules and jobs correspond to the versions being discussed.

## 5. Run an independent, critical council

Use separate reviewers where available. Each reviews evidence independently before a lead reconciles recommendations. If independent agents or real users are unavailable, state that the review is role-based analysis. Do not present invented staff research or staged agreement as evidence.

| Perspective | Required challenge |
| --- | --- |
| Kitchen operations and product | What task does this solve during service? Who needs it, how often, and what fails if it disappears? |
| Usability and information architecture | Is the next action clear? Are steps, navigation, Back, search, feedback and recovery predictable? |
| Visual design and accessibility | Are hierarchy, typography, colours, controls, focus, labels and responsive layouts coherent and usable? |
| Security and data integrity | Can the wrong person read/write, inherit authority, lose work, duplicate a save or corrupt history? |
| Architecture and performance | Is the complexity justified? What is the measured cost in loading, rendering, reads, maintenance and failure modes? |
| Quality and release engineering | What would prove this works, what existing behaviour could regress, and how is recovery performed? |

For every proposed feature change, decide: preserve; repair; simplify; consolidate implementation; redesign; defer; or propose removal. Explain user value, evidence confidence, frequency, impact, effort, dependencies and reversibility. Record disagreement where it affects a decision. Rank security/data-loss/service blockers ahead of cosmetic polish.

Be critical about redundant navigation, duplicated validation, competing sources of state, unnecessary prompts, giant buttons, repeated reports, stale helpers and features without a clear job. A repeated entry point can be useful in another context. Similar labels do not prove equivalent behaviour. Removal of an operational capability is a product decision, not an automatic cleanup.

Maintain a concise finding register: ID, affected route/role, expected and actual behaviour, reproducible evidence, severity, confidence, proposed change, regression risk, acceptance criteria and verification method. The public register may contain usability, design and performance findings. Keep the security finding register, including reproduction, impact and status evidence, private under the existing repository rule. Public PRs contain the fixes and non-sensitive verification of those changes.

## 6. Audit consistency, continuity and accessibility

Inventory buttons, links, chips, tabs, selectors, inputs, tables, cards, dialogs, bottom sheets, toasts, loading indicators and error messages across every family. Trace each action from its label to its handler, allowed state, persistence result, feedback and next destination. Identify dead controls, misleading labels, duplicate submissions and hidden validation.

Use the existing design as the baseline. Current tokens include `--bg: #FBFAF7`, `--paper: #FFFFFF`, `--ink: #1C1D1F`, `--accent: #E2602A`, `--r-act: 8px` and `--r-pick: 999px`. Verify computed styles and token definitions before consolidating. Preserve the approved Chef's Desk admin direction, notebook character, existing typography, print layout and staff-familiar locations unless a specific redesign is approved.

Define one coherent button system with a small set of semantic variants: primary, secondary, quiet and destructive, plus justified compact/table sizes. Align font, weight, padding, height, radius, icon size/gap, focus, hover, pressed, disabled, loading, success and failure states. Do not make Delete look like Save, make every action a large full-width block, or mistake selection chips for action buttons. Document exceptions and migrate shared patterns incrementally.

Labels must explain the outcome in plain Australian English: for example, Save changes, Record delivery, Mark order done, Cancel function, Delete function, Keep editing and Back to orders. Verify the wording matches the real outcome. Distinguish cancelling an edit from cancelling a booking. Use visible words for important or unfamiliar actions; icon-only controls need an accessible name. Tooltips cannot be the sole explanation on touchscreens.

Check focus and cursor preservation through redraws; native validation; visible and focused invalid fields even when filtered/paginated; double taps; held Save presses after input blur; correct disabled states; feedback only after acknowledgement; filter/search/sort continuity; sensible Back destinations; scroll restoration; draft protection; recovery after failed reads/writes; and whether a shortcut hides essential information.

Assess WCAG 2.2 AA using applicable criteria: keyboard navigation, semantic controls, labels, accessible names, text and control contrast, focus visibility, errors, reflow, zoom and status announcements. Check the 24 by 24 CSS pixel target minimum or valid exceptions, while preserving the app's larger 44/48 px kitchen targets where practical. Sticky bars and sheets must not hide the focused control. Measure with actual fonts and fallback fonts, including large text. Automated checks do not replace manual keyboard and relevant assistive-technology checks.

Keep one managed sheet at a time using existing modal helpers. Preserve backdrop/Cancel/Escape behaviour, focus return, meaningful accessible structure and unsaved-work safeguards. Do not add blocking prompts to routine reversible actions merely for consistency.

## 7. Design before implementing layout changes

For each justified substantial redesign, first show the current screen and measured problem. Present exactly three meaningfully different alternatives for the affected surface, next to the current baseline. Vary hierarchy, layout or interaction, not just colours. Reuse approved global direction; do not reopen completed design choices without evidence.

Make the alternatives concrete with isolated working previews or annotated mockups using synthetic data and the real visual system. Show phone, tablet/kitchen-screen and desktop states, including long content and relevant loading, empty, error, disabled and unsaved states. Compare task steps, visible information, important action access, feature parity, accessibility and tradeoffs. Recommend one option with reasons.

Obtain approval before implementing the design-dependent changes or removing capabilities. Record the selected option and acceptance criteria in the existing design records. Continue independent authorised work that does not presume that choice. Do not create a production integration or write real kitchen data from a prototype.

## 8. Preserve operational contracts

Build a feature-preservation matrix and regression checks for the following, reconciled with the latest feature notes:

- Public recipe/drawing viewing remains available. Operational data requires the appropriate personal login. Recipe management remains limited to authorised head/sous/admin identities.
- Staff, lead, view-only, functions-only, sous, head-PIN, locked/remembered-Google, valid head-PIN-plus-grant and shared-device states retain their distinct permissions. Functions-only users retain the explicit delivery-record exception without receiving unrelated access.
- Recording a supplier order with quantities, confirming an order is done without quantities, applying a suggestion to a draft and recording a delivery remain distinct outcomes. Preserve number-only quantities, confirmed/explicit units, stock zero, pars, manual items, catalogue fidelity, history and supported cutoff intervals. Never invent units or send an order to a supplier unless that integration and action are separately authorised.
- Function creation/editing, service reminders, staggered rounds, one-click cancellation and its Undo, protected soft deletion/recovery and approved Layout 2 printing retain their permissions and effects. Printing must not save or change status. Contact data remains separate and private.
- Outstanding transfers stay visible until return confirmation. Returns retain original quantities/history and their Undo semantics.
- Wastage history remains itemised, with consistent date ranges, totals, filters and CSV. Today's staff view and privileged history remain separate. An unread or failed range cannot become an empty successful report.
- Deliveries retain immutable identity/time/temperature records, retry identity, negative freezer values and null-versus-zero handling. Technical input limits must not become invented food-safety acceptance rules.
- Prep attribution preserves the reported worker versus authenticated recorder, personal-device one-tap ticking, shared-screen selection, credits and Undo. Do not extend the trial to other features without approval.
- Recipe/drawing revisions, sanitisation, public mirrors, automatic drawings and intentional manual edits remain coherent. A no-op or failed read must not blank a recipe or drawing.
- Guides, minutes/sign-offs, pings, mail, drinks, to-do, staff management, reviews, training and proofreader history retain their privacy, state transitions and visibility switches.

Reuse `LK_TIME` and the current Queensland clock helpers. Test midnight, the separate 04:00 authentication boundary, date ranges and incorrect device zones. Preserve metric units, Celsius, 24-hour stored times, Australian kitchen language and the repository's no-em-dash style.

## 9. Audit security, privacy and data integrity

Create a threat model of public assets, private operational records, sign-in bootstrap data, owner privileges, staff sessions, contacts, uploads/drawings, browser storage and privileged jobs. Use applicable OWASP ASVS 5.0.0 requirements with versioned references, applicability and evidence. Check current guidance again when executing.

Verify Firestore enforcement for every real read/query/write shape. Hiding a route or button is not authorization. Test direct navigation, direct SDK operations, cross-role/cross-record access, removed users, PIN resets, forged fields, stale sessions, account handover and old cached clients. Rules are not query filters. Add applicable shapes to the existing rules matrix and keep browser stand-ins consistent with actual enforcement.

Preserve the current device-session design: a persistent anonymous device identity performs operations; Google identity is held separately; admin operations need a live matching head-chef PIN session and device grant. Remembered Google alone must grant no operational access. Personal devices keep Google remembered while requiring the daily 04:00 PIN unlock. Shared screens clear their own Google/PIN on idle/nightly lock without revoking other devices. Never revive superseded 30-day sessions or raw Google operational bypass as a fallback.

Check PIN throttling and server expiry, failed/expired sessions, multi-tab state, private DOM/cache clearing, role changes and draft attribution. Scheduled locks must protect the same person's work. A handover must never replay it as someone else. Unsent writes and uncertain acknowledgements must not be discarded or blindly replayed; retained supplier transactions still need the documented user retry.

Review injection and unsafe rendering across HTML, attributes, URLs, styles and SVG. Reuse `esc()`, typed validation and `LK_RX.clean()` at the required boundaries, including cached drawings. Review upload/file limits, resource loading, dependency advisories, CSP and real response headers. Account for GitHub Pages and meta-CSP limitations; never claim a server-header control was deployed merely by adding a meta tag. Do not weaken policy to fix a loading error.

Verify App Check configuration/enforcement independently from authentication and rules. Review server/admin jobs separately because privileged SDKs do not rely on client security rules. Inspect least-privilege workflow/service-account access, triggers, third-party Actions, log/artifact privacy, secret handling and backup access without printing secrets. Public Firebase web configuration is not itself a secret; distinguish it from privileged credentials.

Test atomic writes, writer attribution, version guards, multi-device edits, stale forms, duplicate taps, retry idempotency, unknown acknowledgements, immutable history and partial failures. Check index/migration assumptions and backup/PIN-move/export coverage for every changed field or collection. Preserve existing validated state when a read fails.

Use synthetic data and the emulator for destructive cases. Do not brute-force live PINs, run unbounded production scans, reset real records or load-test the live kitchen. A discovered live exposure gets a private, concrete remediation proposal and appropriate verification before release.

## 10. Measure performance, resilience and redundancy

Measure cold start, warm start, first recipe open, large-list filtering/sorting, task interaction, save acknowledgement and route transitions on documented devices/network/CPU settings. Include actual fonts, cache state, realistic data size, request/read counts, long tasks, memory/listener growth and service-worker updates. Compare repeated before/after runs under the same conditions.

Use current Core Web Vitals good-experience targets where applicable: LCP at most 2.5 seconds, INP at most 200 ms and CLS at most 0.1 at the field 75th percentile. Distinguish lab comparisons from field evidence. Do not claim field INP or a real-user pass from a Lighthouse loading run. Set additional route-specific regression budgets from the measured baseline and task needs, not invented universal percentages.

Preserve Firestore read budgets, bounded listeners and caches. No new polling or per-item/per-day query loops. Prefer existing queries, local filtering and server summaries where appropriate. Explain read frequency and cost of each new read. Keep cache invalidation and cross-device correction stamps correct. Failed, partial or memory-cache-empty responses must not become authoritative empty saved copies.

Audit service-worker shell atomicity, ordered scripts, both workerless fallback lists, lazy-module compatibility, stale tabs, offline launch, reconnect, storage failure/eviction, failed updates and pending-work guards. A refresh must not reload over unsent work. Offline availability of public assets does not justify persistent private records beyond the current contract.

Measure before moving code out of startup. `js/art.js` has a documented prior experiment where deferred loading hurt first recipe use; inspect that evidence and remeasure a new hypothesis. Reduce repeated renders, parsing, layout work, listeners, resources or queries only when the result improves the relevant journey.

Before deleting apparently unused code, trace dynamic loaders, `LK_*` APIs, event/data attributes, CSS selectors, print rules, service-worker assets, server jobs, exports, historical data and old clients. Separate duplicated implementation from distinct business behaviour. Consolidate around existing helpers such as `W()`, `dayCache()`, `lvHTML()`, clock helpers and shared controls. Avoid broad renaming, formatting churn or an abstraction that increases complexity without a real reusable contract.

## 11. Implement in small, reversible units after approval

Order the work by severity and dependencies. Each unit needs a specific outcome, affected files/boundaries, excluded changes, feature-preservation criteria, failure behaviour, verification plan and rollback. Keep unrelated dependency, security, layout and data changes in separate PRs unless they must ship atomically.

For a confirmed bug: reproduce it; add a meaningful regression that fails on the old code; fix the cause; run the focused checks; then run the required wider gate. Record expected/actual behaviour and fail-before/pass-after evidence. Do not weaken assertions, hide errors, blindly refresh screenshots, add arbitrary sleeps or increase budgets solely to make a run green.

Follow existing helper and event conventions. Keep save/validation authority below the button handler as well as in the UI. Preserve progressive behaviour and old-client compatibility where the contract requires it. Add a feature flag only when there is a useful release/rollback need and both paths can remain secure and tested. Do not add speculative functionality or new analytics services as part of cleanup.

## 12. Verification requirements and real commands

Use risk-based checks and the existing harness. Do not substitute a stock framework test command. The following commands use the discovered scripts; the syntax loop explicitly stops on a failure. Verify them against current manifests and CI before use.

| Check | Command and working directory |
| --- | --- |
| JavaScript parsing | From repository root: `for f in js/*.js js/lib/*.js sw.js; do node --check "$f" || exit 1; done` |
| Browser dependencies | From `tests/`: `npm ci --no-audit --no-fund` |
| Full browser gate | From `tests/`: `npm test` |
| Focused browser checks | From `tests/`: `npm test -- <actual-filename-substring>`; inspect runner matching first |
| Browser executable | Supply `CHROME` with the discovered installed executable when needed; CI uses `/usr/bin/google-chrome` and `JOBS=4` |
| Rules dependencies and suite | From `tests/rules/`: `npm ci --no-audit --no-fund`, then `npm test` |
| Server dependencies | From `scripts/`: `npm ci --no-audit --no-fund` |
| Processing/index/backup checks | From `scripts/`: `../tests/rules/node_modules/.bin/firebase emulators:exec --only firestore --project demo-test "node emulator-check.mjs && node transfer-index-check.mjs && node waste-range-check.mjs && node delivery-backup-check.mjs && node analysis-check.mjs"` |
| Deployed static-client checks | From `tests/`: `BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test` |
| Pre-merge review | From the worktree: `bash scripts/pre-merge.sh` |

The browser suite, including the live-site variant, substitutes Firebase. It verifies interface behaviour and deployed files, not production database authorization. Its default font interception also cannot prove actual-font layout. Use separate real-font visual checks, actual rules on the emulator, the repository's approved live Lock probe and appropriate real-service validation. Report each boundary honestly.

Cover relevant unit/business rules; integration/persistence; allowed and denied role operations; end-to-end critical journeys; shared-control consumer regressions; responsive and visual states; keyboard/accessibility; A4 printing; dates/parsing; concurrent edits; offline/reconnect; permissions lost mid-flow; retry/duplicate submission; and cache/update behaviour. Use existing `L.waitFor`/settling helpers and wait for the specific result, not elapsed time.

Run the full required `Click tests` gate for the final PR revision. After shared CSS, controls, state or permissions change, broaden verification to their actual consumers. Retain representative user-journey evidence and meaningful failure tests. Do not write tests that merely repeat implementation internals or claim exhaustive coverage from an assertion count. Browser-engine, device, screen-reader or external-service checks unavailable in the environment remain explicit gaps with next steps.

## 13. Release and rollback safety

Record a known-good commit and baseline before substantial changes. Follow existing branch, PR template, test, pre-merge, merge and deployment authorisation rules. Do not add a new routine merge approval where the owner has already authorised it. Design approval remains a separate prerequisite for the affected changes. Verify the exact revision being merged and recheck related work after `main` moves.

Document client/rules/index/job order for every data or permission change. Additive rules needed by a new client generally come before it; stricter rules that reject old behaviour require the documented compatible transition. Changes combining both need staged phases and compatibility checks. Use the feature's actual rollout contract rather than applying this summary mechanically. Never temporarily reopen private access to keep old clients working.

Before a risky data migration, verify an authorised protected backup, schema compatibility, dry run, idempotency, interrupted-run recovery and a restore/repair rehearsal in isolation. Do not copy production records into public fixtures. Separate rollback of application code, rules, indexes/jobs and stored data. A Git revert does not undo writes.

Keep changed records additive and backwards compatible where possible. State what old clients do with new fields and what data remains after rollback. Never restore superseded insecure rules, device sharing or public-read access. Prefer a compatible correction where reverting would violate the current security contract.

Define release stop/rollback triggers around unauthorized access, lost or duplicated writes, broken key journeys, failed updates and meaningful performance/read-budget regressions. Include exact recovery steps and the checks that prove recovery. Revert through a fresh branch and PR, never force-push `main`.

After release, verify the Pages version, required workflow results, actual rules publication where relevant, the live Lock probe and representative safe journeys. Report source changes, merged code, deployed static files, deployed rules and live validation as separate states. Never label a source-only security fix live.

## 14. Keep documentation useful and consistent

Update `CLAUDE.md` as the concise working entry point: actual stack, key invariants, current commands, design/approval rules and links to the detailed records. Preserve valid rules. Replace superseded wording rather than accumulating contradictory copies. Do not change policy to make a defect or failing test look acceptable.

Keep `README.md`, existing feature contracts, chosen design notes and relevant backlog/progress records in step with each unit. Reuse the existing council audit where suitable and avoid competing registers or progress records. Keep the security finding register and its evidence separate and private. Credentials, real staff/customer data and private backup material also stay out of this public repository. Public documentation may contain non-security findings, general safeguards and non-sensitive verification of fixes.

Record decision dates, evidence commits, official sources, commands/results, remaining gaps and the next concrete action. Do not mark planned work verified or turn this prompt into a fictional completed audit.

## 15. Required deliveries and completion criteria

First deliver the verified stack and source map; complete route/role/feature inventory; baseline results and coverage limits; prioritised finding register; council decisions; proposed button/token/action conventions; necessary design comparisons; and small implementation units with acceptance and rollback plans. Present the concrete design choices before asking for approval.

After approval, deliver the implemented changes in focused PRs, fail-before/pass-after evidence for defects, required checks on final revisions, before/after visuals and measurements, updated guidance, release evidence and tested recovery arrangements appropriate to the changes.

Completion means the agreed high-priority issues are resolved with evidence; critical capabilities and permissions are preserved; approved controls/designs are coherent; failures retain or safely recover work; security and performance claims match actual checks; required CI is green; rollout state is verified; and any remaining limitations have an explicit owner/next action. Report blockers honestly and continue unaffected authorised work. Do not stop after recommendations when implementation is already approved.

Start with discovery and the baseline now. Deliver the first-phase findings and concrete design choices, then obtain the plan and any necessary design approval described in Section 1 before changing application behaviour or layouts.

## Official references

Checked 2 November 2026. Recheck when executing the audit; repository versions and current official guidance must both inform decisions.

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): accessibility criteria and applicable conformance level.
- [Core Web Vitals](https://web.dev/articles/vitals): thresholds and field-versus-lab evidence.
- [OWASP ASVS](https://asvs.owasp.org/): applicable versioned security verification requirements.
- [Firestore rules emulator testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator): positive/negative rules tests and emulator evidence.
- [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions): query authorization and privileged server-client boundaries.
- [Firebase App Check](https://firebase.google.com/docs/app-check): complementary app attestation, authentication and authorization.
