# Today's team: a louder Too few warning, and Accept for today

16 November 2026, Queensland. Head chef request, after the Too few warning was built on 15 November (`docs/team-minimum-options/brief.md`, #713):

- "When there is less than the minimum members on during shift for certain periods, I wanna be able to warn myself or skip and approve or something."
- Asked what he wants when the plan is short, he chose **OK it for the day**: "maybe add live warning before I save like a red bar or something until the problem is resolved? what do other fancy apps do for a warning?"
- Who may OK it: **head chef and sous chefs**. Not chosen: a question at Save, a ping before the busy time.

**Status: the mix chosen 16 November 2026, in amber, with Accept offered beside the fix, and built (see Chosen and Built). Round 1 Build smaller (5 of 5); round 2 A 43, C 32.5, B 27 (A first for all six); the mix reviewed again by three (all Recommend with a change, every change made).**
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

[The mix](m-admin.html) ([sous chef](m-team.html)), states with `?s=`: short, edit, accept, accepted, unaccept, worse, fail, fixed. **Preview**, the same snapshot, data and conditions as A, B and C, after the focused follow-up below (its own small model in `mix.js`, so an unsaved edit, a waiting acceptance and Undo stay separate). Raw `verify-m.json`.

- **While short:** the amber band, fact first, 16 px: "**Too few** now until 19:00: 4 on, 6 needed". Under it one row: **Go to Sam K's break** on the left (a 44 px link: it jumps to that row and outlines it; again, "Next: Dev's break (2 of 4)") and **Accept 4 on** on the right (44 px). Each marked person: "Break 18:30 to 19:00, too few then". With an unsaved edit the fact starts "Not saved yet."
- **Accept:** the acceptance is the short time on the button that was tapped. "Not saved yet: 4 on, 6 needed, accepted until 19:00. Tap Save to share it with the chefs. Undo", dashed edge. Undo takes off only the acceptance; an unsaved edit stays. Save turns on.
- **Saved:** one quiet line in place of the dock's status words: "**Accepted until 19:00 today:** 4 on, 6 needed. By Gus at 18:31." with a 44 px Undo. The marks stay, grey: "Break 18:30 to 19:00 (too few, accepted)". The notebook head says "Saved 18:31 · Gus".
- **Undo on an accepted line:** "Not saved yet. Too few now until 19:00: 4 on, 6 needed. Acceptance undone." Save sends it.
- **Worse later:** the band comes back and names who changed it: "Too few now until 19:00: 3 on, 6 needed. At 14:05 Gus accepted 4 on. Sam K's save at 18:10 left 3 on."
- **Failed Save:** the waiting acceptance stays with Undo; one Try again; the red line says "The plan and the acceptance are still here."

| Measure | Today | A | Mix |
| --- | ---: | ---: | ---: |
| Taps to accept a saved short time | not possible | 2 | **2** |
| Taps to reach the first marked break | scroll and look | scroll and look | **1** (checked: Sam K's row outlined, then Dev's, "2 of 4") |
| Save dock while short, admin / sous chef 390 | 114 / 116 px | 147 / 149 | 179 / 181 |
| Save dock while short, admin 768 / 1280 | 67 (1280) | | 159 / 117 |
| Save dock with the acceptance waiting, admin 390 | | 170 | 179 |
| Save dock once accepted, admin 390 / 768 / 1280 | 114 (the line stays) / / 67 | 142 | **128 / 128 / 67** |
| Save dock, acceptance undone / worse / failed Save, admin 390 | | | 199 / 217 / 248 |
| List in view, working screen, admin 390, while short / once accepted | 545 | 512 / 518 | 480 / **531** |
| Link, Undo and Accept tap height | | Undo 18 px | **44 px** each |
| Contrast ("Too few"; the fact; Accept; the accepted line) | 5.27 | 5.05; 15.24; 5.59; 15.9 | 5.05; 15.24; 5.59; 15.9 |
| Sideways scroll, page errors | none | none | none |

Screenshots: `shot-m-admin-390-<state>.png` (and `-working`), `shot-m-admin-768-<state>.png`, `shot-m-admin-1280-<state>.png`, `shot-m-team-390-<state>.png`. Focus on the break picker after the jump: Not evidenced (the snapshot's pickers are static copies).

### Focused follow-up on the combined preview

The mix brought in a flow none of the six had seen together (the fix link beside Accept, Undo through Save, new words), so three of them looked at it again. **Review status: all three Recommend with a change; every change is now in the preview above.** The cook, the head chef and the keeper did not review it again.

| Reviewer | Verdict | What they found | Done |
| --- | --- | --- | --- |
| New starter | Recommend with a change | Every round 2 ask is in; every state reads without colour. Still unclear: the waiting line read as an order; "(short accepted)" read as a short break; "accepted 4 on at 14:05" read as "4 people on at 14:05"; one state had two names ("Unsaved plan", "Not saved yet"). Tap Accept, walk away, never Save: nobody would know. | All eight word changes made ("Not saved yet: 4 on, 6 needed, accepted until 19:00", "Tap Save to share it", "(too few, accepted)", "Accepted until 19:00 today: ... By Gus at 18:31", "Not saved yet" for every unsaved state). Walking away with an acceptance waiting: the book's existing unsaved-draft handling must cover it, **a client test before ready**. |
| Skeptic | Recommend with a change | The repairs hold: the fix sits beside Accept, every jump puts the break above the dock (Sam K, Dev, Fen, Hal, Eli at 390), one Try again. **Reproduced** in the earlier mix: accepting after an unsaved edit showed the old numbers; Undo dropped the edit; the jump skipped Dev after a break moved; the worse state's times were out of order and did not say who changed the plan. | The acceptance now comes from the tapped button's own times; Undo takes off only the acceptance; the jump follows the person, with "2 of 4"; worse names "Sam K's save at 18:10". The mis-tap from Undo to Save is now 44 px targets with a gap: **Risk**, measure in the app. |
| Screen designer | Recommend with a change | The link (126 x 18) and Undo (34 x 18) were too small; the waiting edge drew solid, not dashed (a preview CSS order bug); at 1280 the band used 439 of 1014 px; at 768 Accept sat 12 px over a right-aligned Save. Keep the dock under 180 px in every state. | 44 px link and Undo on one row with Accept, the fix first; dashed edge fixed; the band fills the free width from 1100 px (1280 dock 117 while short, 67 once accepted); a 6 px wider gap above Save. **Not met:** under 180 px in every state. Short is 179, but acceptance undone is 199, worse 217 and a failed Save 248 at 390 px. |

## Recommendation

**Recommend the mix: A's amber band in the Save dock, fact first, with Accept going into the plan for the existing Save + C's jump to the breaks as a 44 px link beside Accept + B's real times in each marked person's line. Reject B's clock block and sticky-head warning, C's one-tap save and "Save and accept", and red.**

**Why it beats the alternatives.**
- A led round 2 for all six (43 points; C 32.5, B 27). The mix keeps A's one place and its honest "Not saved yet", and repairs A's main fault: Accept was the only action. The fix now sits first on the same row.
- 1 tap to reach each break to move, where today and in A it is scroll and look.
- 2 taps to accept, through the Save that already exists: a stray tap changes only the draft, it cannot refuse another chef's work, and "Accepted" shows only once the server has it.
- Once accepted the warning shrinks to one line (128 px dock at 390, 67 at 1280), close to today, where today's line stays all day.
- No new read or listener. One optional field on `team/<day>`, a looser rule.

**Principles.** Linear: one place. Airbnb: the fact, the fix and Accept together. Flighty: real times, on the rows. Duolingo: Not saved yet, then Accepted, then why it came back. Todoist: nothing accepted by itself, nothing bundled. Headspace: "4 on, 6 needed", "Accepted until 19:00 today".

**Main downside.** While the plan is short the dock is 179 px on a 390 px phone (today 114): 65 px less list, about one person row's day bar and hours. In rarer states it is taller still (199 to 248 px). The head chef's phone also already shows only 2 of 4 On break now names above the dock while short (#722 is open for that).

**Red.** Not recommended: five of six reject it or call it a departure, because it matches Save's own failure line (`shot-a-admin-390-fail-red.png`). It stays a choice for the head chef, as a departure from the colour rules.

**Questions for the head chef.**
1. The mix, as recommended, or another design?
2. Amber (recommended) or red?
3. When the roster itself has enough people and only breaks make it short, should Accept still be offered? The skeptic would offer only the fix then; the mix offers both, with the fix first. Recommended: both, as previewed, because the head chef asked to approve a short time and the grey marks keep the breaks in view.

**Before the build is ready** (Implemented app, not Preview):
1. Rules first: `ok` (an optional list, size-limited, entries `{ sh, from, to, n, low, by, at }` with `by` an id) added to `teamOk()`, published before the client (looser). Emulator rows: a chef with `ok` and `v + 1`, a save without it, a staff member who is not a chef, an oversized list; a `tests/rules/client-shapes.test.mjs` row; the Lock probe after publishing.
2. Every save path carries it: `teamClean()`, `tmFrom`/`tmOut`/`tmSig`, `teamSave()`, the roster's "Save the filled days", Clear. A client test for each, and one for an older writer that drops it (the warning returns with words).
3. Matching, one pure rule shared by the band and the marks: a short time is covered only if every minute sits inside an accepted one at the same or a higher count, with the same need. Acceptances that cover nothing are dropped at Save; Save keeps them while the clock is not ready. Client tests at 18:29, 18:30, 18:31 and 19:00, need raised from 6 to 7, fixed then made worse, and a planned day that becomes today.
4. The Accept button carries its own times; a tap whose times no longer match (the 19:00 repaint) is refused with words. The minute paint changes only the band's words and the marks, never a control under a finger (`tmShortPaint()`'s existing hold rule).
5. "Accepted ... By <name> at <time>" from the saved record only, the name through `esc()`, a `tests/safe-text.test.js` line.
6. An acceptance left waiting when the page is left: the existing unsaved-draft handling keeps it and says so. A client test.
7. Remeasure the complete app at 390, 768 and 1280 px with real fonts, the largest text size and the longest staff name: the dock in every state, tap sizes and the gap between Accept and Save, the jumped-to row and its picker clear of the dock.
8. New patterns in `docs/design-patterns.md` and `tests/design-patterns.test.js`.

**Unresolved.**
- How often the kitchen plans short, and on purpose: not evidenced (the warning is a day old; whether a busy time is set in the real book is not visible here).
- The dock over 180 px in the rarer states.
- Two chefs accepting at once: the versioned Save refuses the second and names the first (`teamSave()`); not exercised for an acceptance.

## Chosen

16 November 2026: the head chef chose **the mix (recommended)**, **amber (recommended)**, and **offer both** the fix and Accept when only breaks make it short (recommended). Recorded in `docs/head-chef-decisions.md`. The build follows "Before the build is ready" above.

## Built

16 November 2026, in this pull request.

**`firestore.rules`:** `teamOk()` allows an optional `ok` list on `team/<day>` (24 entries at most) beside `on` and `br`, with the same writers, the same versioned save and the same day. Looser: **publish the rules before the client merges.** Entries are checked one by one on every phone that reads them (`teamClean()`), as `on` and `br` are.

**`js/prep.js`:**
- **The data.** `ok: [{ sh, from, to, n, low, by, at }]` rides on the day's plan: `tmOkClean()` checks each entry, `teamClean()` keeps up to 12, `tmFrom()` puts them in the draft, `tmOut()` lists them (so an acceptance alone turns Save on), `tmOkStamp()` gives a new one the save's time.
- **The rule.** `tmOkCovers()`: a short time is covered only while the whole of it sits inside an accepted one, on the same shift, at the same need, never fewer on. `tmOkKeep()` drops at Save the acceptances that no longer touch a short time; all are kept while the kitchen clock is not ready.
- **The band.** `tmShortView()` picks the first short time nobody accepted, else the first accepted one; `tmShortBandHTML()` draws it. `tmShortMarkWords()` gives each marked person's words. `tmShortPaint()` repaints the band, the dock's words and the marks on the existing minute paint, and waits while the focus is in the band.
- **The taps** in `teamClick()`:
  - `tm-short-ok`: refused with words when the tapped button's own times no longer match the band.
  - `tm-short-undo`: takes the acceptance back out of the plan.
  - `tm-short-go`: focuses that person's break picker clear of the list head and the dock, then moves the link on to the next person.
- **Saving.** `teamSave()` says what it did ("Accepted for the chefs: ...", "Acceptance undone: ...", "No longer too few at ..., so its acceptance is cleared."). The roster's Save the filled days carries acceptances, and Clear clears them.

**`css/app.css`:** the `.tm-short-band` block. The dock's `.has-short` gives up its empty saved-words row and 4 px of top padding while the band shows. From 720 px the band sits beside Save.

No new read, listener or timer. Older code ignores `ok`. An older phone's Save rewrites the day without it: the band comes back on every phone, as before, until someone accepts again.

**Departures from the combined preview, kept small:**
- **The fact is 15 px, not 16.** It stays on one line at 390 px in the book's fonts.
- **The band sits beside Save from 720 px, not 1100.** At 768 px a full-width band hid On break now names (#722 merged this morning). Beside Save the dock is 86 px.
- **The marks say when each break starts** ("Break 18:30, too few"), not its whole span. The longer words wrapped beside the name, so a row moved under the thumb when its mark went (the existing thumb check, reproduced 17 px on the first build).
- **While the band shows, the dock drops its empty saved-words row and 4 px of top padding.** Without it, with six away, Sam K's name sat under the dock on the head chef's phone (the #722 check, reproduced: last name 639 px, dock 625 px).
- **A cleared acceptance is named for why it went:** "No longer too few at 18:30 to 19:00, so its acceptance is cleared." says the plan has enough there now; "Acceptance undone" means a chef tapped Undo.

**Implemented app measurements.** Stand-in, the study's made-up day at 18:30, fallback fonts unless named. Script [`implemented.cjs`](implemented.cjs), raw [`implemented.json`](implemented.json). Before: the same plan with no busy time set. Today's line (15 Nov) measured 114 px at 390 (`baseline.json`).

| Save dock | admin 390 | sous chef 390 | admin 768 | admin 1280 |
| --- | ---: | ---: | ---: | ---: |
| No busy time set | 96 | 98 | 67 | 67 |
| Too few, saved plan | **135** | 137 | 86 | 86 |
| Accept tapped, waiting for Save | 154 | 156 | 104 | 86 |
| Accepted (one quiet line) | **112** | 114 | 63 | 63 |
| Worse later (the reason line) | 170 | 172 | 103 | 103 |

| Measure | Result |
| --- | --- |
| List in view on the working screen, admin 390: no busy time / too few / accepted | 563 / 524 / 547 px |
| On break now names above the dock, admin 390, in Barlow (the #722 check) | 4 of 4, and 6 of 6 with six away (2 px to spare) |
| On break now names above the dock, admin 390, worse state (five away), fallback fonts | **3 of 5** (Not evidenced in Barlow) |
| Taps to accept a saved short time | 2 (Accept, Save) |
| Taps to reach the first marked break | 1 |
| Tap targets | Accept 118 x 44, Go to 181 x 44 (wider from 720 px), Undo 44 x 44 |
| Contrast | "Too few" 5.05:1; the fact, the reason and the link 15.24:1; Accept 5.59:1; the accepted line 15.9:1; an orange mark 5.27:1, a grey one 6.73:1 |
| Sideways scroll, page errors | none at 390, 768 and 1280 |

Screenshots: `implemented-<admin|team>-<390|768|1280>-<short|accepting|accepted|worse>.png`, and `-working` at 390.

**Tests:**
- `tests/team-minimum.test.js`, 75 checks. Parts 2 to 10 are in the new words. Part 11 is new:
  - Accept, Undo before Save, Save with the record's exact `ok`
  - the quiet line and grey marks, still covered a minute later
  - Undo and Save, a worse plan with who saved it
  - a refused tap whose short time changed
  - Go to, twice, with the focus clear of the list head and the dock
  - the clock not ready keeping the acceptance, and a fixed plan clearing it
  - no read
  - On the old code part 11 fails at its first check: there is no Accept.
- `tests/safe-text.test.js`: the accepting chef's name in the band.
- `tests/design-patterns.test.js`: the new classes and helpers.
- `tests/rules/rules.test.mjs`, 6 new rows: a sous chef and the head chef with `ok`, a save without it, staff refused, more than 24 refused, not a list refused. `tests/rules/client-shapes.test.mjs`: a save with `ok` for every role. 782 rules checks and 292 client shape rows pass on the emulator.
- Run locally with 27 related files (every team test, `todays-team`, the roster tests, `roles`, `read-budget`, `sticky-bars`, `home-staff-*`): all pass.

**Not evidenced, carried forward:**
- The roster's Save the filled days with an acceptance made on a filled draft: a code path with no click test.
- Leaving the page with an acceptance waiting: the existing unsaved-draft handling keeps the day's draft; no test for an acceptance.
- The worse state's board names in Barlow.
- Two chefs accepting at once: the versioned Save refuses the second and names the first (`teamSave()`), not exercised for an acceptance.
