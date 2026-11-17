# Today's team: one break per person, with an optional second

17 November 2026, Queensland. The head chef asked: "On our roster/team today, can we just add a global break time, not having 3 different break times? But still have the option to add a second break time per staff member? In a smart way?" Asked what "global" means, the head chef chose **one break per person** for their whole day (not one per service), with a second break that can be added per person, and a smart default.

**Status: round 1 Build smaller (3 of 5). Round 2: A 18, C 11, B 7 (A first for all six); the combined preview D (A, C's capped default, the designer's phone layout and the new starter's words) reviewed by the designer, the new starter and the skeptic and repaired. Recommendation: D. The head chef chose D, two breaks at most, no Fill (17 November 2026).** Role-based analysis, not research with staff. [Proposal](proposal.md), [evidence packet](evidence-packet.md), [fixture](fixture.cjs), baseline runner [baseline-run.cjs](baseline-run.cjs) and its numbers [measured-baseline.txt](measured-baseline.txt).

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

## Round 2 scores

Six fresh agents ranked A, B and C with the same evidence. Points: 3 for first, 2 for second, 1 for third. Every scorer said the three differ in structure; the skeptic and the cook said A and C are closer to each other than B is to either (C is A's rows plus a bulk fill).

| Reviewer | 1st | 2nd | 3rd | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | A | C | B | A, keeping "No break yet", plus C's staggered + Break default; Fill only in the fold and cleared on Save if wanted |
| Head chef | A | C | B | A with C's spread-apart default on + Break, the reason in words; no Fill |
| Skeptic | A | C | B | A, + Break on the break line, Spread capped at two breaks a person; Fill held as the head chef's question |
| New starter | A | B | C | A, keeping "No break yet", "2nd break 19:00", and Take off words that say what goes |
| Keeper | A | C | B | A; remove the preview's leftovers (the unused Too few helper and its comment); "smart" is the default with its reason in words |
| Screen designer | A | C | B | A with the phone repair: + Break by the name only while there is none, then at the end of the break line; "30 min" without "Length" |

**Totals: A 18, C 11, B 7. A first for all six.**

Leading findings from the scorers:

| Finding | Who | Evidence | Disposition |
| --- | --- | --- | --- |
| B's list re-sorts after a pick: Dev's line drops 157 px and the next tap on Length set Eli's break | Skeptic | **Reproduced** at 390 px | B rejected |
| C's tags and "Check them, then Save" outlast Save; on another day Empty them took away a break Sam had saved | Skeptic, keeper, designer | **Reproduced** (`C-filled-1280.png`, the skeptic's Wednesday) | Fill and the tags not taken |
| Spread on Lunch, All day and Dinner gives Mo 4 breaks (two inside his split) and Dev 3 | Skeptic | **Reproduced** in A | Repaired in D: Spread leaves anyone with two breaks, or a break then, as they were, and names them (`measured-spread.txt`: Mo 2, Dev 2) |
| A's default leaves nobody on All day 15:45 to 16:00 (Mo's split, Dev's break) and nothing warns: All day has no busy time | Head chef, skeptic | **Reproduced** | In D the tap says "(Mo is away then too)"; a busy time on All day would bring the Too few band |
| A drops "No break yet" from the sentence | Cook, new starter, designer | Source, screenshots | Kept in D |
| "Second 19:00" reads as seconds; "taken off Lunch and split 14:30 to 17:00" reads as a split added | New starter | Words | "2nd break 19:00"; "Mo taken off Lunch. Split 14:30 to 17:00 goes too." |
| Phone rows +19 to +24 px in A | All | Measured | D's repair (below) |
| Two breaks with the same start share one picker key | Keeper | Source | Build: merge identical breaks on load, offer only free times; a `team-picker-context` check |
| `measured-after.txt` quoted an older Fill message | Four scorers | Stale file | Re-run; the file now holds the current words |

## Mix of A, B and C

| From | Part | Take or reject | Why, and the principle |
| --- | --- | --- | --- |
| A | One break line per person, under the bar and the sentence | **Take** (all six) | One place for each job (Linear); the time, the person's day and the break together (Airbnb) |
| A | + Break by the name at all times | Reject in part | Rows grow on a phone; keep it only while the person has no break (designer, skeptic) |
| B | The separate list in time order | Reject (six of six) | Two places for one break (Linear); 1,413 px down a phone; re-sorts under the thumb (reproduced); "Next planned breaks today" already says who goes next |
| B | Rows that never grow | Take as a constraint | Rule 4: the repair keeps a one-break row the height of today's |
| B | "Away with Ari" in orange | Reject | Attention ink for a fact that may be fine; the idiom is unclear to a new starter |
| C | The staggered default on + Break, with its reason | **Take, capped at an hour** | A known default, visible and editable, said in words (Todoist, Duolingo); from the draft already in memory (Flighty). Uncapped, it moved Mo's split 75 minutes into the Lunch rush (found on D) |
| C | Fill their breaks and the SUGGESTED tags | Reject (five of six; the cook would allow it in the fold, cleared on Save) | Saves 8 taps but can save breaks nobody checked; tags outlived Save (reproduced); a rival to Spread |

**All three blended** (A's line, B's list, C's fill) was judged worse than A by all six: one break set in two places, three things to learn, and the Fill risk. The useful blend is **A + C's capped default + the designer's phone repair + the new starter's words**, with B contributing only its "rows must not grow" constraint.

## Combined preview: D, the mix

Lead's synthesis of the scorers' own parts, then repaired after a focused follow-up (below); `window.__ob = 'D'`, the same patch; runners `preview-run.cjs D`, `after-run.cjs D`, `spread-run.cjs`; raw `measured-mix.txt`, `measured-spread.txt`. **Review status: focused follow-up by the designer, the new starter and the skeptic; all three said D beats A; their must-fix items are repaired in the preview. Not re-scored by the whole council.**

- **Each person's break line**, under the bar and the sentence: [Break 15:45 ▾] [30 min ▾] [+ 2nd break], the second reading "2nd break 19:00", a split's length "2.5 h". While a person has no break, **+ Break** sits by their name and the sentence says "No break yet". + 2nd break has the quiet Add a service look, 8 px from the pickers.
- **The service lines** keep the service, Take off and the Section picker. No break controls.
- **+ Break's default**: the middle of their day; a split when one unbroken stretch is 9 hours or more; the next break, the middle of the longest stretch without one; on today's date never a time already gone. When someone else on the same service is on break then, the nearest free time within an hour; else kept, and the tap names them. The tap says it in one sentence: "Mo: split 14:30 to 17:00, an 11 hour day. Not saved yet." / "Dev: break 15:45 to 16:15, the middle of their day. Mo is on break then too. Not saved yet."
- **The sentence warns only for the real mistake**: when nobody else is on that service during the break, "Break 15:45 to 16:15 (nobody else on All day 15:45 to 16:00)". A day with a busy time on every service is also covered by the Too few band, as now.
- **Take off**: a break another service they keep still holds stays; one that goes is said as going ("Mo taken off Lunch. Split 14:30 to 17:00 goes too. Not saved yet. Undo"); Undo puts it back.
- **Spread them** stays per service; it leaves anyone with a break of that kind already, or a break then, as they were, by name ("Left as they were (a break already, or a break then): Gus, Sam, Dev.").
- **Gone:** 6 of the 15 + Break buttons, the per-service break pickers. Not taken: B's list, C's Fill and tags.

| Measure (Preview: stand-in, fallback fonts, admin session, clock 14:00) | Today | A | **D, the mix** |
| --- | ---: | ---: | ---: |
| + Break buttons, 9 people | 15 | 9 | **9** |
| Mo: one tap on + Break | Break 12:15 to 12:45 | Split 14:30 to 17:00 | **Split 14:30 to 17:00**, "an 11 hour day" |
| Dev: one tap | 13:15 (Lunch line) | 15:45, nothing said | **15:45, "Mo is on break then too", and "(nobody else on All day 15:45 to 16:00)" stays in the row** |
| Gus: one tap at 14:00 on the day | 11:15 (already gone) | 11:15 (already gone) | **14:00, "the first time left today"** |
| Mo: split 15:00 and a 2nd break 19:00 | 5 taps, still "(outside their hours)" | 4 | **4** |
| The day at the planner's times, then Save, 1280 | 26 | 26 | **26** |
| The day at the book's times, then Save, 1280 | 21, Too few 19:00 to 19:15 | 21 | **21**, no Too few; the All day gap named |
| Row px, no breaks, Mo / Bea / Gus, 390 | 369 / 207 / 308 | 387 / 226 / 327 | **387 / 226 / 327** |
| Row px, everyone a break, 390 | 413 / 251 / 352 | 436 / 275 / 376 | **438 / 256 / 357** (Mo's longer sentence is the All day warning) |
| same, 1280 | 213 / 159 / 161 | 237 / 133 / 185 | **237 / 133 / 185** |
| Spread on all three services after Mo's split | Mo 4, Dev 3 | Mo 4, Dev 3 | **Mo 2, Dev 1**, the rest named |
| An old day with three breaks on one service | | all shown | **all shown, "2nd" and "3rd break"; no + 2nd break** |
| Sideways scroll, browser errors (390, 768, 1280) | none | none | **none** |

Screenshots: `D-plan-390.png`, `D-rows-390.png`, `D-rows2-390.png`, `D-mo-390.png`, `D-mo-768.png`, `D-day-1280.png`.

**Contract fit:** sage book and paper: Works. Words on every state, "Not saved yet" on every change, Take off and Undo: Works. No orange for a fact: Works (the warning is in words in the sentence, muted ink). Rows with a break the height of today's on a phone, except where the warning adds words: Works. Real contrast, keyboard focus, real fonts, the large text setting: Not evidenced. A failed Save, a lock, a second writer: unchanged code paths, Not evidenced.

### Follow-up on D (designer, new starter, skeptic) and the repairs

| Finding | Who | Evidence | Repaired in the preview |
| --- | --- | --- | --- |
| Mo's split line wraps at 390 ("Split 14:30", "Split 2.5 h", "+ 2nd break") | Designer, new starter | Measured, 468 px | The length reads "2.5 h"; one line; Mo 438 px with the warning, else as Bea |
| "+ 2nd break" looks like a picker, 6 px from it | Designer | Screenshot | Quiet Add a service look, 8 px gap |
| At 1280 Gus's row 210 px: the pickers wrapped before the sentence | Designer | Measured | The sentence wraps first; 185 px |
| The split message is 30 words, says "split" twice | Designer, new starter | Words | "Mo: split 14:30 to 17:00, an 11 hour day. Not saved yet." |
| "away" can read as off work; the clash only shows until the next tap | New starter | Words | "on break"; the row keeps a warning when nobody else is on that service |
| "Break 19:00" in the sentence and messages for a 2nd break | New starter | Words | "2nd break" everywhere |
| Breaks set on the day land in the past (stand-in clock 14:00: Ari 11:30, Cal 12:00) | Skeptic | **Reproduced** (also in A and today's page) | On today's date the default starts at the next quarter hour: "the first time left today" |
| Spread gave Dev a second break nobody chose (Lunch, then All day) | Skeptic | **Reproduced** | Spread leaves anyone with a break of that kind already as they were, by name |
| Nobody on All day 15:45 to 16:00 and the Too few band is silent (All day has no busy time) | Skeptic | **Reproduced** | Named in the row; the head chef can also give All day a busy time of 1 (Admin, Kitchen, Shifts), no new code |
| "Sam and Eli and Ivy and Jo" | Skeptic | Words | Commas: "Sam, Eli and Ivy" |
| A quick second tap on + Break | Skeptic | **Checked**: lands on the name block in D, no second break (A added one) | Works |

**Still Not evidenced:** real fonts and contrast on a phone; a held picker under the new keys; two breaks with the same start (the build merges them); a phone on the old code reading a break saved across a service edge.

## Recommendation

**Recommend D, the mix: A's break line on each person, C's spread-apart default capped at an hour, the designer's phone layout and the new starter's words, with Spread capped.** All six scorers put A first (A 18, C 11, B 7) and five asked for C's default on top; the three follow-up reviewers each said D beats A. It does what was asked: one break per person for the whole day, + 2nd break for anyone, and a smart default that says why (a split for a long day, the middle of the day, apart from whoever is on break, never a time already gone). + Break buttons go from 15 to 9; Mo's split comes back; a 15:00 or 14:45 break needs no hunting; the one real mistake (nobody left on a service) is named in the row. Linear (one place for each job), Airbnb (the day, the time and the break together), Todoist (a known default, visible and editable), Duolingo (each tap says what it did), Headspace (one name for each thing).

**Main downside:** it saves no taps on a planned day (26 either way); on a phone a row with no break is 19 px taller (the + Break chip by the name), and about ten test files are rewritten.

**Not recommended:** B's list (two places for one break; it moved under the thumb, reproduced) and C's Fill (saved breaks nobody checked; its tags outlived Save, reproduced).

**Questions for the head chef:**
1. **Choose D?** (Recommended.)
2. **Two breaks at most per person** (old days with three still show all three). Right?
3. **Fill their breaks (one tap for the whole day):** not recommended now. Later, inside "Copy, clear or spread breaks", if you want it?
4. **All day has no busy time**, so the Too few band never covers it. Set All day's people needed to 1 in Admin, Kitchen, Shifts? (A setting, no code.)

## Chosen

17 November 2026: the head chef said "go with D, two breaks max, no fill".
1. **D, the mix** (Recommended).
2. **Two breaks at most** per person per day (Recommended). An old saved day with three still shows all three and each can be changed or taken away.
3. **No Fill their breaks** (Recommended): + Break per person only.

The fourth point (a busy time for All day) is a setting in Admin, Kitchen, Shifts, left with the head chef. Recorded in `docs/head-chef-decisions.md`.

## Build plan (this branch)

One pull request: `js/prep.js` (the break line and its helpers in place of the per-service break pickers and + Break; one service helper for a break; pickers keyed by the person and the break's start with the date; identical breaks merged on load; the default with its words; Take off and Undo; the too-few mark by minutes; Go to <name>'s break to the person's line; Spread capped; Home's "· All day" after a break dropped), `css/app.css`, `docs/design-patterns.md` and `tests/design-patterns.test.js`, `README.md`, `docs/head-chef-decisions.md`; the ten test files that use `tm-addbr`, `tm-at:` and `tm-len:` rewritten, new checks in `team-row-service` and `team-picker-context` (a held picker after a break moves; two same-start breaks; a quick second tap; Spread's cap; a break across a service edge counted by Too few; the past-time rule; a saved day read back unchanged). Remeasure the built app at 390, 768 and 1280 as the admin and as a sous chef on `#/team`. No new read, listener, rule or saved field.

## Built (17 November 2026)

D in the implemented app (`js/prep.js`: `TM_MAXBR`, `tmBrSh()`, `tmBrTimes()`, `tmBrOutside()`, `tmNames()`, `tmBrName()`, `tmBrLen()`, `tmBrDefault()`, `tmBrAlone()`, `tmBrFocus()`, `tmBrAddHTML()`, `tmBrLineHTML()`, `tmOffWords()`; `tmFrom()` merges identical breaks; `tmRemoveShift()` keeps a break another service holds; Spread capped; the too-few mark by minutes; Go to <name>'s break to the break in the short time; Home's break row without a service name. `css/app.css`: `.tm-tlday`, `.tm-brline`, `.tm-brone`, `.tm-braddwho`, `.tm-addbr.is-second`). The preview's Fill, tags and B list are not built. No new read, listener, rule or saved field.

**Implemented app measurements** (stand-in, fallback fonts, admin session unless named, `fixture.cjs`, clock as the stand-in sets it; runner `built-run.cjs`, raw `measured-built.txt`, screenshots `built-*.png`):

| Measure | Today | D preview | **Built** |
| --- | ---: | ---: | ---: |
| + Break buttons, 9 people | 15 | 9 | **9** |
| Mo: one tap on + Break | Break 12:15 to 12:45 | Split 14:30 to 17:00 | **Split 14:30 to 17:00, "an 11 hour day"** |
| Mo: split 15:00 and a 2nd break 19:00 | 5 taps, flagged | 4 | **4** |
| The day at the planner's times, then Save, 1280 | 26 | 26 | **26** |
| Row px, no breaks, Mo / Bea / Gus, 390 | 369 / 207 / 308 | 387 / 226 / 327 | **375 / 223 / 319** |
| same, 768 | 243 / 129 / 186 | 227 / 114 / 171 | **215 / 111 / 163** |
| same, 1280 | 213 / 109 / 161 | 213 / 109 / 161 | **215 / 111 / 163** |
| Row px, everyone a break, 390 | 413 / 251 / 352 | 438 / 256 / 357 | **428 / 256 / 352** |
| same, 1280 | 213 / 159 / 161 | 237 / 133 / 185 | **235 / 130 / 183** |
| Rows wholly in one screen from the first row, 390 / 768 / 1280 | 1 / 4 / 5 | 0 / 4 / 5 | **0 / 5 / 5** |
| Spread on all three services after Mo's split | Mo 4, Dev 3 | Mo 2, Dev 1 | **Mo 2, Dev 1**, the rest named |
| An old day with three breaks for Ari | | all shown | **all shown ("2nd", "3rd break"), no + 2nd break, Save off** |
| A sous chef on `#/team`, 390 | | | **9 rows, + Break works, no sideways scroll, no errors** |
| Sideways scroll, browser errors (390, 768, 1280) | none | none | **none** |

The built rows are a little shorter than the preview's: the service lines lost their empty + Break column. On a phone a row with no break is 6 to 16 px taller than today (the + Break chip by the name); a row with a break is the height of today's or within 15 px.

**Not evidenced:** real fonts on a real phone (the break line fits 390 px by a few pixels in the stand-in's fonts; it wraps, not scrolls, if a font is wider); rendered contrast and keyboard focus rings; the live site until it is merged; a phone on the older version reading a break saved across a service edge (it reads the same `{ id, sh, at, len }`; its words may say "(outside their hours)").
