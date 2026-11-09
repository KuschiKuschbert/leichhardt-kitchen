# Isolated prototype verification

10 November 2026, Queensland. These are interactive in-memory sketches using fictional staff, not production implementations or real Firebase tests. All three share the same eight selected people, two additional eligible people, Lunch/Dinner/Smoker services and staged 14:00 saved breaks. Original local Barlow, Barlow Condensed and Caveat files loaded in every scene.

## Fair comparison and geometry

The frozen engine, stylesheet and frame passed 175 checks across 30 scenes: three designs, direct Team and embedded Chef frames, 390/768/1280 px at normal text, plus 390 px largest text and largest text with long labels. All scenes have eight unique person rows with both service and section controls inside the row, no horizontal overflow, no visible target below 44 px and no browser error. Prototype hashes in the JSON confirm one source set was used. The shared surrounding frame is an illustration; these figures are prototype geometry, not proven production improvements.

Complete rows must be wholly above fixed navigation and C's visible sticky Save dock. Each cell below is complete initial rows / first-row top / Save top, in pixels. `review` means B does not expose Save until its Review stage.

| Design / frame | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| A / team | 2 / 465 / 1570 | 2 / 493 / 1612 | 2 / 493 / 1612 |
| A / chef | 1 / 553 / 1658 | 1 / 588 / 1707 | 1 / 588 / 1707 |
| B / team | 1 / 539 / review | 2 / 549 / review | 2 / 549 / review |
| B / chef | 1 / 627 / review | 1 / 644 / review | 1 / 644 / review |
| C / team | 2 / 383 / 722 | 2 / 409 / 789 | 2 / 409 / 789 |
| C / chef | 1 / 471 / 722 | 1 / 505 / 789 | 1 / 505 / 789 |

C's Save is initially visible in the normal-text scenes; A's is below the roster and B's is on Review. At 390 px, the dock reduces C's usable roster bottom to 683 px. Largest text and long labels grow vertically; individual measurements and full-page captures retain those costs.

## Exercised task paths

Counts exclude scrolling and typing. A native select opening and choosing its option count as two tap-equivalent actions; Playwright focuses/selects the real control and verifies the resulting data. These counts describe the implemented control path, not measured OS-menu motor time. Save counts include the simulated acknowledgement. B's Review-stage tap and C's date disclosure are included.

| Task | A | B | C |
| --- | ---: | ---: | ---: |
| Correct section on current service and Save | 3 | 4 | 3 |
| Correct section on another service and Save | 5 | 6 | 5 |
| Add two people to Lunch and Dinner and Save | 6 | 7 | 6 |
| Correct an existing break and Save | 4 | 5 | 4 |
| Spread 30-minute breaks every15 minutes and Save | 5 | 6 | 5 |
| Select another date in the loaded week | 1 | 1 | 2 |
| Select another row service view | 2 | 2 | 2 |

The current application uses four taps for an other-service correction with its global tab. The row dropdown makes that path five in A/C and six in B. This extra tap is a real cost, even though per-person service context is explicit.

## State, keyboard and colour evidence

The 21 task journeys and adversarial checks exercise view-only service changes, distinct No section and off-service membership, explicit Add/Remove service, selected-day filtering, date-specific drafts and row contexts, bulk staff additions, preserved long splits and other-service breaks, a named overlap warning, saved-board authority, held/repeated/failed/conflicting Save, retry and deliberate conflict Refresh. Loading, failed, confirmed-empty, unknown, malformed-break and past-date states keep distinct words and cannot save unchecked/past plans. Keyboard service selection retains focus.

3,703 sampled text/background pairs have no contrast failure or unresolved background; the minimum is 5.199:1. Fifteen representative A service, section, selected-day, enabled Save and charcoal-board control samples across all three widths have at least 4.704:1 boundary contrast and 13.531:1 focus contrast. The keyboard outline is 3 px. Twelve additional samples directly check B's selected Review stage and Review Save, and C's compact-date button and sticky Save, each at 390/768/1280 px: all pass, with minimum boundary contrast 4.704:1 and minimum focus contrast 15.904:1. These are the specific contexts sampled; A's shared controls are not being presented as tests of every control in B/C. The additional pass has 19 successful control/source/error checks. Reduced-motion preference is active in all three focused width checks. These are computed Chromium samples, not a whole-app accessibility certification.

**Reproduced and repaired before review.** The first focused pass found four keyboard occlusion failures in C: at largest text the last service/section fields occupied y775–819 behind a Save dock starting at y665.5 and navigation at y776; the long-label case occupied y727–771 behind the dock. The [original failing execution summary](focus-controls-before-repair.json) preserves these coordinates. A scoped CSS scroll-padding and control scroll-margin repair now keeps keyboard focus above the dock. The focused rerun passes all 34 checks: largest-text fields are y286–330 above the dock at y402; long-label fields are y552–596 above the dock at y665.5. Pointer clicks after deliberate scrolling also pass. The 30-scene/175-check main run was repeated against the repaired frozen source, with no failure. No data or engine change was needed.

## Council follow-up: B stage-label containment

The original round-two votes and evidence remain archived in [the original packet](round-2-original-round-2-packet.md) and `round-2-original-*.json`. Two reviewers independently found a real blind spot: at 390 px largest text, B's Assignments label painted 19.328 px beyond its pill even though page overflow and ancestor text contrast checks passed. The current verifier now measures each visible stage label's actual text Range against its own button rectangle, rather than treating the ancestor box as proof of containment.

The [directed before/after evidence](b-stage-containment.json) reconstructs only the former three-column grid property in an isolated page and reproduces the same 19.328 px right spill in both frames, with and without long labels. The repaired arrangement contains every label in its own button at the actual 20 px preferred text size; stage buttons remain 50 px high. This is an ink-containment assertion, not an assertion that a particular CSS column count must be used.

The repair has a real vertical cost: B's first person moves 88 px lower in these four stress scenes. No complete initial person row fits before or after it.

| B at 390 px, largest text | First person before | First person after | Complete initial rows after |
| --- | ---: | ---: | ---: |
| Direct | 737.08 px | 825.08 px | 0 |
| Direct, long labels | 786.08 px | 874.08 px | 0 |
| Chef frame | 841.47 px | 929.47 px | 0 |
| Chef frame, long labels | 890.47 px | 978.47 px | 0 |

The four original `before-repair-preview-b-*.png` images retain the voted presentation. Current B stress screenshots and measurements are regenerated after the repair. The directed proof passes nine checks. The main 175, focus/reachability 34 and additional-control 19 checks are rerun against the same final source hashes; original votes are not re-scored by this verification.

### Phone-breakpoint follow-up

A focused boundary check then reproduced a second, distinct limit of the first B repair: at 401 px largest text, Assignments still painted 15.656 px beyond the pill in both frames because the initial stacking rule stopped at 400 px. The [failing 401 px record](before-boundary-fix-stage-boundary.json) and the preceding completed evidence remain under `before-boundary-fix-*`.

The stacking rule now uses the existing 700 px phone breakpoint. The bounded [final boundary check](stage-boundary.json) covers 401, 700 and 701 px in both frames: all six scenes contain the actual stage text at 20 px, with no script error and no stage target below 44 px. Buttons are 50 px high except the 701 px Chef-frame pills, which use two contained lines and are 78 px high. All seven boundary/source checks pass. This records the checked widths, not a claim that every possible viewport was exercised. The final main/focus/control evidence is regenerated against this same final stylesheet hash, while the original council votes remain unchanged.

## Reproduce and inspect

Install the existing test dependencies with `cd tests && npm ci`. From the repository root:

```sh
node docs/team-page-options/verify-previews.cjs --ready
node docs/team-page-options/verify-previews.cjs --ready --focus-only
node docs/team-page-options/verify-previews.cjs --ready --extra-controls
node docs/team-page-options/verify-previews.cjs --ready --stage-containment
node docs/team-page-options/verify-previews.cjs --ready --stage-boundary
```

The focused command now passes all 34 checks, including the repaired C keyboard path. The verifier serves the local checkout, blocks external requests and uses `/usr/bin/chromium`; set `TEAM_PREVIEW_CHROME` for another installed Chromium. Optional `TEAM_PREVIEW_PLAYWRIGHT`, `TEAM_PREVIEW_ROOT` and `TEAM_PREVIEW_PORT` overrides support an existing dependency installation, checkout or free local port.

- [Main evidence](preview-verification.json): geometry, original-font results, text contrast, final task states and 175 passing checks.
- [Control and last-row evidence](focus-controls.json): final passing border/outline samples, reduced motion, keyboard coordinates and pointer reachability; the separate before-repair file retains the reproduced failure.
- [New-context controls](new-context-controls.json): B selected Review/Save and C compact-date/sticky-Save samples at all three widths.
- [B label containment](b-stage-containment.json): actual text-Range bounds, reconstructed pre-repair spill, final 20 px labels/50 px buttons and the 88 px vertical cost.
- [B phone-boundary containment](stage-boundary.json): both frames at 401/700/701 px, with the failing earlier 401 px record retained separately.
- `preview-{a,b,c}-{team,chef}-{390,768,1280}.png` and matching `-full.png` show the normal scenes; `390-xlarge` and `390-xlarge-long` retain stress views.
- Draft-break and failed/conflicting-save screenshots retain relevant state examples. `preview-c-last-row-*.png` captures the later deliberate pointer-scroll position, not the earlier failing keyboard position.

Limits: simulated acknowledgements and versions do not prove Firestore rules, real multi-user persistence, authentication, daily locks, handover, reload recovery, attendance or production performance. Native option-menu rendering, assistive-technology use and real kitchen task frequency remain untested. Full historical saved-reference folds are not reproduced. The current head chef chooses a design before application work.
