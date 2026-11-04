# Drawing studio: audit and two designs

Status: **proposal, 4 November 2026.** The head chef asked for the studio to feel less overwhelming. This record changes no app code. The head chef picks a design, then each build step ships as its own pull request.

The studio shipped on 4 November 2026 (#499, step 5 of the [recipe editor record](../recipe-editor-options/brief.md)). The comparison page is [index.html](index.html); the two working examples are [a.html](a.html) and [b.html](b.html).

## What was checked

The studio as it is on `main` (d115c14), in the test stand-in with the public Chicken Burger, head chef by PIN, at 390 x 844 (phone) and 1280 x 800 (laptop). Each state: a new drawing, after Draw it for me, Add, a picked part, the part's More, Colour, Label, Plate, Parts, Check and More. Every visible button, box and tile was counted, and overlaps were measured in the browser.

## What works and stays

- Full screen, with Close going back to the recipe and a drawing not saved kept as a draft.
- Draw it for me does most of the work: on the Chicken Burger it draws the burger and the chips, labelled, in one tap.
- Drag to move, pinch to size, Undo and Redo, and the Pass labels made from the parts.
- Every tool keeps its `data-dw` name, so drafts, commands and the click tests carry over.

## Findings

| | Where | Measured | Why it matters |
| --- | --- | --- | --- |
| S1 | Part bar, phone | 414 px of buttons in a 376 px bar. With Chips picked, Done is off the screen and Delete is cut in half. | The way out of a part is not there. |
| S2 | Dock over the drawer, phone | The floating dock covers the last 67 px of every drawer. In the part's More, Duplicate, Flip and Stretch sit under it. | Tools are there but cannot be tapped. |
| S3 | Drawer over the part, phone | With More, Colour or Label open, 60% of the picked part is under the drawer. The part's bar floats on the plate above it. | You cannot see what you are changing. |
| S4 | The same note everywhere | After Draw it for me, one 55 px note ("Drawn by the book: side by side...") heads Add, Plate, Parts, More, Colour and Label. | Every panel starts with something already read. |
| S5 | A new drawing | Five ways to start at once: Draw it for me, Start from a copy, 7 ingredient chips, an 842 drawing library (fish fillets first on the burger, on a laptop) and Import a drawing (SVG). The drawer is 2,157 px tall on a phone, 1,808 px on a laptop. 25 controls on the phone's first screen, 31 on a laptop. | The one button that does the job competes with four others. |
| S6 | Plate | 7 drop-downs (kind, piece, shape, size, rim, finish, colour), a tick box and Save this servingware. No picture of a plate. | The common job, "a bowl, not a plate", takes reading. |
| S7 | Words that look like links | The part's More (10 actions) and More tools (12) are underlined words, unlike the dock and the part bar. | Two looks for buttons in one screen. |
| S8 | Two Dones | The drawer's Done takes a 64 px row of its own; the part bar has another Done. | Two ways to finish, one of them a whole row. |
| S9 | One name, three times | On a laptop the part bar says "Burger bun ... Label: Burger bun", and the part's More is headed BURGER BUN. | Words repeated, nothing added. |
| S10 | Zoom | "- Fit +" as three small underlined words in the corner. Pinch and the mouse wheel already zoom. | Three controls for something the hands already do. |
| S11 | Top bar, phone | The title shows "On the..." and "Chicken B...". "Not saved yet. Kept on this device." adds a second line. | The bar is busy and says little. |

Controls on screen today: phone, new drawing 25, a part picked 18 (one off screen), the part's More 28, Colour 28; laptop 31, 19, 30, 32.

Screens: [new drawing, phone](previews/now-new-phone.png), [new drawing, laptop](previews/now-new-laptop.png), [a part picked, phone](previews/now-part-picked-phone.png), [the part's More, phone](previews/now-part-more-phone.png).

## Fixes both designs share

1. **The part's buttons fit a phone.** Icons with one word each: Colour, Label, More, Delete, Done. Swap moves into Label ("Swap for another drawing") and the part's More.
2. **Nothing sits on the food.** On a phone a panel sits under the canvas and the plate shrinks to stay whole above it. No bar floats over a panel.
3. **Draw it for me speaks once.** Its note shows at the top of the canvas with Undo and Try another, and goes as soon as you do anything else.
4. **One way to close a panel:** the round close button in its heading, Escape, or a tap on the plate. No Done row.
5. **Plate is pictures.** Dinner plate, side plate, pasta bowl, board, slate and the rest as tiles. Size, rim, finish and colour sit behind one button, with Fit the food and Save this servingware.
6. **Add starts with the recipe.** "In this recipe, not on the plate yet" first, then Find a drawing. Copy the book's drawing and Import a drawing (SVG) sit at the bottom under Other ways to start.
7. **Buttons look like buttons.** The part's More and More tools become tiles with an icon and a word, in groups: Arrange, Change, Keep; Draw it for me, Draw by hand, Pick and place, Keep and reuse.
8. **Fit only.** One Fit button. Zoom stays on pinch, the mouse wheel and the + and - keys.
9. **A one-line top bar:** Close, the recipe's name, Undo, Redo, Save. Save says Saved when nothing is waiting.

## The two designs

### A. Three steps

Under the top bar: **1 Plate, 2 Food, 3 Check**, and More at the end. Each step has a small tray under the canvas (phone) or beside it (computer) with only that step's tools.

- **Plate:** a row of servingware pictures, and Size, rim, finish and colour.
- **Food:** on a new drawing, Draw it for me leads, then the recipe's ingredients as chips and Find a drawing in the library. Once drawn: what is not on the plate yet, and Add something else.
- **Check:** what is missing or has no label, each with its fix, and Save the drawing.
- A picked part gets a dark bar just above it: Colour, Label, More, Delete, Done.
- Plate and Food tick green when done; Check shows a red count.

Controls on a phone: new drawing 14, after Draw it for me 13, a part picked 15, the part's More 24.

### B. Quiet canvas (recommended)

No tabs. The plate fills the screen. **One dark bar at the thumb shows only what you can do now.**

- An empty plate: a big **Draw it for me** in the middle of the plate. The bar: Add food, Plate, Check, More.
- Once drawn: the bar stays Add food, Plate, Check (with a count when something needs a look), More.
- A part picked: the bar becomes that part's: **Colour, Label, More, Delete, Done**, with its name and "Drag to move" above it. Its buttons are always in the same place, never over the food.
- Panels open from the bar: under the canvas on a phone, on the right on a computer. The plate shrinks to stay in view.

Controls on a phone: new drawing 10, after Draw it for me 12, a part picked 10, the part's More 21.

Screens: A [new drawing](previews/a-new-phone.png), [a part picked](previews/a-picked-phone.png), [Plate](previews/a-plate-phone.png), [laptop](previews/a-drawn-laptop.png). B [new drawing](previews/b-new-phone.png), [a part picked](previews/b-picked-phone.png), [the part's More](previews/b-pmore-phone.png), [laptop](previews/b-drawn-laptop.png), [Plate on a laptop](previews/b-plate-laptop.png).

## Side by side

| | Today | A. Three steps | B. Quiet canvas |
| --- | --- | --- | --- |
| Controls on a phone, new drawing | 25 | 14 | 10 |
| ... a part picked | 18, Done off screen | 15 | 10 |
| ... the part's More open | 28, three under the dock | 24 | 21 |
| Where the part's buttons are | Floating over the plate, too wide | Floating just above the part, fits | In the bar at the thumb, never over the food |
| Plate | 7 drop-downs | Pictures in the Plate step | Pictures in the Plate panel |
| A panel open on a phone | Covers 60% of the part | Tray under the canvas | Panel under the canvas |
| New to learn | | Three steps | The bar changes with what you pick |
| Extra row on screen | | The steps row (60 px) | None |
| Main risk | | The steps add a row, and Food and Add both list ingredients | The bar's buttons change between "nothing picked" and "a part picked" |

## Recommendation

**B, Quiet canvas.** It has the fewest controls in every state, nothing ever covers the food, and the part's buttons are always in the same place at the thumb, like the book's own tab bar. It keeps the full-screen studio chosen on 3 November and needs no new row. A suits someone drawing for the first time who wants a path; the head chef already knows the order.

The shared fixes help either way and can ship first.

## Every capability stays

| Today | A | B |
| --- | --- | --- |
| Draw it for me, Draw again | Food tray; More, Draw again | Big button on the empty plate; More, Draw again |
| Try another layout, Tidy up, Plating style | The note's Try another; More | The note's Try another; More |
| Label everything (side and build drawings) | More, Draw it for me group | More, Draw it for me group |
| Add: the library, search, kinds | Food, Add something else | Add food |
| In this recipe, not on the plate yet | Food tray chips | Top of Add food |
| Start from a copy, Import a drawing (SVG) | Add, Other ways to start | Add food, Other ways to start |
| Plate: kind, piece, shape, size, rim, finish, colour; Fit the food; Save this servingware | Plate step, pictures, then Size, rim, finish and colour | Plate panel, pictures, then Size, rim, finish and colour |
| Parts list | More, Pick and place | More, Pick and place |
| Check | Check step | Check, with its count |
| Text, Line, Arrow, Box, Oval | More, Draw by hand | More, Draw by hand |
| Pick several, Snap to centre | More, Pick and place | More, Pick and place |
| Save as a template, Use for another recipe | More, Keep and reuse | More, Keep and reuse |
| The part: Swap | Label, Swap for another drawing; the part's More | Same |
| The part: Colour, Label, Delete, Done | The bar above the part | The bar at the thumb |
| The part: To the front, Forward, Backward, To the back, Duplicate, Flip, Stretch, Split into pieces, Change it, Save as a library piece | The part's More, as tiles | The part's More, as tiles |
| Undo, Redo, Save, Close | Top bar | Top bar |
| -, Fit, + | Fit; pinch, wheel, + and - keys | Same |
| Escape closes a panel, then lets go of the part | Same | Same |

## Steps after the choice

1. Shared fixes 1, 4, 8 and 9: the part's bar fits a phone, one way to close, Fit only, a one-line top bar.
2. Shared fixes 2 and 3: panels under the canvas, never on it; the note once.
3. Shared fixes 5 and 6: Plate as pictures; Add starts with the recipe.
4. Shared fix 7: tiles for More tools and the part's More.
5. The chosen layout: B's bar at the thumb (the dock becomes the bar, the part's bar moves into it, Draw it for me on the empty plate), or A's steps.

Each step is its own pull request in `js/draw.js` and `css/app.css`, keeps every `data-dw` name, and adds its checks to `tests/draw.test.js` (sizes at 390, 768 and 1280 px, nothing off screen, nothing over the picked part).

## How the design pages were checked

Both examples at 390 x 844 and 1280 x 800 in Chromium, every state from the address (`#new`, `#drawn`, `#picked`, `#pmore`, `#plate`, `#check`, `#more`, `#add`): no page errors and no sideways scroll. Controls were counted the same way as the audit. The audit and the examples use the test stand-in's synthetic data and the book's public drawings.

## Files

- `brief.md`: this record.
- `index.html`: the comparison page, with both studios to try on a phone or a computer.
- `a.html`, `b.html`, `studio.js`, `studio.css`, `art.js`: the two example studios. Example only: nothing is read from or written to the book.
- `previews/`: the screens above.
