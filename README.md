# Leichhardt Kitchen Recipe Book

The recipe book for the Leichhardt Hotel kitchen team. It works on any phone, tablet or computer with a web browser.

## What it does

- **Three ways to look at the recipes.** Staff pick one the first time they open it, and can change it any time in **Settings**:
  - **Tiles:** every recipe as a card, with search, recipe type and "Free from" filters on top.
  - **List:** a short grouped list, with the open recipe beside it on a tablet or computer and full screen on a phone.
  - **The Pass:** dishes drawn as plates and batch recipes as GN pans. Tap a plate to zoom in, then tap the laksa on the barramundi to open the laksa. The allergen lens shows where an allergen is at every level.
- **Linked batch recipes.** Any ingredient that has its own recipe is underlined orange with a "Recipe 06" tag, so tapping it opens that recipe. Batch recipes show which dishes they go on.
- **Allergens roll up.** A dish picks up the allergens of the batch recipes it uses, and names where each one comes from. A "?" means "may be in it, check the supplier label".
- **Cards to come.** A batch recipe that isn't in the book yet shows as "Card to come". Every dish that uses one is marked "Allergens incomplete", is left out of the Free from filter, and counts as "may have" under the allergen lens, until that card is added.
- **Snacks and sides** each have their own group, filter and shelf.
- **From the side.** Plated dishes also show a labelled side view, so the team can see what sits on top. Burgers show their build, top to bottom, instead.
- **Tick off steps** while cooking. The ticks clear when the page is closed.
- **Settings:**
  - Which view it opens with
  - Text size (Normal, Large, Extra large)
  - Clear ticked steps
  - Show the welcome screen again

  Settings are saved on each phone or tablet.

## Adding or changing a recipe

All recipes are in **`js/data.js`**. The top of that file explains every field. To add one:

1. Copy an existing recipe block, from `{` to `},`.
2. Give it a new `id` (short, no spaces, for example `gravy`) and the next card number.
3. Fill in the name, yield, ingredients, steps and allergens.
4. To make an ingredient tappable, add `link: 'gravy'` (the other recipe's `id`).
5. Put anything that isn't confirmed yet in `[square brackets]` so it shows as a placeholder.
6. Allergens: tag each ingredient (`tags: ['Milk', 'Soy?']`) and leave out `contains` and `check`; the book works them out from the tags.
7. Change `updated` at the top of the file to today's date.

### Batch cards still to come

Dishes already link to these ids. Add a recipe with the same `id` and the links, "Used in" lists and allergens switch on by themselves. Most-used first:

| id | Used by cards |
| --- | --- |
| `chips-salad` | 13 14 15 16 17 18 19 20 21 33 34 58 59 60 64 65 |
| `mushroom-sauce` | 13 14 15 16 31 |
| `gravy` | 21 27 33 35 41 46 56 |
| `side-veg` | 27 28 35 42 |
| `mash` | 28 29 35 41 |
| `smash-patty` | 22 23 |
| `cookie-dough` | 12 |
| `cowboy-butter` | 17 |
| `french-topper` | 18 |
| `mexican-topper` | 19 |
| `americana-topper` | 20 |
| `beer-batter` | 24 58 64 |
| `pork-belly-batch` | 29 51 |
| `spinach-puree`, `red-wine-jus` | 29 |
| `fettuccine`, `carbonara-sauce` | 30 |
| `wing-flour` | 31 49 |
| `diane-sauce` | 31 |
| `pulled-pork`, `pico` | 32 |
| `spaghetti`, `kids-bolognese` | 36 |
| `smoked-mac` | 39 |
| `rum-butterscotch`, `honeycomb` | 43 |

Cards 13 to 45 came from the AVC Live costings (Spring 26). Only ingredients and quantities were taken over; prices and supplier codes stay in AVC.

Cards 46 to 65 are dishes on the online menu that had no AVC costing. Their components come from the menu and their quantities show as "To come" until they are costed.

On GitHub you can edit `js/data.js` straight in the browser: open the file, press the pencil, make the change and press **Commit changes**. The live page updates within a minute or two.

Drawings for The Pass are in `js/art.js`. A recipe with no drawing still shows, with a blank plate or pan.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page itself |
| `css/app.css` | The Leichhardt look: Barlow fonts, off-white, black rules, orange accent |
| `js/data.js` | The recipes (edit this one) |
| `js/art.js` | Plate, pan and technique drawings |
| `js/app.js` | How it all works: views, search, links, allergens, settings |

There's no build step and nothing to install. To try it on a computer, open `index.html` in a browser.

## Good to know

- This repo is **public**, so anyone with the link can read the recipes. The page asks search engines not to list it.
- Allergens are worked out from the ingredients listed. Always check the supplier labels before answering a guest.
- Cook as written. Check with the head chef or sous chef before changing anything.
