# Today's team: a louder Too few warning, and Accept for today

16 November 2026, Queensland. Head chef request, after the Too few warning was built on 15 November (`docs/team-minimum-options/brief.md`, #713):

- "When there is less than the minimum members on during shift for certain periods, I wanna be able to warn myself or skip and approve or something."
- Asked what he wants when the plan is short, he chose **OK it for the day**: "maybe add live warning before I save like a red bar or something until the problem is resolved? what do other fancy apps do for a warning?"
- Who may OK it: **head chef and sous chefs**. Not chosen: a question at Save, a ping before the busy time.

**Status: round 1 Build smaller (5 of 5); round 2 A 43, C 32.5, B 27 (A first for all six); recommended: the mix (A's band and Accept + C's jump as a link + B's real times in the marks), focused follow-up below. Waiting for the head chef's choice.** [Proposal](proposal.md), [evidence packet](evidence-packet.md), [previews](index.html). Role-based analysis, not research with staff.

## Round 1

**Verdict: Build smaller, 5 of 5.** Five fresh agents read the proposal, the evidence packet and the baseline screenshots (source `main` at `a67f126`).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | The OK earns its place: a warning nobody can answer gets ignored, all day, on every phone. Louder through the words, fact first ("Too few now until 19:00: 4 of 6"), not a bigger red bar: the dock already costs the one full row on a phone. Accept its own 44 px button, away from Save. Keep the marks, plainer, after an OK. |
| Head chef | Build smaller | Real but not measured: the warning is a day old and nobody knows if a busy time is set. Louder is cheap; the OK is the cost. Red would read as Save's own failure line. Make OK a tick sent with the plan's existing Save. |
| Skeptic | Build smaller | The live recount already exists, so "louder" is a restyle. A one-tap OK becomes a reflex. The deliberate case is planning fewer people; overlapping breaks are a mistake. OK the head count only and send it with Save; breaks that drop below it still warn. |
| New starter | Build smaller | "Accepted by Sam K at 14:05" stops a new sous chef undoing a short time left on purpose. "OK" reads as "close this": name what it accepts ("Accept 4 of 6, 18:30 to 19:00"). Show pending, saved and withdrawn in words: "Plan changed: now 3 of 6". |
| Keeper of the book | Build smaller | Only cheap if the OK rides the existing versioned Save: its own write either refuses another chef's draft (it bumps `v`) or is wiped by the next whole-record save. A save for today stamps `config/main.pastEdit`: about 2 reads per open phone, as any team save. Match an OK by "inside the OK'd time, never fewer, the same need"; drop OKs that cover nothing at Save. |

**Cuts all five accept.**
- **Amber, not red.** Red in the Save dock already means "Not saved, try again" (`svFail`), and `--bad-ink` #9B2716 sits close to the attention orange `--small-ink` #B83F15 (1.39:1 between them). Amber with words is the attention family. Red is a departure only the head chef can choose; the previews show it once.
- **Louder means clearer, not taller.** Fact first, real times, the count of the need. Keep the dock near today's 114 px on a 390 px phone.
- **Name what is accepted**, by its numbers and times, not "OK".
- **An acceptance covers only what was accepted.** When the plan gets worse, the warning comes back and says why.
- **"Accepted by" only from the saved record.** Never shown as shared before the server answers.
- **No new read or listener.** One optional field on `team/<day>`, a looser rule published before the client.

**Disagreement.**
- *When the acceptance is sent:* with the plan's existing Save (head chef, keeper, skeptic; the cook accepts 2 taps) or at once with Saving, Accepted or Try again (new starter).
- *What it covers:* the whole short time as shown, minute by minute (keeper) or the head count only, with breaks still warning (skeptic).
- *The marks after an acceptance:* gone (proposal), or kept but plainer so a busy turn can still find the breaks (cook, skeptic).

**Break-it findings from round 1** (scenario, evidence, what to do):

| # | Scenario | Evidence | Repair or check |
| --- | --- | --- | --- |
| 1 | **An acceptance hides a worse plan.** Head chef accepts "Only 3 on Dinner (0 now with breaks)". A sous chef later moves breaks so 0 lasts the whole 18:30 to 19:00. If matched only by the lowest count and the window, it stays quiet. | **Risk / Not evidenced.** The "0 with breaks" line was reproduced in the 15 Nov study fixture. | Match minute by minute: covered only if every minute of the short time sits inside an accepted one at the same or a higher count, with the same need. Client tests with the study fixture. |
| 2 | **Another writer drops it.** An older phone, or the roster's "Save the filled days", writes `team/<day>` whole with `set`, and `teamClean()` keeps only known fields. The loud bar returns with no reason. | **Checked in source** (`teamSave()`, the roster save, `teamClean()`, `teamOk()`). Not reproduced. | Every save path carries the field; `teamClean()` keeps it; a client test for each path. When an acceptance is gone, the words say it ended. |
| 3 | **Its own write costs another chef's work.** If the acceptance is its own write, it bumps `v` and the other chef's open draft is refused. | **Checked in source** (`teamOk()`: `v` must be the stored `v + 1`). | Send it with the existing versioned Save. |
| 4 | **The clock trims today's short time every minute.** At 18:31 the short time starts at 18:31; an exact match would bring the loud bar back inside the accepted time. Stale acceptances pile up against a size cap. | **Risk / Not evidenced** (`tmShortNow()` counts from `T.mins()`). | "Inside" matching; drop acceptances that cover nothing at Save; tests at 18:29, 18:30, 18:31, 19:00, and a planned day that becomes today. |
| 5 | **Rules out of step.** Another pull request republishes `main`'s rules: every Save carrying the field is refused, and the words blame the PIN or signal. | **Risk / Not evidenced.** | Send the field only when not empty; rules emulator rows (a chef with it and `v + 1`, without it, a staff member, an oversized list); a `tests/rules/client-shapes.test.mjs` row; the Lock probe after publishing. |
| 6 | **The accepted name is the phone's word.** The rules cannot check each list entry. | **Checked in source.** | Store the person's id, show the name through `esc()`, a `tests/safe-text.test.js` line. |

## Round 2: three designs

Drawn over a saved copy of the real page (`snap.cjs`: the click-test stand-in, the study's made-up day, Dinner busy time 17:30 to 20:30 with 6 needed, at 18:30): the real top bar, admin tabs, notebook head, On break now board, person rows and Save dock. The previews (`pv.js`, `pv.css`) change only the warning, the marks, the list head (B) and the dock. **Preview** measurements, fallback fonts. Every design uses the attention amber (`--hit` fill, `--small-ink` edge and words: the book's existing attention line, `.su-info-line.attn`), names what is accepted, keeps "Accepted by" to the saved plan, and brings the warning back with a reason when the plan gets worse.

### A: the Save dock, louder (changes the least)

The dock's line becomes an amber band, fact first: "**Too few** now until 19:00: 4 of 6", then "Saved plan. 5 from 18:45." **Accept 4 of 6** sits beside the words (44 px), Save below. Accept goes into the plan: "Accepting 4 of 6 now until 19:00. Not saved yet. Save to share it with the chefs. Undo". Save sends it. Then one quiet line: "**Accepted for today:** 4 of 6 on Dinner now until 19:00. Gus, 14:05." The marks stay, plain grey: "away when too few (accepted)". Worse later: the band returns, "Gus accepted 4 of 6 at 14:05. The plan changed since." [Head chef](a-admin.html), [sous chef](a-team.html); [in red, the head chef's suggestion](a-admin.html?red=1).

- **Pros:** one place, as today; the band is on the first screen and while working; no new place to learn; Accept sits with the fact it accepts.
- **Cons:** the dock grows 33 px (114 to 147) while short; Accept and Save are 2 taps; the person still scrolls to find the marked rows.

### B: on the clock (rethinks where the warning lives)

The short time is drawn where the plan is: on the list head's hours (sticky while scrolling the people), a filled block at 18:30 to 19:00 inside the dashed busy time, with "**Too few** 18:30 to 19:00 on Dinner: 4 of 6" and **Accept 4 of 6** beside it. Each marked person's bar carries the same block outlined, and their mark says "away 18:30 to 19:00, too few". The dock keeps one plain line, "**Too few now until 19:00: 4 of 6.** Saved plan.", and goes back to its old height. Accept goes into the plan; Save sends it. Accepted: the block turns grey hatched and the head reads "Accepted for today: ...". [Head chef](b-admin.html), [sous chef](b-team.html).

- **Pros:** shows where in the day it is short and whose bar covers it (the rostering apps' coverage strip); the dock gets shorter; the warning stays in view while working through rows.
- **Cons:** the sticky head grows 76 px (56 to 132) while short, more than A's dock; Accept is not on the admin's first screen (the list head is below the board), so the main task needs a scroll first; two places say it (head and dock); the head is `aria-hidden` today and must become readable.

### C: one tap (removes the most friction)

The dock band has two actions under the fact: **Show breaks to move** (jumps to the first marked person, outlines the row and puts focus on their break; again for "Next: Dev") and **Accept 4 of 6**, which saves at once: "Saving...", then "Accepted for today: ... Gus, 14:05. Undo". With unsaved changes it reads **Save and accept 5 of 6**. Save stays below for saving without accepting. Marks go after an acceptance. [Head chef](c-admin.html), [sous chef](c-team.html).

- **Pros:** 1 tap to accept from a saved plan; 1 tap to reach each marked break, no hunting; Undo in place.
- **Cons:** the tallest dock (180 px while short, 204 with an unsaved edit); three buttons in the dock; "Save and accept" saves every unsaved change with the acceptance; a mis-tap reaches every phone at once.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Where the warning lives | Save dock | the list head's clock (sticky), plus a pointer line in the dock | Save dock |
| What it shows | words | where in the day, on the clock and on each bar, plus words | words |
| Accept, then | Save sends it (2 taps) | Save sends it (2 taps, after scrolling to the head) | saves at once (1 tap) |
| Finding the break | the marks, by scrolling | the block on each person's bar, by scrolling | Show breaks to move jumps there |
| After accepting | quiet line; marks stay, grey | grey hatched block; marks go | quiet line with Undo; marks go |

### Measured on the previews

Preview, `verify.cjs`, raw `verify-abc.json` and `verify-z.json` (today, measured the same way). Admin 390 px unless named. "List in view" is the height between the sticky list head and the dock on the working screen.

| Measure | Today | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Taps to accept a saved short time, from the first screen | not possible | **2** | 2 + a scroll | **1** |
| Taps to reach the first marked break | scroll and look | scroll and look | scroll and look (the block on the bar) | **1** |
| Save dock while short, admin / sous chef 390 | 114 / 116 px | 147 / 149 | **96 / 98** | 180 / 182 |
| Save dock with an unsaved edit, admin 390 | 114 | 171 | 120 | 204 |
| Sticky list head while short | 56 px | 56 | 132 | 56 |
| List in view, working screen, admin 390 / 1280 | 545 / 648 px | **512** / 636 | 487 / 589 | 479 / 590 |
| Warning on the admin's first screen | yes | yes | pointer line only | yes |
| After accepting: dock, admin 390 | | 142 | 96 | 142 |
| Accept button | | 128 x 44 | 128 x 44 | 150 x 45 |
| Contrast: "Too few" `--small-ink` on `--hit`; the fact and line in `--ink` on `--hit`; Accept `--small-ink` on paper; the accepted line | 5.27 (line on paper) | 5.05; 15.24; 5.59; 15.9 | 5.05; 15.24; 5.59; 15.24 | 5.05; 15.24; 5.59; 15.9 |
| Sideways scroll, page errors | none | none | none | none (after a wrap fix) |

Red, as the head chef suggested (A only, `?red=1`): "Too few" in `--bad-ink` on `--bad-tint` 6.64:1. Screenshots `shot-a-admin-390-short-red.png` and, with a failed Save, `shot-a-admin-390-fail-red.png`: the band and the failure line are the same red.

Screenshots: `shot-<design>-<role>-<width>-<state>.png` (states short, edit, accept, accepted, worse, fail, fixed), `-working` for the working screen.

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose (sage people book, paper inside) | Works: the band sits on the paper dock | Works | Works |
| State meaning (amber attention, green only for saved, red only for failure) | Works in amber. The red variant is a departure: it matches Save's failure line | Works | Works |
| Words without colour | Works: "Too few", "Accepting... Not saved yet", "Accepted for today", "The plan changed since" | Works; the hatched block needs its words beside it (it has them) | Works |
| Contrast | Works on the measured elements (5.05 to 15.9) | Works; the block on the bar is decorative, words carry it | Works |
| Relevant states | Short, unsaved, accepting, saving, accepted, worse, failed, enough: shown. Two chefs at once: Not evidenced | Same | Same; "Save and accept" with other changes: shown |
| Service continuity | Needs work: 33 px of list lost while short | Needs work: 58 px lost at 390, 59 at 1280; Accept off the first screen | Needs work: 66 px lost |
| Stable targets | Accept appears and goes beside the words; Save stays | Accept in the sticky head | Two buttons appear above Save while short |

### Reference comparison (lead's reading)

| Principle | A | B | C |
| --- | --- | --- | --- |
| Flighty: what matters now, real times | Works: "now until 19:00" first | Works: where in the day, on the clock | Works |
| Airbnb: what, when and the next action together | Works: the fact and Accept side by side | Works: the block, the people and Accept together | Works: the fact, Show and Accept together |
| Linear: one place, consistent action placement | Works: one place | Needs work: two places | Works: one place, but three actions in it |
| Duolingo: honest answer to each tap | Works: "Accepting... Not saved yet", then saved | Works | Works: Saving, Accepted, Try again |
| Todoist: nothing accepted by itself, defaults visible | Works | Works | Needs work: "Save and accept" bundles every unsaved change |
| Headspace: plain words | Works: "Accept 4 of 6", "Accepted for today" | Works | Works |
| Things 3: frequent actions visible, occasional ones tucked away | Works | Works | Needs work: Show and Accept take room every time it is short |

## Round 2 scores

Six fresh agents (the five, plus the kitchen screen designer) saw all three previews, the same evidence packet and the service rules. Scores out of 10. Previews only; the scorers read the screenshots, and the skeptic also drove the previews in a browser.

| Reviewer | A | B | C | First | Decisive point |
| --- | ---: | ---: | ---: | --- | --- |
| Cook | 7 | 5 | 4 | A | The fact reads at arm's length, Save stays put, a stray tap on Accept only changes the draft. C stacks "Save and accept" on Save: a wet thumb sends it to every phone. |
| Head chef | 8 | 4 | 6 | A | One place, sent with Save, cannot refuse another chef's draft. After accepting the dock should get smaller. Offer red as a departure, since he asked. |
| Skeptic | 6 | 4 | 5 | A | A drops today's "Move a marked break", so Accept is the only action on a short time caused by four overlapping breaks. Keep the fix first and the marks. |
| New starter | 7 | 5 | 6 | A | The dashed "Not saved yet" edge and grey "(accepted)" marks read without colour. "Accepting" reads like "Saving...": change it. "4 on, 6 needed" over "4 of 6". |
| Keeper | 8 | 4 | 6 | A | A rides `tmSig`, `svButton` and `svDone` as they are. B puts a control in an `aria-hidden` head that only `draw()` rebuilds. C's Undo is a second whole-plan save. |
| Screen designer | 7 | 5 | 5.5 | A | A works; add the fix next to Accept. The amber fill alone is 1.04:1 against the page: the edge and the words do the work. Red over a failed Save makes a pending acceptance look refused. |
| **Total** | **43** | **27** | **32.5** | A 6 of 6 | |

Every reviewer said the designs differ structurally, B the most; A and C differ in when the acceptance is sent and in C's jump, more than in layout (designer: "partly").

**Red** (the head chef's suggestion): five of six reject it or call it a departure for the head chef to choose: the band would match Save's own failure line (`shot-a-admin-390-fail-red.png`), and a pending acceptance under a failed Save would look refused. The head chef reviewer would still offer it, as a departure.

**Break-it findings from round 2:**

| # | Scenario | Evidence | Disposition |
| --- | --- | --- | --- |
| 7 | **Accept as the only action.** At 18:30, 8 rostered on Dinner, four meal breaks overlap. A offers only Accept; after accepting B and C remove the marks, A greys them. Moving one or two breaks would fix it. | **Reproduced** in `a-admin.html?s=short`, `b-admin.html?s=accepted`, `c-admin.html?s=accepted` (skeptic). | The mix puts the fix beside Accept ("Go to Sam K's break") and keeps the marks, grey, after accepting. Whether Accept should apply when the roster itself has enough is a **head chef question** below. |
| 8 | **C's failed one-tap save.** Two "Try again" buttons 12 px apart, both end Accepted, no Undo; "Not saved yet" above "Saved plan". | **Reproduced** in `c-admin.html?s=fail` (skeptic, new starter, cook). | C's one-tap save rejected by all six. The mix has one Try again (Save) and keeps the pending acceptance with Undo. |
| 9 | **Stamp mismatch.** "Saved 18:31 · Gus" beside "Gus, 14:05". | **Reproduced** in the A and C previews (a fixture error, four reviewers). | Fixed in the mix: a fresh accept says "Gus at 18:31" from the save; a loaded one says "Saved 14:05 · Gus" in the head. In the app the time comes from the saved record. |
| 10 | **B's accepted line kept the warning fill.** | **Reproduced** (preview CSS order, new starter and designer). | Preview bug, fixed in `pv.css`; B is not taken. |
| 11 | **The minute paint changes Accept as the thumb lands** (at 19:00 the next short time). | **Risk / Not evidenced** (keeper). | The button carries its own times (`data-from`, `data-to`, `data-low` in the mix); in the app a tap whose times no longer match is refused with words. Client test at 19:00. |
| 12 | **The clock is not ready at Save, so every acceptance is dropped.** | **Risk / Not evidenced** (keeper). | Save keeps acceptances while `T.ready()` is false. Client test. |
| 13 | **B's growing head moves the rows.** | **Checked** in Chromium: scroll anchoring kept Dev's row still (200 to 199 px). Safari Not evidenced (skeptic). | B is not taken. |

## Mix of A, B and C

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A, the band in the Save dock, fact first, Accept beside it | **Take** | Linear (one place), Airbnb (fact and action together) | Seen on the first and the working screen; one place to learn | 51 px of list while short in the mix (A alone 33) | All six |
| A, the acceptance in the draft, sent with Save | **Take** | Todoist (nothing accepted by itself), Duolingo (honest "Not saved yet") | A stray tap changes only the draft; the existing versioned Save, `svButton`, `svDone` | 2 taps to accept | All six |
| A, grey marks "(accepted)" after accepting | **Take** | Duolingo | A new sous chef sees which breaks were accepted, and can still move them | A line per marked person stays | New starter, skeptic, cook |
| B, real times in each mark ("Break 18:30 to 19:00, too few then") | **Take** | Flighty (real times where the eye already is) | Says when, on the row to change | The mark is a little longer | Five of six |
| B, the block on the clock and in the sticky head | **Reject** | Linear (one place) | | 76 px of sticky head, Accept off the first screen, `aria-hidden` head, a second minute paint | All six |
| C, Show breaks to move, as a link in the band ("Go to Sam K's break", then "Next: Dev's break") | **Take** | Airbnb (next action beside the fact), Things 3 (keep the common fix visible) | 1 tap to each marked break; the fix sits level with Accept, so Accept is not the only action | About 18 px of dock; must survive the minute paint | Skeptic, designer, new starter, keeper; the cook would leave it out (On break now already names who is away) |
| C, Undo on the accepted line | **Take**, as a draft change sent with Save | Duolingo | Takes back a mistaken acceptance the same way it was given | None new: Save already sends it | Cook |
| C, Accept saves at once; "Save and accept" | **Reject** | Todoist | | Bundles every unsaved change; a mis-tap reaches every phone; two Try again on failure | All six |

**Why not all three in full:** B's head plus C's button row is taller than any single design, two places say one fact, and two ways to send an acceptance. **Why not pure A:** it leaves Accept as the only action and the marks without times.

## Combined preview

[The mix](m-admin.html) ([sous chef](m-team.html)), states with `?s=`: short, edit, accept, accepted, worse, fail, fixed; Undo on the accepted line goes to an unsaved "acceptance taken off". **Preview**, the same snapshot, data and conditions as A, B and C. Raw `verify-m.json`.

- **While short:** the amber band, fact first: "**Too few** now until 19:00: 4 on, 6 needed", then "Saved plan. 5 from 18:45. Go to Sam K's break" (the link jumps to that row and outlines it; next tap "Next: Dev's break"). **Accept 4 on** beside the words, 44 px. Each marked person: "Break 18:30 to 19:00, too few then".
- **Accept:** "Not saved yet: accept 4 on, 6 needed, until 19:00. Save to share it with the chefs. Undo", dashed edge. Save turns on.
- **Saved:** one quiet line in place of the dock's status words: "**Accepted for today:** 4 on, 6 needed, until 19:00. Gus at 18:31. Undo". The marks stay, grey: "Break 18:30 to 19:00 (short accepted)".
- **Worse later:** the band comes back: "Too few now until 19:00: 3 on, 6 needed. Gus accepted 4 on at 14:05. The plan changed since. Go to Sam K's break".
- **Failed Save:** the pending band stays with Undo; one Try again; the red line says "The plan and the acceptance are still here."
- The dock's own status words step aside while the band shows (the band says Saved, Unsaved or Not saved yet itself).

| Measure | Today | A | Mix |
| --- | ---: | ---: | ---: |
| Taps to accept a saved short time | not possible | 2 | **2** |
| Taps to reach the first marked break | scroll and look | scroll and look | **1** (checked: Sam K's row outlined, then Dev's) |
| Save dock while short, admin / sous chef 390 | 114 / 116 px | 147 / 149 | 165 / 167 |
| Save dock with the acceptance waiting, admin 390 | | 170 | 147 |
| Save dock once accepted, admin 390 | 114 (the line stays) | 142 | **118** |
| Save dock after a failed Save | | 240 | 217 |
| List in view, working screen, admin 390, while short / once accepted | 545 | 512 / 518 | 494 / **541** |
| Admin 1280, dock while short / accepted | 67 | 80 / 95 | 92 / 67 |
| Contrast ("Too few"; the fact; Accept; the accepted line) | 5.27 | 5.05; 15.24; 5.59; 15.9 | 5.05; 15.24; 5.59; 15.9 |
| Sideways scroll, page errors | none | none | none |

Screenshots: `shot-m-admin-390-<state>.png`, `shot-m-admin-390-jump.png` (after Go to Sam K's break), `shot-m-admin-390-unaccept.png` (Undo on an accepted line). Focus on the break picker after the jump: Not evidenced in the snapshot (its pickers are static copies).
