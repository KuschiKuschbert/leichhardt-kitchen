# Today's team: two notebook designs

8 November 2026. Status: **design study only, no design chosen and no application implementation**. The head chef requested two notebook-style concepts, matching the Chef to-do notebook, with who is on a break visible on Today's team. The explicit request for two supersedes the usual three concepts in the service council workflow. The council recommends A; the head chef's choice is still pending. This work stays in a draft design-only pull request.

Read first: `CLAUDE.md`, `.claude/skills/service-council/SKILL.md`, `docs/todays-team-options/brief.md`, `docs/prep-book.md` (Today's team), `docs/chef-todo-options/brief.md` and `docs/whole-app-redesign-options/brief.md` (Build, step 7). The earlier Today's team decision and the chosen Chef to-do layout remain their own records.

## Verdict and recommendation

**Verdict: Build smaller (5 of 5 round 1 reviewers).** Bring the existing editor closer to the top and add a compact status from the saved break schedule. Preserve the current work, access and data contracts. Do not add a break check-in, another navigation level or a new service overlay.

**Council recommendation: A, Open roster notebook (4 of 6 round 2 reviewers).** It keeps familiar inline editing and brings complete editable people onto the first screen. A planned start-time change retains the current three taps; B adds an Edit person tap. Both expose the same all-shift scheduled-away summary.

The cook and new starter preferred B because all four saved Lunch people fit on the phone before scrolling. That is a real scan advantage. A is the recommendation because it retains the existing editing model with less selection state and relearning. No service-frequency study establishes which task matters most in this kitchen. The head chef decides.

These are independent role-based reviews, not research with real kitchen staff. The head chef has not chosen either concept.

## Problem and current page

The existing `#/team` page shows the saved section overview before its editor. Even on a laptop the work sits in a narrow card. In the six-person synthetic fixture, the first editable row starts at 1168 px on a 390 px phone and 1170 px at 768 and 1280 px. No editable row is visible initially. Six complete saved overview rows fit on the phone, and seven at the other two widths. These are seven shift places across six people, not seven distinct people.

The chef's page has no explicit away-now summary. Staff already have scheduled colleagues' breaks in Your day. The proposed chef summary must carry the same scheduled meaning, rather than imply an actual break check-in or attendance record.

Baseline: [phone](before-390.png), [laptop](before-1280.png). The fixture has six synthetic names, seven shift places, four Lunch people and two Dinner people, with Barlow and Caveat loaded. At 14:00, Bo has a saved meal break from 13:45 to 14:30 on Lunch, and Jess a saved split from 12:30 to 15:00 on Full day. All-shift status must keep Jess visible when Lunch is selected.

## A: Open roster notebook

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

## B: Section board and editor

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

## Measured comparison

Measurements use a viewport height of 844 px, normal text, project fonts and the same fixture. Count only complete rows above the fixed phone navigation or the viewport bottom where navigation is at the top. A's editable rows, B's saved board people and the current full-day saved overview rows serve different purposes. Their counts must not be presented as equal-density alternatives.

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

## Planned implementation contract

These are constraints for a future build after a choice, not changes made by this study.

- Keep `#/team` restricted to the same authorised chefs. Staff Your day, the Team chip, header, personal section flow, session grants and all existing authority remain as they are.
- Derive status from the loaded saved `tm.rec` only. Keep the editable `tmf` draft separate until a successful Save. Label unsaved work so it cannot be mistaken for the saved status.
- Show Scheduled away now, All shifts and Saved plan, with Queensland display time. Include every relevant shift, not only the selected editor shift. Distinguish meal break from split and show return times.
- Validate membership, day and break times, deduplicate people and handle overlapping entries defensively. Conflicting overlaps must say to check times rather than infer a reliable return time. Do not infer availability, attendance or an actual break check-in.
- Keep loading, no saved plan, known nobody scheduled away, unknown, stale data and failed reads distinct. An error or an unverified plan must never become a false Nobody away or zero count. Show the known last-save or freshness information honestly.
- Use `LK_TIME` and the kitchen day. The current minute tick does not paint the team page. A future targeted status painter must join the existing clock tick, focus and clock refresh paths without extra database polling or listeners. Do not promise exact second updates. Another device's saved changes may remain unknown until the existing read or Refresh.
- Preserve shift definitions and counts, editable sections and defaults, other-shift context, usual-section and training hints when known, and the off-shift fold.
- Preserve up to three breaks including long splits, every supported length, add and remove break, and all Spread them modes. Do not reduce the editor to the single-break example shown here.
- Preserve last week's Use it without saving automatically, one Save for the whole draft, version-conflict protection, and Refresh's unsaved-discard confirmation. For B, changing the selected person must retain all draft changes and still use that single Save.
- Preserve the section-grouped saved shift overview and the existing loading, empty, error and no-shift states. Both proposed folds keep their capabilities and must offer 44 px controls.
- No schema, rules, fields, roles, backend service, persistent cache, new listener, new database read, dependency or testing framework is planned. Reuse existing helpers, safe text handling and control patterns. Register any new screen pattern when implementing it.

## Future acceptance criteria

After the head chef chooses a concept, verify the following in the existing test setup:

- Scheduled status uses saved data, remains unchanged while editing the draft, and updates after successful Save. A failed or conflicting Save preserves draft recovery and truthful saved status.
- All-shift status covers a meal break and a split on different shifts, supports three breaks, deduplicates a person, handles overlaps and invalid or absent membership, and uses the kitchen clock and day across boundaries.
- Loading, unset, known zero away, stale/unknown and failed-read states stay distinguishable. Focus, clock and minute repaint paths update the loaded status without new reads or listeners.
- Existing shift, section, training, break, batch, Use it, off-shift, overview, Save, conflict and Refresh flows remain reachable. Staff Your day and access checks retain their existing behaviour.
- A retains inline editing; if B is chosen, changing people and resizing retain one complete draft, one editor and one Save. Focus and the scroll destination remain clear.
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

The previews use synthetic people and times. B's Edit selection and in-page scroll work locally; the folds open locally. Other service controls illustrate current or planned actions. Nothing saves or reads kitchen data. Both concepts were also checked at 320 px, and B's person selection was exercised. Six error, unset and known-zero cases were checked at 390 px with no overflow or page errors. Representative images: [could not check](previews/a-state-error.png), [no saved plan](previews/a-state-unset.png), [nobody scheduled away](previews/a-state-none.png). These examples do not implement or verify every future loading, freshness, overlap, draft, multi-break or clock state. The proposed tick integration and defensive saved-status derivation are not implemented.

No app, backend, permission, saved-shell or live behaviour change is part of this study. The next decision is the head chef's choice between the two concepts; implementation remains pending.
