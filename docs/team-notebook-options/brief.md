# Today's team: chosen roster notebook

8 November 2026. Status: **refined A released and live-verified in PR601; colour refinement checked locally, awaiting CI and release**. The head chef requested two notebook-style concepts, matching the Chef to-do notebook, with who is on a break visible on Today's team. The explicit request for two supersedes the usual three concepts in the service council workflow. After clarifying section-first assignment, scrollable configured shifts and a Whole day review, the head chef said "yeah lets go then" and authorised going live when ready. The original design previews and council scores below remain historical evidence, not implementation measurements.

Read first: `CLAUDE.md`, `.claude/skills/service-council/SKILL.md`, `docs/todays-team-options/brief.md`, `docs/prep-book.md` (Today's team), `docs/chef-todo-options/brief.md` and `docs/whole-app-redesign-options/brief.md` (Build, step 7). The earlier Today's team decision and the chosen Chef to-do layout remain their own records.

## Break board, 9 November 2026

The owner requested a board like Home for staff on break now. On 9 November the owner explicitly requested immediate release: Send live now. Reuse Home's current pinned warm amber work board, orange edge and compact heading for the existing Scheduled away now panel. Names and return times stay visible, with meal breaks and splits labelled. Keep the existing notebook placement, all-shift Saved plan source, next breaks and planner controls.

**Verdict: Build smaller (quick check).** This makes existing saved status easier to find without another page, control, step or data source. The owner selected the homepage pattern, so there is no new design choice. This is a session review, not research with staff. Checking scheduled breaks remains zero taps; choosing a section then a person stays two taps, each additional person one, and Save remains separate.

The implementation adds the existing `.hm-board` class and scoped styles only. No break calculation, read, listener, timer, permission, schema or saved data changes. All current freshness, clock, conflict and saved-versus-draft safeguards remain in `tmAwayData()` and its existing paint paths.

Local evidence: the new appearance check failed on the original panel, with the other 63 notebook checks passing. All 64 pass with the board, alongside Today's team, Home board, staff-first Home, desktop Home, design patterns and read budgets, seven files in total. The suite covers exact start/return boundaries, saved-versus-draft status, failed reads, overlaps, long names and largest text at 320, 390, 768 and 1280 px. JavaScript parse and whitespace checks pass. Some unrelated live-font top-bar measurements in the existing Today's team test skipped when remote fonts did not load; separate board captures loaded the app's six original font faces through the trusted local cache.

The same synthetic 390 × 844 fixture retains two complete current-break rows and one complete assignment row before and after; the board adds about 3 px to the phone flow. Tablet retains two break rows and one person, desktop two break rows and three people. No sideways overflow or browser errors at 390, 768 or 1280 px. Existing fallback-font captures have the same 12 reads before and after. These are stand-in browser checks, not private production records or actual attendance. [Phone](break-board-390.png), [desktop](break-board-1280.png). CI and release evidence belongs in the pull request. Revert the implementation to restore the plain notebook status panel; stored plans need no change.

## Colour refinement, 8 November 2026

After the notebooks were released in [PR600](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/600) and [PR601](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/601), the head chef asked to colour both pages in the style described in CLAUDE.md.

**Verdict: Build smaller (quick check).** Apply the existing palette to the selected layouts. This improves state and heading recognition, adds no control, navigation, step or read, and needs no new layout choice. One CSS block uses existing tokens: warm paper, burnt-orange headings and selected chips, green completed or assigned states, neutral outlines and dividers, and a light warm tint for currently scheduled-away rows. Words, checkmarks, pressed states and strikethrough remain the state cues. Small orange text uses the contrast-safe small-text token.

Keep Lunch, Grill then Sam at two taps, each additional person at one, and a visible to-do tick at one. Colour cannot alter row geometry, density, focus, drafts, the single Save, the saved-break authority or permissions. Verification compares the same synthetic fixtures before and after at 390, 768 and 1280 px with normal and largest text. Local notebook behaviour tests passed: 34 Chef to-do checks, 63 team checks and the design-pattern registry. Before/after checks with actual project fonts found identical row positions, control sizes, visible-row counts and read counts in all 12 page, width and text-size combinations. In the 390 px normal-text stress fixtures, Chef to-do retained one complete job and the selected-section team view retained zero complete assignment rows above the bottom navigation; the partial row and scrolling behaviour are unchanged. This fixture includes a long job and the selected-section explanation, so it is distinct from the ordinary layout measurements below. Supplemental ordinary 390 px fixtures retained three complete to-do jobs and one complete assignment row, with the same first-row positions. All 601 sampled text contrasts passed after removing the selected counts' faded opacity; the minimum small-text ratio was 5.047:1 and the selected shift count was 5.266:1. These are sampled checks, not a full accessibility certification. No page overflow, browser error or undersized target was found. CI and release verification are pending for this colour pass; release evidence goes in its pull request.

Colour screenshot with synthetic data: [390 px phone](colour-390.png).

## Verdict and recommendation

**Verdict: Build smaller (5 of 5 round 1 reviewers).** Bring the existing editor closer to the top and add a compact status from the saved break schedule. Preserve the current work, access and data contracts. Do not add a break check-in, another navigation level or a new service overlay.

**Council recommendation: A, Open roster notebook (4 of 6 round 2 reviewers).** It keeps familiar inline editing and brings complete editable people onto the first screen. A planned start-time change retains the current three taps; B adds an Edit person tap. Both expose the same all-shift scheduled-away summary.

The cook and new starter preferred B because all four saved Lunch people fit on the phone before scrolling. That is a real scan advantage. The council recommended A because it retained the existing editing model with less selection state and relearning. No service-frequency study establishes which task matters most in this kitchen. The head chef then chose refined A.

These are independent role-based reviews, not research with real kitchen staff. The head chef subsequently chose the refined A described below.

## Chosen

The head chef chose **A, Open roster notebook, with section-first assignment and a Whole day draft review** on 8 November 2026. From 1100 px, the planner is the left page and saved scheduled-away information is the right page, joined by a notebook spine. Below that width it is one flow. Whole day stays visible beside the horizontally scrollable configured-shift tabs. In a shift, choose a section and then the people for it. One `tmf` draft spans every shift and the Whole day review, with one version-protected Save.

The saved scheduled-away panel always reads `tm.rec`, never the unsaved draft. It shows all shifts, distinguishes meal breaks and splits, and gives checked return times. Whole day reviews draft assignments by person and real shift, with sections, hours, breaks and split return times, and links back to a shift to edit. It is an overview, never an assignment or a shift ID.

The choice settles the design. The original 5 of 5 Build smaller verdict, 4 of 6 preference for A and six-reviewer follow-up remain the council record; no new council round or design choice is pending. The head chef authorised release when ready. No live release has yet been verified in this record.

## Build

Implemented in the existing `js/prep.js` team page and `css/app.css`. The work retains the existing access, reads, storage, schema, staff Your day, inline break editing, usual-section and training hints, Use it, Spread them, Save and conflict recovery. The original saved section overview remains available after the planner.

| Part | Status |
| --- | --- |
| Notebook layout, pinned Whole day and scrollable shift tabs | Built locally |
| Section-first add and move, explicit Clear section, separate Remove from shift | Built locally |
| One draft, Whole day review and global Save | Built locally |
| Defensive all-shift saved scheduled-away status and clock repaint | Built locally |
| Focused notebook behaviour checks | Final 63 checks passed locally |
| Responsive stress checks | Passed locally, details below |
| Eight-file regression suite | Passed locally |
| Follow-up review | No remaining defects reported |
| Final notebook and existing team rerun | Both passed locally |
| Pull request CI | Pending |
| Live release, authorised by the head chef when ready | Pending |

### Local implementation validation

The eight-file regression run passed: `team-notebook`, `todays-team`, `kitchen-pages`, `safe-text`, `read-budget`, `design-patterns`, `clock` and `shared-tablet-chef`. The final focused rerun passed both `tests/team-notebook.test.js` (63 checks) and the existing `tests/todays-team.test.js`. Coverage includes draft retention and global Save, section moves and clear versus removal, conflict recovery, saved break status, deduplication, overlaps, malformed break data, day and clock boundaries, failed/stale states, memory-only metadata, read budgets and responsive layouts. Review found and fixed a malformed-break case that could have implied a false zero; the follow-up review reported no remaining defects. These are local checks with synthetic data, not verified live behaviour. Pull request CI and live release are pending.

With Lunch active, choosing Grill then Sam takes two taps; another person on Grill takes one. Changing to Dinner, selecting its section and assigning a person takes three taps. One global Save publishes the accumulated day draft. This count excludes scrolling and typing. Inline break controls remain in Breaks and fine adjustments; their visible labels name Section, Break or Split, and Length. The original preview's three-tap break example and editable-row counts below are not measurements of this refined interface.

Actual-font stress checks at 320, 390, 768 and 1280 px, with normal and largest text, found no page overflow or visible control below 44 px. Row heights stayed stable while assignment actions changed. Long names, section names, several shift tabs and expanded break controls were included. In the mobile stress fixture, scheduled-away rows, shift and section context and search can push the first complete assignment row below the initial fold. This build does not claim the original A preview's two complete phone editors.

The ordinary synthetic fixture at 14:00 shows both saved scheduled-away people, across Lunch and Full day, at 390 and 1280 px. On the 390 x 844 phone, one complete assignment row is initially visible: its top is 689.8 px and bottom 772.3 px, above the navigation at 776 px. At 1280 px, three complete assignment rows are initially visible. These are compact section-assignment rows, not the inline break editors counted in the old previews. The earlier baseline had no editable row initially, but its six visible saved overview rows served a different purpose.

Implementation screenshots: [390 px phone](implemented-390.png) · [1280 px laptop](implemented-1280.png). These show the built page with synthetic people and times. The historical preview figures below do not substitute for these implementation checks. Live release evidence belongs in the pull request and release record.

## Follow-up: section-first assignment and Whole day

On 8 November 2026 the head chef clarified the desired workflow: tap a section and assign people for Lunch, Dinner and future configured shifts, with horizontally scrollable shift tabs and a whole-day section. This refinement of A is now chosen and implemented. The original A/B images below document the earlier review; they do not show the final section-first interaction.

The original 4 to 2 preference for A remains the result of that comparison. A separate six-reviewer follow-up supported this refinement: the head chef and keeper roles supported it directly; the cook, skeptic, new starter and screen designer supported it with the clarity safeguards below. This follow-up was not a new A/B vote. The original Build smaller value verdict is reused because the goal and data boundaries remain the same.

### Chosen flow

```text
[Whole day: overview] | [Lunch] [Dinner] [Smoker] [other configured shifts] →

Lunch  → Grill → Sam, Ann
Dinner → Pans  → Sam

One Save for the whole day's draft
```

- Keep Whole day discoverable beside a horizontally scrollable row of every active configured shift. Use faded edges and a partly visible next tab, 44 px controls, keyboard access and no horizontal page overflow. It is an in-page view, not a new top-bar or bottom-navigation item.
- Inside a shift, choose a section, then tap the people working there. With Lunch selected, Grill then Sam takes two taps. Further people for Grill take one each. Selecting a different shift adds one tab tap; Save is one shared action after planning all shifts. These implementation interaction counts exclude scrolling and typing.
- Show the assignment context prominently, for example **Assigning to Grill · Lunch**. Each assignment or move says what it changed, and the draft remains visibly not saved. Do not carry an inconspicuous section choice into another shift.
- The same person can have Grill for Lunch and Pans for Dinner. Many people can share a section; each person has one section per shift. The existing `tmf.on[person][shift]` mapping already supports that distinction.
- If a person is already assigned elsewhere on that shift, show their current section and an explicit **Move to Grill** action. A section move keeps that person's breaks and every other shift assignment. The selected assignment button becomes an explicit **Clear section** action, which keeps them on the shift and preserves breaks. **Remove from Lunch** is a separate explicit action using the existing shift-membership control.
- Keep one draft across tab and section changes and one version-protected Save. Selecting a section must override any usual-section hint deliberately; hints must not silently replace the chef's chosen section. Existing break controls, split support, Use it, Spread them, training context, off-shift handling and conflict recovery remain available.
- **Whole day overview** reviews the accumulated draft by person and shift, with each shift's section, hours, breaks, splits and return times. It shows **Draft, not saved** when changed. Use links back to a specific shift for editing rather than another editor. This view is not a shift ID, cannot be written as an assignment, and must remain distinct from a real configured shift called Full day.
- The all-shift **Scheduled away now** summary stays visible and continues to use saved `tm.rec`, with its Saved plan label. Draft changes in Whole day must not be presented as staff's published current breaks. Retain the planned-versus-actual distinction and all unknown, error, freshness and clock safeguards in the implementation contract.

The follow-up council's essential checks are: clear shift/section context; one draft and one Save; preservation of breaks and other shifts during moves; no overview key written to the database; no added reads; and a narrow-phone check with many shifts, a long staff list and expanded break controls. No new database schema, roles, listeners or actual-attendance collection is part of the chosen build.

## Original baseline

Before this change, the `#/team` page showed the saved section overview before its editor. Even on a laptop the work sat in a narrow card. In the six-person synthetic baseline fixture, the first editable row started at 1168 px on a 390 px phone and 1170 px at 768 and 1280 px. No editable row was visible initially. Six complete saved overview rows fitted on the phone, and seven at the other two widths. These were seven shift places across six people, not seven distinct people.

The original chef's page had no explicit away-now summary. Staff already had scheduled colleagues' breaks in Your day. The chosen chef summary carries the same scheduled meaning, without implying an actual break check-in or attendance record.

Baseline: [phone](before-390.png), [laptop](before-1280.png). The fixture has six synthetic names, seven shift places, four Lunch people and two Dinner people, with Barlow and Caveat loaded. At 14:00, Bo has a saved meal break from 13:45 to 14:30 on Lunch, and Jess a saved split from 12:30 to 15:00 on Full day. All-shift status must keep Jess visible when Lunch is selected.

## Original concept A: Open roster notebook

[Design A](design-a.png)

Cream ruled paper, a red margin, handwritten names, typed times and labels, and the existing kitchen navigation. From 1100 px, the existing inline roster editor sits on the left, with saved scheduled-away status, next breaks and the saved overview on the right, joined by a notebook spine. Below that width the compact scheduled-away rows come first, followed by the inline editor. Next-break details and the folded saved overview follow the editor.

Strengths:

- Keeps the familiar inline section and break controls, without selecting a person first.
- At 14:00, two complete editable people fit on the phone and tablet, and three on the laptop. Both scheduled-away people are visible at every measured width.
- The first phone editor starts at 426 px, compared with 1168 px in the current page.

Trade-offs:

- Only two of four Lunch people fit as complete editable rows on the phone. Bo needs scrolling in this fixture.
- At 19:30, the three scheduled-away people leave room for one complete editable person on the phone.
- The full saved shift overview and batch break controls move into folds. Each needs one extra opening tap compared with today's exposed controls.

## Original concept B: Section board and editor

[Design B](design-b.png)

The same notebook materials and all-shift scheduled-away band, with a compact saved section board and one selected-person editor. From 1100 px the editor sits beside the board. On phones and tablets it follows the board. A visible Edit name action selects the person and scrolls to the in-page editor on smaller screens. There is no service overlay.

Strengths:

- All four saved Lunch people and both scheduled-away people fit on the phone at 14:00.
- At 19:30 both saved Dinner people and all three scheduled-away people fit on the phone.
- Gives each saved section a compact scan line while retaining a larger editor for the chosen person.

Trade-offs:

- A start-time change adds an explicit Edit person tap: four planned taps rather than the existing three.
- No complete selected-person editor fits in the first screen in these snapshots. On phones it is below the board.
- Adds selection state. Any future implementation must keep every person's unsaved edits in one draft when selection changes.
- The saved overview and batch controls have the same extra fold-opening tap as A.

## Historical preview comparison

These measurements describe the original concept previews, before the chosen section-first refinement. They use a viewport height of 844 px, normal text, project fonts and the same fixture. Count only complete rows above the fixed phone navigation or the viewport bottom where navigation is at the top. A's editable rows, B's saved board people and the original full-day saved overview rows serve different purposes. Their counts must not be presented as equal-density alternatives or measurements of the implementation.

| Measure | Current page | A | B |
| --- | --- | --- | --- |
| Complete saved full-day overview rows, 390 px | 6 | In fold, below editor | In fold, below editor |
| Complete editable people initially, 390 px at 14:00 | 0 | 2 | 0 |
| Complete saved selected-shift board people initially, 390 px at 14:00 | No separate board | No separate board | 4 Lunch people |
| Scheduled-away people visible, 390 px at 14:00 | No explicit summary | 2, all shifts | 2, all shifts |
| Complete editable people initially, 390 px at 19:30 | Not measured | 1 | 0 |
| Complete saved selected-shift board people initially, 390 px at 19:30 | Not measured | No separate board | 2 Dinner people |
| Scheduled-away people visible, 390 px at 19:30 | Not measured | 3, all shifts | 3, all shifts |
| First editable row top, 390 px at 14:00 | 1168 px | 426 px | Editor below board |
| Change Bo's break start, then save | 3 planned taps | 3 planned taps | 4 planned taps |
| Open full saved shift overview | Already exposed | 1 added tap | 1 added tap |
| Reach batch Spread them controls | Already exposed | 1 added tap | 1 added tap |
| New navigation levels or service overlays | 0 | 0 | 0 |
| New database reads, listeners or rules | n/a | 0 planned | 0 planned |
| Expected build size | n/a | One focused implementation PR | One focused implementation PR, more editor state work |
| Relearning | Existing flow | Low | Medium |
| Main risk | Editor far below overview | Shared control layout and honest status derivation | Selection, draft retention and distinction between saved board and draft editor |

The planned three-tap sequence is open the existing time picker, choose a time, Save. B first adds Edit Bo. Counts exclude typing and scrolling; they follow the current picker contract, not a working save in these previews. The folds trade immediate overview and batch access for earlier editing and scheduled-away visibility. No capability is removed.

At 14:00:

| Width | Current complete saved overview rows | Current complete editors | A complete editable people | B complete saved Lunch board people | Scheduled-away people visible in A / B |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390 px | 6 | 0 | 2 | 4 | 2 / 2 |
| 768 px | 7 | 0 | 2 | 3 | 2 / 2 |
| 1280 px | 7 | 0 | 3 | 4 | 2 / 2 |

At 19:30:

| Width | A complete editable people | B complete saved Dinner board people | Scheduled-away people visible in A / B |
| --- | ---: | ---: | ---: |
| 390 px | 1 | 2 | 3 / 3 |
| 768 px | 1 | 2 | 3 / 3 |
| 1280 px | 2 | 2 | 3 / 3 |

The dinner fixture has two people on the selected shift. The third scheduled-away person belongs to another shift. These fixture counts do not establish a speed improvement or predict every live roster.

## Council record

Round 1 was unanimous Build smaller, 5 of 5. Its common limits were a compact scheduled-away summary, earlier editor access, preservation of current workflows and data contracts, and measured tap and visibility trade-offs.

Round 2 reviewed both concepts at phone and laptop sizes, with tablet and Dinner snapshots available. Reviewers scored service readability, fast editing, responsive consistency and simplicity, each out of 5. Totals and preferences were:

| Reviewer | A /20 | B /20 | First preference |
| --- | ---: | ---: | --- |
| Cook mid-service | 14 | 15 | B |
| Head chef role | 17 | 15 | A |
| Skeptic | 15 | 13 | A |
| New starter | 14 | 15 | B |
| Keeper of the book | 18 | 15 | A |
| Kitchen screen designer | 17 | 15 | A |

Four of six preferred A. The cook and new starter preferred B's complete phone roster and stronger scan density despite its extra edit step. The majority preferred A's direct controls and simpler continuity with the existing editor. The head chef role here is a reviewer perspective, not the actual head chef's approval.

Common review refinements applied to both previews: use scheduled wording consistently, keep the clock typed, make Section and Length labels visible, and name each Edit action. The totals describe the reviewed concepts; they are not a new vote on those refinements.

## Implementation contract

These are the preserved constraints for the chosen build. Local validation is recorded above.

- Keep `#/team` restricted to the same authorised chefs. Staff Your day, the Team chip, header, personal section flow, session grants and all existing authority remain as they are.
- Derive status from the loaded saved `tm.rec` only. Keep the editable `tmf` draft separate until a successful Save. Label unsaved work so it cannot be mistaken for the saved status.
- Show Scheduled away now, All shifts and Saved plan, with Queensland display time. Include every relevant shift, not only the selected editor shift. Distinguish meal break from split and show return times.
- Validate membership, day and break times, deduplicate people and handle overlapping entries defensively. Conflicting overlaps must say to check times rather than infer a reliable return time. Do not infer availability, attendance or an actual break check-in.
- Keep loading, no saved plan, known nobody scheduled away, unknown, stale data and failed reads distinct. An error or an unverified plan must never become a false Nobody away or zero count. Show the known last-save or freshness information honestly.
- Use `LK_TIME` and the kitchen day. `tmAwayHTML()`, `tmNextHTML()` and `tmAwayPaint()` derive and repaint the saved status through the existing clock tick, focus and clock refresh paths without extra database polling or listeners. Do not promise exact second updates. Another device's saved changes may remain unknown until the existing read or Refresh.
- Preserve shift definitions and counts, editable sections and defaults, other-shift context, usual-section and training hints when known, and the off-shift fold.
- Preserve up to three breaks including long splits, every supported length, add and remove break, and all Spread them modes. Do not reduce the editor to the single-break example shown here.
- Preserve last week's Use it without saving automatically, one Save for the whole draft, version-conflict protection, and Refresh's unsaved-discard confirmation. Shift, section and overview changes and resizing must retain every person's draft changes.
- Preserve the section-grouped saved shift overview and the existing loading, empty, error and no-shift states. The saved-overview, fine-adjustment and batch-control folds keep their capabilities and must offer 44 px controls.
- No schema, rules, fields, roles, backend service, persistent cache, new listener, new database read, dependency or testing framework is added. Reuse existing helpers, safe text handling and control patterns. The notebook and section-first patterns are recorded in `docs/design-patterns.md`.

## Implementation acceptance criteria

The local checks cover the following acceptance criteria in the existing test setup:

- Scheduled status uses saved data, remains unchanged while editing the draft, and updates after successful Save. A failed or conflicting Save preserves draft recovery and truthful saved status.
- All-shift status covers a meal break and a split on different shifts, supports three breaks, deduplicates a person, handles overlaps and invalid or absent membership, and uses the kitchen clock and day across boundaries.
- Loading, unset, known zero away, stale/unknown and failed-read states stay distinguishable. Focus, clock and minute repaint paths update the loaded status without new reads or listeners.
- Existing shift, section, training, break, batch, Use it, off-shift, overview, Save, conflict and Refresh flows remain reachable. Staff Your day and access checks retain their existing behaviour.
- Section assignment adds or moves only the selected real shift. Clear section preserves membership and breaks; Remove from shift stays separate. Switching tabs and sections or resizing retains one complete draft and one Save. Whole day never becomes an assignment ID. Focus and the scroll destination remain clear.
- Recheck 390, 768 and 1280 px with project fonts and largest text, long synthetic names, long sections, many scheduled-away people and three-break rows. Verify no sideways overflow or page errors, clear keyboard focus and at least 44 px controls.
- Confirm saved-status derivation is pure and defensive, safe text handling is preserved, and the existing read budget does not increase. Run focused existing team, layout and safe-text checks appropriate to the final implementation.

## Preview evidence and limits

[Comparison](comparison.png) · [A board](design-a.png) · [B board](design-b.png)

| Snapshot | A | B |
| --- | --- | --- |
| 14:00, 390 px | [Phone](previews/a-1400-390.png) | [Phone](previews/b-1400-390.png) |
| 14:00, 768 px | [Tablet](previews/a-1400-768.png) | [Tablet](previews/b-1400-768.png) |
| 14:00, 1280 px | [Laptop](previews/a-1400-1280.png) | [Laptop](previews/b-1400-1280.png) |
| 19:30, 390 px | [Dinner phone](previews/a-1930-390.png) | [Dinner phone](previews/b-1930-390.png) |

The measured preview snapshots cover both concepts at 14:00 and 19:30 at 390, 768 and 1280 px. They recorded no sideways overflow or page errors, and no measured visible control below 44 px. The current baseline also had no sideways overflow at those widths. These are normal-text fixture checks, not full accessibility or production validation.

The previews use synthetic people and times. B's Edit selection and in-page scroll work locally; the folds open locally. Other service controls illustrate the earlier concepts. Nothing in these previews saves or reads kitchen data. Both concepts were also checked at 320 px, and B's person selection was exercised. Six error, unset and known-zero cases were checked at 390 px with no overflow or page errors. Representative images: [could not check](previews/a-state-error.png), [no saved plan](previews/a-state-unset.png), [nobody scheduled away](previews/a-state-none.png). These examples do not verify the implementation's loading, freshness, overlap, draft, multi-break or clock states.

The preview study changed no app, backend, permission, saved-shell or live behaviour. The later choice, implementation and local validation are tracked in Chosen and Build above. Release is pending; release evidence belongs in the pull request and release record.
