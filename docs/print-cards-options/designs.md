# Print recipe cards: round 2 designs

Owner, 19 Nov 2026, after round 1: "the feature should only be available for headchef, admin and sous chef". So printing is a chef tool. The gate is the same one Manage Recipes uses (`LK_PREP.bookState() === 'yes'`). Recipes are public, so this is about who sees the tool, not a security lock. Chefs always have the head chef's changes loaded, which removes round 1's signed-out stale-copy risk. The owner did not choose between the full and the smaller scope, so these designs show both: A is the smaller scope, B and C the full ask.

Files: [flows.html](flows.html) (the three ways to choose, at 390 px), [sheets.html](sheets.html) (`?layout=a|b|c&paper=a4p|a4l|a5p|a5l&ids=...|all`), [print-engine.js](print-engine.js), [print.css](print.css), [capture.cjs](capture.cjs), [page-counts.json](page-counts.json), screenshots in [shots/](shots/). Synthetic preview from `js/data.js` and `js/art.js` at `086c033`; the book's own shell is drawn as plain bars.

## Common to all three (from round 1)

- Every page repeats: card number, name, page x of y, the allergens (with "may" and Not complete), "Printed <date time>. Base amounts. Check the book for the latest."
- Base amounts always, never the scaled ones. `[Qty]` and `[square brackets]` print as **[To come]** in bold italics, never blank.
- Each card starts on a new page. A list never breaks through a row or a step; a list that continues says "(continued)". A method section of 4 steps or fewer moves whole.
- **Fit before splitting**: a card just over one page takes slightly smaller type (92 %, then 85 % on A4 only; never below about 8.5 pt on A4, 7.9 pt on A5), and splits only if that fails.
- Monochrome-safe: meaning is in words (Safety:, To come, may), not colour. Plate drawings keep their colours; numbered pins become a numbered plate key.
- No reads, writes, rules or listeners. Lazy file, not the shell. One shared print helper pulled out of the function printer.

## Measured: pages for all 137 cards (Preview, real Chromium PDFs)

The PDF page count equalled the engine's sheet count in all 12 runs, and no region clipped text.

| Layout | Paper | 1 page | 2 pages | 3 pages | Ingredients split | Total pages |
| --- | --- | --- | --- | --- | --- | --- |
| A screen order | A4 portrait | 129 | 8 | 0 | 0 | 145 |
| | A4 landscape | 135 | 2 | 0 | 0 | 139 |
| | A5 portrait | 101 | 33 | 3 | 10 | 176 |
| | A5 landscape | 118 | 19 | 0 | 2 | 156 |
| B paper card | A4 portrait | 136 | 1 | 0 | 0 | 138 |
| | A4 landscape | **137** | 0 | 0 | 0 | 137 |
| | A5 portrait | 109 | 26 | 2 | 8 | 167 |
| | A5 landscape | 123 | 14 | 0 | 0 | 151 |
| C station card | A4 portrait | 133 | 4 | 0 | 3 | 141 |
| | A4 landscape | 135 | 2 | 0 | 1 | 139 |
| | A5 portrait | 117 | 20 | 0 | 18 | 157 |
| | A5 landscape | 121 | 16 | 0 | 12 | 153 |

## The three designs

| | A. Print from the card | B. Print list in Manage Recipes | C. Card packs in the chef panel |
| --- | --- | --- | --- |
| Central idea | Print the card you are looking at | A tick list over every card, with quick picks | Ready packs for the usual jobs |
| Entry | Print chip on the recipe card trail line (chefs only) | Print cards button at the top of Manage Recipes | Print cards tile in the Head chef / Sous chef panel |
| Choosing | This card, or with the recipes it uses | Tick any cards; quick pick a menu section, Batch 54, All 137 | Specials, a menu section, Batch, Every card, or Pick cards |
| Paper | 4 picture tiles in the sheet | 4 picture tiles in the bottom bar | Remembered on the device, Change to pick |
| Before Print | "2 pages. Base amounts, not x3." | "Print 5 cards, 5 pages", then the first page shown | "Print 5 cards, 6 pages" |
| Card layout | A: screen order, one column (two on landscape) | B: side column drawing, plate key, boxes; wide column ingredients and method | C: big ingredients and drawing on top, method small below |
| Scope | Smaller (council round 1) | Full ask | Full ask |

Structural differences: entry point (service page vs Manage vs chef panel), selection model (single card vs free tick list vs presets), paper control (always shown vs always shown vs remembered), and the card layout.

## Taps (Preview, counted from the flows, before the system print dialog)

| Task | A | B | C |
| --- | --- | --- | --- |
| Print the card you have open, A4 | **2** | 6 (chef hat, Manage, Print cards, search, tick, Print) | 7 |
| Print the 5 specials, A5 | 15 (one by one, 3 each) | **6** | 7 (5 when A5 is remembered) |
| Print all 137 | not possible | 5 | 5 |
| Find a recipe (cook) | 0 added | 0 added | 0 added |
| Lines on a 390 px service page | Chefs: one more chip on the trail line (wrap Not evidenced); cooks: none | none | none |

## Size

| | A | B | C |
| --- | --- | --- | --- |
| Pull requests | 2 (shared print helper; card print) | 2 to 3 | 2 to 3 |
| New reads, rules | none | none | none |
| Relearning | none | a mode in Manage | a new tile and sheet |
| Risk | lowest | tick list state in Manage (unsaved recipe drafts there) | presets go out of date with the menu (read from `menuOrder`, so they follow it) |
