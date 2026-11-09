# Cycling the kitchen mascot through its actions

9 November 2026, Queensland. **Round 1 verdict: Build smaller, 5 of 5. Owner decision pending.** No app code has changed. [Proposal](proposal.md). Evidence reused from the [placement study](../mascot-placement-options/brief.md) (source `e6cbd61`, app files match `main` `7f85629`). This is role-based council analysis, not research with real staff. All measurements below are **Preview** from the placement study; nothing is measured in the implemented app.

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

**Build smaller: the narrowed form 3,** one allowed action per kitchen day on the first Home view, then a still, in A's spot. It brings the library into the app over the week without breaking the Home motion contract, needs one atlas a day and reuses A's player and guards. Main downside: it is still decoration with no kitchen task, and the new starter and head chef reviewers would rather keep the cycle inside a collection (form 4) or in the gallery. Forms 1 and 2 are not recommended.

Next, if the owner agrees: round 2 with three structurally different designs of the chosen form, previews under this folder and the six-reviewer scoring.

**Chosen: pending owner selection.**
