# The mascot in festive clothes, and a Christmas countdown

Asked 17 November 2026 (owner): "Can we dress the mascot in festive clothing for the celebrations?", then "And add a Christmas celebration countdown?" This is the service council record. No app code has changed. The head chef decides. Source commit `4eca7f4`.

The proposal is [proposal.md](proposal.md), the reviewers' evidence is [evidence-packet.md](evidence-packet.md), and the first three designs are [designs.md](designs.md). Screens are in `evidence/`: the real book in the click-test browser with the Firebase stand-in, synthetic staff, stand-in fonts (Preview). This is role-based review, not research with real staff.

## Round 1: should he be dressed? Build smaller, 5 of 5

| Reviewer | Verdict | The cut they asked for |
| --- | --- | --- |
| Cook mid-service | Build smaller | Hats only, on every pose and still from the first frame. No drop-on play, no bandana-only days |
| Head chef | Build smaller | Hats only, on the Australian fun days. No bandana, no festival costumes, no dress-up play. Ship before 24 December |
| Skeptic | Build smaller | Hats on the Australian and fun days only, still, no drop. No bandana. His usual clothes on every religious and cultural festival; no festival changes his daily action. Christmas and New Year first, then judge |
| New starter | Build smaller | One rule for every festival with a wish: an accent of equal size, passed by the cultural-symbol review, on from the first frame, never animated on. Drop any accent that cannot be drawn respectfully and legibly |
| Keeper of the book | Build smaller | The hat only. The welcome's rule decides the day (clock ready, celebrations On, a celebratory day); `js/app.js` and `js/prep.js` pass it in; no listener in `js/mascot.js` |

**Why, in one line each.** No reads, taps or lines, and every measured rectangle is unchanged (Preview). The hat reads at 48 x 64 px; the bandana does not (Diwali marigold barely shows). The dress-up play is new movement with no kitchen job (Flighty, Duolingo's "decorative rewards", Headspace). Cultural festivals carry respect risk.

**Disagreement.** The new starter alone: hats for Christmas and Halloween and nothing for Diwali makes "my festival look smaller". The other four: no clothes on religious and cultural festivals at all.

**Leading break-it findings (carried into round 2 and the build).**

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| Home open across midnight from Boxing Day, or Off chosen in Settings: he keeps the Santa hat | Risk / Not evidenced | Repaint his rest pose from the `kb-seasonal-state` handler in `js/app.js`, which already skips repeats; a click test at 23:59 and 00:01, with Off, a quiet day and an older copy of `js/mascot.js` |
| No signal on Christmas morning: he is painted before the clock is ready and stays plain | Risk / Not evidenced | The same repaint once the welcome changes |
| The art is redrawn later: the measured head positions go stale and the hat floats | Risk | The position table names its art version; no hat when they differ; a node check of all 99 head points |
| A hat cut by the frame's top edge | Reproduced in the prototype: at most 3.7 px of 256 (party cone, bunny ears, toque), 1.6 px Santa and witch hats | Move that hat down in those frames |
| A hat that reads as something else at 48 px (precedent: the Easter and Chefs Day stamps read as the chef hat; the Mother's Day ribbon read as a red cross) | Checked in Preview for Santa only | Check each hat at 48 x 64 px; drop the toque; the Melbourne Cup and Mother's Day pieces read as pink smudges |
| Bandana recolour reading back canvas pixels (colour profiles, privacy noise, a SecurityError) | Risk | Not needed once the bandana is cut |
| A festive piece beside "Every line ticked" read as a prize for finishing | Hypothesis | Clothes follow the date only, the same all day; never animated on |

Not evidenced for any design yet: dark mode, the 21 to 24 inch section screens at 1.5 m, real phones, reduced motion and Still on the built code.

## Round 2: ranking and disagreement

Six fresh reviewers (the five plus the kitchen screen designer) saw the three designs in [designs.md](designs.md), the same evidence packet and the round 1 record. Each also gave one line on the countdown places, which otherwise had the quick check only.

**Structure.** All six said honestly that A and B are one idea at two reaches (B is A cut to Home and the rest pose), and only C is a different rule (a different piece, 37 days, a review gate). The choice that is left is where he wears it, on which frames, and for which days.

| Reviewer | Ranking | Recommends | Countdown |
| --- | --- | --- | --- |
| Cook mid-service | B, A, C | A's hat on every frame and still, on Home only | K2 |
| Head chef | B, A, C | B alone: one hat position, the smallest pull request; ship before 24 December, judge after New Year | K2 |
| Skeptic | B, A, C | A's frames on B's place; the Santa hat and party cone only, 24 December to 1 January, then judge | K2 |
| New starter | A, B, C | A's hat on every frame, on Home only; the fairness dissent stays on record | K2 |
| Keeper of the book | B, A, C | B's place with A's frames; hats drawn inside `js/mascot.js` | K2 |
| Screen designer | B, A, C | A's frames on Home only, with C's rule: drop any piece that cannot be read at 48 x 64 px | K2 |

**B first for 5 of 6, A for 1. C last for all 6.** Five of six name the same blend; the head chef names B alone.

**Disagreement, one line each.** Head chef: A's 99 head positions undo B's saving, so B alone. Everyone else: B's hat that pops on as the play ends, and comes off again on every tap, breaks round 1's "worn from the first frame". New starter: Diwali, Eid and Lunar New Year still get nothing; the wish and the board are already the same size for every festival, which is where fairness lives, and a dot beside a Santa hat shows the gap more plainly. Skeptic: the honest rule is "a secular costume custom", not "Australian and fun"; Christmas and Easter are Christian festivals, as the board says.

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Flighty: no new movement, nothing presented as live | Works: worn from the first frame | Needs work: the hat appears when the play ends | Works |
| Duolingo: no decorative reward without a kitchen job | Needs work: a hat beside "Every line ticked", loudest at 192 x 256 px (`A-xmas-done-1920.png`) | Works: Home only | Needs work, as A |
| Headspace: no unexplained marks, words beside the thing | Works on Home, beside the wish | Works | Needs work: an 11 px dot read as a notification badge (`C2-diwali-home-390.png`) |
| Linear: one rule for where things live | Needs work: reaches work pages | Works: Home holds the celebration | Needs work, as A |
| Things 3, Airbnb, Todoist | Not relevant: no task, list or entry changes | | |

### Contract fit

| Check | A | B | C | Evidence |
| --- | --- | --- | --- | --- |
| Service continuity: taps, lines, rectangles | Works | Works | Works | Preview, every measured rectangle unchanged at 390, 1280, 1920 px |
| Celebrations: Home holds the ambience; work pages keep Kitchen Book, stamp and edge | Departure: a hat on the finished list and section tab, for the head chef | Works | Departure, as A | `docs/seasonal-celebrations.md` |
| Status in words, not colour | Works | Works | Needs work: a red and green dot beside the green done card | `C2-xmas-done-390.png` |
| Motion and reduced motion | Not evidenced | Needs work, Not evidenced | Not evidenced | Preview cannot show it |
| Real contrast, dark mode | Not evidenced | Not evidenced | Not evidenced | |
| Missing art leaves Home unchanged | Needs work: a hat that fails must not turn his art off | as A | as A | `js/mascot.js` `artOff` |

### Break-it findings and disposition

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| Home open across midnight from Boxing Day, or Off chosen: for the same person and page `mount()` only calls `place()` (`js/mascot.js`), so a costume passed in later is dropped and the Santa hat stays until the 04:00 reload; the same drops a hat on Christmas morning when the clock is ready late | Source-checked by the skeptic and the keeper; Risk / Not evidenced in a browser | Repair in the build: the same-person check includes the costume, and a change repaints his rest pose (never mid-play). Click test: Boxing Day 23:59:30, run 90 s, the hat is gone; again with Off, a quiet day, a late clock |
| A hat fetched as its own file fails with no signal and turns his art off, losing his speech bubble | Hypothesis | Repair by design: hats are drawn from small pixel maps inside `js/mascot.js`, no file |
| An older saved `js/prep.js` loads `js/mascot.js?v=3` first; the guard keeps that copy, with no hats | Source-checked | Bump both callers to `?v=4` together; `js/app.js` asks for the costume flag before passing one |
| The art is redrawn and the 99 head positions go stale | Risk | The table names its art version and each sheet's hash; a node check fails when they differ; no hat on a mismatch |
| A hat cut by the frame's top edge | Reproduced in the prototype: at most 3.7 px of 256 | Move the hat down in those frames |
| B's hat appears as the play ends and on every tap | Hypothesis from `B-rest-only-strip.png` | Not in the recommendation |
| The fascinator and the flower crown read as pink smudges at 48 px | Checked in Preview (`A-hats-board.png`) | Left out until redrawn and checked at 48 x 64 px |

## All-three mix and recommendation

| From | Part | Take or reject | Why |
| --- | --- | --- | --- |
| A | The hat on every frame and still, from measured head positions | Take | Worn from the first frame, never a change of clothes (Flighty); 5 of 6 |
| A | The hat on the finished list and section tab | Reject | A decorative piece beside "Every line ticked" (Duolingo); the celebrations contract keeps work pages to the stamp and edge |
| A | Its day list | Take, cut | Only hats that read at 48 px |
| B | Home only | Take | Home holds the celebration (Linear); 6 of 6 |
| B | Rest pose only | Reject | The hat pops on and off (5 of 6) |
| C | The knot accent for every festival | Reject | Unreadable at 48 px, a review per festival, the dot beside a hat shows the gap more plainly (6 of 6) |
| C | Its rule: drop any piece that cannot be read, or does not pass review | Take | Screen designer; it drops the fascinator and flower crown for now |

A blend of all three is worse: a hat and a knot accent on one head brings back the costume round 1 cut, and costs both position tables plus the reviews.

### Recommend A's hat on every frame, on Home only, with C's legibility rule, starting with Christmas and New Year

- **What.** On Home only, the mascot wears a festive hat in every frame of his play and on his rest pose, on the day itself, from midnight to midnight Queensland time. Under a finished prep list and on a finished section's tab he keeps his work clothes. Off, the quiet days, a day with no hat, an older saved file or a failed draw: his work clothes, exactly as today.
- **First hats.** The Santa hat on Christmas Eve, Christmas Day and Boxing Day, and the party cone on New Year's Eve and New Year's Day: 5 days, before 24 December. The witch hat (Halloween), green top hat (St Patrick's) and bunny ears (Easter) are drawn and read at 48 px; the head chef adds them after seeing the first two in the kitchen (two reviewers asked to judge after New Year; the next is St Patrick's Day, 17 March). The fascinator and flower crown wait for a redraw. No piece for cultural and religious festivals.
- **Why it wins.** It is the blend five of six reviewers named on their own. It keeps every measured rectangle, tap and line, adds no read, file or listener, keeps work pages as the celebrations contract has them, and reads by its shape at 48 x 64 px. The hats are a secular costume custom in Australia (the skeptic's wording); the wish and the board already greet every festival at the same size.
- **Main downside.** 99 head positions to keep true if the art is ever redrawn (guarded by a version and hash check), and festivals from other cultures get no piece: the new starter's dissent stands.
- **Review status.** This is the blend the reviewers proposed themselves, with no flow or risk outside what they reviewed, so no follow-up round was needed. Combined preview: `M-xmas-home-390.png`, `M-nye-home-390.png` (Home, hat at rest), `A-frames-santa.png` (the play), `M-xmas-done-390.png` and `M-xmas-done-1920.png` (the finished list, plain). Measured (Preview): every rectangle unchanged; 0 browser errors.

## The Christmas countdown: quick check

**Verdict: Build, as K2 (quick check by the lead; all six round 2 reviewers chose K2 in one line each).** A small change on an existing page: no tab, button, pop-up or step.

- **What.** From 1 December, Home's Coming up card shows "Christmas Day, in 24 days" with the Christmas stamp, counting down each Queensland day. From 18 December the card's usual 7-day words take over ("Christmas Eve, Thursday", "Christmas Day, Friday"), as today.
- **Measured (Preview, 1 December).** Taps unchanged. Nothing above Your day moves at 390 or 1280 px. The card appears at the foot of Home on a phone (below Prep by section) and below Prep by section on a laptop (`K2-coming-390.png`, `K2-coming-1280.png`). Today the card is hidden on 1 December (`K0-dec1-home-390.png`).
- **Why not K1 or K3.** K1 (he says it) moves Your day 29 px down on a phone for 23 days, replaces everyone's welcome, could read as the person's own deadline (new starter), and would not follow Off on a day with no celebration (keeper). K3 wraps the date on a phone and drops him 23 px below his bubble's tail.
- **It gets the day right** by reusing the Coming up line: it waits for the clock, clears when celebrations are Off and redraws within 60 seconds of Queensland midnight (keeper, from `js/seasonal/theme-bridge.js` and `js/seasonal/seasonal.js`). No read.
- **Head chef's call.** Stretching Coming up beyond 7 days for Christmas only is an exception for one festival among 36 (skeptic). The card's two-item limit needs checking when a function also shows there.
- **Main downside.** On a phone it sits at the foot of Home, so it is seen on a scroll, not at a glance.

## Decisions for the head chef

1. The mascot: the recommended blend (Christmas and New Year hats on Home), or another option: B alone, A everywhere, C, or none.
2. The countdown: K2 from 1 December, or K1 (he says it) or none.
3. Release: both in one pull request, as both change Home for Christmas (one update for the phones).

## Before release (implementation, not this preview)

- Remeasure the implemented app at 390, 768 and 1280 px (and 1920 px for the finished list, which stays plain), light and dark, with the real fonts.
- Click tests: the hat's pixel present on Christmas Day; gone at Boxing Day 23:59:30 plus 90 s, with Off, on a quiet day and on an ordinary day; a late clock; reduced motion and Still (the hat on the still); a hat on the play's frames; none on the finished list; an older `js/mascot.js` with no costume flag; nothing fetched for the hat. The countdown: 30 November (none), 1 December (24 days), 17 December, 18 December (the usual words), Off, midnight.
- A node check that every one of the 99 head positions matches the art's version and hash.
