# Today's team: occasional shifts like Smoker stay out of the way until someone is on them

15 November 2026, Queensland. Head chef request: "can we have the option to hide some shifts like smoker in the todays team admin part if needed and then add them when needed?" Clarified: "I would like to have the option to still have the shift in the whole system, but unless I put someone on smoker it is hidden." The pain: Today's team clutter (the Smoker tick box under Add staff, the Smoker chip in a person's details). Not the roster file, not Home.

**Status: round 1 Build smaller (5 of 5); round 2 designs in progress.** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md).

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
