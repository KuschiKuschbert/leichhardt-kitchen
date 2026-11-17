# Designs: the mascot in festive clothes, and a Christmas countdown

Preview only: no app code changed. Source commit `4eca7f4`. Screens: the real book in the click-test browser with the Firebase stand-in, synthetic staff, stand-in fonts, 2 x pixels (the wide shots halved), Christmas Day 2026 at 14:00 Queensland (Diwali shown on the same day with the calendar's test hook), and Tuesday 1 December 2026 at 14:00 for the countdown. The dressed art was swapped in by folder; the book's own `js/mascot.js` drew, played and rested it. All files are in `evidence/`.

## Round 1 sketches, before the cut

Round 1 saw three wider sketches: A a hat on every pose everywhere, B a dress-up day on Home (a drop-on play, hat and festival bandana colours), C festival colours on his bandana for every celebration (`B-outfits-board.png`, `B-dressup-strip.png`, `C-bandana-board.png`, `C-xmas-home-390.png`, `C-diwali-home-390.png`). All five reviewers cut the bandana and the drop-on play ([brief](brief.md#round-1-should-he-be-dressed-build-smaller-5-of-5)). The designs below stay inside that cut: worn from the first frame, never animated on, no recolouring.

## Round 2: three designs inside the cut

Every design: no new control, no words, no read, write, rule or listener; nothing moves on any page; Off on the device and the quiet days (Nyepi, Buddha Jayanti, Philippine Independence Day) leave him in his work clothes; reduced motion and Still show the piece on the still; the piece is the same all kitchen day whatever the list or the person is doing; the welcome's own rule decides the day (clock ready, celebrations On, a celebratory day). This is decoration, so the designs differ in **what he wears, which days, where, and on which frames**, not in a task flow.

### A. A hat on every pose, wherever he stands, on the Australian and fun days

**Central idea: a festive hat is how Australians dress up for these days, so he wears one all day, on every screen.**

- **Days (11, corrected after round 2; first written as 16):** Santa hat for Christmas Eve, Christmas Day and Boxing Day; party cone for New Year's Eve and New Year's Day; [heart band for Valentine's: not drawn yet]; green top hat for St Patrick's; bunny ears for Easter; flower crown for Mother's Day; fascinator for Melbourne Cup; witch hat for Halloween; [Father's Day: to come]. None for Chefs Day (a toque reads as the chef hat, as the stamp did), Coffee Day, World Food Day or Star Wars Day (a film's trademark). Cultural and religious festivals: his work clothes, as today.
- **Frames:** all 88 frames and 11 stills, from measured head positions, so the hat stays on through every play.
- **Where:** Home, under a finished prep list (also at 192 x 256 px on a wide screen), and on a finished section's tab.
- **Screens:** `A-xmas-home-390.png`, `A-xmas-home-1280-zoom.png`, `A-xmas-done-390.png`, `A-xmas-done-1920.png`, `A-hats-board.png`, `A-frames-santa.png`.

### B. A hat on his rest pose, on Home only, on the same days

**Central idea: the least that still says it: Home is where the celebration lives, and he wears the hat when he stands still beside the wish.**

- **Days:** the same 11 as A.
- **Frames:** only his rest pose (the Welcome still). Today's action plays in his work clothes; when it ends he rests in the hat (`B-rest-only-strip.png`). One hat position per hat, not 99, so a redraw of the action art cannot leave a hat floating.
- **Where:** Home only. Under a finished prep list and on a finished section's tab he keeps his work clothes, as work pages keep Kitchen Book (`B-xmas-done-390.png`).
- **Screens:** at rest Home is `A-xmas-home-390.png`; `B-rest-only-strip.png`; `B-xmas-done-390.png`.

### C. One small accent at his bandana knot, for every celebration with a wish

**Central idea: every festival the book greets gets the same size of piece, taken from its own approved motifs, so nobody's festival looks smaller.**

- **Days (37):** every celebratory occasion. A flower or sprig of one size tucked in his bandana knot: holly for Christmas, marigold for Diwali and Tihar (the ambience already uses marigolds), plum blossom for Lunar New Year (as its ambience), shamrock for St Patrick's, a small pumpkin for Halloween, [frangipani for Galungan and Kuningan, and each other festival's piece: to come after the cultural-symbol review] (`C2-accents-board.png`). A festival whose piece the review does not pass gets none.
- **Frames:** all 88 frames and 11 stills; the knot is found in each from the art (`C2-frames-marigold.png`).
- **Where:** Home, under a finished prep list and on a finished section's tab.
- **Measured:** at 48 x 64 px on a phone the accent is about 11 px across: a dot of colour beside his face. The holly reads as red and green; the marigold as an orange flower (`C2-xmas-home-390.png`, `C2-diwali-home-390.png`).
- **Screens:** `C2-xmas-home-390.png`, `C2-diwali-home-390.png`, `C2-xmas-done-390.png`, `C2-accents-board.png`, `C2-frames-marigold.png`.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| What he wears | A hat that says the day | The same hat | A small knot accent, equal for all |
| Which days | 11 Australian and fun | 11 Australian and fun | 37, every celebration with a wish, after review |
| Frames | All 99 | The rest pose only | All 99 |
| Where | Home, finished list, finished section | Home only | Home, finished list, finished section |
| Says which day at 48 px | Yes, by its shape (Santa, witch, top hat, cone) | Yes, at rest | Mostly by colour |

### The same check in each

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps for any main task | | unchanged | unchanged | unchanged |
| Lines on a 390 px phone | | unchanged | unchanged | unchanged |
| Navigation levels | 0 | 0 | 0 | 0 |
| Measured rectangles that moved (Home 390 and 1280, finished list 390 and 1920) | | none | none | none |
| Reads, rules, listeners | none | none | none | none |
| Art and code | | 99 head positions, about 1 KB; about 0.5 KB per hat | about 0.5 KB per hat, one position each | 99 knot positions, about 1 KB; about 0.3 KB per accent |
| Build size | | 1 pull request | 1 pull request, smaller | 1 pull request, then one per batch of reviewed accents |
| Cultural review | none needed beyond the hats | none | each festival's accent |
| Main risk | a hat misplaced in one frame; a festive piece beside "Every line ticked" | the hat appears as the play ends, which can read as a change of clothes | too small to notice; a festival without a passed accent is left out |

## Prototype checks (Preview)

- **Hats follow him.** The top of his star, its tilt and his size were measured from the art in all 99 pictures. The smoker pose is smaller and further left; the hat scales with it (`A-frames-santa.png`).
- **The frame's top edge.** The worst cut is 3.7 px of 256 (party cone, bunny ears in some Serve and Build frames), 1.6 px for the Santa and witch hats, none for the fascinator and flower crown: under 1 px at 48 x 64 and 72 x 96 px. Repair: move the hat down by the cut in those frames.
- **The knot** is found in every frame as the navy pixels right of the eyes, at and above the eye line (`C2-frames-marigold.png`). Checked by eye, not pixel by pixel.
- **Not exercised in the preview:** midnight with Home or a finished list open, Off chosen with Home open, an older saved copy of `js/mascot.js`, reduced motion and Still, dark mode, the section screens at 1.5 m, real phones.

## The Christmas countdown: three places (quick check)

Asked the same day: "And add a Christmas celebration countdown?" Shown for Tuesday 1 December 2026, 24 days before Christmas Day. Each runs from 1 to 23 December (Christmas Eve has its own wish), counts in Queensland days from the book's clock, and needs no read. The words were placed by hand in the real page after it drew (Preview). Today on 1 December Home says "Welcome, Ann" and the Coming up card is hidden: it shows only the next 7 days (`K0-dec1-home-390.png`).

| | K1. He says it | K2. Coming up line | K3. On the date line |
| --- | --- | --- | --- |
| What | The welcome bubble: "24 days to Christmas, Ann" | Home's Coming up card shows "Christmas Day, in 24 days" with the Christmas stamp | "Tuesday 1 December · 14:00 · 24 days to Christmas" |
| 390 px phone | Bubble on two lines: Your day starts 29 px lower (171 to 200 px). A 40-character name stays on two lines at the long-name size (`K1-bubble-390.png`, `K1-bubble-long-390.png`) | Nothing above Your day moves; the card is at the foot of Home, below Prep by section (`K2-coming-390.png`) | Date wraps: Your day 23 px lower, and he drops 23 px below his bubble's tail (`K3-dateline-390.png`) |
| 1280 px | One line, nothing moves (`K1-bubble-1280.png`) | The card shows below Prep by section (`K2-coming-1280.png`) | One line, nothing moves (`K3-dateline-1280.png`) |
| What it replaces | The ordinary welcome words for 23 days (a shift wish such as "Enjoy your break" would keep its place, by the welcome's order) | Nothing | Nothing |
| Pattern | The approved welcome bubble (17 Nov 2026) | The approved Coming up line with stamps (3 Nov 2026), its window stretched for Christmas | A new use of the date line |
| Taps, controls | none | none | none |
