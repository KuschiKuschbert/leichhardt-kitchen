# Design evidence and review

8 November 2026, Queensland. Source `eedbdd7`. Revised options awaiting review. PR #606 remains draft and no option is chosen. This record distinguishes existing-app baseline checks, superseded prototype checks and future implementation acceptance.

## Revision after owner rejection

The owner rejected the first A/B presentation: the phone layouts differed mainly in colour, the section/service header was unwanted, and the native fonts/style and quiet hierarchy had been lost. The earlier visual recommendation and prototype review are explicitly superseded. Their historical results below are not verification of this revision; existing-app baseline evidence still applies to its recorded source and fixtures.

The revised options are **A, Familiar Home**, retaining the native board and pinned-paper overview with local worksheet links, and **B, Working notebook**, putting actual minimum counts and cleaning work in one Home notebook. B has phone Prep/Cleaning tabs with due counts and facing pages on desktop; the cooling strip remains above them. Both retain the current SVG shell, native CSS/type roles and actual Caveat 700 font. Neither adds a global section/service header. Saved scope and Change belong in the relevant worksheet.

Font inspection identified an embedded Caveat SemiBold 600 file in the rejected prototype, where the current app uses Caveat Bold 700. It also identified changed heading roles, substituted masthead/navigation and a different paper treatment. The revision restores these native pieces. Device previews must have real iframe viewport widths so the application's media queries activate correctly.

Revised screenshots reuse the existing `a-*` and `b-*` filenames. Fresh capture, interaction assertions, row/tap measurements and any new council scores must be recorded after they are performed. No new results are asserted by this revision note.

The owner's later clarification also supersedes the earlier cooling-record proposal: shared timers have one-action 2-hour/4-hour presets, optional names, repeated existing `LK_CHIME.play('timer')` at expiry, Stop while running and Done after expiry. Any signed-in kitchen staff member can start/stop/mark Done, expressly including those with Add/Tick disabled. This timer-only exception does not expand other permissions. No temperature/stage/SOP approval or food-safety result belongs to timers. Absolute shared end times survive reload and devices; background/closed-app audio remains subject to browser limits. The source-backed repeat proposal is **[15 seconds]**, coalesced across due timers, with one sound leader per device and a shared-state check after audio resume. Shift pings settings stay unchanged. The historical observation/acknowledgement checks below do not define this revised feature.

The owner also requires a **Par levels** area integrated into the authorised Admin, Head Chef and Sous Chef panels. Staff sheets display approved pars without target-edit authority. Shared sections/shifts stay Admin-only. No new implementation or verification result is implied by these instructions.

## Revised preview verified, 8 November 2026

The owner rejected the first phone designs and clarified the scope: simple shared 2-hour/4-hour timers with the existing repeating chime, plus a new integrated Par levels area for Admin, Head Chef and Sous Chef. The revised A and B use the actual application CSS, extracted SVG shell/navigation and the correct Caveat Bold 700 alongside Barlow/Barlow Condensed. A is a pinned overview; B opens real prep-count rows in a ruled service notebook with Prep/Cleaning pages. The palette is identical and there is no global section/service selector header. A local Change disclosure belongs inside a worksheet.

**149 revised-prototype browser assertions passed**, zero failed and zero page errors. This is isolated browser evidence with all external requests blocked. Coverage: both layouts, six screens and 390/768/1280 widths; native day typography and identical palette; different phone structures; no visible global selectors; five-role procurement/panel gating; eight conditions; Par levels edit entry for Chef/Admin and denial for staff; existing Admin authority for shared sections; active Prep/Cleaning announcements; amount focus; scope changes clearing the old section's demo amounts; navigation focus; retained failed zero input; one-action 2-hour/4-hour starts; another staff member's Stop/Done; other timers staying active; in-document navigation preserving a demo deadline; and genuine 390 px iframe review mode with a two-frame comparison.

A controlled-clock check replaced only sound output with a counter: opening the preview emitted no sound, an explicit sound-demo action called the existing `LK_CHIME` timer sound, the repeat occurred after [15 seconds], and Done prevented later repeats. This verifies calls into the real chime API and the prototype scheduler, not physical speakers, production cross-device delivery, locked/background or closed-browser alarms. The preview's Test chime button calls the unchanged existing sound code. A repeated-alarm demo is explicitly opened and started by the reviewer.

Prototype timers stay in that document's memory across preview navigation. They are not real shared kitchen records, are not retained on reload, and prove no backend persistence or session authorisation. Shared confirmation, cross-tab audio leadership, remote Done and failed acknowledgements remain production acceptance work. Current Add/Tick-disabled, view-only and porter timer permissions are specified as the owner's explicit timer exception, not represented as independently proven backend rules.

Two additional focused checks confirmed that the Admin panel preview retains Reports while the Chef preview does not imply owner-only report access.

28 new v2 screenshots cover both layouts at phone/tablet/desktop widths, staff feature views, Admin and Chef Par levels panels, all eight management subpages and five exception states. No page errors or horizontal overflow were detected in those captures. The old 9-file/423-check baseline was not rerun: no production-loaded file or rule changed.

At 390 × 844 on the illustrative busy-day fixture, A shows three complete Now and next rows and three pinned groups in its full overview. B shows two complete prep-item rows above the fixed navigation, with zero global scope selectors; its cleaning page is a labelled tab. These are different tasks and are not comparable task-throughput figures. The ordinary Prep list is untouched: its prior busy-fixture 3 staff / 2 chef row baseline and one-tap primary actions remain the implementation regression target. A opens minimums in one tap before Record amount; B exposes Record amount directly on Home. B's phone Cleaning page costs one tab tap. Timer presets, Stop and Done are each one action on the timer page.

### Fresh review of the revision

Six independent agent review passes, with the role-based limitations stated. Scores are design judgements, not a user study.

| Perspective | A | B | Main trade-off or correction |
| --- | --- | --- | --- |
| Working cook | 4/5 | 3/5 | A supports quick scans; B records amounts directly. Move B's next food time above the worksheet |
| New staff | 4/5 | 3/5 | A easier to enter; clarify one finished timer versus the total |
| Product / head chef | 4/5 | 3/5 | Real overview-versus-work difference. Keep timer terminology simple |
| Accessibility / screen design | 4/5 | 3/5 | Native controls and input focus work; expose worksheet selection and update changed scope |
| Security | 4/5 | 4/5 | Same permission boundary; B needs extra draft/handover testing |
| Maintainer / skeptic | 5/5 | 4/5 | A smaller integration; both need one shared controller/subscription lifecycle |

Adopted: B's next food time above the book; no duplicate event card; 1 finished, 3 total timer wording; 3 timers instead of 3 batches; active worksheet `aria-pressed` verified; changing section updates scope and removes the previous section's example counts; and local-only timer/persistence disclaimers. No option is chosen. A is recommended for a calmer Home; B is the direct-work alternative.

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

A later pre-merge inspection also found [draft #607](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/607), a separate pending Head/Sous panel comparison. Its selected panel must be reused for the new Par levels entry. No panel choice or owner-only authority is inferred from that draft.

## Superseded initial council

Historical role-based agent review, not research with real kitchen staff. Its rankings refer to the rejected first presentation and do not rank Familiar Home against Working notebook. Exactly two designs were requested, which overrides the general three-design guidance. The initial review used the complete written proposal and actual baseline screenshots; the prototype was not ready then, so those reviewers explicitly limited their visual claims.

| Perspective | Initial verdict | Ranking | Challenge adopted |
| --- | --- | --- | --- |
| Working chef under service pressure | Build | A then B | Busy-phone selected section action must remain easy to reach below bounded alerts |
| Product designer | Build | A then B | Demonstrate 3 batches, overdue cleaning and In service function together at 390 px |
| New staff / keeper of book | Build smaller | A then B | Selected scope must be obvious; use Record usable amount and Cannot check, Ready is derived |
| Accessibility reviewer | Build | A then B | Stack narrow prep rows with explicit labels and accessible item-and-unit input names |
| Security/data integrity engineer | Build in staged units | A then B | Preserve individual capabilities; navigation does not grant authority; name procurement review owner; server-enforce immutable evidence |

Round 1: four Build verdicts and one Build smaller. All five ranked A ahead of B from the written layouts and baseline images. The product/accessibility/security proposals were accepted into the written contract. The new-staff recommendation means staged complete slices rather than dropping any of the five required features. No reviewer is presented as a real chef/staff participant or as evidence of deployed security/accessibility.

## Superseded prototype review and checks

Six fresh reviewers examined the rejected first prototype: working chef, product/head chef, new starter, accessibility/screen design, security, and architecture/keeper of book. **Five preferred its A; security rated its options equal because the same data boundary is required.** These were agent review passes, not staff research. The accessibility reviewer additionally exercised that phone prototype in Chromium. These preferences are superseded and must not be carried forward as scores for the revised options.

The earlier pass checked six tabs, bounded attention rows, side-by-side phone scope, derived readiness, distinct cooling actions, navigation focus, status chips, role gating and loading/missing states. Its claimed match to the current masthead and fonts was contradicted by the later source/font audit described above. The owner rejected the global scope block and shared phone structure. Simulated confirmations persisted nothing; its cleaning references were illustrative and missing setup did not present an approved task.

**Historical first-prototype result in standalone Chromium:** 83 assertions passed, zero failed, zero page errors. Checks covered its two layouts and six feature screens at 390/768/1280 widths; eight Home conditions; five-role procurement DOM gating; all eight management subpages; chef denial for shared sections/shifts; heading focus after navigation; quantity-input focus; acknowledgement remaining unresolved; and failed quantity entry retaining an explicit zero. Network requests outside that local prototype were blocked, confirming that version ran without backend or external dependencies. This verified an isolated mock, not server permissions, correct native styling or real record persistence. It does not verify the revision.

That prototype script passed `node --check` and its local Markdown links resolved. Fresh parsing/link/diff checks belong to revised packaging. Capture scripts and assertions are scratch tools outside application/test source. They add no runtime dependency. Embedded Barlow, Barlow Condensed and Caveat retain their SIL Open Font Licences in the HTML and `font-licenses.txt`.

In the rejected first version's 390 × 844 screenshots, two full attention rows and the first selected-section action were inside the viewport: its A Minimum prep action bottom was approximately 687 px on the busy day and 631 px normally; its B was 690/634 px. The complete minimum sheet showed one full rich item row. These are superseded density results, not measurements of the revised native layout or Working notebook. Historical image files remain for traceability; the revised comparison uses separately named v2 captures.

| Historical first-version action | Existing app | Rejected A | Rejected B |
| --- | --- | --- | --- |
| Open ordinary Prep from its tab | 1 tap | 1, unchanged | 1, unchanged |
| Tick / On it / Urgent / linked Recipe | 1 tap in ordinary Prep | 1, unchanged | 1, unchanged |
| Open selected Minimums from Home | No minimum sheet | 1 tap, browser exercised | 1 tap |
| Enter usable quantity from Minimums | No counted-stock workflow | Record usable amount, then Save after entry | Same |
| Record temperature from Home | No batch workflow | Open Cooling, Record temperature, Save observation | Same |
| Record cleaning from Home | No dated schedule | Open Cleaning, Record completion | Same |
| Full ordinary Prep rows on busy 390 px fixture | Staff 3 / Chef 2 | Unchanged ordinary list | Unchanged ordinary list |

These historical tap values for ordinary work are source observations plus existing click-test coverage, not a timed staff study. First-version controls were exercised where stated. Revised paths differ: Familiar Home opens worksheets, while Working notebook permits inline prep counts and adds an explicit Cleaning-tab tap on phones. Revised counts must be measured before reporting results.

## Verification after approval

New production business rules, data permissions and actual persistence are **not implemented or verified**. The acceptance plan in the brief requires controlled-clock timer expiry/repeated-chime/Stop/Done tests; all-role rule call shapes including the all-kitchen-staff timer exception; Par levels panel access and staff edit denial; second-device persistence; concurrency; unresolved handover; audio settings/wake; failures/offline saves; history; backup/PIN-move; compatibility and rollout rehearsal.

Real background, locked-device, closed-browser, physical sound and installed-iOS/Android behaviour remain untested. Automated preview or desktop checks cannot prove those. The timer contract is persistent expired state and a repeating existing chime while enabled foreground code can run, until any kitchen staff member marks Done; no guaranteed closed-app alarm.

## Current status and resume

Designed: specification and isolated illustrative prototypes. Implemented: no production features. Merged/deployed by this work: no. Production data/rules changes: none.

Next action is review of the revised A, Familiar Home, and B, Working notebook, with fresh verification recorded separately. PR #606 remains draft; no design choice is recorded. After design approval, refresh main/open work, finalise role call shapes and missing venue inputs, then implement Unit 1. Keep incomplete operational setup visible and gated; do not convert demo figures into approved targets or procedures.
