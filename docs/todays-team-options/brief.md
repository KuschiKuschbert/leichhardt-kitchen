# Today's team: shifts, sections and breaks. Options

Requested 7 November 2026 by the head chef, in three messages:

1. "In the morning when head chef or sous chef log in, allocate breaks for the people that are on during this day. Since we don't have a function yet to tell who's on, ask them in a picker who's working today and allocate set break times for them. On the staff end, once the break times have been allocated by head or sous chef, or admin, show them on their page when they are logged in what time they go on break and how long for. Come up with 3 designs that speak our design and functionality language and are not disturbing."
2. "Can we make head chef and sous chef, while they allocate the breaks, also allocate the section they're on?"
3. "Can we make it so the head or sous chef can change sections depending on shifts, either lunch shift or dinner shift, and maybe have the options in the admin panel to create different kinds of shifts? For example a smoker shift, so that they can be assigned to?"

**Status: designs drawn, waiting for the head chef's choice. Nothing is built.** `index.html` in this folder is the comparison page (open it in a browser). The pictures in `previews/` are mock-ups drawn inside the running book (the click-test stand-in, `tests/fake/`) with the book's own stylesheet, top bar and sheets, then photographed. Every name, section, shift and time in them is made up. Nothing in them saves. Baseline: `main` at `485b014`.

## Today

Measured on 7 November 2026 in the click-test stand-in, Saturday 14:00, on a 390 x 844 phone (1280 px for the admin panel).

- The book has no record of who is working, on which shift, or when anyone goes on break. Rosters, leave and the hours worked live in Humanforce; a guide in the book tells staff to clock in, record their breaks and clock out there. How breaks are handed out now (said out loud, a whiteboard, paper) is not recorded anywhere the book can see.
- Who is on today is only known after people sign in: the Kitchen sections pick (`shifts/<day>_<person>`) and the Drinks run's On today (who opened the book today). At 07:00 nobody else has signed in, so neither can tell the morning chef who is rostered.
- Staff and leads pick their own section in **Your section today** straight after their PIN, once a day (`previews/today-staff-section-390.png`). The head chef and sous chefs are not asked: their role is their section. There are no shifts: one section per person per day.
- An individual shift ping can tell one cook "Your break 14:30, 30 min", but a ping is on screen for 30 minutes from its pop-up time and then gone for everyone, and it is typed by hand for each person. The ping guidance says to keep staff names out of pings, so a team break list in an Everyone ping goes against it.
- Add a prep line: 1 tap (Add a line). Tick a line: 1 tap. Find a recipe: 1 tap to the Recipes tab.
- Prep list lines fully visible above Add a line: **3** for staff (`previews/today-staff-prep-390.png`), **2** for a sous chef, whose list has the day row above it. Corrected after round 1: the proposal said 3 for both, measured above the tab bar instead of Add a line. Landing page dockets fully visible: **6** (`previews/today-staff-landing-390.png`).
- The start of shift sheet (once a day per person, after the PIN and the section pick, only when there are pings or minutes to sign): today's pings, then "Prep list 6 of 6 lines still to do" (`previews/today-staff-start-sheet-390.png`).
- The chef hat menu: a person card (name and role), Sign out, Kitchen tiles, and for chefs the Chef tiles (`previews/today-staff-hat-390.png`, `previews/today-sous-hat-390.png`).

## Round 1: should we build it?

Five fresh reviewers, 7 November 2026, from the proposal (messages 1 and 2) and the screenshots above. Role-based analysis, not research with real staff. Message 3 (shifts) came after round 1; the round 2 reviewers judged the designs with shifts in them.

**Verdict: Build smaller (4 of 5).** The head chef, the skeptic, the keeper of the book and the cook mid-service said Build smaller; the new starter said Build.

- What most agreed: no pop-up that opens by itself on the chef's sign-in (head chef, skeptic, keeper); count the chef's taps, as 8 cooks with a tick, a section, a time and a length each is about 30 taps every morning; start each day from last week's team so the morning job is "change what is different"; one record for the day, one Save, one stamp.
- Staff side: never show "no break" when the book does not know (say "Not set yet" or "Could not check"); a time the chef changes must be obvious ("Changed 10:12 by Sam"); never yesterday's plan; no list line lost on the prep list.
- Added: fixed break slots set once, so a break is one tap (head chef); keep a one-tap change of section for a cook who gets moved (cook); the keeper wants one record to be the truth for sections, with nothing copied from it.
- Disagreement, sections: the head chef reviewer and the skeptic would ship breaks first and sections later, since the chef's pick reaches into the section pick, the prep and wastage defaults, My section and Insights. The cook and the new starter like that the chef's pick removes the staff question ("I can't pick the wrong one"). The real head chef then asked for sections and shifts, so every design carries them.
- Disagreement, where staff see it: the cook, the skeptic and the head chef reviewer want it only in what staff already see (the start of shift sheet, the chef hat card). The new starter wants a line that stays in one place ("the start sheet is gone once I tap Got it; I'll have lost it by 11:00 and I'll ask anyway").
- Not known: how often cooks forget their break today, and whether the current way fails. The head chef can say.

## In every design (the smaller core)

1. **Shifts, set up once by the head chef.** Admin panel, Kitchen, a **Shifts** row under Kitchen sections, in the same look: add, rename and remove the kinds of shift the kitchen works (Lunch, Dinner, Smoker, anything else), each with an optional From and To time (`previews/core-admin-shifts-1280.png`). Renaming keeps its history; a removed shift is kept and marked off, like a section. Saved with Save changes, by the verified admin only. The times in the pictures are made up; the head chef sets the real ones.
2. **One record for the day.** Who is on which shift, their section on each shift, and their breaks (time and length, one or two per person), with who saved it and when. Written only by the head chef (PIN or admin) and the sous chefs, with one Save. Read by every signed-in kitchen session. Never yesterday's: it is dated, and at midnight it is over, like the section pick.
3. **Start from last week.** The chef's screen opens on the last same weekday's team (one read): the same people, shifts, sections and break times. The morning job is to change what is different and Save.
4. **Sections follow the plan and the shift.** A person the chef set is not asked **Your section today**. Their section for the day is the one on the shift that is on now (by the shift's times), so Ann is on Grill at lunch and Pans at dinner by herself: the prep list and wastage default, My section in the chef hat, Who worked where and Insights follow it. A person the chef did not set is asked as today (design C changes this). A cook moved during service keeps a one-tap change (My section), and the chefs see it.
5. **Staff never see "no break".** Three states only: set ("Grill · Break 14:30, 30 min"), changed after they saw it ("Changed 10:12 by Sam. Was 14:30."), and not set yet ("Not set yet"). With no signal the line says it could not check.
6. **Quiet.** No sound, no new pop-up for staff, nothing over a list during service.
7. **Reads stay small.** No listener, no polling. About 1 read per phone per day for the record, and 2 per phone after each Save (the stamp on `config/main` every phone already listens to, then the record), as pings do. 15 phones and 3 saves a day is about 105 reads, against 12,000 to 20,000 on a normal day. `tests/read-budget.test.js` gets the new read in its budget.
8. **Rules.** A new record per day that only the chefs and the verified admin write, with its fields, ids and times checked; shifts in `config/main`, admin only. Tested for every role on the emulator (`tests/rules/client-shapes.test.mjs` rows), published before the client.
9. **Not in the book.** Rosters, leave and hours stay in Humanforce. The book does not check award break rules: the times and lengths are the chef's.

## The three designs

### A. Chef tile, quiet lines (changes the least)

**Chef:** no pop-up. **Today's team** is a new tile in the Chef group of the chef hat, with "Not set yet" under it until the day is saved (`previews/a1-chef-hat-390.png`); the admin's Today room lists it under To do (`previews/a5-admin-1280.png`). The page shows one shift at a time (Lunch, Dinner, Smoker tabs with how many are on), a row per person: a tick for on, their section and break as two pickers, "Also on dinner: Pans" under the name (`previews/a2-chef-page-390.png`). People not on that shift fold under one line. One Save.

**Staff:** nothing new on the work pages. **Your day** sits at the top of the start of shift sheet (`previews/a3-staff-sheet-390.png`) and under their name on the chef hat's person card (`previews/a4-staff-hat-390.png`): "Lunch: Grill · Break 14:30, 30 min / Dinner from 16:00: Pans".

Pros:
- No new pop-up for anyone. The chef opens it when it suits, like Chef to-do.
- Staff learn nothing new: the start sheet and the chef hat are already theirs.
- The smallest build of the three; the To do line on the admin panel reminds the head chef.

Cons:
- The start of shift sheet comes up today only when there are pings or minutes. To show Your day it must also come up when the day is set: a sheet more often, once a day at sign-in.
- After Got it, the break is one tap away (the chef hat). The new starter's worry: "lost by 11:00".
- A chef who forgets gets nothing but a "Not set yet" on the tile.

### B. Morning roll call (rethinks the flow; the way the head chef first asked)

**Chef:** the first chef to sign in each day gets **Today's team** as a bottom sheet after the PIN, in the section pick's place (chefs are not asked a section). **Same as last Saturday? Use it** fills everything in one tap. Otherwise three short steps: **Who is on which shift?** (a row of shift chips per person, `previews/b1-rollcall-who-390.png`), **Sections** (pick a section, then tap the people on it, one shift at a time, `previews/b2-rollcall-sections-390.png`), **Breaks** ("Lunch from 12:00, one at a time, 30 min, Spread them", then tap a name to change it, `previews/b3-rollcall-breaks-390.png`). **Later** closes it and leaves a Today's team tile in the chef hat; once one chef saves, the others are not asked. On a laptop it opens in the middle (`previews/b4-rollcall-1280.png`).

**Staff:** a line that stays. On the landing page, a slip under the date: "YOUR DAY Grill · Break 14:30" with "Dinner from 16:00: Pans. Set by Sam at 07:12." (`previews/b5-staff-landing-390.png`), in orange when the chef changes it (`previews/b5-staff-landing-changed-390.png`), and "Not set yet" before (`previews/b5-staff-landing-wait-390.png`). On the prep list, under "0 of 6 done": "Grill · Break 14:30", in the header's own height, so no list line is lost (`previews/b6-staff-prep-390.png`).

Pros:
- What the head chef asked for: the morning chef is asked, so the day is set before service.
- Staff always see their day where they already look, with nothing to tap. The changed state answers the cook's "a quiet change is a trap".
- Paint by section and Spread them make a fresh day the fewest taps of the three.

Cons:
- A pop-up for the chef at the start of the day: the council's main objection (3 of 5). It must queue with the pings sheet and the drinks run card.
- The landing slip pushes the Guides docket below the fold on a phone (6 dockets fully visible become 5).
- The biggest build: the sheet's three steps, its place in the sheet queue, and a tile to change it later anyway.

### C. One team board (removes the most)

**Everyone:** one page, **Today's team**, from the chef hat. The shift on now first (Lunch, Dinner, Smoker tabs), each person under their section with their break time; past breaks in grey; **On break now: Sam, back 14:30** in a dark band at the top (`previews/c2-staff-board-390.png`). Staff see their own row marked "(you)". On a laptop or the pass tablet every shift shows side by side (`previews/c5-board-1280.png`).

**Chef:** the same page with **Change** on every row (`previews/c3-chef-board-390.png`), which opens that person's sheet: their shifts, the section on each, the break time and length (`previews/c4-chef-person-390.png`). **Change who is on** adds or takes people off.

**Staff:** the chef hat's **My section** tile becomes **My day**, showing "Grill · Break 14:30" (`previews/c1-staff-hat-390.png`). **Your section today** goes for everyone: sections come only from the board.

Pros:
- One page does both jobs, so there is one place to look and one thing to keep up to date.
- On break now helps the pass see who is off the floor.
- Removes a question from every staff sign-in.

Cons:
- Staff must open a page to see the board, though My day shows their own line in the chef hat.
- A day the chef does not set leaves everyone with no section default (today they pick their own).
- The most taps for a fresh day: one sheet per person.

### Side by side

Taps were counted by walking each mock-up flow, not on a built page. "Normal day": the same team as last Saturday with one section and one break changed. "Fresh day": nothing to start from, 8 people on 3 shifts (10 shift places), 9 breaks.

| | Today | A. Chef tile, quiet lines | B. Morning roll call | C. One team board |
| --- | --- | --- | --- | --- |
| Chef taps, normal day | not possible | 7 | 8 (opens by itself) | 9 |
| Chef taps, fresh day | not possible | about 52 | about 45 | about 60 |
| Staff taps to see their day | none to see | 0 at the start sheet, 1 later | 0 (landing, prep header) | 1 (My day), 2 for the board |
| Staff section question after the PIN | 1 tap | 0 when set, else 1 | 0 when set, else 1 | 0, never asked |
| Add or tick a prep line | 1 | 1 | 1 | 1 |
| Prep lines visible at 390 px (staff, chef) | 3, 2 | 3, 2 | 3, 2 | 3, 2 |
| Landing dockets visible at 390 px | 6 | 6 | 5 | 6 |
| New pop-up | | none (the start sheet comes up more often) | chef's morning sheet | none |
| Navigation levels | | chef hat, page | sheet by itself; chef hat to change | chef hat, board, person sheet |
| Build size (pull requests) | | 3 | 4 | 3, and the section pick reworked |
| Relearning | | small | medium | large |
| New reads | | core only | core, plus last week's record on the sheet | core only |
| New rules | | core | core | core |
| Risk | | low | medium (sheet queue) | medium to high (no section without the board) |

## Round 2: scores

Six fresh reviewers, 7 November 2026: the five from round 1 and the kitchen screen designer. Each saw all three designs, the table above and every screenshot, and no recommendation. Scored 3 for first, 2 for second, 1 for third. Role-based analysis, not research with real staff.

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook mid-service | B | A | C |
| Head chef | A | B | C |
| Skeptic | A | B | C |
| New starter | B | A | C |
| Keeper of the book | A | B | C |
| Kitchen screen designer | A | B | C |

**A 16, B 14, C 6.** A first for 4 of 6; C last for all 6.

- **What every reviewer would take into the winner**: B's line in the prep list header ("Grill · Break 14:30" under "0 of 6 done", no list line lost, nothing to tap). Five of six: B's Use it (same as last Saturday) and Spread them on the chef's page. Four: the header line turns orange when the chef changes it.
- **Against A's start of shift sheet**: four reviewers. It would come up on more days, it is a staff pop-up by another name, and it is titled "Today's shift pings", so Your day may be skipped. Once Got it is tapped, the day hides behind the chef hat.
- **Against B's sheet that opens by itself**: four reviewers. It covers about 90% of the chef's screen, queues with Who are you?, the pings sheet and the drinks run card, and every test that signs a chef in meets it. The landing slip costs a docket.
- **Against C**: all six. A day the chef does not set leaves everyone with no section default, so prep and wastage go under no section; the most taps; staff must open a page. Its wide board (On break now, every shift side by side) was liked as a pass tablet view by the cook and the designer.
- **Not shown in any design** (cook, keeper, skeptic): which section counts between shifts (15:00 to 16:00 with these times) and when Smoker and Lunch overlap; what the header does at 16:00 when Ann moves from Grill to Pans; and where a cook's own My section change is kept (the plan, or `shifts/<day>_<person>`: two records would be two truths).
- **Screen designer's fixes for any build**: A's chef rows are about 115 px, so only 3 people fit, and the sticky Save covers the next row (needs bottom padding); the section chips need the fade at their edge; Change who is on is a small link, under 44 px; past break times in grey look under 4.5:1 contrast; the My day subline is about 11 px.
- **Skeptic's standing objection**: nobody has shown that breaks are missed today. A chef who taps Use it without looking sets a wrong plan, and that plan then sets the prep defaults and Who worked where; a cook's own pick is never wrong that way.

## Recommendation

**A with three pieces of B.** It ranked first, every reviewer asked for the same pieces of B, and it keeps every list line with no new pop-up.

1. **Chef: a tile and a quiet line, no pop-up.** Today's team in the Chef group of the chef hat (`previews/a1-chef-hat-390.png`), the admin's To do line (`previews/a5-admin-1280.png`), and, answering "when they log in", a **Set today's team** link under "0 of 6 done" on the chef's own prep list until the day is saved (`previews/mix-chef-prep-390.png`; a sous chef still sees 2 list lines, as today).
2. **The chef's page with B's shortcuts**: Same as last Saturday? **Use it**, then one shift at a time with **Spread them** for the breaks (`previews/mix-chef-page-390.png`). The page offers last Saturday's team rather than filling it in unasked, so the chef accepts it on purpose (the skeptic's worry). Use it only fills the page with the names to check; nothing is saved until Save, and Save refuses to overwrite a day another chef saved meanwhile (the chip council, below). Normal day: 7 taps from the Set today's team link (the link, Use it, one section, one break, Save). Fresh day: about 43 instead of A's 52, as Spread them fills a shift's breaks in one tap.
3. **Staff: B's header line, A's wording.** "Lunch: Grill · Break 14:30" under "0 of 6 done" on the prep list, 3 list lines as today (`previews/mix-staff-prep-390.png`); orange with "Changed 10:12 by Sam" when the chef changes it (`previews/mix-staff-prep-changed-390.png`); A's full lines under their name in the chef hat ("Dinner from 16:00: Pans", `previews/a4-staff-hat-390.png`). Your day also goes in the start of shift sheet, but only on days the sheet comes up anyway: it does not come up more often.

Left out: B's sheet that opens by itself and its landing slip; A's start sheet on extra days; C's board and its removal of the section pick. C's wide board can come later as the pass tablet view if the head chef wants it. Build in small steps, each its own pull request in one release window: rules and the Shifts row; the chef's page; the staff lines and sections following the plan.

## Questions for the head chef

1. **The morning pop-up.** You asked for the book to ask the chef at sign-in. The council advises a quiet "Set today's team" line and a tile instead (3 of 5 in round 1, 4 of 6 in round 2). Do you want the sheet that opens by itself anyway (design B's roll call)?
2. **Between and overlapping shifts.** With Lunch 10:00 to 15:00 and Dinner from 16:00, which section counts from 15:00 to 16:00? And when someone is on Smoker and Lunch at once? Suggested: in a gap, the next of their shifts; when two overlap, the one that started last.
3. **The smoker shift.** Is it a shift with its own hours, like an early start (as drawn), or a job someone does on top of their lunch section?
4. **A cook moved during service.** May cooks change their own section with one tap (and the chefs see it), or only the chefs?
5. **Breaks.** Which lengths should the book offer (drawn: 10, 20 and 30 minutes), and up to how many breaks a person (drawn: two)? Should staff see the whole team's breaks, or only their own?
6. **The chip on staff phones.** You asked for it on staff phones too. The council advises no chip there (it saves no taps and looks like the bell to a wet thumb); the icon goes in front of their prep list line instead. A round chip does fit from 375 px. Which do you want?
7. **The icon.** Team and clock (5 of 6), or one of the others?

## Top bar chip and team icon (second request)

Asked the same day: "maybe have a chip next to the shift ping bell and the chef hat for today's team allocation, and on the staff phones and tablets as well, for quicker access?" and "can we create a nice team icon for that?"

A top bar button is a major change (the service rules). Round 1 had already covered the feature, so the council ran once, combined: six fresh reviewers (the five and the screen designer) gave a verdict on a chip at all, ranked three chip designs and picked one of three icons. Role-based analysis, not research with real staff.

**Measured** (click-test stand-in, staff and sous chef, landing page and prep list):
- A chip with words in it ("Team", "14:30", "Break 14:30") wraps the page tabs onto two rows on a laptop (Guides drops to a second row at 768, 1180 and 1280 px), and cuts "Kitchen Book" to "Kitche..." on every phone width (`previews/chip-staff-390.png`).
- A round chip, the bell's size, keeps the tabs on one row from 768 to 1440 px and keeps the title whole on phones from 375 px. It wraps the tabs at 720 px. At 360 px it needs 13 px more, so the title would be set a little smaller there. (At 1100 px the tabs already wrap today with no chip; that is for its own fix.)
- No list line lost: the top bar keeps its height. No new reads: the chip shows the same day record.

**Three chip designs**: T1, always there (round on a phone with a Your day sheet, `previews/chip-t1-*`); T2, only when it matters (from 30 minutes before a break until back, after a change, for chefs until the day is saved, `previews/chip-t2-*`); T3, no new button, Your day at the top of the bell's sheet (`previews/chip-t3-staff-bell-390.png`).

**Three icons** in the book's icon style (`previews/chip-icons.png`, each on the chef hat's tile in `previews/chip-icon-*-menu-390.png`): Brigade (two toques), Team and clock (two people and a clock), On the line (three people over the pass rail).

| Reviewer | Chip at all | First | Second | Third | Icon |
| --- | --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | T2 | T1 | T3 | On the line |
| Head chef | Build smaller | T2 | T1 | T3 | Team and clock |
| Skeptic | Don't build yet | T3 | T2 | T1 | Team and clock |
| New starter | Build smaller | T1 | T2 | T3 | Team and clock |
| Keeper of the book | Build smaller | T1 | T3 | T2 | Team and clock |
| Kitchen screen designer | Build smaller | T2 | T1 | T3 | Team and clock |

**Verdict: Build smaller (5 of 6). T2 14, T1 13, T3 9. Icon: Team and clock (5 of 6).**

- On a phone the chip saves no taps for staff: their day is already on the prep list with none and in the chef hat with one (head chef, keeper, cook, designer, skeptic). Three round outline buttons side by side look alike to a wet thumb, and the bell is the one the cook must trust (cook).
- On a tablet or laptop words would help ("Break 14:30", never a bare "14:30", which reads like a ping time or the clock: cook, new starter, designer), but the measurement shows words do not fit there without wrapping the tabs.
- T3 was ranked last by five: a team dot on the bell teaches people to ignore the dot that carries deliveries and safety pings.
- T2's filled orange fails contrast with dark text (about 4:1); use the tag colour with white (about 5.6:1) (designer).
- Every reviewer: **Use it must never save blind.** It fills the page with last Saturday's names to check, nothing is saved until Save, a starter who was not here last Saturday is easy to add, and Save first checks the server and refuses to overwrite a day another chef already saved (keeper, the #400 rule).
- The same icon in front of the prep list line and the chef hat line teaches it with its words (new starter). Make the clock a touch bigger so it stays apart from Manage staff's two people (designer).
- The skeptic: ship the recommended design first and see whether anyone misses a chip.
- Not shown: what the shared tablet's chip shows after a handover (it should be the person signed in, and nothing while locked); what someone with no shift today sees.

**Recommended chip** (within what the measurements allow):
1. **Chefs** (head chef, sous chefs, the admin): a round chip with the Team and clock icon, left of the bell, all day on every screen from 375 px. Filled in the tag colour until today's team is saved, plain after (`previews/chip-final-chef-unset-390.png`, `previews/chip-final-chef-set-390.png`, `previews/chip-final-chef-unset-1280.png`). One tap opens Today's team. This is the allocation shortcut the head chef asked for.
2. **Staff on tablets and laptops**: the same round chip, only from 30 minutes before their break until they are back, and after a chef changes their day, filled in the tag colour (`previews/chip-final-staff-due-1280.png`, `previews/chip-final-staff-due-768.png`). One tap opens Your day. The shared tablet shows the person signed in, and nothing while it is locked.
3. **Staff on phones**: no chip. The icon goes in front of their line on the prep list and in the chef hat, so it is learnt with its words (`previews/chip-final-phone-prep-390.png`, still 3 list lines; `previews/chip-final-phone-hat-390.png`).

## Chosen

Not chosen yet.

## Files

- `brief.md` this brief; `index.html` the comparison page.
- `previews/today-*.png` the book today; `previews/core-*.png` the Shifts row (every design); `previews/a*`, `previews/b*`, `previews/c*` the three designs; `previews/mix-*.png` the recommended mix; `previews/chip-*.png` the top bar chip, its three designs, the icons and the recommended chip (`chip-final-*`).
