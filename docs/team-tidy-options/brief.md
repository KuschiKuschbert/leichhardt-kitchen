# Quieter Today's team management

9 November 2026. **Current choice: C, Person worksheet, replacing the head chef's earlier A choice. C is implemented and locally verified; hosted CI and release are pending.** The empty-break-board change and the existing weekly planner remain. A's earlier implementation measurements and checks below are historical evidence for that delivery, not proof of C.

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

All reviewers noted the extra disclosure tap for breaks and copy, and that the schematic counts are not production proof. The head chef initially chose A, then changed to C from this comparison on 9 November 2026. The council's original scores and recommendation remain unchanged; the head chef's revised choice settles the layout.

## Acceptance contract for the chosen implementation

- One shared renderer for the existing direct and management-panel entry routes; no duplicate editor, new backend, listener, permanent private copy or extra database read.
- People appear once in the main flow, with current shift/section and a visible break summary. Detailed controls remain easy to find and keep deliberate open state across redraws and resizes.
- For C, put a labelled section picker on each person's row instead of a shared selected-section mode. A section choice affects only that person on the selected shift. Keep clearing a section distinct from removing the person from the shift and its breaks.
- An empty day offers an inline Who's working? chooser. Add only checked people on explicitly selected services to the draft, with no assumption that the full staff list works. Keep unfinished quick choices private, separate by date/shift and included in protected-work guards until applied or deliberately cleared.
- Spread them keeps break length separate from the interval between group starts. Default After previous break preserves the previous schedule; an explicit shorter interval can create deliberate overlap without shortening anyone's break.
- Full selected date and saved/dirty/failed status remain clear. One explicit dated Save stays within the planning flow and acknowledges server success; failed saves retain the draft and version conflicts cannot overwrite another chef.
- Preserve week navigation, independent date drafts, Whole day review, per-shift section assignment, membership/removal, meal breaks/splits, selected-weekday copy and Spread them. No guessed hours or seeded real staff.
- Current saved break status remains authoritative, with unknown/malformed/error states visible. Confirmed empty is hidden. Clock paint can change status without replacing focused inputs or changing drafts.
- Current-day staff Home, Your day, section defaults and chip remain unchanged. Future plans cannot become today's live state. Past dates remain read-only here.
- Measure primary assignment, break correction and empty-day copy, including added disclosure taps and scrolling. Verify at 390, 768 and 1280 px, normal/largest text, keyboard focus, 44 px targets and no page overflow.
- Recheck canonical chef/admin access, saved-vs-draft state, failed/cache-only reads, conflicts, protected work, midnight and unchanged read costs. Prototypes do not prove real Firebase persistence or production permission checks.

## Current choice: C, Person worksheet

On 9 November 2026 the head chef changed the management tidy-up from **A, Quiet notebook, one list**, to **C, Person worksheet** from the same review. This is the C in this brief, not the older shared team-board concept or the weekly planner's chef-panel concept. Reuse the existing council and previews; no new design selection is pending.

The shared direct and management-panel renderer shows one row per person, with their name, their own section picker and a readable meal-break/split summary together. On a laptop the rows form a worksheet; on a phone each row uses the available width. A labelled **Edit breaks** disclosure keeps the existing membership and detailed shift/break controls with that person. Do not show another full roster or a second section picker inside the disclosure.

Picking a section for a person off the selected shift adds that shift membership deliberately. A clearly labelled **Not on [shift]** choice removes only that shift and its breaks. Keep an on-shift person with no section distinct from an off-shift person, and preserve other shifts and dates. Row sections and break summaries describe the current draft. The saved current-break board still describes `tm.rec`, never unsaved worksheet changes.

Keep Monday to Sunday, previous/next week and Today, full selected dates and written status, configured shifts with Whole day review, search and per-person details state, one version-protected dated Save, selected-weekday copy, Spread them and folded saved references. Retain same-person work recovery, deliberate handover privacy, read-only past dates, current-day staff Home, Your day and manual section choices. No new schema, role, backend, listener, persistent private copy or database read is part of C.

The production C implementation uses `.tm-worksheet`, `.tm-worksheet-head`, `.tm-person-head` and `.tm-person-section` with the existing `.tm-person-row` and `.tm-person-details`. Each section picker reuses the existing `tm-sec:<id>` change path. The existing shared picker frame, explicit Save and selected-date draft helpers remain authoritative.

### Who's working? and independent break spacing

The head chef refined C with a quick empty-day start: **Who's working?** opens inline staff and service/shift checkboxes, followed by **Add selected staff**. No staff member starts selected. The current service is visibly preselected, and the chef deliberately keeps or changes the services for that group. Add only the checked people to the checked configured services in the selected date's draft; no network write occurs until the single dated Save. Reopen the same chooser to add another group on different services. It uses the existing membership schema, preserving every other person, date, shift, section and break. Then use each person's section picker on each service and their Edit breaks details as usual.

For a newly added membership, reuse `tmAddShift()`: use an available usual section from `tmUsual()`, then a valid section already assigned on another service, otherwise no section. These are reviewable draft suggestions, not assumptions that someone works. Existing memberships, sections and breaks stay intact. The chef can review or change every suggested section before Save.

The inline chooser uses `.tm-quick-add`, `.tm-quick-people` and `.tm-quick-services`. Its unfinished people/service choices remain memory-only and retain their own date/shift context. Date or shift navigation cannot apply them to another plan. Same-person privacy/daily-lock recovery retains unfinished choices behind the PIN screen; deliberate handover clears them. Include meaningful unfinished selections in the existing unsaved-work, Update and reload guards, and keep the existing stronger safeguards for unsent saves. The chooser adds no listener, private persistent copy or database read.

Unapplied choices say **Staff selection waiting for Add** beside the draft status. Saving an already edited worksheet saves that worksheet only; pending checked names are not added until **Add selected staff** is pressed. Saving other roster work must not silently clear those unfinished choices or imply that they were published.

**Spread them** retains one-person, two-person and all-together modes. **Each break** sets duration. A separate **Start next group every** choice sets the spacing between starts. Its default, **After previous break**, retains the existing schedule. An explicit interval such as 15 minutes lets 30-minute breaks start at 14:00, 14:15 and 14:30, retaining the full 30 minutes for every person. This is deliberate overlap. Two-person mode applies the interval between pairs; all together has one start, so no interval between groups is needed. Keep meal breaks and long splits distinct, preserve the other break kind and use existing validated time/date helpers. These controls change only the draft until Save.

### Council follow-up for the specified workflow

**Verdict: Build smaller (quick check, session review).** Reuse the existing value review and A/B/C comparison. The head chef selected C and specified the quick-add and spacing behaviour, so no new design selection is pending. This follow-up is not a new five- or six-reviewer vote and does not change the original council scores. It reduces repeated membership actions while keeping service choices explicit, and separates break duration from start spacing without changing the data model.

The primary service-page Add/Tick paths remain outside this planner. No global navigation or automatic service popup is added. The new controls stay inline in the existing planner or its tools fold. Group-add, section, break and Save counts are recorded with the actual controls below; the earlier schematic preview did not contain this refinement.

Reference fit, checked again against the council guidance added during release integration: Linear supports one shared worksheet with consistent actions; Things 3 keeps dated planning separate from today's saved status and folds occasional detail; Todoist supports explicit quick entry with visible, editable known defaults. Flighty supports the saved break board and real return times without another listener. Airbnb's useful principle is keeping the person's section, service and break details together, without decorative cards. Headspace supports named Edit breaks and Add selected staff actions; Duolingo's useful feedback principle is truthful draft, waiting-for-Add and acknowledged Save wording, without rewards or streaks. The exercised states, tap counts and paired layout captures below support these choices. This is a reference-fit quick check for the already selected C and specified additions, not a new comparison vote.

### C verification and release

Actual C captures use baseline commit `2cb62ba`, the same eight fictional people, Lunch and Dinner, two active saved breaks at 14:00 Queensland time, 844 px-high viewports and the Firebase stand-in. All five existing app font faces used by the fixture loaded from verified fetched responses. These are browser stand-in checks, not live Firebase or private production-record verification. See [measurements](person-c-measurements.json), direct [390](person-c-implemented-team-390.png), [768](person-c-implemented-team-768.png), [1280](person-c-implemented-team-1280.png), and embedded chef-panel [390](person-c-implemented-chef-390.png), [768](person-c-implemented-chef-768.png), [1280](person-c-implemented-chef-1280.png).

| Actual normal-text view | First person A / C | Complete initial rows A / C | Save top A / C |
| --- | --- | --- | --- |
| Direct, 390 px | 706 / 654 px | 0 / 1 | 1391 / 1366 px |
| Direct, 768 px | 699 / 647 px | 1 / 2 | 1383 / 1353 px |
| Direct, 1280 px | 529 / 655 px | 3 / 2 | 1214 / 1361 px |
| Chef panel, 390 px | 983 / 931 px | 0 / 0 | 1668 / 1643 px |
| Chef panel, 768 px | 1042 / 990 px | 0 / 0 | 1727 / 1697 px |
| Chef panel, 1280 px | 818 / 944 px | 0 / 0 | 1503 / 1650 px |

The first row is 52 px higher at 390 px in both routes, and one complete row now fits initially on the direct phone view. The embedded panel still requires scrolling to reach its first row. At desktop width, C places the full-width saved-break board above the worksheet, so its first row and Save are lower than A. This is not a universal density improvement. With eight people, Save still requires scrolling in both phone routes.

All twelve matching route/width/text pairs, direct and embedded at 390/768/1280 px with normal and largest text, contain eight unique person rows and exactly eight section pickers outside details, no duplicate section pickers inside details and no shared section-selection controls. There is no horizontal overflow, browser error or visible planner control below 44 px. The fixture records the same 13 total reads and three team reads before and after in every pair. Largest text grows vertically; the full measurements retain its separate row counts and positions.

Supplemental [Who's working?](person-c-quick-add-390.png) and [break spacing](person-c-break-spacing-390.png) captures show three selected people across two services and 30-minute breaks with a 15-minute start interval. Neither capture adds a write, overflows, records a browser error or finds a target below 44 px. Unapplied selected people activate the protected-work guard. The quick-add capture is an unfinished selection, not proof that those people were added or saved.

Tap counts follow the implemented controls and exclude scrolling and typing. From an open Who's working? chooser, selecting `n` people and changing `s` service checkboxes takes `n + s + 1` taps including Add selected staff; the current visibly preselected service needs no toggle. Opening a closed chooser adds one tap. A section change takes picker then option, two taps per person/service; one final Save publishes all accumulated edits. A break correction takes Edit breaks, picker, option and Save, four taps. A section correction plus Save is three taps; every additional person's correction costs two picker taps, replacing A's one tap after a shared section selection. Empty-day copy still takes the tools fold, Use last weekday and Save, three taps. Changing duration or start spacing each uses its own picker and option, then Spread them and the shared Save. These control counts do not imply that Save is initially visible.

All six focused local suites passed **430 checks**: `team-quiet.test.js` **117**, `team-notebook.test.js` **76**, `team-week.test.js` **65**, `team-shift-tabs.test.js` **14**, `todays-team.test.js` **121** and `team-quick-add.test.js` **37**. Coverage includes row pickers and disclosures, date/shift draft and quick-choice retention, membership and break preservation, repeat group adds, explicit staff/service choices, usual-section and valid other-service defaults, spacing and deliberate overlap, all-together behaviour, role gates, saved-versus-draft status, conflicts and protected work. Before implementation, all four C-specific probes and all four quick-add probes failed against the earlier source. The current implementation passes the focused suites.

All **15 distinct integration files** passed: chef panel, read budget, Home board, staff-first Home, staff Home roster, desktop Home layout, design patterns, roles, page roles, device work recovery, device lock handover, device prep lock, safe text, Chef to-do notebook and surface colours. Fourteen passed on the first run. The surface-colour suite's old desktop assertion expected the second notebook page that C deliberately removes; it now checks the actual supporting-reference `.tm-extra` paper at all three widths, with all **174 checks** passing on rerun. This adapts the assertion to the selected layout while extending width coverage. Independent source review found no remaining blockers. Final JavaScript syntax and whitespace checks pass. Hosted CI and deployed verification remain pending; local stand-in checks do not establish live production behaviour.

Preserve the earlier A source and evidence for comparison; reverting C restores A without a data migration. The new quick choices and spacing controls are memory-only. Existing saved assignments and breaks use the unchanged dated membership/break shape.

## Historical A delivery, PR635

The head chef initially chose **A: Quiet notebook, one list (recommended)** in chat on 9 November 2026. PR635 implemented the shared section-first notebook with one person list, visible current section/break summaries, labelled per-person Edit breaks disclosures, section counts, a compact selected-date/status header, the compact saved break board and one dated Save before secondary tools. The later C choice above supersedes A's shared section-selection mode. The following record preserves A's implementation and verification history.

The implementation reuses `teamPageHTML()` for direct and management-panel entry points. Each `.tm-person-row` contains the existing assignment control and a labelled native `.tm-person-details` fold; `tmRow()` supplies the original controls inside it. Per-person folds are independent by date and shift. Section counts and row summaries come from the selected draft. The compact header names the date and saved/dirty/failed state. One dated Save follows the roster; Copy a day or spread breaks, Next planned breaks and Saved shift overview are named folds. Future saved overviews are also folded. The active break board still reads the saved current-day record.

## Historical A measurements and checks

These are measurements of the real A shared planner in its actual outer frame, not C or the sketches above. The fixture matches the baseline: eight fictional people, two shifts, two active breaks, 14:00 kitchen time, original fonts and an 844 px-high viewport. See [measurements](implemented-measurements.json), [direct phone](implemented-team-390.png), [direct desktop](implemented-team-1280.png), [chef phone](implemented-chef-390.png) and [chef desktop](implemented-chef-1280.png).

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
