# Evidence packet: front of house layouts (26 Nov 2026)

Label for everything here: **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched a functions person use these screens. Source commit: `7ff635f` of `main` (after #910). Pictures and numbers come from [`today.cjs`](today.cjs) (the step 3 fixture with three trips waiting: `TRIPS=3`).

Read with [the proposal](proposal.md). Every reviewer also reads, in full:

- [`docs/screen-1920-options/round1-packet.md`](../screen-1920-options/round1-packet.md): **The service rules**, **Current design contracts** (with **Colour and state checks**), **Design references**, **Try to break it**, **Where it goes, and how loud**, and **Where it goes, and how loud it is** (the rule from `docs/design-patterns.md`). They hold for this study word for word.
- [`docs/design-misses.md`](../design-misses.md): the changes reworked after a bit of use.
- [`docs/device-coverage/step3/packet.md`](../device-coverage/step3/packet.md), **Decisions already made that these pages show**, and [`findings.md`](../device-coverage/step3/findings.md) sections 5 and 7 and **Chosen**.

## The two pieces and the day

- **The booking form** (`#/functions/b60`, `js/fnedit.js`): Fay changes the Birthday 60th (40 guests, event 13:45, three rounds 14:10, 14:50 and 15:30; 2 Antipasto and 2 Pizza in round 1, 1 and 2 in round 2, 0 and 1 in round 3; notes "3 gluten free, 1 vegan. Nut allergy at table 4."). The form, in order: the head (name, Confirmed tag, Print function), Last changed, **The function** (Name or reference; Date and Event start with TBC; Guests with Not known yet, and Room, area or table with its picker), **Platters** (one row per kind: the platter, how many in each round, the total; Add a platter), **When the platters go out** (All at once or In rounds; each round's time, typed, with a note), **Service and dietary notes**, **Kitchen comment**, then the docked Save bar (`.fe-bar sv-dock`: the summary "8 platters · 3 rounds from 14:10 · 40 guests" on the left, Save changes on the right), then problems, Duplicate, Cancel function, Delete, History at the foot.
- **The service view's shelf** (`#/fn/now`, `js/functions.js` `shelfHTML()` and `serviceHTML()`): for Fay (a coordinator: she confirms, she never sends) the dark board says Functions service and the clock, then the shelf **Waiting for Functions** (confirm each trip when it is out), then **Still to go out** (the kitchen sends these) with every round of the day. Each trip on the shelf: Trip k · round time **Function** · room; what went, large (2 × Antipasto, 2 × Pizza); sent 13:55 Sam and the Waiting pill (Waiting N min in orange from 10 min); since 26 Nov the dietaries and notes; **Confirm out** (white, 48 px). Out today: N trips, last ... under the trips. Then To plate now, the two prints and All functions. The page draws again every 20 seconds (no reads).
- **The day at 14:00** (busy, `TRIPS=3`): Birthday 60th trip 1 sent 13:54 and trip 2 sent 13:56 (1 Antipasto and 1 Pizza each, from round 1), Club lunch trip 1 sent 13:59 by Ann (4 Antipasto), so three trips wait for Fay; rounds still to go: 60th 14:10 (what is left), 14:50, 15:30; Club lunch 14:30 (a kitchen comment: "Platters on the side bench."). Tomorrow a wedding, in three days a quiz night.

## Code facts a design must work with

- The form's boxes: from 900 px each pair is `grid-template-columns: repeat(2, minmax(0, 18rem))` (`css/app.css`), so the column (up to 1240 px wide at 1920) is half empty. The form is one `section` with `.set-block` groups in this order; the Save bar is sticky at the bottom. No other layout exists for it today.
- The service board: for the **kitchen**, from 1100 px, `.fn-svc-board:has(> .fn-svc-rows)` is a grid: rounds on the left, the shelf on the right (`minmax(270px, 0.52fr)`), so the rounds keep their width as trips come and go. For **Fay**, the shelf comes first and the rounds sit inside `.fn-svc-sec` below it, full width, at every size (22 Nov 2026: "Keep the coordinator's confirmation queue first").
- One stylesheet (`css/app.css`) and the shared JS; any of the designs is CSS plus, at most, a change of order in the HTML strings. No new reads, writes, listeners or rules in any design.

## Contracts these layouts must keep (excerpts)

- **The service board** (`docs/design-patterns.md`, Inside a list): "the rows still to go on the dark board (`.fn-svc-board`), each with a pill saying how long until it goes or how late it is (`.fn-svc-cd`), and what the kitchen must not miss on every row (the dietaries, `.fn-svc-diet`) ... And **a shelf of what waits on someone else**: in the same board (`.fn-svc-shelf`), each entry (`.fn-svc-trip`) led by what went, large like the board's rows (`.fn-svc-q`), with whose and when as small lines around it with its state in words and an icon (`.fn-ws`: Not sent yet, Waiting, Waiting N min in the board's orange, Not confirmed in the dark red), counted in the board's top line." Confirmed is two ticks in the dark-surface green.
- **22 Nov 2026, Functions Service spacing and waiting trips** (`docs/head-chef-decisions.md`): "Bring the live board higher on a phone and place the waiting shelf beside active rounds on wide kitchen screens. Keep the coordinator's confirmation queue first." A layout that puts Fay's shelf beside the rounds changes this for the coordinator: it needs the head chef's OK, and it must keep the shelf first in reading and tab order.
- **14 Nov 2026, the two-way check** (a trial): every trip waiting for Functions is on one shelf; Functions people confirm each trip, on the service view or their Home band; the sender never confirms their own; a head or sous chef may confirm for Functions after 10 minutes. The platters lead each trip, large.
- **26 Nov 2026 (#910):** the dietaries and notes show under each trip waiting, above Confirm out; a warning (a trip waiting for this person, among others) keeps the band open on every page, so the band on the form is open while a trip waits.
- **The form's bar** (`docs/design-patterns.md`, 20 Nov 2026): "holds its Save buttons, like the recipe editor's: the summary on the left (`#fe-live`), then Saving... or the red reason, then Save changes, or Check and confirm and Save draft, or Put it back on. Saving..., the red reason and a save conflict show in the bar too, right above the Save that was tapped. Duplicate, Cancel function, Delete, Drop my changes and History stay at the foot of the form."
- **Typed times** (18 Nov 2026): a typed box, always 24-hour; 1 to 11 asks Morning or evening?, never guessed; on a laptop the time boxes show a list every 15 min under the box. A design must leave room for that list under Event start and each round's time.
- **The nearest precedents for "beside"** (22 Nov 2026): the recipe editor's ingredient details beside the list from 1150 px (`.mg-with-ing-panel`, the panel ends above the Save dock and scrolls on its own); Delivery received's receipts beside the form from 1100 px, the form first in reading and keyboard order; Orders' cut-offs beside the requests on wider screens.
- **Surfaces:** the form is quiet paper (reading and writing); the service board is the charcoal live board; the band is charcoal. Brand orange for actions; Waiting N min in the board's orange; dark red only for Not confirmed and failures.

## The pictures (`today/`, what shows without scrolling)

`form-1920.png`, `form-1536.png`, `form-1280.png`, `form-768.png`, `form-390.png`; `fnnow-1920.png`, `fnnow-1536.png`, `fnnow-1280.png`, `fnnow-768.png`, `fnnow-390.png`; `fnnow-1920-kitchen.png` (Sam, the kitchen's view of the same moment: rounds left, shelf right). Fay at 1920 x 1008, 1536 x 806 (125 %), 768 x 1024 and 390 x 844 with touch; 1280 x 800 with a mouse.

## The numbers ([`today/metrics.json`](today/metrics.json))

| Page | 1920 | 1536 | 1280 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
| Form: fields in view (of 27) | 7 | 4 | 4 | 7 | 0 |
| Form: screens tall | 2.56 | 3.15 | 3.18 | 2.5 | 4 |
| Service view (Fay): screens tall | 1.62 | 1.98 | 1.99 | 1.59 | 1.98 |
| Service view (Sam, the kitchen): screens tall | 1.27 | | | | |

At 1920 the band above the form is about 270 px with trips waiting (it stays open while a trip waits for Fay). On the service view at 1920 each waiting trip with its dietaries takes about 220 px; three trips fill the first screen, and Still to go out starts below it.
