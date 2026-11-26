# Cleaning: results by section and planning the days. Follow-up packet on the combined design

26 November 2026. Source commit `0acdaf72`. A focused follow-up for the skeptic, the keeper of the book and the screen designer, as the council skill asks when a mix is recommended. It holds no recommendation. `round2-packet.md` still applies: its contracts, design references and Try to break it are unchanged.

## What the six reviewers said

| Reviewer | Ranking | Recommended |
| --- | --- | --- |
| Cook | B, C, A | B's list and moves, C's once-only timing and week strip, A's Records and form suggestion |
| Head chef | B, C, A | B's list as the only bulk editor, fewest moves only, no new tab, results first, kind optional |
| Skeptic | A, B, C | A, built results first, then weights with B's weigh list; no Plan button until real weights exist |
| New starter | B, A, C | B with A's "light only" words, C's due-tonight warning and A's Records |
| Keeper | B, A, C | B's list with C's gate and no new report page, after part 1 |
| Screen designer | B, C, A | B's list and plan, A's weight chips in the form, C's results |

All six took B's weigh list and A's Records night as the results page. Five rejected or held the eighth Reports tab and five rejected C's steps. The gate (bulk planning only while Cleaning is off) was taken by three and is not agreed. The week strip, the kind's home and the Inbox numbers line are split. Detail by name: `brief.md`, Round 2.

## The combined design, as drawn

Pictures in `docs/cleaning-tracking-options/designs/`, each with `-390.png`, `-390-full.png` and `-1280.png` (m4 at 390 only). Drawn inside the book's real pages as before: the frame is the Implemented app, the new parts are Preview, nothing was tapped or saved. Counts in `designs/measurements.json`.

1. **`m1-entry`**. Repeat tasks gains one line in the existing attention look: "18 weekly and monthly jobs have no weight yet", with a link, Weights and days.
2. **`m2-weights`**. One view, Weights and days. Every weekly and monthly job is a row by section, with its handwritten name, three chips (Light, Medium, Heavy) and an optional kind from a short list. What each day takes is one sentence with Change. Chips on top filter the list: All, Changes, No weight.
3. **`m3-changes`**. Suggest the days puts each change into its row: the new day and the old day, the reason, Keep the old day or Another day. One Save keeps each job's weight and day together.
4. **`m4-part-saved`**. A save that stops part way: Saved with its time (no Keep button left), Not sent with Send again, Refused with Refresh, Waiting to send, and No day fits counted in the summary.
5. **`m5-cleaning-on`**. The same view once Cleaning is on: the book gives a day to new jobs only; a new heavy job whose best night becomes the section's heaviest says so; one move is offered, with its wait, to take or leave.
6. **`m6-inbox`**, **`m7-records`**. The morning flag is one Inbox row with a quiet button. It opens that night in Records, where today's own lines stay (the red "Missed:" line included) and the weekly and monthly jobs follow by section: the miss first in the attention look, "Who was rostered" a link last.

Not in the mix: C's steps, C's whole-week replan, the eighth Reports tab, the Inbox numbers line, the kind as retyped Area, the week strip of points.

## What changed after your round 2 findings

- The Save bar wears the book's docked frame and sits above the tab bar on a phone.
- A job moved off a day that does not take it says that first ("Tuesday takes up to medium jobs").
- A suggested night that becomes the section's heaviest says so, and no longer says "has the least" (`planner.js`, 39 node checks).
- One Save for weight and day together, so a job is revised once in a sitting, not twice.
- Keep the old day and Another day on each change. Planning again when a row is kept is not drawn.
- Words: "weights and days" not "weigh"; "takes jobs up to"; "weekly and monthly jobs"; points explained once, in the fold.
- Two rules are labelled as the book's suggestion, not the head chef's: no section gets two heavy jobs on one night, and a night over 5 points is too heavy. "No day fits" comes from the first.
- Results use a counted night whose date matches the flag, with Records' own lines left in. The made-up results match the lists.
- The kind is optional and is not the Area box, which prints on a cook's row.

## Counts (390 x 844 and 1280 x 900)

| | Mix |
| --- | --- |
| Screens long at 390: weights, changes, part saved, Cleaning on | 5.2, 4.5, 4.7, 2.6 |
| Screens long at 1280: weights, changes, Cleaning on | 3.0, 2.4, 1.7 |
| Whole job rows on the first screen, above the Save bar: phone, laptop | 0, 3 |
| Results: Inbox, Records night at 390 | 1.4, 1.8 |
| Taps to give 20 jobs a weight and save | 22 (open, a chip each, Save) |
| Taps to accept the suggested days | 2 (Suggest the days, Save) |
| Controls under 44 px | 0 |
| Lowest text contrast; lowest control edge; focus ring | 4.76:1; 4.84:1; 3 px at 3.33:1 (3.08:1 on the entry line) |

Not drawn or not evidenced: any tap or save; planning again after Keep; the day picker; the kind list; changing what a day takes; the job form's own weight chips (drawn in A); a lock, reload or day change with suggestions on screen; several sections flagged on one morning; 768 px; the cook's row in the week a job moved.

## What to answer

Up to 300 words, plus a Break-it table for the skeptic and the keeper.

1. For each of your round 2 findings: fixed, partly fixed, left, or made worse by the mix.
2. Anything the mix adds that none of A, B and C had, and what could go wrong with it.
3. Contract fit of the mix: Works, Needs work, Not evidenced.
4. Build the mix, change it (say exactly how), or build an original design instead. One line on the gate: bulk suggestions only while Cleaning is off, or at any time.
