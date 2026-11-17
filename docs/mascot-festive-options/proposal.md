# Proposal: the mascot in festive clothes on celebration days

Round 1 of the service council. No app code changed. Source commit `4eca7f4` (main, 17 Nov 2026).

## What the owner asked

"Can we dress the mascot in festive clothing for the celebrations?" (owner, 17 November 2026.)

## The problem in the kitchen

There is no service problem. This is morale: the book already marks a celebration day (the welcome wish, Home ambience, a stamp and a still edge on work pages), and the mascot is the one part that stays in his work clothes.

- **Who sees it.** Every named person on Home (he says the welcome there, 48 x 64 px on a phone, 72 x 96 px from 768 px). Also under a finished prep list (48 x 64 px under 900 px, up to 192 x 256 px on a wide screen) and on a finished section's own tab on a wide screen (48 to 96 px, a still).
- **How often.** 39 of the next 365 days have a celebration (`KB_SEASONAL_CALENDAR.resolve`, counted 18 Nov 2026 to 17 Nov 2027): 16 Australian and fun days (Christmas Eve, Christmas Day, Boxing Day, New Year's Eve and Day, Valentine's, St Patrick's, Easter, Star Wars Day, Mother's Day, Father's Day, Coffee Day, World Food Day, Chefs Day, Halloween, Melbourne Cup), 21 cultural and religious festival days (Galungan and Kuningan 2 each, Pongal, Sinulog, Lunar New Year, Holi, Pahiyas, Ganesh Chaturthi, Onam, Navaratri 5, Durga Puja 3, Dussehra, Diwali) and 2 quiet days (Nyepi, Philippine Independence Day). Some 2027 Nepal, Eid and Philippine festival dates are not published yet, so the real count will be a little higher.
- **The next five** are Christmas Eve, Christmas Day, Boxing Day, New Year's Eve and New Year's Day, from 24 December 2026.
- **What happens today.** On Christmas Day Home says "Merry Christmas, Ann" in his speech bubble, with the festival board and ambience, and he wears his navy bandana and striped apron (`evidence/0-today-xmas-home-390.png`).

## The change

On a celebration day the mascot wears something festive wherever he already stands. Nothing new to tap, no new place on any page, no words, no new pop-up. When celebrations are Off on the device, or it is a quiet day, he wears his usual clothes.

What he wears, where, and whether the festival changes his daily action are the open design questions for round 2. Two building blocks are proven in a prototype on the real art:

1. **A hat on his star.** A small pixel-art hat drawn over the top point of his star, in every frame of all 11 actions and the 11 stills. The point, tilt and size of his head in each of the 99 pictures are measured from the art itself (top point of the yellow star, the eye line for scale), so the hat follows him as he walks, flips, smashes and leans in to the smoker (`evidence/A-frames-santa.png`). The frame leaves 22 to 34 px above his star, so a hat has to sit over the point of the star, not above it.
2. **Festival colours on his bandana.** His navy bandana and its knot take the festival's colours in every frame (`evidence/C-bandana-board.png`). Measured on a phone at 48 x 64 px the bandana is a thin band: Christmas red reads, Diwali marigold barely does (`evidence/C-diwali-home-390.png`).

## Cost

- **Reads, writes, rules, listeners:** none. The celebration comes from the offline calendar the book already runs (`KB_THEME_BRIDGE.status()`).
- **Files:** the clothes are drawn at run time over the existing frames, so no new sprite sheet. About 1 KB of measured head positions and about 0.5 KB per hat in `js/mascot.js` (lazy, not in the saved shell, so no update band on phones beyond the usual one for a changed file). Baking a dressed copy of every sheet instead would add 3.4 MB of art per outfit: not proposed.
- **Tests:** one new click test file, about 30 to 60 seconds of the 6 minute run.
- **Risks:** a hat misplaced in one frame; a costume that is wrong or disrespectful for a religious festival; clothes that read as a status (a "special" mascot meaning something happened); an older saved copy of `js/mascot.js` answering without the clothes (he is then plain, as today).

## Design references that apply

- **Duolingo:** "decorative rewards without a kitchen job" is in its What to avoid column. This is decoration: the case for it is morale, not a task.
- **Headspace:** calm, short, one name for each thing. A costume must not add words, prompts or movement.
- **Flighty:** no distracting movement; nothing presented as live status.
- Linear, Things 3, Airbnb and Todoist do not apply: no task, list, entry or navigation changes.

## Measured (Preview, stand-in fonts, `tests/lib.js` fake Firebase, synthetic staff, Christmas Day 14:00)

Taps for the main task on every page: unchanged (no control added). Lines visible on a 390 px phone: unchanged. Every measured rectangle (the welcome heading, the date line, Your day, the finished card, the notebook header, the mascot's own box) is identical to today at 390, 1280 and 1920 px: only the pixels inside his box change.
