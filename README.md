# Leichhardt Kitchen Recipe Book

The recipe book for the Leichhardt Hotel kitchen team. It works on any phone, tablet or computer with a web browser.

## What it does

- **Three ways to look at the recipes.** Staff pick one the first time they open it, and can change it any time in **Settings**:
  - **Tiles:** every recipe as a card, with search, recipe type and "Free from" filters on top.
  - **List:** a short grouped list, with the open recipe beside it on a tablet or computer and full screen on a phone.
  - **The Pass:** dishes drawn as plates and batch recipes as GN pans. Tap a plate to zoom in, then tap the laksa on the barramundi to open the laksa. The allergen lens shows where an allergen is at every level.
- **Linked batch recipes.** Any ingredient that has its own recipe is underlined orange with a "Recipe 06" tag, so tapping it opens that recipe. Batch recipes show which dishes they go on.
- **Allergens roll up.** A dish picks up the allergens of the batch recipes it uses, and names where each one comes from. A "?" means "may be in it, check the supplier label".
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
6. Change `updated` at the top of the file to today's date.

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
