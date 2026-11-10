# Design C, Tell everyone once

Functions ahead of time council, round 2, 10 November 2026. **Design preview only:** no app file changed. Every number here is **Preview** unless it says otherwise: static pages built from the implemented-app snapshots in `../baseline/` (main `184174e`, scripts removed, the real `css/app.css`), synthetic data, bundled Barlow, Barlow Condensed and Caveat fonts, Chromium headless shell 1243, deviceScaleFactor 1, viewports 390 x 844, 768 x 1024 and 1280 x 900. The baseline snapshots were measured with the same script, so before and after use one method. Raw numbers: [`measurements.json`](measurements.json). Screenshots: [`shots/`](shots/). Run-up sheet: [`runup.html`](runup.html), [`shots/runup-1280-full.png`](shots/runup-1280-full.png).

Synthetic data: today Tue 10 Nov 2026, 14:00 Queensland. Smith 60th, Thu 12 Nov, Function room, 60 guests, event 18:00, food 18:30 and 19:15, 5 Antipasto and 5 Pizza platters, notes "4 gluten free, 1 nut allergy". Jones wedding, Sat 14 Nov, Beer garden, 90 guests, event 17:00, food 18:00, 6 Antipasto. Both ordered on Sun 8 Nov. Extra state: Lee engagement, Fri 13 Nov, booked today. Staff Ann, head chef Bo, seven other made-up first names.

## Central idea

Attention is earned once per person: when a function comes within 7 days (or is booked inside them), each person gets one **Function heads-up** card at the top of Home with every fact they need and one **Got it**, then nothing more until a short second heads-up the day before; work pages get no new line.

## How it works

1. **Who gets it.** Everyone signed in with kitchen access on the staff-first Home: staff, leads, sous chefs, the head chef. Not: signed out, Functions-only accounts, and not the person who saved that version of the function (they wrote it, as with a ping just saved, `noteJust()`).
2. **When.** A confirmed function from 7 days before its date to 2 days before: the **week heads-up**. On the day before: the **Tomorrow heads-up**, for everyone once, even after the first Got it. On the day itself: no card (Now and next, the band, the platter prep lines and the service view take over, as today). Booked inside the week: the card shows at the next Home open, tagged **Booked today**. The first PIN of a person's day already opens Home (#659), so nearly everyone lands on the card once.
3. **What.** One card, quiet paper with the functions' steel edge, pinned above Your day: FUNCTION HEADS-UP and "1 of 2 this week"; the day in words and how far away ("THU 12 NOV · IN 2 DAYS"); the name; place, guests, event start; three fact rows: Food out (times and rounds), Platters (with the total), Dietaries (the booking's service and dietary notes); **Got it** (the one main action) and **Open the function** (the existing sheet); "Also this week: SAT 14 NOV Jones wedding"; one line that says what Got it does.
4. **Got it** answers in the card's own place, with the function's name: "Got it: Smith 60th. It stays in Coming up." with **Undo**, and the next card (2 of 2) shows under it. After the last one, a 58 px line, "Got it: Jones wedding. Both stay in Coming up.", until Home is left; then Home is exactly as today. Coming up is unchanged and still lists both.
5. **It comes back once** when a kitchen change is made after this person's Got it (the existing `changes()` words: "Guests 60 to 72", "Service times changed", "Moved to Fri 13 Nov"), tagged **Changed 11:20**, the changed fact underlined. Cancelled after this person was told: a red card, "Cancelled. Do not prep or order for it. Its platters are off the prep and order lists.", once, then Got it. Cancelled before they were told: nothing, there is nothing to unlearn.
6. **Work pages:** no new line on any day. The only reminder is the existing bell: its dot stays on while a heads-up is not Got it yet, and a tap on the bell lists the heads-up at the top of the existing pings sheet, whose Got it puts it away. The heads-up never opens the sheet by itself and never pops up.
7. **Chefs (phase 2):** **Who has seen it** on the head chef's and sous chefs' card and in a new Heads-up part of the function sheet: "Seen 4 of 7: Ann, Cleo, Dev, Fern. Not yet: Eli, Gus, Hana." read on a tap, never on open.

### Reuse the ping machinery, or a Home card? Decision: a Home card with Got it kept on the phone; receipts as an optional second step

| | Automatic Everyone ping from the booking | Home card, Got it kept on the phone (chosen, phase 1) | Plus receipts (phase 2) |
| --- | --- | --- | --- |
| Writes | One `notes` record per confirm and per change (from `js/fnedit.js`), plus the existing per-person, per-day receipt | None | One immutable `functions/<id>/seen/<staffId>_<stage>` per person, function and stage (at most 2). With 8 people and 2 functions a week: up to 32 small writes a week |
| Rules | Functions-only accounts cannot write pings today: looser rules for them, or a server job | None | Looser: create your own receipt only; chefs and the verified owner read. Publish before the client, Lock probe after. Rows in `tests/rules/client-shapes.test.mjs` for nine sign-ins |
| Reads | None new for staff | None: the functions are already held by the live `functions` listener (`kq` from 00:00) | One query on a tap of Who has seen it, billed one read per receipt returned (about 7 to 16). Never on open, no listener |
| Receipts | Exist, but per ping per day | None. The phone knows; the head chef does not | Per function and stage, for as long as the function lasts |
| Fit | Pops up over whatever page is open at 10:30 or when saved (a pop-up during lunch), is gone for everyone after 30 minutes (head chef, 24 Oct 2026), so anyone off that day never sees it. The text is a copy: a later change or a cancellation needs another ping | Follows the live function: changed and cancelled come back once. No pop-up. Works with no signal from the saved copy | Same, plus who has seen it. Backups and the kitchen-PIN move must copy the new subcollection |
| Verdict | Rejected | Build first | Build second, if the head chef wants to see who has seen it |

Reused from pings: the word **Got it**, the per-person mark on a shared tablet (`lk.note.seen.<id>` pattern: here `lk.fn.hu.<staffId>`, out of date once the function's day is past), the bell's dot and sheet, and the receipt writer's once-per-person guard (`noteWriteSeen()`). The receipt is sent like a ping receipt, not through the unsent-work guard, so it never holds the 04:00 refresh or an update.

## What shows on which page on which run-up day

A Thursday function, Smith 60th (Thu 12 Nov), order day Sun 8 Nov. Changes from today are in bold. "Not seen" means this person has not tapped Got it on this heads-up yet.

| Day | Home | Prep | Orders | Band on the other work pages | Bell |
| --- | --- | --- | --- | --- | --- |
| 8 or more days before | Nothing new | Nothing | Nothing | Nothing | As today |
| 7 to 5 days before (Thu 5 to Sat 7) | **Not seen: the heads-up card above Your day** (Sat 7: "1 of 2 this week", Jones is 7 days away). Seen: as today, Coming up lists it | Nothing (0 px) | Nothing | Nothing (as today) | **Dot while not seen** |
| Order day (Sun 8) | **Not seen: the card**, then Now and next's order rows (as today). Seen: as today | Band: "Order today" lines (as today, 171 px with two functions) | Function stock line (as today) | Order line (as today) | **Dot while not seen** |
| 3 and 2 days before (Mon 9, Tue 10) | **Not seen: the card.** Seen: as today | Nothing (0 px) | Nothing | Nothing (as today) | **Dot while not seen** |
| Day before (Wed 11) | **The short Tomorrow heads-up, for everyone once** (205 px). Never saw the first one: the full card with a Tomorrow tag. After Got it: as today, Coming up says Tomorrow | Band: Tomorrow line (as today, 113 px) | Nothing | Tomorrow line (as today) | **Dot while not seen** |
| The day (Thu 12) | No card. Now and next shows the next round (as today) | Band with the round (as today, 116 px), platter lines under Functions | As today | As today | As today |
| Changed after Got it | **The card once more, tagged Changed, with the change words** | Nothing new | Nothing new | As today | **Dot** |
| Cancelled after Got it | **A red card once, only for people who were told** | As today | As today | As today | **Dot** |
| Booked inside the week | **The card at the next Home open, tagged Booked today**; a short-notice order row in Now and next (as today) | As today | Function stock line (as today) | Order line (as today) | **Dot** |
| After the day | Gone | Gone | Gone | Gone | Gone |

## Main task: a cook arrives on Tuesday 10 Nov

Ann signs in with her PIN at 09:50. Her first PIN of the day opens Home (as today since #659). The first thing under her name is **Function heads-up, 1 of 2 this week: Thu 12 Nov, in 2 days, Smith 60th**, Function room, 60 guests, event 18:00; food out 18:30 and 19:15 (2 rounds); 5 Antipasto, 5 Pizza (10); dietaries 4 gluten free, 1 nut allergy. **0 taps.** Under it: "Also this week: SAT 14 NOV Jones wedding", so she knows Saturday's exists with 0 taps. She taps **Got it** (1 tap): "Got it: Smith 60th. It stays in Coming up." and the Jones wedding card (2 of 2) with its facts. **Got it** again: "Got it: Jones wedding. Both stay in Coming up." Your day, her section and break, sits right under the card the whole time and is fully on the first screen. She opens Prep: no new line, the list is as long as today.

If she skipped Home (a tap waiting on a shared screen), the bell has a dot on every page; a tap shows both heads-ups in the pings sheet. Tomorrow, Wednesday, Home shows the short **Tomorrow: Smith 60th** heads-up once more, and the work pages show the band's Tomorrow line as today. On Thursday the band and the prep list take over.

## Measurements (all Preview)

| | Baseline | Design C |
| --- | --- | --- |
| Home 390, first "Smith 60th" | 998 px, not on the first screen (tab bar top 776 px) | **218 px, on the first screen**, with time, guests, platters, dietaries and place all above the tab bar |
| Home 390, the card | none | 169 to 499 px (331 px). Your day 169 to 371 moves to 522 to 724, still fully on the first screen. On with you moves from 389 to 742 px, below the first screen until Got it |
| Home 390 after Got it | | 58 px line until Home is left, then identical to baseline |
| Home 390, other card states | | Tomorrow 205 px; no signal 338 px (Your day ends 731); changed 380 px (Your day ends 773); cancelled 247 px; head chef with Who has seen it open 543 px (Your day 734 to 936, after a tap) |
| Home 768, first mention | 884 px, one line in Coming up (screen 1024) | 322 px, the whole card; the three facts sit side by side, card 292 px |
| Home 1280, head chef | 801 px (screen 900) | **302 px**; facts left, Who has seen it right, card 333 px |
| Prep 390, added above the list | 0 px | **0 px** on every run-up day (the band's existing 113, 116 and 171 px days are unchanged) |
| Prep 390, rows fully above Add a line | 6 of 6 | **6 of 6** (the implemented-app screenshot shows 5 complete rows with the stand-in fonts; same method before and after here) |
| Orders 390 | 0 px added, 2 of 2 rows | **0 px added, 2 of 2 rows** |
| Horizontal overflow | 0 | **0** at 390, 768 and 1280 on all 5 pages and 24 frames |

## Comparison table

| | Before (baseline) | Design C |
| --- | --- | --- |
| Taps to see Thursday's function (time, guests, platters, dietaries) from Home | 1 tap and a scroll (Coming up at 955 px, Open functions) | **0** until Got it; afterwards as before |
| Taps to see Saturday's function from Home | 2 taps and a scroll (Open functions, Show the next 14 days) | **1** (Got it on Thursday's); name and day at 0 |
| Taps from Prep | 2 taps and a scroll | **1** while not seen (the bell, or the KB mark to Home); afterwards as before |
| Taps the design adds | | One Got it per function per person, twice over the run-up (week and Tomorrow), plus once per change or cancellation |
| Lines on Prep at 390 | 6 of 6 | 6 of 6 (0 px added, every day) |
| Navigation levels | Home, #/fn, the sheet | Home card (level 0); the sheet one level down, as today |
| Build size | | 3 pull requests: 1 the card and local Got it (`js/functions.js`, `js/prep.js` Home slot, `css/app.css`, tests, `docs/design-patterns.md`); 2 the bell's dot and sheet rows; 3 receipts (rules first). PR 1 alone delivers the idea |
| Relearning | | Low: one card, one button with the pings' word, a line that says what it does. Chefs: Who has seen it |
| New reads, writes, rules, listeners | | Phase 1: none, none, none, none; one `lk.fn.hu.<staffId>` mark per person. Phase 2: up to 2 writes per person per function, one query on a tap, looser rules, no listener |
| Risk | | Low for phase 1 (local state, existing data). Medium for phase 2 (rules, backups, PIN move). Main design risk: the card sits above Your day, a departure from the approved staff-first order |

## How C differs from a quiet line in the band

| | Quiet line in the band | Design C |
| --- | --- | --- |
| Where | Every work page and Home, every day | Home only; work pages get nothing new |
| How long | Permanent while the band is otherwise empty | Once per person per stage, then gone; back once if it changes |
| Information | One line: day and name | All the facts on one card, 0 taps |
| Interaction | Read; tap opens the sheet; minus folds for the day on the phone | Acknowledge with Got it, Undo; per person on a shared tablet |
| What the head chef learns | Nothing | Phase 2: who has seen it |

## Pros

- The head chef's want, "everyone's attention", is met exactly once per person, with every fact, before the run-up: 0 taps, on the first screen at 390, 768 and 1280.
- Work pages keep every line on every day: 0 px added. Today's work and next week's work never mix on Prep.
- Nothing new to read or listen to: the card is drawn from the functions every phone already holds. Phase 1 has no write and no rule.
- Follows the function: a change or cancellation goes back to exactly the people who were told.
- Saturday's function is named on Tuesday's first card, and one tap shows it in full.
- Phase 2 gives the head chef evidence, not hope: who tapped Got it.

## Cons

- Above Your day: the person's own section and break move down 353 px until Got it, and On with you leaves the first screen. A departure from the approved staff-first order (head chef's call).
- Adds taps: one Got it per function per person per stage. A busy week (Christmas, 5 or 6 functions) means 5 or 6 Got its in a row.
- After Got it, finding the function again is exactly as hard as today (Coming up near the bottom of Home, #/fn shows 3 days). C does not fix the 3-day Upcoming gap; A's fix could be added.
- Got it can be a reflex: a receipt proves a tap, not reading.
- Got it is per phone in phase 1: a cook with a phone and the shared tablet sees it twice.
- The day itself is unchanged: on Home at 390, today's round in Now and next is at 807 px, below the first screen (as today).

## Contract fit

| Check | Fit | Evidence |
| --- | --- | --- |
| Surface purpose | **Works** | Quiet paper body (`--surface-paper`) with the work steel edge (`--surface-work-edge`), the same pairing as `.fn-row`; not charcoal (not live), not amber (`surface-colours.md`, Selected design; `colour-coding.md`, Shared meanings). Pinned `.hm-paper` like Home's other cards. [home-390](shots/home-390.png), [1280](shots/home-head-1280.png) |
| State meaning | **Works**, with one check | Upcoming information stays neutral; attention comes from place and words. Orange is only the action (Got it, `.btn.dark`) and the small headings (`--small-ink`). Changed uses the existing function tag (`fn-t-new`), Cancelled the failure family with the word Cancelled (`--bad-tint`, `--bad-ink`), Tomorrow `fn-t-tom`. Got it is a local acknowledgement, so it is answered in neutral words with a tick, never green Saved. **Needs work:** an orange Got it on the red cancelled card ([s-cancelled](shots/states/s-cancelled.png)) may read as a clash; try `.btn` there |
| Words and exceptions | **Works** | Every state has words: Function heads-up, 1 of 2, in 2 days, Changed 11:20, Cancelled, Booked today, Tomorrow, No signal, Got it: name. Allergen certainty and category colours untouched: dietaries are plain words from the booking. Function New/Moved tags reused, not recoloured |
| Real contrast | **Works** for text (rendered, Preview, light only) | Measured on the rendered card: small orange headings 5.27:1, muted 6.73:1, names and facts 15.9:1, white on Got it 5.05:1, cancelled red heading 6.64:1, cancelled foot 6.08:1, Who has seen it labels 7.13:1. **Not evidenced:** keyboard focus ring, dark variants, control boundary on the cancelled card |
| Relevant states | **Works** in preview | Ordinary, two in a week (1 of 2, 2 of 2), Got it with Undo, last Got it, folded (later visit), no signal with a saved copy, changed, cancelled, booked inside the week, Tomorrow, the day itself, bell sheet, head chef card and sheet: [runup](shots/runup-1280-full.png). **Not evidenced:** loading before the functions are read (no card, never "no functions"), failed read with no copy (no card; the band keeps its existing words), the receipt write failing (phase 2) |
| Service continuity | **Works** for work pages; **Needs work** on Home | Prep 6 of 6 rows and Orders 2 of 2 before and after, 0 px added, main tasks unchanged at 390. Home: Your day stays fully on the first screen at 390 x 844 in every card state measured (lowest: ends 773 px with the changed card) but moves down 353 px until Got it; not measured on smaller phones |
| Staff-first Home (`docs/home-staff-first.md`) | **Needs work / head chef decision** | The contract orders the person's own day first. C puts a one-off card above it. Repair if refused: the same card directly under Your day (Your day back at 169 px; the first "Smith 60th" would then be about 440 px, still on the first screen; not built) |
| Design patterns, action feedback, loading | **Works** in preview, **Not evidenced** in the app | `.hm-paper`, `.hm-ph`, `.btn.dark`, `.p-link`, the existing pings sheet `.nt-*` and function sheet `.fn-*`. Got it answers in its own frame, names the function, Undo says what it brings back. A new pattern entry (`.fn-hu`) and its names in `tests/design-patterns.test.js` would be needed |
| Reads (CLAUDE.md coding rules) | **Works** | Phase 1: no read, no listener, no write. Phase 2: one query on a tap, said in a comment, no loop, no listener |

## Design references

| Principle | Fit | Why |
| --- | --- | --- |
| Linear | **Works** | One frame, one main action named the same as pings (Got it), the secondary link names its place. No second navigation, nothing on the top bar |
| Things 3 | **Needs work** | Upcoming and today stay apart on work pages (0 px added). But on Home, next week's function sits above today's Your day until Got it |
| Airbnb | **Works** | Day, time, place, guests, platters, dietaries and the next action together on one card, 0 taps ([home-390](shots/home-390.png)) |
| Todoist | **Not relevant** | Nothing is added or typed |
| Flighty | **Works** | Real dates and times from data the phone already holds, "in 2 days", "Changed 11:20" with what changed, "No signal. Functions last updated 13:52." No new listener or polling |
| Duolingo | **Works**, with a limit | Got it answers at once, truthfully, by name, with Undo; no streaks or points. Phase 2 counts only receipts the server has; the cook is never told Saved. A receipt proves a tap, not reading |
| Headspace | **Works** | Calm words, one name (Function heads-up), the button's effect said in words. Not an onboarding interruption: it is on Home, never over a service page |

## Break it

| Scenario, role and state | Expected | Hypothesis or observed | Impact | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| 1. A rushed cook taps Got it without reading (staff, first PIN of the day) | They know the function is on | The card goes; receipts would say Seen | Head chef believes everyone knows | Risk / Not evidenced | Keep the Tomorrow heads-up and the band on the day as the safety net; the chef's list says "Seen means they tapped Got it" | Accept, words in place |
| 2. Cancelled or moved while the phone has no signal (staff, saved copy) | No heads-up for a dead function | The saved copy shows the old card | A cook preps for nothing | Risk / Not evidenced (same risk as today's band) | The card shows "No signal. Functions last updated 13:52." ([s-nosignal](shots/states/s-nosignal.png)); test the listener's cancelled update clears the card | Verify in the click-test stand-in before ready |
| 3. Midnight before the day before (staff with Home open at 23:59) | Week card turns into Tomorrow once | A tap at 00:00 marks the wrong stage, or both cards show | Card missed or shown twice | Risk / Not evidenced | Got it stores the stage it showed; repaint on the minute (no read); test 23:59, 00:00, 00:01 Queensland, separately from the 04:00 unlock | Test before ready |
| 4. Shared tablet: the next cook taps Got it while the first is still signed in | Only the signed-in person's mark | The wrong person's mark | First cook never sees it; a false receipt | Risk | Per-person key `lk.fn.hu.<staffId>`, as pings; receipt `by` from the session, never the screen | Test with two people |
| 5. A busy week, 5 functions | Everyone told once | 5 Got its in a row on the first open | Annoyance, reflex taps | Risk | From 3 in a week, one combined week card with one Got it (to design if chosen) | Open |
| 6. The function manager fixes a typo 4 times | One return | Card returns 4 times | Noise | Risk | Only `changes()` kitchen words count; at most one return per Home visit, changes added together | Rule in place |
| 7. A cook never opens Home (shared screen with a waiting tap) | Still told | Only the bell's dot | Missed until the day before | Risk | Bell dot on every page; Tomorrow heads-up; band | Accept |

Previews exercised: Got it to the next card, Undo, last Got it, the bell sheet, Who has seen it (synthetic). Not exercised: real listener updates, offline, midnight, shared-device marks, receipts, rules.

## Needs the head chef's OK (service rules)

- **The card above Your day** on Home changes the approved staff-first order. It is not a pop-up and not a new button, and it is gone after Got it, but it moves the person's own day down 353 px until then. Alternative if not: the card under Your day.
- **The bell's dot** would also mean "a function heads-up not seen yet", on every page, and its sheet gains a Function heads-up part. Not a new top bar button, but a change to what an existing one says. The heads-up never opens the sheet by itself.
- **Receipts (phase 2):** recording who tapped Got it is a new kind of record about people. Ping receipts already exist; this extends them to functions.
- **No pop-up, nothing over a list, no new tab or button, no change to how Prep, Orders or service tasks are done.** Taps added: one Got it per function per person per stage, worth it because it replaces a permanent line and is the acknowledgement the head chef asked for.

## Files

- `home.html` (Ann, 390), `prep.html` and `orders.html` (Ann, 390, bell dot; tap the bell), `home-head-1280.html` (Bo, Who has seen it open), `runup.html` (24 framed phones: every run-up day and every added state).
- `states/*.html`: the frames on their own. `src/c.css`, `src/c.js`: the preview's styles and taps, inlined by `build.cjs`.
- `build.cjs` builds every page from `../baseline/*.html`. `capture.cjs` builds, serves the repo on 127.0.0.1:8793, saves `shots/` and writes `measurements.json`. Run: `cd docs/function-ahead-options/design-c && node capture.cjs`.
