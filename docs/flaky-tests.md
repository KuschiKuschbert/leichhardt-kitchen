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

## A tap that did the work itself

`recipe-print.test.js` (24 Nov 2026). Its four live failures and 13 retries were all on 19 November, all "only Chicken Adobo is ticked", fixed in #769; none in 93 live runs and 226 Click tests runs since. Run against the live site here, under other sessions' load, it still failed 2 of 7, on another check: `page.click: Timeout 10000ms exceeded` on Print, the call log stopped at "performing click action". The live files matched `main` (fetched and compared), so the site was not at fault. A click returns only once the page has handled it, and Print laid out up to six cards inside the tap: 2.5 to 3.8 s for five big cards on a quiet machine, before the page could say "Laying out the pages...". A person would see the same freeze. The fix went in the book: the first card waits for the next frame and the cards are laid out one at a time, so a tap waits for one card at most. The test taps Print in the page and checks that nothing was laid out in the tap; that check fails on the old code. With the runner's font under load, the old book failed 2 of 24 and the fixed one 0 of 24; with `Emulation.setCPUThrottlingRate` at 2 as well, 2 of 5 and 0 of 5. At 4 on a machine with a load of 25, one card can still take over 10 s (2 of 10). Work in a tap's handler counts against the click's 10 s: start a long job after the tap's frame and yield often.
