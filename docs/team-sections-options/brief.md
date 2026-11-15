# Today's team: a simpler way to give staff their sections

15 November 2026, Queensland. Head chef request: "a simpler way of applying sections to staff. At this point I have to physically tap the picker for lunch then assign lunch shift. Tap the picker go to dinner assign shift there. There must be a more user friendly way especially now with the uploaded roster that we know the times someone is working."

**Status: the mix chosen 15 November 2026 and built (see Chosen and Built at the end).** Round 1 Build smaller (5 of 5); round 2 B 15, C 13, A 8; **recommended: the mix** (B's day grid, A's worded Breaks, C's "Same as Lunch" inside the picker, neutral counts). [Proposal](proposal.md), [evidence packet](evidence-packet.md), [previews](index.html) ([A](a.html), [B](b.html), [C](c.html), [the mix](mix.html)). Role-based analysis, not research with staff.

## Round 1

**Verdict: Build smaller, 5 of 5.** Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `d865d9e`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | The row never says which services a person works, so a missed Dinner section shows as No section on Home at 17:00. One labelled Section button per worked service; keep the row near 135 px; Edit breaks opens on the service on now. Doubles are "often on another section" (head chef, `docs/home-staff-first.md`), so "same all day" may save little. |
| Head chef | Build smaller | Real, and it is the head chef's own job. Most of the saving is one choice filling the empty services, not a new layout. Reject the section board and chips. |
| Skeptic | Build smaller | 53 is the worst case (no usual sections). 18 of the 53 taps are service switches. Reuse `tmAddShift()`'s own rule (a section from another service) when a section is chosen. Board, chips, Copy Lunch to Dinner and roster hours add screen without need. |
| New starter | Build smaller | Service to edit looks like the Section picker and "edit" sounds like it changes the shift. After Save nobody can see whether Ari's Lunch has a section. Ideas 1 and 2 only; Save should name any service still on No section. |
| Keeper of the book | Build smaller | Cheap if the saved shape stays `on[] = { id, sh, sec }`: no read, rule or listener. Per-service pickers lose the guard that once caught a wrong-service write: key each one `tm-sec:<id>:<sh>`, bound to its date and service, and prove the test fails on the old key. Show saved service hours, not roster hours. |

**Cuts all five accept.** Every service a person works is visible on their row with its own section; the Service to edit switch goes. Breaks stay in the one named details panel, which picks its own service. No separate section board, no one-tap chips for a list from the kitchen's settings (the picker rule in `docs/design-patterns.md`), no Copy Lunch to Dinner button, no roster hours for sous chefs (show the saved service hours instead).

**Disagreement.** Whether one choice should fill the person's other empty services. The head chef and Skeptic want it (it is `tmAddShift()`'s existing rule); the Keeper allows it if it touches only empty cells and skips chef rows; the New starter only if it says what it filled; the Cook doubts it helps when doubles often change section.

### Correction after round 1

The Cook cited the head chef's own description of the real day (`docs/home-staff-first.md`, 10 Nov 2026): "most chefs work a double: Lunch 10:00 to 15:00, then Dinner 15:00 to 21:00, often on another section". The baseline was measured again on that day too: two services, six doubles, four of them on another section at dinner.

## Baseline (Implemented app, stand-in)

`main` at `d865d9e`, click-test stand-in, fallback fonts, admin session at 390 x 844 unless stated. Made-up staff. Script [`baseline.cjs`](baseline.cjs), raw [`baseline.json`](baseline.json).

| Task or measure | Three services (17 cells) | Two services, doubles move (14 cells) |
| --- | ---: | ---: |
| Give everyone their sections, then Save | **53** | **41** |
| One correction (Eli's Dinner) and Save | 3 when the row already shows Dinner, 5 when it shows Lunch | same |
| Open Ari's Dinner break details | 3 | 3 |
| Complete rows on opening, admin 390 / `#/team` 390 / admin 1280 | 0 / 2 / 1 | 0 / 2 / 1 |
| Complete rows in the working screen (first row under the top bar), 390 | 4 | 4 |
| Row height | 135 px | 135 px |

A picker is open plus choose, 2 taps. Scrolling is not counted. With the nightly usual sections, the import fills some cells first in every design and in today's app alike; the cost per remaining cell is what differs.

## Round 2: three designs

All three keep: the saved shape (`team/<day>.on[] = { id, sh, sec }`), No section separate from not working a service, membership changes only in the details panel, one dated Save with its existing Saving, Saved and refusal words, the saved break board, Add staff, Whole day review, Copy last weekday and Spread. All three add the New starter's Save words: "Saved Tuesday 17 November at 13:05. The team sees it on Home. Still no section: Cal Lunch, Hal Dinner." All three move the service choice for breaks into the details panel as service chips, opening on the person's first service (at 13:00, Lunch). Every section control is bound to its person, date and service.

**A, Section on the row** (changes the least). Each row: the name with Edit breaks beside it, one line with the services and their saved hours ("Lunch, Dinner · 10:00 to 21:00 · Break not set"), then one labelled Section picker per service the person works. The first choice on a person also fills that person's other services that are still No section, tagged SAME in the label and said in words under the row ("Also set Dinner to Grill. Change it on its own picker.").

**B, The day as a grid** (rethinks the layout). One table for the day: services across with their hours in each column head, people down, a Section picker in every cell the person works and "Off" where they do not. The foot of each column says how many are on and how many still have no section. A tap on a name opens that person's break details. No automatic fill.

**C, One pass** (removes the most taps). Rows become short read-outs: the name, the hours, each service with its section ("Lunch Grill", "Dinner No section yet"), and two buttons, Sections and Breaks. **Set sections: 13 to set** above the list opens one sheet that steps through every person and service still without a section, one tap each, without closing between choices. The sheet names the person, service and hours ("2 of 13 · Ari · Dinner · 15:00 to 21:00 · now no section"). A later service offers "Same as Lunch: Grill" first. Back steps back; Close keeps what was chosen and says how many are still without a section. A row's Sections steps through that one person's services.

### How they differ

| Pair | Structural differences |
| --- | --- |
| A and B | Stacked person rows versus one table; services labelled on each row versus once in column heads; Edit breaks button versus the name as the way in; automatic fill versus none. |
| A and C | Pickers on every row versus read-outs with one guided sheet; any order versus a set sequence; open-and-choose per cell versus one tap per cell inside a pass. |
| B and C | Table of controls versus read-only rows; whole day at a glance versus one cell at a time in a sheet; per-column counts versus one count on the start button. |

### Measured on the previews

**Preview**, not the implemented app: an imitation of the admin shell (first row at 577 to 666 px on a 390 px phone, against 612 px in the app), fallback fonts, made-up data, the same tasks as the baseline, scripted with Playwright and counted by a tap counter in the page. Script [`verify.cjs`](verify.cjs), raw [`verify-abc.json`](verify-abc.json); all 136 checks pass (counted by the script).

| Task or measure | Today | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Sections, three services (17 cells), then Save | 53 | **21** | 35 | **19** |
| Sections, two services, doubles move (14 cells), then Save | 41 | 27 | 29 | **16** |
| One correction (Eli's Dinner) and Save | 3 to 5 | 3 | 3 | 5 (three services) / 4 (two) |
| Open Ari's Dinner break details | 3 | 2 | 2 | 2 |
| Rows in the working screen, 390 | 4 | **3** | **8** | 4 |
| Complete rows on opening, admin 390 | 0 | 0 | 0 | 0 |
| Complete rows on opening, `#/team` 390 | 2 | 2 | **6** | 3 |
| Row height at 390 | 135 | 155 | 53 | 111 |
| Largest text with a long name and long sections, 390 | not measured | contained, rows 176 to 201 px | contained, rows 74 px | contained, rows 111 to 129 px |
| Navigation levels for a section | row | row | row | row, then sheet |
| New reads, listeners, rules or saved fields | none | none | none | none |
| Build size | | one PR | one PR | one PR |
| Relearning | | small: a picker per service | medium: a table, names open breaks | medium: a guided sheet |

Screenshots at 390 px: `a-double-admin-390.png`, `b-double-admin-390.png`, `c-double-admin-390.png` (opening), `a-double-done-390.png`, `b-three-done-390.png`, `c-double-done-390.png` (after Save), `c-sheet-390.png` (the pass), `*-breaks-390.png`, `*-fail-390.png`, `*-long-xlarge-390.png`; at 1280 px `*-three-admin-1280.png`.

### Contract fit (lead's reading, for the scorers to test)

| Contract | A | B | C |
| --- | --- | --- | --- |
| Surface and state colours | Works: sage people book, paper rows, orange only for the Save state words; SAME is a neutral word tag. | Needs work: "All set" in green under a column before Save could read as Saved (draft assignment is not Saved). | Needs work: "Same as Lunch: Grill" in green is an option, not a result; the orange "Set sections" fill is an action, which fits. |
| Choosing pattern (picker for a settings list) | Works. | Works, but a table of pickers is a new pattern for `docs/design-patterns.md`. | Works: the pass uses the picker frame's look; a guided pass is a new pattern. |
| Filled for you | Needs work: tag and words, but no one-tap way to empty what was filled. | Not relevant. | Not relevant: "Same as Lunch" is a choice, not a fill. |
| C contract: a choice stays with its date and service | Proposed departure: one choice also writes the person's other empty services (head chef's call). | Works. | Works. |
| After the tap | Works: the row says what was filled. | Works: the cell changes; the column count changes. | Works: the sheet moves on and names the next cell; Close says how many are left and "Not saved yet". |
| Service rule 2 (no new pop-up on a service page) | Works. | Works. | Proposed departure: a new sheet, opened only on demand, on a page the sous chefs open in service. |
| Service rule 4 (lines and taps) | Fewer taps; one fewer row in the working screen (4 to 3). | Fewer taps; twice the rows (4 to 8). | Fewest taps to set a day; one more tap to correct one service. |

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Airbnb: who, when, which section together | Works | Works: the whole day at once | Works in read-outs; changing is in a sheet |
| Todoist: known defaults visible, never guess | Works: fill from the chef's own choice, said in words | Not evidenced: no defaults beyond usual sections | Works: "Same as Lunch" offered, not applied |
| Linear: work over controls | Needs work: three pickers a row | Works: dense, one kind of control | Works: rows are the work, one action |
| Things 3: frequent visible, occasional tucked away | Works | Works | Needs work: the frequent correction takes a pass |
| Headspace: one plain name each | Works: Lunch, Dinner, Section | Needs work: a name that opens breaks has no word on it | Works: Sections, Breaks |
| Duolingo: each tap answers truthfully | Works | Works, but green "All set" before Save | Works: "Not saved yet" after Close |
| Flighty: real times from data already there | Works: saved service hours | Works: hours in column heads | Works: hours in the sheet |

### Break-it findings (lead, before scoring)

| Scenario and state | Expected | Observed or hypothesis | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- |
| A: the chef leaves Ari's Dinner on No section on purpose, then gives Lunch Grill | Dinner stays No section | Dinner becomes Grill; the row says "Also set Dinner to Grill" | **Reproduced** in the A preview | Fill only services nobody has chosen in this draft (remember touched cells in memory); test it |
| B: a sous chef sees green "All set" under every column and leaves | Unsaved work is clearly unsaved | Hypothesis: green "All set" reads as done; the Save dock still says Unsaved changes | Risk / Not evidenced | Neutral words ("Everyone has a section") and the existing Unsaved line |
| C: Close part way, then Save | The rest stays No section and Save names them | Close says "Set 1 section. 13 still no section. Not saved yet."; Save names every missing service | **Checked** in the C preview | Same words in the app |
| All: a held picker after a redraw reaches another service (the fault C once had) | No change to another service | Not testable in a preview | Risk / Not evidenced | Key each control `tm-sec:<id>:<sh>`; extend `tests/team-picker-context.test.js` to fail on the old key |
| All: a held Save, then a refused Save | Saving, never Saved early; work kept with red words | Saving with the button off; refused Save keeps every choice and says "Not saved. Changes kept." | **Checked** in all three previews | Existing `svButton()` path in the app |

## Round 2 scores

Six fresh agents (the five reviewers and the kitchen screen designer) saw all three designs, the brief, the evidence packet, the screenshots and the live previews. Points fixed in advance: first 3, second 2, third 1. All six say the designs differ in structure, not only in look.

| Reviewer | A | B | C | First | Decisive point |
| --- | ---: | ---: | ---: | --- | --- |
| Cook mid-service | 1 | 3 | 2 | B | Whole day in 8 rows; a fix during service stays 3 taps with no guessing. Breaks open on the first service, not the one on now. |
| Head chef | 1 | 3 | 2 | B | Reads like the roster, gaps per service. Take C's "Same as Lunch" as the first picker option; hold the pass until usual sections show what stays empty. |
| Skeptic | 1 | 3 | 2 | B | No new way to write, and a double tap only opens another picker. Reproduced C's double tap writing the next person's section, and A's stale SAME tag. |
| New starter | 1 | 2 | 3 | C | One button with a count, then one plain question at a time. Found C's green "Every service has a section" before Save. |
| Keeper of the book | 3 | 2 | 1 | A (without its fill) | Reuses the shared picker and rows; a table would break where the details panel moves. C bypasses the shared picker and the lock's sheet list. |
| Kitchen screen designer | 1 | 2 | 3 | C | Measured contrast (all text AA, lowest 4.7:1) and targets (none under 44 px). B's pills sit 6 px apart and long names break mid-word. |
| **Total** | **8** | **15** | **13** | B 3, C 2, A 1 | |

**Unanimous:** reject A's automatic fill. It turns a visible gap into a section that looks right and is wrong when a double moves (4 of 6 doubles on the measured day), and the Save words do not catch it.

**Disagreement.** The new starter and the designer prefer C's pass for the fewest taps (16 against 29 on the real day). The head chef, cook and Skeptic prefer B because corrections stay on the page and nothing new pops up during service. The Keeper prefers A's rows because they reuse the most code.

**Faults the reviewers found that the lead had missed:**
- C's start button says "Every service has a section" in green before Save. Reproduced by the new starter, the designer and the Skeptic.
- C: a double tap 110 ms apart sets the next person's section unseen. Reproduced by the Skeptic and the designer.
- C: Back, then choose again, counts "Set 2 sections" for one changed cell. Reproduced by the Keeper.
- C: Escape does not close the pass sheet, and Tab leaves it. Reproduced by the designer.
- A: the SAME tag stays after Lunch changes. Reproduced by the Keeper and the Skeptic.
- B: long names break mid-word at the largest text. Reproduced by the new starter, the designer and the Skeptic.
- All three: breaks open on the first service, not the one on now. Found in source by the cook.
- All three: no chef row in any preview. Risk raised by the Skeptic.
- The lead's largest-text rows were measured with no section chosen. With a long section chosen, rows are A 315 px, B 216 px and C 298 px (Skeptic).

The original A, B and C previews are kept as they were scored; their faults are recorded here, not silently fixed.

## Mix of A, B and C

Every reviewer named parts to take and reject. The lead reconciled them after the rankings.

| Source and part | Take or reject, and why | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| B: the day grid, people down, services across with hours | **Take** as the main flow (5 of 6 take it in some form) | Airbnb: who, when, which section together | 8 rows on a phone; a missed Dinner shows as a gap | A new pattern for `docs/design-patterns.md`; built from rows, not a table, so the details panel still moves inline (Keeper) | Previews, all six reviews |
| B: counts per service | **Take**, in neutral words, never green before Save | Duolingo: truthful; colour contract | Gaps per service while scrolling | None | Five reviews |
| B: the name as the only way into breaks | **Reject**: no word on the action | Headspace: words on actions | | | Five reviews |
| A: a worded Breaks button with the break line | **Take** | Headspace; Things 3 | Break status stays on the row | Adds height | Cook, head chef, Skeptic |
| A: one picker per service, the shared picker | **Take** (B's cells are the same thing) | Linear: one kind of control | Reuses `LK_UX.enhance` | Keyed `tm-sec:<id>:<sh>` | Keeper |
| A: the automatic fill | **Reject** (6 of 6) | Todoist: never guess | | Writes a section the chef did not choose | Reproduced twice |
| C: "Same as Lunch: Grill" | **Take**, as the first option inside the later service's own picker, in ink, never applied by itself | Todoist: show the default, do not apply it | Less hunting for doubles who stay put | Does not save taps | Head chef, Keeper, Skeptic, designer |
| C: the guided pass | **Hold** as a later option, not part of this build | Things 3: frequent fixes stay on the page | Would cut a cold day from 29 to about 16 taps | A pop-up on a page used in service (rule 2), a second way to set one cell, a double-tap guard, the lock's sheet list | Four reviewers reject or hold it; two prefer it |
| C: read-only rows | **Reject**: a correction then needs the sheet | Things 3 | | 4 to 5 taps for one fix | Measured |

**Why not all three in full.** The designer and the Skeptic both say grid pickers plus a pass would duplicate controls and give two ways to set one cell. A's fill also fights C's offered "Same as". The two-part blend below keeps one way to set a cell.

**Repairs in the blend.** Breaks open on the service on now or next. Chef rows read Head chef or Sous chef and are not counted. Names wrap only between words. Pills sit 8 px apart.

## Combined preview

[mix.html](mix.html). Not a montage: one coherent page made from these parts:
- B's grid, built from person rows that share one set of columns (CSS subgrid);
- A's worded "Breaks not set" link on each row;
- C's "Same as Lunch: Grill" as the first option in the Dinner picker;
- neutral counts in service heads that stay in view while scrolling.

With three or more services on a phone, the name and Breaks sit on their own line above the sections.

**Measured** (Preview, the same script and tasks as A, B and C; all 51 mix checks pass, counted by the script, and the 136 for A, B and C still pass; raw [`verify-mix.json`](verify-mix.json)):

| Task or measure | Today | Mix | C (for comparison) |
| --- | ---: | ---: | ---: |
| Sections, two services, doubles move (14 cells), then Save | 41 | **29** | 16 |
| Sections, three services (17 cells), then Save | 53 | **35** | 19 |
| One correction and Save | 3 to 5 | **3** | 4 to 5 |
| Open Ari's Dinner breaks at 13:00 / at 18:00 | 3 / 3 | **2 / 1** | 2 / 2 |
| Rows in the working screen, 390, two services / three | 4 / 4 | **6 / 4** | 4 / 4 |
| Rows in the working screen, 768 and 1280 | 5 | **8** | 8 |
| Complete rows on opening, `#/team` 390, two services | 2 | 3 | 3 |
| Row height at 390, two services / three / largest text with a long name | 135 | 77 / 97 / 100 | 111 |

Checked in the preview:
- choosing Lunch leaves Dinner on No section;
- the Dinner picker offers "Same as Lunch: Grill" first, and it sets only Dinner when chosen;
- no green words in the draft before Save;
- at 18:00 Breaks opens on Dinner in one tap;
- chef rows read Head chef, are not counted and are not listed as missing;
- a held Save shows Saving; a refused Save keeps the work in red words;
- no sideways scroll and no target under 44 px at 390, 768 and 1280 px.

Screenshots: `mix-double-admin-390.png`, `mix-double-done-390.png`, `mix-same-390.png`, `mix-chefs-390.png`, `mix-long-xlarge-390.png`, `mix-breaks-390.png`, `mix-fail-390.png`, `mix-three-admin-1280.png`.

**Review status.** This is the lead's synthesis from the six reviews. A focused follow-up by the screen designer and the Skeptic on this combined preview is recorded below.

### Focused follow-up on the combined preview

The screen designer and the Skeptic each looked at the combined preview alone. Neither rescored A, B or C.

**Screen designer: now recommends the mix over C** (in round 2 they put C first). Faults from round 2 that are fixed:
- Breaks has words: 44 px tall, contrast 15.9:1, "not set" 6.7:1.
- No green before Save; green shows only after the server answers (Checked).
- "Same as Lunch" is plain, offered and never applied.
- Names break only at spaces.
- Pills are 101 px wide and 8 px apart (B: 85 px and 6 px). Better, but still tight for wet hands.

New faults the designer reproduced:
- Focus went to the top of the page after every pick.
- Escape did not close the picker.
- A double tap on a low cell picked the option under the finger.
- The head counts were 11.8 px.
- At the largest text a long section name makes a 98 x 127 px oval pill.

The designer also asks for break details beside the roster from 768 px.

**Skeptic: recommends the mix over C, narrowly, with two repairs.**

The case against the mix:
- 13 more taps than C on a cold day.
- "Same as Lunch" saves no taps, and on the measured day it is right for only 1 of 6 doubles.
- The row drops the app's "Usually Grill, 3 of the last 4 Tuesdays" hint, which is the better default.
- The sticky head and the Save dock cover 292 of 844 px.
- Keyboard focus hid under the Save dock in 16 of 42 Tab steps.
- Opening another person's Breaks moved the row 300 px.

Checked clean by the Skeptic:
- "Same as Lunch" then a Lunch change leaves Dinner as chosen, with no stale tag.
- Chef rows are left out of the counts.

Break-it findings from the follow-up:

| Scenario and state | Expected | Observed | Evidence | Repair and status |
| --- | --- | --- | --- | --- |
| Head chef at 390 px double-taps a low Dinner cell | The picker opens; nothing changes | The second tap chose the option under the finger (Dev's Dinner became Grill, Fen's Pans), and a double tap on an option opened the cell underneath | **Reproduced** in the preview. The book's own picker has no guard either (Skeptic, `js/controls.js`) | Preview repaired: taps in the first 350 ms after the picker opens are ignored, and so is a second tap in the same spot within 350 ms of closing. **Checked**: a double tap 110 ms apart opens the picker and chooses nothing; a double tap on an option chooses once and opens nothing. The book's picker needs the same guard and test (its own fix pull request: it touches every picker). |
| Focus after a pick, Escape | Focus back on the cell; Escape closes with no change | Focus went to the page top; Escape did nothing | **Reproduced**, preview stand-in | Repaired and **Checked** in the preview. Check the book's picker does the same. |
| Tab through the grid | The focused cell is never under the Save dock or the head | Hidden in 16 of 42 steps | **Reproduced** | Preview given scroll padding (not re-measured). The app's own `tmFocusEnsureVisible()` must also clear the sticky head. |
| A picker open when the page redraws, locks or is handed over | No change to another service | Not testable in a preview; the app today refuses a section for any service but the row's Service to edit | Risk / Not evidenced | Key each cell `tm-sec:<id>:<sh>` with the date in the picker id; close an open picker on lock; extend `tests/team-picker-context.test.js` to fail on the old key |
| Opening Hal's Breaks while Ari's are open | Hal's row stays where the finger is | Hal's row jumped 300 px up | **Reproduced** | Keep the tapped row in place when the panel moves (implementation check) |

Also repaired in the preview after the follow-up:
- the head counts at 14 px;
- a chef's unset cell dashed, like any unset cell.

The shared picker stand-in (focus return, Escape, double-tap guard) is used by the A and B previews too. Their 136 checks still pass, and their scores are unchanged.

## Recommendation

**Recommend the mix: B's day grid + A's worded Breaks on each row + C's "Same as Lunch" inside the later service's own picker + neutral counts in the service heads. Hold C's guided pass.**

**Why it beats the alternatives.**
- It removes the hidden Service to edit switch the head chef complained about. Every service a person works is a cell under its own heading, with the hours from the saved services.
- Setting a two-service day drops from 41 taps to 29, and three services from 53 to 35.
- One correction stays 3 taps, where C needs 4 to 5.
- 6 people fit on a 390 px phone while working instead of 4, and 8 on a tablet or laptop.
- Breaks open on the service on now: 1 tap at 18:00 instead of 3.
- Nothing is filled in that the chef did not choose, and nothing new pops up over the page.

It was the council's first choice (B 15 points, 3 firsts). After the follow-up, both reviewers who had put C first or second now prefer it.

**Principles:**
- Airbnb: who, when and which section together.
- Linear: one kind of control.
- Todoist: show the default, never apply it.
- Things 3: the frequent fix stays on the page.
- Headspace: words on Breaks.
- Duolingo: no green before the server answers.

**Main downside.** On a day with no usual sections, it is still 29 taps against C's 16. The nightly usual sections should fill part of the day before the chef starts, but how much is not measured. If a real week shows many cells still empty after the import, C's pass can be added later, for empty cells only, with the double-tap guard.

**Departures the head chef must choose.**
- The grid replaces the C design's "Service to edit and Section pair", chosen on 10 November 2026.
- The grid is a new pattern for `docs/design-patterns.md`.

**Before the build is ready** (Implemented app, not Preview):
- Key each cell `tm-sec:<id>:<sh>`. The test must fail on the old key.
- Show the usual section first in the picker ("Usually Grill, 3 of the last 4 Tuesdays"), then "Same as Lunch".
- Keep search, Whole day review and the cross-training hints working for every service.
- Keep focus clear of the sticky head and the Save dock.
- Put break details beside the roster from 768 px.
- Keep the tapped row in place when break details move.
- Measure again in the full app at 390, 768 and 1280 px with real fonts, real service names and both chef roles: taps, rows and every Save state.

The book-wide double-tap guard in the shared picker is a separate fix pull request.

**Unresolved:**
- How many cells stay empty after the nightly usual sections fill in.
- Whether wet hands manage 101 px pills 8 px apart.
- The oval pill for a long section name at the largest text.

## Chosen

15 November 2026: the head chef chose the recommendation, the mix ("Yeah let's try the recommendation. Might change that later again but let's build it and send it live when done"). Recorded in `docs/head-chef-decisions.md`.

## Built

15 November 2026, in this pull request. `js/prep.js`:
- `tmGridShifts()`, `tmGridHeadHTML()`, `tmGridCellHTML()` and `tmGridRowHTML()` draw the grid.
- `tmPersonListHTML()` filters by a name or a section on any service.
- `tmSel()` gives a cell its own service.
- `teamField()` refuses a section key without its service, or one whose captured service differs.
- The details panel has a chip per service, and `tmRowService()` opens it on the service on now or next.
- On a phone, the tapped row stays in place when the panel moves.
- `tmFocusGeometry()` measures a top bar that sticks over the planner; `tmFocusEnsureVisible()` keeps focus clear of the heads.
- `teamSave()` names who still has no section.

`css/app.css` holds the `.tm-grid*` block and `.tm-bench-shifts`. No new read, write, field, rule or listener.

**Departures from the combined preview, kept small:**
- A service nobody works that day has no column (a 12-service stress test made 12 columns on a phone). The details panel still offers every service.
- The usual section is offered first in the picker, then "Same as Lunch" (Skeptic's follow-up).
- Cross-training hints name their service ("Lunch: Not on Pans in 30 days...").
- Break details stay beside the grid from 1100 px, as in C, not from 768 px as the designer asked. At 768 px the panel beside the grid would leave the section cells under 100 px wide.
- The double-tap guard in the book's shared picker is not changed here. It needs its own fix pull request: it touches every picker.

**Implemented app measurements** (stand-in, the same made-up days and tasks as the baseline, fallback fonts, admin session unless stated; script [`implemented.cjs`](implemented.cjs), raw [`implemented.json`](implemented.json)):

| Task or measure | Before (C row) | Built grid | Combined preview |
| --- | ---: | ---: | ---: |
| Sections, two services, doubles move (14 cells), then Save, 390 px | 41 | **29** | 29 |
| Sections, three services (17 cells), then Save, 390 px | 53 | **35** | 35 |
| One correction and Save | 3 to 5 | **3** | 3 |
| Open Ari's Dinner break details at 14:00 | 3 | **2** | 2 |
| Rows in the working screen, 390 px, two services / three | 4 / 4 | **6 / 5** | 6 / 4 |
| Rows in the working screen, 1280 px | 5 | **8** | 8 |
| Complete rows on opening: admin 390 / `#/team` 390 / admin 1280 | 0 / 2 / 1 | 0 / 2 / **0** | 0 / 3 / 1 |
| Row height at 390 px, two services / three | 135 | 80 / 99 | 77 / 97 |

The working screen has the service heads stuck at the top, and rows under them do not count. One measured loss: at 1280 px the service heads sit above the first row, so on opening the Save area cuts the first row (1 complete row before, 0 now). One scroll shows 8 rows, against 5 before. Screenshots: `built-admin-390.png`, `built-team-390.png`, `built-admin-1280.png`, `built-double-admin-390.png`, `built-double-admin-390-after.png`.

**Checks:**
- New `tests/team-grid.test.js`:
  - usual and "Same as Lunch" offered first and never applied;
  - no automatic fill;
  - plain counts with chefs left out, and nothing green before Save;
  - the chef cell reads Sous chef with the dashed edge;
  - Off cells;
  - the Save words, six then a count;
  - a long name wraps only between words at the largest text;
  - three services on a phone;
  - the heads stuck under the admin room tabs.
- `tests/team-picker-context.test.js` adds the old-key check. It fails on the row-picker logic (reproduced by putting that logic back) and passes now.
- `tests/team-row-service.test.js` is rewritten for the grid. It checks:
  - the details chip is view only;
  - services stay separate;
  - the one editor moves between layouts;
  - search across services;
  - Off and explicit Add or Remove;
  - Whole day;
  - dated drafts;
  - a held or repeated Save;
  - the Save words;
  - 04:00 recovery;
  - the tapped row stays in place, which fails without the fix (450 to 47 px) and passes now.
- The other team files, `todays-team`, `kitchen-pages` and `design-patterns` use the new keys.
- **GitHub Click tests:** green on the pull request. All five browser shards and the rules and nightly checks pass. The first run failed one hint expectation that a later step on this branch had made out of date; that was fixed and checked again.
- **Local full suite** (333 files, cloud container): every Today's team file passes, and so do the roles, design pattern, colour, read budget and Home files. Three files failed here:
  - `update-confirmation`: lost its test stand-in mid-reload under load, and passed on a rerun.
  - `function-print` and `function-prep-print`: failed the same way on an untouched copy of `main` in this container, so the cause is the container's print engine. Both pass on GitHub.
- **Not evidenced:** real phones with real fonts; the live book with real staff and sections; how many cells the nightly usual sections leave empty; wet-hand use of 101 px pills.
