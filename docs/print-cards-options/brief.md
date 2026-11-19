# Print recipe cards: options

Asked by the owner, 19 Nov 2026: a way for cooks who still want paper recipe cards to print them. A print dialog asking all cards or chosen ones, paper A4 or A5, portrait or landscape. One card fits one page where it can; when it cannot, the paper copy must not lose its context.

Evidence packet: [packet.md](packet.md) (source commit `086c033`). Role-based analysis, not research with real staff.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** No reviewer said Don't build; none backed the full scope as asked.

| Reviewer | Verdict | Main point |
| --- | --- | --- |
| Cook mid-service | Build smaller | A card taped up must read at arm's length: name, yield, ingredients and allergens large; method can be small. Four sizes and "all cards" is back-office work. |
| Head chef | Build smaller | The real problem is stale paper: the Drive PDF cards drift from changes made in the book. Make the book the only source of printed cards. |
| Skeptic | Build smaller | Browser print of a recipe page half works already; the gap is a clean one-card layout. "All cards" is a nice-to-have. |
| New starter | Build smaller | Print belongs on the card being read. "Portrait / landscape" needs a small picture. Allergens must not sit only on a page that can be separated. |
| Keeper | Build smaller | No reads. Make it lazy (`js/recipe-print.js`), not shell. Pull one shared print helper out of the function printer first; iOS largely ignores `@page size`. |

**What to cut (majority):** "all cards" and a multi-card picker in the first release (4 of 5; the cook and the keeper would add it later, by section). A5 and landscape: 3 of 5 say A4 portrait first; the keeper and new starter would allow A5 portrait. Disagreement: the keeper would ship A4 and A5 portrait together.

**Where it goes:** on the recipe page's trail line, like the Keep screen on chip (4 of 5). No button on the Recipes list or the top bar, so finding a recipe stays 0 extra taps. A button on a service page still needs the head chef's OK (service rule 2), and recipes are a further exception to the 20 Oct "nothing prints" decision.

### Break-it findings (round 1, all Risk / Not evidenced)

| Scenario | Expected | Hypothesis | Impact | Smallest repair or check |
| --- | --- | --- | --- | --- |
| Stale allergen: card printed, head chef adds sesame later | Paper says it may be out of date | Paper on the wall keeps the old allergens | Guest safety | Printed date and "Check the book for the latest" in large type on every page, recipe's last change date |
| Signed-out phone prints | The latest card | Prints `js/data.js` without the head chef's changes (overlay loads only with the PIN) | Wrong quantities or allergens on paper | Mark the source on the paper, or print only once the changes are loaded |
| `[Qty]` amount on paper | "To come, ask the chef" | Untested on print | A cook guesses | Print "To come" in words, checked in the PDF test |
| Printed while scaled x3 | Base amounts | Scaled amounts print | Wrong batch | Always print base amounts and the yield, say so |
| Page 2 separated from page 1 | Each page stands alone | Allergens only on the last page | Dish looks allergen free | Name, card number, page x of y and allergens on every page |
| Function print and card print together | Each job clears only itself | Shared `afterprint` listeners clear the other | Blank or broken print | One shared print helper with one job slot |
| 137 drawings at once on a phone | Prints | Tab crash or blank pages | Wasted paper | Not in the first release |

## Owner's change after round 1 (19 Nov 2026)

"The feature should only be available for headchef, admin and sous chef." Printing becomes a chef tool behind the same gate as Manage Recipes (`LK_PREP.bookState() === 'yes'`). Recipes stay public, so this decides who sees the tool, not a security lock. Chefs always have the head chef's changes loaded, which retires round 1's signed-out stale-copy finding. The scope question (all or chosen cards, four papers) was not answered, so round 2 drew both: A is the smaller scope, B and C the full ask.

## Round 2: designs

Designs, measurements and taps: [designs.md](designs.md). Previews: [flows.html](flows.html), [sheets.html](sheets.html), [mix.html](mix.html). Screenshots in [shots/](shots/). All measurements are **Preview** (Chromium, `js/data.js` at `086c033`, Barlow fonts), not the implemented app.

- **A. Print from the card**: a Print chip on the recipe trail line, this card or with the recipes it uses; screen-order layout.
- **B. Print list in Manage Recipes**: a tick list with quick picks; paper card layout (drawing and plate key in a side column, ingredients and method wide).
- **C. Card packs in the chef panel**: ready packs, remembered paper; station layout (big ingredients on top, method small below).

### Scores (out of 10, as given)

| Reviewer | A | B | C | First choice |
| --- | --- | --- | --- | --- |
| Cook mid-service | 5 | 6 | 7 | C |
| Head chef | 7 | 8 | 5 | B |
| Skeptic | 6 | 6 | 4 | A (tied with B) |
| New starter | 6.5 | 7 | 5 | B |
| Keeper | 7.5 | 6.5 | 5 | A |
| Screen designer | 6 | 8 | 6 | B |
| **Total** | 38 | **41.5** | 32 | B (3 of 6) |

Disagreement: the cook wanted C's big ingredients; the keeper and skeptic wanted A's cheap single-card entry and to hold the tick list back. The skeptic and designer both said the card layout is a separate question from the entry, so the three designs mix two decisions.

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3: occasional job tucked away | Needs work: a chip on a service page | Works: in Manage | Works: in the chef panel |
| Airbnb: the job's context together | Needs work: Adobo runs to 2 pages | Works: 136/137 one A4 page | Needs work: ingredients split on 3 A4 cards |
| Todoist: visible, editable default | Works: paper tiles | Works: paper tiles | Needs work: paper hidden behind Change |
| Duolingo: each tap answers truthfully | Works: "Base amounts, not x3" | Needs work: hand-drawn page count disagreed with the page (reproduced) | Not evidenced |
| Headspace: one name, plain words | Works | Needs work: "Quick pick" | Needs work: "packs", a third place |
| Linear: one consistent frame | Works | Works | Needs work: fixed rows leave gaps |

### Contract fit

| Check | Result |
| --- | --- |
| Service rules | B, C and the mix add nothing for cooks. A adds a chip to a service page (needs the head chef's OK). |
| 20 Oct "nothing prints" | A further exception the head chef must choose. |
| Print contract (`docs/function-printing.md`) | Works in preview: never truncates (0 clipped regions in 16 runs, header and band included), PDF pages equal the engine's pages in all 16 runs. Failed print API, retry and restore: Not evidenced. |
| Monochrome print | Meaning in words (Contains, May contain, Safety, To come). An actual grey print: Not evidenced. |
| Contrast, keyboard focus | Not evidenced. |
| Reads, rules, listeners | None. Lazy file, not the shell. |

### Break-it findings (round 2)

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| Text under the floor: A, B and C go down to 5.9 to 6.4 pt (eyebrow, card tags, plate key numbers) | **Reproduced** (measured in all 12 runs) | Fixed in the mix: 8.6 pt minimum on A4, 7.9 pt on A5, one 92 % fit step only |
| Allergens in small footer type | **Reproduced** | Fixed in the mix: boxed bold band under the name on every page |
| "May contain Gluten, Soy" read as both "may" | **Reproduced** in the first mix | Fixed: "Contains: Soy. May contain: Gluten." |
| Button page count drawn by hand, wrong | **Reproduced** | Fixed in the mix: counts come from the engine |
| Old ticks ride along into Print this card | Risk, Not evidenced | Build rule: opening from a card starts a fresh list with that card only; a click test |
| iPhone ignores `@page` size, adds margins | Risk, Not evidenced | Save one card as PDF from iOS Safari for each paper before ready; the after-Print line says which paper to set |
| 137 cards on a phone | Checked in Chromium, 4x slowed CPU: 2.5 to 3.6 s | A phone: Not evidenced. A progress line if slow |
| Function print and card print clear each other | Checked in source: `printJob` and `body.fn-printing` are private to `js/functions.js` | Build rule: one shared print helper with one job slot, first pull request, with a click test |
| Print cards list beside unsaved recipe drafts in Manage | Risk, Not evidenced | The list keeps no recipe state; a click test with a draft open |

## The mix

**Recommend the mix: B's print list and paper card, A's one-card entry, C's remembered paper and bigger ingredients, plus a boxed allergen band.** Preview: [mix.html](mix.html), `sheets.html?layout=m`.

| Part | From | Take or reject | Why |
| --- | --- | --- | --- |
| Print list in Manage with group chips (Specials, sections, Batch, All 137) | B | Take | The owner asked for all or chosen cards; Manage is already chefs only and lazy |
| Paper card layout | B | Take | Most cards on one page |
| Print this card | A | Take, moved | Beside the existing chef-only "Change this recipe" link, not on the trail line: cooks see no change, so no service-rule exception. Opens the list with that card ticked |
| Screen-order layout | A | Reject | Most pages, smallest type |
| Remembered paper | C | Take, shown | The last paper is the picked tile; all four stay visible (the new starter rejected a hidden default) |
| Bigger ingredient type | C | Take | Reads at arm's length (cook) |
| Packs in the chef panel, station layout | C | Reject | A third place to print; splits ingredients most; dead gaps |
| First-page check | B | Take | Shown after Print with what was sent, by name |

### The mix measured (Preview)

| Paper | 1 page | 2 pages | 3 pages | Ingredients split | Pages for all 137 | Smallest text |
| --- | --- | --- | --- | --- | --- | --- |
| A4 portrait | 134 | 3 | 0 | 0 | 140 | 8.6 pt |
| A4 landscape | 132 | 5 | 0 | 0 | 142 | 8.6 pt |
| A5 landscape | 116 | 21 | 0 | 0 | 158 | 7.9 pt |
| A5 portrait | 94 | 39 | 4 | 16 | 184 | 7.9 pt |

Taps before the system dialog: the card you have open, 2 (Print this card, Print). The 5 specials on A5: 5 from the chef hat (chef hat, Manage, Print cards, Specials, Print) plus one if the paper changes. Cooks: 0 added, 0 lines lost.

**Focused follow-up on the mix** (two reviewers, not a new round): screen designer 8.5/10, "one flow, each control once"; skeptic 7/10, beats their earlier pick. Both: **hold A5 portrait back** (16 cards split their ingredients, 4 run to 3 pages). Designer: three solid "on" states compete with the orange Print; a continued page should use the full width; the A5 footer wraps to 2 lines; the Print this card link's 44 px target is Not evidenced. Not re-reviewed by the cook, head chef, new starter or keeper.

**Main downside**: printing many cards goes through Manage Recipes, and iPhone paper size is untested.

**Proposed departures for the head chef**: recipes become an exception to the 20 Oct "nothing prints" decision; A5 portrait is left out of the first release, against the original ask.

**Build plan** (after the head chef's choice): 1) one shared print helper out of `js/functions.js`, with a click test; 2) `js/recipe-print.js` (lazy) with the paging engine, print CSS and Print cards in Manage plus Print this card, real Chromium PDF tests on the 4 largest cards for each paper, the type floor, page counts and the allergen band; 3) a manual Save as PDF from an iPhone before marking ready.

## Stacked dishes: the side view (owner's question, 19 Nov 2026)

The first previews left out the "From the side" drawing that 61 recipes have (the stacked build: burger, parmy, boards). It now prints in the wide column under the ingredients, labelled as on screen. Its labels are text inside the drawing (8.8 units in a 232-unit drawing), so the drawing is sized by the paper, not the column: 0.38 mm per unit on A4 (88 mm wide, labels 9.5 pt, 8.7 pt after the 92 % step), 0.35 mm on A5. In two text columns it spans both. The three extra-wide side views (Feast of the Feather 400, Butchers Board 392, The Beast Board 482 units) need more than the wide column, so they take the full page width at the top of page 2.

Mix, all 137 cards with side views (Preview, Chromium):

| Paper | 1 page | 2 pages | 3 pages | Ingredients split | Pages | Smallest text | Smallest side-view label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A4 portrait | 127 | 10 | 0 | 0 | 147 | 8.6 pt | 8.7 pt |
| A4 landscape | 127 | 10 | 0 | 0 | 147 | 8.6 pt | 8.7 pt |
| A5 landscape | 100 | 30 | 7 | 0 | 181 | 7.9 pt | 8.0 pt |
| A5 portrait | 61 | 67 | 9 | 16 | 222 | 7.9 pt | **6.9 pt** (the 482-unit board cannot fit 134 mm at the floor) |

Findings, Reproduced in the preview:
- Side views cost about 7 more one-page cards on A4 (134 to 127). Feast of the Feather and the two big boards always run to 2 pages.
- A4 landscape: the plate key of Feast of the Feather split, item 6 on page 2 away from its drawing. Build rule: the plate key moves with the drawing.
- A5 landscape: one side column (Honey and Maple Roasted Pumpkin) drew 5 px taller than measured. Build rule: check every page after it is drawn and repaginate that card if anything overflows.
- A5 portrait is now clearly the weakest paper: hold it back (as both follow-up reviewers said).

Not re-reviewed by the council: a measured content addition inside the chosen layout, not a new flow.

## Chosen

**The mix, chosen 19 Nov 2026** ("okay lets do that", after the side-view previews), with A5 upright held back as both follow-up reviewers advised.

## Built (19 Nov 2026)

- `js/controls.js`: `LK_PRINT`, one shared print job (snapshot root, body class, an `@page` rule only while the job lasts, ends on afterprint or a return to the book). `js/functions.js` now uses it, so a function run sheet and a card print never clear each other.
- `js/recipe-print.js` and `css/recipe-print.css` (lazy, loaded by `js/manage.js` for `#/manage/print` and `#/manage/print/<id>`): the paging engine from this study, layout of the mix only, papers A4 upright, A4 sideways, A5 sideways. Recipes, drawings and allergens are the book's own (`LK_APP.byId`, `tags`, `missing`, the head chef's changes laid over); drawings made in the book go through `LK_RX.clean()` again when printed. After each card is drawn its pages are checked where they print, and a card that came out taller than measured is laid out again with more room.
- `js/manage.js`: Print cards beside New recipe; the print page; a hand-over drops the ticked cards. `js/app.js`: Print this card beside Change this recipe.
- `tests/recipe-print.test.js`: staff closed out and never download the file; Print this card ticks only its card; a group ticks and says so; old ticks never ride along; the paper is kept; what was sent is said by name; no reads or writes; a name prints as words; for each paper, real Chromium PDFs of the five biggest cards: page size, one sheet per PDF page, the allergen band and the stamp on every page, the type floor (side-view labels too) and nothing cut off; 390, 768 and 1280 px.

Still to check before calling it done on the line: one Save as PDF from an iPhone for each paper (Risk, Not evidenced), and a phone's time for Every card. On A5 sideways a long plate key continues on the next page when it cannot share the narrow column with its drawing.
