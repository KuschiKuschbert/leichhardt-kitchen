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

## A wait for a class the book never draws

`tests/cleaning-toggle.test.js` (24 Nov 2026) failed "admin release and rollback" in 17 of the last 300 Click tests runs and 3 Live click tests runs (19 to 24 Nov), always on the setup link after the switch-off. Its `loaded()` waited for `.cln-loading` to go and `.cln-body` to be there. The book has no `.cln-loading`, and `.cln-body` holds the "Loading cleaning..." line, so the wait passed while the list was still being read. A chef's General group was not drawn yet, so nothing opened it, and the wait for its two rows timed out. The same wait made `tests/cleaning-schedule.test.js` flaky (#865). Wait for what the person sees: the page is up and no longer says "Loading cleaning...". The old test failed 6 of 6 here with the stand-in's cleaning answers held 400 ms, and 1 of 24 under load alone; the fixed one 0 of 6 and 0 of 24. `tests/cleaning.test.js`, `tests/cleaning-chef-layout.test.js` and `tests/sweep-words.test.js` still wait for `.cln-loading`: fix each in its own pull request if it shows in the report.

## A jump the clock undid

`tests/cooling-motion.test.js` (24 Nov 2026) needed a second try 12 times in the last 300 Click tests runs and 2 times on the live site, and failed on the live site once, every time at "only the explicit green-clock tap starts a further four hours". The 4-hour start was stamped 3.9 s after the 2-hour mark, not an hour after it: the test had moved the clock on an hour, and the clock had gone back. Playwright 1.48 (`tests/package.json`) runs the page clock in real time with ticks of its own. A tick that began before `p.clock.fastForward` or `p.clock.pauseAt` can end after it and set the clock back to its own older time. Newer Playwright pauses those ticks for a jump. On a plain page with a 16 ms timer, `fastForward` by an hour went back 12 to 19 times in 60 and `pauseAt` 3 times in 60. The test's `jump()` now pauses the clock, waits for such a tick to end (`L.settle(p, 100)`), reads the clock back, jumps again if it went back, and only then lets it run (0 of 180). Any check that needs a jump to hold while the clock runs can lose it the same way: read the clock back after the jump.

The same file had two more races, seen here only under more load than a runner has. The 1280 px pill eases its width over 340 ms, and a fixed settle measured it halfway: `phase()` now waits until the clock's own transitions have ended. The overnight check read that 340 ms expansion one call after starting it: it now starts and reads it in one `p.evaluate`. Under load (4 copies of the old test and 4 of the new at once, 6 rounds, headless shell and full Chromium), the old test failed 7 of 24, the 4-hour check among them, and the new 0 of 24.

Since 25 Nov 2026 the tests run on `playwright-core` 1.65.1 (`tests/package.json`), whose clock pauses its own ticks during a jump. On a plain page with four 16 ms timers, an hour's `fastForward` went back 18 times in 60 on 1.48.2 and none in 60 on 1.65.1. `jump()` in `tests/cooling-motion.test.js` and `still()` with `until()` in `tests/loading-wait.test.js` stay: they also keep a check from reading the page while its clock moves.

## When the book is at fault

`csv-text.test.js` (24 Nov 2026) timed out waiting for a download on Team or Transfers, 13 times in 200 runs. A late read (the last 30 days of orders, or loans still out) redrew the admin page after the test opened Export, and the redraw built the Export menu closed again. A person would see the same. The fix went in the book (the menu keeps its open state in `S.aExport`), with a check that forces a redraw after Export and fails on the old code. Under load (4 copies of the old test and 4 of the new at once, 8 rounds), the old test failed 5 of 32 on the old book and 0 of 32 on the fixed one. A fold that redraws closed is a book bug: keep its open state in `S`, as the other folds do.

## A tap that did the work itself

`recipe-print.test.js` (24 Nov 2026). Its four live failures and 13 retries were all on 19 November, all "only Chicken Adobo is ticked", fixed in #769; none in 93 live runs and 226 Click tests runs since. Run against the live site here, under other sessions' load, it still failed 2 of 7, on another check: `page.click: Timeout 10000ms exceeded` on Print, the call log stopped at "performing click action". The live files matched `main` (fetched and compared), so the site was not at fault. A click returns only once the page has handled it, and Print laid out up to six cards inside the tap: 2.5 to 3.8 s for five big cards on a quiet machine, before the page could say "Laying out the pages...". A person would see the same freeze. The fix went in the book: the first card waits for the next frame and the cards are laid out one at a time, so a tap waits for one card at most. The test taps Print in the page and checks that nothing was laid out in the tap; that check fails on the old code. With the runner's font under load, the old book failed 2 of 24 and the fixed one 0 of 24; with `Emulation.setCPUThrottlingRate` at 2 as well, 2 of 5 and 0 of 5. At 4 on a machine with a load of 25, one card can still take over 10 s (2 of 10). Work in a tap's handler counts against the click's 10 s: start a long job after the tap's frame and yield often.

## A budget that counted the book's own redraw

`seasonal.test.js` (24 Nov 2026) failed "au-christmas-day: Home at rest takes N ms of main thread a second on a slowed phone (under 60)" 20 times in Click tests from 9 November and 4 times on the live site, at 61 to 125 ms. Diwali and Melbourne Cup, measured next in the same runs, took 6 to 42 ms and never failed in those 800 runs. Christmas is measured first, just after a visit to Recipes and back to Home, and its 2 seconds held work the other two never did. On the runner's timeline the 20 second function tick fell inside them: Home's first paint since it opened. That paint drew all seven Home boxes again with the same words, because `homeSlot()` drew them without the words `homePaint()` compares (`el.lkH`): 238 elements styled again and the board laid out, then `js/controls.js` and the seasonal bridge answered the new nodes. Every phone did the same each time Home opened. The window also held the collection of the garbage Recipes left (10 to 17 ms). The book now starts each box from the words it was drawn with (`homeBoxH()`, and `huDrawn` for the Function this week card); `tests/home-board.test.js` checks that the first paint keeps every box (the old code drew all 7 again). The test collects the garbage before it measures. 4 copies of the old test at once failed 2 of 12, both on Christmas. Then 3 copies of the old test on the old book beside 3 of the new on the fixed book, 8 rounds, with other sessions' tests on the same 4 processors: Christmas went over 60 in 7 of 24 old runs and 0 of 24 new (median 43 to 27 ms, level with Melbourne Cup's 28). At that load Diwali and Melbourne Cup went over now and then in both (4 and 5 of 48), as they never did on GitHub's runner. When one window of a budget fails and the windows after it pass, trace what runs in it before blaming the runner: `Tracing.start` with `devtools.timeline` and `v8.gc`, one page at a time, as tracing covers the whole browser.
