# Fixing a flaky click test

Written 24 November 2026, after the four most retried files were fixed (#844 swipe-dismiss, #845 mascot, #846 section-box, #848 update-confirmation). Each one failed only on a busy GitHub runner, never on a quiet machine, and each cause was a race in the test, not a bug in the book.

## Which file, which check

1. The weekly issue "Click tests that needed a second try" (#523, label `flaky-report`, written by `scripts/flaky-report.mjs` every Monday) lists the files. Fix a "Yes" file, the most retried first, one file per pull request.
2. Find the check that fails: `scripts/flaky/annotations.sh <part of the file name>` lists every annotation for it in the last 300 Click tests runs (`live-tests.yml` as the second argument for the live runs). Then read that job's failing step, not the whole log.
3. Read the test around that check, and the code it measures.

## Make it fail here first

A quiet container passes every time. What made the four fail here:

- **The runner's font.** GitHub's runner falls back to DejaVu Sans, this container to Inter, and text widths change layouts. Run with `FONTCONFIG_FILE=scripts/flaky/fonts-ci.conf`.
- **Load.** Run several copies at once: `PORT=8961 node scripts/flaky/side-by-side.cjs <file,file> 4 3` (4 at once, 3 rounds), with `CHROME` set as for `npm test`. Put an old copy of the test next to the new one (a `tests/zz-old-*.test.js` made from `main`, never committed), so both see the same load.
- **Full Chrome** as well as the headless shell, where both are installed.
- **A slow runner on purpose,** when load alone is not enough: CDP `Animation.setPlaybackRate` for an animation, `Emulation.setCPUThrottlingRate` for a reload, or a real pause before the step.
- **Your own port.** Other sessions may hold 8777. Start your own server or use `PORT`.

Write down the numbers: old failed N of M, new 0 of M, the same method. That goes in the pull request ("Prove the fix fails first", `CLAUDE.md`).

## What the four had in common

Each waited a fixed time for something that took longer on a busy runner. The lessons are in `docs/easy-to-break.md`, Test helpers:

- Touches sent with no times let a fling depend on the runner (swipe-dismiss).
- The page clock `L.open` installs also runs in real time, so a check raced the end of an animation (mascot).
- A control still easing back from hover was measured mid-move (section-box).
- A fixed pause after a reload read the new page before it had loaded (update-confirmation).

The fix is to wait for the thing itself (`L.waitFor`), or to run the test clock past its end. Never loosen, skip or remove a check.

## A check that read an old element

`tests/team-quiet.test.js` (24 Nov 2026) failed on the first try and the retry on one runner. A locator's `evaluateAll` or `evaluate` finds the element in one call and reads it in a second. Entering Today's team from the admin panel, the week's plans and then the team summary come in just after the Save appears, and each one redraws the page. A redraw between the two calls handed the check the old roster, out of the page. Out of the page, `innerText` is the whole `textContent`, hidden picker options included ("Same as Lunch: Grill" holds Sam), and nothing has a style or a size. It failed here with `Emulation.setCPUThrottlingRate` at 6 on that entry, under load. Read text, style or size in one `p.evaluate` that queries the page itself. A locator's `count()`, `innerText()` and `getAttribute()` are one call already.

## When the book is at fault

`csv-text.test.js` (24 Nov 2026) timed out waiting for a download on Team or Transfers, 13 times in 200 runs. A late read (the last 30 days of orders, or loans still out) redrew the admin page after the test opened Export, and the redraw built the Export menu closed again. A person would see the same. The fix went in the book (the menu keeps its open state in `S.aExport`), with a check that forces a redraw after Export and fails on the old code. Under load (4 copies of the old test and 4 of the new at once, 8 rounds), the old test failed 5 of 32 on the old book and 0 of 32 on the fixed one. A fold that redraws closed is a book bug: keep its open state in `S`, as the other folds do.

## A budget that counted the book's own redraw

`seasonal.test.js` (24 Nov 2026) failed "au-christmas-day: Home at rest takes N ms of main thread a second on a slowed phone (under 60)" 20 times in Click tests from 9 November and 4 times on the live site, at 61 to 125 ms. Diwali and Melbourne Cup, measured next in the same runs, took 6 to 42 ms and never failed in those 800 runs. Christmas is measured first, just after a visit to Recipes and back to Home, and its 2 seconds held work the other two never did. On the runner's timeline the 20 second function tick fell inside them: Home's first paint since it opened. That paint drew all seven Home boxes again with the same words, because `homeSlot()` drew them without the words `homePaint()` compares (`el.lkH`): 238 elements styled again and the board laid out, then `js/controls.js` and the seasonal bridge answered the new nodes. Every phone did the same each time Home opened. The window also held the collection of the garbage Recipes left (10 to 17 ms). The book now starts each box from the words it was drawn with (`homeBoxH()`, and `huDrawn` for the Function this week card); `tests/home-board.test.js` checks that the first paint keeps every box (the old code drew all 7 again). The test collects the garbage before it measures. 4 copies of the old test at once failed 2 of 12, both on Christmas. Then 3 copies of the old test on the old book beside 3 of the new on the fixed book, 8 rounds, with other sessions' tests on the same 4 processors: Christmas went over 60 in 7 of 24 old runs and 0 of 24 new (median 43 to 27 ms, level with Melbourne Cup's 28). At that load Diwali and Melbourne Cup went over now and then in both (4 and 5 of 48), as they never did on GitHub's runner. When one window of a budget fails and the windows after it pass, trace what runs in it before blaming the runner: `Tracing.start` with `devtools.timeline` and `v8.gc`, one page at a time, as tracing covers the whole browser.
