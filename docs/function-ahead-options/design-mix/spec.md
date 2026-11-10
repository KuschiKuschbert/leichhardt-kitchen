# The recommended mix: tell each person once on Home, keep one quiet line on the work pages

Functions ahead of time council, round 2, 10 November 2026.

**Review status: lead synthesis, focused review pending.** The parts come from the six reviewers' own take lists in [`../council-round-2-scores.json`](../council-round-2-scores.json). The exact combination, and the decisions it needed (two functions in a week, the fixed-height words, the tablet layout), are the lead designer's. No reviewer has scored this combined preview yet. Designs A, B and C and their rankings stay as they are beside it.

**Design preview only.** No app file changed. Every number here is **Preview** unless it says otherwise: static pages built from the implemented-app snapshots in [`../baseline/`](../baseline/) (main `184174e`, scripts removed, the real `css/app.css`), synthetic data, bundled Barlow, Barlow Condensed and Caveat fonts, Chromium headless shell 1243, deviceScaleFactor 1, viewports 390 x 844, 768 x 1024 and 1280 x 900. The baseline snapshots were measured with the same script, so before and after use one method. Raw numbers: [`measurements.json`](measurements.json). Screenshots: [`shots/`](shots/). Run-up sheet: [`runup.html`](runup.html), [`shots/runup-full.png`](shots/runup-full.png).

Synthetic data: today is Tue 10 Nov 2026, 14:00 Queensland. Ann (staff), Bo (head chef), Dev (staff), Gus (function manager), other made-up first names. Smith 60th, Thu 12 Nov, Function room, 60 guests, event 18:00, food 18:30 and 19:15, 5 Antipasto and 5 Pizza, "4 gluten free, 1 nut allergy". Jones wedding, Sat 14 Nov, Beer garden, 90 guests, event 17:00, food 18:00, 6 Antipasto. Both ordered on Sun 8 Nov (the order day rule in `js/functions.js`). One extra state: Lee engagement, Fri 13 Nov, 40 guests, booked at 14:05.

## The mix in one sentence

Each person gets C's Function heads-up card once on Home, directly under Your day, and Got it collapses it in place to A's quiet Next function line; the work pages show A's line in the band's slot only on days the band would be empty, with its height fixed when the page opens (B's open-only rule); Orders gets B's Not ordered yet tag inside the existing function stock line; `#/fn` looks 7 days ahead and the sheet shows guests on its first line (A).

## Files

| File | What it is |
| --- | --- |
| [`home.html`](home.html) | Ann, staff, 390: Your day, then the heads-up card (Smith 60th, 1 of 2 this week). Got it and Undo work. |
| [`home-after.html`](home-after.html) | Ann just after Got it on Smith 60th: the line in the card's place, the slip with Undo, and the Jones wedding card (2 of 2) under it. |
| [`prep.html`](prep.html), [`orders.html`](orders.html) | Ann, 390: the Next function line in the band's slot (tap, +1 more this week, the minus with slip and Undo). Orders shows the unticked Jones wedding stock line with Not ordered yet. `window.fmaSim('booking' / 'nosignal' / 'midnight' / 'cancelled')` changes the data while the page is open. |
| [`home-head-1280.html`](home-head-1280.html) | Bo, head chef, 1280: the card in the left column under Your day. |
| [`fn-week.html`](fn-week.html) | `#/fn`, Upcoming at 7 days, where +1 more this week goes. |
| [`runup.html`](runup.html), `states/*.html` | 28 framed phones: every run-up day and every added state. |
| `src/mix.css`, `src/mix.js` | The preview's styles and taps, inlined into every page by `build.cjs`. Existing tokens only. |
| `build.cjs`, `capture.cjs` | Build from `../baseline/`; serve the repo on 127.0.0.1:8794, screenshot, measure. Run: `cd docs/function-ahead-options/design-mix && node capture.cjs`. |

## What is taken, what is left out

| Source design and part | Take or reject | Reason | App principle | Kitchen benefit | Conflict or extra cost | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| **C** Function heads-up card: day, event and food times, guests, platters, dietaries, place, one Got it | **Take**, under Your day (C's own repair) | The only piece that puts every fact in front of each person at 0 taps | Airbnb: time, place, needs and next action together | A cook knows Thursday's platters and dietaries on her first PIN of the day | Until Got it, On with you drops below the first screen at 390 (0 of 5 coworker rows). One Got it per function per person per stage | `shots/home-390.png`: name at 437 px, all five facts above the tab bar (`taps.homeNotSeen`) |
| **C** Got it with Undo, kept per person on the phone (`lk.fn.hu.<staffId>`) | **Take** | Attention once, then out of the way. No write, no rule | Duolingo: the tap answers at once, by name, with Undo | Nothing new to learn: the pings already use Got it | Per phone: a cook with her own phone and the tablet sees it on each | `gotIt` in `measurements.json`: Undo brings the card back and puts focus on Got it |
| **C** short Tomorrow heads-up, the day before, once for everyone | **Take** | The safety net for a reflex Got it | Flighty: what matters next, with real times | Tomorrow's facts on Home even for someone who skipped the first card | One more Got it per function | `states/d1-home.html`: 228 px card, name at 422 px |
| **C** Changed and Cancelled come back once, only to people who were told | **Take** | A function that moves or is cancelled after Got it reaches exactly the people who knew it | Flighty: real status, no polling | No one preps for a dead or changed function from memory | One Got it per change. Plain `.btn` on the red card (C's orange-on-red clash repaired) | `states/s-changed-home.html`, `states/s-cancelled-home.html` |
| **C** Booked inside the week: card at the next Home open, tagged Booked today | **Take** | A short-notice booking is the case most likely to be missed | Flighty | The cook learns of Friday's function on Tuesday afternoon | None beyond the card | `states/s-booking-home.html` |
| **C** card above Your day | **Reject** | Staff-first Home: the person's own day comes first | Things 3: today before upcoming | Your day stays at 169 px, as today | | C measured Your day at 522 px; the mix keeps 169 px |
| **C** bell dot and its sheet rows | **Reject** | Changes what an existing top bar button means; the pings sheet's Got it puts every row away together | Headspace, Linear: one name, one meaning | Pings keep their meaning | The line on the work pages does the bell dot's job | Keeper and skeptic source reads of `noteClose()` |
| **C** receipts (Who has seen it) | **Reject** for now | New write, looser rules, backups and the PIN move must copy them | Duolingo: a tap is not reading | No rules change | The head chef cannot see who tapped Got it | Not built |
| **A** Next function line in the band's slot, only when the band would be empty | **Take** | The only piece that reaches every work page, which is what the head chef asked | Linear: one name, one place, the same tap to the same sheet | On a Tuesday, Prep says a function is coming | One Prep row at 390 on band-empty days (6 to 5) | `prep-390`: 50 px added, 5 rows above Add a line |
| **A** the same line on Home, in the card's place after Got it | **Take** | After Got it the function never falls back to Coming up near the bottom of Home | Linear | The function stays on the first screen all week | On with you 71 px lower than today after Got it | `home-settled-390`: name at 413 px, On with you at 460 px, 5 of 5 coworker rows |
| **A** the minus, the slip and Undo | **Take**, with a 44 px target and its own words | Gives the row back for the day | Duolingo, Headspace: words on the result | A cook can clear the line mid-service | A second way to put something away (break-it 3) | `minus`: 6 rows after, Undo puts focus back on the minus |
| **A** `#/fn` Upcoming 7 days, guests on the sheet's first line | **Take** | Saturday was hidden behind 3 days | Airbnb | Saturday's card is one tap from Prep | | `fn-week.html`: Jones card at 833 px; `prep-390-sheet.png` |
| **A** "+1 more" | **Take, renamed "+1 more this week" at every width** | New starter: say more of what. Keeper: the band's own "+N more" opens in place, so use different words | Headspace | | Fits at 390 with 6 px to spare (Preview fonts) | `shots/prep-390.png` |
| **A** line on Home "Today 18:30" on the day | **Reject** | Now and next already shows the round; the line moves on to the next function | Linear: nothing twice | | | `states/d0-home.html` |
| **B** open-only rule: whether the line shows and its height are fixed when the page opens | **Take**, for the slot the line holds | Closes A's main technical risk: a row moving under a finger | Linear: the work frame stays still | A booking, lost signal or midnight never shifts a tick | Later data shows as words in the slot; the full band waits for the next open | `openOnly`: 0 px move in 16 checks; the reopened band is 113 px, so the rows would have dropped 63 px |
| **B** Orders tag inside the existing function stock line: Order today, then Not ordered yet · For Sat 14 Nov · order day was Sun 8 Nov | **Take**, ink words | The most costly failure is missed stock | Flighty: real status from data already held | Staff see the stock is still to order, and tell a chef | The stock line's meta wraps to a second line instead of cutting "order day was" | `shots/orders-390.png`; tag 13.48:1 |
| **B** week strip, band lines removed, This week and Prep ahead inside the list | **Reject** | A strip above Your day, Order and Tomorrow lines gone from Wastage, Transfers and Recipes, things that move inside the live list | Things 3, Linear | | | Not built |

**Why not all of A, B and C in full:** Home would show one function three times (strip, card, line), B's empty band fights A's line, and C's bell dot repeats A's line. Every reviewer said the full blend loses.

## Two functions in one week: C's handling

One card at a time, nearest first, in the slot under Your day. The first card says "1 of 2 this week" and "Also this week: SAT 14 NOV Jones wedding", so Saturday is named at 0 taps. Got it collapses that card in place to the line and opens the next card (2 of 2) under it. After the last Got it, the slot is one line: the nearest function and "+1 more this week".

Chosen over one card per function stacked because two full cards stacked would be about 650 px at 390 and push On with you off the screen before the person has read either. Measured (Preview, 390):

| State | Slot under Your day | First "Smith 60th" | On with you top | Coworker rows on the first screen |
| --- | --- | --- | --- | --- |
| Neither seen | Smith card, 331 px | 437 px | 737 px | 0 of 5 (its heading shows) |
| After Got it on Smith 60th | line 54 px at 389 (the card's own top) + Jones card 302 px | 413 px | 780 px | 0 of 5 |
| After Got it on both | line 54 px | 413 px | 460 px | 5 of 5 |

## What shows on which page on each run-up day

Smith 60th, Thu 12 Nov, order day Sun 8 Nov; Jones wedding, Sat 14 Nov, in the same week. "Not seen" means this person has not tapped Got it on this heads-up yet. Changes from today in bold.

| Day | Home | Prep, Wastage, Transfers, Recipes (the band's slot) | Orders | `#/fn` |
| --- | --- | --- | --- | --- |
| 8 or more days before | As today | As today | As today | As today |
| 7 to 5 days before (Sat 7) | **Not seen: the card under Your day (1 of 2). After Got it: the Next function line in its place** | **Next function line, 50 px** | **The same line** | **Upcoming, 7 days** |
| Order day (Sun 8) | **Card or line**; Now and next's order rows, as today | The band's Order today lines, as today (171 px); the line steps aside | Band as today; **the stock lines carry Order today (ink words)** | 7 days |
| 3 and 2 days before (Mon 9, Tue 10) | **Card or line** | **Next function line** | **Line; an unticked stock line says Not ordered yet · For Sat 14 Nov · order day was Sun 8 Nov** | 7 days |
| Day before (Wed 11) | **C's short Tomorrow heads-up, once for everyone; after Got it the line says Tomorrow** | The band's Tomorrow line, as today (113 px) | Band as today | 7 days |
| The day (Thu 12) | No card. Now and next shows the round, as today; **the line moves on to Sat 14 Nov Jones wedding** | The band's rounds, as today (116 px) | Band as today | As today |
| Changed after Got it | **The card once more, tagged Changed 11:20, with the change words** | Line words update in place | | |
| Cancelled after Got it | **A red card once, only for people who were told** | **Cancelled · Thu 12 Nov · Smith 60th · Do not prep, same height**, for the rest of that kitchen day | Existing "Function cancelled, check the order" line | |
| Booked inside the week | **The card at the next Home open, tagged Booked today** | **If the line held the slot at open: Order today · Fri 13 Nov · Stock: Lee engagement, same height; the full band at the next open** | Function stock line, as today | |
| After the day | Gone | Gone | Gone | Gone |

Every work page's band days (order day, day before, the day) are drawn exactly as today. The line only fills the slot when the band would draw nothing.

## The Tuesday walkthrough: a cook learns of Thursday's and Saturday's functions

1. **09:50, Ann's first PIN of the day opens Home** (as today since #659). Her greeting, then Your day (Hot larder, break) at 169 px, exactly as today. Directly under it: **Function heads-up, 1 of 2 this week: THU 12 NOV · IN 2 DAYS, Smith 60th**, Function room · 60 guests · event 18:00; Food out 18:30 and 19:15 (2 rounds); Platters 5 Antipasto, 5 Pizza (10); Dietaries 4 gluten free, 1 nut allergy. "Also this week: SAT 14 NOV Jones wedding". **0 taps.** The foot says "Got it is just for you, until the day before."
2. **Got it (1 tap).** The card becomes the Next function line in the same place (its top stays at 389 px). The slip says **"Got it. Smith 60th stays as one line on Home."** with Undo. The Jones wedding card (2 of 2) opens under the line: Beer garden, 90 guests, event 17:00, food 18:00, 6 Antipasto, dietaries none entered.
3. **Got it again (1 tap).** "Got it. Jones wedding stays on Home as +1 more this week." Home is now Your day, one quiet line (NEXT FUNCTION · THU 12 NOV, Smith 60th · 60 guests, +1 more this week), then On with you with all 5 coworker rows on the first screen.
4. **Prep.** The same line sits in the band's slot under the top bar, quiet reference paper. 5 complete prep rows above Add a line instead of 6. One tap on the line opens the function sheet with time, guests, platters and dietaries on screen. "+1 more this week" opens Functions, the next 7 days, with the Jones wedding card at 833 px. If she wants the row back, the minus hides the line on this phone until tomorrow: "Hidden on this phone until tomorrow. Home still shows it." with Undo.
5. **14:05, Lee engagement is booked for Friday on Gus's phone while Ann ticks prep.** The slot keeps its 50 px. Its words become "ORDER TODAY · FRI 13 NOV / Stock: Lee engagement". Her next tick lands on the row she aimed at. The full band shows the next time she opens Prep; Home shows a Booked today card at the next open.
6. **Orders.** The Jones wedding stock line, still unticked, says **Not ordered yet** and "For Sat 14 Nov · order day was Sun 8 Nov". Staff cannot tick it; she tells Bo.
7. **Wednesday.** Home shows the short Tomorrow heads-up for Smith 60th once; the work pages show the band's Tomorrow line, as today. **Thursday:** the band, Now and next and the platter prep lines take over; Home's line names Saturday's wedding. **Friday:** the Tomorrow heads-up for the wedding.

Nothing reaches a person who opens neither Home nor a work page: no ping, no push, as today.

## Measured (Preview, 390 x 844 unless stated)

| Measure | Baseline (same snapshots, same script) | A | Mix |
| --- | --- | --- | --- |
| Home: first "Smith 60th" | 998 px, not on the first screen (tab bar top 776 px) | 413 px | **437 px on the card** until Got it; **413 px on the line** after, on the first screen either way |
| Home: Your day top | 169 px | 169 px | **169 px** (C above Your day: 522 px) |
| Home: On with you top | 389 px | 460 px | 737 px until Got it, 780 px between two Got its, **460 px after** |
| Home: coworker rows on the first screen | 5 of 5 | 5 of 5 | **0 of 5** until Got it (its heading shows), **5 of 5** after |
| Home: page height | 1319 px | 1358 px | 1635 px until Got it, 1358 px after |
| Home 768 x 1024: first "Smith 60th" | 884 px | 548 px | 705 px card (full width under Your day and On with you, facts side by side), 681 px line; 5 of 5 coworker rows either way |
| Home 1280 x 900, Ann / Bo | 786 / 801 px | 518 px (Bo) | 542 px card in the left column, 518 px line; On with you unchanged at 251 px, 5 of 5 |
| Prep: added above the list / complete rows above Add a line | 0 px / 6 | 50 px / 5 | **50 px / 5** (6 after the minus) |
| Orders: added above the list / rows | 0 px / 2 of 2 (no stock line in the snapshot) | 50 px / 2 of 2 | 50 px / **3 of 3** with the Jones stock line and its wrapped tag words |
| Prep, order day / day before / the day | 171 / 113 / 116 px; 3 / 4 / 4 rows | unchanged | unchanged |
| Prep: first row top, at open and after a booking, lost signal, midnight or a cancellation while open | not applicable | moves (A redraws the band live) | **313 px and 313 px** in all four, at 390, 768 and 1280, and on Orders at 390 (16 checks, 0 px) |
| Same booking, page opened again (what a live redraw would do mid-view) | | +63 px | 0 px mid-view; +63 px only on the next open |
| Sideways scroll | 0 | 0 | **0** on all 6 pages, 28 frames and the run-up sheet at 390, 768 and 1280 (105 checks) |

### Taps to see time, guests, platters and dietaries

| From | Baseline | A | Mix |
| --- | --- | --- | --- |
| Home | 1 tap after a scroll of about 360 px | 1 | **0** until Got it (all four and the place above the tab bar, measured); **1** after (tap the line, all four on the sheet, measured) |
| Prep | 2 taps and a scroll (chef hat, Functions) | 1 | **1** (tap the line, all four on the sheet, measured) |
| Saturday's function | 3 taps from Prep | 1 and a short scroll | Home: name and day at 0, facts at the Got it that opens its card. Prep: 1 tap, "+1 more this week", Jones card at 833 px |
| Taps the mix adds | | 0 | One Got it per function per person per stage: in this week, 4 for Ann (two week cards, two Tomorrow cards), plus one per change or cancellation |
| Main tasks (add a line, tick a line, add a request) | 1 | 1 | 1 (unchanged) |

### Text contrast of the new pieces (rendered, light mode, Preview)

Lowest first: line date and "No signal · updated 13:52" 4.86:1 (12.8 px, bold, `--small-ink` on reference paper); Got it white on orange 5.05:1; card headings and day 5.27:1; line label 6.21:1; Cancelled tag and red card words 6.64:1; card labels, place and foot 6.73:1; line words 9.91:1; Orders "Not ordered yet" ink on its tint 13.48:1 (the shared tag with `--accent-ink` words is 4.04:1, B's finding); Tomorrow tag 14.78:1; names and facts 14.69 to 15.9:1; slip 16.72:1. Control edges: Got it against the card 4.76:1, "+1 more this week" and the minus 14.69:1. The quiet strip is 1.1:1 against the work page, so its edge is the 1.5 px ink rule, as in A.

## Contract fit

| Check | Verdict | Evidence |
| --- | --- | --- |
| Surface purpose | **Works** | Card: quiet paper with the work steel edge (C, as `.fn-row`). Line: quiet reference paper (A). Upcoming is never charcoal (live) and never amber. Band days keep the charcoal band. Orders keeps its steel book. `src/mix.css` uses `:root` tokens only. |
| State meaning | **Works** | Orange only on the one action (Got it, `.btn.dark`) and small headings (`--small-ink`). Attention tint only on a named need: Order today, Not ordered yet. Cancelled uses the failure family with the word and a strike; its Got it is the plain `.btn` (C's clash repaired). Changed and Booked today reuse the function New tag. Got it answers in neutral words, never a green Saved: nothing is saved to the server. |
| Words and exceptions | **Works**, one word open | Every state has words: Function heads-up, 1 of 2 this week, in 2 days, Got it, Next function, +1 more this week, Tomorrow, Changed 11:20, Cancelled, Do not prep, Booked today, Order today, Not ordered yet, No signal · updated 13:52, Hidden on this phone until tomorrow. Function New/Moved tags kept. The new starter flagged "heads-up" as slang: keep it, or "Function this week" (head chef's call, test with a new starter). |
| Real contrast | **Works** for text and control edges; **Not evidenced** for focus, dark and large text | All text 4.5:1 or more (above). Focus moves are exercised (Got it to the line, Undo back to Got it, Undo back to the minus) but the rings are not captured. Dark variants, large and extra-large text and 360 px were not checked. |
| Relevant states | **Works** in the preview; gaps **Not evidenced** | Drawn and measured: not seen, after one and both Got its, Undo, Tomorrow, the day, order day, two functions, booked inside the week, changed, cancelled on Home and Prep, no signal at the fixed height, midnight at the fixed height, booking while open, the minus with slip and Undo, the shared tablet handover, head chef at 1280. **Not evidenced:** loading before the first functions read (no card, no line, never "no functions"), failed read with no copy, Rescheduled (specified as A's line words, not drawn), signed out and Functions-only (gated like the band), the head chef's cut-off bar with the line (A: 118 px, 4 rows), the person who saved the function (starts with the line, not the card). |
| Service continuity | **Needs work** (head chef's call) | Prep 6 to 5 rows at 390 on band-empty days (as A); 6 after the minus. Lists never move from data changes while open (0 px, 16 checks). Main tasks unchanged at 1 tap. Home: Your day stays first, but until Got it On with you is below the first screen at 390 (0 of 5 rows). |
| Staff-first Home (`docs/home-staff-first.md`) | **Needs work / head chef decision** | Your day first, as the contract asks. The card sits between Your day and On with you until Got it; after Got it, a 54 px line there (On with you +71 px, as A). From 720 to 1099 px the slot goes full width under Your day and On with you, which keeps the personal and team group first. |
| Design patterns, action feedback, loading and motion | **Works** in the preview, **Not evidenced** in the app | Reuses `.hm-paper`, `.hm-ph`, `.btn.dark`, the function band and sheet, the round minus, the book's slip (`.p-toasts`, `toast()`) with Undo. Got it and the minus answer where the person looks, name what happened, and offer Undo. No motion added. New pattern names would go in `docs/design-patterns.md` and `tests/design-patterns.test.js`. |
| Reads, writes, rules, listeners | **Works** | None new. The functions listener every phone holds (`kq` from 00:00, limit 150) has every upcoming confirmed function; Orders reads `od` from it for the tag. One new saved copy, `lk.fn.hu.<staffId>` (out of date once the function's day is past); the minus reuses `lk.fn.fold`. |

## Design references

| Principle | A | B | C | Mix | Why |
| --- | --- | --- | --- | --- | --- |
| Linear | Works | Needs work | Works | **Works** | One name per piece, the same line and sheet on every page, nothing new in the top bar. The two put-away controls never share a page. |
| Things 3 | Works | Works | Needs work | **Works** | Today's charcoal band and upcoming quiet paper look different; the card comes after Your day, not before it. |
| Airbnb | Needs work | Works | Works | **Works** | All facts together at 0 taps on the card; 1 tap from the line. |
| Todoist | Not relevant | Not relevant | Not relevant | **Not relevant** | Nothing is added or typed. |
| Flighty | Works | Works | Works | **Works** | Real dates from data already held, no polling; no signal and the change time in words, in place. |
| Duolingo | Works | Works | Works, with a limit | **Works, with a limit** | Got it and the minus answer at once, by name, with Undo; no receipts, so nothing claims "seen". A tap is still not reading. |
| Headspace | Works | Works; new words Not evidenced | Works | **Needs work** | Calm words, but two ways to put it away to learn, and "heads-up" is untested with staff for whom English is a second language. |

## Break it

| Scenario, role and state | Expected | Observed or hypothesis | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| 1. **Reflex Got it.** Staff, first PIN, taps Got it to reach the team without reading | They can still find the function | The card collapses in place to the line with the name and day; the line is 1 tap from the sheet; the Tomorrow heads-up comes back once; the band on the day before and the day | **Checked in the mix preview** (`gotIt.collapsedInPlace`: the line's top 389 px equals the card's; Undo restores). Reading itself not evidenced | None needed for finding it again; no receipts, so the head chef cannot tell who read it | Accept |
| 2. **Shared tablet handover.** Ann taps Got it, locks; Dev types his PIN | Dev gets his own card; Ann's mark is not his | Got it is keyed per staff id (`lk.fn.hu.<staffId>`), so Dev sees the card (1 of 2). The work-page line belongs to the tablet, so a handover never changes Prep's height | Dev's Home **checked in the mix preview** (`states/s-handover-dev.html`, card at 389 px). The keying itself **Risk / Not evidenced** (a static page cannot run identity) | Click test in `tests/fake/` with two staff on one device, Got it by the first, card for the second | Test before ready |
| 3. **Two dismiss verbs.** A new starter confuses Got it and the minus | Each does what its words say | Never on the same page. Got it (Home): "Got it is just for you, until the day before"; spoken "Got it: Smith 60th. Just for you, until the day before. It stays on Home as one line." Minus (work pages): spoken "Hide this line on this phone until tomorrow. Home still shows it."; slip says the same. The minus on a shared tablet hides the line for whoever is signed in next that day | Words and labels **checked in the mix preview** (`minus.spokenLabel`, `gotIt` slip words). Understanding **Risk / Not evidenced** | New-starter walk-through of both. Option for the head chef: the line's minus comes back when a different person signs in on a shared device | Test with a new starter |
| 4. **A list moving under a finger.** Staff on Prep at 390 mid-service; a booking is confirmed elsewhere, the signal drops, midnight passes, or the function is cancelled | Rows stay put | The slot keeps the height it had at open; only its words change, and every state's words fit the same two rows | **Checked in the mix preview:** first row 313 px before and after in all 4 changes at 390, 768 and 1280 and on Orders (16 checks, 0 px); words 49 px in a 50 px slot. Without the rule the reopened band is 113 px: +63 px | Click test like the header-height rule: confirm a booking, toggle offline and cross midnight with Prep open, check the first row's top. Remeasure the 1 px spare with the app's stand-in fonts and large text | Test before ready. Existing gap: when the slot was empty at open, the band's own short-notice Order today line still appears live, as today (extend the rule to the whole slot: head chef's call) |
| 5. **Midnight.** Prep left open Tue 23:59 to Wed 00:01; Home open at 00:00 | The line becomes the Tomorrow words once, never both or neither | One slot, one paint: the words say Tomorrow · Thu 12 Nov · Smith 60th · food 18:30 at the same height; the full Tomorrow band at the next open. Got it stores the stage it showed, so a tap at 00:00 on the week card does not silence the Tomorrow heads-up | Words and height **checked in the mix preview** (`states/s-midnight-after.html`). The clock repaint **Risk / Not evidenced** | Stand-in clock test at 23:59:30 and 00:00:30 Queensland, separate from the 04:00 unlock | Test before ready |
| 6. **Cancelled while offline.** A function is cancelled on Gus's phone while Ann's has no signal | No one preps for it | Ann's phone cannot know until it hears the listener. The slot says "No signal · updated 13:52" at the same height; when the signal returns the words become "Cancelled · Do not prep" in place, and Home shows the red card once to people who were told. Weak Wi-Fi that looks online shows no stale words, as today's band | No-signal and cancelled words **checked in the mix preview**. The listener path **Risk / Not evidenced** | Stand-in test: offline, cancel, online; the line and card clear | Test before ready |
| 7. Busy week, 5 or more functions | Everyone told once | 5 Got its in a row on the first open | **Risk** | From 3 in a week, one combined week card with one Got it (to design if chosen) | Open |
| 8. Wrong role: signed out, Functions only | No card, no line | Gated by `privateAccess()`, as the band | **Not evidenced** | `tests/roles.test.js` rows per page | Test before ready |

## Disagreement kept visible

- **Skeptic and keeper** recommended A without C's card (skeptic: A in two pull requests; keeper: A plus B's open-only rule and B's tag). Their case: Got it adds taps and per-person state for something A's line already says, and still proves nothing about reading. This mix keeps their repairs (open-only, fixed-height no-signal words, the tag, no receipts, no bell dot) and adds C's card against their advice.
- **The cook mid-service** wanted the work-page line only until that person taps Got it. The mix shows it to everyone on band-empty days (the head chef's and designer's version), so a handover can never change Prep's height. Cost: one Prep row on those days for people who already know; the minus gives it back.
- **The head chef** wanted B's tag later, in its own pull request: it is the last pull request below.

## Needs the head chef's OK

1. **Home:** the heads-up card between Your day and On with you until Got it (On with you below the first screen at 390 until then; 5 of 5 rows after). A departure from staff-first order for one card per function per person.
2. **Work pages:** the Next function line on band-empty days, one Prep row at 390 (6 to 5); the minus gives it back for the day.
3. **The open-only rule:** the slot keeps its height until the page is opened again. A short-notice booking that arrives mid-view shows as words in the slot and as the full band on the next open. Optionally extend the rule to the band's own lines.
4. **Taps:** one Got it per function per person per stage (week, day before), plus one per change or cancellation.
5. **`#/fn`** Upcoming 3 to 7 days; **guests** on the sheet's first line.
6. **Orders:** Order today and Not ordered yet in the stock line, in ink words; the stock line's meta wraps instead of cutting.
7. The card's name: "Function heads-up" or plainer words.
8. No receipts, no bell dot, no new tab, top bar button or pop-up. Nothing over a list.

## Build plan: small pull requests, in order

1. **`#/fn` 7 days and guests on the sheet** (`js/functions.js` `pageDays`, `sheetHTML()`; functions tests). No layout risk; fixes Saturday being hidden.
2. **Home heads-up card and Got it** (`js/functions.js` card and line helpers, `js/prep.js` `homeSlot()` placing them under Your day, `css/app.css`). Got it in `lk.fn.hu.<staffId>` with a comment on what makes it out of date (the day passed, a kitchen change from `changes()`); the slip through `toast()` with Undo; Tomorrow, Changed, Cancelled and Booked today; the saver starts with the line. Tests: Home order at 390, 768 and 1280, Got it and Undo, two functions, two staff on one device, roles, `tests/safe-text.test.js` for the name in the card and line, `tests/read-budget.test.js` unchanged. Pattern names in `docs/design-patterns.md` and `tests/design-patterns.test.js` (classes named apart from the sheet's `.fn-next`).
3. **The work-page line with the open-only lock** (`bandHTML()` returns the line only when it would otherwise return nothing; `paint()` keeps the slot's height while the route is open; the fixed-height words for no signal, booking, midnight, cancelled and rescheduled; the minus with `lk.fn.fold`, slip and Undo). Tests first, per the skeptic: the header-height click test with a booking, offline and the 23:59:30 / 00:00:30 clock while Prep is open; fold tests; roles; no sideways scroll.
4. **The Orders tag** (the order row render reads `od` from the functions already held; ink words; meta wraps). Orders tests and safe text. The shared tag's 4.04:1 elsewhere is an existing issue for its own fix.

Then remeasure the implemented app at 390, 768 and 1280 with the real shell, stand-in fonts, the mascot, the head chef's cut-off bar and large text, record any difference from this preview, and add the decision to `docs/head-chef-decisions.md` and `README.md`.
