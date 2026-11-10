# The mascot cheers real finished work

10 November 2026, Queensland. **Round 1: Build smaller, 5 of 5. Round 2: five of six rank B first, all six rank C last. Recommend B cut down: one compact card under a finished list (step 1), then A's sentence on the slip as words only (step 2, after step 1 has run). Owner decision pending.** No app code has changed.

[The idea list](ideas.md) · [Compare the designs](index.html) · [Proposal](proposal.md) · [Evidence packet](evidence-packet.md) · [Designs and measurements](designs.md)

This is role-based council analysis, not research with staff. Every measurement is a **Preview**: a review-only injection into the real app with the click tests' Firebase stand-in and made-up people. Nothing was measured in the implemented app or in the kitchen. Source: this branch on top of the mascot studies (`71cbf84`); the app files match `main` at `7f85629`.

## What the owner asked

"I want to use our little mascot as a cheerfully supporter for completed actions for example if someone started and finished a task give him a cheer up or something? But I want it to be across the whole board with usefully things to motivate the staff to get more prep done faster and to use the app more. Can you brainstorm some ideas like how Duolingo does it or other fancy apps? ... I was maybe thinking some kind of speech bubbles or something?"

Three things came out of it: [30 ideas](ideas.md) in nine families, a council verdict on whether to build, and three designs with a recommended first step.

## Research

Four researchers read the sources; 78 findings, each marked fetched, search result or from memory. The evidence is thin on kitchens: most of it is offices, warehouses, call centres and sales.

- **Duolingo** publishes small wins from small cheers at real moments: +1.7% 7 day return from a streak animation, +3.3% from lowering the daily bar to one lesson. Wording and a cap on volume mattered as much as art. Its characters take the full screen only when a lesson ends.
- **Other apps** cheer finished, confirmed work, now and then, at the edges of work, and let people turn it down (Mailchimp, Asana, Apple Fitness, Slack).
- **At work:** visible progress and the finish line help, shared team goals help (d = 0.56), specific unexpected thanks helps (about +7% output). Ranks, points and rewards for pace backfire. Praise that informs helps (d = 0.66); praise that rates the person backfires (d = -0.44). Time pressure is a food safety risk. Novelty fades in about four weeks.
- **Bubbles:** a speech bubble is a toast with a face. One at a time, nothing that exists only in the bubble, words that survive a second language.

## Round 1: should it be built?

Five fresh reviewers saw [the proposal](proposal.md), [the packet](evidence-packet.md) and today's screens. No design existed yet.

| Reviewer | Verdict | Accepts | Main reason | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | Edges; slip as words only at 60 px | The words do a kitchen job, the clip does not. The bottom of Prep is already crowded | Words first; a still only where no lines are left; no cheer if the server has not answered while the slip is up |
| Head chef | Build smaller | Edges only | It is the owner's wish, not a measured fault. The real gap is small and cheap | Prep only, words first, agree one measure and look after four weeks. Decide on Top tickers first |
| Skeptic | Build smaller | Edges only | The book shows progress four ways already; a bubble adds no fact | Cheer only the whole finished list, in words with the count and a still |
| New starter | Build smaller | Slip as words; edges | It is a words gap. "Done" can read as cooked; a Serve pose as order up | Make the sentence the feature and the mascot optional |
| Keeper of the book | Build smaller | Edges only | A cheer as an event needs acknowledgement tracking, a replay guard and Undo handling | Make it a state drawn from confirmed counts, not an event |

**Agreement.** The finish line saying nothing is a real gap. Words that name what is done and what is left are the useful part. Prep and Home only. No clips on a work page, no other pages, no Settings row yet. All five reject art on the progress bars.

**Disagreement.** The slip: cook and new starter accept words only; head chef, skeptic and keeper reject it. The skeptic would drop section cheers entirely.

**Taken into the designs from Break-it.** A section of one line is an ordinary tick and is not cheered (skeptic). A finish line is said once a kitchen day on a device (skeptic). Nothing is cheered until the server has the tick, and never late over a newer slip (cook, keeper, new starter). Another phone's tick is counted and not cheered (cook).

**Also raised.** The head chef and the skeptic both pointed at "Top tickers, last 7 days": the packet's own research says rankings backfire, and a team-worded cheer beside a personal medal strip sends two messages.

## The three designs

Full text, the differences table and every measurement: [designs.md](designs.md). In one line each:

- **A, The slip speaks.** The slip that already answers the tick carries the mascot's head and one more sentence. Nothing else changes.
- **B, He waits at the edges.** Never during the work. A card under a finished list, a note in Home's prep card, a host on an empty list.
- **C, The star on the bar.** His head rides each section's progress bar and winks with a small flag when the bar is full.
- **M** was the lead's draft blend after round 1 (A's sentence with no art, B's edges), drawn so a blend could be judged on one screen. Not a fourth design.

Measured at 390, 768 and 1280 px (Preview): taps to tick stay 1; no new control; 0 work rectangles moved in any design; 0 extra Firestore calls; the slip stays 60 px with the kitchen's one-word sections; A's and M's slip grows to 98 px (120 px at Extra large text) with a 47 letter line in a 23 letter section; B's and M's card added 128 px to a finished page and their Home note moved the prep rows down 56 px; C shows nothing on Orders at 390 px. 655 of 656 checks pass; the one failure is C's.

## Round 2: ranking and disagreement

Six fresh reviewers saw all three designs, M, the same packet and the measurements. Rankings are ordinal, best first; no numeric scale was used. M was shown in the same pass to save agents; reviewers ranked A, B and C first.

| Reviewer | Ranking | M against their first | Clip under a finished list | Recommendation and main reservation |
| --- | --- | --- | --- | --- |
| Cook mid-service | B, A, C | M beats B, narrowly | Serve once | M smaller: slip sentence capped at today's height, a shorter card that keeps a Done today row in view, Home words only at a finish line. Mid-work the cheer is small words most cooks will miss |
| Head chef | B, A, C | B beats M | Serve once | B smaller: the card only, its height reserved, no Home note, no empty-list host, no slip yet. A finished section gets nothing on Prep |
| Skeptic | B, A, C | B beats M | A still | The smallest piece of B: one still beside the book's own finished-list sentence, no extra page length. Look again after four weeks |
| New starter | A, B, C | M beats A | Serve once | M smaller and reworded: "3 left", not "Prep is done", a bubble that does not look like a chip, one mascot on Home. A missing sentence may read as a failed save |
| Keeper of the book | B, A, C | B beats M | Serve once | B smaller: the card, and a Home sentence with no second head and no height change. Leave the slip alone this release. Move the art out of `docs/` first |
| Screen designer | B, A, C | M beats B, narrowly | Serve once | M with five changes: slip at today's height, Home words at finish lines only, a bubble shape no control uses, count the Done today rows lost, settle the words |

All six say the designs differ structurally: A is an event on the slip, B is a state in the page, C is permanent art on the bars. Five rank B first; the new starter ranks A first for the words where the eye is. All six rank C last. On the blend the room splits three to three: cook, new starter and designer take M with changes; head chef, skeptic and keeper prefer B alone and would hold the slip sentence for later. Five of six would play Serve once under a finished list; the skeptic wants a still.

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Duolingo: a truthful answer, progress shows real completed work, no decorative reward | Works in Preview for the words (server-gated, Undo takes it back). Needs work: the head has no kitchen job | Works in Preview for the finished-list card. Needs work: the shift-start Home note and the empty-list host follow no finished work | Needs work: the head moves on every tick, so it is the progress display, and it shows nothing on Orders |
| Service rule 3 and Linear: nothing over a list unless it stops a mistake; the work stays prominent | Needs work: a winking head beside Undo over the list for 9 seconds; 98 to 120 px with long names | Works: nothing on Prep while lines are left (3 of 3, Preview) | Needs work: heads beside every heading all shift |
| Service rule 4 and Things 3: frequent actions stay in view | Works at one-word names (Preview) | Needs work as drawn: the card pushed Done today out of view at 390 px; Home rows down 56 px | Works: no page growth |
| Flighty: now and next, no distracting movement, no stale status | Needs work: "3 to go today" names no next section | Needs work: the Home note repeats two lines already on Home | Needs work: movement on every tick, no sentence |
| Headspace: calm, short, one name for one thing | Needs work: "to go" against the book's "left" | Needs work: the outlined bubble looks like a chip | Works for length: two words |

### Contract fit

| Check | Result and evidence |
| --- | --- |
| Surface purpose | Works in Preview. No work surface is recoloured. B's card sits in the notebook's own paper |
| State meaning and words | Works for the words: the green sentence shows only after the server answers, and the words carry it without colour. **Proposed change, the head chef's call:** an earlier record says "Serve: never a queued/successful-save indicator" and that a held Serve pose reads as "order up". A's wink and B's card both show only once the server has the tick. All six flagged it |
| Art is not status | A's head on the slip and C's heads on the bars are read by the council as art acting as status. B's card is art at a finished state, in page content |
| Rendered contrast | Slip sentence 5.76:1 at 16 px bold on the slip's paper. Bubble and flag ink 16.72:1. The recommended card's green bubble is measured below. No dark variant exists for these surfaces. Keyboard focus: no design adds a control |
| Relevant states | Checked in Preview for every design: ordinary tick, finishing tick, tick waiting to be sent, refused tick, Undo, another phone's tick, reduced motion, missing art, long names, Extra large text. Not evidenced: the shared tablet's "Who did this?" sheet, a cached or refused read, a list finished through a section chip (checked for the recommended version below) |
| Service continuity | Taps 1 before and after. 0 work rectangles moved at three widths. Undo keeps 44 px. B's card and Home note moved content as recorded; the recommended version removes both costs |
| Motion | One clip, once, then still. Reduced motion plays nothing and keeps the words (checked). C moves on every tick, against "no permanent movement beside lists" |
| Production offline, saved shell, access | Not evidenced by a preview. No design reads or writes anything |

### Break-it findings and disposition

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| A section of one line is finished by an ordinary tick, so most ticks cheer on a day of short sections (skeptic, round 1) | Risk raised before any design | Fixed in every design: sections under two lines never cheer. Checked in Preview at three widths |
| A section is finished, a line is added and ticked, and it cheers again (skeptic, round 1) | Risk | Fixed: once per finish line per kitchen day per device. Checked. The new starter notes the missing second sentence may read as a failed save: Risk / Not evidenced, ask staff |
| The cheer shows before the server has the tick, or on a refused tick | Checked in the stand-in with held, refused and released writes | Pass in all designs: nothing shows until the answer; a refusal shows the book's red slip only |
| The server answers after the slip has gone, or after a newer tick has its own slip (cook, skeptic, designer, keeper) | Preview ties the sentence to the slip of the tick that earned it: a late answer shows nothing. Not exercised with a 15 second delay or a real network | Step 2 only. Before any slip sentence ships: a client test with held, late and refused writes and a second tick in between |
| The slip grows over the list with long names (all six) | **Reproduced:** 67 to 98 px, and 80 to 120 px at Extra large text, in A and M | Fixed in the step 2 preview: one line or no sentence. Checked below |
| The finished-list card pushes Done today and its Undo links out of view at 390 px (cook, skeptic, designer) | **Reproduced** from the B and M screens: 128 px added, no Done today row in view with the slip up | Fixed in the recommended card: the mascot stands beside the book's own sentence. Measured below |
| The card's late arrival moves what is under it while a thumb heads for Undo in Done today (head chef) | Risk / Not evidenced | The recommended card takes the place the book's sentence already holds. Implementation reserves its height; test with a held write |
| An empty list that is only empty because the read came from the cache gets a host (head chef, keeper) | Risk / Not evidenced. The book has shipped this class of bug before | The empty-list host is cut from the recommendation |
| A section chip: Larder finished on its own tab while other sections are open (head chef, new starter, skeptic) | Not shown in round 2 | Checked for the recommended version below: the book's own words, no card |
| The bubble looks like a filter chip and gets tapped (new starter, designer) | Likeness seen in the stills. Tapping is a hypothesis | Fixed in the recommended card: a speech shape in the done green with no outline |
| "Prep is done" claims more than the list knows; "to go" against the book's "left" (new starter, skeptic, designer) | The packet itself showed two wordings | Fixed: "Every line ticked. 6 of 6." and "Grill has 1 left." Wording stays the head chef's call |
| The held burger pose reads as "order up" (earlier record; all six) | Risk / Not evidenced; no staff asked | **Head chef's call.** The preview holds the burger. A neutral still is a one-line change |
| C on Orders at 390 px shows nothing | **Reproduced** (the one failed check) | C is not recommended |
| Art under `docs/`, and `sw.js` keeps any file it fetches (keeper) | Checked in source in the cycle study | Before release: move the art to an app folder, fixed names, out of or bounded in the runtime cache |

No access, data-loss or service-blocking fault was found in the bounded previews. That does not certify an implementation.

## All-three mix and recommendation

| Source and part | Take or reject | Principle and kitchen effect | Cost or evidence |
| --- | --- | --- | --- |
| B: the card under a finished list, once the server has every tick | **Take, cut down** | Duolingo: the character takes space only at the end of confirmed work. The one place art covers nothing | All six take it. Compact form measured below |
| B: Serve played once there, then a still | **Take, with the head chef's OK** | Motion arrives, then settles | Five of six. Touches the "Serve is not a save indicator" record |
| A: the sentence on the slip at a finished section, no art | **Take as step 2** | After the tap rule 2: words that name what changed, where the eye is | Three want it now, three want it staged. One line or nothing; needs the implemented write hook tested first |
| A: the head on the slip | Reject | Service rule 3; art acting as a status | All six |
| B: the shift-start Home note and second head | Reject | Not a finish line; repeats Your day and the row; 56 px; two mascots on Home | Five of six. Home's rows already say "Done" and "1 left" |
| B: the host on an empty list | Reject for now | A cached or refused read also looks empty | Head chef, skeptic, keeper |
| C: heads on the bars, the flag, the header head | Reject | Second status system; movement on every tick; under 32 px | All six, and all five in round 1 |
| C: "the bar and the count stay the status" | Keep as a rule | The green bar and "2/2" already mark a finished section | No build |

**Recommend B cut down, in two steps.**

**Step 1, build first: one compact card under a finished list on Prep.** When every line is ticked and the server has every tick, the mascot stands beside the book's own sentence with one bubble, "Every line ticked. 6 of 6." The book's sentence keeps its second half, "See Done today under Handy.", so the finish is said once. The card is the list's state: it shows on every device and after a reload, as a still. On the device whose tick finished the list he plays Serve once, after the ticked lines have left, then rests. Undo takes it back. Nothing shows while lines are left, nothing on the slip, nothing new on Home (the daily action chosen on 9 November is Home's mascot), no setting, no reads.

**Step 2, after step 1 has run about four weeks: the sentence on the slip.** At a finished section of two or more lines the slip adds one line of words, "Sauce is done. Larder has 2 left.", with no art. One line or nothing: if the ticked name already wraps, or the sentence would not fit, the slip is exactly today's. Only while that tick's own slip is up, never late.

**Why this beats the alternatives.** It is the only part all eleven reviews across both rounds accept, it covers no line, and as a state it needs no acknowledgement tracking, replay guard or timing test (keeper). It gives the owner the cheer at the biggest true moment of the day with the mascot and a speech bubble. A alone puts new code and art on the surface that carries Undo. C makes the mascot a second status system. An A + B + C blend does not beat it: C adds nothing that passes the contracts, and A's head and B's card would put two sprites on one tick.

**Main downside.** It is seen at most once a day, and on days the list is not cleared, never. A finished section, the more common finish line, says nothing new until step 2. Whether any of it changes how much prep gets done is Not evidenced, and the research says novelty fades in about four weeks. The head chef reviewer named what would flip the order: if a whole list is rarely finished in a shift, the section sentence is where the value is and step 2 should come first.

**Review status.** Steps 1 and 2 are a lead synthesis after round 2, built as one preview (`R` and `S` in `candidate.js`) and measured. They were not re-reviewed: every change traces to a reviewer's request in the table above and adds no flow the council did not see. The three-to-three split on the slip sentence stands and is the head chef's to settle.

### The recommended preview, measured

| Measure | Today | Step 1 (R) | Step 2 (S) |
| --- | --- | --- | --- |
| Taps to tick a line; new controls | 1; none | 1; none | 1; none |
| Lines in view at the tick that finishes Sauce, 390 px | 4 | 4 | 4 |
| Slip height at that tick, px, 390 / 768 / 1280 | 60 / 60 / 60 | 60 / 60 / 60 | 60 / 60 / 60 |
| Page length of a finished list, 390 px | 1129 px | 1129 px | 1129 px |
| Done today Undo links in view while the last line lingers, 390 / 768 px | 1 / 4 | 1 / 3 | 1 / 3 |
| Done today Undo links in view once the lines have left, 390 / 768 px | 2 / 5 | 2 / 5 | 2 / 5 |
| Work rectangles moved on Prep and Home, 7 steps at 3 widths | | 0 | 0 |
| Extra Firestore calls | | 0 | 0 |
| Art fetched in the walk | | burger-sheet-compact.webp, burger-still.png, manifest.json (336 KB) | burger-sheet-compact.webp, burger-still.png, manifest.json (336 KB) |
| Rendered contrast of the new words, 390 px | | bubble 5.2:1 at 16px | bubble 5.2:1 at 16px; slip sentence 5.76:1 at 16px |
| Slip with a 47 letter line in Sauce, normal / Extra large text, px | 67 / 80 | n/a | 67 / 80 (no sentence added) |
| Preview checks passed | | 135 of 136 | 138 of 139 |

`verification-recommended.json`: 350 checks, 75 screens, 4 films. Failed: R 768 list: the same Done today Undo links in view; S 768 list: the same Done today Undo links in view.

Checked for both steps in the stand-in: Undo takes the cheer back; a finished list opened later shows the card as a still and says nothing again; a finished section chip is not a finished list: no card; a long line name in a one-word section, Extra large text: the slip is exactly today's height; a long line name in a one-word section: the slip is exactly today's height; a refused tick is not cheered; a section finished a second time the same day is not cheered again; a tick waiting to be sent is not cheered; another phone's tick is counted but not cheered here; missing art keeps the words and moves no work; reduced motion keeps the words and plays nothing; the cheer comes once the server has answered.

**One cost, stated (service rule 4).** At 768 px, for the 3.5 seconds the last ticked line lingers, one fewer Done today row is in view (4 to 3). At that width the book's sentence fits on one line and the card needs about 34 px more. Once the lines leave it is the same as today (5 and 5), and at 390 px nothing is lost at either moment (1 and 1, then 2 and 2). The two failed checks are this. The lead's view: worth it, because it lasts 3.5 seconds and the slip's own Undo covers the line just ticked; the implementation should try the bubble and the book's words on one row at tablet width.

The owner's own example, started then finished, has one preview screen as a later idea: `evidence/a-started-finished-390.png` ("Started and finished." on the slip, words and a still, no clip).

## Decisions for the head chef

1. **Build step 1?** The compact card under a finished Prep list.
2. **Clip or still.** Serve once (five of six) or a still (skeptic). And his resting pose: holding the burger, or neutral, given the earlier "order up" record.
3. **The slip sentence.** Now, as step 2, or not at all. The council split three to three.
4. **The words.** "Every line ticked. 6 of 6." and "Larder has 2 left." are drawn. "Is done" against "is ticked" is worth asking three staff.
5. **Top tickers.** Keep the medal strip, switch it off, or replace it with a no-names kitchen line. Raised by the head chef and skeptic reviewers and by all four idea lenses.
6. **One measure.** Agree what to look at after four weeks: days the list is cleared, or lines left unticked at close.
7. **Later ideas, each its own council.** Thanks from Chef carried by the mascot (the strongest idea in the evidence), started-and-finished (your own example; one preview screen exists, `evidence/a-started-finished-390.png`), the pack down card when Cleaning is on for the team.

## Before release (implementation, not this preview)

- Take the finish line from the tick handler and the write's own answer, not from reading the page. Never from a cached answer.
- Move the art out of `docs/` to an app folder with fixed names. One still and one clip. Keep them out of `SHELL` and out of, or bounded in, the `sw.js` runtime cache.
- Reserve the card's height where the book's sentence sits, so a late answer moves nothing.
- Client tests: a held, late and refused finishing tick; Undo; another phone's tick; a line added after the finish; a section chip; a reload on a finished list; reduced motion; missing art; no extra reads (`tests/read-budget.test.js`); the shared tablet's "Who did this?" sheet.
- Full app at 390, 768 and 1280 px with real section names, long names and Extra large text. Count the Done today rows in view before and after.
- `docs/design-patterns.md` gets the card as a pattern, with its names in `tests/design-patterns.test.js`. `docs/head-chef-decisions.md` records the choice and the ruling on the Serve record.

## Chosen

Pending the owner's selection.
