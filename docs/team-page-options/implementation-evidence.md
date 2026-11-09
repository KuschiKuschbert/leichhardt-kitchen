# Implemented C verification

10 November 2026, Queensland. Local verification of the chosen Roster and focus implementation. This record uses the actual application, including the direct Team page and chef panel, rather than inheriting isolated Preview C measurements. **215 application evidence checks pass** after the responsive focus, scoped Save and chef-phone spacing repairs. The application assets stayed unchanged throughout the final run. This combined run includes main `7f856297` with Orders #642, staff welcome #649 and cooling confirmation #653; it follows the concrete merge conflict resolution, with no further application changes.

## Reproduction and boundary

Install the existing browser dependencies with `cd tests && npm ci`. From the repository root run `CHROME=/usr/bin/chromium node docs/team-page-options/verify-implementation.cjs`; `--baseline` serves paired prep/CSS from current main checkpoint `7f856297e14699711f9fd6b44e08d59d9acb5434`. The checkout must contain that commit. The verifier first checks that index, app, controls and cooling companion files exactly match that main checkpoint, and checks their hashes again after the current run. A mixed old prep/new companion baseline is refused. `--focus-only` runs the additional focused control/reachability checks. Optional `TEAM_APP_ROOT`, `TEAM_APP_PORT` and `TEAM_APP_CHROME` select the checkout, local port and Chromium binary. The default port is 8793; the ordinary click runner uses 8777.

The eighteen matched geometry scenes use the same eight selected and two eligible fictional people used for the previews, on Tuesday 10 November at 14:00 Brisbane. It includes Lunch, Dinner and custom Smoker, one Dinner-only person, meal breaks, a split, a same-person meal/split overlap and two different people tomorrow. Four additional, separately named stress scenes extend the person/section fixture with long service labels at 390/1280 in both shells. The original local Barlow, Barlow Condensed and Caveat faces load. Every Firebase response is a test stand-in. There are no actual staff records or production writes. These checks do not establish live persistence, server enforcement, actual kitchen usability or full WCAG conformance.

## Before and regression checks

[Historical original-source evidence](pre-integration/implementation-before.json) reproduces three changed-contract failures: three selected people have no row Service to edit pickers or focused detail actions, and there are two global service buttons. The original app has no browser errors. [Compatible main baseline](implementation-baseline.json) passes eighteen matched shell/width/text scenes against `7f856297`. The [original f151 baseline](pre-integration/implementation-baseline.json), [pre-integration C verification](pre-integration/implementation-verification.json), original captures and [historical note](pre-integration/implementation-evidence.md) remain separately labelled. They were captured with their then-compatible complete app; their old two-asset overrides must not be replayed against the new cooling/app modules.

The combined tree passes **550 assertions across eleven files**: nine focused team suites total 501 (446 retained legacy assertions, 33 row-service and 22 picker-context assertions), and the dated-header/dated-Save pair totals 49. The merged run exposed five obsolete quiet-layout checks that still measured `.tm-work`, now `display: contents`; measuring the actual `.tm-focus-grid` retains the full writing region and single contextual workbench assertions. The quiet rerun passes all 117 assertions. No application source or semantic assertion was changed for that repair. The legacy files preserve their assertion counts and data, role, read, draft, recovery, version, clock and Save coverage. The new file exercises view-only service changes, separate Lunch/Dinner drafts, No section versus explicit attendance removal, actual-worked-service defaults, selected-day filtering, named Whole day edit, one responsive editor, search-away/clear, dated person context, acknowledged saved-board authority, zero extra loaded-week reads, held/repeated Save and 04:00 recovery with the same chef. Existing week tests retain failed/conflicting dated Save, read-only past, midnight and acknowledgement crossing midnight.

A new actual-visibility assertion first failed after resizing a focused Ann Lunch editor from 1280 to 390. The same DOM editor, value and active control survived, but its 14:15 trigger was at 827.875–871.875 px while Save began 701.656 px and navigation 776 px. The pointer centre was obscured. [Before coordinates](pre-integration/implementation-responsive-before.json) and [before screenshot](pre-integration/implemented-responsive-before.png) retain that reproduced failure. The repaired focused suite passes with the control above the measured dock and navigation. Three keyboard date checks also reproduced focus falling to `BODY` when a new date's week disclosure closed. The repaired checks require visible focus on the named selected-date button or compact date control.

## Task paths

These are actual shared-picker actions with acknowledged Save. The historical worksheet column retains the original pre-integration task path; the combined C column is rechecked after the main merge. Opening a picker and choosing its option count as two. Scrolling and typing are excluded.

| Task | Historical worksheet | Chosen Preview C | Combined C |
| --- | ---: | ---: | ---: |
| Correct the visible-service section and Save |3|3|3|
| Choose another service, correct section and Save |4|5|5|
| Add two people to two services and Save, before section corrections |6|6|6|
| Correct an existing break and Save |4|4|4|
| Spread 30-minute breaks with starts 15 minutes apart and Save |5|5|5|
| Choose another date |1|2|2|

Another-service correction costs one additional action, and choosing another date requires opening its disclosure. Row context avoids changing every person's view. Existing selected people keep direct section and break corrections; adding unselected staff remains a deliberate group action. Whole day remains optional and its named edit action targets the person/service, independently of other row views.

## Full-app geometry and reachability

Final paired geometry, control contrast, responsive movement and natural Tab results are recorded in [the application verification](implementation-verification.json). Initial complete-person counts exclude the actual visible Save dock and fixed navigation. An open break form is measured separately from the initial roster at each shell, width and text setting. Screenshots name `implemented-team-*` or `implemented-chef-*`; `-workbench-full` includes the complete named editor and actual shell.

The prototype remains a design comparison. Its shell, native picker stand-ins and compact invented references are not the complete application. The implementation keeps the shared picker, full saved references, actual access/status controls and real chef navigation. Initial density and Save position must use the delivered measurements below, not Preview C's figures.

| Shell / width | Main 7f856297 first row / complete people | Implemented first row / complete people | Implemented Save top |
| --- | ---: | ---: | ---: |
| Direct Team / 390 | 654.1 px / 1 | 389.5 px / 2 | 719.6 px |
| Direct Team / 768 | 646.6 px / 2 | 405.4 px / 2 | 787.6 px |
| Direct Team / 1280 | 654.6 px / 2 | 405.4 px / 2 | 787.6 px |
| Chef panel / 390 | 930.8 px / 0 | 542.0 px / 1 | 721.6 px |
| Chef panel / 768 | 990.1 px / 0 | 586.7 px / 1 | 789.6 px |
| Chef panel / 1280 | 943.7 px / 0 | 516.1 px / 1 | 789.6 px |

All 22 initial scenes and 22 complete open-form scenes have eight unique selected people, paired row controls, no horizontal overflow, no visible targets below 44 px within subpixel tolerance, and no browser errors. Save is initially visible above the actual navigation throughout. At 390 largest text, neither shell fits a complete initial person, including the long-label scenes. The normal direct phone matches Preview C's two complete people and the chef phone its one. First-row positions differ because the full app retains its actual shell, full date/state labels, shared picker and complete saved references.

The last scoped spacing repair recovers 23.2 px from existing chef-phone navigation/heading margins. [Before evidence](pre-integration/implementation-chef-spacing-before.json) records first row 565.25 px and zero complete people; the final row starts 542.05 px and one complete person fits. Controls and targets remain present. [Before screenshot](pre-integration/before-chef-spacing-implemented-chef-390.png), [final direct phone](implemented-team-390.png), [final chef phone](implemented-chef-390.png) and [complete chef laptop editor](implemented-chef-1280-workbench-full.png).

The final run checks 3,800 visible notebook text samples with zero enabled-text failures or unresolved computed colours; minimum enabled notebook text contrast is 5.199:1. Forty-four disabled Save samples are explicitly exempt rather than counted as enabled-text successes. Fifteen representative service, section, date, enabled Save and Saved details control samples across 390/768/1280 have minimum label contrast 5.048:1, boundary contrast 13.531:1 and focus contrast 13.531:1, with 3 px visible keyboard outlines. The sampler composites alpha and supports computed sRGB colour-mix values. Hidden details, OS menus, the shared picker's separate dialog, artwork and whole-app conformance are outside this scoped colour pass.

All 72 natural-Tab last-person field checks pass across both shells at normal, largest, long-name/section and long-service stress, including draft, failed and conflicting Save states. They check full control geometry above the measured dock/navigation, the actual hit at its centre and visible keyboard focus. Four responsive moves retain the same editor node, active labelled control, exact draft value and full pointer reachability after 1280→390. Pointer-driven responsive samples do not require a keyboard focus ring; the natural-Tab samples check that separately.

The compatible main-baseline and combined C normal scenes each request 13 read calls, including 3 Team/teamsum paths: the measured delta is zero in both counts. The archived pre-integration scenes also recorded 13/3, but they are not used as a substitute for this compatible paired run. The six actual task paths add no reads. Each Save task uses one existing acknowledged batch; date browsing sends none. These are local call measurements, not a new estimate of billed production reads. Existing read-budget, role, session and server-rule gates remain separate evidence.

Final asset SHA256 values are identical at the beginning and end:

- `js/prep.js`: `d4c6f3d97ea766d62070921f518b33cc8f51469abaed2133d237fb2baea8153e`
- `css/app.css`: `611ac35a6337fdf7ee58d1855c71f791e2041a2da0ae560fbda732a4d7d79474`

The raw evidence also records the seven matching main companion hashes and their unchanged current-run values. The active baseline prep/CSS hashes are `2faa942eb130ff4eb23649a98500b7b09a8503df634c90387adcfc4588ad494d` / `fd6bcd207842a560a8333140579f0c2bae15c296d2a462941b7347c69c489904`.
