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
- **Set out like the guest menu.** Recipes are grouped in the order the menu prints them: Snackin' Plates, Salads, Big Country Feeds, Off the Grill, Schnittys & Parmys, Hand Held, Sides, Dessert and Seniors, then the Functions platters. Tiles, List and The Pass all follow it, and each section is also a filter chip in Tiles. The Functions chip is a rounded rectangle and always sits first after All. Batch recipes and components come after the menu sections ("Bains and prep" on The Pass).
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
7. If it is a dish on the guest menu, add its `id` to the right section in `menuOrder` at the top of `js/data.js`, in the spot where the menu prints it. A dish left out of `menuOrder` still shows, under "Other dishes". Batch recipes and components are not listed there.
8. Change `updated` at the top of the file to today's date.

### Batch cards still to come

Dishes already link to these ids. Add a recipe with the same `id` and the links, "Used in" lists and allergens switch on by themselves. Most-used first:

| id | Used by cards |
| --- | --- |
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
| `spinach-puree`, `red-wine-jus` | 29 |
| `fettuccine`, `carbonara-sauce` | 30 |
| `wing-flour` | 31 49 |
| `diane-sauce` | 31 |
| `pulled-pork`, `pico` | 32 |
| `spaghetti` | 36 |
| `smoked-mac` | 39 |
| `rum-butterscotch`, `honeycomb` | 43 |

Cards 66 and 67 are batch cards taken from the AVC Live pages (October 2026). Only fully confirmed ingredient lists were added. The rest of the batch cards below wait for confirmed quantities.

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

## Prep book and admin panel

- `#/prep` is the prep book, laid out as an open notebook: today on the left, yesterday on the right (two pages on a big screen, stacked on a phone). Staff enter the kitchen PIN once per phone, pick their name, and the first time choose their own 4-digit PIN. That phone then stays signed in.
- Sections are not preset. Whoever writes a line types a section name (or picks one already used) and it appears as a section on the page and as a tab. The app keeps track of sections in the background and offers them as suggestions.
- Ticking, writing and removing lines is counted per person in the background.
- `#/admin` is the admin panel: who is writing and ticking most, the sections people have written (hide one from suggestions), names, roles and permissions, and Reset PIN for a person. It needs Google sign-in as the project owner.
- Data lives in Firebase Firestore (free Spark plan): `config/main`, `days/<date>/items`, `pins/<person>` (hashed), `activity/<person>`, `sections/<slug>`. Firebase config is in `js/firebase-config.js` (public by design). The kitchen PIN and admin email live in the published Firestore rules, not in this repo. Staff names are not in the repo either.
- Personal PINs only say who is writing. They are not a lock, and permissions per person are guidance on the client. Items are never hard deleted.
- Changing the kitchen PIN means editing the Firestore rules and re-entering it on every phone.
