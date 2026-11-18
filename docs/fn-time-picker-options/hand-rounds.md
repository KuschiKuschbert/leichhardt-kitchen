# Round times set by hand stay: the quick check (18 November 2026)

The function time box study ([brief](brief.md), round 2) found that a staggered round typed by hand was put back on the gap with no word when First round at, Rounds or Minutes between rounds changed (break-it finding 3), and the wrong round time reached the pass. Five of six reviewers took C's "ask before moving rounds set by hand" as its own pull request. The head chef chose B and the list for the time boxes the same day (#753); this is the guard, built on its own.

## Today (origin/main cd0bb25)

`retime()` in `js/fnedit.js` builds every round from the first round and the gap and keeps only the notes. Reproduced with `tests/function-hand-rounds.test.js` on main: round 3 typed as 19:15 and saved, the gap changed to 45, round 3 goes to 19:30 and nothing says so (11 of 17 checks fail on main).

## Quick check

A small change on an existing form: no new tab, bar button, pop-up or step, so the session's own quick check (`.claude/skills/service-council/SKILL.md`), no extra agents.

- **Needed?** Yes. A function manager types round 3 as 19:15 for a speech, then moves the gap: the kitchen's pass shows 19:30. Reproduced, not a guess.
- **Adds value?** Yes: nothing typed by hand is lost without the person saying so.
- **Quick in service?** The form is the function managers', mostly on a laptop, never a service page. Typing a round time is unchanged (1 click and the keys). Changing the gap with a round set by hand costs no extra tap. Putting the rounds back on the gap is 2 taps.

**The two ways the task allowed:**

| | Ask before moving (a second tap on the change) | Keep the time and say so (chosen) |
| --- | --- | --- |
| How | The gap box takes 45 but the rounds wait for a yes | The gap moves the other rounds; round 3 stays and a line under the gap names it, with Work the times out again (a second tap) |
| Pattern | A question held over a typed number box: a half-applied form, and Save in between saves which? | The same as the split by hand beside it: "Split by hand. Changing the rounds keeps your numbers; Split evenly again" |
| Taps to keep the hand time | 1 more (answer Keep) | 0 |
| Taps to move it onto the gap | 1 more (answer Move) | 2 (Work the times out again, Tap again) |

Keep and say wins: no pending state, the person's own entry wins, and the form already teaches this pattern one line lower.

**Lines on a 390 px phone:** one hint line of 2 lines (43 px) under Rounds and the gap, only while a round is set by hand; 1 line (24 px) at 1280 px. Nothing moves over the grid. Shots: `shots/hand-390.png`, `shots/hand-1280.png` (round 3 kept at 19:15 after the gap went to 45).

**Contract fit:**
- `docs/design-patterns.md`, "Destroying something typed asks a second tap in place": Works. Work the times out again uses the book's `arm()` ("Tap again: round 3 goes to 19:30"), no pop-up.
- `docs/action-feedback.md`, rule 2: Works. The line under the gap says which round was kept and at what time, where the eye is after leaving the gap box. After the second tap the slip names it: "Round 3 back on the gap: 19:30." Nothing scrolls (rule 4); keyboard focus goes to the gap box.
- Tap targets (44 px): Needs work, shared with Split evenly again: the link is the book's 24 px `.linkish`; the 44 px way to the same result is the round's own time box.
- Colours: the plain hint and the accent link, as the split line; no new colour.

**Design references:** Duolingo (recovery: nothing is lost and the way back is named), Linear (one pattern for one job: the hand-set split and the hand-set times read the same), Things 3 (a quiet line, no pop-up).

**Try to break it (the skeptic and the keeper, done by the session):**
1. The first round moves later than a kept round (19:15 kept, first round to 18:45, round 2 to 19:30): the rounds are out of order. Reproduced in the test: "Round 3 must be after round 2." is named and a confirmed function is not saved. Fixed by the person, never guessed.
2. Round 2 typed by hand, then saved and opened again: the gap is read from rounds 1 and 2, so round 2's time becomes the gap and round 3 shows as set by hand. Untested risk, low harm: it keeps times rather than moving them, and Work the times out again puts them on the gap.
3. A draft kept on the device before this change has no markers: a restored draft is marked from the grid the same way as a reopened function. A kept time that later lands exactly on a new grid loses its marker after Save (the saved function cannot tell it apart). Untested risk.

**Keeper:** no Firestore reads, rules or saved fields change. The marker (`h` on a round) lives in the form and the device's own draft only; `toDoc()` saves `{ at, note }` as before, and `dirty()` ignores the marker. Rollback: revert the pull request; an older `js/fnedit.js` ignores the marker in a draft.

**Verdict: Build (small).** Keep the time set by hand and say so, with Work the times out again on a second tap.

## Built

- `js/fnedit.js`: `gridAt()`, `offGrid()`, `markHand()` and `handOf()`; `fromDoc()` and a restored draft mark rounds off the first round plus the gap; typing a round's time marks it (or clears it when it is back on the gap); `retime()` keeps marked rounds; Remove round keeps the times after it (removing round 1 makes the next round the first); `handHTML()` draws the line; Work the times out again (`data-fe="regrid"`) on a second tap; `dirty()` compares without the marker.
- `tests/function-hand-rounds.test.js`: 17 checks. 17 of 17 pass; 11 fail on main.

Verification (Implemented app, local click-test stand-in, Chromium, a function manager, synthetic data, 390 px and the measuring run at 1280 px): `function-hand-rounds`, `functions`, `function-form-fixes`, `function-cancel`, `function-list-actions`, `functions-activity`, `functions-board`, `functions-maths`, `check-before-function`, `editor-navigation`, `keep-typed`, `keep-typed-pages`, `keep-typed-editors`, `parent-return` and `safe-text` pass. `function-print` and `function-prep-print` fail one check each locally, the same as #753 found on unchanged main (print pagination), not this change. Not tested: a real laptop, Safari, with #753's typed boxes (the test sets times the way #753's own test does, so it should hold).
