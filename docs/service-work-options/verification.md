# Design evidence and review

8 November 2026, Queensland. Source `eedbdd7`. Design only, awaiting approval. This record distinguishes existing-app baseline checks, prototype checks and future implementation acceptance.

## Existing-app baseline

The main checkout and all production-loaded code are unchanged. Browser tests use the repository's synthetic Firebase stand-in; emulator tests use `demo-test`. No real kitchen records, PINs, names or private live configuration were read. The fake people and functions shown in screenshots are illustrative test fixtures.

From the design worktree's `tests/` directory:

```sh
NODE_PATH=/workspace/leichhardt-kitchen/tests/node_modules CHROME=/usr/bin/chromium QUIET=1 JOBS=3 FILE_TIMEOUT=300 npm test -- home-board functions.test functions-maths functions-activity private-access prep-lines prep-a
```

**Verified: all 9 selected files passed**, first attempt, 3 at a time, 2.3 minutes. The runner's substring matching selected `private-access`, `functions-maths`, `home-board`, `prep-attribution`, `prep-lines`, `prep-add-usual`, `functions-activity`, `prep-a` and `functions`. Existing Add/Tick behaviour, current function paths, homepage and private-role regression checks passed. This does not prove the new procurement requirement, which is a changed contract awaiting implementation.

The retained emulator log records running the existing `access.test.mjs`, `device-auth.test.mjs`, `capabilities.test.mjs` and `function-midnight.test.mjs` against local Auth/Firestore emulators. **Verified:** 222 private-access checks, 56 device-auth checks, 142 canonical capability checks and 3 pinned-midnight Undo checks passed, zero failed, 423 total. The full launcher invocation is not retained and is not asserted. The test harness explicitly loads the rules under test; startup's default-rules warning is not a claim that the tests used open rules. Expected denied-write diagnostics in negative tests were not failures. Authentication to a real Firebase project was unnecessary.

Environment notes: Chromium is `/usr/bin/chromium`, Java is 21, existing dependency installations were reused. Browser requests to Google Fonts encountered certificate trust errors; official font files were fetched using the inherited trusted HTTPS configuration and routed locally for captures. No TLS verification was disabled. Final capture metrics confirmed the intended fonts loaded. This workaround changes test resource delivery, not production code.

### Real current screenshots

| Screen | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| Staff Home | [390 × 844](previews/current-home-staff-390.png) | [768 × 1024](previews/current-home-staff-768.png) | [1280 × 900](previews/current-home-staff-1280.png) |
| Chef Home | [390 × 844](previews/current-home-chef-390.png) | [768 × 1024](previews/current-home-chef-768.png) | [1280 × 900](previews/current-home-chef-1280.png) |
| Ordinary Prep | [Staff](previews/current-prep-staff-390.png), [Chef](previews/current-prep-chef-390.png) | Covered by existing layout tests | Covered by existing layout tests |
| Management | Existing responsive app retained | Existing responsive app retained | [Admin](previews/current-admin-1280.png), [Kitchen setup](previews/current-config-1280.png) |

**Verified:** six Home captures and two Prep captures plus admin reported no JavaScript page errors or horizontal overflow. At first Home load, fake billed document reads were 30 staff / 31 chef for this fixture; these are not total production bills and do not include a promised budget for new work. Before/after implementation must measure document plus rule-lookup cost using `tests/read-budget.test.js`.

The busy-day fixture has 14 prep lines, current function/service reminders and roster data. At 390 × 844, ordinary Prep shows **3 full staff rows / 2 full chef rows** before the fixed Add region (top 716 px). This differs from the earlier simple no-function fixture's larger counts because service reminders consume space. Keep the fixture context with every density number. Source-reviewed ordinary task actions are 1 tap for Add form, Tick, On it, Urgent and Recipe when linked; these paths were not instrumented as timed user studies in the capture. No proposed Home improvement changes these ordinary Prep controls.

## Baseline release and work in flight

**Verified at discovery:** latest main was `eedbdd7`, Give Drinks run the matching notebook style, after the whole-app changes and staff Home roster. GitHub Pages deployment and Publish rules workflows reported success for that SHA. Live click tests were in progress at first inspection and later [completed successfully](https://github.com/KuschiKuschbert/leichhardt-kitchen/actions/runs/42459319780) for that same SHA. Those tests exercise the deployed static client with Firebase stand-ins, not private live kitchen data.

Open work inspected: [#599 first daily staff sign-in](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/599), ready with green Click tests but merge state DIRTY, and [#430 prep attribution concepts](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/430), draft. Neither was modified. Reconcile both before implementing changed Home/session/attribution paths. A historical document's top status can be stale: the current whole-app preview brief says not built at its top, but its Build table and current code show shipped units.

## Independent council

Role-based agent review, not research with real kitchen staff. Exactly two designs were requested, which overrides the general three-design guidance. The initial review used the complete written proposal and actual baseline screenshots; the prototype was not ready then, so those reviewers explicitly limited their visual claims.

| Perspective | Initial verdict | Ranking | Challenge adopted |
| --- | --- | --- | --- |
| Working chef under service pressure | Build | A then B | Busy-phone selected section action must remain easy to reach below bounded alerts |
| Product designer | Build | A then B | Demonstrate 3 batches, overdue cleaning and In service function together at 390 px |
| New staff / keeper of book | Build smaller | A then B | Selected scope must be obvious; use Record usable amount and Cannot check, Ready is derived |
| Accessibility reviewer | Build | A then B | Stack narrow prep rows with explicit labels and accessible item-and-unit input names |
| Security/data integrity engineer | Build in staged units | A then B | Preserve individual capabilities; navigation does not grant authority; name procurement review owner; server-enforce immutable evidence |

Round 1: four Build verdicts and one Build smaller. All five ranked A ahead of B from the written layouts and baseline images. The product/accessibility/security proposals were accepted into the written contract. The new-staff recommendation means staged complete slices rather than dropping any of the five required features. No reviewer is presented as a real chef/staff participant or as evidence of deployed security/accessibility.

## Concrete prototype review and checks

Six fresh reviewers then examined the two concrete options: working chef, product/head chef, new starter, accessibility/screen design, security, and architecture/keeper of book. **Five preferred A; security rated the options equal because the same data boundary is required.** These were agent review passes, not staff research. The accessibility reviewer additionally exercised the phone prototype in Chromium. B's wide-screen comparison remains useful; all reviewers warned about extra grouping or responsive complexity.

Corrections adopted: exact six existing tabs, existing KB masthead and fonts, two bounded attention rows with View all 3 batches, compact side-by-side phone scope, derived readiness, distinct cooling actions, preserved navigation focus, non-stretched status chips, no team/ping controls for public/Functions-only, and no canned checked counts during loading/missing setup. The prototype explicitly says that simulated confirmations persist nothing. Normal cleaning references are visibly illustrative; missing setup does not present an approved task.

**Verified in standalone Chromium:** 83 assertions passed, zero failed, zero page errors. Checks covered both layouts and six feature screens at 390/768/1280 widths; eight Home conditions; five-role procurement DOM gating; all eight management subpages; chef denial for shared sections/shifts; heading focus after navigation; quantity-input focus; acknowledgement remaining unresolved; and failed quantity entry retaining an explicit zero. Network requests outside the local prototype were blocked for this check, confirming the embedded fonts and preview run without backend or external dependencies. This verifies an isolated mock, not server permissions or real record persistence.

The prototype script passed `node --check`; local Markdown links resolve; `git diff --check` is part of final packaging. Capture scripts and assertions are scratch tools outside application/test source. They add no runtime dependency. Embedded Barlow, Barlow Condensed and Caveat retain their SIL Open Font Licences in the HTML and `font-licenses.txt`.

At 390 × 844, final screenshots show **two full attention rows and the first selected-section action inside the viewport**: A's Minimum prep action bottom is approximately 687 px on the busy day and 631 px normally; B is 690/634 px. Both are above the 776 px visible region allowing for the bottom navigation. Every batch remains discoverable through the explicit total. The complete minimum-sheet view shows one full rich item row at this width; it has more fields than the ordinary list and does not replace it.

| Main action | Existing app | A | B |
| --- | --- | --- | --- |
| Open ordinary Prep from its tab | 1 tap | 1, unchanged | 1, unchanged |
| Tick / On it / Urgent / linked Recipe | 1 tap in ordinary Prep | 1, unchanged | 1, unchanged |
| Open selected Minimums from Home | No minimum sheet | 1 tap, browser exercised | 1 tap |
| Enter usable quantity from Minimums | No counted-stock workflow | Record usable amount, then Save after entry | Same |
| Record temperature from Home | No batch workflow | Open Cooling, Record temperature, Save observation | Same |
| Record cleaning from Home | No dated schedule | Open Cleaning, Record completion | Same |
| Full ordinary Prep rows on busy 390 px fixture | Staff 3 / Chef 2 | Unchanged ordinary list | Unchanged ordinary list |

The tap values for ordinary work are source observations plus existing click-test coverage, not a timed staff study. New controls were exercised where stated; placeholder links to preserved out-of-scope pages show an explanation instead of pretending the production app is embedded.

## Verification after approval

New production business rules, data permissions and actual persistence are **not implemented or verified**. The acceptance plan in the brief requires controlled-clock tests, all-role rule call shapes, second-device persistence, concurrency, unresolved handover, denied notifications, failures/offline saves, historical data retention, backup/PIN-move, compatibility and rollout rehearsal.

Real background, locked-device, closed-browser, physical sound and installed-iOS/Android behaviour remain untested. Automated preview or desktop checks cannot prove those. The initial supported promise is visible due/overdue state with best-effort enabled foreground alerts; no guaranteed unattended alarm.

## Current status and resume

Designed: specification and isolated illustrative prototypes. Implemented: no production features. Merged/deployed by this work: no. Production data/rules changes: none.

Next action is the owner's design approval, A or B, after reviewing the complete package. After approval, refresh main/open work, finalise role call shapes and missing venue inputs, then implement Unit 1. Keep incomplete operational setup visible and gated; do not convert demo figures into approved targets or procedures.
