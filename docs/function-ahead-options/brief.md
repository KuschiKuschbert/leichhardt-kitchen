# Functions ahead of time: council brief

Council for the head chef's question of 10 November 2026: "If there is a function during the week, and I want everyone's attention on it, when does it show exactly, and how can I improve that best?" Design previews only. Nothing in the app has changed.

## Status

- **Round 1 (10 Nov 2026):** Build smaller, 5 of 5.
- **Round 2 (10 Nov 2026):** three designs, A, B and C, scored by six reviewers. The scores were A 39, C 38 and B 26, and B came last with every reviewer.
- **Mix:** five of six reviewers recommended the same narrow mix. It has its own combined preview (`design-mix/`), which all six endorse with changes (8 to 8.5 out of 10). A revision pass fixed the faults they reproduced (see **Revisions and re-check**).
- **Chosen:** waiting on the head chef.

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

To be filled in when the revision pass and the re-check finish.

## Questions for the head chef

1. Take the mix, pure A, or something else?
2. Home order: the card, and then the line, sit between Your day and On with you. That is a departure from staff-first Home. Until Got it, the team board is off the first screen.
3. One Prep row is lost on days the band would be empty. The minus gives it back for the day. Optionally, the line could step aside for a person who has tapped Got it.
4. Whether people who tapped Got it on the week card also see the Tomorrow card.

## Build plan if chosen (small pull requests, in order)

1. **Work-page line** with the open-only rule, `#/fn` 7 days, guests on the sheet. The header-height click test goes first: a booking, no signal, midnight and a cancel while Prep is open. The head chef asked for this order because it fixes his Tuesday problem.
2. **Home card** under Your day, collapsing to the line. Includes the busy-week card, the per-person Got it key and the shared-tablet test.
3. **Orders "Not ordered yet" tag.**

No new reads, writes, rules or listeners in any step. Each step remeasures the implemented app at 390, 768 and 1280 px.

## Files

- `evidence.md`, `baseline/`, `capture-baseline.cjs`: the problem and the implemented-app baseline.
- `design-a/`, `design-b/`, `design-c/`, `design-mix/`: each has `spec.md`, the preview pages, `runup.html`, `build.cjs`, `capture.cjs`, `measurements.json` and `shots/`. To view a preview, serve the repo root (`python3 -m http.server` from the repo root), then open `/docs/function-ahead-options/design-mix/home.html`.
- `council-round-2-scores.json`, `council-mix-review.json`: the reviewers' full answers.
