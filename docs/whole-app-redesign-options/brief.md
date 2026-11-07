# The whole book, quicker to read. Options

Requested 7 November 2026 by the head chef: "Check them all out and grab benefits for us. Rewrite all design and function CLAUDE.md files necessary to achieve a beautiful merge of all those apps and create a new design for the whole app. Make up 3 different designs and give me your recommendations. I want to keep all the current functionality, but under a new scope using these apps as a role model. I want to maintain our colours and stuff, but I am open to a redesign where it makes sense. Show me designs." The seven apps: Linear, Things 3, Airbnb, Todoist, Flighty, Duolingo and Headspace.

**Status: chosen by the head chef on 8 November 2026 (see Chosen); not built.** The build runs in eight grouped steps (see Build), each its own pull request, starting when the head chef says go.

Role-based analysis, not research with real staff: the eleven reviewers were fresh agents given the proposal, the screenshots and the briefs in `.claude/skills/service-council/reviewers.md`.

## What the seven apps do well, and what fits a kitchen

Checked on 7 November 2026 against each maker's own pages where they exist (sources at the end).

| App | What it does well | In the book | Left out, and why |
| --- | --- | --- | --- |
| Linear | The 12 March 2026 refresh gave every page the same header, navigation and view controls, made navigation recede so the work stands out, and cut borders and icon sizes | One page frame: the same bar for date and filters, the main action in the same place with the same words | Dense rows, small text, keyboard-only flows: wrong for a wet phone |
| Things 3 | Today apart from Upcoming; details tucked away until needed; one add in one place | One row per line, the rarer actions behind a tap; Coming up for the next days | Drag to place a new line: fiddly with wet hands |
| Airbnb | Reservations redesigned (20 May 2026): times, private notes and alerts gathered on the booking | A function on one card: what is due next, when, where, guests, dietary, rounds, notes, print and cancel | Photos and selling |
| Todoist | Quick Add opens clean and shows details only once you type; defaults are shown | Your usual items first, one tap fills every field the book knows (already a coding rule) | Reading typed words to set the section or unit: the book never guesses (round 1) |
| Flighty | Apple Design Award 2023 (Interaction): departure-board clarity, big times for what matters now, a screen that changes with the moment | A now and next board: your break, the next cut-off with time left, the next round | Maps, constant movement |
| Duolingo | Every step answers at once; progress you can see | Section counts and bars that fill as lines are ticked | Streaks, points, stamps, animations: no value in service, more motion code (round 1) |
| Headspace | A kind voice and plain words for unfamiliar things | Words on actions instead of symbols; one name for one thing everywhere | Onboarding cards and illustrations: no kitchen complaint behind them yet (round 1) |

## Today

Measured on 7 November 2026 in the click-test stand-in, 14:00, on a 390 x 844 phone (1280 px for the laptop), six prep lines and two order lines.

- **Prep shows 2 lines on a sous chef's phone, 3 on a cook's**, fully above Add a line. Each prep line is 108 to 134 px tall: the words on one row, then On it, !, Recipe and ⋯ on a second row under every line. An order line is 51 px. The date row, the section chips and the notebook heading take about 270 px before the first line (`previews/today-prep-390.png`).
- **Home is five or six dockets that repeat the six tabs** in the tab bar (`previews/today-landing-390.png`). It reads nothing of its own.
- **The chef hat holds 11 tiles and Settings**, daily jobs (Functions, Delivery received, Supplier order, Today's team) beside monthly ones (`previews/today-hat-390.png`).
- **Functions** gives every empty day a heading, a grey Print prep sheet and "None." (`previews/today-fn-390.png`).
- **Words differ for one thing:** Delivery arrived on Orders, Delivery received in the hat; Add to the order on Orders, Add a line on Prep; a lone ! for urgent.
- **What the home page already holds** (stand-in, read bill on `#/` for a cook and a sous chef): today's prep listener, the functions listener, today's team record, `config/main` (with the cut-off times), pings, direct pings, minutes, guides and the person's drinks. Not orders, wastage or transfers: those start when their page opens.
- Main jobs: add a prep line 1 tap, tick 1 tap, On it 1 tap, find a recipe 1 tap (Recipes tab).

## Round 1: should we build it?

Five fresh reviewers, 7 November 2026, from the proposal and the screenshots above.

**Verdict: Build smaller (4 of 5).** The cook, the head chef, the new starter and the keeper of the book said Build smaller; the skeptic said Don't build (the whole-app pass) and fix the prep rows.

- All five named the same measured problem: the prep line. "Make each prep line one row, aim for 6 lines visible at 390 px, count before and after" (cook, head chef, skeptic, keeper).
- Cut: Quick Add that reads typed words to guess the section or unit (head chef, skeptic, new starter, keeper: "never guess"); celebrations, stamps and onboarding cards (no kitchen complaint, more motion code); anything that adds a listener to the home page (keeper).
- Keep: words on every action, the same frame and the same Add in the same place, the same name for one thing on every page (new starter); Recipe on the line, not hidden (new starter); fold the date and chips into one bar (cook); sort the hat so daily tiles come first, fold empty function days (head chef, skeptic: cheap).
- Disagreement, home: the head chef and the new starter want a "what needs me now" home from data the phone already reads; the skeptic would simply drop the landing; the keeper warns it must not add reads (measured above: it need not).
- Disagreement, size: the skeptic would stop after the prep rows; the others would add the shared frame and words. Everyone wants few pull requests: each merge reloads phones and spends reads.
- Not known: the screenshots show a quiet day. The cook asked for a full rail with long names; the designs use 14 lines in 5 sections with long names.

## In every design (the smaller core)

1. **One row for each prep line.** Tick, words and amount, On it, ⋯. Tick and On it stay one tap. Urgent, Change amount, Move section and Remove go behind ⋯ with words (2 taps; Urgent was 1 through the ! button, which new starters tapped without knowing what it did). Recipe stays one tap: its own small button on lines with a recipe. Urgent shows as a small URGENT tag and a black rule at the left, as now. *Corrected after the coverage check (below): this first put Recipe as a word in the small line, but the words and the small line tick the line (since 5 Nov 2026), so a link there would tick by mistake.*
2. **One bar for the day and the sections:** Back, Today and Forward in the same bar as the section chips, which scroll sideways and fade at the edge.
3. **The main button in the same place, in words that name the job:** Add a line, Add to the order, Log waste, Log a transfer. One name for one thing: Delivery received (never Delivery arrived), Urgent (never a lone !). *Corrected after the coverage check: this first said Add a line on every list.*
4. **The chef hat starts with today:** Every day (Functions, Delivery received, Supplier order, Today's team, Kitchen mail, Shift pings) then Now and then. The same tiles for the same roles.
5. **Functions fold empty days** into one line; Print prep sheet only where there is a function.
6. **No new reads, listeners, rules or saved fields.** Nothing new moves on screen.

## The three designs

### A. Tidy rows (changes the least)

Only the core. Home keeps its dockets, the notebook keeps its handwriting (Caveat) for line words, the laptop keeps its two-page notebook with Handy.

`previews/a-prep-390.png`, `a-dots-390.png` (⋯), `a-hat-390.png`, `a-fn-390.png`, `a-prep-1280.png`.

- For: prep from 2 lines to 6 on a sous chef's phone, the problem every reviewer named; least to relearn; two pull requests.
- Against: home still answers "where do I go", not "what needs me now"; Urgent and Move section take a second tap; leaves most of the seven apps' ideas unused.

### B. Now and next (rethinks the flow)

The core, then home becomes a board (Flighty): your break and when you are back, the next cut-off with the time left, the next function round, pings and minutes to read; then prep by section as bars (Duolingo's visible progress); then Coming up for the next days (Things). It follows the day: at 14:20 the cut-off leads; at 18:10 the rounds come first and the closed order shows who did it. The dockets go: they repeat the tab bar, which keeps every page one tap away. A function becomes one card like a booking (Airbnb): what is due next, when, where, guests, dietary, the rounds as a timeline, notes, and the function bar with Run sheet, Prep sheet and Cancel function at its right end (26 Oct 2026). Prep as in A. The laptop home shows the board and Coming up beside prep by section and who is on today.

Built only from what the home page already reads (above). Orders, wastage and transfers counts are left out because they would be new listeners. Work pages round 2 has a wall board for the shared tablet (R4, `docs/work-pages-design-options/brief.md`): the home board is per person and must share its pieces, not copy them.

`previews/b-home-390.png` (14:20), `b-service-390.png` (18:10), `b-fn-390.png`, `b-home-1280.png`.

- For: answers "what needs me now" in one glance; brings cut-offs, rounds and breaks out of the hat with no new reads; functions read like a booking.
- Against: a new home to learn and the dockets go; the board must change the moment a cut-off or round changes (it reads live data already, but a test must prove it); four to five pull requests.

### C. Straight to work (removes the most)

The core, then take things away. No home page: the book opens on your page (Prep for a cook, your last page for a chef, Recipes when signed out) and the tab bar is the only menu. No ⋯: tap the words and the line opens in place with Urgent, Recipe, Change amount, Move section and Remove (Things); On it stays on the row. The chef hat becomes a plain list with a Find box. Line words in print (Barlow) instead of handwriting, for reading at arm's length; handwriting stays for titles and counts. On the laptop the Handy page goes (Done today folds into the list) and / finds a page, recipe, line or setting (Linear).

`previews/c-prep-390.png` (one line opened), `c-more-390.png`, `c-prep-1280.png`.

- For: one page and one button less on every line; print reads further away than handwriting (the cook's worry in round 1); Find saves hunting on the laptop.
- Against: loses the dockets and the handwritten lines that make the book the kitchen's own; tapping the words to open a line is hidden; two ways in to explain (signed out and signed in).

### Side by side

Counted in the previews on a 390 x 844 phone with 14 prep lines in 5 sections (a closed list, the measurement in `index.html`, `LK_REDESIGN.visible()`). Today counted in the click-test stand-in.

| | Today | A Tidy rows | B Now and next | C Straight to work |
| --- | --- | --- | --- | --- |
| Taps to tick a prep line | 1 | 1 | 1 | 1 |
| Taps to add a prep line (then type) | 1 | 1 | 1 | 1 |
| Taps for On it | 1 | 1 | 1 | 1 |
| Taps for Urgent on an existing line | 1 | 2 | 2 | 2 |
| Taps to a recipe from a prep line | 1 | 1 | 1 | 1 |
| Prep lines fully visible at 390 px, sous chef | 2 | 6 | 6 | 7 |
| What needs me now, on home | Nothing | Nothing | Break, cut-off, round, pings, sections | No home |
| Navigation levels to a supplier order | 2 | 2 | 2, or the board row | 2 |
| New reads, listeners, rules | None | None | None | None |
| Pull requests | | 2 | 4 to 5 | 4 |
| Relearning | | Low | Medium (home) | High (no home, no ⋯, print words) |
| Risk | | Low | Medium (the board must stay right) | Medium (hidden actions) |

## Round 2: scores

Six fresh reviewers (the five from round 1 and the kitchen screen designer), 7 November 2026. Each saw all three designs and today's screens, ranked them and scored each from 1 to 5. **Every reviewer ranked A first.**

| Reviewer | A | B | C | What they would take into the best |
| --- | --- | --- | --- | --- |
| Cook mid-service | 4 | 3 | 2 | C's print words: handwriting is slow at arm's length and long names wrap. A bigger Recipe target |
| Head chef | 4 | 3 | 2 | B's function card, with Cancel moved away from the print buttons. A fade on the chip row |
| Skeptic | 4 | 2 | 2 | Build A and nothing more. Print words only after a try on the line. Drop hat badges that need reads |
| New starter | 4 | 3 | 2 | C's print words and plain-list hat ("Now and then" is an idiom). B's function alert, Cancel moved |
| Keeper of the book | 4 | 2 | 2 | B's function card. Prove every hat badge in `tests/read-budget.test.js` or drop it |
| Kitchen screen designer | 4 | 3 | 2 | B's function card, C's plain-list hat. 44 px for ⋯ and Recipe, a bigger URGENT tag |
| **Total** | **24** | **16** | **12** | |

- **C's open-in-place line is a mis-tick waiting to happen** (five of six): a wet tap on the words opens a panel of about 170 px and pushes every row below it down, and nothing shows that the words open anything. Remove is one tap inside it.
- **Cancel function beside Prep sheet** on B's card is one slip of a wet thumb away (four of six).
- **B's board must never be wrong.** Two of its lines (a delivery received, an order done by Sam) needed reads the home page does not make (head chef, skeptic, keeper). The countdowns need a minute timer and stand-in clock tests, the kind that already fail on timing (keeper). The section bars look tappable (designer, new starter). The board helps at 18:10, but at 19:30 the cook lives on Prep, not home (cook).
- **A's weak spots:** Urgent goes from 1 tap to 2, with no count of how often Urgent is set in service (skeptic); the URGENT tag is small next to today's black ! (designer); Caveat wraps long names onto two rows (cook, head chef, new starter); the section chips cut off at the edge (cook, head chef, designer); the date box leaves the bar (keeper).
- Disagreement: the skeptic would build A and nothing more; the others would add B's function card. The cook, the new starter and the designer want C's print words now; the skeptic wants them tried on the line first.

**Corrected after round 2:**

- Lines that would need new reads are gone from the drawings: Meat in 07:12 and 3 open on the hat (deliveries and the to-do list are read only when their page opens), the delivery and the closed order on B's board (the deliveries and the cut-off ticks). What is left comes from what the home page already reads (Today, above).
- Guides is not new: it is the book's sixth tab whenever guides are turned on (`featOn('guides')`, `NAV` in `js/app.js`). Today's stand-in had it off. Three reviewers asked.
- The board's small orange is `--bar-accent` `#F08A4B` on `--bar` `#2B2A27`: 5.8 to 1, above AA's 4.5 (the designer assumed `#E2602A`, 3.4 to 1).
- The date box: in the mix below, Today ▾ opens the calendar, so a set day is still two taps.

## Recommendation

**A, with C's print line words and plain-list hat, and B's function card with Cancel moved away from Print.** Drawn in `index.html` (Recommended) and `previews/r-*.png`.

All six reviewers ranked A first: it fixes the one problem every reviewer named, prep from **2 to 6 lines** on a sous chef's phone with 14 lines and long names, with no new reads and no rules change. Each borrowed piece answers a complaint a reviewer made: print words for arm's length (cook, new starter, designer), a list with words instead of a grid of tiles (new starter, designer), one card for a function night (head chef, keeper, designer, new starter).

Also in the mix, from round 2: a bigger URGENT tag, a 44 px ⋯, Open the recipe in the ⋯ sheet (so Recipe has a 44 px way in), Today ▾ opens the calendar, and Every day and More instead of "Now and then". B's now and next home stays on the shelf: worth a second look once the rows have been used in service, built only from what the home page already reads and with stand-in clock tests.

| | Today | Recommended |
| --- | --- | --- |
| Taps to tick, add, On it, Recipe from a line | 1 each | 1 each |
| Taps for Urgent on an existing line | 1 | 2 (still 1 in Add a line) |
| Prep lines fully visible at 390 px, sous chef | 2 | 6 |
| Taps to cancel a function | 1, then Undo | 1, then Undo (moved, not added) |
| New reads, listeners, rules, saved fields | | None |
| Pull requests | | 3 |

Build in three steps, one pull request each, in the release windows:

1. **Rows and words.** One-row lines on Prep, keeping every marker a line shows today (see Every feature, checked); print words on the list lines of Prep, Orders, Wastage, Transfers and the wall board; the day bar with Today ▾; Delivery received on Orders and in supplier groups. `css/app.css`, `js/prep.js`; the tests that count lines and header heights (`tests/prep-a.test.js`, `tests/todays-team.test.js`), `tests/prep-wall-board.test.js`, `tests/design-patterns.test.js` and the new A prep line pattern.
2. **The hat as a list.** Every day first, then More; status only from what the phone already holds. `js/app.js`, `tests/chef-menu.test.js`, `tests/hat-counts.test.js`, `tests/read-budget.test.js` unchanged.
3. **Functions.** Empty days folded into one line; the function sheet laid out as one card, keeping its banners, what goes out next, every round with its tick, the kitchen comment, notes, changes, Print function and Change this function; Cancel at the end of the card. `js/functions.js`, `tests/functions.test.js`, `tests/function-cancel.test.js`, `tests/function-print.test.js`.

## Questions for the head chef

1. Go with the recommended mix, A alone, B, C, or another mix?
2. Line words in print (Barlow), with handwriting kept for titles and counts? Or keep the handwriting?
3. Move Cancel function from the right end of the function bar (your 26 Oct 2026 placement) to the end of the card, away from Print?
4. Urgent on an existing line from 1 tap to 2 (behind ⋯)? It stays one tap in Add a line.
5. B's now and next home: later, or not at all?

## Every feature, checked

The head chef asked on 7 November 2026: "Does our redesign consider every other feature across the board and codebase? Do we cover orders, wastage, transfer, guides, shift pings, today's team, drinks run, meeting minutes, functions, delivery received, admin panel, recipes and drawings, chef to-do, supplier order, manage staff and everything else?"

It did not, at first. The designs drew Prep, the chef hat, Functions and the home page, and left the rest unsaid. So every route (`parseRoute()` in `js/app.js`), every chef hat entry for every role (`whoMenuOpen()`), the admin rooms, the sheets and the bands were checked against each design in the code and in the stand-in, and every other page was photographed today (`previews/today-*-390.png`, `today-admin-*-1280.png`). **Nothing is removed in the recommended mix.** Most pages do not change at all: they gain only a row in the hat list.

What the check changed:

- **Recipe on a prep line** is its own small button. The words and the small line under them tick the line (`rowHTML()`, since 5 Nov 2026), so the Recipe link drawn there would have ticked by mistake. Open the recipe is in ⋯ as well.
- **A prep line keeps everything it shows today:** the Start here number, Urgent, Rolled, Waiting since or Usually by, Double up, Not sent, and who is on it in the box and the small line. The first drawings left these out; `previews/r-prep-390.png` has them, and still shows 6 lines.
- **On the laptop** every action stays in the line, as today, now in words (`previews/r-prep-1280.png`).
- **Words name the job:** Add a line, Add to the order, Log waste and Log a transfer stay. Only Delivery arrived (the Orders chip and the supplier groups, `js/prep.js`) changes, to Delivery received.
- **Print words**, if chosen, go on every list line of Prep, Orders, Wastage, Transfers and the wall board, not Prep alone (`previews/r-orders-390.png`, `r-waste-390.png`). Titles, counts and the empty notes stay handwritten.
- **The function card** is today's function sheet (`sheetHTML()` in `js/functions.js`) laid out again. It keeps the banners (cancelled, rescheduled, draft), what goes out next, every round with its tick, the kitchen comment, service and dietary notes, the changes, Print function and Change this function; Print prep sheet stays on each day of Functions and Service (`previews/r-fn-390.png`, `r-fn-end-390.png`). B's first card had dropped the round ticks.
- **The hat list** keeps your day under your name, My section for staff and leads, Admin panel on the admin device, and the signed-out and functions-only versions.
- **B and C missed more:** both remove the dockets the seasonal celebrations draw on (`docs/celebration-options/brief.md`); B's board overlaps the function band, the cut-off reminder bar, the start of shift sheet, the wall board and the admin To do; C's tap on the words to open a line clashes with tapping the words to tick.

| Feature | Where | Recommended mix | If B or C were chosen | Tests that guard it |
| --- | --- | --- | --- | --- |
| **Home** | `#/`: dockets, the functions card, celebrations, install card; signed out sees Recipes only | No change | B: the board replaces the dockets. C: no home; opens on your page, Recipes when signed out. Both lose the dockets the celebrations draw on | Signed-out view, celebrations on Home (`phone-first`, `seasonal`) |
| **Recipes** | `#/recipes`: Pass and Tiles, search, filters, Specials, the allergen switch | No change | C: / on the laptop also finds recipes (a second way in) | Search and filters (`recipes`, `recipe-filters`) |
| **A recipe card** | `#/r/<id>`: chapters, allergens and lens, drawings, the trail, Change this recipe | No change. From a prep line: the Recipe button (1 tap) or Open the recipe in ⋯ | Same | Trail and Back (`back-navigation`) |
| **Recipes & drawings** | `#/manage`, the editor, the drawing studio, multipliers | A row in the hat list. Nothing inside changes | Same | Editor and studio (`manage`, `draw`, `recipe-multiplier`) |
| **Prep** | `#/prep` | One row a line, print words. Keeps: tick by the box or the words, On it, Start here numbers, Urgent, Rolled, Waiting since and Usually by, Double up, Not sent, Change amount, Move section, Remove and Put back, Undo, Done today, Set today's team, past days for chefs, Tonight for tomorrow, function platter lines, the Add sheet with your usual lines. Urgent on a line moves from ! to ⋯ (1 tap to 2) | B: same rows. C: tapping the words opens the line, which clashes with tapping the words to tick (5 Nov) | Lines and header heights (`prep-a`, `todays-team`), ticks, On it, double ups, Undo, offline writes, roles, safe text |
| **Who did it on the shared tablet** | Prep on a shared screen: the Who's on it and who did it picker | No change: the same buttons open it | Same | `prep-attribution`, `device-prep-lock` |
| **Wall board** | Prep on the shared kitchen tablet (round 2, R4) | Uses the same one-row line, so check it at tablet width | B's board is per person and must not copy it | `prep-wall-board` |
| **Laptop prep** | Two-page notebook with Handy | Kept. Every action stays in the line, now in words (On it, Urgent, Recipe, Remove, ⋯) | C: Handy goes, Done today folds into the list | 1280 px layout |
| **Orders** | `#/orders`: requests with Running low and Out now, Ordered ticks, supplier groups for chefs, regulars, past days | Already one row (51 px). Print words. The chip Delivery arrived becomes Delivery received. Add to the order stays | Same | `orders-a`, `order-learning`, `supplier-groups` |
| **Supplier order** | `#/suppliers`: the order sheet, catalogue, history, cut-off sheet, the reminder bar with Mark order done | A row in the hat list with its cut-off line. Delivery arrived becomes Delivery received in supplier groups. Nothing else | B: the board shows the next cut-off from the same record | Supplier tests, `cutoff-patterns` |
| **Delivery received** | `#/deliveries`: temperatures, mixed loads, immutable records | A row in the hat list. Nothing inside changes | Same | `deliveries` |
| **Wastage** | `#/waste`: Log waste, Make it again, ⋯ with Change amount and Remove, the end-of-day review | Already one row. Print words. Log waste stays | Same | `closing-waste`, `waste-week` |
| **Wastage history** | Admin Reports: ranges, filters, CSV | No change | Same | `wastage-history` |
| **Transfers and returns** | `#/transfers`: Log a transfer, the age tag, loans still out, returns with Undo | Already one row. Print words. Log a transfer stays | Same | `transfers`, `transfer-returns` |
| **Functions** | `#/fn`: today and the next days, Print prep sheet per day, the band under the top bar, the landing card | Days with nothing booked fold into one line. Print prep sheet only on days with a function | B: the board repeats the next round; the band and the board must agree | `functions`, `function-prep-print` |
| **A function** | `#/fn/<id>` and its pop-up: banners, what goes out next, every round with its tick, kitchen comment, notes, changes, Print function, Change this function, Cancel | The same sheet laid out as one card. Cancel moves to the end of the card, away from Print (a question for the head chef). Contact stays with function managers only | Same as the mix | `function-cancel`, `function-print`, `functions` |
| **Service view** | `#/fn/now`: rounds to send, ticks, both prints | No change | B: the board repeats the rounds | `functions` |
| **Manage functions** | `#/functions`: the editor, drafts, delete and restore, Layout 2 print | No change | Same | `function-list-actions` |
| **Guides** | `#/guides`: the sixth tab when guides are on, categories, search, PDFs; admin uploads | No change | Same | `guides` |
| **Shift pings** | The bell, the pings sheet, the chef's writer, recipients, the sound | A row in the hat list for chefs. The bell stays | B: the board has a pings row | `shift-pings`, `ping-recipients` |
| **Today's team** | `#/team`, the round team chip, each person's day | A row in the hat list with Not set yet. Your day stays under your name in the hat | B: the board shows your break from the same record | `todays-team` |
| **Start of shift sheet** | Your day, once a day after the PIN | No change | B: it and the board say the same things; one of them should go | `shift-start` |
| **Drinks run** | `#/drinks` | A row in the hat list | Same | `drinks` |
| **Meeting minutes** | `#/minutes`: read, sign, the register, the admin editor | A row in the hat list with 1 to sign | Same | `minutes-sign` |
| **Kitchen mail** | `#/mail`, the admin inbox | A row in the hat list (not for the head chef) | Same | `mail` |
| **Chef to-do** | `#/todo` | A row in the hat list, no count (a count would need a read) | Same | `todo` |
| **My section** | The staff hat tile | A row in the hat list for staff and leads | Same | `chef-menu` |
| **Manage staff** | The chef's staff sheet and the admin Team room | A row in the hat list | Same | `people-safety`, `staff-draft` |
| **Admin panel** | `#/admin`: Today, Reports, Team, Kitchen; Dashboard, Review desk, Proofreader, Training | A row in the hat list on the admin device. Nothing inside changes (The Chef's Desk, four rooms) | B: the board and the admin To do both say what needs you; keep them apart | Admin tests, `read-budget` |
| **Settings** | `#/settings` | The last row in the hat list. Nothing inside changes | Same | `settings` |
| **Signing in and out** | Who are you?, device choice, the daily PIN, handover, Sign out waiting for unsent work | Sign out stays at the top of the hat | Same | `device-sessions`, `device-lock-handover` |
| **Bands and slips** | No signal, Update, the Undo slip, toasts, the function band, the cut-off reminder bar | No change | B: the function band and the reminder bar overlap the board | `after-the-tap`, `offline-writes` |
| **Printing, CSV, install, QR, text size** | Run sheet, prep tiles, report CSVs, Install, QR sign | No change | Same | Print and CSV tests |

## Round 3: every page (8 November 2026)

The head chef, after the coverage check: "I thought we agreed on looking at the apps that I gave you and use those for a new redesign, how can the other features stay all the same? Also, do like the home screen from B if we can implement the celebrations in there. But please have another look at all other features, with all those apps as a role model; I am sure we should definitely touch the admin panel as well. Don't start coding yet."

`every-page.html` draws one design for every page and three for the admin panel, with the same rules as before: every feature and role kept, the book's colours, notebook, kraft board and type, one-row lines and print words, words not symbols, and no new reads, listeners or rules unless a page says so. Pictures: `previews/e-*.png`; today's home on Diwali for comparison: `previews/today-diwali-home-390.png`.

**Home with the celebrations.** Diwali falls on 8 November 2026, so the home is drawn on it (`previews/e-home-390.png`, `e-home-1280.png`). The kraft board and the pins stay. The festival leads the dark board with its lamp and its six-language line, the lamps sit beside the day, the lights hang under the top bar, and Coming up holds festivals beside functions and cut-offs (Tihar begins tomorrow). This follows the celebration design chosen on 3 November (`docs/celebration-options/brief.md`: Home motifs behind the board, docket stamps where the mark is small, Coming up for the next 7 days from the offline calendar). On a plain day the board starts with Now and next (`e-home-staff-390.png`).

**Every page and its model.** Prep (Things, Duolingo: a bar in each section heading), Add a line (Todoist: your usual lines first, nothing guessed), Orders for chefs (Flighty: each supplier's time left), Supplier order (Airbnb: one card), Delivery received (Flighty arrivals), Wastage (Todoist: Log again), Transfers (Airbnb: each loan a card), Functions (Airbnb Today and Upcoming), the service view (Flighty live board), Recipes and the card (Airbnb browsing and listing), a guide (Headspace, Duolingo: step by step), Shift pings (Linear inbox), Today's team (Flighty timeline), Drinks run (a café docket), Meeting minutes (Headspace: calm reading), Kitchen mail (Linear), Chef to-do (Things 3), Manage staff (Linear, Airbnb). Admin: A the Desk tidied, B Inbox and views (Linear), C Morning brief (Flighty, Headspace).

**Council, round 3.** Six fresh reviewers saw every drawing and today's pages. Role-based analysis, not research with real staff.

| Page | Keep | Fix | Drop | The fix, now in the drawing |
| --- | --- | --- | --- | --- |
| 1. Home | 0 | 6 | 0 | Only what is still to come; bigger labels on the board |
| 2. Prep | 3 | 3 | 0 | Chips back on their own row; no letter in the box; the list ends above Add a line. Still 6 lines at 390 px |
| 3. Add a line | 6 | 0 | 0 | |
| 4. Orders | 0 | 6 | 0 | Back on the notebook page; a No supplier group first; how many ordered on each |
| 5. Supplier order | 2 | 4 | 0 | Record order the main button, Mark order done quieter (they stay two different outcomes); boxes start empty with the usual amount as a hint |
| 6. Delivery received | 0 | 6 | 0 | The reading starts empty and Save stays off until one is typed; Change time and notes stay |
| 7. Wastage | 1 | 5 | 0 | Amounts in different units are never added up. (The Log again fix followed a misdrawing: Make it again puts the item back on the prep list, as today; see Chosen) |
| 8. Transfers | 3 | 3 | 0 | Mark returned as an outline button, with Undo; a return is always the whole loan, as today |
| 9. Functions | 6 | 0 | 0 | |
| 10. Service view | 2 | 3 | 1 | Dietaries on each round. The skeptic would fold it into Functions' Today card |
| 11. Recipes | 1 | 5 | 0 | Contains and Free from as a clear switch |
| 12. A recipe card | 0 | 6 | 0 | One scrolling card with jump chips; the plating line and the full allergen key back |
| 13. A guide | 3 | 3 | 0 | Opens on All steps; the picture is the guide's own photo or PDF page |
| 14. Shift pings | 5 | 1 | 0 | Only today's pings, from the same read as now |
| 15. Today's team | 1 | 5 | 0 | Hours and break in words on every row, grouped by section |
| 16. Drinks run | 2 | 2 | 1 | No I'll go (a new write). The skeptic would leave the page as it is; the head chef reviewer: build it last |
| 17. Meeting minutes | 1 | 5 | 0 | Signing as Sam, Not you? beside Sign; See who has signed stays a tap |
| 18. Kitchen mail | 3 | 3 | 0 | Headings back, nothing picked; the urgent box stays orange |
| 19. Chef to-do | 6 | 0 | 0 | |
| 20. Manage staff | 6 | 0 | 0 | |

| Admin | Cook | Head chef | Skeptic | New starter | Keeper | Designer | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A, the Desk tidied | 3 | 3 | 4 | 3 | 4 | 4 | **21** |
| B, Inbox and views | 4 | 4 | 3 | 4 | 2 | 3 | 20 |
| C, Morning brief | 2 | 2 | 2 | 3 | 3 | 2 | 14 |

First place split three to three. B's Inbox was liked by everyone; its saved views, New view, read history, nightly-run row and dark sidebar were not (new stored features and reads, and the paper look lost). The skeptic and the designer named the same mix, now drawn first (`previews/e-admin-ab-1280.png`, `e-admin-ab-390.png`): **A's four rooms on paper, with B's Inbox as the Today room.** It keeps the Chef's Desk chosen on 4 November, takes the levels from three to two, and the week's numbers come from the nightly record.

What they agreed on and what the check found:

- **Nothing saves in one tap or comes filled in** where it records something: the cook and the new starter's biggest risk (a 3.5 °C reading nobody took, a waste logged by a wet tap).
- **Home shows only what is still to come.** Drinks, mail, minutes and to-do stay in the chef hat, as today; they were never on the dockets.
- **Guides is not a new tab:** it is the sixth tab whenever guides are turned on (`featOn('guides')`). Four reviewers asked.
- **The board's small orange** is `#F08A4B` on `#2B2A27`, 5.8 to 1, above AA; it is now 13 px for glare (the designer estimated 4.0 to 1 from the picture).
- **Reads, checked in the code:** Delivery received already reads today's records on open (`js/deliveries.js`); your mail is the phone's own copy (`lk.mail.sent`); guides have written steps and their own photos or PDF (`docs/code-contracts.md`), not a drawing per step; See who has signed stays a tap. I'll go on Drinks would be a new write, so it is gone.
- **Ship in groups, Prep first** (head chef, keeper, skeptic): every release reloads the phones and the team relearns pages mid-service.

**Questions for the head chef (round 3):**

1. Admin: the mix (A's rooms with B's Inbox as Today), B in full, A, or C?
2. Build order, in grouped releases: Prep and Add a line; Home with the celebrations; Orders, Supplier order and Delivery received; Wastage and Transfers; Functions and the service view; Recipes and the card; the chef hat list and the kitchen pages; admin last. Change anything?
3. Service view: keep it with the dietaries (5 of 6), or fold its round ticks into Functions' Today card?
4. Drinks run: restyle it last, or leave it as it is?
5. Make it again becomes Log again?
6. Still open from round 2: line words in print; Cancel function at the end of the card; Urgent on a line taking 2 taps.

## Chosen

The head chef's answers, 8 November 2026:

1. **Home: B, now and next, with the seasonal celebrations in it** (`previews/e-home-390.png`, `e-home-staff-390.png`, `e-home-1280.png`).
2. **Admin: B, the Inbox, with a dashboard** (`previews/e-admin-b-1280.png`, `e-admin-b-dash-1280.png`, `e-admin-b-390.png`). Today opens on the Inbox with the day's numbers above it; the Dashboard chosen on 3 November (the Pass board with three written headlines, its tiles and charts, 7, 30 or 90 days) sits in B's sidebar; fixed views for the reports; People, Settings, Backup and PIN; Find with /. Left out, as the council asked: saving your own views (a new record), read history and a nightly-run row. The numbers come from the nightly record.
3. **Build order as recommended**, in grouped releases (see Build).
4. **Service view: kept**, with the dietaries on each round.
5. **Drinks run: restyled**, last in its group.
6. **Make it again means cook it again.** It stays as it works today: on a cooking fault or expired wastage line it puts the item back on today's prep list in one tap, with Undo (`wAgain()` in `js/prep.js`, 3 Nov 2026). Round 3's drawing had read it as logging the same waste again, and the council's fix followed that; both are corrected (`previews/e-waste-390.png`).
7. **Line words stay in handwriting** (Caveat). Print stays for amounts, the small line and everything outside the lists.
8. **Cancel function at the end of the card**, away from Print, with its Undo.
9. **Urgent in one tap.** Every open prep line gets an Urgent flag with the word under it, filled black when on, beside Recipe and On it, which become the same icon-over-word buttons (`previews/e-prep-390.png`). The Start here number moves into the notebook's margin, like a handwritten line number, to give the words room. Measured with the 14-line list and its long names: **5 prep lines** fully visible on a 390 px phone (2 today; 6 with print words and Urgent behind ⋯). With shorter names more fit. A swipe to mark urgent would cost no width but cannot be seen, so it is not drawn.

Also answered on 8 November: **the recipe card keeps every drawing** (the plate with its tappable pins, From the side, the build and pan views, How to cut); the redesign changes only the top of the card (`previews/today-recipe-side-390.png` shows today's Barramundi card, unchanged further down).

**Not drawn yet** (each build step draws these first, at 390, 768 and 1280 px, and shows them before it merges): tablet and laptop for every page and the wall board with the new prep line (step 1); Orders as staff see it (step 3); B's People, Settings and report views (step 8). Unchanged by choice, so not redrawn: the recipe and drawing editor and studio, Settings, signing in, the PIN and device choice, printing, CSV, and the celebrations on work pages.

**The three overlaps with the new home** (answered 8 November): **keep the start of shift sheet, the function band and the cut-off reminder bar, all three in the new style.** The sheet still comes once a day after the PIN (a cook who opens straight on Prep never sees Home). The band and the bar stay on every page except Home, where the board already shows the next round and the next cut-off. The sheet is redrawn in step 2, the reminder bar in step 3, the band in step 5.

Earlier answers still standing: every feature and role kept (the coverage table above); the chef hat as a list; one-row lines; words on actions; no new reads, listeners or rules unless a step says so.

## Build

Eight steps, one pull request each, merged in the release windows, in this order (head chef, 8 November 2026). Each step first draws its screens at 390, 768 and 1280 px and shows them to the head chef, runs the service council's quick check, counts taps and lines before and after in the click tests, keeps `tests/read-budget.test.js` within budget, adds its patterns to `docs/design-patterns.md` and `tests/design-patterns.test.js`, and updates `README.md` and `docs/prep-book.md` for what the team sees.

| Step | What | Main files | State |
| --- | --- | --- | --- |
| 1 | Prep and Add a line: one-row lines with every marker, Urgent, Recipe and On it buttons, the Start here number in the margin, section chips and the day in the heading, section bars, your usual lines first in Add a line. On a tablet and a laptop the lines are one row today already; there the change is the Urgent button with its word, the chips row and the section bars, and the wall board moves onto the notebook paper (head chef, 8 Nov 2026: ruled page, red margin, handwritten title) and gains Urgent and the bars | `js/prep.js`, `css/app.css` | Built 8 Nov 2026 (head chef: "start coding now"), drawn in `every-page.html` (Step 1 at every size). Built: one-row lines on a phone from 360 px at the usual text size, the Urgent, Recipe and On it buttons with their words, section bars, your usual lines first in Add a line with a one-tap Add, the wall board on the notebook paper with Urgent and **Back to the prep list** first in its heading (head chef, 8 Nov 2026: an easy way back to the list). Gap fix the same day (the screen-by-screen check found 3 lines against the 6 aimed for): the Start here number in the margin, smaller line words, tighter rows and section headings; now 6 lines for staff and 5 for a chef at 390 x 844 in the book's own fonts (`tests/prep-lines.test.js`). The sixth for a chef needs the day controls in the heading, as drawn. Kept as they are: the section chips, and the day controls in their own row for chefs (moving them into the heading saves about 30 px but changes the header height Today's team's line relies on) |
| 2 | Home: the now and next board on the kraft board, with the celebrations; Coming up with festivals; only what is still to come; the start of shift sheet in the new style | `js/app.js`, `js/functions.js`, `css/app.css`, `js/seasonal/` | Built 8 Nov 2026 (#590): the day as the heading, the dark Now and next board (your section and lines left, your break, the order cut-offs for the chefs who get the bar, today's functions and their next round, new pings, minutes to sign; soonest first, each a tap to where it is done), Prep by section with a bar each, Coming up with the festivals, and the start of shift sheet with the board's dark head. The function band and the cut-off bar left Home and stay on every other page; signed out and Functions only keep the dockets. Since #597 today's next cut-off shows from the morning, quiet, until its reminder starts. Since the audit (8 Nov 2026): Coming up adds each supplier's next cut-off in the coming week (chefs only) and a week of functions, the laptop gets On today (who is on each section, with breaks, for the chefs who set the team), and rows with no time show a chevron. Kept: Prep by section for staff too (a cook with no section needs it); the festival note sits just above the board, not inside it (the celebrations draw that note themselves, and the board repaints every 30 seconds); the lights under the top bar are the celebrations' own edge, as on every page. No reads of its own |
| 3 | Orders (supplier groups with time left, No supplier first), Supplier order as one card, Delivery received as arrivals with an empty reading; the cut-off reminder bar in the new style | `js/prep.js`, `js/suppliers.js`, `js/deliveries.js` | Built 8 Nov 2026. Built: No supplier yet first, each supplier's cut-off row as a departure board (the tick kept, when it closes, how many ordered, the time left large, orange in the last hour), a one-sentence hint, Delivery received on the chip and in the groups; the cut-off bar dark like Home's board with the time left as a pill; the supplier order's To order boxes empty with the last order's amount as the hint, and its closing line one orange-outlined card on a phone; today's deliveries as arrivals with reading stamps. Kept as they are: Mark order done is not on the supplier page (since 5 Nov 2026 a supplier is ticked as ordered on the order list only, head chef), the time left is not on the supplier page (the cut-off bar above it counts down; the page has no minute tick, and a countdown that stops would be wrong), the supplier sheet's layout (measured 4 Nov 2026 to keep the first To order box clear of the Review bar), Delivery received's form above the list and Save as it validates today, and staff's plain order list |
| 4 | Wastage (Make it again as today) and Transfers (each loan a card, Mark returned with Undo) | `js/prep.js`, `css/app.css` | Built 8 Nov 2026. Wastage: the reason leads each entry's second line with a dot in the bar's colour, Make it again its own button (on the right from 480 px; under the second line on a phone, where the handwritten words need the room, measured at 390 px), the sections under the count in the header's own height; four entries take 325 px at 390 px instead of 365. Transfers: Still out as a card a pick-up (worked out from the lines one person logged together for one venue, no new field), Lent to or Borrowed from, how long (red from 7 days), when, who came and who logged it, then Mark returned on each item; a return stays one item, all of it, with Undo on the slip. Kept as they are: the order oldest first, today's total with the reason bar and its key (it gives the count of each reason), Done today as a list, and Still out and Done today as two headings on one page rather than the drawing's Out on loan and Today tabs (a tab would add a tap to see today's). One card button per item, not per card as drawn, so a pick-up that comes back in parts can still be returned item by item, as today |
| 5 | Functions (Today and Upcoming, empty days folded), the function card with Cancel at the end, the service view with dietaries; the function band in the new style | `js/functions.js` | Built 8 Nov 2026 (head chef: "start coding now"), drawn in `every-page.html` (e-fn, e-service). Built: Today and Upcoming functions on one page, each function one card (the event line, the name, today's next round on a dark strip, food times, what is booked, the notes in two lines) with Cancel at its end; the days with nothing booked folded into one line; the function card as the sheet on its paper with Next out on the dark board and Cancel alone at the end, away from Print; the service view as a live board with how long until each round goes, the dietaries on every round and both prints at the end; the band and its pinned line dark like Home. Kept: two headings, not the drawn Today and Upcoming tabs (a tab would add a tap to see the coming days, as on Transfers in step 4); Cancel stays on each list card too, at its end (the 25 Oct decision puts it beside a confirmed function); the guests on the card's small line; no Print prep sheet on a function card (it prints a whole day, so it stays by each day's heading); the managers' pages (`#/functions`) unchanged. Audit fix (8 Nov 2026): the service board now shows every round of the night still to go (it showed only each function's next round), each with its time left, dietaries and Sent; no row says Later and In N min at once |
| 6 | Recipes and the recipe card (one search, Contains or Free from, the plating line, jump chips, the full allergen key) | `js/app.js`, `css/app.css` | Built 8 Nov 2026. Built: the search as one pill (magnifier inside, the count line on a phone only while a filter is on), the Pass switch reads Contains or Free from, the card head with the plating line across the card, and the jump row staying under the top bar with Plate (or Pan) and Side view after Allergens, Ingredients and Method. Kept: the full allergen list and its key word for word, every drawing (plate with pins, side, build, pan), the multiplier, guides, Change this recipe; Tiles keeps Free from (its tiles show each dish's allergens). Left out: the small plate above the name (on a phone it pushes the allergens down by the plate's height, or copies a drawing of up to 100 KB; the Plate chip reaches it in one tap), the row of facts (the yield is free text, so splitting it would reword the head chef's line), and the kind filter as a chip row (the shared controls keep it a picker on a phone) |
| 7 | The chef hat as a list, then the kitchen pages: guides step by step, pings, Today's team timeline, drinks, minutes, mail, to-do, staff | `js/app.js`, `js/prep.js` | Built 8 Nov 2026: the hat as a list (Every day, More, Settings last; the same items for the same people), pings as an inbox, a guide step by step, Today's team at a glance, the drinks order as a docket, minutes calm to read with Signing as and Not you? beside Sign, mail with nothing picked, the to-do one-line add, staff as rows. Kept or left out: Today's team keeps its plan editor under the glance (a Change step first would add a tap to set the day); the to-do list stays one list with Due first (Today, Upcoming and Anytime headings would split the shared search and filters of `lvHTML()`), the day as a tag; the drinks run has no I'll go (a new write, council round 3); New ping stays the existing Write or edit pings link; Manage staff keeps Stopped working here on each row (people are added and saved as before) and has no filter row: the shared filter chips re-form after each redraw and moved Save under a held tap; the search finds a name or a role |
| 8 | Admin B: the Inbox with the day's numbers, the Dashboard in its sidebar, fixed views, Find | `js/prep.js`, `js/admin-dashboard.js` | Built 8 Nov 2026. Today opens on the Inbox: today's numbers from the nightly record (yesterday's prep ticked, waste in lines against the 7 days before, functions today), each a tap into its report, then everything that needs the head chef (the To do as it was). The Dashboard is the page beside it. Find (/) goes to any page, a part of the open page or a person; the laptop rail is dark with Find, the Inbox with its count and the Dashboard over the rooms. Kept as they are: the four rooms and their pages as the fixed views (no new saved views, read history or nightly-run row, as the council asked); Find lists the parts of the open page only, since the other pages are not drawn until opened, and every page by name; numbers in lines, not kilograms, since the record mixes units. Gap fix after the audit (8 Nov 2026): a picked Inbox row opens beside the list on a laptop with its own action; Inbox and Dashboard show once, in the rail. Left out: Done, Ping Ann and Add to to-do on the pane (the book has no write that closes a non-mail row, no ping to one person, and no to-do from an Inbox row yet; mail keeps Done and How soon on its own rows), and the function band and the Google account line stay above the heading (the band is on every page by the head chef's decision; the Google line must stay in sight) |

## Documents that change once chosen

The head chef asked for the design and function notes to be rewritten for the new design. They change in the pull request that builds each step, not now: `tests/design-patterns.test.js` fails when a pattern named in `docs/design-patterns.md` is not in the code, and `CLAUDE.md` holds rules, not plans. Once a design is chosen:

- `docs/head-chef-decisions.md`: the decision at the top, with its date.
- This brief: a Chosen section and a Build table, one row per pull request.
- `docs/design-patterns.md`, in the step that builds each piece: **A prep line** (one row: tick, words and amount, On it, ⋯; who, when and Recipe in the small line; the class and helper names), **The day bar** (date and section chips in one bar), and for B **The now and next board** (rows from data already on the phone; never "nothing" when a read failed) and **A booking card** (alert, facts, timeline, function bar). Each with its names in `tests/design-patterns.test.js`.
- `CLAUDE.md`: the short row in "Read the note before you change it" points here now; once built, the full row in `docs/session-map.md` names the chosen design, and "Things that are easy to break" gets one line if the board adds a rule (for example: the board shows only what the home page already reads).
- `README.md` and `docs/prep-book.md`: what changed for the team, in the step that changes it.
- `docs/open-work.md`: the steps left, removed as each ships.

## Sources

- Linear: [UI refresh changelog, 12 March 2026](https://linear.app/changelog/2026-03-12-ui-refresh); [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh).
- Things 3: [Cultured Code features](https://culturedcode.com/things/features/).
- Airbnb: [Reservations, redesigned](https://www.airbnb.ca/resources/hosting-homes/a/redesigned-reservations-765).
- Todoist: [A cleaner, simpler Quick Add](https://www.todoist.com/help/articles/a-cleaner-simpler-quick-add-june-29-PuIpiLmLh).
- Flighty: [Flighty wins Apple Design Award](https://www.traveldailynews.com/technology/flighty-wins-apple-design-award/); [App Store listing](https://apps.apple.com/app/id1358823008).
- Duolingo: [Streak milestone design and animation](https://blog.duolingo.com/streak-milestone-design-animation); [How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit).
- Headspace: [Italic Studio's identity for Headspace](https://Itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424).

## Files

- `index.html`: the comparison page and every design screen (`?shot=a-prep` and so on draws one screen at its real size).
- `roles.html`: every feature as a cook (staff) and as the head chef (admin) sees it in the chosen design, side by side; where staff cannot open a page it says what they see instead (`?shot=homeAdmin` and so on).
- `every-page.html`: round 3, every page and the admin options with the council's results (`?shot=e-home` and so on). The mock pieces are copied from `index.html` so the page stands alone.
- `previews/today-*.png`: today's book in the stand-in, every page (the second set taken for the coverage check). `previews/a-*`, `b-*`, `c-*`: the three designs as scored; `previews/r-*`: the recommended mix, redrawn after the coverage check. All designs photographed from `index.html` at 390 x 844 and 1280 x 800.
