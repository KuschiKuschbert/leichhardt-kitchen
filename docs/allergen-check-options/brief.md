# Allergens checked or not, 19 November 2026

**Status:** chosen and built (19 Nov 2026). The head chef took the recommendation: **A, with the label-dependent products left to check** ("I take the recommendation", relayed by the second venue session). Every other plain line in `js/data.js` says No allergens; the products listed under Chosen stay Not checked until he reads their labels.

## Chosen

A, except these 29 label-dependent products, which stay **Not checked** (no `none`) on all **49 lines** that use them in `js/data.js`: chips, fries, sweet potato chips, chicken tenders, fried shallots, corn flour, dark beef stock, Heinz BBQ sauce, buffalo sauce, red hot sauce, sweet chilli sauce, Napoli sauce, sauce of choice, side sauce of choice, Szechuan seasoning, mild curry powder, Chinese five spice, icing sugar mix, bacon, shortcut bacon, diced bacon, crispy bacon, leg ham, shaved leg ham, Virginian ham, salami, pulled pork, pulled lamb, smoked pulled lamb.

That leaves **39 of 137 cards** saying Allergens not checked yet and out of Free from: 34 of 81 dishes, **29 of the 74 guest menu dishes**, and 5 batch recipes (Bourbon BBQ Sauce, Braised Beef Cheek, Carolina Gold BBQ Sauce, House BBQ Sauce, Alabama White Sauce, whose dishes roll it up). Guest menu dishes that show it: Smash Burger, The OZ Smash Burger, Fish Burger, Chickpea Mushroom Burger, Steak Sandwich, New Pork Ribs, Pork Belly, Carbonara, Grill Maiden's Board, Senior Parmy, Wedges, Donut Fries, Poutine Fries, Smoked Pulled Lamb Nachos, Salt and Szechuan Pepper Calamari, Smoked BBQ Pork Riblets, Bacon and Cheese Bread, Chips, Beef Cheek, Chicken Schnitzel, Chicken Parmy, Pub Caesar, BBQ Pulled Beef Loaded Fries, the Aussie, Vege, Yumcha, Antipasto and Seafood Platters, and Chicken Topper. Off the menu: Butchers Board, The Beast Board, Pulled Pork Burger, Brisket Board, Beast Burger.

Each warning goes when the head chef opens the recipe in Manage and gives the product its allergens or No allergens (2 taps a line: open the row, then No allergens or the allergen). Chips alone clears 10 cards. `tests/allergen-check.test.js` holds the list (`LABELS`): take a product out when its lines are checked.

## The gap

Found by the second venue council (`docs/second-venue-options/brief.md`, Break-it findings, round 1) from the source at 086c033, and **reproduced** here in the click-test stand-in on `main` at d63d5f0: a recipe whose ingredients have no allergen tags said "None in the ingredients." and showed under Free from gluten. Only a linked recipe missing from the book raised "Not complete yet". `tests/allergen-check.test.js` failed 13 of 19 checks on that code and passes 30 of 30 with the fix.

A guest could be told a dish is free of an allergen that nobody checked. It affects any recipe made in Manage today, any ingredient added there, and every recipe a future AVC Live import brings in.

## The contract

- An ingredient is **checked** when it has its allergens (`tags`), says **No allergens** (`none: true`), or links a recipe that is itself checked. Otherwise it is **not checked**.
- A recipe that sets its allergens by hand (Set by hand in Manage, or `contains`/`check` in `js/data.js`) is checked as a whole. The recipes it links still roll up.
- A recipe with any part not checked:
  - its card says **Allergens not checked yet**, in words, in the existing warning box (the same look as Not complete yet), names the parts, and never says "None in the ingredients";
  - it is left out of Free from and a free-from search ("gf burger"), like a card to come;
  - under Contains it counts as "may have" every allergen, like a card to come;
  - its tile says **Allergens not checked**; the paper card says "Allergens not checked yet: ..."; the function checks list says "allergens not checked yet".
- The recipe form (Manage): every ingredient row offers **No allergens** first, at 44 px, then the ten allergens as before. A row with neither says **Not checked** in its one-line summary and "Not checked yet. Choose its allergens, or No allergens." when open. An allergen takes No allergens off; No allergens on a row with allergens asks first (Tap again: the allergens go). The Allergens chapter says which parts are not checked, and Save shows the same warning (it never blocks the save: the card says it honestly).
- Saved shape: a plain line (no link, no allergens) is saved with `none: true` or `none: false`. `js/overlay.js` keeps both. No rules change: ingredient maps are not checked by `firestore.rules`.
- Older copies: the head chef's own copy of a file recipe saved before this change has no `none` on any line. `js/overlay.js` carries the file's No allergens onto such a line by the ingredient's exact name, in the same recipe only. A copy saved by the new form has `none` on every plain line, so nothing carries onto a line left not checked.
- The fingerprint that says "Book file changed" leaves `none` out, so stamping the file does not flag the head chef's copies.

## The choice: how do the recipes already in js/data.js count?

Counted from `js/data.js` at d63d5f0: 137 recipes. 44 set their allergens by hand (checked as a whole). The other 93 work them out from the ingredient tags; 73 of those have at least one plain line with no tags: **235 lines, 148 different products**. With the fix alone, **80 of 137 cards** (63 of 81 dishes, **56 of the 74 guest menu dishes**) would say Allergens not checked yet and leave Free from.

| | A. The file counts as checked (recommended, in the draft) | B. Check them all again | C. A recipe-level tick |
| --- | --- | --- | --- |
| What staff see | No change on today's cards. Only new or changed lines need the check | 80 cards say Allergens not checked yet; Free from can show at most 18 of 74 menu dishes until the head chef works through them | Same as B until each recipe is ticked |
| Head chef's work | None now. Look over the label-dependent list below at your pace | Open 73 recipes and tap No allergens or the allergens on 235 lines (about 2 taps a line plus the save) | 80 ticks, but a tick says less than a checked line |
| Build | Built: `none: true` stamped on the 235 lines (one-off, proved by parsing that nothing else changed) | Drop the stamp commit | A new recipe field means a rules change, published before the code |
| Risk | Rubber-stamps 148 products as allergen free because the file never tagged them | Warning fatigue: a card that always says "not checked" teaches the line to ignore it | Same as B, plus a rules publish |

**Recommendation: A**, with the products whose label can carry an allergen left Not checked until the head chef reads the labels (chosen, above). The file is the head chef's confirmed book; A keeps the warning rare, so it means something when it shows.

The label-dependent products (not a claim that any contains an allergen): chips, fries, sweet potato chips, chicken tenders, fried shallots, corn flour (wheaten cornflour is common), dark beef stock, Heinz BBQ sauce, buffalo sauce, red hot sauce, sweet chilli sauce, Napoli sauce, sauce of choice, side sauce of choice, Szechuan seasoning, mild curry powder, Chinese five spice, icing sugar mix, bacon, shortcut bacon, diced bacon, crispy bacon, leg ham, shaved leg ham, Virginian ham, salami, pulled pork, pulled lamb, smoked pulled lamb. Any one of these can be tagged in Manage in the row's Allergens.

## Council: quick check

**Size:** small. A change on existing pages (the recipe card's allergen box, Free from, the tile, the recipe form row) that adds no tab, bar button, pop-up or step on a service page. The council skill's quick check applies; no extra agents. The second venue council's round 1 already asked for this fix (Skeptic: Build smaller, an untagged ingredient counts as not checked).

**Round 1 answers.** Needed: yes, a food safety gap, reproduced. Adds value: it stops a wrong "free from" answer to a guest. Smaller option: this is the smallest that closes it (the alternative, blocking Save until every line is checked, would stop the head chef saving a half-written card).

**Service rules.**
1. Finding a recipe stays one tap. Free from stays one tap.
2. No new tab, bar button or pop-up.
3. Nothing over a list: the warning sits inside the card's own allergen box, and only on a card not checked.
4. Taps and lines, counted in the stand-in at 390 px (Implemented app, `tests/allergen-check.test.js` fixtures): a card with a part not checked gains the warning block (label, two lines, the parts) in its allergen box; with choice A no card in the file shows it today. In the form, an allergen-free new line takes 2 taps (open the row, No allergens) where before it took none and silently read as allergen free; a line with allergens takes the same taps as before. Worth it: those 2 taps are the check.

**Contract fit.** Surfaces and colours: Works, the existing `.warn` box (Not complete yet) and the existing `.tag.maybe`; the form note reuses the After saving line's look (`.mg-change`, now `.mg-change, .mg-unk`). No new look. Words: Works, every state is said in words (Allergens not checked yet, Not checked, No allergens), never colour alone. Allergen certainty (a category exception): Works, "?" may have is unchanged and a part not checked is never shown as none. Contrast: Not evidenced (existing tokens, not re-measured). Action feedback: Works, each tap redraws its row's summary at once, and the Save slip is unchanged.

**Design references.** Headspace: one name for each thing (Not checked, No allergens) and plain words to a new starter: Works. Todoist: the usual answer (No allergens) first and one tap, required input shown, never guessed: Works. Duolingo: truthful state, never "None" for an unchecked line: Works. The others are not relevant to a card's allergen box.

**Try to break it** (Skeptic and Keeper, within the quick check).

| Scenario | Expected | Evidence | Disposition |
| --- | --- | --- | --- |
| The head chef's own copy of a file recipe, saved before this change, would flood the line | Carries the file's No allergens by exact name; a renamed line shows Not checked | **Checked in the stand-in** (an old copy of Mushy Peas: none; a new copy of Cowboy Candy with a line left not checked: not checked) | How many live copies have renamed plain lines is **Risk / Not evidenced** (live Firestore not read from here). Check the live book once after merge: Tiles, search "not checked" tags |
| A phone still on the old shell during the update | Old code shows "None" for a card not checked until it updates; old Manage drops `none` on save | Source read | Fail safe after update (a dropped `none` reads as not checked). Window: until the phone takes the update |
| Ten triggers read "Gluten: Not in it" on a row not checked, which looks checked | The row says Not checked in its summary and in a note above the chips; Save warns | **Checked in the stand-in** (screens below) | A new starter could still read the triggers alone: **Risk**. Smallest repair if it bites: show "Not set" on the triggers of a row not checked (`js/controls.js` `cyclePicker`) |

Future edits to `js/data.js`: a new plain line with no tags and no `none` makes its card say Allergens not checked yet. `tests/allergen-check.test.js` lists the file's cards not checked (none today); a session that adds one on purpose names it there with the head chef's reason, so it is never silent.

**Verdict:** Small change, quick check: build it, with choice A recommended. The head chef chose A with the label-dependent products left Not checked.

## Screens (Implemented app, click-test stand-in, 390 px, synthetic recipe)

- [The card: Allergens not checked yet](previews/card-not-checked-390.png)
- [The form: a row not checked, No allergens first](previews/form-row-not-checked-390.png)
- [The form: the rows' summaries](previews/form-rows-390.png)
- [The form: The card shows](previews/form-card-shows-390.png)

`capture.cjs` here films them again from `tests/` with the stand-in.

## Files

`js/app.js` (roll(), the card, tile, Free from, search, Contains, `LK_APP.unchecked()`), `js/manage.js` (No allergens, Not checked, the warning, saved `none`), `js/overlay.js` (keeps `none`, carries the file's checks to older copies, `LK_RX.carry()`, fingerprint without `none`), `js/recipe-print.js` (the paper card), `js/functions.js` (function checks), `css/app.css` (`.mg-unk`, `.mg-none`), `js/data.js` (the choice: `none: true` on 186 lines, the 49 lines of the 29 label-dependent products left Not checked; the field guide), `tests/allergen-check.test.js`.

## Rollback

Revert the pull request. Saved `none` fields are ignored by the old code (it drops them on the next save), so nothing breaks; the old code shows "None in the ingredients" again.
