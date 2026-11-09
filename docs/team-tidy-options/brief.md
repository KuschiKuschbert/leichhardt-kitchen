# Quieter Today's team management

9 November 2026. **A, Quiet notebook, chosen by the head chef, implemented and locally verified. CI and release pending.** The empty-break-board change is retained in this work.

The head chef asks to tidy the noisy Today's team page for admin, head and sous chefs. [Proposal](proposal.md). Keep the notebook, week planning and the existing service/access/data contracts. Do not replace them with a second roster.

## Round 1

**Verdict: Build smaller, 5 of 5.** Five fresh reviewers read the neutral proposal and actual-app screenshots. This is role-based analysis, not staff research.

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Make people visible sooner and keep the useful saved break status easy to read. |
| Head chef | Build smaller | Remove duplicate people and bring Save closer before changing a familiar allocation method. |
| Skeptic | Build smaller | Existing section-first allocation is already fast; a broader board needs to earn its learning cost. |
| New starter | Build smaller | Current section plus Choose a section reads as if the assignment is missing; label editing actions clearly. |
| Keeper | Build smaller | Reuse one editor, retain disclosure/draft state and preserve failed/stale status. |

All five identified the duplicate people list and distant Save as the primary issues. All five asked to measure any added break-editing tap against saved scrolling. There was no verdict disagreement. They did not establish how frequently this kitchen edits sections versus breaks.

## Baseline

Eight fictional people, two configured shifts, two active saved breaks at 14:00, actual Barlow and Caveat fonts, 844 px-high viewports. Firebase is the stand-in; no real private records are used. A direct page and the embedded chef-panel Plan use the same planner. Verified-admin access stays on its current entry points and authority checks.

| Current view | Complete initial assignment rows | First person top | Repeated fine-adjustment rows |
| --- | --- | --- | --- |
| Direct Today's team, 390 px | 0 | 822 px | 8 |
| Direct Today's team, 1280 px | 1 | 688 px | 8 |
| Chef panel, 390 px | 0 | 1099 px | 8 |
| Chef panel, 1280 px | 0 | 977 px | 8 |

No browser errors or horizontal overflow occurred. See `baseline-measurements.json` and `baseline-*.png`. This fixture has two people currently away; the new confirmed-empty hide does not change it.

Assignment on an open shift takes section, person and Save: three taps, excluding scrolling and typing. Another person in the same selected section adds one tap. A break picker typically takes open and select, then Save; the current fine-adjustment list is already open. Layout previews will report their own counts and will not claim baseline density as their implementation result.

## Three layouts to compare

All three retain weekday selection and navigation, configured shifts and Whole day, sections, meal breaks and splits, selected-weekday copy, Spread them, one explicit dated Save, independent drafts and conflict/error handling. Secondary tools may fold, but their names and summaries stay discoverable. Current saved breaks remain distinct from drafts and disappear only when confirmed empty.

### A, Quiet notebook

Keep section-first assignment. One compact selected-date/status heading, the week strip, shift and section choices, then each person once with their current section and a short break summary. Reveal that person's detailed controls deliberately, rather than showing a second full list. Put the single Save directly after the people and keep secondary batch tools below it.

Strength: familiar assignment with substantially less repetition. Tradeoff: opening a person's break editor adds a tap compared with the currently expanded fine-adjustment list.

### B, Section board

Group the selected shift's people by section, columns on a laptop and groups on a phone. Assign or move through a section's inline person chooser; each person's details stay in that one place. Keep one dated Save and the same week/shift controls.

Strength: section coverage is the first thing to scan. Tradeoff: finding a particular person and editing several sections means moving between groups and choosers.

### C, Person worksheet

One compact row per person, with their section choice and break summary together. Open that row for detailed shift/break changes. A laptop uses a worksheet, while phones keep full-width rows. Week selection and one dated Save remain shared.

Strength: direct person-by-person corrections. Tradeoff: bulk assignment loses the shared selected-section shortcut and each person's picker takes its own selection.

### Preview measurements

The previews use a compact schematic management frame shared by all three concepts. It omits some current outer-panel space and does not prove that the production frame will reach these exact counts. The actual baseline and these illustrative preview measurements are deliberately separate. All concepts use the same eight fictional people and active break fixture, actual Barlow/Caveat fonts and 844 px-high viewports. See `preview-measurements.json`.

| Preview measure | A, quiet notebook | B, section board | C, person worksheet |
| --- | --- | --- | --- |
| Complete initial people at 390 px | 3 | 3 | 4 |
| Complete initial people at 768 px | 3 | 3 | 3 |
| Complete initial people at 1280 px | 3 | 8 | 3 |
| Save top at 390 px | 1100 px | 1282 px | 1053 px |
| Main allocation plus Save | 3 taps | 3 taps | 3 taps |
| Additional person on the same section before Save | 1 tap | 1 tap while chooser stays open | 2 picker taps |
| Change a break plus Save | 4 taps | 4 taps | 4 taps |
| Current baseline break change plus Save | 3 taps, details already open | Same baseline | Same baseline |
| Empty-day copy plus Save | 3 taps through Tools | 3 taps through Tools | 3 taps through Tools |
| Current empty-day Use it plus Save | 2 taps | Same baseline | Same baseline |
| New global navigation or automatic service popup | None | None | None |
| New reads, listeners, schema or permission | None proposed | None proposed | None proposed |
| Proposed size | One shared-renderer feature PR | One larger shared-renderer feature PR | One shared-renderer feature PR |
| Main learning cost | Low, per-person details replace the second list | Medium, assign via section groups | Medium, per-person pickers replace selected-section mode |

Tap counts follow the actual preview controls: A selects a section then a person; B opens a section chooser then selects a person; C opens a section picker then selects its option. Save adds one. Breaks open the person's details, then the time picker and its option, then Save. All use 15-minute time options. Copy opens Tools, uses last weekday, then Save. Counts exclude scrolling and typing. Save still needs scrolling with eight people; its exact position is above, not claimed to be initially visible.

All nine width/concept combinations had no page overflow, browser exception or initially visible button/form target under 44 px. Each concept passed section change, date away/back preserving that draft, explicit Save and a per-person break edit. Collapsed people appear once; expanded details do not create a second full roster. The prototypes are in-memory interaction sketches, not proof of production persistence, permissions or the full multi-shift break model. The real implementation must reuse the current validated shift-specific data helpers.

## Round 2 and recommendation

Six fresh reviewers saw all three concepts, their phone/desktop screenshots, expanded A details, the baseline and measured comparison, without a preferred option. Scores are 3 for first, 2 for second and 1 for third.

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook mid-service | A | C | B |
| Head chef | A | C | B |
| Skeptic | A | C | B |
| New starter | C | B | A |
| Keeper | A | C | B |
| Kitchen screen designer | A | C | B |

**A 16, C 13, B 7. A first for 5 of 6.** The new starter preferred C because the section picker is an immediately obvious control beside the person's name; choosing a section then a person needs learning. That is a real clarity benefit, not agreement with A. The other five favoured retaining the current fast allocation model while removing repetition. B's coverage view was useful on a laptop but added grouping/chooser state, repeated phone actions and the longest path to Save.

Recommendation: **A, with clear labels from C and section counts from B in the existing chips.** Replace bare disclosure arrows with a labelled Edit breaks or Details action. Keep break summaries legible and saved live status clearly separate from changed draft rows. Put Save after the one main roster and secondary copy/break tools below it. Preserve deliberate disclosure/focus state and measure the result inside the real management frame.

All reviewers noted the extra disclosure tap for breaks and copy, and that the schematic counts are not production proof. The head chef subsequently chose A below.

## Acceptance contract for the chosen implementation

- One shared renderer for the existing direct and management-panel entry routes; no duplicate editor, new backend, listener, permanent private copy or extra database read.
- People appear once in the main flow, with current shift/section and a visible break summary. Detailed controls remain easy to find and keep deliberate open state across redraws and resizes.
- Full selected date and saved/dirty/failed status remain clear. One explicit dated Save stays within the planning flow and acknowledges server success; failed saves retain the draft and version conflicts cannot overwrite another chef.
- Preserve week navigation, independent date drafts, Whole day review, per-shift section assignment, membership/removal, meal breaks/splits, selected-weekday copy and Spread them. No guessed hours or seeded real staff.
- Current saved break status remains authoritative, with unknown/malformed/error states visible. Confirmed empty is hidden. Clock paint can change status without replacing focused inputs or changing drafts.
- Current-day staff Home, Your day, section defaults and chip remain unchanged. Future plans cannot become today's live state. Past dates remain read-only here.
- Measure primary assignment, break correction and empty-day copy, including added disclosure taps and scrolling. Verify at 390, 768 and 1280 px, normal/largest text, keyboard focus, 44 px targets and no page overflow.
- Recheck canonical chef/admin access, saved-vs-draft state, failed/cache-only reads, conflicts, protected work, midnight and unchanged read costs. Prototypes do not prove real Firebase persistence or production permission checks.

## Chosen and build

The head chef chose **A: Quiet notebook, one list (recommended)** in chat on 9 November 2026. Implement the shared section-first notebook with one person list, visible current section/break summaries, labelled per-person Edit breaks disclosures, section counts, a compact selected-date/status header, the compact saved break board and one dated Save before secondary tools. Preserve all existing data, role, clock and recovery contracts. Do not maintain the three preview editors in the app.

The implementation reuses `teamPageHTML()` for direct and management-panel entry points. Each `.tm-person-row` contains the existing assignment control and a labelled native `.tm-person-details` fold; `tmRow()` supplies the original controls inside it. Per-person folds are independent by date and shift. Section counts and row summaries come from the selected draft. The compact header names the date and saved/dirty/failed state. One dated Save follows the roster; Copy a day or spread breaks, Next planned breaks and Saved shift overview are named folds. Future saved overviews are also folded. The active break board still reads the saved current-day record.

## Implemented measurements and checks

These are measurements of the real shared planner in its actual outer frame, not the sketches above. The fixture matches the baseline: eight fictional people, two shifts, two active breaks, 14:00 kitchen time, original fonts and an 844 px-high viewport. See [measurements](implemented-measurements.json), [direct phone](implemented-team-390.png), [direct desktop](implemented-team-1280.png), [chef phone](implemented-chef-390.png) and [chef desktop](implemented-chef-1280.png).

| Real app view | First person before | First person after | Complete initial rows before / after | Separate fine-adjustment rows before / after |
| --- | --- | --- | --- | --- |
| Direct, 390 px | 822 px | 706 px | 0 / 0 | 8 / 0 |
| Direct, 1280 px | 688 px | 529 px | 1 / 2 | 8 / 0 |
| Chef panel, 390 px | 1099 px | 983 px | 0 / 0 | 8 / 0 |
| Chef panel, 1280 px | 977 px | 818 px | 0 / 0 | 8 / 0 |

The phone's live break board and the management panel's existing navigation still occupy space. With eight people, Save requires scrolling: 1403 px from the viewport top in the direct phone view and 1680 px in the embedded view. The production result does not reach the schematic preview's three initially visible phone rows. Its benefit is one roster and less repeated instruction/reference content, with the first person 116 px higher on phones and 159 px higher on desktops. Confirmed-empty board measurements above describe that independent hide change, not an active-break scenario.

All twelve real route/width/text captures (direct and embedded, 390/768/1280 px, normal/largest text) had eight unique person rows, no duplicate fine-adjustment roster, no browser errors, no horizontal overflow and no visible planner button/summary under 44 px. At largest text the interface grows vertically. The new browser suite separately checks head and sous chefs in both routes plus verified-admin entry, all three widths and both text sizes.

Section/person/Save remains three taps; another person in the same selected section adds one. A break correction now takes Edit breaks, picker, choice and Save, four taps versus the earlier three. Empty-day copy now takes the named tools fold, Use last weekday and Save, three versus two. Counts exclude scrolling and typing. Membership removal, every configured shift, three breaks, long splits, length choices, usual-section/training hints, Whole day and all Spread settings retain their existing controls and data helpers.

Local focused checks passed: `team-quiet.test.js` **87**, `team-notebook.test.js` **76**, `todays-team.test.js` **121** and `team-week.test.js` **65**, 349 checks total. They exercise real visible disclosures/picker overlays, independent date/shift drafts and fold state, section counts, shift removal preserving other shifts, keyboard and Save focus, exact DOM retention during clock paints, conflicts/recovery, saved-versus-draft break visibility, read counts and role gates. The old hide source failed four visibility assertions before implementation. Six integration files also passed without retries: chef panel, shift-tab ordering, read budget, Home board, staff-first Home and desktop Home. Independent source review found no state, focus, permission or data-model blockers. JavaScript syntax and design-pattern registry checks pass. PR [#635](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/635) carries this work; hosted verification is pending.
