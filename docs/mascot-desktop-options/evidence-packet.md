# Evidence packet: the mascot on wide screens

11 November 2026, Queensland. For the service council, both rounds. Role-based analysis, not research with staff. [Back to the brief](brief.md)

Source: `main` at 925d985. The baseline screens the reviewers saw (the live book at 1280, 1440 and 1920 px wide, stand-in data, made-up people, real fonts) are not kept in the repo: Home, a finished section on the slip, the finished list, the wall board, Orders, a section's own tab before, at and after its last tick, and the same screen set up as a shared device. `preview/capture.mjs` makes them again (design "today").

## What the owner asked

After the mascot's first two cheers went live, the owner asked: "can we enhance the mascot system, at least on desktops?" The first ask (10 November) was for the mascot to be a cheerful supporter for finished work "across the whole board", to motivate the team to get prep done and use the book more, "maybe some kind of speech bubbles". The council then said Build smaller, and what is live is small and rare by design.

## What is live now (docs/kitchen-mascot.md)

1. Home: one shuffled action a day per person, played once, then the Welcome pose. Tap replays. 64 x 85 px in the heading corner at every width (48 x 64 when words reach it).
2. Under a finished prep list: a card where the page says the list is ticked off, "Every line ticked. 9 of 9.", the mascot 64 x 85 px from 900 px wide (48 x 64 below). Serve plays once on the phone that finished the list, once a day. A state: nothing while a line is left or not sent.
3. On the slip, when a tick finishes a section of 2 or more lines and the server has the tick: one line of words, "Pans are done. Grill has 1 left." No art. Once a day per section per device. Silent when the All list, a section's tab and Home would count differently.

## What the earlier council decided (docs/mascot-cheer-options/brief.md, ideas.md)

- Round 1: Build smaller, 5 of 5. Round 2: B (he waits at the edges) first for 5 of 6; C (heads on the progress bars) last for all 6.
- Rejected, with reasons that were about a phone during service: a head on the slip beside Undo (art over the list, art acting as a status), heads on bars (a second status system, movement on every tick), a Home note that repeats Your day, a host on an empty list (a cached read also looks empty).
- Rules every idea follows: only real, confirmed work; say what was finished and what is next; never the clock or speed; the section and the kitchen, not the person; rare beats constant; never in the way (no pop-up, nothing over a list line, no moved tap target, no sound); two moods only (resting and pleased); quiet zones (cooling, temperatures, recipe methods, PIN screens, failures, Not sent); a way out.
- Still open ideas: Thanks from Chef, started and finished, the pack down card, every line ordered, the Top tickers strip (ranks people by ticks; the head chef's call).

## The wide screen, measured (the live book)

| Measure | 1280 x 900 | 1440 x 900 | 1920 x 1080 |
| --- | --- | --- | --- |
| The page (max 1240 px, centred) | x 20 to 1260 | x 100 to 1340 | x 340 to 1580 |
| Empty gutter each side of the page | 20 px | 100 px | 340 px |
| Top bar height | 132 px | 132 px | 132 px |
| Prep: the two-page book | 1056 px wide (list page 605, Handy 426) | same | same, 816 px tall |
| Prep: section tabs | a column right of the book, 136 px wide, 342 px tall with 5 tabs | same | same; about 470 px of empty column under it |
| Prep, finished list: empty list page under the card | about 430 px | about 430 px | about 610 px |
| The mascot | 64 x 85 px | 64 x 85 px | 64 x 85 px |
| The slip | a box 544 x 60 px, centred at the foot, over the foot of the book | same | same |
| Home: empty page under the cards | about 220 px | about 220 px | about 400 px |
| A section's own tab after its last tick | | | about 600 px of empty list page; the cheer is one line of 16 px words in a slip at the foot  |

The art is 11 actions, each a sprite sheet of 8 frames at 192 x 256 px and a still. At 64 x 85 he is drawn at one third size. Whole-number scales that stay crisp: 96 x 128 (half), 192 x 256 (full).

**The owner's answer, 11 November 2026:** "i believe the 5 screens in the kitchen we use are 21 to 24 inch wide screens, they are in every section, all the staff is using them for the work." So the wide screen is not an office computer. It is each cook's main work screen, one in every section, for the whole shift. Phones are the second screen.

Still not known: their resolution (a 21 to 24 inch screen is commonly 1920 x 1080, so that size is measured above and is the one to design for first), whether they are touch screens, whether they are set up as shared devices (then a tick asks Who did this? and the screen locks when idle, `docs/device-sessions.md`), and which page each one keeps open (its section's own tab, the All list or the wall board). A cook stands at arm's length to about a metre and a half from it, with wet or gloved hands.

## The contracts that apply

CLAUDE.md ("Service council", "Service rules", "Screens" under Coding rules), .claude/skills/service-council/SKILL.md ("The service rules", "Current design contracts", "Design references", "Try to break it", "Round 1"), docs/kitchen-mascot.md, docs/mascot-cheer-options/brief.md and ideas.md. For look and colour: docs/design-patterns.md (search "Finished-list card", "Slip sentence"), docs/surface-colours.md ("Selected design"), docs/loading-motion.md ("Behaviour"). Do not read js/prep.js (1.2 MB) unless a claim needs it; search, then read the part.

## What round 1 decided (given to round 2)

Verdict: **Build smaller, 5 of 5** (cook, head chef, skeptic, new starter, keeper).

What all five said:
- The gap is real but it is a reading gap. On a section's screen the finish is one line of 16 px words on the slip for up to 9 seconds, once a day per section. The mascot's card never shows on a section's own tab (`finOk()` in js/prep.js needs the All list and no wall board), so a screen kept on its section's tab shows the mascot on Prep 0 times a day.
- Worth drawing: the finished states made larger, in the page, where the page is empty anyway (direction 1), and it must include a finished section on its own tab or it misses the screen a section has. Words grow first; he is never bigger than his words.
- Not worth drawing: a wall board host (5 of 5: the board already says it, and no screen is known to show it) and more moments (5 of 5: each is its own council, and width is not what they wait on).
- A mascot who stands beside the book all shift: no from 4 of 5. The head chef reviewer asked for it once as a comparison and expected it to rank last. The skeptic offered a contrast worth drawing: he appears beside the book only at a true finish and is gone otherwise.
- A bigger mascot on Home: cut by the head chef, skeptic and keeper reviewers; the cook allowed it only if no Home card moves (it does not fit the heading row: about 119 px between the top bar and the cards, he needs 128).

Rules round 1 set for any design (each from at least one reviewer, none contradicted):
1. A state, worked out on every draw from lines the screen holds, with the list's state ok and nothing waiting to be sent. Never from a cached, empty or refused read. No timing of its own.
2. Nothing shows, moves or plays on a work page while a line is left on the view in front of the cook (cook, head chef, skeptic, new starter). No resting face, loop, blink or idle.
3. The section's sentence stays on the slip at every width, word for word. One sentence, one home, one set of rules.
4. Same truth rule as the slip sentence: 2 lines or more; All, the section's tab and Home count the same; names it does not say; `secLines()` and `secNext()`, not a second count.
5. No rectangle that exists today moves. Decide by measured free room, not by width alone: a zoomed or short screen gets a smaller size or today's book. Nothing changes under 900 px.
6. What is left ("Grill has 2 left.") reads at least as large as what is done ("Pans are done."). On a section's tab the header still says the whole list's count ("2 of 9 done").
7. Not a control on a work page: no tap action, no hover or pressed look, never under the section tabs or beside Undo.
8. At most one play per finish per kitchen day per device, on a guard that survives the shared screen's 10 minute lock (`lk.said.day` is cleared at a lock; `lk.fin.day` is not). Never hold Serve.
9. Words never wait for the art or `js/mascot.js`. With no art or reduced motion the words stand alone.
10. No read, listener, write, rules line, setting, sound, top bar or tab button. No art in the saved shell.
11. Quiet zones stay quiet: the PIN and lock screens, Who are you?, the Who did this? sheet, Not sent, No signal, failures, cooling, temperatures, recipe methods.
12. A placement must be opened by a click test at the width it exists (1920 px is in no test file today; the widest is 1440).

Leading break-it findings carried from round 1:
- A scene hung on the page's "Nothing left to do in Pans." sentence alone would cheer a one-line section or a tick the server does not have (read in code, js/prep.js line 5474). A build needs its own gate.
- A lasting sentence can go stale: "Grill has 2 left." after Grill is finished, or a pleased mascot after a line is added (risk). It must follow the list on every draw or say less.
- A shared screen locks after 10 minutes without a touch, so a lasting scene is seen for at most 10 minutes after the last touch and the play is not repeated after the next PIN (read in code). Not to be repaired by showing him on the lock screen.
- A 1920 x 1080 screen at 150% zoom is 1280 x 720 to the book (risk): the gutter is 20 px and the page is shorter.
- A layer fixed outside the page (a gutter mascot) may stay sharp beside the dimmed page while Who did this? is up, or beside the PIN screen (risk, not exercised).
- A big picture read before small words: "Pans are done" read from 1.5 m as "prep is done" while Grill has lines left (risk).
- The Top tickers strip names and ranks a person above a cheer worded for the section (seen in every Prep picture). Open since 10 November; the head chef's call, not part of these designs.

Not known, asked of the owner by every reviewer: which page each of the five screens keeps open (its section's tab, the All list or the wall board), shared or personal set-up, touch or mouse, resolution, zoom and text size, how many lines and sections a normal day has, and how often a section or the whole list is finished.

## Round 2 evidence

- [The designs](designs.md): three designs and a mix, the same task walked through each, a differences table, a costs table and what was measured.
- Seven picture sheets in `evidence/` (the real book, stand-in data, made-up people, real fonts), each four labelled frames: a section finished on its own tab; the whole list finished; a section finished on the All list; B following the list; B on smaller and zoomed screens; Home and the resident, drawn apart; a shared kitchen screen.
- The preview's own source: `preview/candidate.css`, `preview/candidate.js` and the walk `preview/capture.mjs`. It is a preview: a finished section is worked out from the stand-in's lines, where a build would use `secLines()` and `secNext()`.

Evidence types, kept apart: measured in the full app on stand-in data (rectangles, sizes, scroll, browser errors), read in code, and untested risk. Not evidenced anywhere: readability at 1.5 m on a real section screen, reduced motion, a screen reader, a real touch screen, the idle lock and PIN screen with a design switched on, a list of real length, and whether any of it changes how much prep is done.
