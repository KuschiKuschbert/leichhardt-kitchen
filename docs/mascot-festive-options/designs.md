# Three designs: the mascot in festive clothes

Round 2 of the service council. Preview only: no app code changed. Source commit `4eca7f4`. Screens: the real book in the click-test browser with the Firebase stand-in, synthetic staff, stand-in fonts, 2 x pixels, Christmas Day 2026 at 14:00 Queensland (Diwali shown on the same day with the calendar's test hook). The dressed art was swapped in by folder; the book's own `js/mascot.js` drew it, played it and rested it. All files in `evidence/`.

This is decoration, so the designs cannot differ by task flow on a work page. They differ in **what he wears**, **where he wears it**, **which celebrations get it** and **whether the festival changes his daily play**. Every design: no new control, no words, no read, write, rule or listener; nothing moves on any page; Off on the device and the quiet days (Nyepi, Buddha Jayanti, Philippine Independence Day) leave him in his work clothes; reduced motion shows the clothes on the still and plays nothing by itself; the clothes are the same all kitchen day, whatever the list or the person's work is doing.

## A. A hat on his star, everywhere, on the Australian and fun days

**Central idea: one festive hat, worn all day wherever he stands, only where a hat is how people celebrate.**

- **What:** a pixel hat drawn over the top point of his star in every frame and still. Bandana and apron unchanged.
- **Which days:** the 16 Australian and fun days. Santa hat for Christmas Eve, Christmas Day and Boxing Day; a party cone for New Year's Eve and New Year's Day; heart band for Valentine's; green top hat for St Patrick's; bunny ears for Easter; flower crown for Mother's Day; fascinator for Melbourne Cup; witch hat for Halloween; toque for Chefs Day; [Father's Day and Coffee Day: to come]. None for Star Wars Day (a film's trademark) or World Food Day. Cultural and religious festivals: his work clothes, as today.
- **Where:** Home (his speech bubble), under a finished prep list and on a finished section's tab. One look on every screen that day.
- **Daily play:** unchanged. Today's shuffled action plays in the hat.
- **Screens:** `A-xmas-home-390.png`, `A-xmas-home-1280.png` (close up `A-xmas-home-1280-zoom.png`), `A-xmas-done-390.png`, `A-xmas-done-1920.png`, `A-hats-board.png`, `A-frames-santa.png`.

## B. A dress-up day on Home

**Central idea: Home is where the celebration lives, so that is where he dresses up, and he shows it with a play of its own.**

- **What:** the festival's hat and its colours on his bandana (`B-outfits-board.png`). Cultural and religious festivals get the bandana colours only, no hat.
- **Which days:** every celebratory occasion, 37 days a year (the 16 Australian and fun days with hat and colours, the 21 festival days with colours).
- **Where:** Home only. Under a finished prep list and on a finished section's tab he keeps his work clothes, the way work pages keep Kitchen Book (`B-xmas-done-390.png`).
- **Daily play:** on the first Home view of a celebration day, a dress-up play takes the place of today's action: the hat drops onto his star from the top edge, the bandana turns as it lands, and he waves (`B-dressup-strip.png`, 8 frames, about 2.7 s). Today's shuffled action is kept for the next ordinary day. A tap replays the dress-up.
- **Screens:** `B-xmas-home-390.png`, `B-xmas-home-1280.png` (close up `B-xmas-home-1280-zoom.png`), `B-xmas-done-390.png`, `B-diwali-home-390.png`, `B-outfits-board.png`, `B-dressup-strip.png`.

## C. Festival colours on his bandana, every celebration, everywhere

**Central idea: the smallest change that still covers every festival: his own bandana in the day's colours, no costume.**

- **What:** his bandana and its knot in two colours taken from the festival's own drawing (`C-bandana-board.png`). No hats.
- **Which days:** every celebratory occasion, 37 days a year.
- **Where:** Home, under a finished prep list and on a finished section's tab.
- **Daily play:** unchanged.
- **Measured weakness:** at 48 x 64 px on a phone the bandana is a thin band. Christmas red reads; Diwali marigold barely shows against his yellow star (`C-diwali-home-390.png`).
- **Screens:** `C-xmas-home-390.png`, `C-xmas-home-1280-zoom.png`, `C-diwali-home-390.png`, `C-bandana-board.png`.

## How they differ

| | A | B | C |
| --- | --- | --- | --- |
| What he wears | A hat | Hat and bandana colours | Bandana colours |
| Which days | 16 Australian and fun | 37 (21 with colours only) | 37 |
| Where | Home, finished list, finished section | Home only | Home, finished list, finished section |
| Daily play | Unchanged | A dress-up play replaces it on the day | Unchanged |
| Says which festival at 48 px | Yes, by the hat's shape | On hat days | Only by colour, weakly |

## The same task in each (the head chef's question: "Is he dressed today?")

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps for any main task | unchanged | unchanged | unchanged | unchanged |
| Lines on a 390 px phone | unchanged | unchanged | unchanged | unchanged |
| Navigation levels | 0 | 0 | 0 | 0 |
| Measured rectangles that moved (Home 390 and 1280, finished list 390 and 1920) | none | none | none | none |
| New reads, rules, listeners | none | none | none | none |
| Art per occasion | none | one pixel hat (about 0.5 KB of code) | hat and two colours, plus one dress-up clip drawn in code | two colours (about 30 bytes) |
| Build size | | 1 pull request | 1 to 2 (the dress-up play and its bag rule) | 1 pull request |
| Relearning | none | none | none | none |
| Risk | | a hat misplaced in a frame; a work page shows a festive touch | the dress-up replaces an action; plain on work pages may read as "he changed back" | too subtle to notice on a phone |

## Prototype checks (Preview)

- **The hat follows him.** The top of his star, its tilt and his size were measured from the art in all 99 pictures (88 frames, 11 stills). The smoker pose is smaller and further left; the hat scales with it (`A-frames-santa.png`).
- **The frame's top edge.** The art leaves 22 to 34 px above his star. Across all 99 pictures the worst cut is 3.7 px of 256 (the party cone, bunny ears and toque in Serve and Build frames), 1.6 px for the Santa and witch hats, none for the fascinator and flower crown. Under 1 px at 48 x 64 and 72 x 96 px; visible only at 192 x 256 px. Repair: move that hat down by the cut in those frames.
- **The bandana** is found in every frame by its colour above the eye line and in the knot beside it; the face screen, apron stripes and outline are left alone (checked by eye on the boards; not measured pixel by pixel).
- **Not exercised in the preview:** midnight from Boxing Day to an ordinary day with Home or a finished list open, Off switched on with Home open, an older saved copy of `js/mascot.js`, reduced motion, the dress-up play's effect on the shuffled set, dark mode, the section screens at 1.5 m.
