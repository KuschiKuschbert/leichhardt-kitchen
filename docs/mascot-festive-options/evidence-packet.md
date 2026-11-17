# Evidence packet: the mascot in festive clothes

For every council reviewer, both rounds. Source commit `4eca7f4` (main, 17 Nov 2026). Screens are Preview: the real book in the click-test browser with the Firebase stand-in (`tests/lib.js`), synthetic staff (Ann, Sam, Bo), stand-in fonts, 2 x pixels, Christmas Day 2026 at 14:00 Queensland. The dressed art was swapped in by folder only; the book's own `js/mascot.js` drew it.

## Current contracts (excerpts)

**The mascot** (`docs/kitchen-mascot.md`)
- Home, What it does: each named person has a shuffled set of 11 actions, one a kitchen day. On the first Home view it plays once (2.5 to 3.9 s), then rests on the Welcome pose. A tap replays today's action and never draws a new one. Since 17 Nov 2026 he says the welcome: the named heading ("Welcome, Ann", or the celebration wish "Merry Christmas, Ann") is drawn as his speech bubble and he stands on its left, 48 x 64 px on a phone, 72 x 96 px from 768 px. When he cannot stand there (his file or art fails, an older saved copy of his file, no room) the heading is the plain welcome.
- Under a finished prep list: a still beside "Every line ticked. 6 of 6.", 48 x 64 px under 900 px; from 900 px his drawn size, 192 x 256 px. Serve plays once on the phone whose tick finished the list. Not a control.
- On a wide screen a finished section's own tab says "Sauce is done." with him under his words as a still, 48 to 96 px.
- Decisions: the rest pose is always Welcome, so a status-like pose (Serve, Ready to cook) is never held beside the board. "The council would have kept Serve, Ready to cook, Look around and Recipe reading off Home as status-like poses. The owner kept all 11."
- Contract: art is 11 sprite sheets (4 x 2 frames of 192 x 256 px) and 11 stills, 3.6 MB, fetched with `?v=1`, never in the saved shell. `js/mascot.js` is lazy (`?v=3`, `LK_MASCOT.api` 1). No reads, writes or listener. Motion is one pass, never a loop; a hidden tab or scrolling out of view ends the play on the Welcome pose; reduced motion never plays by itself and loads no sprite sheet. Missing art: Home is unchanged.
- Cost: about 14 KB of script once per device; per person per day one still (about 45 KB) and one sprite sheet (250 to 330 KB).

**Celebrations** (`docs/seasonal-celebrations.md`, `docs/seasonal-calendar.md`, `docs/celebration-options/brief.md`)
- The kitchen calendar picks one celebration for every device from confirmed dates; nobody picks one (head chef, 4 Nov 2026). 39 designs. Off and Still are per device in Settings. Off restores the original branding.
- Home holds the ambience, behind the page, never over a word or a button. Work pages keep Kitchen Book and the chef hat, with a 44 px stamp beside the name and a still festive edge under the top bar.
- Motion arrives, then settles: a 4 s arrival on the first Home view of the kitchen day, then at most 4 slow pieces. Only transform and opacity move.
- Quiet days stay quiet: the reflective and civic designs (Nyepi, Buddha Jayanti, Philippine Independence Day) have drawing and stamp only, no motifs, no arrival, no edge.
- The personalised welcome uses the celebration for its wish; quiet days keep ordinary welcomes; Mother's Day and Father's Day use general warm wording "without assuming parenthood". No staff profile, religion or nationality is inferred or saved.
- Cultural care: the stamps had a cultural-symbol review (4 Nov 2026; five redrawn). Recorded notes include "avoid flickering flames or playful sacred imagery" (Buddha Jayanti) and "No burning figure or flashing fireworks" (Dussehra). PIN, name and device-choice screens suppress celebration effects.

**Colour and surfaces** (`docs/surface-colours.md`, `docs/colour-coding.md`): art and celebrations are named exceptions to the surface and operational colour rules. Colour must never establish status, access or food safety; status is said in words. Green on the finished card means done.

**Service rules** (head chef, 5 Nov 2026): the main job of each work page is one tap from its tab; no new tab, bar button or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; a change that adds taps or takes away lines says why.

## The council method (read these sections in full)

`.claude/skills/service-council/SKILL.md`: "Current design contracts", "Design references" and "Try to break it".

## Screens and art (absolute paths under `/home/user/leichhardt-kitchen/docs/mascot-festive-options/evidence/`)

| File | What it shows |
| --- | --- |
| `0-today-xmas-home-390.png` | Today: Christmas Day Home on a phone, he wears his usual bandana |
| `0-today-xmas-done-390.png` | Today: a finished prep list on Christmas Day, phone |
| `0-today-xmas-home-1280-zoom.png` | Today: his 72 x 96 px box on a laptop, close up |
| `A-hats-board.png` | Eight hats on his Welcome pose, at drawn size, 72 x 96 and 48 x 64 px |
| `A-frames-santa.png` | The Santa hat over every frame of Walk, At the smoker, Serve and Flip |
| `C-bandana-board.png` | Eight festival bandanas, same three sizes |
| `B-outfits-board.png` | Hat and bandana together; cultural festivals with bandana only |
| `B-dressup-strip.png` | A dress-up play: the hat drops on, the bandana turns red as it lands |
| `C-diwali-home-390.png` | Diwali Home on a phone with a marigold bandana only |

## Measurements (Preview)

| | Today | Dressed (every variant tried) |
| --- | --- | --- |
| Taps for any main task | unchanged | unchanged, no control added |
| Lines on a 390 px phone | unchanged | unchanged |
| Home rectangles, 390 px (heading, date, Your day, mascot) | 76,88,278,40 / 76,131,298,23 / 16,351,358,201 / 16,91,48,64 | identical |
| Home rectangles, 1280 px | heading 152,128,367,57; mascot 68,118,72,96 | identical |
| Finished list, 390 px (card, mascot) | 33,241,324,114 / 33,266,48,64 | identical |
| Finished list, 1920 px | mascot 410,431,192,256 | identical |
| Browser errors | 0 | 0 |

Not measured: contrast of a hat against the kraft Home background in dark mode, reading distance on the 21 to 24 inch section screens, real devices, the live site.
