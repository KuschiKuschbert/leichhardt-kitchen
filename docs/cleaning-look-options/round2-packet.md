# Round 2 packet: three designs for the cook's Cleaning page, and the name

Source commit `a187cd63` plus the drawings. Read with [round1-packet.md](round1-packet.md) (contracts, references, Try to break it, Where it goes, design misses, colours) and [brief.md](brief.md) (round 1 record and the design frame).

**How they were drawn.** Each design is the real Cleaning page in the click-test stand-in (the shell, top bar, tab bar, the real rows, the real tick, Undo, Not sent and Who did this), rearranged by a small script and put back after every redraw the page makes ([designs/build.cjs](designs/build.cjs)). So a real tick was pressed in each design, and the next box measured. Parts a design adds or moves carry `data-design` and were measured for text contrast, 44 px targets and keyboard focus. Measurements are **Preview inside the implemented app**, not the implemented design: the real build must be measured again. Made-up people: Ann (cook), signed in on her phone with Grill picked, and on the Grill section screen (shared, touch, 1920 x 1080, set to Grill) once on Grill and once on Pans. Wednesday 2 December 2026, 14:00. The head chef's real lists under four made-up sections. The book's own fonts.

**Pictures** (all in `designs/`): `<design>-cook-390.png`, `-cook-390-full.png`, `-cook-390-notsent.png`, `-cook-768.png`, `-station-1920.png`, `-station-pans-cook-1920.png`, for `a`, `b` and `c`. Today's page: `../baseline/cook-390.png`, `cook-390-full.png`, `cook-768.png`, `station-1920.png`, `station-1920-pans-cook.png`, `station-1920-who.png`. The name: `name-clean-down-390.png` and `name-clean-down-1920.png` (today's page with only the name changed). Numbers: `designs/measurements.json`, `../baseline/baseline.json`.

**Scope.** The cook's page only (phone, tablet, section screen). The chef's Today, Week and Repeat tasks are unchanged in every design (round 1). Every design keeps the title "Cleaning" so the name can be judged on its own: any design takes either name.

## The three designs

### A. The same page, tidied (changes least)

One column on every device, the order of today. Only the frame changes.
- The handwritten orange "0/50, recorded; repeats apply" becomes a quiet count in ink: "Grill: 0 of 9", with "0 of 50 in the kitchen" small under it.
- The read line stays (Checked 14:00, Go to Pack down, Refresh).
- The temperature reminder: the contract words in full, one quiet line at the end of the cook's own section (no link to open).
- The coverage hint moves under the Shared kitchen heading, in plain words: "Jobs after each service, prep or use: record each one. The count only knows the ones recorded."
- A row's small line drops the section name its heading says ("Grill · To do" under Grill reads "To do").
- Section screen, a cook from another section: "This screen. You are on Pans today" in bold body text beside the section name, and Go to Pans pack down becomes a 44 px button under it (the read line's link moves there, so it is said once).

### B. Your section beside the rest (rethinks the layout)

The title and the read line share a smaller header; the cook's section becomes a panel with its own big count; from 1100 px the panel is a column of its own and the rest of the kitchen fills a second column across the whole screen width.
- Header: "Cleaning" smaller, then "Wednesday 2 December · Checked 14:00", Go to Pack down, Refresh on one line. No kitchen count in the header.
- The cook's section: a bordered panel, "Grill" and "0 of 9 done" large, its Pack down, then the temperature words in full at its foot.
- The coverage hint is gone for staff.
- "Rest of the kitchen" carries the kitchen's remaining count ("0 of 41 done") where it applies.
- Section screen (1920): two columns, the panel sticky on the left; 23 rows in view instead of 9. A cook from another section: a band above the panel, "You: Pans" in large type with a filled 44 px button Go to Pans pack down; the panel says "This screen: Grill".
- Phone and tablet: one column, same order as today.

### C. Tonight's close first, the rest folded by section (removes the most friction; two approved rules change)

The page opens on the cook's own section as its title; every other group is one line with its count that opens in place.
- Header: the section's name as the title ("Grill"), "0 of 9, your section, tonight" at the right, "Cleaning · Wednesday 2 December" under it. The read line: Checked 14:00, **Temperature logs** (the link that opens the contract words, as today), Refresh. Go to Pack down is gone (Pack down is first).
- Below the cook's Pack down: "Rest of the kitchen" and one 48 px line per group: Shared kitchen 0 of 24, Hot larder 0 of 6, Pans 0 of 11, Floors after shelving 0 of 0. Tapping one opens it in place. It remembers what was opened. It opens by itself on unsent work (a Not sent tick or a refused one) and never closes on a tick. The coverage hint sits inside Shared kitchen.
- Section screen, a cook from another section: the cook's own Pack down leads (Pans, 0 of 11, "you, tonight"), and "This screen: Grill" is the first fold. From 1100 px the folds sit two across, an open one full width.
- **Approved rules it changes (the head chef's call):** folds on the staff page ("Nothing is folded", 26 November; closed rows rejected 5 of 6 on 25 November); on a shared screen the person's section leads instead of the screen's (step 3, 26 November); the temperature words stay behind a link (as today).

## Measurements (Preview inside the implemented app)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| 390 px: first tick box from the top | 454 px | 344 | 317 | 281 |
| 390 px: complete rows above the tab bar | 5 | 6 | 6 | 7 |
| 390 px: page length (screens) | 5.4 | 5.5 | 5.4 | 1.6 |
| 768 px: rows / first box | 9 / 504 | 9 / 430 | 9 / 382 | 9 / 358 |
| Section screen 1920 x 1080, cook on Grill: rows / first box | 9 / 504 | 10 / 430 | 23 / 380 | 11 / 358 |
| Same, cook on Pans: rows / first box | 9 / 504 | 9 / 488 | 23 / 459 | 11 / 326 (Pans leads) |
| Section screen page length (screens) | 3.4 | 3.4 | 2.8 | 1.1 |
| Tick a plain job in your section, phone | 1 | 1 | 1 | 1 |
| Same, section screen (box, then your name) | 2 | 2 | 2 | 2 |
| Tick a Shared kitchen job, phone | 1 (scroll about 1 screen) | 1 (same scroll) | 1 (same scroll) | 2 (open the fold, then the box) |
| Pans cook at the Grill screen reaches their Pack down | 1 small link | 1 (44 px button) | 1 (filled 44 px button) | 0 (it leads) |
| A Grill Pack down step with 2 checks, phone | 4 (open, 2 checks, Record done) | 4 | 4 | 4 |
| Next box after a real tick, ack and Undo (S1), 390 px | | did not move (459) | did not move (446) | did not move (396) |
| Next box after a real tick through Who did this, 1920 | | did not move (537) | did not move (482) | did not move (465) |
| Not sent on a held tick (no signal), 390 px | "Not sent" in the row's small line | same, in view | same, in view | same, in view |
| Lowest text contrast in the parts drawn | | 6.73:1 | 5.05:1 | 4.76:1 |
| Drawn controls under 44 px | | 0 | 0 | 0 |
| Keyboard focus on the first drawn control (390) | | no drawn control on the phone | Go to Pack down: 3 px ring, 3.33:1 | Temperature logs: 3 px ring, 3.33:1 |
| New reads, rules, saved-shell files | | none; CSS in the shell (K1) | none; CSS in the shell (K1) | none; CSS in the shell (K1) |

Whole Grill close on a phone, any design (from the saved lists): 9 jobs, 7 with checks (16 checks): 7 opens, 16 checks, 7 Record done, 2 plain ticks = 32 taps; on the section screen one more name tap per recorded job. No design changes that; changing Who did this is a rule change none of them proposes.

Not evidenced in any design: Extra large text; the Functions fold above the page on a function night; a refused tick and its Refresh; a fold opening by itself on unsent work in C (the code is drawn, the case was not exercised); bench reading of a real 21 to 24 inch screen; the old saved shell meeting a new page (K1).

## How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | One column everywhere | Two columns from 1100 px (your section, the rest) | One column; folds two across from 1100 px |
| Hierarchy | Title, then counts, then your section | Your section is a panel with the big count | Your section is the title |
| Rest of the kitchen | All open, as today | All open, beside you on wide screens | One line per group, opens in place |
| Section screen, cook from another section | Screen's section leads, bold words and a button | Screen's section leads, a "You: Pans" band with a filled button | The cook's own section leads, the screen's is a fold |
| Temperature words | In full, after your section | In full, at the foot of your panel | Behind a link, as today |
| Coverage hint | Under Shared kitchen, plain words | Gone for staff | Inside the Shared kitchen fold |
| Approved rules changed | None | None | Folds on the staff page; person before screen on a shared screen |

## The name, on its own

Field from round 1: **Cleaning** (today) or **Clean down**. `name-clean-down-390.png` and `-1920.png` show today's page with only the name changed. Both fit the tab bar at 360 and 390 px, at Extra large text too (`baseline.json`, tabs). The keeper's narrow rename (tab, Home docket, page title, window title; route `#/cleaning` and the word "cleaning" in Records, the Inbox and Settings stay) against the skeptic's whole rename (every string the team sees, about 50, in one pull request, with a test they agree). A rename also loses the 1 April tab joke unless `js/fools.js` is changed with it.
