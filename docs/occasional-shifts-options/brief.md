# Today's team: occasional shifts like Smoker stay out of the way until someone is on them

15 November 2026, Queensland. Head chef request: "can we have the option to hide some shifts like smoker in the todays team admin part if needed and then add them when needed?" Clarified: "I would like to have the option to still have the shift in the whole system, but unless I put someone on smoker it is hidden." The pain: Today's team clutter (the Smoker tick box under Add staff, the Smoker chip in a person's details). Not the roster file, not Home.

**Status: round 1 Build smaller (5 of 5); round 2 B 16, A 14, C 6; the head chef chose B repaired and that the roster never fills a hidden shift (15 November 2026); built (see Chosen and Built).** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md).

## Round 1

Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `da18bf7`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Most of it is built: the grid already drops an empty Smoker column. Left: one tick box (+48 px at 390 px, none at 1280 px) and a chip that adds no row. Shape 1 only, with a "+ Smoker" that opens Smoker in one tap. Settle how the roster file treats a hidden shift first: a 10:00 to 15:00 roster time overlaps a 06:00 to 11:00 Smoker. |
| Head chef | Build smaller | Real but small. Hiding the details chip makes the rare job slower (5 taps to 6) and that chip is how a sous chef adds someone. Add staff only: one admin tick per shift, "Only when someone is on it", a "+ Smoker" link in place of the box, details chips as built. Start the saved overview's timeline at the earliest planned shift. |
| Skeptic | Build smaller | Most of it is done; on a laptop the gain is almost nothing. Behind one link the rare job gains a tap, so ask how often Smoker runs. Shape 1's choice, "Show on Today's team: Always / Only when someone is on it", for Add staff and the details chips only. The way back is one named tap in place, "+ Smoker", never a general More link; once shown for a date it stays shown; a hidden shift is never ticked by default. |
| New starter | Build smaller | Behind "More services", a new sous chef never learns Smoker exists. "Off" already means three things. Name it: "+ Smoker" in both places; in the details it puts the person straight on Smoker (Breaks, + Smoker, picker, choose: 4 taps, not 5). Add staff pre-ticks a service: it must never be a hidden one. |
| Keeper of the book | Build smaller | Cheap: no read, listener or rules change; one true/false on `config/main.kitShifts`, admin only. Keep it out of `kitShifts()` filtering and `off`, or a Smoker cook drops off Home (section follows the shift). `shClean` must keep the field, and an older saved copy strips it on any admin Save (mild: Smoker shows again). One "shown on Today's team" helper for both the screen and the Add handler. |

**Verdict: Build smaller, 5 of 5.**

**Cuts all five accept:**
- Shape 1 only: one admin setting per shift in Admin, Kitchen, Shifts, "Show on Today's team only when someone is on it". No rules change. Shape 2 (guess from recent plans) breaks Todoist's "nothing guessed"; shape 3 needs a rules change and locks the sous chefs out; shape 4 hides the shift from the whole book.
- Only the planner's choices change: the Add staff service boxes and (see disagreement) the details chips. The grid, Home, Your day, the On today board, the roster fill, Copy last weekday and `kitShifts()` stay as they are. A person on a hidden shift is always shown.
- The way back is one named tap in place, "+ Smoker", never a general "More services" link (a new sous chef would never learn Smoker exists).
- A hidden shift is never ticked by default in Add staff, and Add selected staff uses the same list as the boxes on screen.
- Once a hidden shift is shown for a date (someone on it, or "+ Smoker" tapped), it stays shown for that date, so a mistaken Remove can be undone in place.

**Disagreement:**
- The details chips. The head chef would leave them as built (hiding the chip adds a tap and it is how a sous chef adds someone). The cook, the new starter, the skeptic and the keeper would hide it too, with "+ Smoker" in its place; the new starter's version puts the person straight on Smoker (4 taps, not 5). Either way it changes the rule built today, "the details panel still offers every service" (`tests/team-shift-tabs.test.js` checks it), so it is the head chef's call.
- The head chef would also start the saved overview's timeline at the earliest planned shift; the others did not mention it.
- The skeptic would ask first how often Smoker runs (Not evidenced): if most weeks, hiding costs a tap most weeks.

**Break-it findings:**

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| A hidden default tick: Add staff ticks the chosen service, or else the first shift in Kitchen order (`tmShNow()`); Service for break tools can choose Smoker. If only the box is hidden, a whole group lands on Smoker unseen; Add selected staff reads `kitShifts()`, not the boxes on screen. | Checked in source (skeptic, keeper, new starter); the silent add is Risk / Not evidenced | One shown-list helper for the boxes and the Add handler; a hidden shift is never the default. Click test in `tests/team-quick-add.test.js`. |
| The roster file brings Smoker back: `services()` fills every shift a roster time overlaps. With the synthetic times (Smoker 06:00 to 11:00) a 10:00 to 15:00 cook also lands on Smoker. | Reproduced in node with synthetic shifts (keeper); real Smoker times Not evidenced | A head chef question: should the roster fill skip a shift set to show only when someone is on it? Its own small change with a node test row. |
| Controls vanish under the finger: Remove Smoker on the last person on it would hide the chip and the Add button that undoes it. | Checked in source; Risk | Keep a shown shift shown for that date; a remove-then-add click test. |
| The setting is wiped: `shClean` keeps only id, name, from, to and off, and the admin Save rewrites the list; an older saved copy strips the field. Two admin devices with Kitchen open: the later Save wins. | Checked in source (keeper) | Add the field to `shClean`; a test that a People save keeps it; Smoker showing again is the safe failure. |
| Hidden from Home: if the setting fed `kitShifts()` or `off`, a Smoker cook's section would vanish from Home. | Checked in source (keeper) | Keep it out of `kitShifts()` filtering; a Home test with a person on a hidden shift. |

**Out of scope, noted:** the stand-in's time boxes in Admin, Kitchen, Shifts show 12-hour times clipped ("03:00 PI") in the test browser's locale; the 24-hour rule says the book should show 24-hour times. Its own fix, after checking an Australian-locale phone.

## Round 2: three designs

Built as previews in a patched copy of the real app ([`preview-prep.patch`](preview-prep.patch), [`preview-css.patch`](preview-css.patch), runner [`preview-run.cjs`](preview-run.cjs)), never on the live book. The click-test stand-in, made-up staff, a sous chef (Sam) on `#/team`, fallback fonts. Kitchen: Lunch 10:00 to 15:00, Dinner 16:00 to 22:00, Smoker 06:00 to 11:00 set to hide; six people on Lunch and Dinner, Gus and Sam not on the day.

**The same in all three (the round 1 cuts):**
- Admin, Kitchen, Shifts: a tick box under each shift, "Hide on Today's team until someone is on it" (`admin-shifts-390.png`, `admin-shifts-1280.png`). Saved with Save changes, admin only, one true/false (`occ`) on the shift. No rules change.
- One helper, `tmShown()`: a hidden shift shows on Today's team when someone on that date's draft works it, when it is ticked in Add staff, or once "+ Smoker" was tapped for that date. The Add staff boxes and Add selected staff use the same list. A hidden shift is never the box ticked by default.
- Nothing else changes: the grid columns, Home, Your day, the On today board, the roster fill and Copy last weekday read `kitShifts()` as before.

### A: Add staff only (changes the least)

The Smoker tick box leaves Add staff. "+ Smoker" sits at the end of the "Services for this group" line and brings the box back, ticked (`A-addstaff-390.png`). The details chips stay as built: Lunch, Dinner, Smoker (off) (`A-details-390.png`).
- **For:** keeps the approved rule "the details panel still offers every service"; nothing new to learn in the details; the head chef reviewer's version.
- **Against:** clears only half of the clutter the head chef named; the Services line grows from about 20 px to 44 px, so Add staff is 28 px shorter on a phone but 20 px taller on a laptop.

### B: a named "+ Smoker" in both places (the way back acts)

Add staff as A. In a person's details the chip row shows the services they work and the shown ones; a hidden one is a "+ Smoker" chip that puts that person straight on Smoker and opens Smoker's details (`B-details-390.png`, `B-added-390.png`).
- **For:** both places the head chef named are tidy; putting someone on Smoker is one tap shorter (4, not 5); the words say what the tap does.
- **Against:** changes the approved rule for the details chips; two kinds of chip in one row (a view chip and an action chip); A's laptop cost in Add staff.

### C: one Smoker start in the grid head (service first)

On a day with people on it, Smoker leaves both the Add staff boxes and the details chips. One "+ Smoker" sits under "Who" in the grid's service head (`C-gridhead-390.png`). It opens Who's working? with only Smoker ticked, ready to tick the Smoker cooks (`C-group-390.png`). On an empty day, the "+ Smoker" sits in Add staff as in A.
- **For:** both places tidy with no height added to Add staff (68 px, as with no Smoker at all); a Smoker start is service first, so a new person goes on Smoker alone in 5 taps (7 today); one place to look.
- **Against:** someone who opens Add staff or a person's details to add Smoker finds nothing there; the grid head grows 13 px and stops being a hidden-from-screen-readers header; changes the approved rule for the details chips.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Where Smoker is hidden | Add staff only | Add staff and details | Add staff and details |
| The way back | "+ Smoker" on the Services line, ticks the box | A's, plus "+ Smoker" in the details that adds the person | One "+ Smoker" in the grid head that starts a Smoker group |
| Entry point | The group or the person | The group or the person | The service |
| Task sequence, an existing person | As today | Breaks, + Smoker | + Smoker, tick, Add |
| "Details panel offers every service" (built 15 Nov) | Kept | Changed | Changed |

### Measured on the previews (Preview, patched real app; raw [`measured-preview.json`](measured-preview.json), [`measured-baseline.json`](measured-baseline.json))

| Measure | Today | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Add staff service boxes, 390 px | 116 px | 88 px | 88 px | **68 px** |
| Add staff service boxes, 1280 px | 68 px | 88 px | 88 px | 68 px |
| Details chips for Ann | Lunch, Dinner, Smoker (off) | same | Lunch, Dinner, + Smoker | Lunch, Dinner |
| Details chip row, 390 and 1280 px | 44 px | 44 px | 44 px | 44 px |
| Grid service head, 390 px | 70 px | 70 px | 70 px | 83 px |
| Ann (on Lunch and Dinner) onto Smoker with a section, 390 px | 5 taps | 5 | **4** | 5 |
| Gus (not on the day) onto Smoker only with a section, 390 px | 7 taps | 7 | 7 | **5** |
| Admin, Kitchen, Shifts, three shifts, 390 / 1280 px | 687 / 364 px | 831 / 508 | 831 / 508 | 831 / 508 |
| Lines on the working grid | unchanged | unchanged | unchanged | one 13 px taller head |

Taps count every tap from the planner as it opens, including opening and choosing in the shared section picker (2). Once someone is on Smoker for the date, Smoker shows in all three like today (box, chip, column).

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose (sage people book) | Works: no surface change | Works | Works |
| State meaning | Needs work: the preview gives "+ Smoker" a dashed edge, which on this page already means No section | Needs work: same | Needs work: same |
| Words and non-colour cues | Works: "+ Smoker" says the action | Works; but a view chip and an action chip share one row | Works in the head; the head's names are read aloud once it holds a button |
| Real contrast, focus | Not evidenced (existing chip tokens) | Not evidenced | Not evidenced |
| 44 px targets | Works (measured 44 px) | Works | Works |
| Approved rule, details offers every service | Kept | Proposed change, head chef's call | Proposed change, head chef's call |
| Service continuity (rows, taps) | No row lost; laptop +20 px | Same; one tap fewer | No row lost; head +13 px |

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3: tuck the occasional away, keep the frequent visible | Needs work: half tucked | Works | Works |
| Todoist: usual choices easy, extra shown when needed, nothing guessed | Works | Works | Needs work: not where a person-first planner looks |
| Linear: one name and one place per control | Works | Needs work: two kinds of chip in one row | Works: one place |
| Headspace: plain words on actions | Works | Works | Works |
| Duolingo: each tap answers truthfully | Works (box appears ticked) | Works (details move to Smoker, the grid gains its column, a line says who was added) | Works (Who's working? opens with Smoker ticked) |

### Break-it findings (lead, on the previews)

| Scenario | Result | Evidence |
| --- | --- | --- |
| Break tools set to Smoker, then Add staff | A, B, C: Lunch ticked, Smoker not offered. Today: Lunch ticked, Smoker box shown | Checked in the preview fixture. The first-draw case (an empty day with Smoker first in Kitchen order) is covered by the helper in source; Not evidenced by a click |
| Put Ann on Smoker, then Remove Smoker by mistake | A, B: the chip stays "Smoker (off)" with Add Smoker, for that date | Checked in the preview fixture. C: not run |
| A person on a hidden shift on Home | No change: the preview does not touch `kitShifts()` | Checked in source. The click check was inconclusive in both baseline and preview: at 14:00 Home leaves out a 06:00 to 11:00 shift that has ended |
| The roster fill puts Lunch cooks on Smoker | Unchanged in all three; Smoker then shows | Reproduced in node (round 1); a head chef question |
| C: a sous chef opens Add staff to put Gus on Smoker | Finds no Smoker on a day with people on it | Risk / Not evidenced (role-based) |
| An older saved copy saves Kitchen settings | Strips the setting; Smoker shows again | Checked in source (round 1); the safe failure |

## Round 2 scores

Six fresh agents (the five reviewers and the kitchen screen designer) saw all three designs, the same evidence packet and screenshots. Points: 3 for first place, 2 for second, 1 for third.

| Reviewer | Rank | Decisive point |
| --- | --- | --- |
| Head chef | B > A > C | B clears both places named, adds no tap in Add staff and saves one in the details. Make the chip solid like "+ Break". Reject C's third place for a rare job. |
| Cook mid-service | B > A > C | B: nothing costs more taps than today. C puts a rare action in the sticky head read every two seconds, and the head's Who cell is hidden below 600 px with three or more services (`css/app.css`), so C has no way back there. |
| New starter | B > A > C | "+ Smoker" is where a new sous chef looks, and its words say what the tap does. A keeps "Smoker (off)", read as a day off. C's button sits in a row that reads as labels. Idea: a Smoker-alone start in Add staff. |
| Screen designer | B > A > C | B's target stays put: "+ Smoker" turns into the pressed Smoker chip in place. Drop the dashed edge (it means No section here). Admin tick box: name the shift, keep it inside its own shift's group. |
| Keeper of the book | A > B > C | A is the least code and keeps the approved rule. B adds a second way onto a shift beside `tm-on`, without its date and service guards: if built, send it through `tm-on`. Move focus after the tap. |
| Skeptic | A > B > C | The gain is small (28 or 48 px in an open panel, nothing in the details). B puts an action in a row of view chips. Admin tick box sits nearer the next shift than its own. |

**Totals: B 16, A 14, C 6.** B first for 4 of 6, A first for 2 of 6, C last for all 6.

**Agreed by all six:** the designs differ structurally (the skeptic and designer: A and B share Add staff, C is the real outlier); reject C's grid-head start; drop the dashed edge; no blend of all three.

**Disagreement:** whether the details chip should act. Four want B's "+ Smoker" that puts the person on Smoker; the keeper and the skeptic would keep "Smoker (off)" (A) so a row of view chips holds no action, and the keeper asks that any action go through the existing `tm-on`.

**Break-it findings from the scorers:**
- C has no way back on a phone with three or more services worked: `css/app.css` hides the grid head's Who cell there. Checked in source (cook, keeper, skeptic). C is not recommended.
- C's start wipes people already ticked in Add staff (`tmUi.quick` replaced). Checked in source (keeper, skeptic).
- A and B lose keyboard focus when "+ Smoker" disappears on its own tap; B's action skips `tm-on`'s date guard. Checked in source (keeper). Repaired in the combined preview.
- The admin tick box reads as the next shift's and its label does not name a shift (skeptic, designer). Repaired in the combined preview.

## Mix of A, B and C

| Part | Take or reject | Why | Principle |
| --- | --- | --- | --- |
| A: "+ Smoker" in Add staff that shows the box ticked | Take | The tap answers truthfully and nothing is guessed | Duolingo, Todoist |
| A: "Smoker (off)" kept in the details | Reject | Half the clutter the head chef named; "off" read as a day off | Headspace |
| B: "+ Smoker" in the details that puts the person on | Take, repaired | 4 taps, not 5; words on the action; sent through `tm-on` with its guards and words; solid edge; focus to the pressed chip | Duolingo, Linear |
| C: "+ Smoker" in the grid head | Reject | Third place for a rare job, sticky head +13 px, hidden on phones with three services, wipes ticks | Things 3, Linear |
| C: Smoker-alone start | Reject for now | Saves a tap for a Smoker-only cook but costs one for Lunch and Smoker; changes the pre-tick rule. Not evidenced which is more common | Todoist |
| Designer: "+ Smoker" after Dinner, not before | Take, with a layout fix | Reads in order; sized by its words so it fits the row on a phone | Linear |

**All three blended:** three "+ Smoker" controls doing three things (all six reject). **Recommended: B repaired**, which already holds A's part.

## Combined preview: B repaired

Lead's repair of B from the scorers' own fixes; **not re-scored by the council** (no new flow: the details action now uses the existing `tm-on` path). Patched real app, stand-in, fallback fonts ([`preview-prep.patch`](preview-prep.patch) variant `R`, runner [`preview-run-mix.cjs`](preview-run-mix.cjs), raw [`measured-mix.json`](measured-mix.json)).

- Add staff: "+ Smoker" after Dinner in the same row, solid edge (`mix-addstaff-390.png`). Tapping it shows the Smoker box ticked and moves focus to it (`mix-addstaff-shown-390.png`).
- A person's details: Lunch, Dinner, **+ Smoker** (`mix-details-390.png`). The tap is the existing Add button's action (`tm-on`, same date and service checks): Ann goes on Smoker, the chip becomes the pressed Smoker chip in the same place with focus on it, the line says "Ann added to Smoker. Not saved yet." and the grid gains its Smoker column (`mix-added-390.png`, `mix-page-1280.png`).
- A mistaken Remove leaves "Smoker (off)" and Add Smoker for that date (shown stays shown).
- Admin, Kitchen, Shifts: "Hide Smoker on Today's team until someone is on it", inside its own shift's group with a line between shifts (`mix-admin-shifts-390.png`, `mix-admin-shifts-1280.png`).

| Measure (Preview) | Today | B repaired |
| --- | ---: | ---: |
| Add staff service boxes, 390 / 768 / 1280 px | 116 / 68 / 68 px | **68 / 68 / 68 px** |
| Details chips for Ann | Lunch, Dinner, Smoker (off) | Lunch, Dinner, + Smoker |
| Ann onto Smoker with a section, 390 px | 5 taps | **4** |
| Gus onto Smoker only with a section, 390 px | 7 taps | 7 |
| Break tools on Smoker, then Add staff | Lunch ticked, Smoker box shown | Lunch ticked, "+ Smoker" |
| Empty day, Add staff | Lunch ticked, Smoker box | Lunch ticked, "+ Smoker" |
| Long names (four services, a 30-letter hidden one), 390 px | not measured | no sideways scroll; long name on its own line (`mix-long-addstaff-390.png`, `mix-long-details-390.png`) |
| Admin, Kitchen, Shifts, three shifts, 390 / 1280 px | 687 / 364 px | 882 / 559 px |
| Browser errors at 390, 768, 1280 px | none | none |

**Contract fit:** surface (sage) and 44 px targets Work; the dashed edge repaired (Works); words on actions Work. Real contrast and keyboard focus rings Not evidenced in the preview (existing chip tokens; checked on the implemented app before release). Proposed change to the approved rule "the details panel still offers every service" (15 Nov 2026): it still offers every service, a hidden one as a named "+ Smoker" action. Head chef's call.

**Not evidenced:** real fonts; how often Smoker runs; whether Save names a Smoker cook with no section (`teamSave()` names who still has no section on any service: checked in source only).

## Recommendation

**Recommend B repaired.** One tick box per shift in Admin, Kitchen, Shifts. On Today's team a hidden shift shows as "+ Smoker" in Add staff and in each person's details until someone is on it that day; then it shows as now. It clears both places the head chef named, Add staff is as short as with no Smoker at all on every screen, and putting someone on Smoker takes 4 taps instead of 5. It beats A because A leaves "Smoker (off)" in every person's details, and C because its only way back hides on phones and costs the sticky head.

**Main downside:** one chip in the details row is an action, not a view: a stray tap puts a person on Smoker in the draft (said in words, undone with Remove in place, nothing saved until Save). The keeper and the skeptic preferred A for that reason.

**Open question for the head chef (separate change):** the roster file fills every shift a rostered time overlaps (head chef, 14 Nov 2026). Should it skip a shift set to hide until someone is on it?

## Chosen

15 November 2026: the head chef chose **B repaired (Recommended)** and, for the roster file, **"Yes, skip hidden shifts"**. Recorded in `docs/head-chef-decisions.md`.

## Built

`js/prep.js`:
- `kitShifts()` and `shClean()` carry `occ` (true only when set). `kitShifts()` never leaves a hidden shift out, so the grid, Home and Your day are unchanged.
- `tmShown()`, `tmServiceShown()`, `tmServiceHidden()` and `tmOccShow()` beside `tmServiceChoices()`: one rule for the boxes, the Add handler and the chips.
- `tmQuickHTML()`: the shown boxes, then "+ Smoker" (`tm-occ-show`); the service ticked to start with is never a hidden one. `tm-occ-show` shows the box ticked for the date and moves the focus to it. Add selected staff reads the shown list.
- `tmFocusHTML()`: a hidden shift the person is not on is "+ Smoker", the `tm-on` button with `data-occ`. The `tm-on` handler moves the details to that shift, then runs its own date, service and person checks, the same add and the same words ("Ann added to Smoker. Not saved yet."), and keeps the focus on the pressed chip.
- Refresh clears the date's shown shifts with its draft.
- `shAdminHTML()`: "Hide Smoker on Today's team until someone is on it" under each shift, off for a removed one; the block's hint says what it does. `onChange` `shocc`.

`js/roster-import.js`: `services()` leaves out a shift with `occ`, so the roster file never fills it; a roster time inside it only is listed as idle.

`css/app.css`: `.tm-occ-row` (items as wide as their words), `.tm-occ-add` (44 px, wraps, solid edge), `.a-sh-occ` and a line between shifts in Kitchen, Shifts.

No new read, listener, rule or collection. One new true/false on `config/main.kitShifts[]`, written only by the verified admin with Save changes (the rules already allow it). An older saved copy ignores it on reading and drops it on an admin Save: Smoker then shows again, the safe failure.

**Implemented app measurements** (stand-in, fallback fonts, sous chef on `#/team`, the same fixture and script as the combined preview, raw [`measured-built.json`](measured-built.json)):

| Measure | Today | Combined preview | Built |
| --- | ---: | ---: | ---: |
| Add staff service boxes, 390 / 768 / 1280 px | 116 / 68 / 68 px | 68 / 68 / 68 | **68 / 68 / 68** |
| After "+ Smoker" in Add staff, 390 px | n/a | 116 px | 116 px (the Smoker box on its own row, focused) |
| Details chips for Ann, row height, 390 and 1280 px | 44 px | 44 px | 44 px |
| Ann onto Smoker with a section, 390 px | 5 taps | 4 | **4** |
| Gus onto Smoker only with a section, 390 px | 7 taps | 7 | 7 |
| Long names (four services, a 30-letter hidden one), 390 px | n/a | no sideways scroll | no sideways scroll |
| Admin, Kitchen, Shifts, three shifts, 390 / 1280 px | 687 / 364 px | 882 / 559 | 933 / 591 (the hint's extra sentence) |
| Browser errors at 390, 768 and 1280 px | none | none | none |

Screenshots: `built-addstaff-390.png`, `built-details-390.png`, `built-added-390.png`, `built-admin-shifts-390.png`, `built-admin-shifts-1280.png`, `built-long-addstaff-390.png`. After "+ Smoker" the new Smoker cell starts on the person's section from another service (Ann: Grill), as Add Smoker always did (`tmAddShift()`); the task above then changes it.

**Checks:**
- New `tests/team-hidden-shifts.test.js` (45 checks):
  - an empty day with Smoker first in Kitchen order ticks Lunch, shows no Smoker box and offers "+ Smoker";
  - "+ Smoker" in Add staff shows the box ticked with the focus on it; Add selected staff puts Cam on Smoker only; nothing saved;
  - at 390 and 1280 px, "+ Smoker" in Ann's details puts her on Smoker, the chip becomes the pressed Smoker chip with the focus, the words say it is not saved, Bo then sees Smoker (off), and a Remove leaves Smoker (off) with Add Smoker;
  - someone already on Smoker in the saved plan: the box and chip show as before;
  - Home at 08:00: Ann on the hidden Smoker sees it and its section;
  - Admin: each shift has its own named tick box; Save changes saves `occ`; a later save of Lunch's time keeps it.
  - It fails on the code before this change (no "+ Smoker"; the run stops).
- `tests/roster-import.test.js`: a 10:00 to 15:00 roster time over a hidden Smoker is Lunch only; a time inside the hidden shift touches nothing; the same Smoker not hidden still counts. The two new hidden checks fail on the old `services()`.
- `tests/todays-team.test.js`: the saved shift shape now includes `occ: false`.
- `tests/design-patterns.test.js`: `.tm-occ-add`, `.tm-occ-row`, `.a-sh-occ`.
- Locally, all 31 Today's team, roster, Home, Kitchen, admin, roles, read budget and design files pass.

**Not evidenced:** real fonts on a real phone (the row fits Lunch, Dinner and + Smoker in the stand-in's fonts; with wider fonts "+ Smoker" takes its own row, as today's box did); rendered contrast and the focus ring on a real device (existing chip and checkbox tokens); live behaviour after release.

**Left for later, not chosen:** the saved overview's timeline still spans every timed shift, so a hidden 06:00 Smoker starts it at 06:00 (one reviewer's suggestion); the stand-in's 12-hour time boxes in Kitchen, Shifts.
