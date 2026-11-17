# The mascot a little more present on the shared kitchen screens

17 November 2026, Queensland. **Round 1: Build smaller, 5 of 5. Round 2: in progress.** The study changes no app code.

[Proposal](proposal.md) · [Evidence packet](evidence-packet.md) · [Designs and measurements](designs.md) · Preview source: `preview/`

This is role-based council analysis, not research with staff. Every measurement is a **Preview** on the real book with the click tests' stand-in and made-up lines, in the stand-in fonts.

## What the owner asked

17 November 2026: "ive ben checking our mascot and the motivation on the shared kitchen screens and since constantly put new things on the preplists and tick things off the prep list barley ever finishes completely, id like the mascot be a tiny bit more dominant."

What was found first (read in code): on Prep he shows only when every line of a view is ticked and sent. Lines written tonight for tomorrow sit on today's list under "Tonight, for tomorrow" and count as open, so once tomorrow's list is started today's list cannot finish. Open lines also roll to the next day.

## Round 1: should it be built?

Five fresh reviewers saw [the proposal](proposal.md) (five directions: 1 let today's list finish without tomorrow's lines; 2 a finished section on the All list with him; 3 he stays on Prep on wide screens in the Handy page; 4 bigger on Home; 5 a halfway cheer), [the packet](evidence-packet.md) and four pictures of today's book.

| Reviewer | Verdict | Draw | Not | Most useful change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build smaller | 1, 4; 3 only as a still with no words, after a real measurement | 2 (notes push open rows below the fold), 5 | One split count everywhere: "14 of 14 today, 3 for tomorrow" |
| Head chef | Build smaller | 1 with 2; 3 only as the bolder option, a still with no line | 4 (a shared screen shows Home once a shift), 5 | Give "today" one meaning in the header, Home and the card |
| Skeptic | Build smaller | 2, at the list's foot; 1 only whole, with one cut and only a cut clocked from today's own lines | 3, 5; 4 only as a free add-on | Count section and list finishes per day from real data, before and four weeks after |
| New starter | Build smaller | 2 (keep a finished section said, with him small); 1 only if every count agrees | 3, 4, 5 | Keep the finished section's heading on All with a full bar and him small beside it |
| Keeper of the book | Build smaller | 1 properly first, then 4; 3 as a still with no count | 2, 5 | Run 30 real days through `finOk()` with and without tomorrow's lines before choosing |

**Verdict: Build smaller, 5 of 5.**

**Agreement.** Direction 1 fixes the cause and is worth drawing (5 of 5), but only whole: one cut for the header, Home and the card, or the screen shows "14 of 14" under "14 of 20 done" (all five read this in code). The cut must not be a guess (skeptic, keeper): only a night list clocked from today's own lines may set lines aside. A halfway cheer is out (5 of 5): it names nothing finished and flips as lines arrive. Every picture of free room in the proposal was an artefact of thin data: a real day fills the Handy page with Done today (up to 280 px), Quick add and Closing soon (cook, skeptic, keeper, new starter).

**Disagreement.** Direction 2: draw (head chef, skeptic, new starter) or not (cook: notes push open rows down; keeper: takes rows). Direction 3: draw only as a still with no words or count (head chef, cook, keeper) or not at all (skeptic: decoration, a resting face round 1 refused; new starter: a third count). Direction 4: draw (cook, keeper), add-on (skeptic) or not (head chef, new starter: each person sees Home once a day).

**Leading Break-it findings (round 1).**

| Finding | Evidence | Carried into |
| --- | --- | --- |
| Direction 1 alone: the card says "14 of 14" under the header's "14 of 20 done" (all five) | Read in code: the header and `homeLines()` count tomorrow's lines | A counts once, everywhere |
| A dinner line written in the evening with no batch falls under the usual-time cut and would read as tomorrow's, so today shows as finished (cook, skeptic, new starter) | Read in code: `cutFor()` falls back to the usual time; the false finish is Risk | A sets lines aside only with an own-clocked batch; checked in the preview (`walk-A-fallback.json`) |
| An afternoon batch of 6 dinner lines after 15:00 is taken for tomorrow's list (keeper, skeptic) | Read in code (`listStart()`); Risk | Already where the page files them today; A makes it decide the finish too. Open, for the owner |
| Tomorrow's lines stay as rows on All, so the existing guards for Serve and the wide scene never fire (keeper, skeptic) | Read in code (`finPaint()`, `finFit()`) | A's card is drawn above tomorrow's lines; a build needs its own gate and test |
| A note between open sections shifts tick boxes when another screen finishes a section (skeptic) | Risk | B puts its line at the foot of today's lines |
| The room for a mascot on the Handy page runs out as Done today grows (cook, skeptic, keeper) | Measured in the preview with Quick add and Closing soon | C uses the Handy header corner, which does not change height |
| He sits beside a Not sent tick and reads as Saved (new starter) | Risk | C: no words, no change of pose on a tick; plays only after the server's answer |

## Round 2

The three designs, the same evening walked through each, and every measurement: [designs.md](designs.md). Scoring follows.
