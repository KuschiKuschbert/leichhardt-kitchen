# Leichhardt Kitchen Book

The Leichhardt Hotel kitchen's app: the recipe book, the prep list, the order list and the wastage log, plus the head chef's admin panel. It works on any phone, tablet or computer with a web browser and can be installed as an app. Working rules for changing it are in `CLAUDE.md`.

## What it does

- **Two ways to look at the recipes.** The Pass opens first. The Pass / Tiles switch next to the search box changes it any time (and **Settings** sets which one opens):
  - **Tiles:** every recipe as a card with its small drawn dish, with search, recipe type and "Free from" filters on top.
  - **The Pass:** dishes drawn as plates and batch recipes as GN pans. Tap a plate to zoom in, then tap the laksa on the barramundi to open the laksa. The allergen lens shows where an allergen is at every level.
- **Linked batch recipes.** Any ingredient that has its own recipe is underlined orange with a "Recipe 06" tag, so tapping it opens that recipe. Batch recipes show which dishes they go on.
- **Allergens roll up.** A dish picks up the allergens of the batch recipes it uses, and names where each one comes from. A "?" means "may be in it, check the supplier label".
- **Cards to come.** A batch recipe that isn't in the book yet shows as "Card to come". Every dish that uses one is marked "Allergens incomplete", is left out of the Free from filter, and counts as "may have" under the allergen lens, until that card is added.
- **Set out like the guest menu.** Recipes are grouped in the order the menu prints them: Snackin' Plates, Salads, Big Country Feeds, Off the Grill, Schnittys & Parmys, Hand Held, Sides, Dessert and Seniors, then the Functions platters. Tiles and The Pass both follow it, and each section is also a filter chip in Tiles. The Functions chip is a rounded rectangle and always sits first after All. Batch recipes and components come after the menu sections ("Bains and prep" on The Pass).
- **From the side.** Plated dishes also show a labelled side view, so the team can see what sits on top. Burgers show their build, top to bottom, instead.
- **Pin labels.** On the plate drawing the page places each label where it does not cover the food, other labels or other pins, with a thin line back to its pin. It reads the drawing to find the food, so a new dish needs no label tuning. Boards and platters (more than 8 pins) use smaller labels. The ring is see-through so the food shows through it.
- **Tick off steps** while cooking. The ticks clear when the page is closed.
- **Search (October 2026):**
  - Every word counts, in any order: "parmy chicken" finds Chicken Parmy.
  - "Gluten free", "gf", "no dairy", "df", "nut free", "egg free", "shellfish free" and so on show the recipes free from it, by the same rule as the Free from chips (no "may have", and no recipe with a card still to come). A note above the results says so. It also works with a word: "gf burger". So the Pass, which has the allergen lens instead of Free from chips, can do free-from too.
  - A word that is one slip away from a word in the book is put right when nothing else matches ("chiken" shows chicken, with a note saying so). Searches that still find nothing are queued for the admin panel as before.
  - The search bar stays at the top of the screen while the list scrolls. On phones the "16 of 114 match" count shows while a search or filter is on. Switching between the Pass and Tiles starts at the top of the list.
- **Recipe cards on phones and tablets:** the drawings come first, so a row under the name trail jumps straight to Allergens, Ingredients or Method. It is hidden on wide screens, where the card is in two columns.
- **Settings:**
  - Which view it opens with
  - Text size (Normal, Large, Extra large)
  - Clear ticked steps
  - Open on a phone (computers and wide tablets only, 900 px and wider): the QR code (`qr.svg`) that opens the book, with Print the A4 sign (`qr-sign.pdf`) and Download the QR code (`qr.png`)

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
| `french-topper` | 18 |
| `mexican-topper` | 19 |
| `americana-topper` | 20 |
| `beer-batter` | 24 58 64 |
| `spinach-puree`, `red-wine-jus` | 29 |
| `fettuccine`, `carbonara-sauce` | 30 |
| `wing-flour` | 31 49 |
| `diane-sauce` | 31 |
| `pulled-pork`, `pico` | 32 |
| `smoked-mac` | 39 |
| `rum-butterscotch`, `honeycomb` | 43 |

Card 104 (Cob Loaf Mix) is the batch for the Brisket Cob, from the kitchen's own printed recipe doubled to a 5000 ml batch (October 2026). Every card now has a drawing: batch cards show a GN pan from above (`pans` in `js/art.js`), dishes show a plate. Pans for gravy, mash, red wine jus and cards 105 to 115 were drawn on 18 October 2026 from the written recipes, not from photos of the real batches, so check the colours. Card 115 (Cowboy Butter, 1500 g butter and 350 g bourbon BBQ dry rub, for the flank steak on card 17) is mixed, rolled, frozen and cut to about 80 g portions as needed. Card 114 (Spaghetti) is the pasta for the senior and kids bolognese plates; its quantity and method are to come. Card 112 (Korean-Style Cucumber) uses the whole 1500 ml batch of Korean dressing on 4 kg sliced cucumbers. Card 113 (Kids Spaghetti Bolognese, Kids section of the menu) uses the Bolognese Sauce batch (card 91, now for the senior and kids plates) and the senior plate's drawing; its sauce and parmesan amounts are to come. Cards 105 to 112 (Bourbon BBQ Sauce, Chilli Jam, Korean Dressing, Seed Granola, Cowboy Candy, Braised Beef Cheek, Skillet Cookie Dough, Korean-Style Cucumber) are batch cards from the kitchen's own printed recipes (18 October 2026), with only the printed quantities; the handwritten scale-ups on the chilli jam sheet were not readable and are not used. Cards 66 and 67 are batch cards taken from the AVC Live pages (October 2026). Only fully confirmed ingredient lists were added. The rest of the batch cards below wait for confirmed quantities.

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
- **The book updates itself.** Every merge to `main` changes the site's `Last-Modified` and `ETag`. The book asks for just the headers of `index.html` (a tiny request, no Firestore) when it opens, when someone comes back to it and every 15 minutes while open. If they changed, it reloads: straight away when the app was brought back after 5 minutes or more away, otherwise once nobody has touched it for 2 minutes and nothing is being typed (an input in focus blocks it). Meanwhile a bar says "New version available" with an Update now button. It reloads at most once every 10 minutes, so it cannot loop. The 04:00 daily refresh stays as a backstop. A phone running a version from before this feature picks it up on its next reload (04:00 or reopening the app). No version number to bump and nothing to configure.

## Installing it as an app

- The logo is a chalk "KB": off-white handwriting (Caveat) with an orange underline on a dark specials board, chosen by the head chef from five options (18 Oct 2026). The letters are drawn as paths, so no font is needed. `icons/` holds the app icons (512 with "kitchen book" and a flame; 192, 180 and 96 with just KB; the maskable one drawn smaller for Android's circle crop), `icon.svg` is the browser tab version, and the same mark sits in the top bar (`LOGO_MARK` in `js/app.js`) and on the QR sign. Phones that installed the app earlier may need it removed and added again to show the new icon (iPhone always does).
- The book is an installable web app: `manifest.webmanifest` (name, colours, icons in `icons/`, shortcuts to Prep list, Orders, Wastage and Recipes on a long press of the icon) and `sw.js` (service worker).
- Phones and tablets that have not installed the book yet see an **Install the app** card at the top of the landing page (18 Oct 2026). In Chrome, Edge and Samsung Internet it has an Install button; on iPhone and iPad it explains Share, then Add to Home Screen; elsewhere it points to the browser menu. "Not now" hides it on that device only (`installNo` in the saved settings). It never shows in the installed app or on computers.
- Settings has the same **Install the app** section: an Install button in Chrome, Edge and Samsung Internet; on iPhone and iPad it explains Share, then Add to Home Screen; on a Mac in Safari, File, Add to Dock.
- The browser's install offer (`beforeinstallprompt`) is caught by a small script in `index.html` before the app scripts load, and `preventDefault()` is called on it, because Chrome only opens its install box from our button once that has been done. If the box fails to open, the card and Settings fall back to the manual steps. The manifest `id` is `/leichhardt-kitchen/`, so the app has its own identity on `kuschikuschbert.github.io` and cannot clash with another app on the same address.
- The service worker is network first for the book's own files, so the newest cards load whenever there is a connection, and keeps the last copy so the recipe book still opens with no signal. Google Fonts are kept once loaded. Firebase (prep list, orders, wastage) is not touched; it keeps its own offline copy. To force everyone onto a fresh cache, change `CACHE` in `sw.js`.

## Prep book and admin panel

- Staff only see today in `#/prep` (no back, forward or date picker); the head chef and sous chefs can still browse other days. Unfinished lines roll over to today by themselves. This is the page only: past days stay readable in the database to anyone with the kitchen PIN.
- `#/` is the landing page (four dockets: Recipes, Prep list, Orders, Wastage). The recipes live at `#/recipes`, the order list at `#/orders`, the wastage log at `#/waste`. A pill menu (big screens) or a bottom tab bar (phones) switches between them; tapping "Kitchen Book" goes back to the landing page.
- `#/prep` is the prep book, laid out as an open notebook: today on the left, yesterday on the right (two pages on a big screen, stacked on a phone). Staff enter the kitchen PIN once per phone, pick their name, and the first time choose their own 4-digit PIN. That phone then stays signed in.
- Sections are not preset. Whoever writes a line types a section name (or picks one already used) and it appears as a section on the page and as a tab. The app keeps track of sections in the background and offers them as suggestions.
- Ticking, writing and removing lines is counted per person in the background.
- `#/admin` is the admin panel: who is writing and ticking most, the sections people have written (hide one from suggestions), names, roles and permissions, and Reset PIN for a person. It needs Google sign-in as the project owner.
- Data lives in Firebase Firestore (free Spark plan): `config/main`, `days/<date>/items`, `staffpins/<person>` (hashed, unreadable), `pinset/<person>`, `proofs/<person>` (write only), `activity/<person>`, `sections/<slug>`, `notes/<id>` (daily notes, see Daily notes). Firebase config is in `js/firebase-config.js` (public by design). The kitchen PIN and admin email live in the published Firestore rules, not in this repo. Staff names are not in the repo either.
- Personal PINs are the write lock. Anyone with the kitchen PIN can read, but every write must carry the writer's own 4-digit PIN, which the Firestore rules check against the stored hash (see Staff lock). Per-person permissions (add, tick, delete) are still guidance in the page. Items are never hard deleted.
- Changing the kitchen PIN means editing the Firestore rules and re-entering it on every phone.

### Roles, rollover, insights, badges and recipe links

- **Head chef (owner):** signs in with Google at `#/admin` and sees everything: charts and numbers for 7, 14 or 30 days (lines per day, by person, time of day, rolled over most often, sections, weekday load, slow and sticky lines, empty searches), the Team and Waste tabs, the tallies, people and permissions, PIN resets and the badge switch.
- **Sous chef:** no Google needed. Set a person's role to Sous chef in the admin panel. They sign in with their name and PIN like everyone else, and get a "Manage staff" button on the Handy page to add and remove people. The Firestore rules only let a PIN holder change the `people` list of `config/main` (nothing else in that document). Only people listed in `sousIds` (kept in step by the owner panel) may change it.
- **Rollover:** the first person to open today's book writes every line that was not ticked on the last written day (up to 7 days back) onto today, marked "Rolled" (with "x2" and so on for repeats) and sorted to the top of its section. Each rolled line stores `rolled`, `root`, `from` and `rolledFrom`, so the Insights page can show how often and which lines roll over. There is no Yesterday page any more.
- **Urgent:** the ! button on a line pins it above the rest.
- **Start here:** with 4 or more open lines today, a card at the top of the list picks up to 3 to do first: urgent lines, then the longest rolled-over, then lines that usually take 2 hours or more (last 7 days), then the ones waiting longest. Tapping one jumps to it. On phones and tablets the card sits above the lines (`.nb-start-l`); on screens 900 px and wider it sits at the top of the Handy page (`.nb-start-r`) so it does not push the lines down. Only one of the two shows.
- **More lines on big screens (900 px and wider):** the notebook page uses the screen height (the old 780 px cap is gone), the left page is wider than Handy (3 to 2), the add row is one line (item, section, amount, Add), the empty hint line is hidden, and with a mouse (`hover: hover`, `pointer: fine`) lines are 40 px high and section headings 32 px. Phones and touch tablets keep the large rows. On short screens (860 px high or less) the dark top bar is 96 px instead of 132 px. At 1920x1080 about 11 lines show where 5 showed before (mock data with six sections).
- **Usual amounts:** while typing a line, the amounts written for it before show as chips ("Usual amount: 2 tubs"). One-tap adds carry the usual amount when one clearly wins. Amounts are kept in `learned/<item>.qtys`.
- **Waste review note:** the latest "change for the next shift" from the last 3 days of waste reviews shows at the top of today's list.
- **Ticked lines leave the list.** Once a line is ticked it disappears from the prep list and shows only under Done today in Handy, so the list stays short. A section with nothing left to do is hidden. When everything is ticked the page says so. Ticking shows a short "Ticked ... Undo" message for mis-taps. The same rules apply as before (the ticker for 2 minutes, head chef and sous chefs any time), now through the Undo button in Done today. The header count ("2 of 4 done"), Progress by section, Copy the list and Print the list still include ticked lines.
- **Add from the recipes.** The button opens a panel that floats over the list, so the list and the add box do not move or shrink. Nothing is listed until you type a name or tap Show all. The list inside scrolls. Escape, Close or adding a recipe closes it.
- **Order list: ordered lines move to the bottom.** On today's order list a line stays in the list for 10 minutes after it is ticked as ordered (so a mis-tap is easy to undo), then it leaves the list and shows under "Ordered today" at the bottom, with the time, who ordered it and an Undo button for the head chef and sous chefs. Every line is in one place only. The list belongs to the day, so it is empty again tomorrow; the By day view still shows any past day in full, and "Everything to order" only ever shows lines not yet ordered. The "2 of 3 ordered" count includes the moved lines.
- **Order list layout.** The "What do we need to order?" box is at the top of the page so it is always in reach. On wide screens (1000 px and up) the page is wider: the list on the left and "Ordered today" on the right, side by side under the add box. On phones everything stacks: add box, list, Ordered today. Everything to order stays a single column.
- **Handy page:** priorities, progress by section, "Usual for a Saturday" (lines on at least two of the last four same weekdays, tap to add), the "Done today" checklist (who ticked what and when, with an Undo button for anyone allowed to undo that tick), copy the list as text, print the list.
- **Ticked lines stay ticked:** a ticked line stays on the list and cannot be unticked by staff, except the person who ticked it within 2 minutes (for a mis-tap). The head chef and sous chefs can always undo a tick. The rules enforce this on the server. Each new day starts a fresh list (only unfinished lines roll over), so old ticks are never in the way.
- **Weekly badges:** the top 3 ranks for ticked lines over the last 7 days show above the notebook. The owner can switch them off.
- **Recipe links:** hand-written lines link to recipe cards by matching words against card names and short names (`matchRecipe` in `js/prep.js`). A line that could mean several cards links to none.

### Undo and second taps (October 2026)

- **Remove always has Undo.** Removing a prep line, an order line or a wastage entry shows "Removed ... Undo" for 9 seconds. The head chef and sous chefs can also get a line back later: Show removed on the prep list and the order list, and Put back on removed wastage entries.
- **A second tap for anything hard to take back.** The first tap changes the button to "Tap again...", a second tap within 4 seconds does it, and left alone it goes back to normal. This covers Reset PIN, Remove a person (admin People tab and the sous chef's staff list), Remove a note, Remove minutes, Publish minutes ("Tap again to publish to 14 staff"), Cancel on minutes or a note with unsaved writing, leaving the staff list with unsaved changes, and "Use a different kitchen PIN" on the name screen (it used to be "Change kitchen PIN" and forgot the PIN in one tap).
- **Notes popup.** Only Got it (or a link in the note) counts as read. Tapping outside the popup or Escape just closes it: the bell keeps its dot and the popup comes back after 15 minutes, so a stray tap during service cannot dismiss a safety or allergen note.
- **Toasts on phones** sit above the bottom tab bar instead of covering it, and their Undo button is full size.
- The admin People tab says Remove (not Delete), the same as the staff list.

### No signal and failed saves (October 2026)

- **Not sent yet.** With no signal, Firestore keeps every change on the phone and sends it later, so the page looks saved while other phones cannot see it. The prep pages now show a strip at the top: "No signal" when the phone is offline, and "Not sent yet" when changes have waited more than 3 seconds for the server. It goes away by itself once everything is sent. It only counts this phone's own writes: no reads, no polling.
- **Nothing typed is lost.** If a new prep line, order line or wastage entry cannot be saved, what was typed goes back into the box. A refused write (usually because the head chef reset that person's PIN) sends them to their own PIN screen, and the line is still in the box after they sign in. Other errors stay on screen for 12 seconds with an OK button.
- **Self-updates wait for unsaved work.** The automatic update (and the 04:00 refresh) no longer reloads while something is half written in the prep pages: a line, an order, a wastage entry or review, a note, minutes, the staff list, or changes still waiting to send. Before, it only waited while the cursor was in a box. `LK_PREP.unsaved()` in `js/prep.js` decides.
- The admin "Add several names" box keeps its text when the page redraws (it used to empty itself during service).

### Lists and buttons (October 2026)

- **Full-size targets.** Every button on a prep line (tick box, !, recipe, remove), the tick boxes on the order list, Show removed, Undo, Not you? and the admin permission tick boxes are at least 44 px, with the same look as before. On a prep line the three buttons sit together on the right in the same place on every line, and Urgent and Rolled flow with the text.
- **Lists do not jump.** A line ticked on this phone stays where it is, struck through, for 3.5 seconds before it moves to Done today, so a second tap cannot hit the next line. On the order list an ordered line keeps its place for its 10 minutes instead of jumping to the bottom.
- **Every add and tick says so.** Typed lines, Add from the recipes and the one-tap chips (Usual, Regulars, Due today) show "Added Mise onions to Larder" with Undo (the person who added a line may take it back). The order list shows "Ordered Milk" with Undo, also for a tick in Everything to order (which marks every line for that item), and "Added ... to the order list" with Undo. The order regulars row now says "Tap to add".
- **Empty section tab.** A section tab with everything ticked says "Nothing left to do in Grill" instead of showing a blank page.
- **Phones.** "Write a line" under the date on the prep list goes straight to the add box at the end of the page. Pressing Enter in Section moves on to the line. The phone keyboard shows Next or Done on the add boxes.
- **Wastage.** When Log it finds something missing, the cursor goes to that box (or the reason button), and after a good entry it goes back to "What was wasted?". Tab stays inside the reason sheet.
- **PIN screens** name the page they open ("Open the order list"). When the two new PINs do not match, "Type it again" is emptied and gets the cursor. On the minutes, Enter signs once the PIN is right.
- Closing "Add from the recipes" puts the cursor back on its button. The recipe link on a line is read out as "Open the Coconut Laksa card".

### Wastage log

- `#/waste` is the Daily Wastage Sheet on the phone: section, item, amount and unit (g, kg, L, portions, pieces), reason (prep waste, expired stock, cooking fault, returned, excess production), action or how to stop it happening again. Time and name are added by themselves. Items logged twice or more in 14 days show as one-tap chips.
- **Phone chip patterns:** on phones, long choices never fill the page. Unit is one segmented control row. Reason is one button that opens a bottom sheet ("Why was it wasted?", each reason with a one-line hint; closes on pick, Cancel, the backdrop or Escape). Suggestion chips (Logged often, Handy chips, usual amounts, order regulars) are single sideways swipe rows with a fade. Big screens still show all chips.
- **Big screens:** the Wastage and Orders pages are one tall form page (`.nb-page.o-page`), not the fixed-height prep notebook, so they grow with their content. Before this, the form on a big screen spilled out of its page and its unit and reason buttons, the action box and the "Log it" button overlapped the end-of-day review.
- The end-of-day review (main avoidable waste, prep or ordering change for the next shift) is saved per day in `waste/<date>`; lines live in `waste/<date>/lines`.
- Anyone signed in can add. Only the head chef or a sous chef can remove a line (enforced by the rules). Staff see today only.
- Admin panel, Waste tab: totals, by reason, wasted most often (with how often the same item was on the prep list, to spot over-prepping, and a suggestion per main reason), by weekday, who logs, and the reviews.

### Layout and admin, round three

- **One top bar everywhere:** every page has the same dark top bar as the landing page: "Kitchen Book" on the left (goes home), Recipes, Prep, Orders and Waste in the middle, Admin (key) and Settings on the right. The phone tab bar is dark on every page too.
- **Pass search:** typing in the search box shows only the dishes and batches that match, and hides empty shelves. The count reads "5 of 114 match". Clearing the box brings everything back. (The allergen lens still fades instead of hiding.)
- **Recipes:** the recipe count sits above the search box and the Pass / Tiles switch sits right next to it.
- **No flash when opening Prep, Orders or Wastage:** the app connects to the prep book in the background on any page, and while it connects the page shows its own name with "Loading..." instead of a generic prep book card.
- **Admin filters:** a filter bar on Insights (time range, section, person, weekday), Team (time range) and Waste (time range, section, reason, weekday). Filters are kept on the device. Numbers are compared with the same number of days before (60 days are read).
- **Admin Insights:** tiles with the change on the period before, "What stands out" (plain sentences worked out from the numbers), a calendar of every day (share ticked, lines written or rolled over; tap a day to open it in the prep book), "When the work happens" (weekday by hour, busiest slot outlined), and the other charts as cards in two columns on a big screen. "Who is writing and ticking" moved to Team, "Sections people have written" to Learning.
- **Insights is in six numbered sections** with a jump bar: 01 Overview (tiles and What stands out), 02 Days (calendar and lines each day), 03 Timing (weekday by hour, time to tick by section, time of day), 04 Sections and people, 05 Problem lines (slow and sticky, rolled over, proofreader), 06 Recipe book (empty searches, cards opened).
- **Print or save as PDF** (Insights, Team and Waste): prints the tab on A4 with the menus and filters left off, a header with the time range and print time, each Insights section on its own page and hidden tables opened. Choose "Save as PDF" in the print window to keep a file.
- **Download CSV** (opens in Excel or Google Sheets): Insights gives every prep line in the range with the filters applied (date, section, line, amount, who wrote and ticked it, times, minutes to tick); Waste gives every waste entry; Team gives one row per person.
- **Admin Waste:** a calendar of entries per day (blank days stand out) and reasons by weekday, both following the filters.

### Suggestions and data, round two

- **Admin has one home:** the key button at the top right of every page, next to Settings. It is filled in on a phone or computer where the head chef is signed in with Google (`lk.admin` on the device), and outlined everywhere else (tapping it then asks for the head chef's Google sign-in). There are no other Admin links.
- **No Home button in the menus:** tapping "Kitchen Book" goes to the landing page. The menus are Recipes, Prep, Orders and Waste.
- **Past days read once a day:** the last 14 days of prep lines are read once a day per phone and kept on the phone (`lk.past`); today comes from the live list. (Before, every phone re-read 7 days every 5 minutes, which could use up the free daily read limit.) Badges, usual amounts, Start here, Due today, the pace card and the close-out nudge all work from it.
- **Due today** (Handy page): made on 3 or more of the last 14 days, about every 4 days or more often, and the usual gap has passed. One tap adds it with the usual amount and section.
- **Pace** (Handy page, head chef and sous chefs only): share ticked now against the usual share by this time of day (same weekday when there are 2 or more, otherwise all days).
- **Closing soon** (top of the list): from an hour before the usual time of the last tick, open lines that will roll over, a Log waste button, and Hide for today.
- **Stuck lines** (Handy page, head chef and sous chefs): lines rolled over 3 or more times, with Urgent and Remove.
- **Waste warnings:** writing a prep line that was logged as excess or expired waste 2 or more times in 14 days shows a hint; writing an order line that was logged as expired stock shows "Order a little less?".
- **Order list:** "Usually ordered on a Sunday or often" chips from the last 14 days (2 or more of the same weekday, or 5 or more days). One tap adds it with the usual amount.
- **Wastage, last 7 days** (head chef and sous chefs): every entry grouped by day with totals, most often, and reasons. The admin Waste tab adds an each-day table (entries, amount, review) and an Open the wastage log button.
- **Recipe cards opened:** each card opened is counted on the phone (`lk.views`, no names) and sent to `views/<recipe>` once someone is signed in. Insights shows the most opened cards and the ones not opened yet. Cooking-fault and returned waste shows how often the card was opened.

### Insights added in October 2026

- **Insights tab:** load by weekday and section (lines written or rolled over, average per day), slow and sticky lines with a suggestion each, and recipe book searches that found nothing.
- **Team tab:** a skills matrix (lines each person ticked per section) with cross-training pairs, and section habits now based on ticks (where people actually worked) with writing as the fallback. The order list part adds typical time from written to ordered, lines waiting over 3 days and standing order candidates (3 or more days in 14).
- **Recorded for later:** when a line was removed (`deletedAt`), who marked it urgent and when (`urgentBy`, `urgentAt`), removal time on order lines.
- **Empty searches:** a recipe search that finds no card at all is queued on the phone (`lk.miss`) and sent to `misses/<slug>` once someone is signed in to the prep book on that phone. The owner can hide one once the card is written.

### Big lists in the admin area (October 2026)
Every admin list that can keep growing now uses one shared layout (`lvHTML` in `js/prep.js`, styles at the end of `css/app.css`):
- **Tools appear once a list is long enough** (usually 8 or more rows): a search box, filter chips with a count on each, and a Sort choice. A short list stays plain.
- **Show more**: lists open at one page (7 to 20 rows depending on the list) with "Show N more", "Show all" and "Show fewer". The count line says "Showing 15 of 26 people".
- **Wide screen** shows a table. **A phone** shows each row as a small card, so nothing needs swiping sideways.
- **Search, filter, sort and rows opened are remembered per list** until the page is closed. Typing in the search box only redraws the rows, so it keeps its focus.
- **Print or save as PDF** and the minutes print show every row, not just the first page.
- Lists moved onto it: People and the sous chef's Staff page, Learned items (all of them, not the top 40), Notes (Coming up and Past notes, with Load 30 older notes), the Minutes register (with an Older minutes picker beyond the latest six), Waste (wasted most often, each day, who logs, end-of-day reviews), Orders (standing candidates, by day, by person, ordered most often), Team (section habits, who writes), Insights (slow and sticky lines, proofreader, recipe cards opened, searches that found nothing).
- Adding a person clears the search and filter and opens every row, so the new row is on screen and focused.
- Charts, heatmaps and the skills matrix are not lists and are unchanged.

### Daily notes

- The head chef or a sous chef writes short notes for the day. The first time the book is opened after 10:30 on a day with a note, they show once as a popup ("Today's notes") with a Got it button. Escape or tapping outside also closes it. It does not pop up while someone is typing in a field; the bell shows a dot instead and the popup follows once typing stops. A book left open on the pass pops it at 10:30.
- **Bell in the top bar** (next to Admin and Settings). Hidden until there is a note for today. It has a dot while the notes are unread on that phone, and opens them again at any time. "Got it" is remembered on the phone only (`lk.note.seen`); if a note is changed later that day, it counts as unread again.
- **Order and tags.** Each note has a tag: Note, Off today, Special, Function, Delivery, Safety or Allergen alert. Safety and Allergen alert show first, in orange. A recipe name written in a note (for example "Barramundi" or "Guinness beef pies") links to its card.
- **Under the notes**, two lines from data already on the phone: the change from yesterday's waste review, and how many of today's prep lines are still to do (with urgent lines). The head chef and sous chefs also see how many lines are stuck (rolled over 3 times or more).
- **Writing notes.** Head chef: the **Notes** tab in the admin panel. Sous chef: **Daily notes** in Handy (prep book), or the Write or edit notes link in the popup. The list comes first: Showing today, Coming up, and Past notes (one query, 30 at most, only when asked). Write a note opens the editor beside the list on a big screen and above it on a phone. Each note shows who wrote it. Edit, Use again (copies the text and tag into a new note, also from Past notes) and Remove sit on every row.
- **Typing on a phone.** The Note box is the first field in the editor and Write a note scrolls it up under the tabs, so the keyboard does not cover it.
- **Faster writing.** Picking a tag starts the note ("Delivery: "), Ctrl+Enter saves, and Use again reuses an old note. A live "How it will look" card sits under the text, and Preview the popup shows the real popup with the unsaved note (it is marked as a preview and does not count as seen).
- **Scheduling.** Text up to 400 characters and a tag. Days are picked on a five week grid: One day (tap a day), Several days (tap the first day, then the last; tap the last day again to take it back), Today, Tomorrow, Reset days, and a date field for anything further ahead. Optional weekdays repeat every week (with no last day it repeats until removed), and Clear weekdays takes them off. Notes can be scheduled ahead of time. Keep prices, PINs and staff names out of notes.
- **Seen count.** When someone signed in with their PIN taps Got it, one small record (`notes/<id>/seen/<day>_<person>`: `day`, `at`, `by`) is written, once per person, note and day. The head chef and sous chefs tap Who has seen it today on a note that is showing, and see the names (one small query, only when asked). Phones where nobody is signed in leave no record, so it is a minimum.
- **Data.** `kitchens/<pin>/notes/<id>`: `text`, `tag`, `start`, `until` (YYYY-MM-DD, last day inclusive), `dows` (0 is Sunday, empty means every day), `removed`, `at`, `upd`, `by`. Notes are never deleted, only flagged `removed`. The rules also allow `notes/<id>/seen/<day>_<person>` (create only, by a person with their own PIN proof, readable by anyone with the kitchen PIN). Publish the rules before relying on the seen count; until then Got it still works and the seen button says it could not check. The rules let only the head chef (Google account) or a listed sous chef (`sousIds`, with their own PIN proof) write, and check the text, tag, dates and weekday list.
- **Reads stay small.** One query for notes that have not ended yet (`until` on or after today), once a phone opens each day, again after 30 minutes away, and once at 10:30 if the book was already open. No live listener and no polling; the once-a-minute check on the page is local only.
- Not built yet: how many phones tapped Got it (a count only, no names).

### Kitchen meeting minutes

- Only the head chef (admin panel, **Minutes** tab, Google account) writes and publishes the minutes in the app, always in one layout in the recipe card style: header (date, start time, location, run by, minutes taken by), attendance, then Safety (orange, first), Decisions, Actions, Menu changes, Dates ahead and Other. Recipe names in Menu changes link to their cards. Keep prices, PINs and private details out.
- **Who was there** sits after the writing sections, folded into one line (for example "14 of 14 set: 12 present, 2 apology"). Tap it to open the name chips: Mark all present, then tap a name to change it (Present, Apology, Absent). The guests line is always visible. The form order follows the document: Safety, Decisions, Actions, Menu changes, Dates ahead, Other, then who was there. **Actions** have who, by when and status. Open actions from the last meeting carry over (Done, Carry over or Drop). Overdue actions show to the head chef and sous chefs only (in the register).
- **Drafts and publishing.** Save draft, Preview, then Publish and start sign-off. A change after publishing (Change as a new version) makes version 2 and everyone signs again. Earlier versions are kept in `hist`. Minutes are never deleted, only flagged `removed`.
- **Reading and signing.** Staff open `#/minutes` (bell in the top bar, or the "Minutes not signed yet" nudge at the top of the Prep page) and sign with their own 4-digit PIN. Present staff sign "I attended and have read and understood these minutes." Apology and absent staff sign "I have read and understood these minutes." The bell and nudge go away once the person has signed. Minutes stay readable in the app for 90 days.
- **Register** (admin Minutes tab and the sous chef page): per meeting and version, the counts and chase list first and the full table behind Show everyone (it always prints), late (more than 3 days after publishing), a chase list (names as short pills, with one line for how many days since publishing), overdue actions, Print or save as PDF (A4) and Download CSV as proof. Sous chefs (Jimmy included) see the same register, chase list and print or CSV under **Minutes register** in Handy, but cannot write, change or remove minutes.
- **Data.** `kitchens/<pin>/minutes/<id>`: `no`, `v`, `status` (draft or published), `date`, `start`, `loc`, `chair`, `taker` (staff ids), `guests`, `att` [{id, st}], `decisions`, `menu`, `safety`, `dates`, `other` (one line per item), `acts` [{what, who, by, st, carried}], `next`, `pubAt`, `removed`, `at`, `upd`, `by`. `minutes/<id>/hist/<v>` is the frozen copy of each published version. `minutes/<id>/signs/<v>_<staffId>`: `v`, `st`, `at`, `by`. Staff ids only, no names, are stored.
- **Rules.** Only the head chef (Google account) writes minutes and `hist` copies, with size limits. A sign-off can only be created, by the person themselves (own PIN proof, document id must match their id), for the current published version, once. Sign-offs and `hist` copies cannot be changed or deleted. Tested on the Firestore emulator.
- **Limit.** Drafts are hidden by the page only. Anyone holding the kitchen PIN could read one with a script.
- **Reads stay small.** One query for minutes from the last 90 days, once a day per phone (and after 30 minutes away), plus one read per open minutes for the person's own sign-off. The register reads the signs of the meeting being viewed. No listener, no polling.
- Not built yet: viewing old versions in the app (they are stored), reminders outside the app.

### Smart prep list

- Every line written or picked is counted in `kitchens/<pin>/learned/<item>`: total uses, typed versus picked, uses per weekday (`dow`, 0 is Sunday) and per section. Rolled-over copies are not counted.
- While typing, matching learned items (and batch and component recipe names) show as tap-to-fill chips under the box. A learned item also fills in its usual section when the section box is empty.
- The Handy page shows "Usual for a <weekday>" (written on at least two of that weekday) and "Regulars" (4 or more uses, `REGULAR` in `js/prep.js`) as one-tap adds.
- Owner insights: items learned, regulars, share added by tapping a suggestion, most written items, a weekday heat table, and a manage table to hide typos. The list also reads past lists by itself, up to 90 days back (see below).

### Proofreader

- Every new written line is tidied (spacing, punctuation, capital first letter) and spell-checked before it is saved, in the browser, no service needed.
- A word is only corrected when it is not already known and exactly one known word is one slip away (two for long words). Known words come from recipe names and ingredients, a kitchen word list in `js/prep.js` (`KITCHEN`), and everything the list has learned, so new dish names stop being touched once they have been written.
- A corrected line keeps what was typed in `orig`. A toast offers Undo, and an undone word is left alone on that device. The owner sees the latest corrections in Insights.

- **Sections are spell-checked too.** A section one slip away from a section already in use (two for long names) becomes that section, so "Fryre" goes under "Fryer" instead of starting a new one. Singular and plural are the same section ("Salad" goes under "Salads"). A real word is never swapped for a different section ("Pans" stays "Pans" even when "Pass" exists). Otherwise longer words are checked like a line and the first letter becomes a capital. It happens when you leave the section box (toast with Undo) and again when the line is saved; an undone section is left alone on that device (`lk.prep.keepsec`). The wastage log's section box works the same way.

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
- **PIN entry.** The kitchen PIN and a person's own PIN go in by themselves as soon as the fourth digit is typed. When choosing a new PIN, the cursor moves to "Type it again" after the first four digits and sends after the second four. Wrong tries still count toward the lock.
- **Proofreader.** It runs on prep lines, order lines and wastage items. It never changes a word it already knows, the singular or plural of a known word, a past tense of one, or a word with an accent (jalapeño). Orders and wastage now tell the writer what was corrected (prep still has the Undo button). Add everyday words to `KITCHEN` in `js/prep.js` when it wrongly changes one.
- **Desktop idle lock.** On a computer (mouse and keyboard), 7.5 minutes with no mouse, key or touch sends the prep pages back to the person's own PIN screen. The kitchen PIN is not asked again. Phones and tablets are not timed. A page that was left closed for longer than that also asks for the own PIN when it opens. It uses a timer and a timestamp on the device (`lk.prep.seen`), no reads or writes. Change `IDLE_MS` in `js/prep.js`.
- Each write sends the writer's id (`by`) and, in the same batch, `proofs/<id>` with `tok` (a hash of the person's own PIN) and `at` (a server timestamp). The rules compare `tok` with `staffpins/<id>.hash`, which nobody can read, using `getAfter`, and require `at` to equal the request time, so a proof left over from an earlier write cannot be reused. A wrong or missing PIN is refused by the server.
- The first person to set a PIN for a name claims it. The owner can reset it (Reset PIN) and it is chosen again.
- Limits: someone with the kitchen PIN could still guess a 4-digit PIN online by script (the page makes people wait after 3 wrong tries, 1 to 30 minutes and kept on the phone, but a script skips the page; only App Check or a paid server function can truly rate limit), and add, tick and delete rights per person are checked in the page only.

### Changing the kitchen PIN

1. Add a second copy of the `kitchens/<pin>/...` rules for the new 4 digit PIN to the live rules (see `firestore.rules`).
2. Owner panel, "Move to a new 4 digit kitchen PIN": copies the people, prep lines, order lines, wastage and reviews (400 days), learned items, empty searches, tallies and PIN fingerprints to the new PIN, then switches that device over.
3. Everyone else is asked for the PIN next time they open the book once the old rules are removed. Remove the old PIN's rules last, so nothing is cut off while moving.
