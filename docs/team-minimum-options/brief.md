# Today's team: warn when too few are in the kitchen, and a minimum for the busy times

15 November 2026, Queensland. Head chef request: "In the today's team admin area, can we have a visual warning when not enough people are in the kitchen, like when too many people are on breaks? And maybe have a setting where chefs can set the minimum chefs for a time frame."

**Status: designs drawn and scored, waiting for the head chef's choice. Nothing in the app has changed.** Round 1 Build smaller (5 of 5). [Proposal](proposal.md), [evidence packet](evidence-packet.md), [previews](index.html) ([A](a.html), [B](b.html), [C](c.html)). Role-based analysis, not research with staff.

## Round 1

**Verdict: Build smaller, 5 of 5.** Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `da18bf7`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | It helps a sous chef move a break at 19:30: "4 in, need 5" in words is a 2-second read against counting 14 lines. No room on a phone: one line, only when short. Put it in the open Breaks details, and add the count to On break now. |
| Head chef | Build smaller | Real, but how often it bites is not evidenced. The cheap win is a count, not a system: the Breaks details as a break is chosen, and "4 left" on the board. One minimum for every day first; weekdays only if it nags on quiet nights. |
| Skeptic | Build smaller | Most of it exists (`tmAwayData()` already groups breaks by person). One warning line in the draft's Save area, the only spot seen on the admin phone's first screen. Never "Covered". No weekdays, board, strip, Home or Spread change. |
| New starter | Build smaller | Say what the plan knows: "on Dinner, not on break" and "need", not "in the kitchen", "cover" (means guests) or "on the floor" (front of house). Draft versus saved must be labelled; no green that reads as Saved. "Can't count yet" when it cannot. |
| Keeper of the book | Build smaller | No new read or listener. The risky part is the stored minimum: the admin's config save overwrites `config/main` whole, so the field must be carried in every save path. Admin-only, beside Shifts, no rules change. One pure count shared by the draft and the board. |

**Cuts all five accept.**
- A warning only. It never stops a Save.
- The head chef sets the minimum, in Admin, Kitchen (`config/main`, the admin's own record, no rules change). Sous chefs do not edit it: that needs a rules change and a second writer.
- One place for the warning, in words, with Draft or Saved plan said.
- Words that claim only what the plan knows: "on Dinner and not on break", "need 6". Not "in the kitchen", "covered", "cover" or "on the floor".
- Never a green "Covered". Unknown (loading, failed, stale, no hours set) says it cannot count.
- No day strip, no Home card, no change to Spread them (its contract allows no saved setting), no sous-chef editing.

**Disagreement.**
- *Where the one warning goes:* the Breaks details, where the break is chosen (head chef, cook), or the Save area, which stays on screen (skeptic, new starter). The keeper did not choose.
- *A count on On break now:* yes (head chef, cook); no (skeptic); only if clearly labelled saved, as two counts confuse (new starter).
- *Per weekday:* yes (cook); later, if it nags on quiet nights (head chef); no (skeptic).

**Break-it findings from round 1** (scenario, evidence, what to do):

| # | Scenario | Evidence | Repair or check |
| --- | --- | --- | --- |
| 1 | The Save dock hides the On break now board's fourth name on the head chef's phone. Admin 390 px at scroll 0: Sam K's row is at 677 to 694 px, the dock at 680 to 776 px. | **Reproduced** (Implemented app, stand-in, `da18bf7`, [screenshot](baseline-admin-390-first.png)). Not caused by this feature. | Any design that adds to the board or the dock makes it worse. Fix in its own pull request or in the build: the board must end above the dock on the first screen. |
| 2 | Late starters count too early. Dev, Fen and Hal start at 17:00 but sit on Dinner 15:00 to 21:00: a 15:00 to 17:30 minimum counts them and stays silent. | **Risk / Not evidenced** in the app; true of the count by design (`core.js`). | Words say "on Dinner", not "in the kitchen". The setting says the book has no personal hours. Busy times set inside the hours when everyone on the service is there. Personal hours need a saved field later. |
| 3 | The draft hides a saved shortfall: a break moved in the draft, then Save fails or is not pressed. | **Risk / Not evidenced.** | The board keeps reading the saved plan only. A draft warning says Draft. Test with `?fail=1` and in the stand-in. |
| 4 | Unknown shows as a number: a service with no hours is skipped, so the count reads 0 or nothing. | **Risk**, read in `core.js`. | Reuse `tmAwayData()`'s loading, stale, error and wrong-day states, and add "Dinner has no hours set". |
| 5 | An older admin phone wipes the minimum: its config save overwrites `config/main` whole and does not know the field. | **Risk / Not evidenced** (read in `saveConfig()`, `js/prep.js`). | Carry the field in `clean`, `draftOf`, the draft merge and `DRAFT_PARTS`; a client test that a People save keeps it. The saved shell updates the admin's phone within a day; say so. |
| 6 | A busy time across a service change hides a split saved under the other service. | **Checked** by reading `core.js`: breaks are matched by person, not service. | A node test with that case. |
| 7 | A busy time with From after To, or a minute after midnight before 04:00. | **Risk.** | Refuse From after To in the setting. Outside the day's plan, say nothing. |

## Round 2: three designs

All three keep: the saved shape (`team/<day>` unchanged), the On break now board on the saved plan only, one dated Save, the day grid and the Breaks details as built on 15 November, warning only, words not colour alone, no new read, listener or rule. The minimum is one admin setting in `config/main`. Each design counts the same way (`core.js`): a person is in at a minute when they are on a service whose hours cover it and not on a break that covers it; a person on two services counts once; a short time is a run of minutes below the need inside a busy time. When the count changes inside a short time it says both ("4 to 5 on Dinner").

**A, Where the break is set** (changes the least). The warning lives only in a person's Breaks details, under their break times: "Short while Sam K is away. 18:30 to 19:00: 4 to 5 on Dinner and not on break. Need 6. Also away then: Dev, Fen, Hal. Draft, not saved." When the break is not in a short time it says so plainly, never green. Nothing new on the grid, the board or the dock. **Setting:** a Busy from, to and need on each service in Admin, Kitchen, Shifts.

**B, With Save** (one line for the whole draft). The Save dock, which stays on screen while editing, carries one line only when the plan is short or cannot be counted: "Draft: short 18:30 to 19:00. 4 to 5 on Dinner and not on break, need 6. Away: Sam K, Dev, Fen, Hal." It names how many more short times there are. Nothing when the plan keeps to the need. **Setting:** its own Admin, Kitchen row, Minimum on the plan: any number of busy times, each with a name, from, to and need.

**C, At a glance** (where people already look). The On break now board adds one line from the saved plan: "SHORT NOW · 4 on Dinner and not on break. Need 6." Each service head in the grid says its busy time and need from the draft ("Need 6, 17:30 to 20:30") or the short time ("Short 18:30 to 19:00: 4 to 5 of 6"). A person whose break falls in a short time has "short then" beside their break time. **Setting:** the same row as B.

### How they differ

| Pair | Structural differences |
| --- | --- |
| A and B | Inside one person's details versus the whole day's draft in the dock; seen only when a person is opened versus always on screen while editing; per service busy time in Shifts versus a list of busy times in its own row. |
| A and C | Opened on demand versus at a glance in the column heads and on rows; draft only versus the saved plan now (board) plus the draft (heads); one place versus three. |
| B and C | One line versus spread across the board, heads and rows; draft only versus saved now plus draft; the dock grows versus the heads grow. |

### Measured on the previews

**Preview**, not the app: [`verify.cjs`](verify.cjs), raw [`verify-abc.json`](verify-abc.json). Static pages in this folder with the book's `css/app.css`, an imitation of the admin shell, made-up data, headless Chromium, fallback fonts, kitchen clock 18:30, 390 x 844 unless stated. The imitation shell is shorter than the app's, so first-screen positions are indicative only.

| Measure | Baseline (app) | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Find the short time and who is away (taps) | 1, then read 14 lines and count | **1** to 9 (open the right person; nothing says which) | **0** | **0** |
| Short time in words on the first screen, admin 390 / sous chef 390 / admin 1280 | none | no / no / no | yes / yes / yes | no (board line under the dock) / yes / yes |
| Fix: move Sam K's break to 19:30 and Hal's to 19:00, Save | 7 | 7 (1 + 6) | 7 | 7 |
| What it says after the fix, before Save | nothing | "This draft keeps 6 or more on the plan then. Draft, not saved." | the line goes | heads go back to "Need 6"; the board still says SHORT NOW until Save (saved plan) |
| Person rows in the working screen, admin 390 / sous chef 390 / 1280 | 6 at admin 390 (app, the 15 Nov two-service day, [implemented.json](../team-sections-options/implemented.json)); not measured on this day | 7 / 7 / 9 | 6 / 6 / 9 | 6 / 6 / 9 |
| Save dock height, 390 px | 96 px (app, this day) | 98 px | **159 px** | 98 px |
| Saved plan loading | n/a | "Can't check the minimum yet: the saved plan is not ready." | "Minimum not checked: the saved plan is not ready." | Board: "Count now: not known until the saved plan is checked." Heads: "Need: not checked yet" |
| No minimum set | n/a | "No minimum set for Dinner. The head chef sets it in Admin, Kitchen, Shifts." | nothing | nothing (heads as today) |
| Sideways scroll, page errors | none | none | none | none |
| Setting, Admin Kitchen page height at 390 | n/a | 1,255 px (inside Shifts) | 1,438 px (own row) | 1,458 px (own row) |
| New reads, listeners, rules | | none | none | none |
| Build size (estimate) | | 1 pull request, smallest | 1 | 1, largest (three places) |

Screenshots: first screen [A](a-admin-390.png), [B](b-admin-390.png), [C](c-admin-390.png); working screen [A](a-working-390.png), [B](b-working-390.png), [C](c-working-390.png); the find task [A](a-find-390.png), [B](b-find-390.png), [C](c-find-390.png); after the fix [A](a-fixed-draft-390.png), [B](b-fixed-draft-390.png), [C](c-fixed-draft-390.png); sous chef [A](a-team-390.png), [B](b-team-390.png), [C](c-team-390.png); 1280 [A](a-admin-1280.png), [B](b-admin-1280.png), [C](c-admin-1280.png); states (loading, quiet day, no minimum) `<design>-loading-390.png`, `-quiet-390.png`, `-nomin-390.png`; the setting [A](a-kitchen-390.png), [B](b-kitchen-390.png), [C](c-kitchen-390.png).

Taps to set "Dinner rush 17:30 to 20:30, need 6" (counted from the drawn forms, not exercised): A, open Shifts, Busy from (2), to (2), need + 6 times, Save: 12. B and C, open the row, Add a busy time, type a name, from (2), to (2), need + 6 times, Save: 14. A number box instead of the stepper would save about 5 in each.

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose | Works: inside the reference-paper details panel | Works: inside the paper Save dock | Needs work: a count line on the charcoal live board must stay the saved plan; heads are paper |
| State meaning | Works: orange words with a word "Short" and an orange edge, Draft or Saved said | Works: orange "Draft: short" in words | Works for heads; the board's SHORT NOW in `--bar-accent` with words |
| Words without colour | Works | Works | Works; the grid head is hidden from screen readers in the app, so C repeats its words once in a hidden status line (Not evidenced with a reader) |
| Real contrast | Not evidenced | Not evidenced | Not evidenced |
| Relevant states | Loading, no minimum, quiet day, saved/draft shown; failed Save Not evidenced | Loading, quiet day shown; failed Save Not evidenced | Loading, quiet day shown; failed Save Not evidenced |
| Service continuity | Works: no row lost (7 rows) | Needs work: the dock grows 61 px, one row lost (6) | Needs work: taller heads, one row lost (6); board line hidden by the dock on the admin phone |

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: one place, work first | Works: one place | Works: one place | Needs work: three places |
| Flighty: now and next, real times | Needs work: only for the opened person | Works: next short time, real times | Works: now on the board, the plan in the heads |
| Airbnb: who, when, how many together | Works inside the details | Works: when, how many, who in one line | Needs work: spread across heads and rows |
| Things 3: frequent visible, occasional tucked | Needs work: the warning is tucked | Works | Works |
| Headspace: plain words | Works | Works | Needs work: "short then" is terse |
| Duolingo: honest feedback | Works: Draft or Saved plan | Works: Draft or Saved plan | Works: board saved, heads draft (two meanings) |
| Todoist: known defaults visible | Not relevant | Not relevant | Works: each head shows the need |

## Round 2 scores

Six fresh agents (the five reviewers and the kitchen screen designer) read this brief, the evidence packet and the screenshots; the skeptic and the designer also ran the previews. Points: 3 for a first place, 2 for a second, 1 for a third.

| Reviewer | First | Second | Third | Recommendation |
| --- | --- | --- | --- | --- |
| Cook mid-service | A | C | B | A plus C's board line, once the board ends above the dock and past short times are dropped |
| Head chef | B | A | C | B's dock line plus A's setting; fix finding 1 in the same build |
| Skeptic | B | A | C | B's line capped, plus A's setting; nothing on the board; no all-clear line |
| New starter | B | C | A | B, plus A's line in the details, with plainer counts |
| Keeper of the book | A | B | C | A; add B's words if the head chef wants it found with 0 taps |
| Kitchen screen designer | B | A | C | The lean blend: B's line cut short, C's mark beside Breaks, A's setting |

**Totals: B 15 (4 firsts), A 13 (2 firsts), C 8.** All six say the designs differ structurally. All six reject a blend of all three: four places for one fact, saved and draft counts side by side, two rows lost.

**What each reviewer took and rejected.**
- *A's setting* (a busy time and need beside each service in Shifts): taken by the head chef, skeptic, keeper and designer. No name to make up, cannot cross two services, 12 taps against 14; a picker or number box instead of the stepper saves about 5.
- *A's line in the details*: taken by the cook and the new starter (the answer where the break is moved). Its all-clear ("keeps 6 or more") is rejected by the skeptic and the designer: it misleads on a half-done fix (Break-it below).
- *B's dock line*: taken by the head chef, skeptic, new starter and designer, and its "Draft" or "Saved plan" first word by the keeper. Rejected by the cook: three lines over the list, the board cut to one and a half names.
- *C's board line*: taken by the cook only. Rejected by five: a second meaning on the charcoal board, under the dock on the admin phone, and the board hides itself when nobody is away.
- *C's service heads*: rejected by all who named them: they lose the "no section" count built on 15 November and change height while editing.
- *C's "short then" beside Breaks*: taken by the designer and liked by the new starter (it says whose break to open); the cook and new starter find the words too terse.

**Contract fit and contrast** (designer, measured on the previews): the warning words pass, A 5.59:1, B 5.27:1, C's board line 5.77:1 (`--bar-accent` on charcoal). No motion; no target under 44 px. Not evidenced: 768 px, the real app shell, a screen reader.

### Break-it findings from round 2

| # | Scenario | Evidence | Disposition |
| --- | --- | --- | --- |
| 8 | **A, half-done fix.** Only Sam K's break moves to 19:30. Still short 18:30 to 18:45 (5 of 6), but Sam K's details say "This draft keeps 6 or more on the plan then" and nothing else warns. | **Reproduced** by the skeptic on the A preview ([screenshot](breakit-a-partial.png), [script](breakit.cjs)). | No all-clear line anywhere. The mix keeps the whole-draft line on screen. **Checked** in the mix preview: "Draft: short now until 18:45. 5 on Dinner and not on a break. Need 6." |
| 9 | **B, five away with long names.** The dock grows to 196 px and covers all four board names; visible rows drop from 5 to 4. | **Reproduced** by the skeptic ([screenshot](breakit-b-long.png)). | The mix's line carries no names (the rows are marked instead). |
| 10 | **Quiet night** (3 on Dinner, need 6). A blames a break ("Short while Sam K is away") for a short roster; with the breaks moved out, B says "Away: .". | **Reproduced** by the skeptic. | Say a short roster as such: "Only 3 on Dinner, fewer during breaks. Need 6." **Checked** in the mix preview. |
| 11 | **A short time already over.** At 19:30 the only short time (18:30 to 19:00) is past, but all three still warn. | **Checked** by the cook in node and the code. | Today counts from the kitchen clock on. **Checked** in the mix preview (`?at=1170`): nothing shown. |
| 12 | **Failed Save.** | **Checked** by the skeptic on all three previews (`?fail=1`): the draft is kept and says Not saved. | Repeat in the stand-in. |
| 13 | **The dock line or the marks change with the minute.** Counting from now means a short time can end while the chef is editing: the line changes and a mark disappears, so a row can shrink under a thumb. | **Risk / Not evidenced** (keeper, from the code: B's `sp[0]` and the minute repaint). | Repaint them only on the existing draw paths and the clock repaint that already updates status slots, never while a picker is open; the Save button stays put (the dock grows upward). A client test with the clock crossing a short time's end. |
| 14 | **`shClean()` drops fields it does not know**, so a busy time on a service is lost on the next Shifts save; and the admin's whole-record config save already drops other fields (keeper, read in the source, not reproduced). | **Risk / Not evidenced.** | Carry the busy time in `shClean()`, `draftOf()` and `saveConfig()`; a node test and a client test that a People save keeps it. Check the other fields in their own fix pull request. |

## Mix of A, B and C

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A, busy time and need on each service in Shifts | **Take**, with pickers (15-minute steps, need 1 to 20) | Todoist (known default visible), Linear (one shape) | Set once beside the hours it belongs to; 8 taps; cannot cross services | `shClean()` and every save path must keep it (finding 14) | Head chef, skeptic, keeper, designer |
| A, the line inside Breaks details | **Reject** | Linear (one place) | The dock line is on screen while the break is moved, so the answer still comes at the tap | Its all-clear misleads (finding 8) | Skeptic, designer; cook and new starter disagree |
| B, one line in the Save dock | **Take**, cut short: no names, "Draft" or "Saved plan" first, only when short or not checked, today from now on | Flighty (real times), Duolingo (honest), Linear | 0 taps to find; catches a half-done fix | Dock grows 43 px (not 61); finding 1 must be repaired | Four of six |
| B, "Away: names" in the line | **Reject** | Airbnb (who and when together, but on the rows) | The rows carry the names | Long names grow the dock (finding 9) | Designer, skeptic |
| C, the mark beside Breaks | **Take**, worded "away when short" | Airbnb (who, beside the control to tap) | Says whose break to open: no hunting (A's 1 to 9 taps) | A mark can come and go with the clock (finding 13); a second line on those rows | Designer; new starter liked the idea |
| C, the board line | **Reject** | Flighty (no confusing status), Duolingo (one meaning) | | Saved count beside a draft line; hidden under the dock on the admin phone; hidden when nobody is away | Five of six |
| C, the service heads | **Reject** | Linear | | Loses the "no section" count; heads change height | All who named them |

**Why not all three:** four places for one fact, a saved count beside a draft count, and two rows lost. **Why not pure B:** it names people in the dock (finding 9) and leaves "whose break do I open?" to the chef. **Why not pure A:** nothing shows until the right person is opened, and its all-clear can hide a half-done fix.

## Combined preview

[The mix](mix.html) ([its setting](mix.html?page=kitchen)). **Preview**, the same frame, data and conditions as A, B and C; raw [`verify-mix.json`](verify-mix.json).

- **The Save dock line**, only when the plan is short or cannot be checked: "Saved plan: short now until 19:00. 4 on Dinner and not on a break, then 5 from 18:45. Need 6." After an edit the first word is "Draft". A later short time adds "1 more short time later." No names.
- **The mark** "away when short" under the Breaks words of each person away during a short time still to come (today: Sam K, Dev, Fen, Hal).
- **The setting** in Admin, Kitchen, Shifts: under each shift's hours, Busy time from, to and need, each a picker.
- Unchanged: the On break now board, the service heads, the Breaks details, Save.

| Measure | Mix | B | A | C |
| --- | ---: | ---: | ---: | ---: |
| Find the short time (taps) | **0** | 0 | 1 to 9 | 0 |
| Whose break to open | **marked on the row** | named in the dock | open each person | marked on the row |
| Fix (move Sam K and Hal) and Save | 7 | 7 | 7 | 7 |
| Half-done fix (only Sam K moved) | "Draft: short now until 18:45. 5 on Dinner and not on a break. Need 6." Dev, Fen, Hal stay marked | says short | **says it is fine** (finding 8) | heads say short |
| At 19:30, the short time over | nothing | still short | still short | still short |
| Quiet night | "Only 3 on Dinner, fewer during breaks. Need 6." | "0 to 3 ... Away: ..." | blames Sam K's break | heads and board |
| Save dock, 390 px | 141 px | 159 px | 98 px | 98 px |
| Person rows in the working screen, admin 390 / sous chef 390 / 1280 | 6 / 6 / 9 | 6 / 6 / 9 | 7 / 7 / 9 | 6 / 6 / 9 |
| Board names above the dock on the first screen, admin 390 / sous chef 390 | 2 of 4 / 4 of 4 | 1 of 4 | 3 of 4 | 3 of 4 |
| The same with the dock's own "Saved 13:00 · Gus" line left out while nothing is unsaved (the notebook head already says it) | 3 of 4 / 4 of 4 | | | |
| Setting "Dinner busy time 17:30 to 20:30, need 6" (counted from the drawn form) | 8 taps | 14 | 12 | 14 |
| Sideways scroll, page errors | none | none | none | none |

Screenshots: [first screen](mix-admin-390.png), [working screen](mix-working-390.png), [half-done fix](mix-halffix-390.png), [quiet night at 17:30](mix-quiet-early-390.png), [sous chef](mix-team-390.png), [1280](mix-admin-1280.png), [the setting](mix-kitchen-390.png), [loading](mix-loading-390.png).
