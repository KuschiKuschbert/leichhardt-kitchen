# Function sent, lines off

## Status

14 November 2026, Queensland. **The mix chosen and built.** The head chef asked that once a function is prepped and sent out, its prep and order lines come off the lists. Asked two follow-ups, they chose **the last round ticked Sent** as the trigger and **all three kinds of lines** (platter prep lines, the Function stock order line with its notices, and lines added from What the platters need). After both council rounds the head chef chose the recommendation: "Build the mix". The date guard (below) was put to them and is not built.

## Chosen and built

The mix, as described under "The mix" below, in one pull request with the ingredient link as its second part:

- **The maths, once:** `roundSent()`, `allSentAt()`, `lineOf()` and `lineOff()` in `js/functions.js`, run by node. The phones (`fnOffMark()` in `js/prep.js`) and the 03:00 job (`scripts/fn-sent-tidy.mjs`) both ask it.
- **On the phones:** no new listener and no read while a list shows. A line comes off once both function listeners came from the server and every round's tick is on the server, made on the function's day, at most 4 hours before the round. A line that was open on screen holds its place 2.5 seconds (longer while a finger is down, never past 10 seconds), says "Not needed: Smith 60th all sent", and a tap on it says why. The counts drop at once.
- **The phone that sent it:** since #700 (merged the same day) the kitchen sends a round in trips; the trip that completes a round also writes the round's own Sent, and that is what counts. A second press on the same function within 1 second that lands on the next round is ignored. Once the server has the last round's Sent, the slip names what came off from the lists this phone holds, with no read ("Smith 60th all sent. Taken off the lists: Pizza Platter, Party pies, the Function stock line if it was not ordered." when Orders is not open there), with Undo for 90 seconds (never past 110 seconds from the tap, the rules' 2 minutes). Undo takes the last trip back and says "Its open lines are back on the lists." The All sent box says the same, without a second Undo.
- **Prep's Functions tab** stays for the day with one sentence naming what came off and where. What the platters need leaves a sent function out.
- **Put back** (Removed lines, Delete holders) writes `keep`: the phones and the job never take that line again. Both rollovers carry `keep`.
- **The ingredient link:** a line added from What the platters need carries `fnFor` (its functions) and shows "For Smith 60th". A line for two functions waits for both. Any merge into it (Add, a double up) clears the link, and an Undo never puts it back. The book writes `fnFor` only with a new line and only clears it later. A rule enforcing that (`fnForOk()`) was tried and dropped: one more check on every prep line pushed the largest function cancellation (12 lines, 8 rounds) past the rules' 1000 steps on the emulator. Accepted risk (the Keeper's "forged link", Low): a person who can Add could link an existing line to a function by hand outside the book; it would then leave the list when that function is sent, shown under Removed lines as "Function sent", and Put back recovers it.
- **The 03:00 job** (`scripts/fn-sent-tidy.mjs`, first in `nightly-learn.mjs`) removes the open, unkept lines of every all-sent function from its day to today ("Function sent" as who), with the line's update time as a precondition, catches up 7 days, and stamps `config/main.pastEdit` when a past day changed.

Not built: **the date guard** (stopping the stock line rolling after the function's day even without Sent). The head chef was asked and did not choose it. Without it, a phone that rolls Orders over between midnight and 03:00 copies a sent function's stock line, and the 03:00 job takes it off. If the job is skipped, the line shows again until the next night's run.

Verification: `tests/fn-sent-tidy.test.js` (25 checks, Implemented app in the click-test stand-in), the job on the Firestore emulator (`scripts/fn-sent-tidy-check.mjs`, run on GitHub: Java is not installed on the build Mac), the new rules rows in `tests/rules/client-shapes.test.mjs` (GitHub). No rules change: the current rules already accept `fnFor` and `keep` on prep and order lines, so nothing is published.

[Compare every design](comparison.png) ([page](comparison.html)) · [Evidence packet](packet.md) · [Baseline measurements](baseline/measurements.json) · [Baseline capture](capture-baseline.cjs)

## Baseline (Implemented app, main `6f706fe`, click-test stand-in, synthetic data, 390 x 844, 14:00)

Smith 60th, today at lunch, two rounds, both ticked Sent. One platter line ticked, one open. Its Function stock order line rolled over twice, never ticked. Two ingredient lines added yesterday from What the platters need, rolled over once.

| Screen | What still shows after the function went out |
| --- | --- |
| Prep, All ([shot](baseline/prep-all.png)) | 8 lines in view. "Party pies 50" and "Sausage rolls 50" in Larder, Rolled, with nothing saying they were for Smith 60th. The Functions tab says **Functions 1**. |
| Prep, Functions ([shot](baseline/prep-functions.png)) | "Pizza Platter: Smith 60th, from 12:00", 5 platters, open. |
| Orders, sous chef ([shot](baseline/orders-sous.png)) | "Function stock: Smith 60th, Sat 14 Nov: 5 Aussie, 5 Pizza", 10 platters, tagged **Not ordered yet**, first of 3 lines. It rolls over again tomorrow. |
| Service view ([shot](baseline/service-view.png)) | "Nothing to send: no function has a round still to go out." |

## Round 1: should we build it?

Five fresh reviewers, the same [packet](packet.md). Role-based analysis, not research with kitchen staff.

| Reviewer | Verdict | Main point |
| --- | --- | --- |
| Head chef | Build smaller | The order line is the real nag (only Ordered stops its rollover). Platter lines never roll over. Most cost and risk is in the ingredient link: build platter and order lines first, without writes, and add the link once stray lines are counted. |
| Cook mid-service | Build | Clears false work ("Functions 5", "Party pies 50") at a glance with no new tap. Risks: one wet Sent tap now clears lines on every phone; lines vanish under a finger, and the Functions tab disappearing sends a cook back to All. |
| New starter | Build smaller | Ingredient lines look like any line: show "For Smith 60th" on a linked row. If the kitchen adds the same thing and it merges into a linked line, unlink it, or the bistro's own need goes too. |
| Skeptic | Build smaller | Platter lines already end with the day; the stock order line is the real problem. Sent gains a silent new effect on a tap anyone can make. Proposed instead: end function lines by date, Sent only hides that evening's lines. |
| Keeper | Build smaller | Two steps: platter and stock lines first (T3), the ingredient link second, once the merge fault is fixed. Only T3 holds: T2 alone cannot judge yesterday's function after midnight; T1 needs a looser rules path with a rules read per round. One shared pure core, run by the phones and the 03:00 job, decides "all rounds sent" and "which lines belong". |

**Verdict: Build smaller, 4 of 5** (the cook said Build). Cut: build it in two steps, the ingredient link second and only with the merge fix. The head chef's choice of all three kinds of lines stands; the council asks only that the ingredient link ships second.

Disagreement, one line each:
- The head chef reviewer and the Skeptic would hold the ingredient link until stray lines are counted. The head chef has already asked for it, so it is step 2, not dropped.
- The Skeptic would trigger by the function's date, not by Sent. The head chef chose Sent; the date is used as a second guard (below), not instead.

Every reviewer: **the tap must say what it did** (After the tap, rule 2). Today Sent tells only a screen reader.

### Break-it findings (round 1, source review)

| Scenario | Role / state | Expected | Observed or hypothesis | Impact | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- | --- | --- |
| Double tap on Sent | Any cook, two rounds, the Next out box | One round ticked | `tickSent()` redraws at once with round 2's Sent in the same place; no guard. Both rounds could be ticked, clearing every line mid-service | High | Risk / Not evidenced | Ignore a second Sent within 1 s on the same function; click test |
| A merge swallows the kitchen's own line | Cook adds Party pies while a linked Party pies line is open | The bistro's need stays | `addToTwin()` / `mergeDups()` merge into the linked line; the last Sent takes both | High | Risk / Not evidenced | A linked line loses its link when anything merges into it; test both merge paths |
| Midnight | Any phone opening after midnight | The stock line does not come back | Yesterday's function leaves the functions listener (`kq`); the rollover copies the still-open line | Medium | Risk (source) | Store the function's day on the line and skip it in the rollover after that day; the 03:00 job writes the removal |
| Late or skipped 03:00 run | GitHub delays the job | Lines stay off | Lines roll at the morning open, then vanish mid-shift when the job runs | Medium | Risk / Not evidenced | The date guard stops the rollover; the job catches up 7 days, touches only open lines, safe to run twice |
| Undo Sent after 03:00 | Chef unticks a round next day | Lines come back or the person is told | The job already wrote the removal | Low | Risk | Say "Put back from Removed lines" |
| Lines vanish under a finger | Second phone on the Functions tab | Cook keeps their place | The tab empties; `S.tab` resets to All | Medium | Risk (source, `js/prep.js` near 5682) | Keep the tab and its words for the day |

## Agreed under every design (technical)

- **When:** every round of a confirmed function ticked Sent. Worked out on each phone from the two listeners already running (no new reads). One pure core, run by node and the phones (like `js/cutoffs.js`), decides "all sent" and "which lines".
- **Which lines:** open lines only. Ticked and ordered lines stay as they are. Platter prep lines (`fn`), the Function stock order line and its notices (root `fn-<function>`), and from step 2 ingredient lines added from What the platters need (a new link field; unlinked when anything merges into them; a line for two functions waits for both).
- **What the platters need** leaves out a function that is all sent.
- **Writes:** none on the Sent tap beyond the Sent tick itself. The 03:00 job takes the lines off for good (as Remove does, "Function sent" as who), catches up over 7 days, touches only open lines, and runs before the learning counts. The order rollover also skips a function line after the function's day.
- **Undo:** unticking a round (same person within 2 minutes, or a chef) brings the lines back at once before 03:00; after, Put back.
- **Guard:** a second Sent on the same function within 1 second is ignored.

## Round 2: three designs

Previews start from the real app's markup and CSS (static snapshots, synthetic data) and change only what each design changes. They do not run app code: slips, timing and failures are **Not evidenced** in the previews. Preview fonts are the bundled preview fonts, so handwriting differs from the baseline shots. [Preview script](capture-previews.cjs) · [Preview measurements](preview-measurements.json)

Shared by all three, before the last Sent: an ingredient line added from What the platters need wears a plain tag **For Smith 60th** ([shot](design-shared/prep-all.png)).

### A. Off the list, like Remove (changes the least)

The phone that ticked the last round shows the docket slip "Smith 60th all sent: 3 prep lines and 1 order line off the lists." with Undo ([shot](design-a/function-page.png)). On every phone the open lines leave Prep and Orders the way a removed line does and are listed under the existing Removed lines (Delete holders). The Functions tab keeps its place and says "Smith 60th all sent 12:48. Lines not ticked are off the list (Removed lines)." ([shot](design-a/prep-functions.png)). [Prep, All](design-a/prep-all.png) · [Orders](design-a/orders-sous.png)

- Pros: nothing new to learn; uses the slip and Removed lines the book already has; the list is clean at once.
- Cons: other phones get no word on the All tab; a cook who was about to do Party pies sees it vanish. Removed lines is behind a link and only for Delete holders.

### B. Not needed, folded in place (rethinks the flow)

Nothing vanishes during service. The open lines turn into struck-through **Not needed** lines with no tick box ("Not needed: Smith 60th sent 12:48") and move into a fold at the end of the list, "Went out with Smith 60th (2)" ([shot](design-b/prep-all-fold.png)). They do not count as open or done. Orders gets the same fold ([shot](design-b/orders-sous.png)). The slip on the Sent phone says "3 prep lines and 1 order line marked Not needed." with Undo. The 03:00 job takes them off. [Prep, All](design-b/prep-all.png) · [Functions](design-b/prep-functions.png) · [Sent phone](design-b/function-page.png)

- Pros: every phone, every role, sees why a line went, without colour; nothing moves silently.
- Cons: a new kind of line and a new fold on two work pages; struck lines stay on screen all evening; one more thing to learn.

### C. One receipt on the function (removes the most friction)

No slip and no notes on the lists: the open lines leave quietly on every phone. What came off is said once, in the function's own All sent box, where the last Sent was tapped: "Off the lists: Pizza Platter (Functions), Party pies and Sausage rolls (Larder), Function stock (Orders). Undo" ([shot](design-c/function-page.png)). Prep's Functions tab shows the same receipt for the rest of the day, with Open function ([shot](design-c/prep-functions.png)). [Prep, All](design-c/prep-all.png) · [Orders](design-c/orders-sous.png)

- Pros: one place to look; names every line; the lists carry nothing extra.
- Cons: the receipt is only where the function is; a cook on the Larder tab gets no word unless they look at Functions. Undo lives in the box, not the slip the rest of the book uses.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Lines after the last Sent | Leave at once | Stay, struck, in a fold | Leave at once |
| Where the record lives | Removed lines (Delete holders) | In the list, for everyone | The function's box and the Functions tab |
| Answer to the tap | Slip with Undo | Slip with Undo | Words in the box with Undo |
| New screen piece | None (one sentence on the Functions tab) | A fold and a Not needed line on Prep and Orders | A receipt block in the All sent box and the Functions tab |

### Measured (Preview at 390 x 844; baseline is the implemented app)

| | Before | A | B | C |
| --- | --- | --- | --- | --- |
| Prep, All: open lines in view | 8 (2 not needed) | 6 | 6 (+2 struck in the fold, below the first screen) | 6 |
| Prep, Functions tab | "Functions 1", one open platter line | "Functions", one sentence | "Functions", one struck line | "Functions", the receipt |
| Orders: lines | 3 (1 not needed, "Not ordered yet") | 2 | 2 (+1 struck in a fold) | 2 |
| What the platters need | "11 today" | gone | gone | gone |
| Taps to tick a prep or order line | 1 | 1 | 1 | 1 |
| Taps to clear Smith 60th's leftovers (chef with Delete) | about 6 (source: tick the platter line, which has no Remove; ⋯ then Remove for each ingredient line; Remove on the order line) | 0 | 0 | 0 |
| Build size | | 2 pull requests | 2 pull requests, larger (new line state on two pages) | 2 pull requests |
| New reads or rules | | none on phones; a few in the 03:00 job; no new rules path | same | same |

### Round 2 scores (out of 5; fresh agents, role-based, not research with staff)

| Reviewer | A | B | C | Recommends |
| --- | ---: | ---: | ---: | --- |
| Head chef | 4 | 2 | 3 | A with C's named lines |
| Cook mid-service | 3.5 | 2 | 4 | C's lists and receipt with A's slip for Undo (the same blend) |
| New starter | 2 | 4 | 3 | B's words in place without the strike, the line leaves when not under a finger, C's names in the answer |
| Skeptic | 3 | 2 | 2.5 | The date guard first, then A with C's named lines |
| Keeper | 4 | 2 | 3 | A with C's sentence |
| Screen designer | 4 | 2 | 3 | A with C's named line |
| **Mean** | **3.4** | **2.3** | **3.1** | |

All six: A and C remove lines the same way and differ only in where the answer is (the designer found their Prep and Orders previews identical); B is the one structurally different design. Five of six reject B's struck "Not needed" lines: strike-through already means done or ordered, and at 0.62 opacity it falls to 4.66:1 (4.44:1 on the rolled tint). The new starter dissents: only B tells a cook on the Larder tab why Party pies went.

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Duolingo: each tap answers truthfully | Works (slip with Undo) but counts, does not name | Needs work ("Not needed" claims what the book cannot know) | Works (names every line) |
| Linear: one pattern per action | Works (the book's slip) | Needs work (a new line state) | Needs work (a second Undo in the box) |
| Things 3: finished work leaves today | Works | Needs work (struck rows stay all evening) | Works |
| Flighty: status from data already read | Works | Works | Works |
| Headspace: one name, plain words | Needs work ("Removed lines" pointer staff cannot open) | Needs work ("Went out with" against "Not needed") | Works |
| Airbnb: status and next step together | Not evidenced | Not evidenced | Works |

### Contract fit

A fits the approved patterns (slip, Removed lines, the Cancel precedent). B adds a line state (`docs/design-patterns.md` would need it) and C adds a board on a work book and Undo outside the slip: both are departures for the head chef. Unresolved for all three: After the tap rule 1 (a held Sent write must not take lines off or say "off"); rendered contrast in real fonts; the service view `#/fn/now` after the last round; a finger on a row as it leaves. All Not evidenced in the previews.

### Break-it findings (round 2, source review; all Risk / Not evidenced)

| Scenario | Impact | Repair |
| --- | --- | --- |
| Sent ticked days ahead by mistake: the unordered stock line leaves every Orders list | High | A round counts only when ticked on its own day, near its time |
| No signal: `tickSent()` shows the tick before the server answers | High | Count only rounds the server confirmed; the slip waits for that too |
| No platter line ticked: the Functions tab vanishes and the cook goes back to All | Medium | Keep the tab and its sentence for the day |
| Put back on one line: the worked-out hide still applies and the job takes it again | Medium | Put back sets a keep field that the core and the job honour |
| A round's time changed after Sent: lines come back mid-service | Low | Accept; the round shows not sent, which is true |
| The slip's Undo after 2 minutes: the rules refuse a cook | Low | The slip's Undo lasts 90 seconds |
| A forged ingredient link acts as a delayed Remove | Low | The core checks the link against that function's own platter needs |
| The 03:00 job and a tick or Put back at the same moment | Low | The job writes with an update-time precondition |

## The mix: A with C's names (recommended)

Taken: A's lists, slip and Removed lines; C's named lines; the new starter's "never under a finger". Rejected: B's struck lines and fold (strike means done; a new state on two pages), C's dark board on Prep and its second Undo (one Undo, in the slip). A blend of all three was considered and rejected by every reviewer who assessed it: B keeps lines on the list while A and C take them off, and there would be two Undos.

- **The phone that ticked the last round** ([shot](design-mix/function-page.png)): once the server confirms the tick, the slip names what came off, "Smith 60th all sent. Taken off the lists: Pizza Platter, Party pies, Sausage rolls, Function stock." with Undo for 90 seconds. The All sent box says the same line, without a second Undo. While the tick is held, nothing leaves and the slip says Not sent yet.
- **Other phones** ([shot](design-mix/prep-all.png), then [after](design-mix/prep-all-after.png)): a leaving line holds its place for a moment, its box and buttons faded and taking no tick (a tap says why), "Not needed: Smith 60th all sent" in bold under it, then goes. The counts drop at once; the leaving line loses its Start here number and Rolled tag. Never while a finger is down on the list, and not in the 400 ms after one lifts.
- **Prep's Functions tab** ([shot](design-mix/prep-functions.png)): stays for the day, with one sentence in the body font naming every line: "Smith 60th all sent 12:48. Taken off the list: Pizza Platter (Functions), Party pies and Sausage rolls (Larder)."
- **Orders** ([shot](design-mix/orders-sous.png)): the stock line goes, same as A.
- **Before the last Sent** ([shot](design-mix/before.png)): an ingredient line added for the function wears "For Smith 60th" in the body font.
- **Removed lines** (Delete holders): "Function sent 12:48" as who; Put back keeps the line on.
- **Guards:** the server-confirmed, on-the-day Sent; a second Sent within 1 second ignored; the date guard on the rollover; the 03:00 job writes the removal.

Measured (Preview, 390 x 844): Prep, All 8 open lines before, 6 after (2 in the leaving moment); Orders 3 to 2; taps to tick a line 1, unchanged; taps to clear the leftovers about 6 to 0.

### Focused review of the mix (the three reviewers it changes most)

| Reviewer | Score | Main point, and what changed |
| --- | ---: | --- |
| Screen designer | 4 | One coherent flow, one Undo. The leaving rows kept the Start here number, Rolled tag and counts: fixed in the preview (counts drop at once, marks go). The Functions tab's "1 of 1 done" over a half bar needs fixing in the build. |
| New starter | 3.5 | "Off" means spoiled in a kitchen: now "Not needed" and "Taken off". The Functions tab must name the ingredient lines too: done. A tap on a leaving box must answer, and rows must not shift just before a thumb lands: added (no shift within 400 ms of a lift). |
| Keeper | 4 | No new reads, listeners or rules path. The slip's Undo ends at 90 seconds or 110 seconds after the tap, whichever is first (the rules' 2 minutes run from the tap). Release the hold on `pointercancel` and after 10 seconds. Never leave Function stock out of the names. Smallest test: one click file with the stand-in's `hold`, `ack()`, `release()` and `write()`. |

Review status: the mix is the lead's synthesis of the six reviewers' take/reject answers, checked by these three focused reviews. It was not rescored by the full council.

## Recommendation

**Recommend the mix: A's lists, slip and Removed lines, with C's named lines.** It scored highest in the reviews that assessed it (A 3.4 and C 3.1 as single designs; the mix 4, 4 and 3.5 in the focused review), adds no new screen piece to Prep or Orders, uses the book's own slip, and says by name what went, where the eye is. Main downside: a cook on the Larder tab who looks away misses the leaving moment; the Functions tab sentence and the "For Smith 60th" tag are what tell them afterwards.

Build in two steps, as round 1 asked:

1. Platter prep lines and the Function stock order line (with its notices): the shared core, the slip, the leaving hold, the Functions tab sentence, What the platters need leaving out a sent function, the guards, and the 03:00 job's removal.
2. Ingredient lines: the link from What the platters need, "For Smith 60th", unlink on any merge, a line for two functions waits for both.

**For the head chef to decide:** the date guard. Should a function's stock order line also stop rolling over once the function's day has passed, even if nobody ticked Sent? It is the Skeptic's and Keeper's safety net for midnight and a late 03:00 run, but it goes beyond the trigger you chose.

### Verification plan (before ready)

Node fixtures for the core (a round ticked ahead of its day, a pending tick, two functions sharing a line, a round time changed, a parsed root, keep); the 03:00 job run twice on the emulator (idempotent, open lines only, catch-up over 7 days); click tests: the double tap, the held Sent (Not sent yet, nothing leaves), the leaving hold with a finger down, no platter line ticked (the tab stays), Put back keeps a line, every role; the implemented app at 390, 768 and 1280 px with real fonts and a long function name in the slip.
