# Cycling the kitchen mascot through its actions

9 November 2026, Queensland. **Round 1 verdict: Build smaller, 5 of 5. Owner chose a per-person shuffled set of all 11 actions, one a day (see Owner direction). Round 2: all six reviewers recommend A. Owner choice pending.** No app code has changed. [Proposal](proposal.md). Evidence reused from the [placement study](../mascot-placement-options/brief.md) (source `e6cbd61`, app files match `main` `7f85629`). This is role-based council analysis, not research with real staff. All measurements below are **Preview** from the placement study; nothing is measured in the implemented app.

## The idea

The owner wants the mascot to cycle through all eleven actions, so the whole library is seen, instead of only Welcome (the placement study's recommended A). Four forms went to the council: (1) a continuous showreel in A's Home spot, (2) one 36 s round on arrival then a still, (3) a different action each Home arrival, then a still, (4) cycling only inside C's opened collection fold.

## Round 1

| Reviewer | Verdict | Accepts | Main reason | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | 3, then 4 | A loop on a tablet left on Home moves beside the board all service; Serve and Ready to cook read as a signal at arm's length | Form 3 without Serve, Ready to cook and Look around |
| Head chef | Build smaller | 4 (only if the fold is wanted), then 3 | No kitchen problem: it serves the owner's wish to see the work. Forms 1 and 2 break motion contracts and cost about ten times A's download | Ship A first; keep the full set in the gallery |
| Skeptic | Build smaller | 4, or 3 narrowed | The gallery already shows all eleven; form 3 replays on every return, against "returning the same day opens at rest" | One action per kitchen day, first Home view only, from an allowed list |
| New starter | Build smaller | 4, or 3 cut down | A moving robot under the bell can look like a ping; Ready to cook, Serve and Recipe reading look like status or instructions; a new action each visit reads as news | Cycle only inside C's labelled collection, with Play and the action names |
| Keeper of the book | Build smaller | 3 (4 adds nothing over the gallery) | Forms 1 and 2: 3.1 MB download and about 17 MB of decoded atlases on an always-on tablet. Form 3 is A's lifecycle plus a phone-kept index | Index in `lk.*`, first Home view of the kitchen day, every atlas out of `SHELL` |

**Agreement.** All five reject forms 1 and 2: they break "arrives, then settles" (`docs/seasonal-celebrations.md`), Idle's "no permanent movement beside lists" and Flighty's no-distracting-movement principle, and download up to 3,136,082 bytes against A's one atlas and one still. No form adds a tap or removes a line: Prep Add/tick stay 1/1 and 4 Prep rows show above the dock at 390 px (Preview).

**Disagreement.** Form 3 or form 4. Cook and keeper prefer 3; head chef, skeptic and new starter prefer 4. Every reviewer accepts one of them, and all five would accept a narrowed form 3: the head chef as second choice, the new starter and skeptic only if cut down. The keeper says form 4 duplicates the gallery.

**Convergent narrowing of form 3** (cook, skeptic, keeper; new starter's status concern):
- One action per kitchen day, on the first Home view only, then a still. Returning the same day opens at rest, as celebrations do.
- An allowed list without the status-like actions: leave out Serve, Ready to cook, Look around and Recipe reading. That leaves Welcome, Idle, Smash, Flip, Build, Walk and At the smoker. The new starter also flagged cooking verbs as possible instructions; that stays a risk for round 2.
- The next index is kept on the phone (`lk.*`), out of date on the next kitchen day. One atlas per arrival; no atlas in `SHELL`.
- Inherit A's guards: omitted for long names, locked Home and missing art; still under reduced motion and Still celebrations.

## Contract fit

| Form | Result | Source and evidence |
| --- | --- | --- |
| 1 Showreel | Needs work (breaks contract) | Arrives then settles; no permanent movement beside lists |
| 2 One round | Needs work (breaks contract) | 36.4 s against the about 4 s arrival budget |
| 3 As proposed | Needs work | Replays on every return; status-like actions |
| 3 Narrowed | Not evidenced | Fits on paper if it inherits A's guards; no lifecycle check yet |
| 4 Fold | Works in Preview | C's earlier preview and contrast checks; implemented app Not evidenced |

## Break-it findings

| Scenario | Expected | Hypothesis | Status | Smallest check |
| --- | --- | --- | --- | --- |
| Shared tablet on Home in service, form 1 | Decoration never reads as status | Serve or Ready to cook beside "In 10 min" read as "function ready" | Risk / Not evidenced | Reject loop; allowed list |
| Staff phone returns to Home often, form 3 | Return opens at rest | Near-continuous motion beside the live board | Risk / Not evidenced | First Home view of the kitchen day only |
| Offline arrival or signal lost mid-round | Art skipped quietly, no retry, no update hold-up | Uncached atlas stalls or blanks the sprite; the gallery player has no offline handling | Risk / Not evidenced | Client test with blocked art and offline reopen |
| Home redrawn or device handed over | One player, timers and observers released | Clips stack up | Risk / Not evidenced | Count active timers, observers and decoded images across return, redraw, reduced motion, offline and failed fetch |
| Atlases reach the saved shell | Shell unchanged | Rotated atlases cached or slow an update | Risk / Not evidenced | Saved-shell generation check that no atlas is in it |

## Recommendation for the owner

**Build smaller: the narrowed form 3** (round 1 recommendation, before the owner's direction below), one allowed action per kitchen day on the first Home view, then a still, in A's spot. It brings the library into the app over the week without breaking the Home motion contract, needs one atlas a day and reuses A's player and guards. Main downside: it is still decoration with no kitchen task, and the new starter and head chef reviewers would rather keep the cycle inside a collection (form 4) or in the gallery. Forms 1 and 2 are not recommended.

Next, if the owner agrees: round 2 with three structurally different designs of the chosen form, previews under this folder and the six-reviewer scoring.

## Owner direction, 9 November 2026

The owner refined the recommendation: "can we have a random action come up for each staff member at everyday but we have to cycle through all available animations before we can repeat the animations again?" Then chose **all 11 actions** and **kept on each phone**.

- **Rule.** On the first Home view of the kitchen day, the signed-in person sees one action from their own shuffled set, played once, then a still. Returning to Home the same day opens at rest. When all 11 have played for that person, the set reshuffles; the first draw of a new set is never the last action of the old one, so no action shows two days running.
- **Storage.** One small record per person on the device (`lk.*`): the remaining set and the kitchen day it last played. Out of date: never, except the day stamp gates replay. No Firestore reads, writes, listeners or rules. A person on their phone and the shared tablet keeps two sets, so an action can repeat across devices. Random draws use a seeded shuffle, not `Math.random` in a way that tests cannot pin.
- **Kitchen day** follows the book's clock (`dayNow()`, Queensland, the same day boundary as the seasonal arrival), never `new Date()`.
- **Departure from the council.** Serve, Ready to cook, Look around and Recipe reading stay in the set by the owner's choice. The status-like risk stays open for round 2. Smallest mitigation to design and test: after any action the mascot settles on the neutral Welcome or Idle still, so a status-like pose is never what sits beside the board all shift.
- **Retained from round 1.** A's spot and guards (omitted for long names, locked Home, missing art; still under reduced motion and Still celebrations), one atlas per day, no atlas in `SHELL`, and the break-it checks above.
- **Size.** Eleven kitchen days for a full round per person.

## Round 2: three designs

Built as review-only injections into the real Home page (`candidate.js`, `candidate.css`), captured by `capture.mjs` with the click-test Firebase stand-in and synthetic staff. [Compare them](index.html). Measurements are **Preview**, source `783a60f` on this branch, role staff (Ann), fixture Lunch on Larder, local Barlow and Caveat. `verification.json` holds 156 checks, all passing after the Break-it repairs below, and 19 screenshots.

All three share the owner's rule, A's spot (64 x 85 px at x310 y76 on a 390 px phone, between the top bar and Your day), A's omission rules and one atlas a day. They differ in what starts the action, what stays on screen after it and whether the mascot is a control.

| | A: Quiet draw | B: Today's pose | C: Tap to see |
| --- | --- | --- | --- |
| Central idea | Plays by itself once, then the neutral Welcome pose | Plays by itself once, then holds today's action pose; tap replays | Never moves by itself; Idle pose waits, tap plays today's action |
| Trigger | First Home view of the kitchen day | First Home view, and any tap | Tap only |
| At rest beside the board | Welcome, every day | Today's pose (Serve, Ready to cook, Recipe reading...) all day | Idle, every day |
| Control | None, decorative, hidden from screen readers | Button, 64 x 85 px, named "Kitchen mascot. Today: Serve. Play again" | Button, 64 x 85 px, named "Kitchen mascot. Play today's action" |
| Set advances | Every kitchen day Home is opened | Every kitchen day Home is opened | Only on days the person taps |
| Status-like pose risk | Plays about 3 s, never held | Held all day | Only after the person asks |

Structural differences: A vs B differ in end state and interaction (no control vs a replay button); A vs C in trigger and rest state (automatic vs on request, Welcome vs Idle); B vs C in trigger and what the rest state means (today's pose vs a neutral waiting pose).

### Measured service cost (Preview)

| Measure | Baseline | A | B | C |
| --- | --- | --- | --- | --- |
| Home rectangles changed (390, 768, 1280) | | 0 | 0 | 0 |
| Prep, Orders, recipe search taps | unchanged | unchanged | unchanged | unchanged |
| Mascot on Prep or any work page | | no | no | no |
| New Firestore calls | | 0 | 0 | 0 |
| Automatic motion per kitchen day | | one play, 2.5 to 3.9 s | one play, 2.5 to 3.9 s | none |
| New tap targets on Home | | 0 | 1 (64 x 85) | 1 (64 x 85) |
| Atlas downloads per day | | 1 | 1, plus none for replays | 0 or 1 |
| Build size | | 1 pull request | 1, plus button focus and label | 1, plus button focus and label |

### Checked in the preview (`verification.json`)

- **Shuffle:** for Ann and Bo, each of three rounds of 11 shows every action once; no action two days running across 33 days; the two orders differ.
- **Day flow:** first Home view plays once and rests (A, B); return to Home the same day stays still and loads no atlas; the next kitchen day takes the next action and the set shrinks by one; C waits for a tap on the next day too.
- **Lifecycle:** hidden tab ends the play at once on the rest image; reduced motion shows a still and loads no atlas; missing art removes the mascot and leaves every Home rectangle as it was, without retrying; a 40-character name omits the mascot and keeps the name; Diwali art and the mascot coexist without moving anything.
- **Targets:** B and C buttons are 64 x 85 px at 390 px; a tap plays and rests again.
- **Not evidenced:** native offline and saved-shell behaviour, a real shared tablet in service, staff reading the poses, screen readers in use, keyboard focus contrast, battery.

## Round 2: ranking and disagreement

Six fresh reviewers saw all three designs, the same evidence and the same contracts. The ranking is ordinal, best first; no numeric scale was used.

| Reviewer | Ranking | Recommendation and main reservation |
| --- | --- | --- |
| Cook mid-service | A, C, B | A. A button about 16 px under the chef hat catches wet-thumb misses (estimated from the screenshot); each sign-in on a shared tablet replays in service |
| Head chef | A, B, C | A, plus: take an action from the set only after it has played. C defeats the owner's goal: most staff never tap, so most never see most actions |
| Skeptic | A, C, B | A once the hidden-view fault is fixed. Still decoration |
| New starter | A, C, B | A. B's held Ready to cook or Serve reads as "station ready" or "order up"; C's still gives no sign it can be tapped |
| Keeper of the book | A, C, B | A, keyed by staff id, with the stamp pattern of the seasonal arrival; keep atlases out of the runtime cache |
| Screen designer | A, C, B | A. B and C put a button inside the heading, so the heading reads out the mascot label; a pale pressed box stays after a tap |

All six rank A first. Five rank B last for the held status-like pose; the head chef ranks C last because the set barely moves. The screen designer said A and C look nearly the same at rest and the real differences are trigger and control; the other five called the designs structurally different.

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Flighty: no distracting movement, no stale status shown as live | Works: one play, then a neutral pose | Needs work: today's pose held beside the board all day | Works: no automatic movement |
| Linear: the work leads, state shown means state | Works: decoration only, hidden from screen readers | Needs work: a held pose looks like a state | Needs work: a control with no task in the heading |
| Duolingo: each tap answers truthfully | Not relevant: no tap | Needs work: under reduced motion a tap shows nothing new | Needs work: same, and a tap answers with motion only |
| Things 3: no stray targets | Works | Needs work: 64 x 85 px target under the top bar | Needs work: same |
| Headspace: calm, no interruption | Works | Needs work | Works |

### Contract fit

| Check | A | B | C | Source |
| --- | --- | --- | --- | --- |
| Arrives, then settles | Works (Preview: one play of 2.5 to 3.9 s, return opens at rest) | Needs work (held pose) | Works | `docs/seasonal-celebrations.md`, `docs/loading-motion.md` |
| Home rectangles and service taps | Works (0 changed at 390, 768, 1280; Prep, Orders, search unchanged) | Works | Works | `verification.json` |
| No new service control in the named heading | Works | Needs work | Needs work | `docs/design-patterns.md`, Named Home heading |
| Ornaments out of the heading area | **Your call:** the mascot sits in the heading's spare space, as the placement study's A did. The named heading rule keeps anchored seasonal ornaments out of that area; the mascot is not a seasonal ornament, but it is the same kind of object | same | same | `docs/design-patterns.md` |
| Action feedback | Not relevant | Needs work | Needs work | `docs/action-feedback.md` |
| Saved shell and offline | Not evidenced; see Break-it | Not evidenced | Not evidenced | `sw.js` `net()` |
| Contrast, focus, screen readers in use | Not evidenced (A is hidden from them) | Not evidenced | Not evidenced | |

### Break-it findings and disposition

| Scenario | Expected | Observed or hypothesis | Status | Disposition |
| --- | --- | --- | --- | --- |
| First Home view while the screen is hidden or asleep (A, B) | Rest image; today's action plays at the next visible view | Old preview drew the action, painted nothing and never showed it | **Reproduced** (old preview failed "next visible view the same day plays the same action") | Fixed in preview: a hidden, failed or reduced-motion view leaves today unplayed and paints the rest image. Checked in the click-test stand-in |
| Phone refuses storage (A, B) | One play a day | Old preview replayed on every return to Home | **Reproduced** (old preview failed "return Home stays still") | Fixed: the record stays in memory for the page. Checked |
| Art missing, then back the same day (A) | Today's action plays once the art loads | Old preview used up the action unseen | **Reproduced** | Fixed. Checked |
| Double tap while the art loads (B, C) | One play at normal speed | Two timer chains could double the speed | Risk; the old preview passed the double tap with local art | A busy guard was added anyway; moot for A, which has no tap |
| Runtime cache grows (all) | Mascot art kept bounded or out of the offline copy | `sw.js` `net()` saves any successful same-origin file not in the shell, so 11 atlases and stills, about 3.7 MB, would collect per device | **Checked in source** (`sw.js` lines 365 to 373), not measured | Implementation must exclude the mascot files from the runtime cache or bound them, and test it in the saved-shell checks |
| Shared tablet, several sign-ins in service (A) | Calm board | One 2.5 to 3.9 s play per person per day, so several plays in an evening | Risk / Not evidenced | Accepted by the owner's per-person rule; implementation test counts plays across sign-ins |
| Two staff with the same name, or a rename | Own set each | Preview keys by display name | Risk in preview only | Implementation keys by staff id |
| Day changes while Home stays open | New action on the next Home view | Not tested | Not evidenced | Implementation test across Queensland midnight |

## All-three mix and recommendation

| Source and part | Take or reject | Principle and kitchen effect | Cost / evidence |
| --- | --- | --- | --- |
| A: automatic once a day, decorative, no control | Take | Flighty, Things 3: the set moves every day with no taps and no new target | 156 preview checks |
| A: settle on the neutral Welcome pose | Take | Flighty, Linear: a status-like pose never sits beside the board | `a-rest-*` screenshots |
| B: hold today's pose | Reject | Five of six rank it last for "station ready" or "order up" | `b-rest-390` |
| B and C: replay or play button in the heading | Reject | Named heading allows no new service control; target under the chef hat; tap feedback and screen-reader name problems | Screen designer and cook findings |
| C: advance the set only when tapped | Reject | Duolingo: progress should not depend on an optional tap; staff who never tap never see the set | Head chef finding |
| C: Idle as the rest pose | Reject as a cosmetic swap | Welcome matches the "Welcome, Ann" heading beside it | New starter, cook |
| Repairs from Break-it | Take | Only an action that actually played is used up | 3 reproduced faults now pass |

**Recommend A, with the Break-it repairs:** on the first Home view of each kitchen day where it can play, today's action from the person's shuffled set plays once, then the mascot rests on the neutral Welcome pose. No control, nothing for screen readers to announce, no Home rectangle moved. It gets every person through all 11 in 11 kitchen days with no taps. Main downside: it is decoration, and a 3 s play is easy to miss; there is no way to see a missed action again. A blend with B or C does not beat A: every part they add brings a control into the heading or a held status-like pose. No mix is recommended, so no combined preview is claimed.

**Before release** (implementation, not this preview): key by staff id; use `LK_TIME.day()` and the seasonal stamp pattern; keep mascot files out of `SHELL` and out of, or bounded in, the `sw.js` runtime cache; client tests for one play a day, return at rest, next day's action, hidden first view, refused storage, missing art, sign-ins on one shared tablet and Queensland midnight; complete-app long-name and enlarged-text geometry.

**Chosen:** per-person shuffled daily action, all 11, kept per device (9 November 2026). Design: pending owner choice after round 2 (recommend A).
