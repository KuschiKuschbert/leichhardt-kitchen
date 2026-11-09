# Compact Cleaning management: M1 implementation

9 November 2026. **Chosen and authorised by the owner: M1, A's grouped Today/Week with B's desktop Repeat tasks editor. Implemented and locally verified. Required CI and queued release are tracked in PR #638.** This follows the original three designs, the requested mix council and the concrete M1 preview. The choice settles the layout; no new council round or visual approval is needed.

## Contract

- Canonical admin/head/sous chef access uses the existing Cleaning gate. Staff keep the existing daily list and recording flow.
- Chef Today and Week use groups in this order: General cleaning, Hot larder, Grill, Pans, Final floor clean. Omit empty groups; shared and section-owned general jobs retain their ownership text. Pack-down steps retain numeric order. The existing floor task appears once after pack down and retains each after-service event.
- Groups start collapsed. Open one group with at most six task rows per page. Search across the selected date's full loaded tasks, not only the open group. Visible exceptions can select blocked or awaiting-Pass work without scrolling through other groups.
- Week keeps previous/next, This week and a seven-day selector on every width. It reviews one date and grouped tasks; remove the old full matrix. Summaries use the selected date's loaded occurrence states. Event coverage stays explicitly unknown where applicable.
- Repeat tasks replaces operational content. Search, Add and work-group selection precede a six-row list of all current task revisions, including future-effective tasks. Desktop at 1000 px and above places the selected existing form beside that list; below it the same one form appears inline. CSS relocates the form without a resize listener or duplicate editor.
- Keep one `M.draft`, the existing dirty selection guard, real form fields, validation, acknowledged save states and tomorrow-effective edits/archives. Filters, pages, dates and views never discard unsaved checks or the editor draft. If filtering hides the selected row, its editor stays visible with an explicit context line. A hidden editor draft has a visible return link.
- Existing required checks, explicit events, blocked reasons, Pass mapping, recorder/worker attribution, correction, Undo, midnight rollover and device/session recovery remain authoritative. No backend or rules changes are intended.
- Grouping, search and pages are local over the bounded loaded range. No new Firestore query, listener, polling, schema, persistent private cache or programme seed is added. Switching the requested week retains the existing bounded range read and memory cache.

## Acceptance

Verify the full 51-template fixture, all original Cleaning behaviours and role/release gates at 390, 768 and 1280 px. Cover ordered pages, shared global search, selected-date summaries, one editor across resizing, dirty field and check retention, validation/failure/uncertain saves, import idempotence, history read-only, update/session work guards, safe text and existing read budgets. Measure actual rendered rows and taps with native fonts; keep schematic measurements separate.

## Current design-contract fit

The council guidance was updated on main while this already-approved implementation was being tested. The independent votes remain as recorded; this implementation mapping does not invent a new review or reopen the owner's M1 choice. Sources are the current shared surfaces, operational colours, design patterns, action feedback and loading/motion notes in the reading map.

| Reference principle | Applied or rejected in M1 |
| --- | --- |
| Linear | Keep one page frame, existing view controls and clear action names; no second navigation system. |
| Things 3 | Separate Today, day-based Week review and occasional Repeat tasks setup. |
| Airbnb | Keep area, ownership, method, checks and state together; reject decorative cards and photos. |
| Todoist | Put Add and search before the list; retain real editable fields and required inputs without guessed defaults. |
| Flighty | Use the loaded date and actual records for status; reject new polling and fabricated service coverage. |
| Duolingo | Reuse immediate pending feedback and server-confirmed Saved; no reward or false completion state. |
| Headspace | Use named Open tasks, Back to Today and explicit state words, with the existing readable type and large targets. |

M1 keeps steel work covers, quiet writing paper and the existing local attention/success/failure meanings. The merged surface-colour suite measures effective text contrast at 4.5:1 for normal text or 3:1 for large text, plus the setup return control's visible keyboard outline at 3:1. It passes on Cleaning's ordinary cover/content and Repeat tasks view at all three widths. Existing Save/Not sent/Saved/failure behaviour is exercised by focused and shared state tests. This is not a full contrast audit of every recording state or a full accessibility certification; those remain outside the evidence claimed here.

## Actual-app verification

All seven focused files pass: Cleaning, schedule/checks, team release, navigation, safe text, design-pattern registry and the new chef-layout suite. The new suite passes **101 assertions**, including all 51 current templates, ordered Pans pages, global multiword search, date-specific summaries, one editor across resizing, dirty fields/checks retained through navigation, mixed blocked/awaiting states, keyboard paging, hidden-work return links and no new navigation reads. Existing Cleaning checks also pass for failed rereads, direct-submit protection, uncertain acknowledgements, immutable revisions and both privacy locks.

Another **15 shared suites pass**: read-budget, roles, page roles, private access, context teardown, three typed-work suites, save states, control feedback, adaptive controls, head recovery, editor lock, work recovery and lock/handover. The relevant commands use `CHROME=/usr/bin/chromium npm test -- cleaning safe-text design-patterns` and the matching shared filename filters. No rules, bridge call shape, collection or persisted field changed, so a database migration or rules publication is not needed.

Independent review found an import-range regression introduced by reusing the loaded Week range in setup. Both importers return today-only data. Their results now update the loaded-range identity before returning to Week, so the full week reloads correctly. Removing only this fix causes exactly **2 failures of 101**, one for each importer, while the current source passes all 101. Each regression verifies a confirmed earlier-day worker/completion after import and Week navigation.

The pending-return case also compares a held legacy tick with and without the new return action. Recorder identity, focus and acknowledgement remain correct; the return adds no query while pending and no additional post-ack query relative to the control. An existing force-refresh request still waits for outstanding writes.

The final implementation was inspected with native Barlow, Barlow Condensed and Caveat fonts in **21 scenes** at 390, 768 and 1280 px, including xlarge text. No scene has horizontal page overflow, measured visible controls below 44 px or JavaScript errors. [Measurements](implementation/measurements.json), [phone Today](implementation/chef-today-390.png), [desktop editor](implementation/chef-editor-1280.png), [phone editor](implementation/chef-editor-390.png) and [tomorrow in Week](implementation/chef-week-tomorrow-390.png).

| At 390 by 844, native fonts, all 51 synthetic templates | Before | M1 |
| --- | --- | --- |
| Chef Today document height | 4,241 px | 1,157 px |
| Initial complete task rows | 4 | 0, open a group first |
| Initial complete work-group summaries | Not a grouped overview | 4 of 5 |
| Repeat setup document, no selected form | 10,770 px with daily work above it | 1,824 px, separate view |
| Repeat setup with one real full form | Not compared | 3,117 px |

Desktop Today is 987 px; Repeat tasks is 1,468 px without an editor and 2,072 px with the full real form. These actual-app figures include the existing shell, reminders, full form fields and imports, unlike the earlier schematics. Do not claim five phone groups fit initially or that no scrolling remains. Opening a closed group adds one tap; a later six-row page adds another. Checked task steps otherwise retain their existing disclosure, required checks and Record. Shared devices retain worker selection.

The staff layout comparison switches only the CSS on the same staff DOM: six width/text snapshots retain all **858** measured header, task and control rectangles and document dimensions, with all 47 due task rows. Staff recording is also covered by the original behaviour suites. The new CSS is scoped to the chef page.

These are local synthetic Firebase, browser and source-review results. They do not prove production saves, real-device legibility or full screen-reader/contrast conformance. No production programme was imported or enabled. The original baseline is retained at commit `2cb62ba`, tag `cleaning-chef-baseline-2026-11-09`, and the earlier native-font baseline images.

## Integration with current main

Main advanced to `2841d4d` during verification with the person worksheet/quick-add Team change and updated council guidance. An actual PR conflict was resolved once by retaining both decision histories, session-map entries and design-pattern registrations. Independent source review confirms M1 runtime/CSS are unchanged by the merge and the Team implementation matches main.

The combined run covered the seven focused files plus Team notebook, Team quick-add, Team week, shared surfaces/contrast, roles, page roles, private access and read budget. The surface test was adapted to open the new General group and assert the named Back to Today action. One schedule assertion failed in the initial parallel integration run; that file passed its isolated retry. Both schedule and updated surface suites then passed together serially. The other combined files passed. The required hosted CI remains the final shared gate; the first schedule failure is not hidden as an uninterrupted pass.

## Release and rollback

PR #638 carries the implementation, documentation, actual-app screenshots and tests. Required CI and the normal auto-merge/release window remain the shipping gate. Do not claim the change is live before deployment verification. The existing task programme, imported records, team switch and all history remain unchanged.

Rollback is a normal revert of this client layout change. No data or rules rollback is required. The shared action bridge and lazy API remain compatible; older matrix CSS is retained for compatible saved copies. No startup file, service worker, new script, font or service is added.
