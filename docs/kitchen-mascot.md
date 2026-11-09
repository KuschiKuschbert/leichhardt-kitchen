# The kitchen mascot on Home

Built 9 November 2026 (owner). The Smashed Burger star robot with the navy bandana greets each named person on Home. The artwork study, the council rounds, the placement mock and their evidence are in pull request #654 (`docs/kitchen-mascot/`, `docs/mascot-placement-options/`, `docs/mascot-cycle-options/` on branch `feat/kitchen-mascot-animations`).

## What it does

- **A shuffled action each day, per person.** Each signed-in person has their own shuffled set of all 11 actions: Idle, Welcome, Look around, Recipe reading, Ready to cook, Smash, Flip, Build, Serve, Walk and At the smoker. No action repeats for that person until all 11 have played, then the set reshuffles. A new set never starts with the action shown last, so no action shows two days running.
- **Once, then still.** On the first Home view of the kitchen day where it can play, today's action plays once (2.5 to 3.9 seconds), then the mascot rests on the Welcome pose. Returning to Home the same day opens at rest.
- **Tap to replay.** A tap replays today's action. It never draws a new one or changes the set. A second tap while it plays does nothing. With reduced motion a tap shows today's pose as a still for 2 seconds, then the Welcome pose.
- **Where.** The right end of the "Welcome, [name]" row, standing on the date line, under the top bar and above the first card. 64 x 85 px, or 48 x 64 px when that is all that fits. Home only: never on Prep, Orders, Recipes or any work page.
- **The full name wins.** If the mascot would touch any word of the name or date, a seasonal ornament or the top bar, it is left out for that view. Long names wrap, so the corner usually stays free; a single long word that reaches the corner leaves it out.

## Decisions

| Date | Decision |
| --- | --- |
| 9 Nov 2026 | Cycle the actions as a shuffled set per person, one a day, all 11, kept per device (owner, after round 1: Build smaller, 5 of 5) |
| 9 Nov 2026 | Design A: plays by itself once, then the neutral Welcome pose (all six round 2 reviewers ranked A first) |
| 9 Nov 2026 | Heading corner, "even with long names" (owner, after the placement mock at three widths with Christmas snow) |
| 9 Nov 2026 | Tap replays today's action (owner). A deliberate exception to the named heading's "no new service control": the button sits outside the heading so the name reads on its own, has no hover tint or pressed box, and a tap never changes the set |

The council would have kept Serve, Ready to cook, Look around and Recipe reading off Home as status-like poses. The owner kept all 11. The mitigation is the Welcome rest: a status-like pose plays for a few seconds and is never held beside the board.

## Contract

- **Files.** `js/mascot.js` (lazy: loaded by `mascotSync()` in `js/app.js` on the first named Home view, `LK_MASCOT.api` 1; not in `SHELL` or `js/upkeep.js`). Art in `art/mascot/`: 11 compact sprite sheets (`<action>-sheet-compact.webp`, 4 x 2 frames of 192 x 256 px) and 11 stills (`<action>-still.png`), 3.6 MB together.
- **Not in the saved copy.** Art loads with `?v=1`. `sw.js` keeps no same-origin file with a query string unless it is a lazy `.js` file, so mascot art never collects in the offline copy. With no signal and no art, the mascot is left out and Home is unchanged.
- **Identity.** `LK_PREP.whoId()` gives the staff id while the person's name shows. The record is per staff id, so two people on one device each have their own set; a lock or handover unmounts it.
- **Saved on the phone.** `lk.mascot.<staff id>`: the actions left this round, the last one shown, the kitchen day it was drawn and whether it has played. Never out of date: the day stamp only gates a new draw. If storage is refused, the record lives in the page's memory.
- **The kitchen day** is `LK_TIME.day()` (Queensland), so midnight starts the next action.
- **Used up only when seen.** An action counts as played only when its play reaches the end. A hidden screen, missing art, no room or a redraw part way through leaves it unplayed, so a later Home view the same day plays it.
- **Reads and writes.** None. No listener, no Firestore, no rules.
- **Motion.** One pass, never a loop. A hidden tab or scrolling it out of view ends the play at once on the Welcome pose. Reduced motion never plays automatically and loads no sprite sheet.

## Cost

About 11 KB of script once per device. Per person per day: one still (about 45 KB) and one sprite sheet (250 to 330 KB), from the browser's own cache when already fetched. No Firestore reads.

## Tests

`tests/mascot.test.js` (69 checks): the shuffle (three rounds of 11, no repeat two days running, an order per person), first view plays once and rests, the heading reads only the name, 64 x 85 px at the right end under the top bar, return the same day stays still with no sprite sheet, a tap replays without changing the set, a double tap plays once, no Firestore reads for a tap and play, the next kitchen day and Queensland midnight take the next action, reduced motion, a hidden first view, refused storage, missing art, 390, 768 and 1280 px (every Home rectangle unchanged, no sideways scroll, a target of at least 44 px, clear of the chef hat), long names never covered, a name reaching the corner leaves it out, two people on one device, and no mascot on Prep or Recipes.

## Rollback

Revert the pull request. Saved `lk.mascot.*` records are ignored by older code.
