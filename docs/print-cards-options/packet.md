# Print recipe cards: council evidence packet

Source commit: `086c033` (origin/main, 19 Nov 2026). Role-based analysis, not research with real staff.

## Proposal (round 1)

**The problem.** Some cooks still want paper recipe cards: a card taped above a station, a folder on the pass, a laminated card in the cool room, a card for a cook who does not carry a phone. Asked for by the owner (head chef), 19 Nov 2026: "for someone that still want to use physical copies of their recipe cards".

**What people do today.** The book does not print recipes. Head chef decision 20 Oct 2026: "nothing in the book prints or shares". Exceptions since: function run sheets (A4 portrait, 25 Oct), platter prep tiles (A4 landscape, 31 Oct), Reports Records (13 Nov). The existing paper cards are built outside the book (a separate card-making workflow into Google Drive, "locked design" PDFs; the card `no` field in `js/data.js` says it matches "the printed cards"). Those PDFs do not follow the head chef's changes made in the book (Firestore overlay over `js/data.js`). Browser print of a recipe page today prints the screen layout (top bar hidden only).

**The change.**
1. A way to print: a print sheet that asks **which cards** (all cards, or chosen ones; perhaps "this card" from a recipe page, or by kind/menu section) and **which paper** (A4 portrait, A4 landscape, A5 portrait, A5 landscape), then opens the phone or computer's own print dialog (printer or Save as PDF).
2. A print layout for a card: card number and name, kind and where it belongs, yield, menu line, plate drawing, ingredients with quantities, method sections and steps, allergens (contains and may contain, Not complete warning), tip, safety warning, and the date printed plus "check the book for the latest".
3. **One card, one page where it fits.** When it does not fit: never cut a step or ingredient row in half; repeat a header on each continuation page ("Card 06 Laksa, page 2 of 2"); keep the drawing and ingredients together on page 1; allergens and safety never dropped; each card starts on a new page.

**Size of the book.** 137 recipes (52 main, 54 batch, 15 snack, 10 side, 4 dessert, 2 component). Every one has a plate or pan drawing (SVG). Ingredients per card: min 1, median 4, 90th percentile 10, max 18. Method steps: min 0, median 3, p90 10, max 21. Text sizes: median 1 KB, max 3.3 KB of JSON. Largest: chicken-adobo (13 ingredients, 18 steps), grill-board, beast-board, feast-of-the-feather. "All cards" is about 137 to 200 pages.

**Who.** Recipes are public: signed out, staff and chefs can all read current recipes and drawings (`docs/private-kitchen-access.md`). Printing only uses what that person can already read.

**Cost (estimate).** No Firestore reads, writes, rules or listeners: recipes and drawings are already loaded. One print renderer (likely reusing the function print lifecycle in `js/functions.js`: a print-only snapshot `#fn-print`, native `window.print()`, cleanup on `afterprint`, visible message when print is missing), print CSS with named `@page` sizes, one sheet. Tests: real Chromium PDFs checking page size, page count, no clipped text, header repeated on continuation pages, at the four paper choices. Probably one or two pull requests.

**Where the entry goes (open).** Candidates: a Print button on a single recipe card; a Print cards entry on the Recipes page; the chef hat menu; Settings. Service rule 2: no new top bar or tab bar button or pop-up on a service page without the head chef's OK. The Recipes page is the "find a recipe" service page.

## Current contracts (excerpts)

- `CLAUDE.md` Service rules: main job one tap from its tab; no new tab/top bar/tab bar button or pop-up on a service page without OK; nothing over a list during service unless it stops a mistake; added taps or lost lines must be justified with counts at 390 px.
- `docs/head-chef-decisions.md` 20 Oct 2026: "nothing in the book prints or shares". Superseded for functions (25 Oct, 31 Oct) and Records (13 Nov). A recipe print is a further exception the head chef must choose.
- `docs/function-printing.md`: native print dialog (printer or Save as PDF); a print-only snapshot separate from live screen updates; a long item continues onto more pages, "never truncate it or reduce all the words to fit one page"; missing/failed print API gives a visible message and retry; closing the dialog restores the screen; offline/cached copies carry a warning; named `@page` so other print views are untouched; Barlow and Barlow Condensed fonts; verified with real Chromium PDFs.
- `docs/surface-colours.md`: preserve the meanings of category palettes, allergen certainty, drawings and print. `docs/colour-coding.md`: A4 printing preserves dietaries, labels and existing monochrome treatment; a screen token must not make essential print content unreadable. Check monochrome printing.
- `docs/design-patterns.md`: bottom sheet (`.nt-wrap`, phone) / shared modal frame (`ModalFrame()`, centred from 768 px), 44 px targets, swipe to close; a `<select>` dressed by shared controls as a picker; an action that undoes things goes last. Sheets go on `document.body`, one at a time (`sheetBusy()`).
- `docs/action-feedback.md`: every tap answers in its own frame and says what it did, by name.
- Writing style: Australian English, metric, 24-hour time, no em dashes. Unconfirmed quantities show "To come" (written `[Qty]` or `[square brackets]` in data). Allergens are worked out from ingredients; footer: "Always check the supplier labels before answering a guest."
- Recipe amounts: a recipe can be scaled on screen (`docs/recipe-multiplier.md`). Which amount a paper card shows is open.

## Design references

Linear (consistent frame, work over navigation), Things 3 (occasional things tucked away, frequent stay visible), Airbnb (all a job's context together), Todoist (quick, visible editable defaults), Flighty (real times and status, no stale status shown as live), Duolingo (each tap answers truthfully, clear next step and recovery), Headspace (calm short labels, one name per thing). Rank kitchen value and evidence over resemblance.

## Try to break it (families)

Confusion and accidental action; repetition and delayed answers; failed reads and writes; interruption and handover; time boundaries; access and conflicting state; misleading presentation (could paper imply something is current or safe when it is not?). Report up to three concrete scenarios each: role/state, trigger, expected vs hypothesis, impact, evidence status (Reproduced / Checked / Risk, Not evidenced / Not applicable), smallest repair or check.
