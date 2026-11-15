# Today's team: a simpler way to give staff their sections

15 November 2026, Queensland. Head chef request: "a simpler way of applying sections to staff. At this point I have to physically tap the picker for lunch then assign lunch shift. Tap the picker go to dinner assign shift there. There must be a more user friendly way especially now with the uploaded roster that we know the times someone is working."

**Status: council round 2 in progress. Nothing in the app has changed.** [Proposal](proposal.md), [evidence packet](evidence-packet.md), [previews](index.html) ([A](a.html), [B](b.html), [C](c.html)). Role-based analysis, not research with staff.

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

**Preview**, not the implemented app: an imitation of the admin shell (first row at 577 to 666 px on a 390 px phone, against 612 px in the app), fallback fonts, made-up data, the same tasks as the baseline, scripted with Playwright and counted by a tap counter in the page. Script [`verify.cjs`](verify.cjs), raw [`verify-abc.json`](verify-abc.json); all 67 checks pass.

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

To come.

## Mix of A, B and C

To come.

## Recommendation

To come.
