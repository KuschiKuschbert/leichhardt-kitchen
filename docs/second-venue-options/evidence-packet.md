# Evidence packet: a second venue, its setup, and Add from AVC Live

19 November 2026, Queensland. Source commit: `main` at 086c033. Role-based analysis, not research with staff. Pictures are the real book on the click tests' stand-in (`tests/fake/`) with made-up people and an empty kitchen config; fonts are the test fallback. Signed in as the head chef on an admin device unless stated.

Read in full: [proposal.md](proposal.md), this packet, and `.claude/skills/service-council/SKILL.md` sections **The service rules**, **Current design contracts**, **Design references** and **Try to break it**.

## Screenshots (Implemented app, stand-in, commit 086c033)

- `docs/second-venue-options/baseline-admin-kitchen-1280.png`: Admin, Kitchen, Overview at 1280 x 900. Rows: "Each row says what it is set to. Tap it to change it." The kitchen: Order cut-offs (0 suppliers), Suppliers & pars, Kitchen sections (None), Shifts (None), Shift pings, Meeting minutes, Guides. The team's access: Pages staff see (All pages), Weekly top tickers, Sous chefs read Kitchen mail, Who books functions (0 people). Once a year: April Fools. Records and safety: Confirmed item links, Backup (every night at 03:30), Kitchen PIN.
- `docs/second-venue-options/baseline-admin-people-1280.png`: Admin, Team, People (staff list, roles, ticks).
- `docs/second-venue-options/baseline-manage-390.png`: Manage Recipes & Drawings at 390 x 844 (page 3329 px tall with Leichhardt's book).
- `docs/second-venue-options/baseline-manage-new-390.png`: New recipe at 390 x 844 (form 1450 px tall).
- `docs/second-venue-options/baseline-cleaning-390.png`: Cleaning with no tasks: "No cleaning tasks set yet. Set the actual jobs, sections and repeat days in Repeat tasks."
- `docs/second-venue-options/baseline-home-390.png`: Home, signed in as a staff member.

## Measurements

| Measure | Value | How |
| --- | --- | --- |
| Separate places a new head chef must visit to set up a working kitchen | at least 9 (Kitchen sections, Shifts, People, Order cut-offs, Suppliers & pars, Pages staff see, Who books functions, Cleaning Repeat tasks, Prep standards), plus recipes in Manage | Admin rooms in `js/prep.js` (`A_GROUPS`: Today, Reports, Team, Kitchen, Prep) and the Kitchen Overview rows on the stand-in. No order and no "what is missing" summary exists. |
| Admin rooms and tabs | Kitchen room tabs: Overview, Order cut-offs, Suppliers & pars, Shift pings, Minutes, Guides, Confirmed links, Backup and PIN | Stand-in, 1280 px. |
| Ways to add a recipe today | Manage, New recipe, every field typed; one recipe at a time | Stand-in. |
| Typing cost of one AVC dish card by hand | a plated special with 14 ingredient rows means 14 names and 14 quantities typed, plus links chosen | Prototype reader on a real card (private). Not timed. |
| AVC cards read by the prototype | 13 of 13 gave name, group, portions, yield, and every ingredient's quantity and unit; 0 of 13 had allergens or a method | Throwaway reader, positions of the Product and Quantity/UOM columns only. Real cards stay private. |

## Current contracts (excerpts)

**Access** (`docs/private-kitchen-access.md`, Access contract and Data boundaries): "Signed out: current recipes and their plating drawings only." "Admin: verified owner Google identity plus that device's current head-chef PIN session and matching device grant. Remembered Google alone never opens private operations." Head chef and sous chef manage recipes and drawings; supplier catalogue editing is head chef/admin only. The chef panel (`#/chef`) needs the current PIN session to match canonical `headId` or `sousIds`. "`publicBook/index`, `publicBook/matches`, `publicRecipes` and `publicDrawings` mirror current public recipe assets. Saves mirror the canonical kitchen documents in the same batch; rules require equality with those canonical documents." All operational reads need a valid personal session.

**Owner-only actions** (`docs/staff-capabilities.md`): canonical capability lists (`staffIds`, `sousIds`, `headId`, `addIds`, `tickIds`, `delIds`, `fnIds`, `fnOnlyIds`) live in private `config/main`. "Only the owner's save or existing Keep these changes action updates the canonical capabilities." A sous chef may add people and request role changes. PIN resets are owner-admin actions.

**Devices** (`docs/device-sessions.md`, What the team sees): every browser or installed app asks once how it is used (My own device, or Shared kitchen screen) in a warm-paper dialog, a bottom sheet on a phone. "Choosing a device type does not grant access or a role. Recipes remain public." Personal devices lock at 04:00 Queensland; shared screens lock after 10 idle minutes and at 04:00. Handover clears the previous person's private work and Google identity.

**Recipes** (`js/data.js` field guide): a recipe has id, kind (main, snack, side, dessert, batch, component), name, short, `avc` ("the recipe's name in AVC Live, so a search for it finds the card"), yield, ingredients `{ q, name, link, note, tags }`, sections (method; leave out and the card says "Not written up yet"), contains/check (allergens; "Leave contains and check out and the book works them out from the ingredient tags"). "Write anything not confirmed yet in [square brackets] so it shows as a placeholder." A link to a recipe not in the book "shows as Card to come, and every dish that uses it is marked Allergens incomplete and left out of the Free from filter." The head chef's book changes are kept in Firestore and laid over `js/data.js` (`js/overlay.js`); new recipes made in Manage live only in Firestore.

**AVC Live rules** (owner's source rules): AVC Live is read only, never changed. From costing PDFs take ingredients and quantities only; no methods exist in AVC. Prices, GP and supplier codes stay out of the public repo and off staff cards. Where something is missing, use [Qty] or [brackets]; do not guess. `CLAUDE.md`: "Only recipes, quantities, temperatures and times the head chef confirmed. Anything else goes in [square brackets] and shows as To come."

**PDF reading** (`js/prep.js`, admin Guides): `var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/'; // the security header in index.html allows only this folder`. The click tests serve the same version from `tests/node_modules`. A new outside service would be a head chef decision; this one already exists.

**A file read on the device, precedent** (`docs/roster-import-options/brief.md`, chosen 14 Nov 2026, Fill from roster file): CSV read on the phone; money cells wiped first and never saved, shown or sent; fail closed with nothing filled; exact names only; unmatched names on a card with a way to fix them; private name links in admin-only `config/rosterLinks` (only `isAdmin()` may read or write; cannot be listed); filled drafts saved through the existing Save.

**Design patterns** (`docs/design-patterns.md`): a page is `section.p-card` with `h2.p-h`, a `.hint` line, then the work; `.btn.dark` for the one main action. Admin uses one shell (`panelShellHTML()`), rooms on a dark rail on a laptop and one row on a phone; "A new thing that needs the head chef is a row there [the Inbox], not a new page." A row that opens another page is an `a.c-tool` with the page's name, one sentence and "Open ›", at least 56 px. A block is `.set-block` with `.label` or `h3.a-ch-h`. Choosing: chips for two to six fixed choices; a picker for more; "Fill in what the book knows and keep it easy to change... Nothing is saved by itself." **Filled for you**: a filled box carries a neutral word tag (`.lk-fb`, `.lk-ftag`), "never green or orange", and one line says what was filled and from where, with a 44 px button to empty it. Destroying typed work asks a second tap in place (`arm()`), no pop-up. Tap targets at least 44 px. Colours are tokens in `css/app.css`.

**Colour** (`docs/surface-colours.md` Selected design; `docs/colour-coding.md` Shared meanings): work books (including Orders) use steel `--surface-work`; people use sage `--surface-people`; live boards charcoal; reading and forms quiet paper `--surface-paper` and `--surface-reference`. Orange is action, active choice and attention (also the brand); green (`--done`, `--done-ink`) is complete, saved, included or assigned; red (`--bad-ink`, `--bad-tint`) is failure, invalid or destructive; pending is neutral or orange with explicit words. "Assigned in a Team draft does not mean Saved." Allergens, categories and art keep their own palettes. Colour never carries meaning alone.

**After the tap** (`docs/action-feedback.md`, The rule): answer in the tap's own frame; confirm in words that name the thing ("Saved 14:02. The sous chefs see the new cut-offs now."); a form's Save uses Saving, then Saved with a tick only once the write resolved, Try again with a red line that stays; clear the old words; leave the person where they are with a "Saved 14:02" stamp; a failure stays and keeps the work; a tap that cannot act says why.

**Loading** (`docs/loading-motion.md`): Ink helpers, never a spinner; lazy editors name the actual work; reduced motion removes tracing and entrances, never the words.

**Coding rules** (`CLAUDE.md`, `docs/coding-rules.md`): every write through `W()`; `esc()` on everything typed or read from a file; "No match, or more than one: show a card that says so"; "A Save with nothing to save is off"; an answer from the cache is not "nothing there"; every new read says when it runs and what it costs; no new listeners or polling; the free plan stops the book at 50,000 reads a day per database. Startup files are in `SHELL` in `sw.js` and both lists in `js/upkeep.js`; lazy pages are not. Held-back pages check `featOn()`.

**Never in the public repo**: the kitchen PIN, the owner's email (rules are a template with `KITCHEN_PIN` and `OWNER_EMAIL`), staff names or PINs, prices, GP, supplier codes or anything from AVC Live beyond ingredient names and quantities.

**Shipping** (`CLAUDE.md`, How changes ship): one merge that changes a file the phones load republishes the site for every phone. Release windows 15:00 to 16:30 and 22:30 to 09:30 Queensland. Rules publish through a workflow with GitHub secrets; the Lock probe checks live rules.

## The AVC Live card (facts from 13 real cards, no real data)

A Chrome print of the AVC Live "Print Recipe" page, one or two A4 pages with a text layer. Top: the account label, the recipe name in capitals, Recipe ID, Recipe Group, Menus, Recipe Portions, POS ID, kilojoules, and money figures (sell price, COGS, gross and net profit). Then a table, one row per ingredient: Brand, Supplier, Product Code, Package Size, Inner Unit Type, Price Per Package, Inventory Group, Product, Quantity/UOM (for example `160/GRAMS`, `50/MLS`, `0.25/EACH`, `1/PORTION`), Kilojoules, Cost. Product names wrap over several lines and include pack sizes and brands (made-up example in the same shape: `2KX6 CRISPY ROAST POTATO 9MM`, `1K(4) HOUSE AIOLI # 12345 BRANDCO`). A sub-recipe row's supplier reads "Batch Recipes - <site number> - <venue>" and its product code is `<AVC recipe number>_<site number>_bfbr`. On page 2 the table header repeats. At the end: "Portions made", and "This batch makes: 1000.00 times 1 GRAMS" (the yield), then empty Allergens and Other boxes. Names carry season and venue marks (`S26`, `SEP26`, `OCT26`, `COPY`, `PP`, `(QLD)`).
