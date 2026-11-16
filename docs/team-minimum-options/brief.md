# Today's team: warn when too few are in the kitchen, and a minimum for the busy times

15 November 2026, Queensland. Head chef request: "In the today's team admin area, can we have a visual warning when not enough people are in the kitchen, like when too many people are on breaks? And maybe have a setting where chefs can set the minimum chefs for a time frame."

**Status: the mix chosen 15 November 2026 and built (see Chosen and Built at the end).** Round 1 Build smaller (5 of 5); round 2 B 15, A 13, C 8; **recommended: the mix** (B's Save dock line, C's mark on Breaks, A's busy time per shift), reviewed again by four of the six (all Recommend with a change, every change made). [Proposal](proposal.md), [evidence packet](evidence-packet.md), [previews](index.html) ([A](a.html), [B](b.html), [C](c.html), [the mix](mix.html)). Role-based analysis, not research with staff.

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
| B, one line in the Save dock | **Take**, cut short: no names, "Unsaved plan" or "Saved plan" first, only when too few or not checked, today from now on | Flighty (real times), Duolingo (honest), Linear | 0 taps to find; catches a half-done fix | Dock grows 43 px (not 61); finding 1 must be repaired | Four of six |
| B, "Away: names" in the line | **Reject** | Airbnb (who and when together, but on the rows) | The rows carry the names | Long names grow the dock (finding 9) | Designer, skeptic |
| C, the mark beside Breaks | **Take**, worded "break when too few", only for the short time the line names | Airbnb (who, beside the control to tap) | Says whose break to open: no hunting (A's 1 to 9 taps) | A mark can come and go with the clock (finding 13); a second line on those rows | Designer; new starter liked the idea |
| C, the board line | **Reject** | Flighty (no confusing status), Duolingo (one meaning) | | Saved count beside a draft line; hidden under the dock on the admin phone; hidden when nobody is away | Five of six |
| C, the service heads | **Reject** | Linear | | Loses the "no section" count; heads change height | All who named them |

**Why not all three:** four places for one fact, a saved count beside a draft count, and two rows lost. **Why not pure B:** it names people in the dock (finding 9) and leaves "whose break do I open?" to the chef. **Why not pure A:** nothing shows until the right person is opened, and its all-clear can hide a half-done fix.

## Combined preview

[The mix](mix.html) ([its setting](mix.html?page=kitchen)). **Preview**, the same frame, data and conditions as A, B and C, after the focused follow-up below; raw [`verify-mix.json`](verify-mix.json), break-it run [`mixbreak.cjs`](mixbreak.cjs) with [`mixbreak.json`](mixbreak.json).

- **One line in the Save dock**, only when the plan is too few or cannot be checked: "Saved plan: too few now until 19:00. 4 now, 5 from 18:45, 6 needed. Move a marked break." After an edit it starts "Unsaved plan". A later short time adds "Next: 19:45 to 20:15." A short roster says so: "Only 3 on Dinner (0 now with breaks), 6 needed. Add people or move a marked break." The shift is named only when two shifts have a busy time at once. No names in the line. Nothing once the short time is over, and nothing when the plan has enough.
- **The mark** "break when too few" under the Breaks words of each person away in the short time the line names (Sam K, Dev, Fen, Hal). While a Breaks panel is open the marks hold still, so a row never shrinks under a thumb; they catch up on Close details or Save. The line stays live.
- **The setting** in Admin, Kitchen, Shifts: under each shift's hours, Busy time from and to, and People needed then, each a picker. A busy time counts only its own shift's people.
- Unchanged: the On break now board (saved plan), the service heads and their section counts, the Breaks details, Save.

| Measure | Mix | B | A | C |
| --- | ---: | ---: | ---: | ---: |
| Find the short time (taps) | **0** | 0 | 1 to 9 | 0 |
| Whose break to open | **marked on the row** | named in the dock | open each person | marked on the row |
| Fix (move Sam K and Hal) and Save | 7 | 7 | 7 | 7 |
| Half-done fix (only Sam K moved) | "Unsaved plan: too few now until 18:45. 5 now, 6 needed." Dev, Fen, Hal marked | short | **says it is fine** | heads short |
| At 19:30, the short time over | nothing | still short | still short | still short |
| Quiet night (3 on Dinner, need 6) | "Only 3 on Dinner (0 now with breaks), 6 needed. Add people or move a marked break." | "0 to 3 ... Away: ..." | blames Sam K's break | heads and board |
| A Function shift over Dinner | counts Dinner only | counts both | counts both | counts both |
| Save dock, 390 px | 141 px (159 with a second short time or a short roster) | 159 (196 with long names) | 98 | 98 |
| Person rows in the working screen, admin 390 / sous chef 390 / 1280 | 6 / 6 / 9 | 6 / 6 / 9 | 7 / 7 / 9 | 6 / 6 / 9 |
| Board names fully above the dock on the first screen, admin 390 / sous chef 390 | 2 of 4 / 4 of 4 | 1 of 4 | 3 of 4 | 3 of 4 |
| The same with the dock's own "Saved 13:00 · Gus" left out while nothing is unsaved (the notebook head already says it) | 3 of 4 / 4 of 4 | | | |
| Setting "Dinner busy time 17:30 to 20:30, 6 needed" (counted from the drawn form) | 8 taps | 14 | 12 | 14 |
| Sideways scroll, page errors | none | none | none | none |

Screenshots: [first screen](mix-admin-390.png), [working screen](mix-working-390.png), [half-done fix](mix-halffix-390.png), [quiet night at 17:30](mix-quiet-early-390.png), [sous chef](mix-team-390.png), [1280](mix-admin-1280.png), [the setting](mix-kitchen-390.png), [loading](mix-loading-390.png), [long names](breakit-mix-long.png), [many steps](breakit-mix-steps.png).

### Focused follow-up on the combined preview

The combined preview brought in a flow none of the six had seen together (a mark that comes and goes, counting from now), so four of them looked at it again. **Review status: all four Recommend with a change; every change is now in the preview above.** The designer and the head chef did not review it again.

| Reviewer | Verdict | What they found | Done |
| --- | --- | --- | --- |
| Cook (put A first) | Recommend with a change | The mix beats A for the job: A's half-done fix hides a short time, the mix does not, and as sous chef all four board names show. But when a break moves, its two-line mark goes and the row shrinks about 30 px while the panel is open: the next wet tap lands on the wrong pill. Hold the marks while a panel is open. | Marks hold while a Breaks panel is open, catch up on Close details or Save. **Checked** in the preview. |
| New starter | Recommend with a change | "short" of what? "then" reads as after 19:00. "away when short" wraps badly. "not ready" sounds unfinished. "need" wraps from its picker. No next step. | "too few", "4 now, 5 from 18:45", "break when too few", "Loading the saved plan. Busy times are checked after.", "People needed then", "Move a marked break." / "Add people or move a marked break." "Unsaved plan" instead of "Draft", which the break details already use. |
| Skeptic | Recommend with a change | Repairs to round 2 hold. Three new faults, all **Reproduced** on the earlier mix: a quiet night hid the lowest count (0 working at 18:30); two short times marked 7 of 9 rows and gave no time for the second; a Function shift over Dinner counted Cal as on Dinner. | Always the lowest count and when; marks only for the short time named, "Next: 19:45 to 20:15."; a busy time counts its own shift only. **Checked** in `mixbreak.json`. |
| Keeper | Recommend with a change | Repaint the line and the marks on the existing minute, focus and clock paint (`tmAwayPaint()`'s own slots), never `draw()`, never while a picker is open or someone is typing; the next tick catches up. Storing the busy time on each `kitShifts` entry is safer than a separate field: `kitShifts()`, `recTeam()` and the roster reader read only their own keys, no nightly script reads it, the sous chef save never sends it; only `shClean()` drops it. | In the build contract below. |

The keeper's test: a draft edit at 18:59, the clock past 19:00, then the line and marks are gone, the Save button and inputs are the same nodes, the draft is kept and no read was made. It must fail on the old code.

## Recommendation

**Recommend the mix: B's line in the Save dock (short, "Saved plan" or "Unsaved plan" first, only when too few) + C's "break when too few" mark on the Breaks button of the people away then + A's busy time and people needed on each shift in Admin, Kitchen, Shifts. Reject C's board line and service heads, and A's line in the details.**

**Why it beats the alternatives.**
- 0 taps to find the short time, where today it is 1 tap and counting 14 lines by hand, and A needs 1 to 9 taps.
- It says whose break to open. B alone named people in the dock and grew to 196 px with long names; A left the chef to hunt.
- It catches a half-done fix. A told the chef the plan was fine when it was still short.
- It says nothing once a short time is over, nothing when the plan has enough, and never "Covered".
- The setting sits beside the hours it belongs to: 8 taps, no name to make up, and it cannot cross two shifts.
- No new read, listener, rule or saved record. One new field on each shift in `config/main`, written only by the head chef's admin.
- B led round 2 (15 points, 4 firsts). After the follow-up, the cook and the keeper, who had put A first, both recommend the mix.

**Principles.**
- Flighty: real times, from data already on the phone.
- Airbnb: who, beside the control to tap.
- Linear: one message.
- Duolingo: Saved or Unsaved said, no all-clear.
- Todoist: the need visible beside the shift.
- Headspace: "too few", "6 needed", "Move a marked break".

**Main downside.** On the head chef's phone the dock grows 43 px while the plan is too few, and a row is lost (7 to 6 in the preview). It also leaves only 2 of the 4 board names in view on the admin first screen, where today's app shows 3. Leaving out the dock's duplicate "Saved 13:00 · Gus" while nothing is unsaved brings it back to 3. The sous chefs' `#/team` keeps all 4.

**The count only knows shift hours.** A person counts for their whole shift: a 17:00 starter on Dinner counts from 15:00. Busy times work best inside the hours when everyone on that shift is in. Personal hours would need a saved field and a rules change later.

**Departures the head chef must choose.**
- A new line in Today's team's Save dock and a new mark on the grid rows: new patterns for `docs/design-patterns.md`.
- A new optional field on each shift in Admin, Kitchen, Shifts.
- Spread them is unchanged. It still does not know the need. Round 1 kept its contract.

**Before the build is ready** (Implemented app, not Preview):
1. The On break now board ends above the dock on the admin phone's first screen (finding 1, reproduced in today's app): measure, and leave out the dock's duplicate status line while nothing is unsaved, or another repair.
2. Carry the busy time in `shClean()`, `draftOf()`, the draft merge and `saveConfig()`. A node test, and a client test that a People save and a Shifts save keep it. Leave it out when unset (`tests/todays-team.test.js` checks the exact shift JSON).
3. One pure count shared by the line and the marks, per person, per shift, from now on for today and the whole day for a planned day. Node tests for: a short roster, two short times, a busy time across a split saved under the other shift, a shift with no hours ("Dinner has no hours set"), and From after To refused in the setting.
4. Repaint on the existing paths only, with the hold rule; the keeper's clock-boundary test, shown failing on the old code.
5. Loading, failed, stale and wrong-day reads say "Loading the saved plan" or that it could not check, never a count.
6. Remeasure at 390, 768 and 1280 px in the full app with real fonts, the admin and both chef roles, and a failed Save in the stand-in.
7. Contrast of the line and the mark in the app, both themes.

**Unresolved.**
- How often the kitchen really runs short. The evidence is a made-up day.
- Whether a busy time per shift is enough, or the head chef wants a quieter Monday need (per weekday was split in round 1; later, if it nags).
- The admin's whole-record config save may already drop `proofWords` and `pastEdit` (keeper, read only, not reproduced): its own check and fix pull request, outside this feature.

## Chosen

15 November 2026: the head chef chose the recommendation, the mix ("i take your recommendations for now"), with one busy time for every day; a per-weekday need waits until the warning nags on quiet nights. Recorded in `docs/head-chef-decisions.md`.

## Built

15 November 2026, in this pull request.

**`js/prep.js`:**
- **The setting.** `shBusyHTML()` draws Busy time from and to and People needed then under each shift in Admin, Kitchen, Shifts. `shAdminInput()` keeps the draft. `shClean()` keeps only a whole busy time (`tmBusyClean()`: from before to, 1 to 30 people) and leaves it out when unset. `tmBusy()` reads it. The Shifts row says "(busy 17:30 to 20:30, 6 needed)".
- **The count.** `tmShortOf()` counts the selected day's draft, per busy time, in stretches between hours and break edges. `tmShortNow()` keeps one answer per draft, minute and settings.
- **The line and the marks.** `tmShortLineHTML()` writes the Save dock line. `tmShortIds()` and `tmShortMarkHTML()` give the marks, held while a Breaks panel is open.
- **The repaint.** `tmShortPaint()` runs from `tmAwayPaint()` (the minute, focus and clock paint). It changes only the line, the dock's own saved words and the marks, and waits while a picker is open or a box is typed in.
- **The dock's own words.** `tmShortStateHidden()` steps the dock's "Saved 13:00 · Gus" aside while the line shows and nothing is unsaved.

**`css/app.css`:** `.tm-short-line` (from 1100 px beside Save), `.tm-short-mark`, `.a-sh-busy` (on a phone laid out like the shift's own From and To).

No new read, write path, rule, listener or timer. The busy time is one more field on each shift in `config/main`, written only by the verified admin's existing config save. Older code ignores it, but an older admin phone's config save would drop it until that phone updates (finding 14).

**Departures from the combined preview, kept small:**
- **The count uses saved roster hours.** #712 (merged during this study) saves each person's roster hours with the day's plan. A person counts within those hours where the day has them, and within the shift's hours where not. This answers round 1's finding 2 (a 17:00 starter no longer counts from 15:00). The setting's note says so.
- **A shift with nobody on it says nothing.** A day not planned yet must not warn "Only 0 on Lunch".
- **The busy time uses the shift's own time boxes**, not the preview's pickers, so the row has one kind of time control. People needed then is the book's picker.
- **From 1100 px the line sits beside Save**, so the dock keeps its laptop height.
- **A shift without hours**, with someone on it who has no roster hours, says "Can't check the Dinner busy time: Dinner has no hours set." It never shows a count.

**Implemented app measurements.** Stand-in, the study's made-up day at 18:30, fallback fonts. Before: the same plan with no busy time set, as today. Script [`implemented.cjs`](implemented.cjs), raw [`implemented.json`](implemented.json).

| Measure | Before | Built |
| --- | ---: | ---: |
| Save dock height, admin 390 / sous chef 390 / 768 / 1280 | 96 / 98 / 67 / 67 px | 114 / 116 / 96 / **67** px |
| Person rows in the working screen, admin 390 / sous chef 390 / 768 / 1280 | 6 / 7 / 8 / 8 | 5 / 6 / 7 / 8 |
| On break now names above the dock on the first screen, admin 390 / sous chef 390 | 3 of 4 / 4 of 4 | **2 of 4** / 4 of 4 |
| Find the short time | 1 tap, then count 14 lines | 0 taps: the line is on the first screen at every width |
| Fix (move Sam K and Hal) and Save | 7 taps | 7 taps |
| Contrast of the line's first words and the mark (`--small-ink` on `--surface-paper`, 13 px bold) | | 5.27:1; the rest of the line 15.9:1. The book has no dark theme. |
| Sideways scroll, page errors | none | none |

The extra height and the lost row apply only while the plan is too few. With enough on, or no busy time set, the dock is as before. Screenshots: [admin 390](implemented-admin-390.png), [admin 390 working](implemented-admin-390-working.png), [sous chef 390](implemented-team-390.png), [768](implemented-admin-768.png), [1280](implemented-admin-1280.png), [the setting](implemented-setting-390.png).

**Tests:** `tests/team-minimum.test.js`, 37 checks. It fails at its first check on the old code: there is no busy time setting. It covers:
- the setting: half-chosen, back-to-front, saved whole, the row's words, and kept by a People save;
- the line's words and the marks, and the dock's own words stepping aside;
- a half-done fix, the marks holding while a panel is open, and the full fix and Save;
- the clock passing the end of a short time: the Save button and pickers stay the same nodes, the draft is kept, no read;
- roster hours, and a Function shift that does not count for Dinner;
- a short roster, a planned day, a day not planned yet, and no busy time set;
- two short times, no hours set, and a refused Save;
- a shift name shown as text, never run.

`tests/design-patterns.test.js` has the new class and helper names. Run locally with 26 related files: every team test, `todays-team`, `admin-kit`, `roles`, `safe-text`, `read-budget`, `sticky-bars` and the roster tests. All pass.

**Before ready, from the recommendation:**
1. **Board above the dock on the admin phone: not met in this build.** It was 3 of 4 before (round 1's finding 1). While the plan is too few it is now 2 of 4. Stepping the dock's own saved words aside was not enough, because the warning takes two lines. The sous chefs' `#/team` keeps all 4, and the line itself says the short time in words. Offered to the head chef as its own fix pull request, since the overlap is older than this feature. **Repaired in that pull request: 4 of 4 with and without the line** ([Board above the dock](#board-above-the-dock-16-november-2026)).
2. Carry the busy time through every save path: done and tested.
3. One pure count with node-style cases: done through the page tests above, not a separate node file. `js/prep.js` is not loaded by node.
4. Repaint only on the existing paths, with the hold rule and the clock test: done.
5. Unread or failed plans: the editor, and so the line, shows only once the day's plan has been read. The clock not ready says "Checking the kitchen clock". **Not evidenced in a test.**
6. Remeasured at 390, 768 and 1280: done, above. A refused Save: tested.
7. Contrast: measured, above.

## Merge compatibility, 15 November 2026

Combined with the occasional-shift setting from #711: the shift editor shows both controls, and `shClean()` retains both `occ` and a valid `busy` value. `tests/team-minimum.test.js` now saves both together and checks that a later People save keeps both. Dropping `occ` from the combined save reproduced 2 failures of 38 checks; the corrected save passes all 38. The combined settings were opened with synthetic data at 390, 768 and 1280 px, with both controls present, no sideways overflow and no browser errors.

## Board above the dock, 16 November 2026

The fix for round 1's finding 1 and Before ready item 1, in its own pull request. **Chosen 16 November 2026:** the head chef saw the before and after below and said "okay" (recorded in `docs/head-chef-decisions.md`).

**The fault, remeasured on `main` at `a67f126`** (after the rows on one clock, #721). Implemented app, click-test stand-in, fallback fonts, the study's made-up day at 18:30 with four on a break, the head chef on `#/admin`, Team, Today's team, 390 x 844, scroll 0. Script [`board-dock.cjs`](board-dock.cjs), raw [`board-dock-before.json`](board-dock-before.json).
- With enough on: the dock starts at 680 px; Sam K, the fourth name, sits at 677 to 694 px. 3 of 4 names show ([screenshot](board-dock-before-admin-390-enough.png)).
- While the plan is too few: the dock is 114 px and starts at 662 px. 2 of 4 show ([screenshot](board-dock-before-admin-390-short.png)).
- The sous chefs' `#/team` at 390 (the board ends at 398 px), the chef panel's Today's team at 390 (554 px) and the admin at 768 and 1280 px keep all 4.
- **In the book's own fonts** (Barlow, Barlow Condensed and Caveat from Google, as the phones show them; `board-dock.cjs before-fonts fonts`, raw [`board-dock-before-fonts.json`](board-dock-before-fonts.json)) the board is about 30 px shorter: Sam K ends at 663 px, so 4 of 4 show with enough on, and **3 of 4 while the plan is too few** (dock from 662 px; [screenshot](board-dock-before-fonts-admin-390-short.png)). With five away it is 4 of 5 / 3 of 5. The stand-in fonts differ from machine to machine; GitHub's runner is wider still (the board's fourth name ended at 662 px there with the fix, on the first push of this pull request).

**Why only the admin phone.** Above the board it has the Google account line (54 px), the rooms, a full room heading ("KITCHEN ADMINISTRATION" over a 48 px "Team", 93 px with a rule under it), the page tabs, the notebook head and the date. The chef panel's Today's team already shows the same heading on one line (`.tm-focus-panel`, from the chosen C, 10 November 2026, [brief](../team-page-options/brief.md)), which is why its board ends 151 px higher.

**Quick check (small change: no new tab, button, pop-up or step).**
- *Needed?* Yes. The board is the live answer to "who is away now"; on the head chef's phone the last name was cut by the bar that holds Save, and the too few warning made it worse exactly when the head chef needs the names.
- *Options measured or ruled out:*

| Option | Board names above the dock, admin 390 (enough / too few) | What it costs |
| --- | --- | --- |
| **1. The chef panel's one-line Team heading on the admin's Today's team, phone only** | **4 of 4 / 4 of 4**: the board ends at 602 px in the book's fonts (was 674), 633 px in the stand-in's (was 705) | The room heading is smaller on that one page below 720 px. "Kitchen administration" stays, in small grey words beside Team; Find stays top right. Nothing else moves. |
| 2. The board above the date picker on a phone | likely 4 of 4 / 4 of 4, estimated, not built: the date row is 44 px plus margins, so about 53 px higher and the board's own edge about 10 px above the dock while too few | Changes the order of Today's team (today's live board before the day being planned) and is tight; the admin and `#/team` would differ, or `#/team` changes for no gain. |
| 3. A shorter dock | not reached | The dock's words and its full-width Save are the contract; at 390 px Save cannot sit beside the line without cutting words. |

- *Recommended: option 1.* It reuses a heading the head chef already chose for the same page in the chef panel, so the admin and the chef panel match on a phone, and it frees the most space without hiding a word.
- *Design references.* Linear: one page frame for Today's team in both panels, with the work (the board) above the navigation's fold. Flighty: what matters now (who is away, until when) is on the first screen with real times. Headspace: same words, same names. The rest are not relevant (no new action or step).
- *Contract fit.* Surface purpose: Works, the charcoal board, the paper dock and the sage notebook are unchanged. State meaning: Works, the dock's "Saved plan" or "Saved 13:00 · Gus" and the board's Until times are unchanged. Words: Works, nothing hidden; the heading's small words measure 6.83:1 on the paper (`--muted`, 13 px). Service continuity: Works, see the measures; no tap added, no person row lost (0 on the first screen before and after, the working screen below the heading is the same). Relevant states: enough on, too few, five to seven away and 320 to 720 px measured; loading, refused and planning states keep the same heading and are Not evidenced separately.
- *Try to break it.* (1) **Seven away while the plan is too few** (reproduced, the book's fonts): 6 of 7 names show (7 of 7 with enough on); six away shows 6 of 6. Before the fix it was 3 of 6 and 3 of 7. Seven at once on this kitchen's day is unusual; the line still says the short time in words. In the stand-in's wider fonts six away while too few shows 5 of 6. (2) **A narrow phone** (reproduced): at 320 px Find covered "Team" until the heading kept a Find-wide space on its right; the title now wraps under its small words. No sideways scroll from 320 to 720 px. On a short phone (360 x 740 or 320 x 640) the board is under the dock before and after; the 390 x 844 phone is the one measured here. (3) **The change leaking to wider screens or other pages** (tested): the class is set only on Today's team and its rules sit below 720 px; at 768 and 1280 px the heading on Today's team matches the People page exactly. (4) **A wider font** (reproduced on GitHub's runner): the first version of the check measured in the stand-in's fonts and failed there with the fix in place, the last name ending exactly where the dock starts. The check now loads the book's own fonts, as `tests/todays-team.test.js` does for the top bar.

**Built.** `js/prep.js`: the admin panel gives its shell the class `tm-admin-plan` on Today's team only (`adminHTML()`). `css/app.css`: below 720 px, `.tm-admin-plan` lays the Team heading out like the chef panel's (eyebrow, title and Find on one line, no rule under it, the tabs closer), with room on the right for Find. No read, write, rule, listener or timer.

**Implemented app measurements** (same conditions as above, in the book's fonts and in the stand-in's; raw [`board-dock-before-fonts.json`](board-dock-before-fonts.json), [`board-dock-after-fonts.json`](board-dock-after-fonts.json), [`board-dock-before.json`](board-dock-before.json), [`board-dock-after.json`](board-dock-after.json)):

| Measure, admin at 390 px | Before, book fonts | After, book fonts | Before, stand-in | After, stand-in |
| --- | ---: | ---: | ---: | ---: |
| On break now names above the dock, enough on / too few | 4 of 4 / 3 of 4 | **4 of 4 / 4 of 4** | 3 of 4 / 2 of 4 | **4 of 4 / 4 of 4** |
| The last name ends / the dock starts (enough; too few) | 663 / 680; 663 / 662 px | 591 / 680; 591 / 662 px | 694 / 680; 694 / 662 px | 622 / 680; 622 / 662 px |
| Five away, enough on / too few | 4 of 5 / 3 of 5 | 5 of 5 / 5 of 5 | 3 of 5 / 2 of 5 | 5 of 5 / 5 of 5 |
| Six away | 4 of 6 / 3 of 6 | 6 of 6 / 6 of 6 | 3 of 6 / 2 of 6 | 6 of 6 / 5 of 6 |
| Seven away | 4 of 7 / 3 of 7 | 7 of 7 / 6 of 7 | 3 of 7 / 2 of 7 | 6 of 7 / 5 of 7 |

| Measure, other | Before | After |
| --- | ---: | ---: |
| The dock (height, its words, Save on screen) | 96 or 114 px, all shown | the same |
| 768 / 1280 px: board names, dock height, heading | 4 of 4, 67 to 96 px, full heading | the same, to the pixel |
| `#/team` at 390 px | 4 of 4 | the same |
| Taps for the main task | | unchanged: no control added or moved |
| Sideways scroll, page errors | none | none |

Screenshots in the book's fonts: before [enough](board-dock-before-fonts-admin-390-enough.png), [too few](board-dock-before-fonts-admin-390-short.png); after [enough](board-dock-after-fonts-admin-390-enough.png), [too few](board-dock-after-fonts-admin-390-short.png). In the stand-in's fonts: before [enough](board-dock-before-admin-390-enough.png), [too few](board-dock-before-admin-390-short.png); after [enough](board-dock-after-admin-390-enough.png), [too few](board-dock-after-admin-390-short.png).

**Tests.** `tests/team-minimum.test.js` part 10, measured in the book's own fonts (if they cannot load, the check says so and measures nothing): on the admin at 390 x 844 and scroll 0, every name ends above the dock, and the board's words, the dock's words and Save show, with the too few line, without it, and with six away while too few. At 768 and 1280 px the Team heading on Today's team is the same as on People. On the old code it fails 2 of 49 ("Dev, Fen, Hal": the last name ends at 663 px, the dock starts at 662 px; six away: "Dev, Fen, Eli"); with the fix 0 of 49. `tests/design-patterns.test.js` names `tm-admin-plan`.


## Short phones, 16 November 2026

The head chef asked for a look at shorter phones after Board above the dock went live. **Chosen 16 November 2026:** the head chef answered "Yes go" to A on every phone (recorded in `docs/head-chef-decisions.md`). Built below.

**Measured** on `main` at `0625139`, implemented app, click-test stand-in, the book's own fonts (Barlow, Barlow Condensed, Caveat), the study's made-up day at 18:30 with four on a break, enough on and too few. Script [`short-phones.cjs`](short-phones.cjs), raw [`short-phones-now.json`](short-phones-now.json) and [`short-phones-now-640.json`](short-phones-now-640.json). On break now names above the Save dock at scroll 0:

| Screen | Admin, Today's team | Chef panel, Today's team | `#/team` |
| --- | --- | --- | --- |
| 412 x 915, 390 x 844 | 4 of 4 / 4 of 4 | 4 of 4 / 4 of 4 | 4 of 4 / 4 of 4 |
| 360 x 740 | **3 of 4 / 2 of 4** | 4 of 4 / 4 of 4 | 4 of 4 / 4 of 4 |
| 375 x 667 (iPhone SE and 8) | **0 of 4 / 0 of 4** | 3 of 4 / 2 of 4 | 4 of 4 / 4 of 4 |
| 360 x 640 (a 360 x 740 phone with the browser's address bar) | **0 of 4 / 0 of 4** | 2 of 4 / 1 of 4 | 4 of 4 / 4 of 4 |
| 320 x 568 (iPhone SE, first model) | 0 of 4 / 0 of 4 | 0 of 4 / 0 of 4 | 0 of 4 / 0 of 4 |

At 375 x 667 the admin page has 383 px above the board (the Google account line 58, the rooms 81, the Team heading 41, the page tabs 56, the notebook head 78, the date 53) and about 420 px between the top bar and the dock. A smaller heading cannot free enough.

**Previews** (CSS added to the page only, [`short-phones-a.css`](short-phones-a.css), [`short-phones-b.css`](short-phones-b.css); raw [`short-phones-a.json`](short-phones-a.json), [`short-phones-b.json`](short-phones-b.json), [`short-phones-a-small.json`](short-phones-a-small.json)):

| Option | 375 x 667, admin / chef / `#/team` (enough; too few) | 360 x 740, admin | 360 x 640, admin / chef | What it costs |
| --- | --- | --- | --- | --- |
| **A. The board at the top of Today's team on every phone** (above the notebook title and the date) | 4 / 4 / 4 of 4; 4 / 4 / 4 of 4 | 4 of 4 both | 4 of 4, 3 of 4 too few / 4 of 4 | On a short phone the title, Saved and Refresh, and the date start just under the dock; the sage title band sits under the board. The people rows start 10 px lower. Also changes the 390 x 844 phone. |
| A, only on phones shorter than 800 px | the same | the same | the same | The layout would change when the phone turns or a keyboard resizes the page. |
| B. The board between the title and the date | 2 / 4 / 4 of 4; 1 / 4 / 4 of 4 | 4 of 4 both | not measured | Leaves the admin at 375 x 667 short. |
| Leave it | as measured above | | | Short phones scroll about 100 px to see the board. |

None of these fixes 320 px wide phones: the board's lines wrap there and it is 247 px tall.

**Quick check (small change: no new tab, button, pop-up or step).** Recommended: **A on every phone**. The board is always today and now, so it sits apart from the day being planned, and the date stays directly above the rows it controls. One phone layout, no words hidden, no taps added. Screenshots: [now, admin 375 x 667](short-now-admin-375x667.png); A: [admin 375 x 667](short-a-admin-375x667.png), [`#/team` 375 x 667](short-a-team-375x667.png), [admin 390 x 844](short-a-admin-390x844.png). Contract note: the Current break board pattern keeps the board in the notebook; A keeps it there but moves it above the notebook's head on phones, a departure for the head chef to choose.

**Built.** `css/app.css`: below 720 px, `.tm-focus-page .tm-nbook` puts `away` first in its grid areas (`'away' 'head' 'date' 'week' ...`) and the board takes a `.85rem` top margin. CSS only, one structure: the page's HTML, reading order, reads and writes are unchanged. From 720 px the board stays under the date.

Implemented app, same conditions as above (raw [`short-phones-built.json`](short-phones-built.json)), names above the dock, enough on / too few:

| Screen | Admin, before / built | Chef panel, before / built | `#/team`, before / built |
| --- | --- | --- | --- |
| 412 x 915, 390 x 844 | 4 of 4 both / 4 of 4 both | 4 of 4 both / 4 of 4 both | 4 of 4 both / 4 of 4 both |
| 360 x 740 | 3 of 4, 2 of 4 / **4 of 4 both** | 4 of 4 both / 4 of 4 both | 4 of 4 both / 4 of 4 both |
| 375 x 667 | 0 of 4 both / **4 of 4 both** | 3 of 4, 2 of 4 / **4 of 4 both** | 4 of 4 both / 4 of 4 both |
| 360 x 640 | 0 of 4 both / **4 of 4, 3 of 4** | 2 of 4, 1 of 4 / **4 of 4 both** | 4 of 4 both / 4 of 4 both |
| 320 x 568 | 0 of 4 both / 0 of 4 both | 0 of 4 both / 2 of 4, 1 of 4 | 0 of 4 both / **4 of 4 both** |
| 768 x 1024 | 4 of 4 both, the board under the date / the same | the same | the same |

The board's last name on the admin at 375 x 667 ends at 473 px, the dock starts at 485 px. The people rows start 10 px lower than before at every phone size; taps are unchanged. Screenshots: [admin 375 x 667](short-built-admin-375x667.png), [chef panel 375 x 667](short-built-chef-375x667.png), [admin 390 x 844](short-built-admin-390x844.png).

**Tests.** `tests/team-minimum.test.js` part 11, in the book's fonts: at 375 x 667 and 360 x 740, on the admin page and in the chef panel, all four names end above the dock while the too few line shows; the order is the board, the notebook head, the date, then the rows; the too few line and Save show; no sideways scroll or page error. Part 10 now also checks that at 768 and 1280 px the order stays the notebook head, the date, the board, the rows. **On the old stylesheet: 7 failed of 63. With the fix: 0 of 63.** The team, Today's team, admin, chef panel, Home, roles, pages, sticky bars, safe text, read budget and design pattern test files (58 files) all pass locally.

