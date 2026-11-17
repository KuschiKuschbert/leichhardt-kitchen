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
