# April Fools on Home: the three designs (round 2)

17 November 2026. Round 1 said Build smaller, 5 of 5 (see `brief.md`). The three designs below all follow the round 1 cuts, listed first. Play them in `preview/index.html` (open it in a browser; it needs no server). Frames: `evidence/A-collapse-390.png`, `evidence/B-takeover-390.png`, `evidence/C-possessed-390.png`; today's Home: `evidence/0-home-today-390.png`.

## What every design keeps (the round 1 cuts)

1. **When.** Only 1 April, 04:00 to 11:59 Queensland (pranks end at midday), once `LK_TIME.ready()` has the corrected clock.
2. **Where and who.** A personal device only, never a shared screen. The first Home view of the person's day after their PIN, starting within 1 second of Home or not at all. The first sign-in rule's exceptions stay (unsent work, a tap waiting, the head chef on Admin), so those never see it.
3. **Not when something is really wrong.** Not offline or with reads used up (`lkServerUp()` false), not with unsent work, not with a sheet open. So "Nothing is broken" is always true.
4. **A copy, never the real page.** The joke plays on a copy of Home laid over it (inert, hidden from screen readers). The real Home underneath is never touched; ending the joke is removing the copy. The copy also hides itself after 10 seconds by its own CSS, even if the script stops.
5. **Played once, the reveal always reaches you.** "Played this year" is saved on the device when it starts. If the reveal never showed (a reload, the app closed in a panic), the next Home view that day shows only the reveal card.
6. **Skip.** Any tap or Escape skips to the reveal (C: the third tap; each tap makes it worse first). It also ends on a route change, a lock, a hidden tab or a redraw of the page.
7. **No real failure language.** No red, no fake "Not sent" band, nothing on a work page. It threatens the book, never the person.
8. **Motion.** Transform and opacity only (a still filter or text shadow is drawn once, never animated). One flash at most.
9. **Otherwise just words.** With reduced motion, Seasonal celebrations Still or Off, after 12:00, or on a shared screen, the mascot's bubble says "April Fools, Ann. Nothing is broken today." and nothing else happens.
10. **Cost.** No reads, writes, rules or listeners. One lazy file loaded on 1 April only, never in the saved shell. One click test that fakes 1 April runs on every pull request, so a later change to Home cannot silently break it.

**The reveal, the same for all three.** The copy fades and the real Home shows. A paper card with the mascot: "April Fools, Ann!" in Caveat, then "A joke for 1 April. Nothing is broken." and "Your prep list, orders and recipes are all safe." in 18 px Barlow, then "On 1 April people in Australia play tricks on each other until midday. From the head chef." and one 48 px button, **Back to my day** (charcoal, white words). Escape, a tap outside or 15 seconds also close it. For the rest of the day his bubble can say "Got you, Ann."

## A · Collapse: the page physically falls apart

Central idea: the real Home's own pieces break like objects. Nothing new appears until the dark.

1. 0.5 s: his welcome scrambles into "hello ann." in a typewriter face; the mascot shakes and turns an odd colour.
2. 1.0 s: the clock on the date line and on Your day runs backwards fast; the date scrambles to "no day · no time".
3. 1.7 s: the screen cracks like a phone glass, with a small jolt.
4. 2.2 s: every card swings off its pin and falls into a pile at the bottom; the top bar's buttons and the tab bar's tabs drop off.
5. 4.0 s: the screen fades to dark over 0.7 s. In the dark it types: "ann." / "what did you press?" / "the book is gone."
6. 7.4 s: the words collapse, the dark lifts, every piece flies back to its place.
7. 8.0 s: the reveal.

Skip: any tap. Untouched it lasts about 8 seconds to the reveal.

## B · Takeover: a new screen replaces the book

Central idea: the book is switched off and a hacker terminal takes over the whole screen. The real Home is only seen at the start and the end; its section names and coworkers are read into the fake log.

1. 0.35 s: the page tears sideways twice.
2. 0.8 s: the screen switches off like an old telly: it squashes to a white line, then a dot, then black.
3. 1.45 s: a green terminal prints line by line: "KB-OS 4.01 LEICHHARDT KITCHEN", "remote session OPEN", "user: ANN", "access HEAD CHEF", "rm -rf /kitchen/recipes", then "larder.rcp gone", "grill.rcp gone", "sauce.rcp gone" (the sections from Prep by section), "encrypting prep list [##########] 100%", "blaming Sam done", "telling Bo it was Ann done" (the coworkers from On with you), "sending prep list to the internet done".
4. 4.5 s: "HELLO ANN." in large letters, then "you have 3 seconds to call the head chef." and a countdown 3, 2, 1.
5. About 7 s: "FATAL ERROR 0x0401". The code scrambles to "04/01", then "1 APRIL" in orange.
6. 8.3 s: the telly switches back on to the real Home.
7. 8.9 s: the reveal.

Skip: any tap. About 9 seconds to the reveal. A long name wraps; the countdown is cut short, the reveal still comes on time.

## C · Possessed: the page stays, but turns on you, and touching it makes it worse

Central idea: nothing falls or switches off. Every word on Home is quietly corrupted in place, the page goes psychedelic, and the person's own taps drive it.

1. 0.25 s: a magenta and cyan colour split on every word; the page jitters slightly.
2. 0.5 to 2.6 s, one by one, letters scramble into new words: "I see you, Ann.", "Doomsday 1 April · 13:13", "Your doom", "Your sentence: Pants", "Your breakdown: Never", "A chef has seen what you did", "Onto you", everyone on with you is "Ann", "View today's full scream", "Prep by sedation: 6 of 0 done, no one left", "Coming for you", "Cook as written. The head chef is watching." The tab bar becomes Regrets, Perp, Disorders, Wasted, Trespass, Screaming. The chef hat says "nnA".
3. 1.5 s: a small black label above the tab bar: "don't touch anything."
4. 2.3 s: strips of the page tear sideways every 0.65 s. 2.5 s: the mascot breaks loose, grows and lurches round the screen.
5. 3.1 s: the headings and tab names melt downwards; a slow colour wheel swirls over the page.
6. First tap, or 4.4 s: the card under the finger jumps away and the whole screen inverts once (0.5 s).
7. Second tap, or 6.0 s: the page turns upside down.
8. Third tap, or 7.6 s: it turns the right way up, then the reveal.

Skip: three taps (each one makes it worse first). About 8 seconds untouched.

## How they differ

| | A Collapse | B Takeover | C Possessed |
| --- | --- | --- | --- |
| What breaks | The layout: pieces crack and fall | The whole screen is replaced by another one | The words and colours, in place |
| Real Home pieces used | Every card, top bar button, tab, the mascot, the clocks | Section and coworker names, read into a fake log | Every label, the section, coworkers, tabs, the mascot |
| Order | Crack, fall, dark, typed words, rebuild | Tear, telly off, log, HELLO and countdown, 0x0401 to 1 APRIL, telly on | Words turn, tears, melting, colour wheel, flash, upside down, right way up |
| Interaction | Watch; any tap skips | Watch; any tap skips | Taps drive it: each one escalates; the third ends it |
| The name | "hello ann." in his bubble, typed again in the dark | "user: ANN", "HELLO ANN.", "telling Bo it was Ann" | "I see you, Ann.", everyone on with you is Ann, "nnA" |
| The clue that it is a joke | None until the reveal | 0x0401 turns into 1 APRIL | The puns (Pants, Disorders, Prep by sedation) |

## Measurements (Preview)

Preview: `preview/index.html` at 390 x 844, a frozen copy of Home from the click-test stand-in (commit `4eca7f4`, Ann, Lunch on Pans, Sam and Bo), the book's own fonts, headless Chromium. Not the implemented app: the real build adds the gate, the saved "played" record, the hooks that end it, and the click test.

| | A | B | C |
| --- | --- | --- | --- |
| Seconds to the reveal, untouched | about 8.0 | about 8.9 | about 8.1 |
| Taps to end it early | 1 | 1 | 3 |
| Taps to close the reveal | 1 (or Escape, a tap outside, 15 s) | 1 | 1 |
| Taps for the main job on Home on 1 April (see your section, open Prep) | 0 and 1 after the reveal; at most 2 extra, once a year | same | at most 4 extra, once a year |
| Lines on a 390 px phone after the reveal | unchanged | unchanged | unchanged |
| Main thread busy, CPU slowed 4 times, over 9 s including loading the copy | 370 ms a second | 141 ms a second | 602 ms a second |
| Flashes | none: the dark fades over 0.7 s | one switch to black (0.44 s) and back (0.42 s), 7 s apart | one full-screen inversion (0.5 s) |
| Colours that are not the book's | crack lines white on black; the dark | terminal green (#8CFFB4) on black; orange "1 APRIL" | magenta and cyan split; a hue wheel; one inversion |
| Real Home after | untouched (checked) | untouched (checked) | untouched (checked) |
| Script errors, sideways scroll | none, none | none, none (also with a 37-letter name) | none, none |
| Focus after the reveal | Back to my day | Back to my day | Back to my day |
| Reads, writes, rules, listeners | none | none | none |

Not evidenced in the preview: the gate (date, time, device, `lkServerUp()`), the saved record and reload recovery, ending on a route change, lock or redraw, the real mascot canvas copy, 768 and 1280 px, a real slow phone, screen reader behaviour, rendered contrast of the terminal and split text.
