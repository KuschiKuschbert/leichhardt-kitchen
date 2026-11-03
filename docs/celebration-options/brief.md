# Seasonal celebration redesign proposals

Requested 3 November 2026, the day celebrations went live. **Not chosen yet.** The head chef asked for an audit of the holiday feature and two redesigns each for the icons, effects, animation and behaviour, with a recommendation. The interactive page with mockups is `index.html` in this folder; the screens in `previews/` come from the real book with the Firebase stand-in.

Read `docs/seasonal-celebrations.md` and `docs/seasonal-calendar.md` first. Several picks below change decisions approved on 3 November 2026; they are marked under "Head chef's calls".

## Fix first, separate from the redesign

The glow animation is heavy. `css/seasonal-brand.css` defines an opacity-only `kb-preview-glow`, but `css/seasonal-effects.css` loads after it and redefines the same keyframes with an animated `filter: drop-shadow()`, so the heavy one wins. Measured in the click-test browser with the CPU slowed 4 times:

| Celebration and page | Main thread per second | Moving pieces |
| --- | --- | --- |
| Off, Prep | 8 ms | 0 |
| Christmas, Prep | 12 ms | 10 |
| Diwali, Prep | 469 ms | 7 |
| Diwali, Prep, glow paused | 13 ms | 6 |
| Diwali, Home | 769 ms | 12 |
| Halloween, Prep | 373 ms | 6 |
| Eid al-Fitr, Prep | 368 ms | 6 |

80 of the 204 designs use it (glow and steam), and 12 automatic days in the next year, first Diwali on Sunday 8 November 2026, then Christmas Eve. The fix keeps the glow to opacity and adds a check to `tests/seasonal.test.js` that no celebration animation moves `filter`; that check fails on the current code. It ships as its own pull request.

## Audit

**Icons.** At the 32 px top bar size, Navaratri's crossed dandiya and the Mother's Day ribbon read as a red cross, and Holi's pichkari reads as a syringe. Ten more marks lose their shape (Melbourne Cup, Easter, Ganesh Chaturthi, Durga Puja, Galungan, Kuningan, Sinulog, Pahiyas, Kadayawan, World Food Day). Lookalikes: three mugs, two "1" calendars, two crescents; Easter and Chefs Day look like the chef hat. Every record carries a 240 × 160 `scene` drawing that the book never shows.

**Effects.** The Home layer (`#kb-festive-effects`, fixed, z-index 9000) sits above the page: horses cross the docket names and Open buttons, horseshoes and garlands sit on the heading and date. On tablets and laptops, top bar motifs show through the transparent nav pills and the bell. Diwali, Tihar, Lunar New Year and Eid share generic stars and dots; Tihar's marigold strings draw as beige beads.

**Animation.** Home runs 23 to 42 endless animations for as long as it is open, including all shift on the shared tablet. Every start parses all 204 designs and 1,224 sentences (about 70 ms with the CPU slowed 4 times) to show one; with the Devanagari fonts the feature adds 1.2 MB to the saved copy, 345 kB compressed.

**Behaviour.** The chef hat (`.wtop-who`, the person menu and mail count) is replaced by the festival drawing. The celebration name replaces Kitchen Book on every work page; with Caveat loaded, Melbourne Cup Day and "Lunar New Year, Philippines" wrap and grow the phone header from 64 to 81 px. Only 45 of the next 365 days have a celebration and nothing shows what is coming. A manual choice stays until changed, also on a shared tablet. Choose a celebration lists names only, eight at a time.

## The two designs per area

| Area | A | B | Recommendation |
| --- | --- | --- | --- |
| Icons | Sharper drawings: keep one drawing per celebration, redraw the 13 failures, test at 24, 32 and 44 px | Docket stamps: a paper disc with one monoline glyph and one orange accent on a 24 px grid, like the Home docket icons, wherever the mark is small; drawings stay at Home size | **B**, plus A's Navaratri, Mother's Day and Holi redraws |
| Effects | Behind the words: the effects layer moves under the page, anchored ornaments hang from the top bar edge, festival-specific motifs, bar motifs never behind pills | Edges and board: no floating motifs; the scene drawing animates inside the Home board; a 12 px festive edge under the work top bar | **A on Home, B's edge on work pages** |
| Animation | Arrive, then settle: a 4 s arrival the first time Home opens each kitchen day and on Replay, then at most 4 slow loops; work pages still after the tuck-in | Always on, lighter: continuous loops, at most 8 pieces on Home and 4 in the bar, 12 to 24 s periods | **A** |
| Behaviour | Home holds it: work pages show nothing but the optional edge | A stamp beside the name: Kitchen Book and the chef hat return; a 44 px stamp beside the name opens the existing explanation; on wider screens it joins the small line above Kitchen Book | **B** |

Both effects designs and both animation designs move only `transform` and `opacity`, and add a click test that fails above 20 ms of main-thread work per second for each main festival on Home and Prep with the CPU slowed 4 times.

Both behaviour designs also: keep the chef hat; show Coming up on Home for the next 7 days from the offline calendar; count days in long windows ("Tihar · day 3 of 5"); keep the 71 reflective and civic designs still; make a Settings choice a preview until the 04:00 refresh unless kept; show stamps and the next five dates in Choose a celebration.

## Stays the same

Automatic and the source-backed calendar, the six languages cycling with no picker, all 204 designs choosable, Still, Subtle, Full, Replay and Off per device, reduced motion and hidden-tab pause, no Firebase reads or writes, plain PIN and device-choice screens, offline from the saved copy.

## Head chef's calls

1. Give Kitchen Book back to work pages, with the celebration as a stamp beside it (changes the approved chalk title).
2. Stamps at small sizes; the approved drawings stay on Home.
3. Motion settles after a 4 second arrival instead of looping all day on Home.
4. A chosen celebration lasts until 04:00 unless kept (changes "stays until changed").
5. Who may change celebrations on the shared tablet: anyone, as now, or the head chef and sous chefs only.

## Build steps (recommended set)

One pull request each, with click tests at 390, 768 and 1280 px:

1. The glow fix and the `filter` check. Before 8 November 2026.
2. The chef hat stays; Home motifs move behind the dockets; top bar motifs keep out of the pills.
3. Arrive, then settle, with the motion budget check for the 36 main festivals.
4. Stamps for the main set and the three redraws.
5. Work top bar: Kitchen Book back, the stamp beside it, the festive edge.
6. Coming up, day counts, quiet days, the 04:00 preview and Settings with stamps.
7. Keep the main set in the saved copy and load the other 168 designs only when Choose a celebration opens (a lazy module, per `docs/saved-shell-generations.md`).

The stamp glyphs in `index.html` are first drafts for choosing a direction, not final artwork. The cultural-symbol council should review the Nyepi, Galungan, Kuningan, Sinulog, Ganesh Chaturthi and Durga Puja stamps before they ship.
