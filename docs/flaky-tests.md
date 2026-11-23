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
