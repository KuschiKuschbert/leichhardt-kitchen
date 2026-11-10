# Functions ahead of time: council brief

Council for the head chef's question of 10 November 2026: "If there is a function during the week, and I want everyone's attention on it, when does it show exactly, and how can I improve that best?" Design previews only. Nothing in the app has changed.

## Status

- **Round 1 (10 Nov 2026):** Build smaller, 5 of 5.
- **Round 2 (10 Nov 2026):** three designs, A, B and C, scored by six reviewers. The scores were A 39, C 38 and B 26, and B came last with every reviewer.
- **Mix:** five of six reviewers recommended the same narrow mix. It has its own combined preview (`design-mix/`), which all six endorse with changes (8 to 8.5 out of 10). A revision pass fixed the two faults they reproduced. The four reviewers who found faults re-checked it and endorse it with changes (8 to 8.5), with six repairs listed for the build (see **Revisions and re-check**).
- **Review status:** a lead synthesis, given a focused review by all six reviewers and re-checked by four. It is not a full council round on its own.
- **Chosen (10 Nov 2026, head chef): the mix**, with the line kept for everyone on the work pages and the Function tomorrow card shown to everyone once more. See **Chosen** below.
- **Build:** steps 1 (the work-page line), 2 (the Home card) and 3 (the Orders tag) built 10 Nov 2026, see **Build record**.

**Recommendation: the mix.** A's quiet Next function line is the base, on Home and in the band's place on every work page. Add C's heads-up card under Your day, which collapses into A's line after Got it. Add B's rule that the line only appears or changes size when a page opens, and B's "Not ordered yet" words on the Orders stock line. Also show `#/fn` Upcoming 7 days ahead and put the guests on the sheet. Leave out B's week strip, B's band changes, C's bell dot and any record of who has seen it.

## When a function shows today

From `js/functions.js` at `184174e`. The full table is in [evidence.md](evidence.md). For a function on Thursday 19 Nov:

- **Order day (Sun 15):** the band shows "Order the stock". The order list carries the function stock line.
- **Mon 16 and Tue 17:** **nothing** on any work page.
- **Wed 18:** the band shows "Tomorrow".
- **Thu 19:** the rounds and the pinned strip. The platter lines go on the prep list that day only.
- **Home** lists the function in Coming up for the 7 days before. Coming up is the last card, at **955 px** on a 390 px phone with a team saved (Implemented app). The first screen ends at about 780 px.
- No ping and no push reach anyone.

## Round 1: should we build it?

Verdict **Build smaller (5 of 5)**. Do not show the whole week in the band on every page. One band row is 113 px, about 1.5 prep lines (Implemented app). A whole week would mix today's work with next week's and bury the rare Order and Tomorrow warnings. Instead, fill the empty days with one quiet line.

- **Skeptic:** move Home's Coming up up first.
- **Colour:** an upcoming function must not be charcoal (live) or amber (attention).

Full record: [evidence.md](evidence.md), "Council round 1".

## Round 2: three designs

All measurements are **Preview**. They were built from snapshots of the implemented app (`baseline/`, real `css/app.css`, bundled fonts, synthetic data) at 390 x 844 unless stated.

| | A: Fill the gap | B: The run-up | C: Tell everyone once |
| --- | --- | --- | --- |
| Central idea | One quiet Next function line in the band's place on band-empty days, and under Your day on Home | The week as a day strip on Home; each milestone (order, prep ahead, service) inside the page where that work happens | A once-per-person heads-up card on Home with every fact and Got it |
| Smith 60th on Home (was 998 px, off screen) | 413 px | 211 px | 218 px |
| Taps to time, guests, platters, dietaries | 1 from Home or Prep | 1 from Home or Prep | 0 from Home until Got it; 1 from Prep |
| Prep rows at 390 (6 before) | 5 on band-empty days | 5 before the day before; 4 the day before | 6 |
| Band changes | Fills its empty days | Loses its Order and Tomorrow lines | None |
| New reads, writes, rules | None | None | None (phase 2 receipts would need rules) |
| Build size | 1 to 2 pull requests | 3 | 1 (3 with the bell and receipts) |
| Needs the head chef's OK | Line above On with you; one Prep row | Band change (22 Oct decision); strip above Your day | Card above Your day; bell dot meaning |
| Spec | [design-a/spec.md](design-a/spec.md) | [design-b/spec.md](design-b/spec.md) | [design-c/spec.md](design-c/spec.md) |

How they differ structurally:

| | A | B | C |
| --- | --- | --- | --- |
| Where upcoming lives | One line in a fixed slot on every page | Spread across Home, Prep and Orders by milestone | One card on Home, and the bell |
| Disclosure | Always visible, tap for the sheet | A strip to scan, tap a day to open in place | Everything visible until acknowledged |
| Interaction | Passive, minus to hide for the day | Browse by day | Got it per person |
| Band | Extended | Reduced | Unchanged |

### Scores (1 to 10)

| Reviewer | A | B | C | Ranking | Recommended |
| --- | --- | --- | --- | --- | --- |
| Cook mid-service | 6 | 4 | 8 | C, A, B | Mix: C card under Your day, A's line, B's Orders tag |
| Head chef | 7 | 4 | 6 | A, C, B | A + C's card collapsing to A's line |
| Skeptic | 7 | 4 | 5 | A, C, B | A, in two pull requests; B's Orders words later |
| New starter | 6 | 5 | 7 | C, A, B | The same mix as the cook |
| Keeper of the book | 7 | 4 | 5 | A, C, B | A + B's open-only rule + B's Orders tag |
| Screen designer | 6 | 5 | 7 | C, A, B | The same mix as the cook |
| **Total** | **39** | **26** | **38** | | |

Full answers: [council-round-2-scores.json](council-round-2-scores.json).

**Disagreement:**
- The skeptic and the keeper preferred pure A and would leave out C's card. They argue it adds a tap per function and a second way to put something away.
- The cook, new starter and screen designer preferred C's 0-tap card, but only placed under Your day, and only if it turns into A's line so a reflex Got it does not lose the function.
- Everyone rejected B's band change and B's strip.

### Contract fit (summary)

- **Surfaces:** works in all three. Quiet reference paper, never charcoal for upcoming, never amber.
- **Staff-first Home:** all three depart from it. A departs least (On with you +71 px). C and B put new things above Your day.
- **Service continuity:** A and B need work (one Prep row). C works on the work pages.
- **Band decision:** B departs from the 22 Oct decision.
- **Existing issue found:** the existing Order tag style is 4.04:1 on paper (B, measured).
- **Not evidenced anywhere:** focus rings, dark variants, large text, 360 px, roles. Implemented-app rows also need remeasuring with the stand-in fonts and the head chef's cut-off bar.

### Design references (summary)

- **Things 3** (today distinct from upcoming) favoured A's quiet line and C's card over a full-week band.
- **Flighty** (real dates, no polling, honest stale words) works for all three.
- **Airbnb** (a job's facts together) is strongest in C's card.
- **Duolingo** (immediate, honest answer): Got it must answer in place.
- **Headspace** (plain words) led to "Function this week" in place of "heads-up".
- **Linear** (one name, one place) argued against B's three surfaces.

## The mix

The parts each design gives, and why ([design-mix/spec.md](design-mix/spec.md)):

| From | Part | Take or reject | Why |
| --- | --- | --- | --- |
| A | Next function line in the band's slot on band-empty days | Take | The only way a cook on Prep learns of a function 2 to 7 days out |
| A | `#/fn` Upcoming 7 days; guests on the sheet | Take | Saturday was hidden behind Open functions |
| A | The line on Home | Take, as the collapsed card | Keeps the function on the first screen after Got it |
| B | Draw only when a page opens (open-only) | Take | Rows never move under a finger when a booking or signal changes |
| B | "Not ordered yet · For [day]" on the Orders stock line | Take | Catches a missed function order for 0 px and 0 reads |
| B | Week strip, in-list Prep lines, band without Order and Tomorrow | Reject | Duplicates, extra surfaces, and loses warnings on other pages |
| C | Heads-up card with every fact and Got it, under Your day | Take | One clear attention moment per person, 0 taps |
| C | Bell dot, receipts, card above Your day | Reject | Overloads the bell, needs rules, breaks staff-first |

Measured (Preview, 390 x 844):

| | Baseline | A | Mix |
| --- | --- | --- | --- |
| Smith 60th on Home | 998 px, off screen | 413 px | 437 px on the card; 413 px after Got it |
| Your day | 169 px | 169 px | 169 px |
| On with you | 389 px | 460 px | 737 px until Got it (0 of 5 coworker rows on screen); 460 px after |
| Prep rows | 6 | 5 | 5 (6 once hidden for the day) |
| First Prep row through a booking, no signal, midnight, cancel | | not designed | 313 px, unchanged in 16 checks |
| Taps to the details from Home / Prep | 1 after a scroll / 2 | 1 / 1 | 0 until Got it, then 1 / 1 |

**Focused review of the mix:** all six said **Endorse with changes**. The mix scored 8.5 from the cook and 8 from the others, against their best single design (A for the head chef, skeptic and keeper; C for the cook, new starter and screen designer). Full answers: [council-mix-review.json](council-mix-review.json).

## Break-it findings

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| After the first Got it, the slip at the bottom covers part of the next card's Got it | **Reproduced** in the mix preview (all six) | Fixed in the revision: Got it answers inside the line |
| A long name cancelled while Prep is open is clipped inside the fixed slot, cutting "Do not prep"; worse with large text | **Reproduced** in the mix preview (cook, skeptic) | Fixed in the revision: status words first on one line, name shortened, slot sized at open for the tallest words |
| A shared tablet left on Prep never shows a same-day booking's full band (open-only holds it) | Risk, not evidenced | Revision: a function today breaks the lock |
| Home redraws its slots live, so a new card could push On with you down mid-read | Risk, from source (`homePaint()`) | Revision: the same open-only rule on Home |
| One person's minus hides the line for the next person on a shared device | Risk, not evidenced | Revision: own key `lk.fn.ahead.fold`, reset on a new person |
| A busy week (3 to 6 functions) means a Got it each | Risk, not drawn | Revision: one combined card for 3 or more |
| Midnight: Next line to Tomorrow band, both or neither | Risk, not evidenced | Click test at 23:59:30 and 00:00:30 Queensland, separate from the 04:00 unlock |
| A function cancelled while a phone has weak Wi-Fi stays on the line | Risk, not evidenced | Same exposure as the band today; test the listener's cancel path |
| B: an order day with no band line on Recipes, Wastage and Transfers | Risk | B rejected |

## Revisions and re-check

The mix preview was revised after the focused review ([design-mix/spec.md](design-mix/spec.md), "Revisions after the focused review"). The four reviewers who raised faults then re-checked it with their own probes. All four said **Endorse with changes**: the cook, skeptic and keeper gave 8.5, the new starter 8. Full answers: [council-mix-recheck.json](council-mix-recheck.json). All figures are Preview.

| Change | Re-check |
| --- | --- |
| Got it answers inside the line ("Got it. Kept here as one line", Undo in the line); no bottom slip | **Fixed and checked** at 390 px, default text: the next card's Got it and Open the function were clear at 9 of 9 tap points |
| The work-page slot puts its status words first on one line, shortens the name, and is sized at open for its tallest words | **Fixed and checked**: 36 to 45 probe runs, names of 37 to 60 characters, three text sizes, while booking, no signal, midnight and cancel. The list moved 0 px and the status words were whole |
| A function today breaks the lock; Home uses the same open-only lock; an "open" is a route change, back on screen, PIN unlock or reload | **Fixed and checked** in the preview. The real `paint()` path is not evidenced |
| One card for 3 or more functions in a week | **Fixed and checked**: 308 px for 3 and 414 px for 5. On with you is back at 460 px after the one Got it |
| "Function this week" and "Function tomorrow"; a chevron on the line | **Fixed and checked**. The chevron is only partly shown on work pages |
| The minus has its own key (`lk.fn.ahead.fold`) and resets for a new person on a shared device | **Fixed and checked** in the preview |
| "Cancelled · Do not prep" stays until the function's date passes, for everyone | **Fixed and checked** in the preview |

**Repairs still needed before build** (found in the re-check):

1. **Allergens on the busy card.** It shortens dietaries to "4 GF, 1 nut", which drops "allergy" (skeptic and new starter; seen in the preview). Show the notes as typed, cut with an ellipsis only at the end, and add a safe-text check. Dietaries are free text in `f.notes`.
2. **Double tap.** At 360 and 375 px with large text, a double tap on the first Got it also puts away the next function, because the next card's Got it slides under the finger (cook, **Reproduced**). Ignore Got it on a card that appeared in the last 600 ms, and test at 360 px.
3. **Large text.** The next card's Got it sits partly under the tab bar (skeptic and new starter, **Reproduced**; the spec's earlier "nothing over them" is corrected). Scroll it clear.
4. **A same-day booking.** It drops the Prep list 66 px on purpose, so a tick in flight can land a row high (skeptic and keeper, Reproduced in the preview). Draw the band once the finger lifts, and add a click test that ticks at the moment of the draw.
5. **Got it and a change while Home is open.** A change that arrives while the card is frozen is lost for that person, because the Got it stamp is later than the change (keeper, Risk from the spec). Stamp Got it with the version the card showed, not the time of the tap.
6. **Small ones:**
   - Prune `lk.fn.hu` when a page opens, not on every Home paint.
   - A cancelled long name loses its date at 390 px. Keep the day.
   - At 360 px with large text the date and the no-signal time are shortened. 360 px is outside the contract widths, but check it.
   - "Kept here as one line" may be abstract for a second-language reader. Test "Now one line here".

Still **Not evidenced**: the click tests on the app's real `paint()` and listener (booking, no signal, 23:59:30 to 00:00:30 Queensland, cancel, two staff on one tablet), the implemented-app measurements at 390, 768 and 1280 px with the stand-in fonts and the head chef's cut-off bar, focus rings, dark variants, roles, and a walk-through with a new starter.

## Chosen

**10 November 2026, the head chef chose the mix** (recorded in [head-chef-decisions.md](../head-chef-decisions.md)):

1. **Design:** the mix, as previewed in `design-mix/` after the revision.
2. **Prep line:** keep it for everyone on the work pages on days the band would be empty, until the band takes over. The minus hides it for the day on that phone and resets for a new person on a shared device. It does not step aside after Got it.
3. **Function tomorrow card:** everyone sees it once more the day before, even if they tapped Got it on the week card.

Build in the order below, with the six repairs from the re-check, each step its own pull request with a Council line pointing here.

## Questions for the head chef (answered above)

1. Take the mix, pure A, or something else?
2. Home order: the card, and then the line, sit between Your day and On with you. That is a departure from staff-first Home. Until Got it, the team board is off the first screen.
3. One Prep row is lost on days the band would be empty. The minus gives it back for the day. Optionally, the line could step aside for a person who has tapped Got it.
4. Whether people who tapped Got it on the week card also see the Tomorrow card.

## Build plan if chosen (small pull requests, in order)

1. **Work-page line** with the open-only rule, `#/fn` 7 days, guests on the sheet. The header-height click test goes first: a booking, no signal, midnight, a cancel and a same-day booking while Prep is open (repair 4). The head chef reviewer asked for this order because it fixes his Tuesday problem.
2. **Home card** under Your day, collapsing to the line. Includes the busy-week card with dietaries as typed (repair 1), the double-tap guard (repair 2), the large-text scroll (repair 3), the version stamp (repair 5), the per-person Got it key and the shared-tablet test.
3. **Orders "Not ordered yet" tag.**

No new reads, writes, rules or listeners in any step. Each step remeasures the implemented app at 390, 768 and 1280 px.

## Build record

**Step 1, the work-page line (10 Nov 2026, `feat/fn-ahead-line`).** Built as chosen, with the Implemented app checked in the click-test stand-in (`tests/fn-ahead.test.js`, 66 checks at 390, 768 and 1280 px):

- The line fills the band's slot on Prep, Orders, Wastage, Transfers and Recipes on a band-empty day. It is 50 px at 390 px, and the list never moved: through a booking for tomorrow, no signal, a cancellation with a 43 character name and midnight while open, the slot stayed 50 px and the first prep row stayed at 324 px.
- A function booked for today waits until the finger is up, including a touch that turned into a scroll. It then shows the full band (115 px).
- `#/fn` Upcoming looks 7 days ahead, and the sheet's first line has the guests ("guests not known yet" when unknown). This updates the 22 Oct decision, which said no guest count in the kitchen's function views.

**Difference from the preview:**
- **Cancelled line.** With the test machine's wider stand-in font, "Cancelled · Do not prep" was 214 px in a 205 px row 1 at 390 px. Row 1 now says "Cancelled · Thu 12 Nov". "Do not prep:" leads row 2 as a fixed prefix before the struck-through name, so neither is ever cut.
- **Order of states.** A cancelled function now shows from the day before (the prep day), because the band never shows a cancellation before its day. "No signal" replaces only the plain Next function words: a cancellation, order or tomorrow the phone already knows stays on the line.

**An independent code review** (four lenses, each finding verified) found real faults in the first version, all now fixed and tested. The new checks fail on that first version (9 failed of 66) and pass with the fixes (0 of 66):
- `lk-who` was treated as an open. A shared tablet sends it on every Prep tick, so the line could appear mid-service and move the list 50 px.
- A cancellation vanished the day before. No signal hid a known cancellation.
- The slot was rebuilt every 20 seconds (a no-break space never matched the browser's copy), losing focus.
- The minus on changed words swapped in the full band.
- A PIN unlock decided on an empty list.
- A scrolling finger counted as lifted.

On plain main the new file fails 18 of 44.

**Step 2, the Home card (10 Nov 2026, `feat/fn-home-card`).** Built as chosen with the repairs from the re-check, in the Implemented app (`tests/fn-home-card.test.js`, 50 checks at 390, 768 and 1280 px):

- The Function this week card sits under Your day, on the first screen at 390 px with a team saved (the head chef's chosen departure from staff-first Home).
- Got it folds it into the line in the same place, with Undo inside the line. The next card follows.
- The line names the nearest function again once the Got it words go.

The repairs:
1. **Notes as typed.** The "Dietaries" fact is the booking's notes as typed (labelled Notes, since the field holds service and dietary notes), never shortened by rule. The busy card shows them too, cut only at the end of their second line.
2. **Double tap.** A card that appeared in the last 600 ms ignores Got it. A double tap put away only the first card.
3. **Large text.** At extra-large text, the next card's Got it is scrolled clear of the tab bar.
4. **Version stamp.** Got it stores the booking's version the card showed (`upd`), not the time of the tap. A change after that brings the card back marked Changed.

Head chef choices applied: the work-page line stays for everyone; everyone sees Function tomorrow once more.

**The independent review of step 2** used four lenses (state, data, access and layout), and each finding was verified against the code. All the confirmed findings are fixed and have a check in `tests/fn-home-card.test.js` (69 checks):
- **Got it on a tablet or laptop scrolled the page away.** The tab bar is hidden there and measured as the top of the screen.
- **A cancellation or removal while the card was open did not show.** The card now follows the booking's status in place, as words.
- **Any save brought the card back as Changed,** even one that only changed the customer's phone. The mark now keeps what the kitchen saw (`kitchenSig()`). A change inside the busy card shows on its row.
- **"Also this week" was worked out on every paint,** so a booking from another phone could add a row. It is now decided at the open.
- **From 1100 px, Your day and the card drifted apart.**
- **Smaller ones:**
  - "1 of N" restarted after each Got it; it is now "N this week".
  - "in 0 days" showed at midnight.
  - Open the function also changed the page under the sheet.
  - The Got it words could push the page sideways at extra-large text.
  - Focus fell to the top of the page when Undo went.
  - The spoken status kept old words across people.

**Step 3, the Orders tag (10 Nov 2026, `feat/fn-order-tag`).** Built as chosen, checked in the click-test stand-in (`tests/fn-order-tag.test.js`, 45 checks: the rule in node, then staff and chef at 390, 768 and 1280 px and at extra-large text):

- A confirmed function's own stock line on today's list, still to tick, says **Order today** on its order day (`od`) and **Not ordered yet** after it, up to and including the function's day. Not ordered yet adds "For Sat 14 Nov"; chefs also see "· order day was Sun 8 Nov", and their Since badge steps aside on that line, so they see the date once. Staff see no order day (head chef, 10 Nov 2026, in line with the staff age-label decision). Staff see both, so they can tell a chef.
- The tag is the function Order tag's attention tint with ink words: 13.48:1 in the app (the shared tag's orange words are 4.04:1, B's finding; that tag elsewhere is left for its own fix).
- The line is matched by its first id: the order day's line is `fn-<id>`, and every rolled copy keeps `root: fn-<id>` (the rollover does not copy `fn`). Its words must also name the function's day, so a line left from before the function moved to another day gets no tag. Only today's list: the order day's own line on a past day stays unticked once its rolled copy is ticked, so it never shows a tag.
- No tag, never a guess, when the function is not in the list the phone holds (not loaded, removed, cancelled, past), on the Stock changed, Cancelled and Restored lines (their own ids), or on a ticked line.
- It comes from `LK_FN.orderTag()` on the functions listener every phone holds. No new reads, writes, listeners or rules (read budget and roles unchanged).

**Difference from the preview:**
- **The day words have a line of their own** under the request's words, not the start of the who line. A tick changes the who line ("Ordered by Sam 13:59"), so a shared, wrapping line could change the row's height under the finger. Now a ticked line keeps the tag and the day words' room, empty and silent for a screen reader, like the ⋯, until it leaves the list. At 1280 this costs one short line on that row. Dates never break across two lines.
- **Drawn with its row.** The order list is drawn again from the functions listener only when a tag would read differently: the first answer just after the page opens, or a function cancelled or moved, which also changes the order list. A booking edit or a shared-tablet `lk-who` draws nothing (checked: the list element and its rows stay put).
- Chefs see the order day once: their Since badge steps aside on a tagged line. Staff see no order day (head chef, 10 Nov 2026).

On plain main the new file fails 24 of 45; with the change 0 of 45.


## Files

- `evidence.md`, `baseline/`, `capture-baseline.cjs`: the problem and the implemented-app baseline.
- `design-a/`, `design-b/`, `design-c/`, `design-mix/`: each has `spec.md`, the preview pages, `runup.html`, `build.cjs`, `capture.cjs`, `measurements.json` and `shots/`. To view a preview, serve the repo root (`python3 -m http.server` from the repo root), then open `/docs/function-ahead-options/design-mix/home.html`.
- `council-round-2-scores.json`, `council-mix-review.json`: the reviewers' full answers.
