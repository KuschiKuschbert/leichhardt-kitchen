# April Fools on Home: brief

17 November 2026, Queensland. The head chef asked: "For the 1st of April I'd like to trick everyone with a completely weird home page animation, like a hacker has hacked into the page and broken all elements. A super weird animation that also says their name on the day and completely breaks the visual design. Something dark and cruel so they think they broke something when they first log in. Hacker style, psychedelic, elements of the real design move around weird and break."

Files: `proposal.md` (round 1), `evidence-packet.md` (contracts and measurements given to every reviewer), `designs.md` (the shared rules and designs A, B and C, round 2), `ideas.md` (the first idea list), `pool.md` (the 24 one-minute jokes the head chef then asked for, and how they are dealt), `preview/index.html` (plays all 24 on a frozen copy of Home; open it in any browser), `evidence/` (today's Home, the round 2 frame strips, and `pool/` with frames of all 24). This is role-based analysis by six fresh reviewers, not research with real staff.

**Status: after round 2 the head chef asked for a pool of jokes, one per person, never the same twice, then chose 35 seconds each, darker, with their own day (below). Built in the book on 17 November 2026 (`docs/april-fools.md`).**

## Round 1: should we build it?

**Verdict: Build smaller, 5 of 5.** It fixes no kitchen problem; it is a once-a-year joke from the head chef, cheap in reads and files, but risky if it plays at the wrong moment or breaks Home for real.

| Reviewer | Verdict | Main reason | The one change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | At 17:00 the first thing I look for is my section and break; a swallowed tap on Prep makes the book look really broken | Only before the person's shift; otherwise just the mascot's line |
| Head chef | Build smaller | No kitchen problem; a scare can backfire on a junior and teach people that a broken screen might be a joke | Before 12:00 only (pranks end at noon), never on a shared screen, short, no failure red |
| Skeptic | Build smaller | The mascot, his named bubble and the celebration arrival already do most of the moving parts; Home changes every week | Animate a copy over Home, leave the real Home untouched, a timer that removes it, save "played" at the start |
| New starter | Build smaller | Bali and Nepal may not know April Fools; a scared person reloads or closes the app instead of tapping | The reveal always reaches you, even after a reload, in plain words that explain 1 April |
| Keeper | Build smaller | Cheap (no reads, writes or listeners) if it stays lazy; the danger is the joke becoming a real fault during the redraws after a PIN | A copy in an overlay, transform and opacity only, ending itself by CSS; play only when `lkServerUp()` and no work is waiting |

Disagreement: none on the verdict. On length, the head chef said 5 seconds at most; the Keeper about 6; the designs run about 8 to 9 with a one-tap skip, which is the head chef's call.

Every cut was taken into the designs as a shared rule (`designs.md`, "What every design keeps"): 1 April 04:00 to 11:59 only; personal devices; a copy laid over Home that hides itself after 10 seconds; "played" saved at the start with the reveal recovered after a reload; not offline, with reads used up or with work waiting; no failure red; transform and opacity only; otherwise just the mascot's words.

### Round 1 Break-it findings

| Scenario | Role and state | Expected | Status | Repair |
| --- | --- | --- | --- | --- |
| Home redraws while the joke plays (`lk-access`, `lk-cfg`, `lk-greet`, first data) | Any person, first PIN of the day | The joke never writes into live cards; Home stays usable | Risk / Not evidenced in the app. The preview plays on a copy only and leaves Home untouched (Checked in the preview) | Copy, never the real page; end on redraw; a click test fires a redraw and a thrown error mid-play |
| Panic reload or closing the app | New starter, personal phone | No second scare; the reveal still reaches them | Risk / Not evidenced | Save at the start; the next Home view that day shows only the reveal |
| Midnight versus 04:00, wrong phone clock | A closer at 00:40; a phone before `ready()` | No prank during pack down or on 31 March | Risk / Not evidenced | 04:00 to 11:59 on 1 April, after `LK_TIME.ready()`; test the boundary times |
| A real failure on the day | Offline, reads used up, a write waiting | "Nothing is broken" stays true; real errors are not waved off | Risk / Not evidenced | Do not play unless `lkServerUp()` and no work waiting |
| Shared tablet at the pass | Four people signing in at 17:00 | No one locked out at service | Risk / Not evidenced | Personal devices only, mornings only |

## Round 2: the designs

Three structurally different designs, all about 8 to 9 seconds with any tap skipping (`designs.md`, frames in `evidence/A-collapse-390.png`, `B-takeover-390.png`, `C-possessed-390.png`): **A Collapse** breaks the real layout (crack, cards fall, dark, typed words), **B Takeover** replaces the screen (telly off, terminal, countdown, 0x0401 to 1 APRIL), **C Possessed** corrupts the words in place and lets taps drive it. All six reviewers agreed they differ in structure, except the screen designer, who saw A and B as two passive "watch, then dark words" flows.

| Reviewer | A | B | C | Recommendation |
| --- | --- | --- | --- | --- |
| Cook mid-service | 7 | 5 | 3 | A's fall and dark, ending on B's 1 APRIL; no crack; no countdown |
| Head chef | 7 | 6 | 4 | A's crack and fall, then B's HELLO and 0x0401 to 1 APRIL in one dark phase, C's still colour split |
| Skeptic | 6 | 5 | 3 | A without the crack, ending on B's 0x0401 to 1 APRIL |
| New starter | 7 | 4 | 3 | A, without "what did you press?", with 1 APRIL typed last and "You did nothing wrong." in the reveal |
| Keeper | 6 | 8 | 3 | B (cheapest, two selectors), opened by A's card fall |
| Screen designer | 7 | 6 | 3 | A with B's ending and C's puns |
| **Mean** | **6.7** | **5.7** | **3.2** | |

Scores are out of 10, as each reviewer gave them. Contract fit: A Works except the crack and "what did you press?" (rule 7: threaten the book, not the person); B Needs work (coworker blame lines, "access HEAD CHEF", the success green on "gone", the "call the head chef" countdown); C Needs work (taps that make it worse, 602 ms a second, the inversion). Reference fit: Duolingo (an honest answer: the pieces fly back, 1 APRIL before the reveal) and Headspace (plain words, no blame) favoured A with B's ending; Flighty's calm-motion rule is broken on purpose, on Home only.

**Mix of all three:** five of six said a full blend loses (C's taps contradict "any tap skips", two dark phases repeat the same beat, the cost adds up). Most named the same narrow mix.

**Council recommendation: A's collapse ending on B's 0x0401 to 1 APRIL, without the blame lines, under 10 seconds, any tap skips.** Main downside: about seven seconds with no clue for someone who has never heard of April Fools.

### Round 2 Break-it findings

| Scenario | Status | Disposition |
| --- | --- | --- |
| The skip tap opens the reveal on pointerdown and its own click closes it 8 ms later, unread | Reproduced in the preview (skeptic) | Fixed: taps no longer end the joke; the reveal's backdrop ignores taps for 1.5 s and its button needs a fresh press after 0.6 s. Checked in the preview: a 1.4 s hold then a frantic tap leaves the card up; a tap after 1.5 s closes it and focus goes to the Home heading |
| The 10 s self-hide never fired (`to { visibility: hidden }` with a forward fill) | Reproduced in the preview (skeptic) | Fixed with `from, to { visibility: hidden }` at 65 s. Checked: a layer whose script never runs is hidden after its delay |
| Tab and Enter reached the real cooling clock under the copy | Reproduced in the preview (skeptic) | Fixed: the real `#app` is inert while the joke plays. Checked: Tab reaches nothing on the page |
| C: fast taps stack the inversion and both flips inside a second (photosensitivity) | Risk, rough frame count only, not PEAT | Mitigated: one break per 0.25 s of taps, only ever one inversion, ramped over 0.9 s. A proper flash analysis is still needed before release |
| The copy taken in the first second has no mascot art or cards yet; the mascot's daily action plays unseen underneath | Risk / Not evidenced (keeper) | For the build: start after the first server paint and his rest pose; hold his daily action until after the reveal |
| Storage refused: "played" lives in memory, a reload plays it again | Risk / Not evidenced (keeper) | For the build: if the save fails, give the words only |
| Focus after the reveal went to the page body; the preview's "390" phone was 370 x 824 | Reproduced (screen designer) | Fixed: focus goes to the Home heading; the frame is now exactly 390 x 844 |

## The head chef's decision, 17 November 2026

After playing A, B and C: "i like all of them, can we make more so each of the staff members gets a random one but no two ever get the same", for a team of **13 to 20**, unique **on the day and every year**, and "maybe take your time, 1 minute to fool them should be fine for them to realise whats going on".

So the council's single short joke became **a pool of 24 one-minute jokes**: twelve designs, each in two versions, dealt so that nobody shares a joke and nobody gets last year's design. Everything is in `pool.md`; all 24 play in `preview/index.html`; frames in `evidence/pool/`.

Departures from the council's advice that the head chef chose (recorded, not reopened):

- **One minute, then 35 seconds**, not 5 to 9 seconds. At that length a tap cannot skip, so **taps make the tapped piece break more** and **holding a finger down for 1.2 s stops it** ("Hold anywhere to stop" after four taps or at 25 s). Five of six reviewers rejected taps that make it worse in C; the hold, the hint and Escape are the way out WCAG 2.2.2 needs.
- **C's colour wheel and single inversion** stay (designer, skeptic and keeper would cut them).
- **A1 keeps the glass crack and "what did you press?"** (cook, new starter and skeptic would cut the crack; four would cut the line). A2 is the gentler version of both, so the deal can be told to skip A1 if wanted.

Kept from the council: mornings only (04:00 to 11:59), personal devices only, a copy over Home with the real page inert, the self-hide, the reveal recovered after a reload, nothing when offline or with work waiting, no coworker blamed, no real failure red, no claim of a real breach, the clue before the reveal and "You did nothing wrong."

Later the same day the head chef found one minute too long and, after trying 15 to 60 seconds on the live page, chose **35 seconds** for every joke (`pool.md`, Length). The head chef asked for it to go darker (`pool.md`, Darker: a closing vignette, red eyes, static, the softened lines restored, more personal lines) and for each joke to use the person's own day: their section, shift, break, coworkers and prep count, from what their Home already shows, with no reads (`pool.md`, Their own day).

**Status: built in the book on 17 November 2026 with all 24, for everyone who signs in on 1 April on any device, with a preview in the admin panel (`docs/april-fools.md`).**
