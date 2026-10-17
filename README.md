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

- `#/prep` is the prep book, laid out as an open notebook: today on the left, yesterday on the right (two pages on a big screen, stacked on a phone). Staff enter the kitchen PIN once per phone, pick their name, and the first time choose their own 6-digit PIN. That phone then stays signed in.
- Sections are not preset. Whoever writes a line types a section name (or picks one already used) and it appears as a section on the page and as a tab. The app keeps track of sections in the background and offers them as suggestions.
- Ticking, writing and removing lines is counted per person in the background.
- `#/admin` is the admin panel: who is writing and ticking most, the sections people have written (hide one from suggestions), names, roles and permissions, and Reset PIN for a person. It needs Google sign-in as the project owner.
- Data lives in Firebase Firestore (free Spark plan): `config/main`, `days/<date>/items`, `staffpins/<person>` (hashed, unreadable), `pinset/<person>`, `proofs/<person>` (write only), `activity/<person>`, `sections/<slug>`. Firebase config is in `js/firebase-config.js` (public by design). The kitchen PIN and admin email live in the published Firestore rules, not in this repo. Staff names are not in the repo either.
- Personal PINs are the write lock. Anyone with the kitchen PIN can read, but every write must carry the writer's own 6-digit PIN, which the Firestore rules check against the stored hash (see Staff lock). Per-person permissions (add, tick, delete) are still guidance in the page. Items are never hard deleted.
- Changing the kitchen PIN means editing the Firestore rules and re-entering it on every phone.

### Roles, rollover, insights, badges and recipe links

- **Head chef (owner):** signs in with Google at `#/admin` and sees everything: charts and numbers for 7, 14 or 30 days (lines per day, by person, time of day, rolled over most often, sections), the tallies, people and permissions, PIN resets and the badge switch.
- **Sous chef:** no Google needed. Set a person's role to Sous chef in the admin panel. They sign in with their name and PIN like everyone else, and get a "Manage staff" button on the Handy page to add and remove people. The Firestore rules only let a PIN holder change the `people` list of `config/main` (nothing else in that document). Only people listed in `sousIds` (kept in step by the owner panel) may change it.
- **Rollover:** the first person to open today's book writes every line that was not ticked on the last written day (up to 7 days back) onto today, marked "Rolled" (with "x2" and so on for repeats) and sorted to the top of its section. Each rolled line stores `rolled`, `root`, `from` and `rolledFrom`, so the Insights page can show how often and which lines roll over. There is no Yesterday page any more.
- **Urgent:** the ! button on a line pins it above the rest.
- **Handy page:** priorities, progress by section, "Usual for a Saturday" (lines on at least two of the last four same weekdays, tap to add), hide ticked lines, copy the list as text, print the list.
- **Weekly badges:** the top 3 ranks for ticked lines over the last 7 days show above the notebook. The owner can switch them off.
- **Recipe links:** hand-written lines link to recipe cards by matching words against card names and short names (`matchRecipe` in `js/prep.js`). A line that could mean several cards links to none.

### Smart prep list

- Every line written or picked is counted in `kitchens/<pin>/learned/<item>`: total uses, typed versus picked, uses per weekday (`dow`, 0 is Sunday) and per section. Rolled-over copies are not counted.
- While typing, matching learned items (and batch and component recipe names) show as tap-to-fill chips under the box. A learned item also fills in its usual section when the section box is empty.
- The Handy page shows "Usual for a <weekday>" (written on at least two of that weekday) and "Regulars" (4 or more uses, `REGULAR` in `js/prep.js`) as one-tap adds.
- Owner insights: items learned, regulars, share added by tapping a suggestion, most written items, a weekday heat table, and a manage table to hide typos. The list also reads past lists by itself, up to 90 days back (see below).

### Proofreader

- Every new written line is tidied (spacing, punctuation, capital first letter) and spell-checked before it is saved, in the browser, no service needed.
- A word is only corrected when it is not already known and exactly one known word is one slip away (two for long words). Known words come from recipe names and ingredients, a kitchen word list in `js/prep.js` (`KITCHEN`), and everything the list has learned, so new dish names stop being touched once they have been written.
- A corrected line keeps what was typed in `orig`. A toast offers Undo, and an undone word is left alone on that device. The owner sees the latest corrections in Insights.

### Progressive learning

- The first phone to open the prep book reads every past day in the last 90 that has not been read yet, 8 days at a time, and adds the lines to the learned items (proofread, per weekday and section). Nobody has to press anything.
- A day is claimed by creating `learnlog/<date>`. The rules refuse a second create, so two phones can never count the same day twice. Days that already learned live (a line was added that day) are marked the same way and skipped.
- After that it keeps learning with every new line, and each morning the previous day is already marked, so only days nobody opened are read later.

### Security setup

- `firestore.rules` is the rules template. The live rules are pasted into the Firebase console with the real kitchen PIN and owner email filled in. Never commit those values.
- The Firebase web key in `js/firebase-config.js` is public by design. Restrict it in Google Cloud (Credentials, the Browser key) to the site address, and turn on App Check (reCAPTCHA v3) so only the real site can talk to the database. To switch App Check on in the page, add `appCheckKey: '<reCAPTCHA v3 site key>'` to `js/firebase-config.js`.
- The owner panel has a Backup button that downloads everything as one JSON file. The free Firebase plan has no scheduled backups.
- Who is the owner: only the owner's Google account may read `config/admins`, so the page checks that read. No email is stored in the database or the repository.

### Staff lock
- Each write sends the writer's id (`by`) and, in the same batch, `proofs/<id>.tok` (a hash of the person's own PIN). The rules compare it with `staffpins/<id>.hash`, which nobody can read, using `getAfter`. A wrong or missing PIN is refused by the server.
- The first person to set a PIN for a name claims it. The owner can reset it (Reset PIN) and it is chosen again.
- Limits: someone with the kitchen PIN could still guess a 6-digit PIN online (no rate limit without App Check), and add, tick and delete rights per person are checked in the page only.

### Changing the kitchen PIN

1. Add a second copy of the `kitchens/<pin>/...` rules for the new 6 digit PIN to the live rules (see `firestore.rules`).
2. Owner panel, "Move to a new 6 digit kitchen PIN": copies the people, lines (400 days), learned items, tallies and PIN fingerprints to the new PIN, then switches that device over.
3. Everyone else is asked for the PIN next time they open the book once the old rules are removed. Remove the old PIN's rules last, so nothing is cut off while moving.
