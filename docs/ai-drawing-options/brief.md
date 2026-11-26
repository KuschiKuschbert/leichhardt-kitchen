# AI drawing in the studio: the council's study

Asked 17 Nov 2026. The owner has US$100 of Claude API credit and asked whether Claude could draw in the app, with a daily limit and a stop before the credit runs out. The round 1 proposal and evidence packet is [proposal.md](proposal.md) (source commit `70ce8f4`). This is role-based review by fresh agents, not research with real staff.

## Round 1 (18 Nov 2026)

**Verdict: Build smaller, 3 of 5.** The head chef and the skeptic said Don't build (not now).

**What all five agree on:**
- **Option 1 only:** Claude picks and places pieces from the book's own library, and the studio draws them.
- **Never option 2,** a whole new SVG drawing. It has no parts, so a saved plate would get no Pass labels, and the allergen lens reads those labels.

Three of five (the head chef, the skeptic and the keeper) say the same next step: prove it away from the app first.

| Reviewer | Verdict | Main reasons | The one change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | Never in service, so no taps change. The benefit is Not evidenced. A confident wrong pick does more harm than a clumsy one. Keep one name, Draw it for me (Headspace). | Option 1 only |
| Head chef | Don't build (not now) | A small problem, mostly fixed on 15 Nov (98% matched, plating median 0.01). The credit is fine; the build is not: the first server code, a key, Blaze, a deploy workflow, rules and tests. The gaps are in the library more than in the layout. | Spend about US$5 offline first: Claude on the 10 worst dishes and the next specials, scored by `plating-check` and the head chef's eye. Claude also draws missing library pieces, checked by `library-check` in a normal pull request. |
| Skeptic | Don't build (not now) | Draw it for me already does this in 1 tap, with no wait and no cost. The cost is out of scale for an occasional job. The benefit is untested, and the faults left look small enough for the rules to fix. Linear and Headspace: a second Draw button with a second name. | A bake-off: the 10 worst plates in `tests/plating-check.js` plus 5 batch cards, AI against Draw it for me, scored by the check and the head chef's eye, with real tokens and seconds recorded |
| New starter | Build smaller | Two names for one job, and one of them costs money. A 5 to 20 s wait that can land unsaved, fail or be lost on Close. Wrong picks are remembered for the next recipe. | Option 1 only; say its wait, the count left and the result in words |
| Keeper | Build smaller | Reads are cheap: about 6 reads and 3 writes per drawing. The server is not cheap. Server code would make a second copy of the access check, outside the rules and their emulator tests. Option 2 breaks contracts. | An offline bake-off with the key kept off the book: option 1 on the 80 dishes, scored by `plating-check` and a blind pick by the head chef (about US$10 to 15). Build only if it clearly wins. |

**Disagreement:**
- The head chef and the skeptic would not build into the app now, only test offline.
- The cook, the new starter and the keeper would build option 1 if it is proved.

The keeper's Build smaller also puts the offline test first.

### Contract fit

| Check | Result | Evidence |
| --- | --- | --- |
| Service rules | Works | The studio is not a service page. No tab, bar button or pop-up on a service page is proposed. |
| No AI service (21 Oct) and the same seed gives the same drawing (15 Nov, `docs/code-contracts.md` Draw it for me) | Proposed departure, head chef's call | All five call it a deliberate change, not a violation |
| Security header | Proposed departure, head chef's call | `connect-src` would need the function's address |
| Pass labels come from a plate's parts (`docs/code-contracts.md`, Drawings made in the book) | Option 2 violates it; option 1 Not evidenced | Five of five |
| Keep until redraw | Risk | An AI plate marked as book-made at the current `lv` would be redrawn by the rules on the next recipe save (break-it 2) |
| After the tap, loading and motion | Not evidenced | No wait, failure or limit state exists to check |
| Save state on a phone | Works today, Needs work for a long wait | Below 900 px the state words are for a screen reader only (`css/app.css`, `.dw-top .mg-state`). The Save button's own word (Save or Saved) carries the state, so it is not colour alone, as one reviewer said. A 15 s paid wait has no visible words yet. |
| Site publishing | Needs work at build | `scripts/site-changed.sh` would count `functions/` and `firebase.json` as files the phones load (checked) |

### Break-it findings

All are **Risk / Not evidenced**: no AI code exists. Security detail stays at the level of outcome and fix.

| # | Scenario | Hypothesis and impact | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Head chef saves an option 2 drawing | No parts mean no Pass labels, so the allergen lens shows wrong information | Drop option 2 | Accepted by all five |
| 2 | An AI plate is saved, then a sous chef saves the recipe or a card it uses | `autoDraw()` / `redrawFrom()` replaces the paid plate and its hand fixes with a rules drawing | Give AI plates their own marker that autodraw skips; a case in `tests/autodraw.test.js` | Carry into any build |
| 3 | A slow answer: a second tap, Undo, Try another, Close, or the shared tablet locks | Two charges, a late answer over hand edits or on the next person's screen, and the day's slots used up | Button busy at once; a request id and the drawing's version checked before applying; the server ignores a repeat; a late answer is offered, not applied | Carry into any build |
| 4 | The server stops after calling Claude but before recording the cost | The US$90 stop drifts low | Reserve the worst case before the call and settle after; the day keyed to the Queensland date (test 13:59 and 14:00 UTC); a unit test with a mocked API | Carry into any build |
| 5 | A bad release of the function | A git revert does not stop a deployed function | An off switch on the server and a key revoke step | Carry into any build |

### What was checked

- Both node checks were re-run by the lead and the skeptic: 98% matched, plating median 0.01, none over 2.
- The phone save-state and site-publishing claims were checked in source (above).
- Not evidenced:
  - the quality, wait and real token cost of an AI drawing
  - how many drawings are made each week
  - whether Blaze is on
  - the 50 batch cards, side views and builds, which `plating-check` does not cover

### Lead's recommendation

**Run the offline bake-off before round 2.** Round 2 would design the studio's AI button. Three reviewers say not to build that until AI is shown to beat Draw it for me, so designing it first would waste work.

The bake-off:
- Option 1 only.
- The 80 dishes are scored with `plating-check`.
- The 10 worst dishes plus 5 batch cards are shown side by side, unlabelled, for the head chef's pick.
- Real tokens, seconds and dollars are recorded for each drawing.
- About US$10 to 15 of the credit.
- The key goes through the cloud session's secure credential form, or stays on the owner's computer. It never goes in the repo or the book.

If AI clearly wins, round 2 designs the studio piece with break-it 2 to 5 built in. If not, the credit goes to the head chef reviewer's other idea: Claude drawing missing library pieces, checked by `library-check` in normal pull requests, with no server.

**Head chef's choice (24 Nov 2026):** the bake-off first.

## The bake-off

Run on the owner's Mac on 26 Nov 2026: `scripts/ai-bakeoff/` (how to run it, what Claude is sent and its limits: its `README.md`). The numbers: `bakeoff/summary.md` and `bakeoff/results.json`; the blind page: `bakeoff/blind.html`.

- **What it does.** Claude lays out each of the 81 plated dishes from the book's own parts and library pieces (option 1). The prompt gives it each dish, its method, what Draw it for me draws today, the servingware names, the library and the house style measured from the 76 hand-made plates.
- **How it is scored.** Each plate is scored with the same measures as Draw it for me's own gate (`tests/plating-check.js`, which the bake-off loads with one change so it can also measure a drawing made elsewhere; the file itself is unchanged, so merging this republishes nothing). A self-test turns six of the book's own plates (among them the four worst) into answers and back, and each scores exactly the same.
- **Cost and limits.** A hard cap stops it before US$15. About 21,000 tokens of the prompt are cached and each dish adds about 1,000. Real cost and wait per plate are recorded.
- **The blind pick.** 15 dishes (the 10 Draw it for me draws worst, and 5 more) side by side, left and right shuffled (`docs/ai-drawing-options/bakeoff/blind.html` once run). The head chef sends back a code.
- **The key.** A Claude API key cannot be a network secret in the cloud environment, only an environment variable there (readable by every session and command in it). So it ran on the owner's Mac, where `run.js` asks for the key when it starts, hides the typing and keeps it in memory for that run only.
- **Left out on purpose.** Pans, side views and builds: a batch card's pan is drawn from the card as one part, so there is nothing to place.

### Results (26 Nov 2026)

**Cost and wait (measured).**
- All 81 dishes got an answer: none failed, none was handed to another model, and none named a piece or part that does not exist.
- US$2.46 for all 81: a median of US$0.03 a plate, at most US$0.19.
- Wait: a median of 9 s, the slowest 10% over 15 s, at most 23 s.
- At that cost, the US$100 credit is about 3,000 AI plates. The round 1 estimate was US$0.10 to 0.20 a plate.

**The head chef's blind picks: Claude 10, Draw it for me 1, neither 4, of 15.**

| # | Dish | Picked | Draw it for me score | Claude score |
| --- | --- | --- | --- | --- |
| 1 | Grill Maiden's Board | Neither | 0.76 | 0.50 |
| 2 | Philly Cheesesteak Loaded Potato | Claude | 0.00 | 3.54 |
| 3 | Pizza Platter | Neither | 1.28 | 0.15 |
| 4 | Fried Chicken Wings | Neither | 0.03 | 1.99 |
| 5 | Guacho Taco Share Board | Claude | 0.98 | 2.86 |
| 6 | Wedges | Claude | 1.15 | 0.53 |
| 7 | Haloumi Tacos | Claude | 1.00 | 4.71 |
| 8 | Seafood Platter | Claude | 1.53 | 3.44 |
| 9 | Yumcha Platter | Claude | 0.90 | 1.15 |
| 10 | 500 g Rump | Claude | 0.00 | 0.25 |
| 11 | Sticky Toffee Pudding | Claude | 0.07 | 0.42 |
| 12 | Kids Spaghetti Bolognese | Draw it for me | 0.00 | 0.19 |
| 13 | Butchers Board | Claude | 1.39 | 0.44 |
| 14 | Aussie Platter | Claude | 0.87 | 3.46 |
| 15 | The Beast Board | Neither | 1.07 | 2.58 |

- On the 10 dishes Draw it for me draws worst, Claude won 7. The other 3 were neither, all boards.
- On the 5 dishes the check already rated about 0, Claude still won 3.
- Which side was Claude's was worked out after the picks, from the page's fixed shuffle. All 81 dishes had an answer, so the page held exactly these 15.

**The score and the eye disagree.**
- By `tests/plating-check.js`, Claude did worse: a median of 0.44 against 0.01. 47 dishes scored worse by more than 0.1, 6 better and 28 the same. 12 scored over 2, against none for Draw it for me.
- Yet 8 of the head chef's 10 Claude picks scored worse than Draw it for me's plate, some by a lot: the loaded potato 3.54 against 0.00, the haloumi tacos 4.71 against 1.00, the Aussie platter 3.46 against 0.87.
- The check measures how close a plate sits to the house style of the 76 hand-made plates. Draw it for me was tuned to it on 15 Nov. The check marks down what loaded and share dishes do on purpose: toppings over a base, tacos side by side, a board's many pieces, a sauce zigzagged across.
- So the check is a guard for Draw it for me's own rules. It is not a judge of what the head chef likes, and it should not gate an AI plate.

**What Claude got wrong.**
- 7 dishes have something from the recipe missing from the plate (Check's own words; Draw it for me: 1). Some are right to leave off: the adobo's vinegar, onion and peppercorns are cooked in, and the pie mix is inside the pie. Some are real misses: the maple butter on the Butchers and Beast Boards, the chilli jalapeño butter on the corn, the gravy with the chips.
- Its "left off" list sometimes names a line it did draw under the book's own part names: chips and salad drawn as Chips and Salad, a burger's layers inside the book's burger. Check does not flag those.
- Boards are still the weak spot for both: 3 of the 4 neither picks were boards.

### Lead's recommendation after the bake-off

AI clearly wins by the head chef's eye: 10 of 15 against 1. That is the condition the council set for round 2, which designs the studio piece. Carry into round 2:
- the measured cost (US$0.03) and wait (9 s, up to 23 s), in place of the round 1 estimates;
- the five break-it risks from round 1;
- Check's "in the recipe but not on the plate" line kept on every AI plate;
- no `plating-check` gate on AI plates (it marks down what the head chef picked);
- boards treated with care, since neither drawer pleased the head chef there.

**Head chef's choice (26 Nov 2026):** run round 2.

## Round 2 (26 Nov 2026)

Evidence packet: [round2/packet.md](round2/packet.md). Designs, the frame and the blend: [round2/designs.md](round2/designs.md). Previews: `round2/previews/`, made in the real studio on the click-test stand-in with Claude's real bake-off plates. All measurements are Preview, not Implemented app. This is role-based review by fresh agents, not research with staff.

**The frame** (a UX and interaction designer, before anything was drawn). The one loud thing is guest-visible food left off the plate, because the allergen lens reads Pass labels made from parts. Count, money and used up stay quiet. Studio pieces need no OK; a "ready" notice on Home, the work pages or a ping would. Where the call runs is a real axis: a Cloud Function keeps a wait in the studio; the nightly job removes it.

**The three designs.**
- **A: Claude's version in the book's note.** Seconds, through a Cloud Function. Claude's plate swaps onto the canvas.
- **B: two buttons on the empty plate.** Claude's plate arrives in the studio's panel beside the book's. Seconds.
- **C: ask for tonight, pick tomorrow.** The nightly job (about US$0.19 for a night's first plate, US$0.03 for each further one), with a review page.

### Scores

| Reviewer | Ranking | Recommends |
| --- | --- | --- |
| Cook | A, C, B | A, with B's worded choices and a Keep that waits on the amber line |
| Head chef | C, A, B | C, staged: the bake-off plates first, the nightly ask only if used |
| Skeptic | C, A, B | C's path and list, asked from A's note, Keep opening the studio; the existing plates first |
| New starter | A, C, B | A, with Save alone keeping the plate on screen; explain "Claude" once |
| Keeper | C, A, B | C with A's note ask and Keep opening the studio |
| Screen designer | A, C, B | A, with red failure words, equal-weight buttons and a 44 px Add it |
| UX designer (scoring) | A, C, B | A, with the late answer offered, not applied |

First place: A 4, C 3. B was last for all seven.

**What all seven agree on:**
- Ask from the book's note, under one name.
- Reject B's second Draw button (Headspace, Linear).

Most also wanted Claude's plate seen full size in the studio before it is kept, rather than from a 150 px thumbnail: the cook, keeper, skeptic and UX designer (Airbnb). Three rejected a filled orange Keep, because the amber line should be the loudest thing: the screen designer, UX designer and new starter. **The real split was the path:** seconds, with Blaze, a header change and about US$0.19 a cold tap, against overnight, with no server and about US$0.03 for each plate after a night's first.

### The mix

| Source and part | Take or reject | Principle | Why |
| --- | --- | --- | --- |
| A: the ask in the book's note | Take (7 of 7) | Headspace, one name | The chef asks after seeing the free plate, so pays only when it disappoints |
| A: Claude's plate full size on the canvas | Take | Airbnb, the whole job together | Overlaps show where hand fixes happen |
| A: the Cloud Function, seconds | Reject | | Blaze, a header change, a second access check outside the rules; nobody asked again needed seconds (follow-up). Cost is about the same for one plate (US$0.19 either way); only further plates in the same night are cheaper |
| B: the second hero button | Reject (7 of 7) | Linear, Headspace | Two names; a choice before the free plate shows |
| B: worded choices, red failure words on paper | Take | Duolingo, truthful | Plain words for what stays |
| B: the panel compare | Reject | | At 390 px the note hid the book's plate; at 1920 Claude's plate was about 200 px |
| C: the nightly path | Take | | No server, a revert stops it; about US$0.19 for the first plate of a night and US$0.03 for each further one that night |
| C: its own review page | Reject for a chip | Where it goes: the smallest place that works | No new route; the plates open full size |
| C: one-tap Keep from a thumbnail | Reject | Airbnb | Hides a 64% overlap; skips the studio's save and Pass labels |
| C: its failure and stale words | Take | Duolingo | "The book's plate stays" |

**All three together** would mean two server paths, two counts and two places to compare: worse, said by every reviewer who assessed it. **The blend** is A's flow on C's path: Ask Claude tonight in the note, a "Claude's plates" chip in Recipes & drawings, Show Claude's plate full size on the canvas, and Save keeps the plate on screen. Its previews: `round2/previews/blend.png`.

**Review status: a lead synthesis, endorsed in a focused follow-up by the 3 of 3 reviewers asked** (the UX designer, the screen designer and the keeper). The cook, head chef, skeptic and new starter were not asked again.
- **Seconds or overnight** (asked of the two A-camp designers): neither needs seconds. Menu changes are planned ahead, and the book's plate covers tonight. A short-lived special may never get Claude's plate: say so plainly.
- **Their changes, taken into the blend:**
  - open on the book's plate and offer Claude's in the note;
  - the note says which plate is on screen;
  - keep `layout.auto` without `lv` (no new marker);
  - a private `claude/<rid>` document per dish;
  - a decline write when the book's plate is kept;
  - 44 px note buttons.
- **From 1280 px, both plates side by side** (UX designer): not previewed.

### Recommendation

**Recommend the blend: A's ask and full-size swap in the book's note, on C's overnight path, with a Claude's plates chip in Recipes & drawings.**
- **Why it wins.** It keeps the one name every reviewer asked for. It shows Claude's plate full size where it can be fixed. It needs no Blaze, no security header change and no access code outside the rules. On a menu-change day the chef asks for ten dishes and reviews all ten in one list, and that night costs about US$0.19 for the first plate and US$0.03 for each further one. A single ask costs about the same as the Cloud Function's US$0.19, so the cost case only holds for several dishes at once. A trimmed prompt would cut the first figure (Not evidenced).
- **Main downside.** A day's wait. A one-night special gains nothing.
- **Stage 0, optional.** The 81 plates Claude already drew could fill the chip first at no new cost, as the head chef reviewer and the skeptic asked. That needs the bake-off's answers brought over from the owner's Mac, and each recipe checked against 26 Nov.

**Disagreement:**
- **Cook:** Keep should wait until the amber line is answered (Add it or Leave it off). The blend does not block Save. Instead, the save slip names food left off, a proposed contract change.
- **New starter:** explain "Claude" once, where it is first offered. That is for the build.
- **UX designer:** wide screens should show both plates side by side. Not evidenced until built.

### Break-it findings

| # | Scenario | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- | --- |
| 1 | A recipe save redraws a kept Claude plate | Risk; source read of `redrawFrom()` only | `layout.auto` without `lv`; a failing-first case in `tests/autodraw.test.js`. With that, `keptOlder()` runs and today's slip says "Kept the older plate drawing... tap Draw it again", which would tell the chef to throw Claude's plate away: the slip must name Claude's plate instead | In the build |
| 2 | A slow night stops the Records count | Risk | The step in its own job with its own time limit, after the analysis; a node test with a stand-in API | In the build |
| 3 | Claude's plate offered over newer work: the card changed, a draft on the device, or the day 1 save rewrote the Pass labels | Risk | Check the card's signature without the Pass labels; offer in the note, never replace a draft | In the build |
| 4 | A plate saved with guest-visible food left off | Risk (Claude left off 7 dishes' items in the bake-off) | The amber line with Add it and Leave it off; the save slip names it (proposed change) | Head chef's call on the slip |
| 5 | The ready state cleared in a separate write that fails | Risk | Clear it in Save's batch through `W()`; a decline write | In the build |
| 6 | A third note button at 390 px | Reproduced in Preview: the actions ran past the note's edges (M4 before the fix) | The row wraps; the note leads with Claude's line and folds the recipe lines; 44 px buttons | Fixed in the preview, check in the build |
| 7 | Failure words on the dark note | Reproduced in Preview (cream in A4) | `--bad-on-dark`, measured 7.09:1 in the blend (screen designer) | Fixed in the preview |
| 8 | The wait shown as "about 10 s" | The bake-off: Butchers Board took 17 s | The blend has no wait on screen | Gone |
| 9 | The 03:00 run is late or skipped (GitHub drops some scheduled runs), or the chef asks after that night's run | Risk | Say "after tonight's run" and show the date asked; a "not drawn yet" state kept apart from failed; a node test of a skipped night | In the build |

### Contract fit

- **Service rules:** Works. The studio and Recipes & drawings are not service pages. There is no notice on Home, the work pages or a ping.
- **Where it goes:** Works. A line in the existing note, and a chip in the existing chip row of Recipes & drawings, second in the row and only while plates are ready.
- **Loudness:** Works. The amber line is the one loud thing: words 12.96:1, edge 5.05:1, from the tokens.
- **Colour and state:** Works on these points: red failure words 7.09:1; equal-weight choices; Save stays the one orange commit.
- **Not evidenced:**
  - focus and reduced motion;
  - Extra large text in the note;
  - the chip's unselected look;
  - the tap areas of the 44 px links.
- **Devices:** 390, 768, 1280 and 1920 previewed. Side by side from 1280 px is Not evidenced. The section screens are not relevant: this is chef management, not read from the bench.

**Departures for the head chef:**
- reversing 21 Oct ("no AI service") and 15 Nov ("without any AI for now");
- a new private `claude/` collection and its rules (looser, published before the code);
- the Claude API key as a GitHub Actions secret;
- the save slip naming food left off.

No Blaze and no security header change.

**Corrections made during round 2:**
- The packet first said the head chef picked neither "on 3 of 4 boards". In fact, of the 8 boards and platters, Claude won 5 and neither won 3.
- The cost of a single cold tap is about US$0.19 (measured once), not the warm US$0.03. The same holds overnight: the prompt is cached for minutes, so the first plate of each night pays about US$0.19 and only further plates that night pay about US$0.03.

**Head chef's choice:** waiting.
