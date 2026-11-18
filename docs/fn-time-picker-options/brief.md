# Function time boxes: the study (18 November 2026)

## Chosen (18 November 2026)

The head chef chose **"Build B + the list"**: B's typed box on every function time, with D's list of times on Event start and First round at on a laptop. Built in this branch (`js/fnedit.js`, `css/app.css`):

- One reader (`readT()`) in place of `normT()`: 1830, 18:30, 18.30, 0630, 18 and 6:30pm are taken as HH:MM; 1 to 11 with no am or pm stays as typed and asks; anything else stays as typed and is named. `atOf()` takes only a clear HH:MM, so "6:30" waiting for an answer is never 06:30 (`M.hmMin` would read it so). Food follows the start only once the start is clear.
- `timeProblems()` refuses Save draft, Confirm and Print while a time is unclear, with the reason in the list and at the box; the general "Set the event start" and round messages step aside for it.
- `tboxHTML()` draws each box with `.fe-tsay` (said back while typing where there is no list), the Morning or evening? chips (`data-fe="tpick"`, in the pointerdown guard) or the red Cannot read line. Tab from "630" goes to the first chip, and a redraw keeps a chip's focus.
- The list (`TL`, `tlShow()`): Event start and First round at only, from 768 px with a mouse (`pointer: fine`), drawn in the box's own cell, a combobox and listbox with `aria-activedescendant`, arrow keys, Enter, Escape closes only the list, a click keeps the focus in the box. "18" opens at 18:00, one digit lists by hour, "630" leaves 06:30 and 18:30. A box already asking shows its question, not the list. With an older saved `app.css` the list does not show at all.
- From 768 px a round's time and note share one line (`.fe-rrow`).
- `js/app.js` loads `js/fnedit.js?v=10` (the address only; `FE_API` stays 10, as both sides still run together).

Verification (Implemented app, local click-test stand-in, Chromium, a function manager, synthetic data): `tests/function-time-boxes.test.js` 36 of 36 at 1280 px and 390 px with touch; it fails on main (no list; the first list check times out). `functions`, `function-form-fixes`, `function-cancel`, `function-list-actions`, `functions-activity`, `functions-board`, `functions-maths`, `editor-navigation`, `keep-typed-editors`, `parent-return` and `design-patterns` pass. `function-print` (large copy pagination) and `function-prep-print` (long ingredient lists) fail one check each locally, the same on unchanged main, so not this change. Not tested: a real iPhone or Android keyboard, a 12-hour laptop, Safari. Shots `built-list-1280.png`, `built-ask-1280.png`, `built-ask-390.png`, `built-grid-1280.png`.

Not built: C's ask before moving round times set by hand (its own change); A's date boxes without the forced calendar.

The head chef (owner), 18 Nov 2026: "can we fix the new function form creator, the time picker is a bit shit, like a lot", then "i need to see the desktop view, that was a terrible one". The form is used mostly on a laptop. Previews in this folder (`a.html`, `b.html`, `c.html`, open them from a local server at the repo root); shots in `shots/`. Not loaded by the book.

## Today (origin/main cd0bb25)

Event start, Food goes out at / First round at, and each round's time are native `<input type="time" step="60">` (`T24` in `js/fnedit.js`), since 26 Oct 2026 (#395). A click handler in `js/app.js` (about line 2512) calls `showPicker()` on every click of a date or time box, so a click anywhere on the box, including the hour you meant to type in, drops the browser's clock list over the form (desktop Chrome: an hour column and a 60-row minute column). On a laptop or phone set to 12-hour time the box shows "06:30 PM", against the book's 24-hour rule (`docs/prep-book.md` line 589 allowed that on 26 Oct). At 1280 px the round grid stacks each round's time over its note in a wide first column, with the amounts far to the right (`council/grid-1280.png` in the session evidence).

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** Role-based analysis, not research with real staff.

| Reviewer | Verdict | Main point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Off the line, but a wrong time reaches the pass. A typed box must not guess: "630" meant as evening saving 06:30 sends the kitchen 12 hours off. Cut +15/+30. |
| Head chef | Build smaller | Small, real problem; the 12-hour display breaks the 24-hour rule. The pain is two boxes (Event start, First round at); rounds are worked out. Build A only. |
| Skeptic | Build smaller | Some of the pain is the book's own forced drop-down; try the cheap fix first. A home-made box is a second kind of time box (Linear). B's 14 hour chips break the chips pattern (two to about six). |
| New starter | Build smaller | `--:--` teaches nothing. Never guess morning or evening: ask "06:30 or 18:30?" with two buttons. Always show the saved 24-hour time beside the box. |
| Keeper | Build smaller | No reads, rules or saved fields. One reader shared with `normT()` that never guesses; refuse an unreadable time on Save draft too, because the browser's check (`checkPickers`) will not see a text box. |

Cut by the council: B's hour and minute chip panel (5 of 5: no breakfast, no 00:30 round, no 18:20 from a 20-minute gap), and the per-round +15/+30 buttons (4 of 5: Minutes between rounds already does it).

**Break-it findings (round 1, all Risk / Not evidenced, source reading only):**
1. A coordinator types "630" for an evening start: `normT()` reads 06:30, Confirm passes, the kitchen sees a breakfast function. Repair: never guess; ask morning or evening. Check: a click test typing 630, 183, 18, 6:30pm, 0630.
2. A coordinator types "183" and taps Save draft: `save()` checks times only on Confirm and `checkPickers` skips text boxes, so the draft could save no start. Repair: refuse on Save draft too, with the field error.
3. A round set by hand, then First round at or the gap changes: `retime()` rebuilds every round and the hand-set time goes with no message. This happens today. Check: a click test.

## Round 2: three designs

The same task in each: book the Smith 50th, 21 Nov 2026, event start 18:30, three staggered rounds 30 minutes apart, then type "630" by mistake. Synthetic data, preview pages with the book's own `css/app.css`; the top bar and platter lines are left out (Preview, not the implemented app). All three also put a round's time and note on one line from 768 px, so the desktop grid stops stacking them.

### A. Keep the clock, say the time (changes least)

The device's own time box stays. The book stops forcing the drop-down open on a click (the clock icon still opens it), so a click on the hour lets you type. Under each box: "Kitchen sees 18:30" in 24-hour words.
- Pros: least code; keeps one kind of time box across the book; native keyboard and screen reader behaviour and validity stay.
- Cons: a 12-hour laptop still shows "06:30 PM" in the box itself (the line under it is the only 24-hour); typing still needs the hour segment, and on a 12-hour device AM/PM is a third segment; the drop-down stays one click on the icon away.

### B. Type it, the book reads it (the council's narrowed design)

Every function time box becomes a plain typed box with a number keypad. As you type, the time is said beside it ("18:30 evening"); leaving the box sets "18:30". 1 to 11 with no am/pm ("630", "6") asks "Morning or evening?" with two chips, "06:30 morning" and "18:30 evening", and the box is edged in the attention colour until one is picked. "0630", "18", "6:30pm" are read without asking. An unreadable time ("183") is a red line: Can't read "183". Type it like 1830. Save draft and Confirm both refuse it.
- Pros: always 24-hour on every device; type 1830 in one go; the morning/evening trap is caught at the box.
- Cons: the function form's time boxes differ from Today's team, minutes, pings and deliveries; the book's own validation replaces the browser's; the said-back line adds a line per box (beside the box on a laptop).

### C. One time, the rounds follow (removes the most boxes)

Event start is B's typed box. First round at is words, "18:00, with the event start" and a Different time link that opens B's box. Minutes between rounds becomes Every: 15, 20, 30, 45 min chips and Other (a box). The round grid shows each round's time as plain words; "Change a round's time" turns them into typed boxes, and once one is changed by hand, changing the first round or Every asks before it moves them.
- Pros: fewest boxes to fill; the common booking needs only the event start; fixes break-it 3.
- Cons: biggest change and relearning for the coordinators; hidden boxes (Different time, Change a round's time) cost a click when needed; the Every chips are a second way to set the gap beside Other.

### Measured (Preview, Chromium, keyboard and mouse, 1280 px unless said)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Set event start 18:30 on an empty box | Click (drop-down opens over it), then pick 18 and scroll to 30, or Escape and type: about 4 actions plus scrolling. Not measured on a real laptop | Click the hour, type 1830: 1 click, 4 keys (12-hour laptop: 0630 then P) | Click, type 1830: 1 click, 4 keys | As B |
| Typed "630" by mistake | Box takes 06:30 (24-hour device) silently | Box takes 06:30; the line says "Kitchen sees 06:30" | Asks Morning or evening? 1 more click | As B |
| 3 rounds every 30 min from the start | Tap Staggered (defaults 3 rounds, 30 min): 1 click | 1 click | 1 click | 1 click |
| Change the gap to 20 min | Click the box, type 20 | As today | As today | 1 click on 20 min |
| Set one round's time by hand | Click its box, type | As today (drop-down forced off) | Click, type | Change a round's time, then click, type: 1 more click |
| Page height at 1280 px (preview, static bar) | not comparable | 1389 px | 1418 px | 1411 px |
| Sideways scroll at 390 and 1280 px | none | none | none | none |
| New reads, rules, saved fields | | none | none | none |
| Build size | | 1 small PR (`js/app.js`, `js/fnedit.js`, `css/app.css`) | 1 PR (`js/fnedit.js`, `css/app.css`, tests) | 1 to 2 PRs (also `retime()` and hand-set rounds) |
| Relearning | | none | small (type, read it back) | medium (rounds as words, Every chips) |

Exercised in the B preview (Checked in `docs/fn-time-picker-options/b.html`, Chromium 1280 px): 1830 says "18:30 evening" while typing and becomes 18:30 on Tab; 630 asks Morning or evening?, a click on "18:30 evening" sets 18:30 (the first try lost that click to the box's redraw on leaving; fixed by keeping the box focused while a chip is pressed, which the build must keep); 6:30pm gives 18:30; 0630 gives 06:30; 183 gives the red Can't read line.

Differences:

| | A | B | C |
| --- | --- | --- | --- |
| Control | Device clock | Book's typed box | Book's typed box, fewer of them |
| What shows the 24-hour time | A line under the box | The box itself and the line beside it | The box, and plain words for rounds |
| Rounds | Boxes | Boxes | Words, boxes on request |
| Gap | Number box | Number box | Chips plus Other |
| Morning or evening | Not asked | Asked | Asked |

## Round 2 scores (out of 10, each reviewer's own)

| Reviewer | A | B | C | Rank |
| --- | --- | --- | --- | --- |
| Cook mid-service | 4 | 8 | 6 | B, C, A |
| Head chef | 6 | 8 | 5 | B, A, C |
| Skeptic | 6 | 7 | 4 | B, A, C |
| New starter | 4 | 8 | 6 | B, C, A |
| Keeper | 6 | 8 | 5 | B, A, C |
| Screen designer | 4 | 7 | 6 | B, C, A |
| Total | 30 | 46 | 32 | B first for all six |

All six said A and B share one layout and differ in the control and the morning/evening check; C is the structural alternative. Disagreement: A or C second (three each). Nobody recommended blending all three: A's device box beside B's typed box is two kinds of time box on one form, and C's words and chips undo B's boxes.

### Mix considered (A + B + C)

| From | Part | Take or reject | Why | Principle |
| --- | --- | --- | --- | --- |
| A | Device clock box, "Kitchen sees" lines | Reject (6 of 6) | 12-hour laptops still show PM; 630 taken silently; the line repeats the box | Airbnb (no duplicated information), Headspace (one format) |
| A | Stop forcing the drop-down open on a click | Take for the form's date boxes (cook, skeptic, designer); keeper: B gets it free for times | A control must not fight the typing | Linear, Todoist |
| B | One reader, morning/evening question, "Can't read" line, refuse on Save draft too | Take (6 of 6) | Never guess from unclear text; an honest answer at the box | Todoist, Duolingo |
| B | The said-back line on every box | Trim (5 of 6): only while typing or when the time is unclear or unreadable; never on round rows once set | "18:00 evening" next to a box showing 18:00 is noise | Airbnb |
| B | Orange and chips from the first keystroke | Change (designer, Reproduced at 1280: TBC moved 44 px, a round note jumped about 260 px) | Ask only on leaving the box | Duolingo (truthful, stable) |
| C | Ask before moving rounds set by hand | Take, as its own pull request (5 of 6) | Today a hand-set round is moved with no word; it reaches the pass | Duolingo (recovery), Flighty |
| C | Rounds as words, Every chips, Different time link | Reject (5 of 6) | Two ways to set one gap; 24 px links break the 44 px rule; hidden boxes | Linear, Todoist |

### D: a list of times under the box (added at the head chef's question, 18 Nov 2026)

After the scores the head chef asked what the picker itself looks like: "the last time when i tried picking a time it looked like it was 1998". D is B's typed box with a list of times every 15 minutes under it while it has focus (00:00 to 23:45, opened at the box's time or 18:00, each row the time and morning/afternoon/evening, 44 px rows), narrowed as you type: "18" jumps to 18:00, "630" leaves 06:30 and 18:30. Click a row, or the arrow keys and Enter. Odd minutes are typed. Shots `d-open-1280.png`, `d-18-1280.png`, `d-630-1280.png`. D was not in the six-reviewer scoring; it is part of the mix below and gets the focused follow-up.

### The combined preview (`m.html`)

B trimmed, with D's list: while the box has focus the list does the talking (no colour, no question, nothing moves); leaving a clean time shows just the 24-hour time in the box; leaving "630" edges the box in the attention colour with "Morning or evening?" and two chips; leaving "183" gives the red Can't read line. The bottom line says "start time to come" instead of "?". C's hand-set guard is a separate pull request and not in the preview. A's date-box fix is not visible in a still.

Checked in `m.html` (Chromium, 1280 and 390 px, keyboard and mouse): TBC does not move while typing (316 px before, after "1" and after "1830"; 396 px at 390); 1830 then Tab gives 18:30 with no extra line; typing 630 shows only 06:30 and 18:30 in the list, no orange; Tab away asks Morning or evening?; Enter on "18:30 evening" sets 18:30; 183 gives the red line; no sideways scroll. Shots `m-open-1280.png`, `m-630-typing-1280.png`, `m-630-left-1280.png`, `m-183-1280.png` and the same at 390.

### Focused follow-up on the combined preview (screen designer, skeptic, keeper)

| Reviewer | Mix as first previewed | Against their B | Main point |
| --- | --- | --- | --- |
| Screen designer | Needs work, 7 (8 once repaired) | B 7 | One coherent control at 1280 that "looks current"; repairs: list clipped in the round grid, arrow-key row 1.11:1, box widened when asking, two oranges stacked on focus, marker on an empty box |
| Skeptic | Worse than pure B, 6 | B 7 | Same typing cost as B; a home-made list is a second way to set a time; Reproduced: round lists clipped by `.fn-tw` (a 30-minute-early pick invited), list out of view with a phone keyboard up, 1820 opened the list at 00:00; Risk: a pick fires no input, so the real form's `flushPending()` could save the stale "630" |
| Keeper | Needs work, 7 (8 if built as planned) | B 8 | The book has no inline combobox (Room uses `input[list]` and the shared AdaptivePicker); record the list in `docs/design-patterns.md`; the list on Event start and First round at only, outside `.fn-tw`, with combobox roles; Risk: `M.hmMin` reads "6:30" as 06:30, so a stored unclear time must not reach rounds or Confirm |

**Repaired in `m.html` (18 Nov 2026), Checked in Chromium at 1280 and 390 px:** the list shows only on Event start and First round at, and only from 768 px; round boxes and phones keep B's said-back line while typing ("19:15 evening", "06:30 or 18:30?"); no marker on an empty box (the list still opens at 18:00); 1820 opens the list at 18:15; the arrow-key row is ink with white words (`m-arrow-1280.png`); the box stays 288 px wide when it asks; the asking box's focus ring is ink; a pick fires a change. Not repaired in the preview (build items): combobox roles and `aria-activedescendant`, the list mounted outside the form's redraws, phone Back closing only the list.

**Break-it disposition:** clipped round lists: removed (no list on rounds). Phone keyboard: list off below 768 px. Stale "630" on Print or Back, Save draft with an unclear time, "6:30" read by `M.hmMin`: build, with click tests (keeper's step 1). Hand-set rounds wiped: its own pull request. Not evidenced: a real iPhone and Android keyboard, a 12-hour laptop, the list against the sticky bar in the full shell.

## Recommendation

**Recommend B's typed box everywhere, with D's time list on Event start and First round at on a laptop, and C's ask-before-moving for hand-set rounds as its own pull request.** It fixes the 12-hour display on every device, never guesses morning or evening, keeps typing at 1 click and 4 keys, and replaces the 1998 drop-down with a list in the book's own look where the head chef uses it (a laptop). Main downside: a home-made list is a second kind of picker in the book, with its own keyboard and screen-reader wiring to build and test. The skeptic dissents: pure B (no list) is cheaper for the same typing cost. Mix review status: lead synthesis, checked by three of the six reviewers on the first combined preview; the repairs above are the lead's, not re-reviewed.

Build plan (keeper): 1) the reader, B's states, Save draft and Print refusing an unclear time, tests (`js/fnedit.js`, `css/app.css`, `tests/functions.test.js`); 2) the list with combobox roles, recorded in `docs/design-patterns.md`; 3) the hand-set rounds guard.
