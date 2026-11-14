# Function handover: designs A, B and C (round 2 evidence)

Council round 2, 14 November 2026. Preview only: static pages built from the implemented-app snapshot of `#/fn/now` (commit 5d92379) with each design swapped in (`build.cjs`), screenshots and measurements by `capture.cjs`. Synthetic data. Role-based analysis, not research with real staff. No taps were run: speed, save feedback and recovery are **Not evidenced** by these previews.

## What round 1 decided (5 of 5: Build smaller)

- A sent round must not stay full size in time order: the next round to plate would drop off the first screen.
- Sent still counts as sent for the kitchen: not Late, not in To plate now, not "not sent yet" on the band. A separate Out state only decides what the Functions side still has to confirm.
- Each side has its own button. Fay (Functions coordinator) can tick Sent today; in every design she sees Confirm out instead, and a cook does not see Confirm out. A chef (head or sous) can confirm for Functions after 10 minutes.
- Waiting for Functions is pending, said in words with an hourglass, never green. After 10 minutes it turns into named attention (orange on charcoal, "Waiting 11 min"). Green with two ticks only once confirmed.
- A round never confirmed by the time the function leaves the board says "Never confirmed" on the function's page and run sheet; it does not vanish quietly.
- Single-platter rows are out (up to 300 of a kind). One tap still sends a whole round.
- The head chef's addendum: an all-at-once function goes out over several runner trips, so the kitchen needs to tick part of it.
- Split left for round 2: kitchen granularity (per kind all-or-nothing: head chef, skeptic; count per kind: cook, new starter, keeper) and Functions granularity (per round: 4; per kind: the cook).

## The night in every preview (18:35, Saturday)

- Birthday 60th, Function room, staggered: round 1 18:00 (2 Antipasto, 2 Pizza) sent 18:08 Ann, confirmed out 18:12 Fay. Round 2 18:45 (1 Antipasto, 2 Pizza). Round 3 19:30 (1 Pizza). Dietaries on every round.
- Rotary dinner, Beer garden, all at 18:20: 4 Antipasto, sent 18:24 Ann, not confirmed after 11 minutes.
- Wedding reception, Marquee, all at 18:30 (5 min late): 4 Antipasto, 3 Pizza, 3 Sliders, 2 Fruit, 2 Cheese (14). Part sent: in A, Antipasto and Pizza (7 of 14; A cannot send part of a kind); in B and C, those plus 2 of the 3 Sliders (9 of 14).

## Design A: Waiting shelf (changes the least)

Central idea: today's board, with each platter kind as a tick, and a one-line shelf at the end of the board for rounds waiting on Functions.

- Kitchen: each kind in a round is a 44 px tick button ("☐ 3 Sliders"); one tap marks that whole kind sent ("☑ 3 Sliders SENT", dashed edge). All sent (7 left) sends the rest in one tap. Undo for the last tick, as today (same person within 2 minutes, or a chef).
- When every kind in a round is sent, the round leaves Still to go out and becomes one line on the **Waiting for Functions** shelf at the end of the board: "18:20 Rotary dinner · Beer garden · 4 Antipasto · ✓ sent 18:24 Ann [⌛ Waiting 11 min]".
- Functions: one Confirm out per round, on the shelf (service view) or beside the round on the band on Fay's Home. A part-sent round cannot be confirmed until all of it is sent.
- Confirmed rounds leave the shelf: "✓✓ Out today: 1 round, Birthday 60th round 1, 18:12 Fay."
- Data: the round's `fnsent` record gains `k` (a map by platter recipe id: `{ at, by }` per kind sent) and `outAt`, `outBy`. Nested map keys merge, so two cooks ticking different kinds both land. No new listener.
- Screens: `design-a/service-cook-390.png` (first screen), `design-a/service-cook-390-full.png`, `design-a/service-coordinator-390-full.png` (Fay), `design-a/home-coordinator-390.png` (Fay's Home band), `design-a/states-390-full.png`, `design-a/service-cook-768.png`, `design-a/service-cook-1280.png`.

## Design B: Three stages (rethinks the flow)

Central idea: the board is grouped by where the food is, To send, With the runners, Out, with a count of each at the top, and every kind is its own line with how many have gone.

- Top of the board: "9 to send · 9 with the runners · 8 out".
- Kitchen (To send): each kind is a line, "3 × Sliders ✓ 2 of 3 sent, 1 to go", with **+1** and **Rest 1** (44 px). All sent (5 left) sends everything left in one tap.
- With the runners: every kind sent and not yet confirmed, by round, with who sent it and when. Functions confirms each kind (**Out**) or the whole round (**All out (5)**). Fay's service view puts With the runners first; the cook's puts To send first.
- Out: one folded line, "✓✓ Out: 8 platters. Show".
- Fay's Home band: one row per round with platters with the runners, and All out.
- Data: the round record gains `c` (a map by recipe id: count sent, written with increments so two cooks never lose a tick) and `o` (count confirmed by kind), plus who and when for each. The rules check counts only go up; they cannot cap at the booked number cheaply, so the client caps.
- Screens: `design-b/service-cook-390.png`, `design-b/service-cook-390-full.png`, `design-b/service-coordinator-390.png`, `design-b/service-coordinator-390-full.png`, `design-b/home-coordinator-390.png`, `design-b/states-390-full.png`, `design-b/service-cook-768.png`, `design-b/service-cook-1280.png`.

## Design C: Trips (removes the most friction)

Central idea: what leaves the pass together is one trip. One tap sends everything left as a trip; Functions confirms each trip.

- Kitchen: **Send all 5** sends everything left in the round as one trip (one tap). **Send part** opens the kinds inside the row (no pop-up): tap a kind's name for all of it, or set a number with − and +, then **Send trip 3 (3)**. Cancel closes it.
- Each trip is a slip under its round, in place: "TRIP 2 ✓ 2 Sliders, sent 18:34 Ann [⌛ Waiting]". A round with nothing left to send folds to its top line and its slips (Rotary dinner, 126 px), and leaves the board once every trip is confirmed.
- Functions: one Confirm out per trip, on the slip or on the band on Fay's Home ("Trip 2: 2 × Sliders, sent 18:34 Ann. 5 still to send. [Confirm out]").
- Data: each trip is its own record in the same `fnsent` collection (same `day` field, so the same listener; id from the round, the time and who sent it): `{ fid, at, day, n: { recipe id: count }, sentAt, sentBy, outAt, outBy }`. A trip never changes after it is sent except its Out (and an Undo within 2 minutes that marks it void). Separate records, so two cooks never overwrite each other.
- Screens: `design-c/service-cook-390.png`, `design-c/service-cook-390-full.png`, `design-c/service-cook-part-390-full.png` (Send part open), `design-c/service-coordinator-390-full.png`, `design-c/home-coordinator-390.png`, `design-c/states-390-full.png`, `design-c/service-cook-768.png`, `design-c/service-cook-1280.png`.

## How they differ

| | A Waiting shelf | B Three stages | C Trips |
| --- | --- | --- | --- |
| Board layout | Today's rows in time order, a shelf at the end | Grouped by stage, counts at the top | Today's rows in time order, trip slips inside each row |
| Kitchen unit | A whole kind (all or nothing) | A count per kind (+1, Rest) | A trip (Send all, or Send part) |
| Functions unit | A whole round | A kind, or All out for the round | A trip |
| Where sent food shows | One line per round on the shelf | With the runners section, by kind | A slip under its round, in place |
| Part of a kind | Not possible | Yes | Yes |

## Measurements (Preview, static snapshot method, 390 x 844, 64 px tab bar taken off)

Baseline measured the same way (static snapshot of today's app at 18:10, before the night above): 4 rounds to go, 3 start in the first screen, 2 fit whole; page 1755 px.

| | Baseline | A | B | C |
| --- | --- | --- | --- | --- |
| Rounds still to go on the board | 4 | 3 (Rotary on the shelf) | 3 (Rotary with the runners) | 4 (Rotary folded, 126 px) |
| Start in the first screen / fit whole | 3 / 2 | 2 / 1 | 1 / 0 | 3 / 2 |
| Wedding row height | n/a | 390 px | 545 px | 385 px |
| Top of the first kitchen action (px) | 419 (Sent) | 349 (first kind tick); All sent at 578 | 550 (first +1) | 592 (Send all 5) |
| Page height at 390 | 1755 | 2184 | 2630 | 2154 |
| Buttons under 44 px | 0 | 0 | 0 | 0 |
| Sideways scroll at 390, 768, 1280 | none | none | none | none |
| Fay's first Confirm on the service view (px from top) | none | below the first screen (on the shelf) | 362 (With the runners first) | 333 (Rotary's trip slip) |

Taps (counted from each design's rules, not run):

| Task | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Cook: send a whole round | 1 | 1 | 1 | 1 |
| Cook: wedding in 3 runner trips (Antipasto + Pizza, then Sliders + Fruit, then Cheese) | not possible | 5 | 5 | 9 (Send part, kind, kind, Send trip; twice; then Send all) |
| Cook: 2 of the 3 Sliders | not possible | not possible | 2 | 4 (Send part, Sliders, −, Send trip) |
| Fay: confirm the Rotary dinner | none today | 1 | 1 | 1 |
| Fay: confirm the wedding sent in 3 trips | none today | 1, once all 14 are sent | 1 (All out) or up to 5 | 3 (one per trip) |
| Fay: from Home | Service view, then nothing | 1 on the band | 1 on the band (All out) | 1 per trip on the band |

Contrast (Preview, rendered colours composited over the charcoal board, light theme only): waiting pill words 13.5:1 (A) and 11.5:1 (C); waiting 10 min+ (charcoal on orange) 5.8:1; Confirm out (ink on paper) 16.9:1; Out line 9.6:1; kind tick words 14.6:1 (A), sent kind 11.1:1; B's "2 of 3 sent" 10.2:1, stage counts 9.4:1; C's trip slip 10.6:1. Keyboard focus: a 3 px orange outline on the board's buttons (the existing pattern), not measured. Dark/high-contrast variants: Not evidenced.

## Cost and risk (source-derived, not measured)

| | A | B | C |
| --- | --- | --- | --- |
| New listener or collection | none | none | none (new record shape in `fnsent`) |
| Writes a night (10 rounds, about 15 trips) | about 30 | about 50 to 60 (counts) | about 30 |
| Reads a night (about 15 open devices, 1 per write each) | about 450 | about 900 | about 450 |
| Rules change (looser: publish before the client) | `k`, `outAt`, `outBy` on the round record; Out only after all sent; Undo after Out only a chef | `c` and `o` maps with increments; counts only go up; Out by kind | a trip record shape; counts 1 to 300 by recipe id; Out once; void within 2 min |
| Pull requests to build | 2 (rules and tests; then the client) | 3 (rules; board regrouped; band and coordinator view) | 2 to 3 (rules; trips and Send part; band) |
| Relearning | low | high (new layout) | medium (the word "trip") |
| Main risk | No part of a kind; a part-sent round cannot be confirmed until all of it goes | Longest rows: 1 round starts on the first screen; most buttons (10 on the wedding) | A new idea to learn; Send part is a disclosure inside the row; the folded round stays at the top in time order |

Shared risks for every design (round 1 Break-it, to carry into the build): an Undo of Sent must clear the Out fields, and a new Sent must not inherit an old Out; one check (`isSentK`) drives the board, To plate now, Late and the band, so Sent and Out must be two checks; a held write needs a Not sent yet state on both sides; booking edits after ticks must key by the platter's recipe id (the editor allows each platter once per booking, `js/fnedit.js`), and a lowered count shows "4 sent, 3 booked" rather than guessing; phones on the old code during the release window still drop a round at Sent.

## The mix: trips, a shelf and tap-what-goes (combined preview)

After round 2 (C 39, A 37, B 23 of 60; first choice C 4 of 6, A 2 of 6), five of six reviewers proposed a blend led by C. This is the lead's combined preview of it. One part is the lead's own synthesis, not a reviewer's: A's kind buttons used as the trip picker. It goes back to the relevant reviewers for a focused check.

- **Kitchen:** each kind still to send is a button ("☐ 2 Fruit"). A tap picks all of that kind, and − takes one off ("☑ 1 Cheese of 2"). The one button always says what it sends: **Send all 5** with nothing picked, **Send 4 platters** once something is picked; **Clear** (44 px) drops the picks. Nothing is saved until Send. Each Send is a trip.
- **Where sent food shows:** a row with something still to send says "✓ 9 of 14 sent in 2 trips. 5 left". Every trip waiting for Functions is one line on the **Waiting for Functions** shelf at the end of the board, so a round with nothing left to send leaves the rows. One place for waiting trips, not two. The board's top line says "⌛ 2 trips waiting for Functions, 1 for 11 min", as a link to the shelf, so a stuck trip is never only below the fold.
- **Functions (Fay):** her service view puts the shelf first ("Functions service": Waiting for Functions, then Still to go out, the kitchen sends these). She sees no send buttons or kind buttons, only what is left, as words. One **Confirm out** per trip, on the shelf or on her Home band ("Trip 1: 4 × Antipasto, sent 18:24 Ann ⌛ Waiting 11 min [Confirm out]").
- **Names:** Send (kitchen), Confirm out (Functions), Confirm for Functions (a chef after 10 minutes, saved as "confirmed by Sam for Functions"). Waiting, then Waiting 11 min, then the final **Never confirmed** (red outline, an exclamation mark, kept on the function's page and run sheet), never an hourglass.
- **Records (repairs from the keeper and skeptic):** each trip is a record in `fnsent` with a fixed id, the round plus the trip number, created once; only its Out fields change later, once. A second phone sending the same trip number is refused and says so ("Not saved: Ben just sent trip 3 (1 Sliders). Check what is left and send again."). A double tap repeats the same id, so it changes nothing. In the same write, the round's old record gets `sent: true` when nothing is left to send, so phones on the old code see the round as sent. Out only after Sent, never on a voided trip; Undo (sender within 2 minutes, or a chef) only before Out. The sender cannot confirm their own trip, except a chef's fallback after 10 minutes. Coordinator-only staff cannot send. A function with a waiting trip stays on the board after its window until the trip is confirmed or Queensland midnight. The picks live in the page's memory, so the 20-second redraw and a listener change never clear them.

Screens: `design-mix/service-cook-390.png`, `design-mix/service-cook-390-full.png`, `design-mix/service-cook-picked-390-full.png` (Fruit and Cheese picked), `design-mix/service-coordinator-390-full.png` (Fay), `design-mix/home-coordinator-390.png`, `design-mix/states-390-full.png`, `design-mix/service-cook-768.png`, `design-mix/service-cook-1280.png`.

| Measure (Preview, same method) | Baseline | A | C | Mix |
| --- | --- | --- | --- | --- |
| Rounds to go: start in first screen / fit whole | 3 / 2 (of 4) | 2 / 1 (of 3) | 3 / 2 (of 4, one folded with no kitchen work) | 2 / 1 (of 3) |
| First kitchen button (px from top) | 419 (Sent) | 349 | 592 | 438 (first kind); Send all 5 at 617 |
| Waiting line visible in the first screen | n/a | no (shelf below) | yes (folded row) | yes (top line, 271 px) |
| Fay's first Confirm out (px) | none | below the first screen | 333 | 362 |
| Page height at 390 | 1755 | 2184 | 2154 | 2310 |
| Cook: whole round | 1 | 1 | 1 | 1 |
| Cook: wedding in 3 trips | not possible | 5 | 9 | 7 |
| Cook: 2 of 3 Sliders | not possible | not possible | 4 | 3 |
| Fay: wedding in 3 trips | none | 1, at the end | 3 | 3 |
| Text links under 44 px | n/a | Undo Pizza (24 px) | Send part, Cancel (24 px) | none (Clear and Undo are 44 px) |

Contrast (Preview, composited, light theme): as in the designs above, plus the waiting top line 13.5:1, a picked kind 8.2 to 8.9:1 (light words on the lighter picked fill, with a thicker edge and a ticked box), − 13.5 to 14.6:1, Never confirmed (`--bad-on-dark` on charcoal) 7.1:1. Dark/high-contrast variants and keyboard focus: Not evidenced.
