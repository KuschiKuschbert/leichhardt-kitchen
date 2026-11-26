# Cleaning: its name and its look. Council brief

26 November 2026. The head chef asked to "brainstorm name and design again" once every cleaning step was built (25 November), then chose to run the full council (26 November: "Run the council"). Every step is now on `main` (#880, #881, #884, #890, #894, #898, #901, #905, #907). The council advises; the head chef decides. Nothing in the app changes until he chooses.

Source commit `a187cd63`. Role-based analysis by fresh agents, not research with staff. Measurements are **Preview of the implemented app**: the click-test stand-in with the real page, shell, top bar and tab bar, the head chef's real lists loaded under four made-up sections, made-up people (Ann the cook, Sam the head chef), Wednesday 2 December 2026, the book's own fonts. Proposal: [proposal.md](proposal.md). Packet: [round1-packet.md](round1-packet.md). Today's page: [baseline/](baseline/) (`baseline.json`, script [designs/baseline.cjs](designs/baseline.cjs)).

## Round 1: should we change it?

Five fresh reviewers (`opus`), the same proposal, packet and pictures.

| Reviewer | (a) The name | (b) The look | Their one change |
| --- | --- | --- | --- |
| Cook mid-service | Your call, slight lean to Clean down | Build smaller | My section's Pack down heading and its count first; the frame down to one quiet line |
| Head chef | Build smaller: Clean down, on the tab and the page title only | Build smaller | Cut everything above the first tick to one line |
| Skeptic | Don't build: keep Cleaning | Build smaller: cut the header, leave the order | Drop the coverage hint for staff, fold the temperature link into the read line |
| New starter | Your call: keep Cleaning, or Clean down | Build smaller | Everything that is not a job goes below the jobs; "0 of 9 done on your section" |
| Keeper of the book | Build smaller: the words people see only, route and id stay | Build smaller: trim the frame, not the list | Make the new layout work with both the old and the new saved shell |

**Verdict, the look: Build smaller (5 of 5).** Change the cook's page only (phone, tablet, section screen). Cut the frame above the first job; keep the order chosen on 25 November (your section first, nothing hidden). Leave the chef's Week and Repeat tasks alone: they are used a few times a week, and their two notices go once setup is done (skeptic).

**Verdict, the name: Your call.** Two say build smaller (Clean down, head chef; any name, keeper), two leave it to him (cook leaning Clean down, new starter: Cleaning or Clean down), one says keep Cleaning (skeptic). The trade-off in one line: a name that sounds like the kitchen against one plain word that already appears on about 50 lines the team reads. The field narrowed to two: **Cleaning** or **Clean down**. Rejected by the reviewers who named them: Close, Closing, Reset (read like closing the app or a sheet; "Close" is on every sheet's button), Close down, Night clean, Knock off (the page also holds the morning temperature logs and jobs after each service), Wrap up (slang, and it clashes with the rows "Wrap and label..."), Shine (vague), Checklist (any list).

If he renames, the keeper and the skeptic disagree on how far: the keeper would change only the tab, the Home docket, the page title and the window title (4 to 6 strings in `js/app.js`), keeping `#/cleaning`, its id and "cleaning" as the word for the work in Records, the Inbox and Settings; the skeptic says that gives one thing two names, and asks for every string the team sees in one pull request, with a test that the tab, the title and the admin switch say the same word.

### What round 1 found that the proposal did not say

- **The cost line was wrong** (keeper, checked). Cleaning's look lives in `css/app.css`, a saved-shell file (241 `.cln-` lines), not only in the lazy `js/cleaning.js`. So any new look reaches every phone as an update, and an old saved copy can meet the new page (break-it K1).
- **A rename drops a joke on 1 April** (keeper, checked): `js/fools.js` maps the tab by its label (`Cleaning: 'Screaming'`).
- **The route must stay** `#/cleaning` (keeper): `parseRoute`, bookmarks, the launch address, tutorial storyboards and 27 test files know it.
- **Facts said twice** (cook): every row under the Grill heading says "Grill · To do" again (design miss, 10 November).
- **A Pans cook at the Grill screen** (new starter, skeptic): "This screen. You are on Pans today" is small text at the far right of the 1920 heading; the cook's own list is a small link.

### Break-it findings, round 1

| # | Scenario (role, state) | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | A cook partway through a section ticks, the tick is acknowledged, or Undo (phone, section screen) | The next box stays under the thumb | `draw()` redraws the whole list on each; a design that folds a finished group, sinks done rows or changes a heading's height would move the next box | Risk / Not evidenced (source read) | Measure the next box's y before and after a tick, its acknowledgement and Undo, on a group's last row, at 390 and 1920 | Into round 2: no design may move rows on a tick |
| S2 | Ann on Pans, signed in at the Grill section screen | She sees and does her own Pack down | The screen leads with Grill's 9 rows; "You are on Pans today" is small at x 1350; her list is a small link | Layout checked in the baseline fixture (`station-1920-pans-cook.png`); a wrong tick is Risk | The cook's own section next to the heading, readable from the bench; test with the same fixture | Into round 2 |
| S3 | A rename, phones mid-update and after | One name | The tab is in the saved shell, the page title in the lazy file: an old phone can show both names; the admin, Inbox and Records keep "Cleaning" | Risk / Not evidenced | If renamed: one pull request for every string the team sees, and a test that they agree | For the head chef with the name |
| K1 | A phone not yet updated opens the new page (or a new shell meets the old saved page in the cool room) | The page opens, styled | `js/cleaning.js` is saved under its plain address whatever its `?v=` (`sw.js`), so new JS can meet old `css/app.css` | Risk / Not evidenced (source read) | New styles in new `.cln-` rules that the old page ignores; one `tests/saved-copy.test.js` case with the old shell and the new lazy file | Into the build plan |
| K2 | A fold or reorder with unsent work (unsaved checks, Not sent, a refused tick) | Unsent work stays in sight | A closed fold could hide it; Go to Pack down and the Inbox jump would land on a hidden heading | Checked in source only | Any fold opens on unsent work and on a jump; extend `tests/cleaning-schedule.test.js` and `tests/cleaning-sections.test.js` | Into round 2: a fold is also a change to an approved rule |
| K3 | Who did this on the section screen in a new layout, a double tap while the write is held | One sheet, nothing redraws under it | Not tried | Risk / Not evidenced | `tests/cleaning-feedback.test.js` at 1920, double tap while held | Into the build plan |

### Contract fit, round 1

- **No violation in today's page.** The second tap on a section screen is the approved "each tick asks who did it" rule (shared screens). Changing it is a rule change for the head chef, not a fix (cook, head chef, skeptic).
- **Proposed changes to approved rules, for the head chef:** a rename (26 November: "keeps its name for now"); any fold on the staff page ("Nothing is folded", step 2, 26 November, and the 25 November rejection of closed rows, 5 of 6).
- **Not evidenced:** done, Not sent, refused and Undo rows; Extra large text; the Functions fold on a function night above the list; reading the section screen from the bench (only a stand-in picture).

### Reference fit, round 1

- **Linear** (the work above the frame): every reviewer's main point. About 240 px of title, read line, temperature link and coverage hint come before the first box at 390 px.
- **Headspace** (one calm name, plain words): argued both ways. For Cleaning (the skeptic, the new starter: a word every starter knows) and for Clean down (the head chef, the cook: the word cooks say). Plain words for "0/50 recorded; repeats apply" and "repeat coverage is not configured": everyone.
- **Things 3** (today against occasional): the section clean and weekly jobs against the nightly Pack down; no reviewer wanted them hidden.
- **Duolingo** (progress that is real): "0 of 9 done on your section" before "0/50" (new starter, cook).
- **Rejected:** a new layout for the chef's Week or Repeat tasks (skeptic, head chef: rare use).

## Still his to answer from the list

Carried from `docs/open-work.md` item 5. The council does not answer these; the designs do not depend on them.

1. **The 12 lines with no day** (Grill 8, 9, 11; Pans 7, 9; Fryers 2, 3, 4, 13; Hot larder 6, 12; for everyone: the outside area and the takeaway containers). Which day each, or leave them out? Until then they are not loaded.
2. **The drip tray and the OZ tank.** His list says the drip tray every night and the OZ tank twice a week; the saved Pack down steps say every 2 days from 9 November and Sunday only. Which is right? A chef changes the saved step in Repeat tasks; no second job is loaded beside it.
3. **A missed weekly or monthly job.** Does it stay due the next day, or wait for its next turn (next week, or 28 days)? Today it waits. Staying due changes the recurrence and the rules.
4. **A Fryers cook's Pack down.** Which Pack down does a cook on Fryers do, and is "Fryers, salads and dessert" one cleaning list? Today no Pack down is tied to Fryers, so a Fryers cook sees their section clean first and every Pack down under Rest of the kitchen.

## Round 2: the design frame

Written before anything was drawn by a fresh UX and interaction designer (`opus`), from the round 1 record, the packet and the baseline. Kept as given, lightly shortened.

1. **Must stay visible on a 390 px phone, no tap:** the cook's section name and its own count ("0 of 9"), the Pack down reminder "Overhead shelves and frames first. Floors are last.", and at least 5 complete job rows with their boxes (today: first box at 454 px, 5 rows). The temperature wording in some form, but not ahead of the jobs. The Functions fold stays one 50 px line on a routine day. The busiest day (a function warning open, Extra large text) is Not evidenced.
2. **Loudness budget:** one loud thing: a tick that is Not sent, refused, or has unsaved checks. Missing it, a cook leaves thinking a job is recorded when it is not. Today the loudest thing is the orange handwritten "0/50", and missing it costs nothing: it goes quiet. The temperature line is a standing reminder at close, not a deadline: quiet.
3. **Devices:** phone, the design width, one column, jobs start high. Tablet (768): more rows, nothing else, same order. Section screen (1920, touch): use the 340 px of empty space each side, or the full width, to show where the cook stands; from the bench a cook reads their own section's name and count and whose list leads ("This screen: Grill. You: Pans"), never small text at x 1350; bench reading Not evidenced. Laptop: chef views out of scope. The tick never moves between devices.
4. **Placements:**
   - Title and 0/50: (a) one line with the cook's section count first; (b) the kitchen count in the Rest of the kitchen heading, said once where it applies.
   - Read line: (a) merged into the title line (about 44 px back); (b) as it is. No fold: Go to Pack down is a jump.
   - Temperature reminder: (a) one quiet inline line, the contract words in full; (b) a link in the read line (risks "must be shown"); (c) below the cook's own section (same question).
   - Coverage hint: (a) removed for staff; (b) under Shared kitchen, beside the jobs it describes; (c) a fold (breaks "nothing folded": the head chef's call).
   - Own section and Pack down: first, inline. A section screen with a cook from another section: (a) the cook's own Pack down leads (against the order fixed at read); (b) a large two-name heading with a 44 px jump.
   - Shared kitchen, Rest, Floors: inline and open (25 November). Folding is a rule change for the head chef.
   - A row's small line: drop the section name when it repeats the heading; keep the state and how often.
   - Who did this: the approved sheet stays (not a new pop-up). Removing it is a rule change.
   - Functions fold: unchanged.
5. **Fiftieth use:** scrolling past four lines of the same notices every night; "Grill · To do" nine times; on a section screen the second tap for every job (about 10 a night); a Pans cook scrolling past Grill's 9 rows to reach their own; a temperature line at 22:00 nobody reads. No design may move the next box after a tick (S1).

## Round 2: three designs

Drawn inside the real page ([designs/build.cjs](designs/build.cjs)): the real rows, tick, Undo, Not sent and Who did this, rearranged and put back after every redraw, so each design was ticked for real. Full description and numbers: [round2-packet.md](round2-packet.md). All three keep the title "Cleaning"; the name is judged on its own.

- **A. The same page, tidied.** One column everywhere, today's order. A quiet ink count ("Grill: 0 of 9", "0 of 50 in the kitchen" under it) in place of the orange handwritten "0/50"; the temperature words in full after your section; the coverage hint in plain words under Shared kitchen; no section name repeated on rows; on a shared screen with a cook from another section, bold words and a 44 px outline button.
- **B. Your section beside the rest.** A smaller header that holds the read line; your section a bordered panel with a big count; from 1100 px two columns across the whole width (the panel sticky on the left); the coverage hint gone; on a shared screen a "You: Pans" band with a filled orange button.
- **C. Tonight's close first, the rest folded.** Your section is the page title; every other group is one 48 px line with its count that opens in place; on a shared screen the cook's own section leads and the screen's is a fold. Changes two approved rules.

### Counts (Preview inside the implemented app)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| 390 px: first box / complete rows | 454 / 5 | 344 / 6 | 317 / 6 | 281 / 7 |
| 390 px: page length (screens) | 5.4 | 5.5 | 5.4 | 1.6 |
| 768 px: rows / first box | 9 / 504 | 9 / 430 | 9 / 382 | 9 / 358 |
| Section screen, cook on that section: rows / first box | 9 / 504 | 10 / 430 | 23 / 380 | 11 / 358 |
| Section screen, cook from another section: rows / first box | 9 / 504 | 9 / 488 | 23 / 459 | 11 / 326 |
| Tick in your section: phone / section screen | 1 / 2 | 1 / 2 | 1 / 2 | 1 / 2 |
| Tick a Shared kitchen job, phone | 1 | 1 | 1 | 2 |
| Cook from another section reaches their Pack down | small link | 44 px button | filled 44 px button | 0 (it leads) |
| Next box after a real tick, ack and Undo (S1) | | still | still | still |
| Lowest drawn text contrast; drawn controls under 44 px | | 6.73:1; 0 | 5.05:1; 0 | 4.76:1; 0 |
| Navigation levels | 1 | 1 | 1 | 2 (folds) |
| Build size | | 1 pull request | 1 to 2 | 2, plus rules talk |
| Relearning | none | none | little on a phone, a new layout on the screens | a new page shape |
| New reads or rules | none | none | none | none (two approved rules change) |
| Risk | low | sticky panel, second layout in shell CSS | folds can hide unsent work; rule changes |

A Grill close on a phone is 32 taps in every design (9 jobs, 7 with checks, 16 checks); on the section screen one name tap more per recorded job. No design changes that.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | One column | Two columns from 1100 px | One column, folds two across from 1100 px |
| Hierarchy | Title, count, your section | Your section is a panel with the big count | Your section is the title |
| Rest of the kitchen | Open | Open, beside you on wide screens | One line per group |
| Another section's cook on a shared screen | Bold words, outline button | Band, filled button | Their own section leads |
| Approved rules changed | None | None | Folds; person before screen |

### Scores

Seven fresh scorers (`opus`), scores out of 10.

| Scorer | A | B | C | First |
| --- | --- | --- | --- | --- |
| Cook mid-service | 6 | 7 | 5 | B |
| Head chef | 8 | 6 | 5 | A |
| Skeptic | 7 | 6 | 4 | A |
| New starter | 6.5 | 7.5 | 5.5 | B |
| Keeper of the book | 8 | 6.5 | 5 | A |
| Kitchen screen designer | 7 | 8 | 5 | B |
| UX and interaction designer | 8 | 7 | 6 | A |
| **Total** | **50.5** | **48** | **35.5** | A 4, B 3 |

C last for all seven: its folds hide work that is the cook's (the skeptic found Grill chef jobs, "Walls" and "Hot plate, grill and stove (end of day)", inside the closed Shared kitchen fold while the header read "0 of 9, your section"), and it reverses two rules set on 25 and 26 November. A and B split on what the section screen is for: the head chef, skeptic, keeper and UX designer put no rule risk and the cheapest build first; the cook, new starter and screen designer put B's 23 rows on everyone's main work screen first.

**Agreed by all seven, whatever their first choice:** drop the repeated section name on rows (A); a quiet ink count in place of the orange handwritten one (A); no folds (C rejected); the "You: Pans" pair on a shared screen, because it stops a mistake (B), but not with an orange fill: orange is the brand and main-action colour, and the loudness budget gives loud only to Not sent (screen designer, UX designer, skeptic).

**Disagreement, one line each:**
- B's two columns: take them (cook, new starter, screen designer, UX designer, keeper without the sticky panel) against reject them (head chef: "the 23 rows are other people's jobs"; skeptic: nobody has shown cooks read the right column from the bench, and they add shell CSS).
- The coverage hint: keep it in plain words under Shared kitchen (new starter, screen designer) against drop it (B); the new starter noted B dropped the hint but kept its jargon ("0/24 + REPEATS", "0/2 recorded; record each prep").
- The count: the screen designer notes that moving the done count off the handwritten face changes the approved `.nb-prog` type rule, so it needs the head chef's OK.

### The mix (A + B + C)

| From | Part | Take or reject | Why | Principle |
| --- | --- | --- | --- | --- |
| A | Quiet ink count; temperature words in full; coverage hint in plain words under Shared kitchen; no repeated section name | Take (7 of 7 for the row line and count) | Less to read in a glance; nothing hidden | Headspace, Linear |
| A | 44 px outline Go to Pans pack down | Take | Big plain target, said once, not loud | Linear |
| B | Two columns from 1100 px, the whole width | Take, not sticky (5 of 7) | Uses the section screen's width; a sticky panel taller than the screen cannot reach its last rows (keeper) | Flighty |
| B | "You: Pans" with "This screen: Grill" | Take, quiet (7 of 7) | Stops a cook ticking another section's jobs (S2) | Airbnb (where, whose, what next) |
| B | Filled orange button; dropping the coverage hint; the bordered panel on a phone | Reject | A second loud thing; jargon stays unexplained; the panel narrows rows so more wrap | Loudness budget |
| C | Folds; the person before the screen | Reject (7 of 7) | Hides the cook's own work; two rule changes; unsent work can sit in a closed fold | Things 3 (today's work stays visible) |
| C | "0 of 9" as the first thing | Taken already in A's count | | Duolingo |

**The combined design M** (lead's synthesis, drawn as its own preview): A on every width; from 1100 px B's two columns across the whole width, not sticky; on a shared screen the section is headed "This screen: Grill", and when the cook is on another section a quiet bordered band "You: Pans, 0 of 11" with A's 44 px outline button, on every width. No folds; the screen's section still leads. Pictures `designs/m-*.png`.

| | Today | A | M |
| --- | --- | --- | --- |
| 390 px: first box / rows | 454 / 5 | 344 / 6 | 344 / 6 |
| 768 px: rows / first box | 9 / 504 | 9 / 430 | 9 / 430 |
| 1100 / 1280 px (laptop, a tablet on its side): rows / first box | | | 14 / 393, 15 / 393, no sideways scroll |
| Section screen, cook on that section: rows / first box | 9 / 504 | 10 / 430 | 21 / 437 |
| Section screen, cook from another section: rows / first box | 9 / 504 | 9 / 488 | 21 / 509 |
| A tick in the right column after Go to Pans pack down, through Who did this | | | next box still (2,382); band and heading both "1 of 11" |
| Next box after a real tick, ack and Undo (390), and through Who did this (1920) | | still | still |
| Lowest drawn text contrast; drawn controls under 44 px | | 6.73:1; 0 | 6.73:1; 0 |

### Focused follow-up on M

Four of the scorers looked again at M's pictures and numbers (the skeptic, the keeper, the screen designer and the UX designer, each continuing from their own round 2 review). The first M had two faults they named; both are fixed in the pictures now in `designs/m-*.png`, and the numbers above are after the fix.

| Reviewer | Score for M (their round 2 first choice) | What they said |
| --- | --- | --- |
| Keeper | 8.5 (A 8) | Beats A: same phone, 22 rows on the screen, nothing new to break. Costs a few dozen `.cln-` lines in the shell and two widths in the tests. With an old `app.css` the new classes go unstyled and the page falls back to today's open column (safe, Not evidenced) |
| UX designer | 8.5 (A 8) | Fits the frame: the band fixes the bench miss (item 3); only unsent work is loud (item 2). Beats A only from 1100 px |
| Screen designer | 8 (B 8) | One layout, each control once; the outline button ends B's orange competition |
| Skeptic | 7.5 (A 7) | Only just beats A, only on the screen; the Grill cook's own Shared kitchen jobs ("Walls · Grill chef") now sit beside her Pack down instead of three screens down |

**Fixed after the follow-up:** on a shared screen the header no longer repeats a section's count (it said "Grill: 0 of 9" above a band saying "You: Pans, 0 of 11"; screen designer, UX designer, skeptic); "This screen: Grill" is heading size (UX designer); group counts read "0 of 24", without "+ REPEATS" next to the plain hint (skeptic); the right column's rows stop at 60 rem so the arrow stays near the words (screen designer). **Checked after the follow-up:** a tick in the right column after the jump (skeptic): the next box did not move, and the band and the Pans heading moved to "1 of 11" together (the keeper's two-counts worry, in this preview); 1100 and 1280 px: no sideways scroll (skeptic).

**Still open from the follow-up:** the left column ends while the right runs on, so its lower half is empty on the screen (skeptic); the 13 px "To do" line and the header's kitchen count may not read from the bench (screen designer); where Pans pack down lands and the way back to Grill on the fiftieth use (UX designer). Review status: **a lead's synthesis with a focused follow-up from four of the seven scorers**, not a full council round.

### Break-it findings, round 2

| # | Scenario | Expected | Observed or hypothesis | Evidence | Repair or check | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | A real tick, its acknowledgement and Undo; a tick through Who did this | The next box stays put | Stayed put in A, B, C and M at 390 and 1920, and in M's right column after the jump | Checked in the design fixture (`designs/build.cjs`, Wednesday, Grill and Pans) | The same check in the real build, in `tests/cleaning-sections.test.js` | Passed in preview; repeat in the build |
| S2 | Ann on Pans at the Grill screen | She sees she is on Pans and reaches her Pack down | Today: small words at x 1350. M: "You: Pans, 0 of 11" band at the top of the left column, outline button, one tap | Checked in the design fixture | Test the band and the jump at 1100 and 1920 | Fixed in M |
| SK1 | C: a Grill cook on a phone | All her jobs in sight | Grill chef jobs in Shared kitchen sit in a closed fold while the header reads "0 of 9" | Checked in the design fixture (C pictures) | Never fold | C not recommended |
| SK2 | C: unsaved checks or a refused save in a folded group, then a reload or the daily lock | The fold opens | The drawing opens a fold only on Not sent, busy or a row error, not on unsaved checks; the open state also passes to the next person on a shared screen | Risk (drawing and source read) | Never fold | C not recommended |
| KB | B: a sticky panel taller than the screen (Extra large text, a long section) | Every row can be reached | Hypothesis: its last rows cannot be scrolled to | Risk / Not evidenced | Not sticky | Fixed in M (not sticky) |
| K1 | An old saved `app.css` meets the new page | The page opens, readable | M's new classes would be unstyled: today's open column | Risk / Not evidenced | New class names only, never restyle old ones; one `tests/saved-copy.test.js` case | Into the build plan |
| KW | The page's width limit lifted from 1100 px | Only Cleaning widens | The drawing lifts it on the page's parents | Checked in the drawing only | Scope it to the Cleaning page; run the 1280 and 1920 checks on another page | Into the build plan |
| K3 | Who did this at 1920, a double tap while the write is held | One sheet, nothing redraws under it | Not tried | Risk / Not evidenced | `tests/cleaning-feedback.test.js` at 1920 | Into the build plan |

Security: no access, rule or session change in any design; nothing private to record.

### Contract fit, round 2

| Check | A | B | C | M |
| --- | --- | --- | --- | --- |
| Service rules: taps, lines, no new pop-up | Works: no taps added, +1 row on a phone | Works | Needs work: Shared kitchen +1 tap, 41 of 50 jobs behind folds | Works: no taps added, +1 row on a phone, +12 on the screen |
| Approved rules (nothing folded; the screen's section leads; the order fixed at read) | Works | Works | Changes two (the head chef's call) | Works |
| Surface and state colours | Works: the orange count goes quiet ink | Needs work: a filled orange button is a second loud thing | Works | Works: outline button; only Not sent is loud |
| The approved count style (`.nb-prog`, handwritten) | Proposed change: ink, not handwriting | Proposed change | Proposed change | **Proposed change, for the head chef** |
| Status without colour | Works: Not sent in words, seen in the preview | Works | Works | Works |
| Contrast, 44 px targets, focus (drawn parts) | Works: 6.73:1, 0 under 44 | Works: 5.05:1 | Works: 4.76:1 | Works: 6.73:1, 0 under 44 |
| The temperature words (must be shown) | Works: in full | Works: in full | Needs work: behind a link | Works: in full |
| Not evidenced in every design | Extra large text; the Functions fold on a function night; a refused tick; bench reading on a real screen; the old saved shell (K1) | | | |

### Reference fit, round 2

| Principle | A | B | C | M |
| --- | --- | --- | --- | --- |
| Linear: the work before the frame | Works: first box 454 to 344 | Works: 317 | Works: 281, but by hiding work | Works: 344 |
| Things 3: today's work stays visible | Works | Works | Needs work: folds today's shared jobs | Works |
| Airbnb: where, whose and what next together | Needs work: the cook's section far right on the screen | Works: the band | Works: theirs leads | Works: the band, with their count |
| Flighty: the glanceable board | Needs work: 10 rows on a 1920 screen | Works: 23 | Needs work: 11 | Works: 21 |
| Duolingo: real progress | Works: "Grill: 0 of 9" | Works | Works | Works |
| Headspace: plain words, said once | Works | Needs work: kept the jargon, dropped the hint | Needs work: "Floors after shelving 0 of 0" with an arrow | Works |

## Recommendation

**Recommend M: A's page on every device, with B's two columns on the section screens and B's "You: Pans" band made quiet.** Not C.

- **Why it beats the others.** On a phone and the tablet it is A, the design four of seven put first: the first box moves from 454 to 344 px (6 rows instead of 5), the orange handwritten "0/50, recorded; repeats apply" becomes a quiet "Grill: 0 of 9", the temperature words stay in full after your jobs, the coverage hint becomes one plain line under Shared kitchen, and "Grill · To do" stops repeating under Grill. On the five section screens, everyone's main work screen, it uses the width B showed: 21 rows instead of 9, the cook's own Shared kitchen jobs beside their Pack down. A cook from another section sees "You: Pans, 0 of 11" and one 44 px button. It changes no approved rule, adds no tap, no read, no rule and no pop-up. Follow-up scores 7.5 to 8.5, each at or above that reviewer's own first choice.
- **Principles that help:** Linear (work before the frame), Flighty (the screen as a board), Airbnb (where you are and what is next, together), Headspace (plain words, said once).
- **Main downside:** a second layout in the saved shell's CSS (K1) and two more widths to test. On the screen the left column ends early and leaves empty space below it, and bench reading is still unproven.
- **Departure for his OK:** the done count leaves the handwritten face (the `.nb-prog` style) for quiet ink, on this page only.
- **Disagreement kept:** the head chef reviewer and the skeptic would stop at A plus the band and keep one column on the screens (no proof cooks read the right column from the bench; more shell CSS).
- **Before it is called ready:** in the real build at 390, 768, 1100, 1280 and 1920 x 1080 touch, with a busy day: Extra large text, the Functions fold above the page on a function night, a refused tick and its Refresh, the old saved shell (K1), Who did this with a double tap (K3), the width change scoped to Cleaning (KW), and one look at a real section screen from the bench.
- **Build in two pull requests:** (1) the phone and tablet frame, the counts in words, the row lines and the quiet band; (2) the two columns from 1100 px.

### The name

**Recommend keeping Cleaning.** Four of seven in round 2 (the new starter, the screen designer, the keeper, the skeptic) said keep it; three (the cook, the head chef reviewer, the UX designer) said Clean down. Cleaning is the word every new starter already knows, it covers the weekly and morning jobs as well as close, and it is already on about 50 lines the team reads (the admin switch, the Inbox, Records, Settings). Clean down is what cooks say at close, and it fits the tab bar at every text size, so it is a fair choice if he wants it. If he does: one pull request for every word the team sees, with a test that the tab, the title and the admin switch agree; the address stays `#/cleaning`; and `js/fools.js` gets its 1 April joke back for the new word.

## Chosen

Not yet: waiting for the head chef.
