# AI drawing in the studio: round 2 designs A, B and C

Read with `packet.md` (the evidence) in this folder. Every round 2 scorer gets this same file.

- **Previews.** Built in the click-test stand-in, in the real studio and app shell (commit `496878c9`), signed in as the head chef. The new pieces are put in by a script and show no live behaviour. The AI plates are Claude's real bake-off plates, cut from `docs/ai-drawing-options/bakeoff/blind.html`.
- **Labels.** Each picture is labelled "Preview, design X, width". Each design has five states: 1 ask, 2 wait, 3 done, 4 failed, 5 used up.
- **The dish.** Butchers Board, a board Claude won in the blind pick, where it also left off the maple butter (the one loud line).
- **Files.** `previews/<design><state>-<width>.png`:
  - all fifteen states at 390 x 844: `previews/all-states-390.png`
  - the done states at 768 x 1024, 1280 x 800 (mouse) and 1920 x 1080 (touch), with `B1-ask` at the same widths: `previews/done-wide.png` shows 1280 and 1920 together
- **Not shown.** The section screen at 768 px except where named, the motion of the wait, and anything a still cannot show. Those are Not evidenced.

## The design frame (UX and interaction designer, 26 Nov 2026)

The designs below are drawn from this frame. It is the designer's own words.

1. **Must stay visible (390 px).** The whole plate, uncovered; the recipe name; Save with its state word; the thumb bar; on an empty plate, Draw it for me. Today's note overlaps the canvas, and longer words grow it (the clock miss).
2. **Loudness.** Guest-visible food left off the plate (Claude 7 dishes, the book 1): the allergen lens reads Pass labels made from parts. It exists today as the Check count: is a badge loud enough here? Count and money stay quiet, and so does used up, because Draw it for me is free. A failed call: red words that stay, no band.
3. **Devices.**
   - Phone: panels under the canvas, never on the food.
   - Tablet: the same flow, centred modals.
   - Section screen: drawing there is Not evidenced; on The Pass, Claude's plate reads like the book's, untagged.
   - Laptop: both plates full size, nothing hover-only.
4. **Placements.** Studio pieces need no OK; a "ready" notice on Home, work pages or a ping does.
   - **Ask:** beside Draw it for me (one tap; a second name, against round 1); in the book's note (one name; the book draws first); a More tile (quiet, missable).
   - **Wait:** in the note, canvas usable (a late answer offered, not applied); a modal for 9 to 23 s (safe, but the chef is stuck).
   - **Result:**
     - Swap in place: full size, but compared from memory.
     - Side by side: 180 px phone plates hide the 64% overlap (pairs-1).
     - Own page reviewing many: a new route.
     - The note goes on the next action, and an offered answer must stay: unresolved.
   - **Count, money:** on the ask (usually nothing); once asked or low; admin panel (unseen when asking).
   - **Failure, used up:** in the note, plate untouched; the ask turns off and says why.
   - **Marker:** data only, named in the "Kept the older plate" slip, never on the card. It departs from Keep until redraw: the head chef's call.
   - **Path:** a Cloud Function keeps the studio wait. Actions or nightly remove it: a slot line ("ready tomorrow") blocks a second ask and shows failure. Nightly is about US$0.03 a plate.
5. **Fiftieth use.** Cold taps (about 10 s, US$0.19) on plates the book drew fine. Claude scored worse on 47 of 81, which means fixing overlaps by phone. Boards: neither, 3 of 4.

Not evidenced: weekly volume; pans, side views, builds.

## Design A: "Claude's version" in the book's note

**Central idea.** One name stays. Draw it for me always draws first and at once. The note it leaves gains one more button, Claude's version. Claude's plate swaps onto the canvas, and the chef keeps it or goes back.

- **Path:** a Cloud Function (seconds).
- **Main task, a plate from Claude:**
  1. Open the drawing slot.
  2. Draw it for me (1 tap).
  3. Claude's version in the note (1). The note says "Claude is drawing Butchers Board. About 10 s. Keep working: it waits for you", with Cancel. The canvas stays usable.
  4. When it lands, Claude's plate is on the canvas and the note says "Claude's plate for Butchers Board. 13 of 20 left today."
  5. The amber line names food left off, with Add it.
  6. Keep Claude's (1), then Save (1).

  That is 4 taps, against 2 today.
- **A late answer.** If the chef has moved a part while waiting, the answer is offered in the note ("Claude's plate is ready: Show it"), never applied over the edits.
- **Failed:** red words in the note that stay; the book's plate untouched; Try again.
- **Used up:** Claude's version is off and the note says "all 20 used today. Back tomorrow".
- **Count:** only while waiting or done.
- **Previews:** `A1-ask` to `A5-used`.

| | A |
| --- | --- |
| Taps for a Claude plate | 4 (today's rules plate: 2) |
| Plate on the 390 px opening screen | Whole, under the note. The note grows with the amber line and covers the top of the canvas (A3) |
| Navigation levels | 0 (the studio as it is) |
| New pieces | 1 note button, note states |
| Build size | About 5 pull requests: the Cloud Function with its limits, off switch and access check; the security header; the studio note; the autodraw marker; tests |
| Relearning | Little: one new button where Try another is |
| New reads, rules | About 6 reads and 3 writes per ask in server code (round 1 keeper); a usage counter document |
| Needs from the head chef | Blaze, a new `connect-src`, reversing 21 Oct and 15 Nov, the marker |
| Cost a plate | About US$0.19 cold (the usual case); less with a trimmed prompt (Not evidenced) |
| Risk | The note grows over the plate (the clock miss). Comparing from memory: Back to the book's swaps the plates, never both at once. A late answer over edits (break-it 3) |

## Design B: two buttons on the empty plate, Claude's plate in the panel

**Central idea.** Compare, do not remember. The empty plate offers Draw it for me and Draw it with Claude.

- **The ask.** Draw it with Claude draws the book's plate on the canvas at once, as the starting point. It opens the studio's existing panel (under the canvas on a phone, at the side from 900 px) where Claude's plate arrives. Both plates are on screen together, like the blind bake-off.
- **Path:** a Cloud Function (seconds).
- **Main task, a plate from Claude:**
  1. Open the drawing slot.
  2. Draw it with Claude (1). The panel says "Drawing. About 10 s" with Cancel; the book's plate stays on the canvas until the chef chooses.
  3. Claude's plate appears in the panel, with the amber line for food left off.
  4. Use Claude's plate (1), then Save (1).

  That is 3 taps.
- **Failed:** red words in the panel that stay, the book's plate on the canvas.
- **Used up:** Draw it with Claude is off, and the hero says "All 20 Claude plates used today. Back tomorrow. The book draws it at once."
- **Count:** on the ask ("13 of 20 left today").
- **Previews:** `B1-ask` to `B5-used`.

| | B |
| --- | --- |
| Taps for a Claude plate | 3 (today's rules plate: 2) |
| Plate on the 390 px opening screen | The book's plate shrinks to about 270 px tall above the panel. Claude's plate is full width in the panel (B3) |
| Navigation levels | 0 (the studio's own panel) |
| New pieces | 1 hero button, a panel |
| Build size | About 5 pull requests, the same server work as A |
| Relearning | A second button with a second name on the empty plate: round 1's Headspace and Linear concern |
| New reads, rules | As A |
| Needs from the head chef | As A |
| Cost a plate | As A |
| Risk | Two names. On a 1920 x 1080 screen the panel shows Claude's plate at about 200 px against a full-height book plate (`done-wide.png`). The chef must decide before tapping which drawer to ask, or pay for both |

## Design C: ask for tonight, pick tomorrow

**Central idea.** No wait and no server. Claude draws overnight in the 03:00 job, with the cache warm (about US$0.03 a plate). The chef asks from the studio's More tools, and picks the next day on a review page, with the plates side by side, as in the bake-off.

- **Path:** the nightly job (`nightly-learning.yml`). No Blaze, no security header change. The ask is a request saved through `W()`, so the rules already decide who may ask.
- **Main task, a plate from Claude:**
  1. Open the drawing slot, Draw it for me (1).
  2. More (1), Ask Claude tonight (1). The note says "Asked Claude for tonight. Ready tomorrow in Recipes & drawings, Claude's plates", with Cancel the ask.
  3. Save the book's plate for today (1).
  4. Next day: Recipes & drawings, Claude's plates (about 2). Keep Claude's (1).

  That is about 7 taps over two days. Several dishes can be asked for and kept in one sitting.
- **The review page** (`#/manage/claude`, a new route) lists each dish with the book's and Claude's plates side by side, the amber line, and Keep Claude's or Keep the book's. Nothing changes on a card until one is kept.
- **Failed:** the page says "Claude could not draw it last night: the answer was cut off. The book's plate is still the one on the card", with Ask again tonight.
- **Used up:** a nightly cap, for example 30 plates: "Tonight's 30 Claude plates are asked for. Ask again tomorrow."
- **No ready notice** on Home, work pages or as a ping: the page is found where the chef already manages recipes.
- **Previews:** `C1-ask` to `C5-used`.

| | C |
| --- | --- |
| Taps for a Claude plate | About 7 over two days; then 1 a dish on the review page |
| Plate on the 390 px opening screen | Today's studio unchanged. On the review page both plates are about 150 px wide each on a phone (C3), wider at 1280 and 1920 |
| Navigation levels | 1 (a new page under Recipes & drawings) |
| New pieces | 1 More tile, 1 note line, a new page |
| Build size | About 4 pull requests: the request and its rules; the nightly step; the review page; the autodraw marker; tests |
| Relearning | A new page to find. Asking is a quiet tile |
| New reads, rules | A request write per ask; the nightly job's reads; the review page reads the waiting results once when opened |
| Needs from the head chef | Reversing 21 Oct and 15 Nov, the marker. No Blaze, no header change |
| Cost a plate | About US$0.03 (measured warm) |
| Risk | A day's wait. A recipe changed after the ask makes the night's plate stale (needs the card's signature checked before it is offered). The tile is easy to miss. Plates are small side by side on a phone |

## How they differ

| | A | B | C |
| --- | --- | --- | --- |
| When Claude answers | Seconds | Seconds | Tomorrow |
| Where the call runs | A Cloud Function | A Cloud Function | The nightly job |
| Where you ask | The book's note, after it draws | The empty plate, before anything draws | More tools |
| How you compare | One at a time on the canvas | Side by side, canvas and panel | Side by side on a review page |
| Names | One (Draw it for me, with Claude's version inside it) | Two buttons | One, with a tile |
| Navigation | None new | None new | A new page |
| Cost a plate | About US$0.19 cold | About US$0.19 cold | About US$0.03 |

## The same in all three

- **Option 1 only.** Plated dishes only.
- **Boards (open).** The previews offer Claude on a board (Butchers Board, which Claude won). As first written, this line said the head chef picked neither on 3 of 4 boards. That was wrong: of the 8 boards and platters, Claude won 5 and neither won 3 (corrected after scoring; the frame's own words above are kept as written). Scorers: say whether boards are offered at all, or offered with a word of warning.
- **The one loud thing.** The amber line names guest-visible food left off the plate, with Add it. Check's own "in the recipe but not on the plate" words, said where the eye is.
- **The marker.** A kept Claude plate carries a marker that autodraw skips. It is named in the existing "Kept the older plate drawing" slip and never shown on the card. This is a departure from Keep until redraw, for the head chef.
- **Limits.** The day's or night's count, and a total stop, enforced where the call runs.
- **Pass labels** are made from the parts as today, so the allergen lens keeps working.

## The blend (lead's combined proposal after scoring, 26 Nov 2026)

**Review status: a lead synthesis.** Built from the seven scorers' take and reject lists; focused follow-up from the UX scorer, the keeper and the screen designer recorded in the brief. Previews: `previews/M1-ask-390.png` to `M6-stale-390.png`, with `M3-list` and `M4-ready` at 768, 1280 and 1920; all on one sheet: `previews/blend.png`.

**Central idea.** A's flow on C's path. The chef asks Claude from the book's own note, in one name. Claude draws overnight in its own nightly job. Next day, the chef finds the dish under a "Claude's plates" chip in Recipes & drawings, and sees Claude's plate full size on the canvas, where hand fixes happen. Save keeps whichever plate is on screen.

- **Ask** (A, all seven): Ask Claude tonight in the book's note, after Draw it for me has drawn. No second Draw button (all seven put B last).
- **Path** (C): a request saved through `W()`, so the rules decide who may ask (head chef and sous chefs). A nightly step in its own job, with its own time limit, after the analysis. A slow or failed night never stops the Records count (keeper, skeptic). About US$0.03 a plate warm. No Blaze, no security header change, no access code outside the rules.
- **Asked** (M2): on reopening the drawing, a quiet line in the note: "Asked Claude to draw this tonight. Its plate shows here tomorrow, and in Recipes & drawings under Claude's plates", with Cancel the ask.
- **Ready** (M3): a chip "Claude's plates · 3" in the existing chip row of Recipes & drawings, second in the row and only while plates are ready. It filters the list, and each row says "Claude's plate ready, drawn last night". No new page, and no notice on Home, the work pages or a ping, so no OK is needed under service rule 2.
- **Compare and keep** (M4, A and the new starter):
  - Opening the drawing shows Claude's plate full size on the canvas.
  - The note says "Claude's plate, drawn last night. Save keeps the plate on screen", with Show the book's (a swap, equal weight).
  - There is no separate Keep. Save is the one commit, so the Pass labels come out as today.
- **The loud line** (all): food left off that a guest sees, in the amber attention line, with Add it and Leave it off as 44 px links (screen designer).
- **Failed** (M5): red words in the note (`--bad-on-dark`), the book's plate stays, Ask again tonight.
- **Stale** (M6): the recipe changed after Claude drew it (the card's signature is checked), so its plate is not shown, with Ask again tonight.
- **No new marker.** A kept Claude plate is saved as not book-made (no `layout.auto`). `redrawFrom()` then never redraws it (`js/smart.js`, read in source only: the `!x.layout.auto` return), so there is no departure from Keep until redraw. A failing-first case in `tests/autodraw.test.js` comes with the build.
- **Boards:** offered.
- **Stage 0, optional:** the bake-off's 81 answers, kept on the owner's Mac (`scripts/ai-bakeoff/results/`, not in the repo), could fill the chip at no new cost. That needs the files brought over, and each recipe's signature checked against 26 Nov.

| | Blend |
| --- | --- |
| Taps for a Claude plate | Day 1: Draw it for me (1), Ask Claude tonight (1), Save the book's for now (1). Day 2: Recipes & drawings (about 1 to 2), the chip (1), the dish (1), Save (1). About 7 to 8 over two days; 2 to 3 for each further dish (Preview) |
| Plate on the 390 px opening screen | Full size on the canvas under the note (M4). The book's note on this dish is long already (M1, M2) |
| Navigation levels | 0 new (a chip in an existing page) |
| New pieces | 1 note button, note lines, 1 chip, 1 row line |
| Build size | About 4 pull requests: the request and its rules; the nightly step in its own job; the note, chip and row line; tests (rules emulator, autodraw, stale, a node test with a stand-in API) |
| New reads, rules | A request write per ask. Reading the ready list for the chip: Not evidenced, the keeper's follow-up. A new rule for the requests (publish rules before the code) |
| Needs from the head chef | Reversing 21 Oct and 15 Nov; the request rules; the key as an Actions secret; extending the save slip to name food left off (a proposed change). No Blaze, no header change |
| Cost a plate | About US$0.03 |
| Risk | A day's wait. The chip is new to find. A Save is not blocked by the amber line: the cook wanted Keep to wait for Add it or Leave it off, recorded as a disagreement |
