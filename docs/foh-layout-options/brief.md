# Front of house layouts: the council's round 2 (26 November 2026)

The study: [proposal](proposal.md), [evidence packet](packet.md), today's [pictures and numbers](today/). Round 1 is the step 3 review and the head chef's choice to study these two layouts ([findings](../device-coverage/step3/findings.md), Chosen). Everything here is **role-based analysis on the click-test stand-in with synthetic data**, not research with staff.

## Design frame (the UX and interaction designer, before anything was drawn)

Recorded as written (one fresh agent; it read the proposal, the packet, the contracts, the design misses and the pictures):

> Implemented app, stand-in, synthetic data, role-based.
>
> **1. Visible, no tap (Fay at 1920).** Form: the band's Confirm out, name, date, start, guests, Platters, round times, Placed of booked, Save bar and summary. Band to dock leaves 540 px; at 1536 and 1280, 375 (Seen). The band stays open (chosen; Not now): height binds. Service view: every waiting trip whole, every round with countdown and dietaries. 390: as today, the first trip whole.
>
> **2. Loud.** Service view: Confirm out, white, 48 px; missed, the trip waits for a chef after 10 min. Form: nothing new earns it; quiet paper.
>
> **3. Devices.** Phone, tablet 768: as today. 1920, 1536: platters beside facts, rounds beside trips. Laptop 1280, for bookings (18 Nov): 1100 or 1150 changes it, about 1500 spares it. Save stays docked, Confirm out on its trip.
>
> **4. Placements** (order kept: The function first, as Delivery received; shelf first).
> - Platters with When they go out (one grid): a) inline, below the fold everywhere; b) beside from 1150 (recipe editor), sideways scroll at 12 kinds by 8 rounds, OK; c) The function's boxes in one row from 1150, Platters rises, still cut at 1536, OK. The 264 px time list needs room above the dock.
> - Notes and comment: a) foot; b) left under The function, order changes, OK. Never fold notes.
> - Save bar: docked, full width only; a rail moves Save.
> - Shelf and rounds: a) shelf first, full width, rounds off screen; b) shelf left from 1100 (kitchen's grid), rounds right, OK (22 Nov); c) the kitchen's shape, shelf right, rounds read first, OK. Fay's rounds are read-only, shorter.
> - Dietaries and Confirm out: a) each trip; b) once per function, trips grouped, wrong-trip risk, OK (26 Nov).
> - Out today: under trips or top line.
> - Empty shelf (most of a shift): keep the column, or collapse and rounds jump.
>
> **5. Fiftieth use.** Stacked, each Confirm out lifts the rounds 220 px; a second tap hits the next trip (Risk). Not evidenced: Fay's usual fields, touch, nested scrolling, a third Confirm out in a narrow column.

The lead's note: the frame's band and dock figures were read off the pictures. Measured (`today/study.json`): the Save bar's top is at 940 px at 1920, 738 at 1536 and 732 at 1280.

## Three designs

Each is CSS laid over the implemented app on the click-test stand-in ([`study.cjs`](study.cjs), [`designs/`](designs/)): the page's own pieces, moved with the grid, never reordered in the page, so a redraw (every 20 seconds on the service view, after every tap) keeps the look. Pictures of what shows without scrolling, plus whole pages (`*-whole.png`; the docked Save bar shows mid-page there because it is sticky), in [`today/`](today/) and `previews/a/`, `previews/b/`, `previews/c/`. A build would put the same pieces in two wrappers in the HTML strings; the order a screen reader and the keyboard follow stays as it is in every design. No new reads, writes, listeners, rules, sheets, pop-ups or buttons in any of them. Phones and the tablet are pixel for pixel as today in all three, and so is the kitchen's own service view.

| | A: Wider boxes, trips across | B: Two columns | C: Bands across the width |
| --- | --- | --- | --- |
| Central idea | Change the least: one column stays; the room makes boxes and trips wider, on the front of house screen only | The head chef's candidate: the booking's facts on the left, what goes out on the right; the shelf beside the rounds | Read across: each part of the booking is a band of two; each trip is one row |
| Form: from | 1500 px (the front of house screen and 125 %); the laptop as today | 1150 px (the recipe editor's panel), the laptop too | 1150 px, the laptop too |
| Form: layout | The function's boxes four across (Name, Date, Event start, Guests; then Room), When the platters go out's four boxes across; the rest as today, in one column | Left: The function, then Service and dietary notes, then Kitchen comment. Right: Platters, then When the platters go out with the round grid | The function's boxes four across; then Platters beside When the platters go out; then the notes beside the kitchen comment |
| Service view: from | 1100 px | 1100 px | 1100 px |
| Service view: layout | The shelf first and full width; the waiting trips side by side as cards (each with what went, sent and Waiting, dietaries, Confirm out at its foot); the rounds under the shelf | The shelf on the left, first; the rounds on the right (the kitchen's grid mirrored). With nothing waiting there is no shelf and the rounds take the width | The shelf first and full width; each trip one row: which trip and function, what went, sent and Waiting, Confirm out at the row's end, the dietaries across under it; the rounds under the shelf |
| Departs from a decision | None | 22 Nov 2026 ("Keep the coordinator's confirmation queue first"): the shelf stays first in reading order but is no longer above the rounds; a new layout | 14 Nov 2026 (the platters lead each trip, large): what went is in the middle of the row, still large; a new layout |
| Build | One pull request, CSS only | One pull request: wrappers in `js/fnedit.js` and CSS | One pull request, CSS only |

### Differences that are structural

| | A | B | C |
| --- | --- | --- | --- |
| Form | One column, wider rows | Two columns of whole sections | Rows of paired sections |
| What sits beside the platters | Nothing (they follow the facts) | The booking's facts | The round grid |
| The laptop | Unchanged | Changed | Changed |
| Waiting trips | Cards across | A column beside the rounds | One row each |
| The rounds | Under the shelf | Beside the shelf | Under the shelf |

### The numbers (Implemented app with each design's CSS, stand-in, synthetic data, Fay; the day at 14:00 with three trips waiting unless said)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Form 1920: fields in view above the Save bar (of 27); screens tall | 7; 2.56 | 7; 2.35 | 9; 1.80 | 7; 1.99 |
| Form 1536: fields in view above the Save bar (of 27); screens tall | 3; 3.15 | 6; 2.90 | 5; 2.21 | 6; 2.45 |
| Form 1280: fields in view above the Save bar (of 27); screens tall | 3; 3.18 | 3; 3.18 | 5; 2.23 | 6; 2.46 |
| Form 1920: guests, platter rows, round times, Placed of booked in view | yes, 0 of 2, 0 of 3, no | yes, 0 of 2, 0 of 3, no | yes, 2 of 2, 0 of 3, no | yes, 0 of 2, 0 of 3, no |
| Form 1536: guests, platter rows, round times, Placed of booked in view | no, 0 of 2, 0 of 3, no | yes, 0 of 2, 0 of 3, no | no, 2 of 2, 0 of 3, no | yes, 0 of 2, 0 of 3, no |
| Form 1280: guests, platter rows, round times, Placed of booked in view | no, 0 of 2, 0 of 3, no | no, 0 of 2, 0 of 3, no | no, 2 of 2, 0 of 3, no | yes, 0 of 2, 0 of 3, no |
| Form 1920: change guests and round 2's time: scrolls (px apart) | 2 (985) | 2 (931) | 1 (508) | 1 (698) |
| Form 1280: change guests and round 2's time: scrolls (px apart) | 2 (985) | 2 (985) | 1 (508) | 1 (698) |
| Form, 6 kinds x 5 rounds, 1280: fields in view; screens; grid scrolls inside its box | 3 of 59; 3.74; no | 3 of 59; 3.74; no | 5 of 59; 2.79; yes | 6 of 59; 2.68; yes |
| Form, 6 kinds x 5 rounds, 1536: fields in view; screens; grid scrolls inside its box | 3 of 59; 3.72; no | 6 of 59; 3.46; no | 5 of 59; 2.77; yes | 6 of 59; 2.66; yes |
| Form 1536, extra large text: fields in view; screens; grid scrolls inside its box | 1 of 27; 3.76; no | 1 of 27; 3.45; no | 2 of 27; 2.61; yes | 1 of 27; 2.89; yes |
| Service 1920, 3 trips: trips whole, rounds whole (of 2), dietaries in view (of 4) | 3, 0, 2 | 3, 2, 4 | 3, 2, 4 | 3, 1, 4 |
| Service 1536, 3 trips: trips whole, rounds whole (of 2), dietaries in view (of 4) | 2, 0, 2 | 3, 1, 3 | 2, 2, 4 | 3, 0, 2 |
| Service 1280, 3 trips: trips whole, rounds whole (of 2), dietaries in view (of 4) | 1, 0, 2 | 3, 1, 3 | 2, 2, 4 | 3, 0, 2 |
| Service 1920: every Confirm out and the next countdown in view as it opens | no | yes | yes | yes |
| Service 1536: every Confirm out and the next countdown in view as it opens | no | yes | no | yes |
| Service 1280: every Confirm out and the next countdown in view as it opens | no | yes | no | yes |
| Service 1920, 1 trip: rounds whole (of 4) | 2 | 2 | 4 | 3 |
| Service 1920: the first round's place (left, width) with 0, then 1 trip | 376, 1168; 376, 1168 | 376, 1168; 376, 1168 | 376, 1168; 991, 553 | 376, 1168; 376, 1168 |
| Second tap 1920: under the finger once trip 1 is out; the rounds move by | Trip 2's Confirm out; -184 px | Trip 2's Confirm out; +33 px | Trip 2's Confirm out; +0 px | Trip 2's Confirm out; -71 px |
| Second tap 1280: under the finger once trip 1 is out; the rounds move by | Trip 2's Confirm out; -184 px | Trip 2's Confirm out; +33 px | Trip 2's Confirm out; +0 px | Trip 2's Confirm out; -71 px |
| Time list, Event start, 1920 mouse: clear of the Save bar; its bottom row tappable | no (over it); yes | no (over it); yes | no (over it); yes | no (over it); yes |
| Time list, Event start, 1280: clear of the Save bar; its bottom row tappable | no (over it); yes | no (over it); yes | no (over it); yes | no (over it); yes |
| Time list, First round at, 1280: clear of the Save bar; its bottom row tappable | yes; yes | yes; yes | yes; yes | yes; yes |
| Phone 390, tablet 768, the kitchen's service view: the same pixels as today | today | identical | identical | identical |
| Page errors; sideways scroll (every case) | 0; none | 0; none | 0; none | 0; none |

Notes: "Fields in view" counts boxes wholly above the Save bar. "Scrolls" for the guests and round 2's time: 0, both in view as the page opens; 1, one scroll shows both together; 2, Fay scrolls between them. On the form the open band (402 px at 1920, 366 at 1536 and 1280, a trip waiting for Fay) stays: with it, no design brings a round time above the Save bar on the first screen. The time list under Event start already runs over the Save bar today (its last row still takes a tap); no design changes that.

## Scores (seven fresh scorers, 1 to 10, each page on its own)

Every scorer read the brief, the packet, the contracts, the design misses, the frame and the pictures; none saw the others or the lead's view. All seven said the designs differ structurally. Their answers, as given, are kept in [scores.md](scores.md).

| Scorer | Form A | Form B | Form C | Service A | Service B | Service C | Recommends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The cook mid-service | 5 | 7 | 6 | 7 | 5 | 6 | B's form with A's service view |
| The head chef | 4 | 7 | 6 | 7 | 6 | 5 | C's form with A's service view (CSS only, no decision changed) |
| The skeptic | 3 | 6 | 5 | 6 | 4 | 5 | A's service view, then B's form |
| The new starter | 6 | 7 | 5 | 8 | 6 | 6 | B's form with A's service view |
| The keeper of the book | 5 | 5 | 7 (4 as previewed) | 7 | 6 | 6 | C's form with pair wrappers, with A's service view |
| The kitchen screen designer | 3 | 7 | 6 | 8 | 5 | 6 | B's form with A's service view |
| The UX and interaction designer | 4 | 6 | 7 | 7 | 6 | 5 | C's form with A's service view |
| **Total** | **30** | **45** | **42** (39 with the keeper's 4) | **50** | **38** | **39** | |

- **The service view: A, all seven.** Every Confirm out and the next round's countdown in view as the page opens at 1920, 1536 and 1280; the shelf stays first and on top (22 Nov 2026) and the platters still lead each trip (14 Nov 2026). Rejected: B's shelf beside the rounds (the rounds jump from 1168 to 553 px wide when the first trip lands, and Out today keeps the shelf, so they stay half width for the rest of the shift); C's rows (Confirm out 750 to 1,100 px from its trip's name; what went no longer leads; 0 rounds whole at 1536 and 1280).
- **The form: B, four of seven (and the highest total); C, three.** For B: the platter rows on the first screen at every wide width, beside the facts they depend on; one scroll for the guests and round 2's time instead of two. For C: the guests in view at every width, one scroll even for a six-kind booking (B needs two), and the page reads in its own order (B's Tab goes right, then back left). Against C: about 430 to 450 px of blank paper under Platters beside the taller round grid; no platter row on the first screen at 1920. A's form: no gain on the laptop, where most bookings are made.
- **A blend of all three: no, said all seven.** A's cards, B's side column and C's rows are rival shapes of one shelf, and B's and C's forms exclude each other. Every scorer split by page instead.

## Break-it findings

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| **A second tap confirms the next trip.** Fay taps Confirm out on trip 1; once it is out and the shelf has moved, trip 2's Confirm out sits under the same spot (1920 and 1280, today and in every design). A second tap there, made before she looks again, marks trip 2 out and clears it from the kitchen's shelf; Fay has no Undo (source). A true double tap is different: while the first confirm is still sending, the trip keeps its place with no buttons (`shelfHTML()`), so it is Not evidenced and, from the source, lands on nothing. | **Reproduced** for a tap after the shelf moved, on the stand-in (`checks.second-tap-*` in every `study.json`: it waits until trip 1 has left, then reads what is under the same spot). The double tap: Not evidenced. | Not a layout: no design fixes it. Smallest repair, its own pull request: a confirmed trip holds its place a moment, saying it is out, as Prep's ticked lines do, so the next trip does not slide under the finger. A click test taps the same spot twice and expects trip 2 still waiting. |
| **The form's sections pinned to numbered rows** (B and C as previewed): on a new function the Save bar lands under the heading (B) or after The function (C) and scrolls away; on a restored draft C puts The function after the comment. | **Reproduced** by the keeper in a static copy of the form's order, then on the stand-in (`checks.form-order-new-*`). | **Repaired in the mix**: the grid places each section in the page's own order (only The function and When the platters go out say how many rows they span). **Checked** on the stand-in: an existing function, a new one and a new one's restored draft at 1920 and 1280 all read head, function, platters, when, notes, comment, Save bar. Not evidenced: a save conflict, problems listed, the review step, All at once. |
| **B's shelf beside the rounds moves the board**: the first trip shrinks the rounds from 1168 to 553 px wide and moves them 615 px sideways; once a trip is out, Out today keeps two columns for the rest of the shift. | **Checked** (`fnnow-1920-t0`, `-t1`); the rest of the shift from source (`shelfHTML()`). | B's service view not recommended. |
| **Four trips waiting.** | **Checked**: the mix (A's cards) shows all 4 Confirm out with the next countdown at 1920 and 3 of 4 at 1536; B 3 of 4 at 1920; today 3 of 4. | Five or more trips: Not evidenced. |
| **A big booking** (six kinds in five rounds): in a half-width column the round grid scrolls sideways inside its box, with no sign that it does. | **Checked**: no page scrolls sideways; the grid's box does, in B, C and the mix. Touch: Not evidenced. | Before release: a sign that the grid goes on, or a narrower round note so six kinds fit at 1280. |
| **The time list under Event start** runs over the Save bar (with a mouse). | **Checked**: today and every design; its last row still takes a tap. | Unchanged by this study. |

## The mix: B's form with A's service view (combined preview)

[`designs/mix.css`](designs/mix.css) and [`designs/mix.js`](designs/mix.js), pictures in `previews/mix/`. A lead synthesis of the parts most scorers chose, with the keeper's fault repaired; its numbers are its own, measured on the stand-in. The form is drawn as the build would draw it: The function, then a plain wrapper of Platters and When the platters go out, then a plain wrapper of the notes and the kitchen comment, all in the page's own order, in a grid of two rows (`mix.js` stands in for the change to `js/fnedit.js`). Nothing is pinned to a numbered row, and the right column's second row takes the slack, so no gap opens under The function (a first repair without wrappers left gaps of about 90 px, the keeper found).

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| B: the form in two columns from 1150 px | Take, repaired (no numbered rows) | Airbnb (time, guests and platters together) | The platters beside the facts; one scroll for the guests and round 2's time | Tab goes right, then back left; the laptop changes; two scrolls for a six-kind booking at 1280 | `previews/mix/form-*.png`, `study.json` |
| A: the waiting trips as cards across the shelf from 1100 px | Take | Linear (the action beside its work), Flighty (now and next together) | Every Confirm out with the next countdown in view at every wide width | With one trip, two thirds of the shelf is empty, and the rounds below show as today | `previews/mix/fnnow-*.png` |
| C: The function's boxes four across; the bands | Reject in the mix (the alternative for the form) | Todoist (known fields in view) | Guests in view at every width | Blank paper beside the round grid; four boxes do not fit B's half column | `previews/c/` |
| B's shelf beside, C's trip rows, A's form | Reject | Flighty; Linear | | The board moves; Confirm out far from its trip; no laptop gain | above |

| The mix, measured | 1920 | 1536 | 1280 |
| --- | --- | --- | --- |
| Form: fields wholly above the Save bar, band open (today) | 9 (7) | 5 (3) | 5 (3) |
| Form: the same at a quiet hour, smaller band (today) | 13 (7) | | 9 (7) |
| Form: platter rows on the first screen (today) | 2 of 2 (0) | 2 of 2 (0) | 2 of 2 (0) |
| Form: scrolls to change the guests and round 2's time (today) | 1 (2) | 1 (2) | 1 (2); 2 for a six-kind booking (2) |
| Service, 3 trips: every Confirm out and the next countdown in view (today) | yes (no) | yes (no) | yes (no) |
| Service, 4 trips: Confirm out in view (today) | 4 of 4 (3) | 3 of 4 (2) | |

Phones, the tablet's whole form and the kitchen's service view: the same pixels as today (the whole form at 390 and 768 compared too). The tablet's first-screen picture alone: 102 pixels differ, on the box edges at the column's sides (a fraction of a pixel; side by side there is no visible change); the build checks it again. Page errors 0, no sideways scroll, in every case.

**Review status:** the mix is two parts every scorer already judged (B's form, A's service view), plus the repair. The repair went back to the keeper, who reproduced the fault. Its answer: "The repair holds: with no numbered rows, each piece sits in page order." Its own copy of the form's order adds a restored draft on a saved function and a problems list, in page order too. It scored the mix's form 7, up from 5 for B as previewed, level with C. It named one new cost, gaps in the left column; the wrappers above remove them (the notes now start at 1041 px at 1920, against 1110 with the gaps). Still Not evidenced, it said: the draft bar (Check and confirm, Save draft), a save conflict, the review step, All at once with no rounds, an open booking contact, and Tab order; on the service view, Out today only, a pending confirm, a failed read, Waiting N min. With four trips at 1536 one Confirm out and the next countdown fall below.

The wrappers went back to the keeper too: "Order holds. My replica with the same wrappers keeps the Save bar after the comment, and problems after it, for a restored draft on a saved function and a new function with problems. No focus risk: plain divs, page order unchanged. The bar is still the form's child, so it docks; the time list hangs off its own field." It found one new fault from the source: the book's rule that the last section in a box has no line under it (`.set-block:last-child`) would take the line from When and the kitchen comment inside their wrappers, at every width, phones too, and the first-screen pictures could not show it. Fixed in `mix.css` with one line; the whole form at 390 and 768 is now the same pixels as today. Its score: "7; 8 once fixed and draft, conflict and review pass." Those states need the real build (the preview's wrappers are drawn once, and a redraw drops them).

## Recommendation

**Recommend the mix: B's form (two columns from 1150 px, drawn with plain wrappers in the page's order) with A's service view (the waiting trips side by side across the shelf from 1100 px).**

- **The service view, A, is the council's clear choice (seven of seven, 50 points against 38 and 39).** With three trips waiting, every Confirm out and the next round's countdown are in view as the page opens at 1920, 1536 and 1280; today none of the rounds are. It keeps the 22 Nov 2026 order (the coordinator's confirmation queue first, on top) and the 14 Nov 2026 trip (the platters lead, large). It needs only CSS.
- **The form, B, by four of seven and the highest total (45 against 42).** The platter rows sit on the first screen beside the guests, date and time they depend on, at every wide width (today none do); the guests and round 2's time are one scroll apart instead of two; at a quiet hour 13 fields are in view at 1920 (7 today) and 9 on the laptop (7). It changes the laptop, where most bookings are made.
- **Why not C's form** (the head chef's scorer, the keeper and the UX designer preferred it): it keeps the guests on the laptop's first screen with the band open and one scroll for a six-kind booking, and reads in page order; but no platter row reaches the first screen at 1920, and about 440 px of paper sits blank beside the round grid. It is the alternative if you would rather keep the guests in view on the laptop than the platters.
- **Main downside:** on the laptop with the band open the guests sit just below the first screen, and a six-kind booking still takes two scrolls; Tab goes from The function to the platters on the right, then back to the notes on the left.
- **Not a layout, a fix:** a second tap at the same spot, once the first trip has left, confirms the next trip (Reproduced today and in every design). The fix goes in its own pull request whichever you choose.
- **Disagreement:** the head chef's scorer, the keeper and the UX designer would take C's form. The skeptic and the head chef's scorer call the whole study a modest gain; "Build nothing" is a fair answer, as Fay can scroll and the kitchen sends either way.
- **Departures:** none from a decision. The form's two columns are a new layout (your OK).

## Contract fit and references

| Check | The mix | Evidence |
| --- | --- | --- |
| Surface purpose | Works: the form stays quiet paper, the service board charcoal, the band charcoal | Pictures |
| State meaning | Works: Waiting, Waiting N min and Confirm out keep their words, icons and colours; nothing new is coloured | Pictures; Waiting N min and Not confirmed Not evidenced in a picture |
| Words and exceptions | Works: no word changes | Source |
| Real contrast and focus | Not evidenced: no new colour (the cards' edge is the board's own line colour); contrast and keyboard focus not measured | |
| Relevant states | Needs work: checked existing, new and restored forms, 0, 1, 3 and 4 trips; the rest the keeper named are Not evidenced | `study.json` |
| Service continuity | Works: Confirm out one tap, 48 px, unchanged; on a confirm the rounds move 33 px (184 today); no new tap, sheet or button | `checks.second-tap-*` |

| Reference | A | B | C | The mix |
| --- | --- | --- | --- | --- |
| Linear (the action beside its work) | Works (each Confirm out in its trip) | Works | Needs work (Confirm out 750 to 1,100 px from its trip) | Works |
| Things 3 (today's work in view) | Works (service) | Needs work (2 of 3 trips at 1536) | Needs work (0 rounds at 1536) | Works |
| Airbnb (time, place, needs and next step together) | Needs work (form: nothing at 1280) | Works (form) | Works (form: guests in view) | Works |
| Flighty (now and next; nothing moving) | Works (rounds move 33 px) | Needs work (rounds jump 615 px sideways) | Works | Works |
| Todoist (known fields in view) | Works at 1536 only | Works | Works | Works |

## Before the build is ready

One pull request for the layout (`css/app.css`, the wrappers in `js/fnedit.js`; no reads, writes, listeners or rules), measured again on the implemented app at 1099, 1100, 1101, 1149, 1150, 1151, 1280, 1536 and 1920, and at 390 and 768 (the same pixels, or the corner anti-aliasing named): a new function, a draft with Check and confirm and Save draft, a restored draft, a save conflict, problems listed, the review step, All at once, an open booking contact, six kinds in five rounds (with a sign that the round grid goes on), extra large text; the service view with 0, 1, 3, 4 and 5 trips, Out today only, a pending confirm, a failed read, Waiting N min and Not confirmed; Tab through the form at 1280. A click test file holds the order and the cards. The second-tap fix goes in its own pull request, with a test that taps the same spot twice.
