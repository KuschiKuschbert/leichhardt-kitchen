# Evidence packet: April Fools on Home

Source commit `4eca7f4` (main, 17 November 2026). Synthetic people from the click-test stand-in (`tests/fake/`): Ann signed in, Sam and Bo on with her. No real staff, PIN or kitchen data.

## Today's Home (Implemented app, 390 x 844, Ann, Lunch on Pans)

`evidence/0-home-today-390.png`. Fonts in that capture are fallbacks (the test browser blocks Google Fonts), so the welcome bubble shows a serif; the live book uses Caveat there.

From the top: the dark top bar (KB logo, cooling clock, Today's team, Pings, the chef hat with "Ann"); the mascot (48 x 64 px on a phone) saying the welcome in his speech bubble ("Afternoon, Ann"); the date line; Your day (charcoal live board: section Pans, break Not set); On with you (sage people card: Grill Sam, Fryers Bo); Prep by section (steel work card, 0 of 6 done); Coming up; the tab bar (Recipes, Prep, Orders, Wastage, Transfers, Cleaning).

## Current contracts that apply

- **Service rules** (head chef, 5 Nov 2026): main job one tap from its tab; no new pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; added taps or lost lines must be justified.
- **First sign-in of the day** (`docs/home-staff-first.md`): the first successful personal PIN of a person's day (turns at 04:00 Queensland) opens Home. These keep their page instead: unsent or unfinished work, a tap waiting on a shared screen, a Functions-only account, the head chef unlocking on Admin, a new starter's first PIN on Prep. Later PINs that day go back to the person's last page (`lk.prep.last.<person>`).
- **The mascot** (`docs/kitchen-mascot.md`): lazy `js/mascot.js`, Home only, a shuffled daily action per person, plays once then rests on the Welcome pose. He says the named welcome in a speech bubble (the page heading `#rtitle`, still the focus target and read by a screen reader). Art is never in the saved shell. Reduced motion never plays automatically.
- **Seasonal celebrations** (`docs/seasonal-celebrations.md`): one celebration for everyone from the calendar, On/Off and Still per device in Settings. Home arrival plays about 4 seconds on the first Home view of the kitchen day, then rests. Motion moves only transform and opacity (a filter or box-shadow animation on Home cost 769 ms per second on Diwali with a 4x slower CPU; `tests/seasonal.test.js` fails on it). PIN, name and device-choice screens suppress celebration effects. No reads.
- **Loading and motion** (`docs/loading-motion.md`): reduced motion removes entrances and tracing; motion never implies completion or moves a live target.
- **Action feedback** (`docs/action-feedback.md`): a failure is red, stays and keeps the work; confirmation in words. A fake failure screen borrows these meanings for a few seconds.
- **Colours** (`docs/surface-colours.md`): steel for work, sage for people, charcoal for live boards, warm paper for reading. Red means errors and destructive actions; green confirms success.
- **Writing style** (`CLAUDE.md`): Australian English, no em dashes, plain short sentences, 24-hour time.
- **Reads** (`CLAUDE.md`, coding rules): free plan stops at 50,000 reads a day; no reads in a loop; no new listeners or polling.
- **Saved shell**: startup files are in `SHELL` (`sw.js`) and both `js/upkeep.js` lists; lazy files are in none and need the network the first time.
- **Accessibility**: WCAG 2.2 AA; 2.3.1 Three Flashes or Below Threshold; 2.2.2 Pause, Stop, Hide for motion over 5 seconds.

## Measurements

Taps for the main job on Home (see your section and break; open Prep): 0 and 1 today. With the prank, the first Home view of 1 April adds at most one tap (skip) or about 10 seconds of waiting, once a year per person. Every later view, and every other day, is unchanged. Lines on a 390 px phone: unchanged once the prank ends.
