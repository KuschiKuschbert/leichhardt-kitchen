# Today's team: one break per person, with an optional second

17 November 2026, Queensland. The head chef asked: "On our roster/team today, can we just add a global break time, not having 3 different break times? But still have the option to add a second break time per staff member? In a smart way?" Asked what "global" means, the head chef chose **one break per person** for their whole day (not one per service), with a second break that can be added per person, and a smart default.

**Status: round 1 Build smaller (3 of 5). Round 2: three designs, scored; see below.** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md), [fixture](fixture.cjs), baseline runner [baseline-run.cjs](baseline-run.cjs) and its numbers [measured-baseline.txt](measured-baseline.txt).

## Why it came up

Since 16 November the roster file cuts each roster time to each service's hours, so a 10:00 to 21:00 cook is on Lunch, All day and Dinner, and the day on one clock (built the same day) gives every service line its own + Break. Measured in the implemented app (stand-in, fallback fonts, admin session):

- **15 + Break buttons** for 9 people; Mo (10:00 to 21:00) has three, one per service, and up to nine breaks.
- A 15:00 break for Mo only works from the All day line (Lunch offers times to 14:30); a break across a service edge (14:45 to 15:15) cannot be set.
- **The long-day split is lost:** + Break on Mo's Lunch line gives "Break 12:15 to 12:45", because no one service is 9 hours long any more.
- Mo's row is 369 px tall on a 390 px phone (`baseline-mo-390.png`).

## Round 1: should we build it?

Five fresh reviewers, the same proposal and evidence packet.

| Reviewer | Verdict | Main reasons |
| --- | --- | --- |
| Cook mid-service | Build (with a condition) | One place to look at 19:30; the split default comes back; Home and On break now read the same saved list. Condition: the default only after + Break is tapped, never pre-filled, never moved by someone else's change. |
| Head chef | Build smaller | A real, daily problem the 16 Nov cut caused (about 4 of 9 cooks); cheap (no read, rule or field); risk at a service edge. Ship one break line and the split fix first; hold "apart from a coworker" until it has had a week of use. |
| Skeptic | Build smaller | The gain is fewer controls and no hunting, not fewer taps (a 15:00 break is 2 taps before and after). The "least harm" optimiser is unspecified and unpredictable; drop it for "the middle of their longest unbroken stretch, a split when that stretch is 9 hours or more". Keep Spread per service. |
| New starter | Build (with repairs) | "Break 13:00" between Lunch and All day says nothing about which it belongs to; one line per person fixes that. Say the default's reason in words; Home's "· All day" after a break reads as "a break all day"; Take off must name the break it takes. |
| Keeper | Build smaller | No reads, listeners, rules or fields; `tmShortOf()` already counts any break by its minutes. But five readers use the saved service (`sh`): one helper must decide it, never in a gap. Keep Spread per service. About 100 per-service keys in 10 test files; the held-picker guard needs a replacement keyed by the break itself. |

**Verdict: Build smaller (3 of 5).** The cook and the new starter said Build, each with conditions that are the same cuts.

**What is cut:** the optimiser (busy-time and coworker-aware default) and Spread for the whole day. **What stays:** one break line per person and + Second break (two at most), times across their whole day inside their own hours (never in a gap), the long-day split back (on one unbroken stretch of 9 hours or more), the default only after a tap with its reason in words, the service worked out by one helper, no change to the saved shape. The head chef asked for "smart": the cut optimiser is named as a question for the head chef in the recommendation, and design C tests a predictable one-tap fill.

**Disagreement:** the cook and new starter would build it as proposed once the default is tap-only and explained. The head chef reviewer would keep a coworker-aware default for later, after a week of use.

### Break-it findings (round 1)

| Scenario (role, state) | Expected | Observed or hypothesis | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| Gus, 08:00 to 15:00 and 17:00 to 21:00 (head chef, laptop): + Break with the 9 hour rule over the whole day | A meal break, as today (11:15) | Hypothesis: 13 hours first to last gives a split 12:30 to 15:00 through the Lunch rush | Risk (skeptic, keeper) | The long-day rule on one unbroken stretch; a check with Gus | Repaired in the previews; checked below |
| A cook on Smoker and Lunch, both 10:00 to 15:00, break 12:30: Take off Smoker (sous chef, phone) | The break stays: they are still on Lunch then | Today the break goes with Smoker and the row reads "No break yet" | **Reproduced** in the stand-in (skeptic, port 8778) | A tie rule (a usual shift before an occasional one); Take off moves a break to another service that holds its start | Repaired in the previews; named in the Take off words |
| Spread from 12:00 for the whole day (planner) | Each service's breaks in turn | Hypothesis: Dinner-only cooks pushed to 17:00 together | Risk, source | Keep Spread per service | Cut |
| A picker held open (Mo's second break) while the first moves after it | The held picker writes only its own break | Hypothesis: breaks numbered by time swap numbers | Risk (keeper) | Key each picker by the break's own start and the date; refuse when it has moved | In the previews; a `team-picker-context` check in the build |
| A break saved by the new code (Mo's split 14:30 to 17:00 on Lunch) read by a phone still on the old code | Same break, same words | Hypothesis: the old phone says "(outside their hours)"; its All day + Break can overlap it; `v` stops overwrites | Risk (keeper) | Open such a day in a test with the current build; release in a merge window | Build check |
| A break crossing a service edge (16:45 to 17:15, saved on All day) and Too few on Dinner | Counted away on Dinner | `tmShortOf()` counts any of the person's breaks by minutes; the "break when too few" mark and Go to <name>'s break match by service | Checked in source (keeper) | Match the mark by minutes; Go to finds the person's break line | Repaired in the previews |

## Round 2: three designs

Built as previews on the real page (`preview-prep.patch`, `preview-css.patch`; `window.__ob = 'A'`, `'B'` or `'C'`; `''` is today's page), the admin panel's Today's team in the test stand-in, the same made-up day (`fixture.cjs`). Runners: `preview-run.cjs` (raw `measured-preview.txt`), `after-run.cjs` (rows once everyone has a break, `measured-after.txt`). **All within round 1's cut:** the saved shape does not change; each break's service is worked out by one helper (`obSh()`: the service whose hours hold its start; a usual shift before an occasional one, then one that also holds its end, then the later start; never in a gap); times are offered across the person's whole day inside their own hours (`obTimes()`); + Break's default is the middle of their day (a second one, the middle of the longest stretch without a break), a split when one unbroken stretch is 9 hours or more, and the tap says what it chose and why ("Mo: split 14:30 to 17:00, a split, as the day runs 11 hours without one. Not saved yet."); two at most; Spread them stays per service; Take off keeps a break that another service they keep still holds, names the break it takes ("Mo taken off Lunch and split 14:30 to 17:00. Not saved yet. Undo"), and Undo puts it back; each picker is keyed by the person and the break's own start, with the date.

### A: A break line on each person (changes the least)

The service lines keep the service, Take off and the Section picker; their break pickers and + Break go. **+ Break** (then **+ Second break**) sits by the person's name. Their break pickers ("Break 13:30", "Length 30 min") sit on one line under the day's sentence. The rest of the room is as built on 16 November. Screens: `A-plan-390.png`, `A-rows-390.png`, `A-mo-390.png`, `A-mo-768.png`, `A-day-1280.png`.

- **Pros:** one place per person, next to the bar and the sentence that already say their day; a new starter cannot pick the wrong service; nothing new to learn beyond where + Break sits.
- **Cons:** on a phone every row is about 19 px taller (the chip by the name is 44 px, the name 25 px), and 24 px taller again once a break is set; a person's break pickers and section pickers are still separate lines.

### B: Breaks in one list, in time order (rethinks the flow)

The rows hold who is on, their hours and sections only: no break controls, so a row never grows. Under the rows, **Breaks, in time order**: one line per person, earliest break first, then "No break yet"; each line has the person's hours, their break pickers, + Break or + Second break, and **"Away with Ari"** when someone else is away at the same time. Plan sections in the rows, then breaks in one pass down the list. Screens: `B-plan-390.png`, `B-list-390.png`, `B-mo-390.png`, `B-mo-768.png`, `B-day-1280.png`.

- **Pros:** rows stay as short as today's with no breaks (207 px on a phone); the list reads as the day's break order, which is how a sous chef thinks on the day ("who goes next"); overlaps are named.
- **Cons:** a second place for the same person; the list sits under 9 rows (a phone scrolls about 2,400 px to reach it); the page grows by 1,413 px on a phone; the bar and sentence in the row are no longer where the break is set.

### C: Fill their breaks, then adjust (removes the most friction)

As A in each row, plus one line above the rows while anyone has no break: "7 people have no break yet. **Fill their breaks**". One tap gives each of them their default, earliest start first, moved to the nearest time when nobody else on the same service is away (a stated rule, not an optimiser); each filled break carries the **SUGGESTED** tag (the Filled for you pattern, `.lk-ftag`) until it is changed; the line then reads "9 breaks were filled for you. Check them, then Save." with **Empty them**. + Break on a person uses the same staggered default. Screens: `C-plan-390.png`, `C-filled-390.png`, `C-rows-390.png`, `C-mo-390.png`, `C-filled-1280.png`, `C-day-1280.png`.

- **Pros:** a whole day of breaks in 1 tap (13 taps with sections and Save, against 21); breaks come out staggered; the head chef's "smart".
- **Cons:** a busy chef can Save breaks nobody looked at (the tag and "Check them" are the only guard); the stagger rule ignores sections and busy times (cut in round 1), so it is predictable but not clever; the SUGGESTED tag adds a line on a phone (Bea 301 px against 251 today); a second default rule to learn.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Where a break is set | In the person's row | In a separate list under the rows | In the person's row |
| Order of work | Person by person | Sections first, then breaks in one pass in time order | Fill everyone, then adjust |
| What the page adds | + Break by each name | A list with "Away with" | A fill line with Fill their breaks and Empty them; SUGGESTED tags |
| Default | Middle of their day | Middle of their day | Middle, moved apart from others on the same service |

### Measured (Preview: stand-in, fallback fonts, admin session, `fixture.cjs`)

| Measure | Today | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| + Break buttons, 9 people | 15 | 9 | 9 | 9 (+ Fill) |
| Mo: one tap on + Break | Break 12:15 to 12:45 (no split) | Split 14:30 to 17:00, with why | same as A | same as A |
| Dev (12:00 to 20:00): one tap | Break 13:15 to 13:45 (Lunch line) | Break 15:45 to 16:15 | 15:45 | 17:00 ("not away with Mo") |
| Gus (08:00 to 15:00, 17:00 to 21:00): one tap | 11:15 | 11:15 (no split over his gap) | 11:15 | 11:15 |
| Break times offered for Mo | 19 on Lunch, 7 on All day | 35 (a split, his whole day) | 35 | 35 |
| Mo: split 15:00 to 17:30 and a second break 19:00 | 4 taps give a 15:45 split "(outside their hours)"; 5 taps for 15:00, still flagged | **4** | **4** | **4** |
| The day: sections and a break each at the planner's times, then Save, 1280 | 26 | 26 | 26 | 26 |
| The day: sections and a break each at the book's times, then Save, 1280 | 21; Too few 19:00 to 19:15 (Gus, Sam, Eli, Fen away together) | 21; no Too few | 21; no Too few | **13**; no Too few |
| Row px, no breaks, Mo / Bea / Gus, 390 | 369 / 207 / 308 | 387 / 226 / 327 | 369 / 207 / 308 | 387 / 226 / 327 |
| same, 768 | 243 / 129 / 186 | 227 / 114 / 171 | 227 / 114 / 171 | 227 / 114 / 171 |
| same, 1280 | 213 / 109 / 161 | 213 / 109 / 161 | 213 / 109 / 161 | 213 / 109 / 161 |
| Row px, everyone a break, 390 | 413 / 251 / 352 | 436 / 275 / 376 | 369 / 207 / 308 | 463 / 301 / 402 |
| same, 1280 | 213 / 159 / 161 | 237 / 133 / 185 | 213 / 109 / 161 | 237 / 133 / 210 |
| Page length of the plan, everyone a break, 390 / 1280 | 2,842 / 1,601 | 3,055 / 1,563 | 3,859 / 1,973 (rows and list) | 3,292 / 1,588 |
| Rows wholly in one screen from the first row, 390 / 768 / 1280 | 1 / 4 / 5 | 0 / 4 / 5 | 1 / 4 / 5 | 0 / 4 / 5 |
| An old saved day, Ari with three breaks on Lunch | | all three shown and changeable, no + Second break | same | same |
| Sideways scroll, browser errors (390, 768, 1280) | none | none | none | none |

The Too few line comes from the existing check (`tmShortOf()`), not from any of the designs: today's per-service defaults put four Dinner people away 18:45 to 19:30; a whole-day default moves Gus's break into his longer Lunch stretch.

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose (sage people book, quiet paper) | Works | Works | Works |
| State meaning (Not saved yet, Saved, failure; orange for attention) | Works: every tap says what it did and "Not saved yet" | Needs work: "Away with Ari" in orange attention ink for a fact that may be fine | Needs work: SUGGESTED is the Filled for you tag (neutral); a Save with unchecked suggestions is not a failure, so nothing warns |
| Words without colour | Works | Works | Works |
| Real contrast, keyboard focus | Not evidenced | Not evidenced | Not evidenced |
| Relevant states (empty, three old breaks, Take off, Undo) | Checked in the stand-in | Checked | Checked; Empty them after an edit: Not evidenced |
| Service continuity (rows, taps) | Phone rows +19 to +24 px | Rows as today, page +1,017 px on a phone | Phone rows +24 to +50 px |
| The 16 Nov "day on one clock" (breaks on each service line) | Proposed change (the head chef asked for it) | Proposed change, and the row no longer sets breaks | Proposed change |

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: one place for each job | Works | Needs work: rows and list both say the break | Works |
| Things 3: frequent visible, occasional tucked | Works: + Second break only after a first | Works | Works |
| Airbnb: time, place and status together | Works: the bar, hours and break on one row | Needs work: the break is away from the bar | Works |
| Todoist: a known default, visible and editable | Works: said in words | Works | Works, with a tag; a whole day at once is more than one default |
| Flighty: what matters now and next from data already read | Not relevant (no new data) | Works: time order is "who goes next" | Works: staggered from the draft |
| Duolingo: each tap answers truthfully | Works | Works | Needs work: "Filled for you" can read as done |
| Headspace: plain words | Works | Works | Works |

### Break-it findings (lead, on the previews)

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| Gus's day over a gap: no split, a meal break at 11:15 | Checked in the stand-in (all designs) | Repaired |
| Mo taken off Lunch with a split from 14:30 (starts in Lunch): the split goes, said by name; Undo puts it back | Checked in the stand-in (all designs) | Works |
| A break that starts in a service he keeps (Dev 15:30 on All day, Lunch taken off): it stays | Checked in source; the Smoker case (skeptic's) needs a stand-in check | Build check |
| An old day with three breaks for one person: all shown and changeable, + Second break hidden | Checked in the stand-in | Works |
| C: Fill, then Save without looking | Reproduced by design (13 taps) | A head chef question |
| A held picker after a break moves: keyed by its own start, refused when it has moved | Source only | Build check (`team-picker-context`) |
| A phone on the old code reading a break saved across a service edge | Not evidenced | Build check, release in a merge window |
