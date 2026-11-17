# April Fools on Home

Built 17 November 2026 for the head chef. The study, the council rounds, the pool of 24 and every decision on the way: `docs/april-fools-options/brief.md` and `pool.md`; play them all in `docs/april-fools-options/preview/index.html`.

## What staff see

On 1 April (the kitchen's day, Queensland, from the 04:00 PIN day, all day), the first time each named person reaches Home that day on a device, Home appears to be hacked and broken for 35 seconds: their own joke out of 24, using their name and their own day (section, shift and hours, break, the people on with them, the prep count, as their Home shows them). Then the mascot owns up: "April Fools, Ann! A joke for 1 April. You did nothing wrong, and nothing is broken. Your prep list, orders and recipes are all safe." and Back to my day. For the rest of the day his bubble says "Got you, Ann."

- **Who.** Everyone who signs in that day, on their own phone or the shared display (head chef, 17 Nov 2026). **Once per person a year, on any device** (head chef, the same day: "do the once thing"): when it starts, the server keeps that it played; on another device that day the joke does not play and his bubble just says "Got you, Ann." 
- **Which.** `deal()` in `js/fools.js`, on every phone, from the staff list the book already holds (`LK_PREP.foolsIds()`: the staff list without Functions-only accounts). Each person's place comes from a hash of their staff id; their joke is place + 5 a year out of 24. No two people share a joke while the team is 24 or fewer, and nobody gets last year's design.
- **Taps** make the piece under the finger break a little more. **Press and hold** anywhere for 1.2 s, or Escape, ends it at once; "Press and hold to stop" shows after three taps or at about 9 s.
- **Not** when Seasonal celebrations are Off on that device (nothing at all). Reduced motion or celebrations Still: the words only ("April Fools, Ann. Nothing is broken today."), no copy and no movement.
- **Waits** (nothing marked, the next Home view tries again) with no signal (`lkServerUp()`), with work not sent yet (`LK_PREP.unsaved()`), with a sheet open, or before Home is drawn. The first-sign-in rules still keep a person on their page for unsent work or a tap waiting on a shared screen; the joke comes on their next Home view that day.

## The admin panel

Admin panel, Kitchen, Once a year, **April Fools** (verified admin only): who gets which joke on the next 1 April, from the same deal the phones make, a **Preview** for each person (opens Home and plays it now with that name) and **Any joke** with all 24. A preview keeps nothing. The row loads `js/fools.js` when it opens.

## Contract

- **Files.** `js/fools.js` (lazy, about 77 KB, 20 KB compressed; `LK_FOOLS.api` 1: `start()`, `end()`, `busy()`, `deal()`, `designs`, `letters`, `length`) and `css/fools.css` (lazy, loaded by `js/fools.js`). Neither is in `SHELL` or `js/upkeep.js`; with no signal and no copy there is no joke. `js/app.js` `foolsSync()` (after `mascotSync()` in `render()`, and on `lk-who` and `lk-cfg`) loads it only on 1 April or for a preview; `LK_APP.fools()` is the admin preview's way in. `js/prep.js` `foolsAdminHTML()` draws the admin row.
- **A copy, never the real page.** The joke plays on a clone of `#app` in a fixed layer on `document.body`. The real `#app` is only hidden by a CSS animation with no fill (`.fl-under`, 65 s), so a script that stops part way cannot leave Home dead; the layer hides itself at 65 s by its own animation. Checked in the preview by clearing every timer mid-joke.
- **Saved on the phone.** `lk.fools.<staff id>` = `{ d: kitchen day, st: 'play' | 'seen' | 'quiet' }`, written by `js/app.js` when it starts, when the reveal shows and for the words only. Out of date on any other kitchen day. If it says `play` (a reload, the app closed, a lock part way), the next Home view that day shows the reveal only. If storage is refused, nothing plays, so a reload can never scare them twice. `lk.fools.off = '1'` turns it off on one device; no screen sets it: the click tests do.
- **Ends.** Leaving Home ends it with the reveal; a lock or sign out ends it quietly (the reveal comes on the next Home view); a hidden screen ends it with the reveal waiting.
- **Once on any device.** `fools/<YYYY-04-01>_<staff id>` = `{ day, at, by }` (`firestore.rules`): created by that person on their own PIN session when their joke starts (`LK_PREP.foolsMark()`, through `W()`), never changed or deleted; read by that person only and the verified admin. Before a joke starts, `LK_PREP.foolsSeen()` reads the person's own record from the server: true, it played elsewhere (the words only); false, it plays; null (no signal, refused, rules not published), the device's own record decides, as before.
- **Reads and writes.** On 1 April only: one read per person per device (their first Home view), one write per person (when their joke starts). Every other day none, and no listener. One HEAD request (`lkServerUp()`) before it starts. A preview reads and writes nothing.
- **Rules.** Looser (a new collection). They publish by themselves after the merge (Publish rules runs after Publish site when `firestore.rules` changed); nothing reads or writes `fools` before 1 April, so that order is safe. Checked on the emulator: `tests/rules/client-shapes.test.mjs` (own read before and after, own create, a second create refused, another person's record read by the admin only and never written, another day refused) and `tests/rules/access.test.mjs` (refused signed out).
- **Motion.** Mostly transform and opacity. The exceptions, for one day: the code rain and the static are canvases, Possessed has one colour wheel (`mix-blend-mode`) and one slow inversion, the melt clones the page in strips. Measured in the preview's quick run with the CPU slowed 4 times: 63 to 579 ms of main thread a second (`pool.md`). One flash at most; taps give one break per 0.25 s.
- **Words.** Coworkers are named as watching, gone, eaten or outside, never as having done something. No real failed save, no claim of stolen details, a camera, IT or police. Red is art only (eyes, a red terminal), never the book's error red.

## Tests

`tests/april-fools.test.js` (54 checks, 1 April 2027 faked with the test clock): plays on a personal phone and on the shared display; js/fools.js and its styles load; lk.fools says it started; the server keeps fools/2027-04-01_ann; already played on another device plays nothing and says Got you; the real Home is only hidden; no sideways scroll at 390, 768 and 1280 px; press and hold stops it and its press does not close the reveal; the reveal's words; a quick tap outside does not close it unread; Back to my day, "Got you, Ann." and focus on the heading; a reload plays nothing again; it ends by itself; a reload part way shows the reveal only; Still gives the words only; celebrations Off, 31 March and 2 April load nothing; the deal for 20 people over ten years; the admin row, its 24 jokes, Preview opens Home and plays and keeps nothing, Escape gives the reveal. Not covered: work not sent yet and an open sheet (the joke waits; the guard is two lines in `start()`).

`tests/lib.js` sets `lk.fools.off` on every other test phone, so a run on 1 April is not covered by a joke.

## Rollback

Revert the pull request and let Publish rules run (or run it by hand) so the `fools` rule goes too. Saved `lk.fools.*` records and any `fools/*` records are ignored by older code.
