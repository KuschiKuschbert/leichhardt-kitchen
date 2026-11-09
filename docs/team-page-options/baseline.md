# Current Today's team baseline

10 November 2026. Frozen application commit `29258e6420714209616fdcd1fe3ff2c2dfec0299` (PR #645). This records the current C worksheet and selected-day filter, before any new design. No production change or new design is selected by this baseline.

The browser uses ten fictional eligible staff: eight selected for this date and two unselected. There are Lunch, Dinner and a custom Smoker service, a Dinner-only person, two active saved breaks and an additional later break. The clock is staged at Tuesday 10 November, 14:00 Queensland time. Every Firebase record and write is a test stand-in. All five existing Barlow, Barlow Condensed and Caveat font faces are loaded from a TLS-verified local cache.

## What is already on the page

Each selected person's row already has a section picker beside their name. All eight pickers stay inside their own row in every captured size, including the largest-text long-name case. The service choices are global tabs; there is no per-person service picker. The clarified request adds that row-level service context alongside the section control.

Only staff selected on at least one configured service appear. The Dinner-only person remains in the Lunch worksheet with Not on Lunch. The two unselected names remain available in Add staff, without adding worksheet rows.

## Initial viewport and scrolling

The viewport is 844 px high. Complete rows count only if wholly above the fixed phone navigation or the viewport bottom. Save top is its initial document position, before scrolling.

| Current route | Width | First row top | Complete initial rows | Save top | Top bar height | Outer frame before planner |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Direct Team | 390 px | 654 px | 1 | 1367 px | 64 px | 16 px |
| Direct Team | 768 px | 647 px | 2 | 1353 px | 96 px | 24 px |
| Direct Team | 1280 px | 655 px | 2 | 1361 px | 96 px | 24 px |
| Chef panel Team | 390 px | 931 px | 0 | 1644 px | 64 px | 296 px |
| Chef panel Team | 768 px | 990 px | 0 | 1697 px | 96 px | 371 px |
| Chef panel Team | 1280 px | 944 px | 0 | 1650 px | 96 px | 317 px |

The direct phone fits one complete person initially; the embedded planner fits none. The embedded route adds 296 px after the 64 px phone top bar before the planner begins. Inside that planner, the heading, date controls, saved break board, service tabs and search take another 570 px before the first person. The saved break board itself is 193 px high on the phone and 178 px on tablet/laptop. This isolates outer management navigation and inner planning overhead rather than assuming the row picker is missing.

Normal rows are 77 to 80 px high. At largest phone text, rows are 99 to 142 px high. Long fictional names and section labels remain contained, but wrap: the stressed first row becomes 284 px high, and the direct Save moves to 2364 px; the embedded Save is at 2689 px. Neither largest-text phone view has a complete initial person row. This is a vertical space and scanning cost, despite the absence of horizontal overflow.

All ten route/width/text/stress scenes have eight unique rows and eight section pickers, no second section picker in details, no horizontal page overflow, no browser errors and no visible button/summary/picker target below 44 px. The unchanged fixture makes 13 total stand-in reads, three for team/training data, in every scene.

## Observed task paths

These counts follow the visible controls and verify the final state in the stand-in. Opening a picker and choosing an option is two taps. Scrolling and typing are excluded. All Save counts include the explicit dated Save and its acknowledged outcome.

| Current task | Taps | Scope |
| --- | ---: | --- |
| Correct a section on the visible service, then Save | 3 | Picker, choice, Save. |
| Correct a section on another service, then Save | 4 | Global service tab, picker, choice, Save. The first service is retained. |
| Add two more people to Lunch and Dinner, then Save | 6 | Open Add staff, tick two names, tick Dinner beside preselected Lunch, Add, Save. Section corrections are separate. |
| Correct an existing break, then Save | 4 | Edit breaks, time picker, time choice, Save. |
| Spread 30-minute breaks with starts 15 minutes apart, then Save | 5 | Open tools, spacing picker and choice, Spread, Save; existing 12:00 start, 30-minute duration and one-at-a-time defaults retained. |
| Select another date in the loaded week | 1 | Its own selected people and draft appear, with no added read in this cached week. |
| Select another global service | 1 | All selected-day people stay available; service-specific sections and breaks change. |

If start time and break duration are also deliberately chosen in the Spread path, each adds two picker taps. A proposed per-row service dropdown plus section dropdown and Save would ordinarily take five taps, versus four with today's global service tab when changing another service. A row-level design needs to earn that extra tap or avoid it through a clearer control/default.

## Saved plan and draft boundary

A changed break row shows the new draft time and Unsaved changes while the charcoal board keeps the previously saved return time. The saved record and board stay unchanged before Save. Future-date navigation shows only that date's selected people; it does not publish a current-day change.

Spread keeps existing long splits and other services while replacing the chosen service's meal breaks. In this deliberately mixed fixture, a 12:00 start with 15-minute spacing also creates a meal break overlapping one person's retained split. This is reproduced fixture behaviour, not a finding about the real roster. The action does not automatically resolve that schedule conflict, so a redesign should retain clear review rather than imply conflict-free scheduling.

## Inspectable evidence

- `baseline-measurements.json`: all ten geometry, picker-coordinate, font, read and error records.
- `baseline-task-paths.json`: seven exercised paths, acknowledgements, saved-versus-draft evidence and preserved services/splits.
- `baseline-team-{390,768,1280}.png` and `baseline-chef-{390,768,1280}.png`: actual initial viewports; matching `-full.png` files retain the full page.
- `baseline-{team,chef}-390-xlarge.png` and `baseline-{team,chef}-390-xlarge-long.png`, plus matching full pages: largest text and long-label stress.
- `baseline-draft-break-row-390.png`: expanded draft controls before Save.

These are local real-renderer checks with synthetic data. They establish the current layout and task paths, not production attendance, live permissions or staff usability research.
