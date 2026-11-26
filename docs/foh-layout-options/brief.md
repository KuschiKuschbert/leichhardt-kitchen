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

The lead's note: the frame's band and dock figures were read off the pictures. Measured (`today/metrics.json`): the Save bar's top is at 940 px at 1920, 738 at 1536 and 732 at 1280.

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

