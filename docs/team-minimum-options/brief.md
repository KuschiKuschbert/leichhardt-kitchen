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
