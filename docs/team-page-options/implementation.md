# Today's team: C implementation

10 November 2026, Queensland. **Implemented and locally verified; hosted checks and release pending.** The owner chose C, Roster and focus, saying "okay lets go with c". Existing focused [PR #652](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/652) carries the application implementation. The [brief](brief.md) owns the choice, original independent council votes, preview comparisons, dissent and rejected all-three blend. No further design-choice gate or full council round is needed for faithful implementation.

## Changed contract

The shared direct Team and chef-panel planner keeps one selected-day roster. Each person has a labelled **Service to edit** and **Section** pair. A row starts on a service that person actually works; its later view choice is private memory state, separate for each person/date. Viewing another service cannot add/remove membership, alter another service's section/breaks or save anything. No section keeps membership. Adding or removing a service is an explicit named draft action. Keep known editable usual-section defaults through existing helpers.

The complete existing week is revealed from the selected date, with full date, written saved/draft/read state, previous/next week and Today. Preserve independent protected drafts, read-only past dates and one version-protected dated Save. The current saved break board stays on today and uses acknowledged records even while editing another date. Its slimmer presentation retains every currently away name, meal/split distinction, checked return time and unknown/error state. Keep current clock paints and confirmed-empty hiding.

Break details name the person, service and date. Use one real editor, beside the roster on a laptop and inline with its person on a phone. Resizing, searching and changing dates must preserve unsaved values and the appropriate view state; no duplicate hidden controls. One notebook-scoped Save remains reachable above the real phone navigation. Its full height, including failure/conflict messages and largest text, must not hide pointer or natural keyboard focus. Keep the shared picker frame and existing Save/acknowledgement helpers.

Retain Add staff for every eligible person, deliberate multi-service group selection, unfinished selections protected with their date, Whole day review of actual memberships, copy last weekday, Spread with independent duration/start spacing and all one/two/all-at-once modes, meal breaks, long splits and complete saved references. Overlap between different people is valid. Flag a meal/split overlap for the same person for review without silently correcting the plan or claiming conflict-free scheduling.

No new data source, listener, poll, saved field, schema, role, rule, read loop, persistent private cache or application dependency. Reuse the bounded cached week query, normal save/version path and authoritative access/recovery guards. Media/geometry observation may position existing controls; it must not read data or create another draft.

## Acceptance and evidence

- A selected person's Lunch and Dinner keep separate sections and breaks while the row service view changes. Different people's service views are independent. Search reveals only the selected day; late Add can restore a removed person.
- No section differs from explicit off-service membership. Removing one service preserves the other; removing the final one removes the worksheet row. Group Add uses existing known defaults and never writes until dated Save.
- Two dates retain independent unsaved data, row context and pending Add choices. Future browsing/saving cannot publish draft break status to staff. Read-only past, midnight rollover, acknowledgement crossing midnight and separate 04:00 recovery retain current contracts.
- The named detail editor retains its values and focus across responsive movement. No duplicate controls. Whole day reflects actual membership, independent of row views.
- Held/repeated/failed/conflicting Save retains dated work and never acknowledges early or overwrites a newer version. Refresh retains current discard protection. Locks, update guards and handover keep their established behaviour.
- Compare the complete implemented app at 390/768/1280 with actual fonts, full shell/forms, the same representative eight-selected/two-unselected fictional fixture, largest/long content and relevant boundary widths. Measure real task paths, unobscured rows and Save reachability; explicitly report departures from chosen Preview C. Verify rendered text/control/focus contrast, 44 px targets, overflow and natural Tab through the last row including failed-save states.
- Run focused team suites, affected Home/roles/device/recovery/read-budget/state/style checks and required CI. Existing client/emulator role/version/time-boundary checks remain authoritative. Local stand-ins cannot establish live persistence, real staff understanding or server enforcement. No disruptive production tests or operational writes.

The evidence agent owns `implementation-evidence.md` and its actual-app captures. This note records final test/release state once those checks complete.

### Behaviour and integration checks

The eight team suites pass **479 checks**: 446 retained assertions plus 33 row-service checks. They exercise actual shared pickers, selected-day filtering, membership/no-section separation, independent person/date service views, Whole day targeting, one moving real editor, search retention, held/repeated Save and separate 04:00 same-person recovery. Existing weekly tests retain midnight and in-flight date acknowledgement cases. Legacy paths were adapted to the chosen disclosed week and row controls; their data, recovery, role and read assertions were retained.

An independent source/browser review found three concrete integration faults in the intermediate C implementation: stale shared-picker remapping could target a changed service, same-person overlap review missed another active service, and keyboard Close details lost focus. `tests/team-picker-context.test.js` fails **6 of 22** checks against that frozen pre-fix C working snapshot and passes **22 of 22** after repair. Context-specific field IDs and captured-context validation prevent wrong-service application without changing the shared picker or write path. Overlap review spans the person's active memberships, and Close restores that row's Edit breaks focus. The snapshot was an intermediate working tree, not a released app version.

The review also caught mobile search removing the reparented editor, responsive movement retaining focus outside the visible area, date selection leaving focus on a newly hidden control, and a future-date link inside today's next-break reference opening the wrong draft. The implementation preserves the real pane during search, checks focused controls against measured Save/navigation after movement, focuses a visible date control and shows all already-loaded next breaks inside the saved-today reference. Focused regression tests cover these paths. No extra read, server write, polling or authority change is part of these repairs.

The first complete-render integration run passed **15 files**: Home board, staff-first Home, staff roster, desktop Home, roles, page roles, read budgets, shared surface/operational colours, screen reader, design patterns, device work recovery, deliberate handover, Save states and safe text. These are browser stand-ins, not live-data or server-enforcement evidence. Final affected visual checks and hosted CI are recorded separately after the frozen implemented-app capture.

The final affected Home board and operational-colour suites pass. The surface suite initially exposed three assertions still measuring the old `.tm-work` wrapper, now intentionally `display: contents`; it now measures the actual roster writing surface with the same colour contract, and all **174 surface assertions** pass. The final design registry passes all 196 named classes, shared tokens/helpers and duplicate-name guards. No production style was weakened to satisfy the old wrapper selector.

The existing dated-header and dated-Save suites also pass all **49 assertions**, including full dates, largest text, wide fallback fonts, stable Save states and no overflow.

### Frozen complete-app verification

The original implemented-app baseline is retained at tag `team-focus-baseline-2026-11-10` (`f15187dd8ccc1275fc268b8f30d09f54bc78114f`) with the matched synthetic captures beside the final evidence. The earlier council source and previews retain their separate original hashes.

[Implemented-app evidence](implementation-evidence.md) and [raw verification](implementation-verification.json) pass **215 checks** across 22 initial and 22 complete open-form scenes, six actual shared-picker paths, 15 control samples, four responsive editor moves and 72 natural-Tab fields including failed/conflicting Save. The implementation's assets match their start/end hashes. Original fonts load in every scene; no horizontal overflow, undersized visible controls or browser errors occur. Sampled enabled notebook text reaches at least 5.199:1, with no unresolved sampled colours. Scoped control labels reach 5.048:1 and boundary/focus 13.531:1; these are computed samples, not whole-app accessibility certification.

At 390 px, complete initial people improve **1 to 2** directly and **0 to 1** in the chef panel, matching C's preview counts. The first person begins at 389.5 px directly and 542.0 px in the actual chef shell; the isolated preview's invented shell was shorter. The full app retains all real room/page navigation, identity, Find/Admin access, fields and references. The final 23.2 px chef-phone margin repair preserves every control and recovers the complete first row. Largest text still fits no complete initial person, as disclosed in the design comparison; Save remains initially visible and all focused controls are reachable above it.

Actual task actions match chosen C: section/Save **3**, another service plus section/Save **5**, two-person/two-service Add/Save **6**, break correction/Save **4**, overlapping Spread/Save **5**, another date **2**. Compared with the old global service/week views, another service and another date each cost one extra action. Matched normal captures keep **13 read calls, including three Team/teamsum paths**; the six task paths add no reads and each Save uses one existing batch. These are stand-in call measurements, not claims about production billing or actual staff behaviour.

## After each action

| Action | Immediate result and feedback | Acknowledgement, failure and recovery |
| --- | --- | --- |
| Choose row service | That person's view and labels change, with explicit off-service wording if needed. | No write or Saved claim. Other memberships remain. Choosing the prior service reverses the view. |
| Choose section | Existing draft updates; named assignment/Unsaved words appear. | Dated Save acknowledges. Clear section is a local reversal; failed Save retains the draft. |
| Add/remove service | Named person/service membership and relevant breaks update in the draft. | Explicit action stays distinct from section clearing. Nothing publishes until Save; existing discard/recovery applies. |
| Open/close dates or details | Named content opens in place and expanded state changes. | No write, unsolicited overlay or success claim. Close/reopen preserves appropriate dated state. |
| Add staff, copy or Spread | Existing draft helpers apply the named group/date/service; show pending/unsaved outcome and overlap review where applicable. | Keep deliberate Add, copy read failure and one acknowledged Save. Other services and break kind survive. |
| Save or Refresh | Shared Saving/date guards or explicit discard protection answer in the same frame. | Existing dated acknowledged stamp, retained failure/conflict drafts, retry and canonical version protection. Stay at the work. |

## Delivery

Local implementation and verification are complete. Required hosted checks and the existing normal release queue remain the delivery gate, tracked in PR #652. Rollback is a focused revert of the new UI/view-state code, scoped CSS and matching tests/docs; preserve stored records and unrelated changes. No data migration or rule publication is proposed.
