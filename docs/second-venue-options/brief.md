# A second venue, its setup, and Add from AVC Live

Service council, 19 November 2026. Proposal: [proposal.md](proposal.md). Evidence: [evidence-packet.md](evidence-packet.md). Role-based analysis, not research with staff. Nothing is built.

The owner's decisions going in (19 Nov 2026, in chat): the second venue (Queensland) gets its own database; the owner owns and sees everything there; its head chef gets his own account and every feature, for his venue only, and can change nothing at Leichhardt; his book starts empty; the owner asked for an onboarding wizard and an upload of AVC Live costed recipes.

## Round 1

**Verdict: Build smaller** (all three parts; 3 of 5, 5 of 5 and 3 of 5).

| Reviewer | Second venue | Getting started | Add from AVC Live | Their one change |
| --- | --- | --- | --- | --- |
| Cook mid-service | Build | Build smaller | Build smaller | Imports save hidden from staff until names, flagged lines and missing free items (water) are checked |
| Head chef | Build smaller | Build smaller | Build | Each venue its own address and stored data, no venue switch in the app; first check that two GitHub Pages paths do not share stored data (they share one origin) |
| Skeptic | Build smaller | Build smaller | Build smaller | An untagged ingredient counts as "allergens not checked"; imports stay hidden until every ingredient is tagged or marked none |
| New starter | Build | Build smaller | Build smaller | Imports save with Show in the book off and say "From AVC, not checked" until the head chef confirms |
| Keeper | Build smaller | Build smaller | Build | Each venue its own web address, with its config, security header and empty book filled in when the site is published, like the rules template |

### Cuts and changes the reviewers agree on

1. **No wizard** (5 of 5). Setup is done once per venue by one chef. Use an ordered block in the admin panel built from config the book already reads, linking the existing editors, in words: Set, Not set yet, Optional, Could not check (a failed read never says Not set). Staff never see it, and it never sits over a service list. This goes against the owner's request, so round 2 still draws a guided option for him to compare.
2. **Each venue its own web address** (head chef, keeper, skeptic; nobody against). The book keeps about 80 to 98 `lk.*` keys on the device and none names a venue; the installed app has one name and one start address; GitHub Pages paths share one origin, so a join link inside one address would let drafts, PIN sessions and cached data cross between kitchens. A separate origin keeps storage, the saved shell, App Check and the installed app apart by the browser itself. No venue switch inside the app.
3. **Its own Firebase project**, not a second database in Leichhardt's project: the free daily reads apply per project (to be confirmed before setup). Its sign-in host must be in that venue's security header, filled in at publish time.
4. **No Leichhardt book at the second venue.** `js/overlay.js` falls back to `js/data.js` and the nightly analysis reads it too. The venue's published copy gets an empty book.
5. **The venue name on a phone.** At 390 px the top bar shows only "KB"; the venue must be visible where a cook can check it.
6. **Imported recipes are drafts hidden from staff**, marked "From AVC, not checked", until the head chef has tidied names, checked flagged lines and free items like water, and dealt with every ingredient's allergens. Never guess the kind (one card's group was "PLEASE SELECT"), a unit or a link. Code-like text in a name fails closed. AVC recipe and site numbers stay in a private admin-only list, never on the public recipe copy. Never a price.

### Disagreement

- Cook and new starter: the second venue is worth building as proposed once its name shows on a phone.
- Head chef and keeper: the AVC upload is worth it as proposed (it is where the hours go at each menu change, and it reads nothing until Save). Skeptic: it saves the cheap part; most recipe edits since 1 October were method, temperatures and plating, which AVC does not have. Typing time was never measured.

### Break-it findings (round 1)

| Scenario | Role / state | Expected | Observed or hypothesis | Impact | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A recipe with untagged ingredients | Any reader; recipe made in Manage or imported | "Allergens not checked yet" and left out of Free from | The allergen box says "None in the ingredients." (`allergenBox()` in `js/app.js`); only a missing linked card raises "Not complete yet" (`roll()`) | A guest is told a dish is free of an allergen nobody checked | **Reproduced by reading the source** at 086c033; not run in a fixture | Ingredients carry checked or not; a recipe with any unchecked ingredient says so and leaves Free from; a click test that fails today | Carried into every design. Also affects recipes made in Manage today at Leichhardt: its own fix |
| One phone used at both venues | Owner's phone or a shared screen | Each venue's drafts, sessions and caches stay apart | Hypothesis: with one origin, an unsent draft or `lk.rx` (keyed by PIN, not venue) crosses over; the installed app opens the fixed start address | Wrong kitchen's prep or orders sent, or a session at the wrong venue | Risk / Not evidenced | Separate origin per venue; a client test with a draft at A, then opening B | Cut 2 removes the shared storage |
| Venue B shows Leichhardt's book | Signed out, offline, or a damaged saved copy | Venue B's own recipes only | Hypothesis: overlay falls back to `js/data.js` | Wrong recipes and allergens on the line | Risk (source read) | Publish venue B with an empty book; click tests as venue B signed out and offline | Cut 4 |
| Nightly backup mixes venues | Backup job for two projects | Each backup reads its own project | `nightly-backup.yml` reuses the newest successful run's file (`head -1`) without checking its project | A venue's backup built from the other's days | Risk (source read) | Key the reused file by project; `backup-reuse-check` must force a full read for another project's file | Carried into the plumbing plan |
| An AVC code in a product name | Import of a card with `# 12345 BRANDCO` | The code never saved | Hypothesis: tidying misses one and it reaches the public mirror | A supplier code in the public repo's live copy | Risk | Fail closed on code-like text; unit tests on made-up cards: no money figure or code in any output | Cut 6 |

### For the owner after round 1

- **Where each venue's address lives.** Separate origins are needed. Cheapest: the venue's own Firebase project serves its copy of the book at its own free address (for example `<name>.web.app`), deployed by a workflow from the same code. Or a custom subdomain per venue. Leichhardt stays on GitHub Pages.
- **The security header** of the second venue's copy names its own Firebase sign-in host (filled in when it is published). That is a new outside service only for that venue.
- **The allergen gap** above exists today for recipes made in Manage. It should get its own fix whatever is chosen here.

## Round 2: three designs

All three keep the round 1 cuts: the venue on its own address, project and empty book (common plumbing, not drawn); the venue name in the top bar on a phone; setup only in the admin panel, never seen by staff; state in words (Set, Not set yet, Optional, Could not check), a failed read never shown as Not set; imported recipes hidden and marked "From AVC" until names, free items, the kind and every ingredient's allergens are checked; an ingredient is either checked (with its allergens or "No allergens") or not checked; never a price, never a guess. All three remember a product's checked name and allergens in a private, admin-only list, so the next card that uses it comes filled (Filled for you, tagged AVC).

| | A, Rows in the Overview | B, Set up the kitchen (guided) | C, Bring it in from files |
| --- | --- | --- | --- |
| Central idea | A "Getting started" block on top of Admin, Kitchen, Overview: eight numbered rows with their state, each opening the existing editor. AVC drafts sit in the Manage list and are checked in the existing recipe editor | A page of eight steps in order (the owner's wizard request), each with the editor inside it, Save and next, Skip for now. Recipes is a step: AVC cards checked one card at a time | A Bring in tab: a kitchen setup file (sections, shifts, cleaning, prep standards from another of the owner's kitchens), the roster file for names, and AVC cards. AVC checking is per ingredient: each product is checked once for every recipe, then recipes show as ready |
| Sequence | Any order; rows numbered | Fixed order, skippable | Files first, then the few things left by hand |
| Where the work is | Existing pages | One new page with editors inside | A new tab and an ingredient workspace |
| Unit of AVC checking | One recipe, in the existing editor | One card, in a review card | One ingredient, across all recipes |
| Entry | Kitchen room, Overview | Today, Inbox row "Finish setting up" | Kitchen room, Bring in |
| Previews | [a.html](a.html): `#setup`, `#manage`, `#draft` | [b.html](b.html): `#setup`, `#review` | [c.html](c.html): `#setup`, `#review`, `#recipes` |

**Structural difference.** A and B differ in sequence (any order versus fixed steps), navigation (out to existing pages versus editors inside one page) and the AVC review (editor versus review card). A and C differ in what the chef does (set by hand versus bring in files) and the unit of AVC checking (recipe versus ingredient). B and C differ in sequence, layout and checking unit. None are colour or spacing variants.

### Measured on the previews

**Preview**, not the implemented app: schematic pages (no real editors, reminders or full forms), 390 x 844 and 1280 x 900, fallback fonts, made-up venue and products, scripted with Playwright on 19 November 2026. Taps are counted from the preview's controls; the phone's file picker is assumed to be 2 taps; typing is not counted. Not timed.

| Measure | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps to move through the needed setup (navigation only, not the editors' own work) | about 13 to 20, if he knows the 9 places | **13** (room, then Open and Back for 6 needed rows) | **9** (Inbox row, then Save and next for 8 steps) | **18** (tab, 3 files at 4 taps each, 2 rows by hand) |
| Typing avoided in setup | none | none | names, if the roster file is used | sections, shifts, 31 cleaning tasks and staff names come from files |
| Taps for one 12-ingredient card, from file to shown to staff | about 26 typed fields, not counted | **21** | **17** | **19** |
| Taps for 20 cards (112 ingredient rows, 37 different products, 3 unknown kinds, 1 odd line), remembered names and allergens | not practical | **145** (20 recipes opened, saved and closed) | **84** | **67** |
| Setup rows visible at 390 on opening | n/a | 5 of 8 | 1 line ("Step 3 of 8"), the step list behind All steps | 2 of 5 blocks |
| Ingredient rows visible at 390 in the AVC check | n/a | 2 | 2 | 3 |
| Page height at 390 (setup screen) | n/a | 1438 px | 1166 px | 1336 px |
| Navigation levels added | | 0 | 1 (the setup page) | 1 (Bring in tab, then the AVC workspace) |
| Build size (pull requests, after the common venue plumbing and the allergen fix) | | 2 | 3 to 4 (editors made embeddable) | 4 to 5 (setup file out and in, names from the roster, ingredient workspace) |
| Relearning | | Low | Low for him; staff none | Medium (a new way of checking) |
| New reads or rules | | Private AVC link and ingredient list (admin only) | The same | The same, plus the setup file (no reads) |
| Sideways scroll | | none at 390 or 1280 | none | none |
| Taps under 44 px | | allergen chips 40 px (copied from the editor's existing `.mg-tags .chip` exception; found by the new starter and screen designer) | the same | the same |

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose | Works: admin paper, existing Overview rows (56 px) | Works on paper; the step list is a new pattern for `docs/design-patterns.md` | Works on paper; Bring in is a new tab, the ingredient table uses the table pattern |
| State meaning | Works: words in an outlined box; Set green with ✓, Not set yet orange, Could not check red, Optional neutral | Works, same words | Works; Saved 14:02 stamps on files; no failed-read state drawn (Not evidenced) |
| Words without colour | Works: every state is a word | Works | Works |
| Real contrast (preview, measured on paper) | state words 5.35 to 7.46:1; AVC line 4.99:1; hints 6.83:1 | the same tokens | AVC line 4.78:1, otherwise the same |
| Relevant states | Failed read drawn (Cleaning). Saving, Saved and refusal on the editors: Not evidenced | Failed read drawn in the step list. Skip with unsaved typing: Not evidenced | Saved stamps drawn. Failed read, refused save, a bad file: Not evidenced |
| Service continuity | No service page changes; staff never see it | Same | Same |
| Filled for you | The AVC word tag on filled names; the line with a button to empty it is not drawn (Needs work) | Same | Same |
| Keyboard focus, light and dark | Not evidenced | Not evidenced | Not evidenced |

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: one frame, consistent names | Works: existing room, rows and editors | Needs work: a second way to reach the same editors | Needs work: a new tab and a second editing surface for recipes |
| Things 3: occasional things tucked away | Works: folds to one line when set | Works: the page goes once done | Works: Bring in stays as a tab |
| Airbnb: everything for the job together | Needs work: a draft's checks are in the editor, the setup state on another page | Works: one card shows all a recipe needs | Works for ingredients; a recipe's own checks are on another list |
| Todoist: quick, known defaults, never guess | Works | Works: kind chips when the card said PLEASE SELECT | Works; bulk filling from files needs the most care |
| Duolingo: real progress, clear next step | Works: "3 of 6 needed set" | Works best: step n of 8, Save and next | Works: "12 of 37 checked", "4 ready" |
| Headspace: calm plain words for a newcomer | Works | Works | Needs work: "setup file" and "bring in" need explaining |
| Flighty | Not relevant: nothing live in setup | | |

### Break-it scenarios for the scorers

1. C: one wrong allergen on a product spreads to every recipe using it at once (so does the fix). A and B reuse remembered allergens too, but show them per recipe. Risk / Not evidenced.
2. The owner and the venue head chef import the same cards on two devices. Expected: one draft per AVC recipe number, the second save sees the first. Risk / Not evidenced.
3. B: Skip for now or Back with typing not saved. Expected: the step keeps its draft or asks a second tap in place. Not evidenced.
4. A failed read of the kitchen settings during setup shown as Not set yet, so the chef types it again and overwrites. A and B draw Could not check; C does not draw it. Not evidenced in C.
5. C: a setup file brought into the wrong venue, or one carrying a person's name in a cleaning task. Expected: the file names its source kitchen and the chef sees every item before Save; names are refused. Risk.

## Round 2 scores

Six fresh reviewers, each given every design, the same evidence packet and the service rules. Scale: out of 10, 10 best for the kitchen. All six said the designs differ structurally.

| Reviewer | A | B | C | Recommended |
| --- | --- | --- | --- | --- |
| Cook mid-service | 6 | **7** | 5 | A's rows + B's one-card review, opened from Manage |
| Head chef | **7** | 5 | 6 | A + a "Save, next draft" in the editor; fix the allergen gap first; time five real cards |
| Skeptic | **7** | 3 | 5 | A + B's greyed-out Add with its reason |
| New starter | **7** | 6 | 4 | A + B's Inbox row and Next draft + C's words on each ingredient; the same allergen chips on every row at 44 px |
| Keeper | **7** | 4 | 5 | A's rows + B's card as the only draft editor + C's remembered product list shown as Filled for you |
| Screen designer | **7** | 5 | 4 | A + B's Inbox row and card order + Save and next draft |
| **Total** | **41** | 30 | 29 | |

A ranks first for five of six. Nobody recommends B's step page or C's setup file, ingredient workspace or bulk Show. Every reviewer recommends A with parts of B, and three add a part of C.

### What the reviewers found in all three

- **Drafts would be public.** `W()` copies every write to `recipes/<id>` into `publicRecipes` (`js/prep.js` line 1296), which anyone may read and nobody may delete, and `hist` is permanent. A "hidden" recipe is still a recipe document. Drafts need their own admin-only store; the first write to `recipes/` is the publish. Reproduced by reading the source (skeptic, keeper, lead), not run.
- **What "checked" means was not defined.** One pressed chip, or a row offering only some allergens, looked checked. Fix: the same ten allergens on every row (as `tagChips()` in `js/manage.js`), with may have, plus No allergens; a row is Checked only when an allergen or No allergens is chosen.
- **The Filled for you line with its Empty it button** was not drawn.
- **A must not move everyday rows** (skeptic): at Leichhardt, where everything is set, Kitchen sections and Shifts would hide inside a folded block.
- **Reads:** the Getting started states and Inbox rows must come from config the book already reads, or a daily cache; no new read on every Overview open (keeper).
- **The bottom bar covers content at 390** (head chef, keeper); measure in the real shell.
- Keyboard focus: Not evidenced. The book has no dark theme (`css/app.css` has no `prefers-color-scheme` rule), so dark contrast is Not relevant.

## Mix of A, B and C

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A: Getting started rows in Kitchen, Overview, with state words | Take, without moving the everyday rows | Linear, Duolingo | Order and what is missing, in the existing frame | Reads for the states (from loaded config or a daily cache) | 6 of 6 |
| A: Manage list with a From AVC group | Take | Linear | Drafts found where recipes live | None | cook, keeper, designer |
| A: AVC drafts edited in the existing editor | Reject | Linear (one save path) | | Two save targets in one editor; drafts would be public | keeper, skeptic |
| B: step page with editors inside | Reject | Linear (no second navigation) | | 3 to 4 pull requests for a page used once; two Saves per step; against the Inbox contract (a row, not a page) | 6 of 6 |
| B: Inbox row "Finish setting up" | Take | Duolingo, Things 3 | Easy to find on day one | One more Inbox row while setup is unfinished | new starter, designer |
| B: one-card review in its order, the only draft editor | Take | Airbnb, Todoist | Kind, yield, ingredients, free items and the action together; never a guess | One new editing surface, for drafts only | cook, keeper, designer, head chef (as Save, next draft) |
| B: Add off with the reason beside it | Take | Todoist | Says what is missing at the button | Needs room in the bottom bar | skeptic, designer |
| C: Checked / Not checked on every ingredient | Take | Airbnb | Status in one place, in words | None | new starter |
| C: remembered product list, filled per recipe with Last time and Empty it | Take | Todoist | Most of C's saving without the spread-to-all risk | A wrong remembered allergen fills later cards; its line and Empty it must ship with it | keeper, skeptic |
| C: setup file, roster-to-staff | Reject | Headspace | | Used once; repeats the cleaning template; cleaning tasks can carry staff ids | 5 of 6 |
| C: ingredient workspace and bulk Show | Reject | Todoist, Airbnb | | One tap changes or shows many recipes unseen; batch size limits in the rules | 6 of 6 |

**Why not all three in full:** two checking units edit one allergen two ways, B's fixed order fights A's any order, and the new tab and page cost more than they save (cook, head chef, skeptic, new starter, keeper, designer).

## Combined preview

[mix.html](mix.html): `#inbox`, `#setup`, `#draft`. Screenshots `mix-*-390.png` and `mix-*-1280.png`. **Preview**, same conditions as above. Status: a lead synthesis of the reviewers' own recommendations, checked by a focused follow-up below (not a new round).

| Measure (Preview) | Mix |
| --- | --- |
| Taps to move through the needed setup | 13 (Inbox row or Kitchen room, then Open and Back for 6 rows) |
| Taps for one 12-ingredient card, file to shown to staff | 19 |
| Taps for 20 cards, 37 different products, remembered checks | about 86 (Add, next draft opens the next card) |
| Setup rows visible at 390 | 5 of 6 needed rows |
| Ingredient rows visible at 390 in the draft card | 2 |
| Taps under 44 px | none (chips 44 px) |
| Contrast (paper) | state words 5.35 to 7.46:1; chips 5.59:1; hints 6.83:1 |
| Navigation levels added | 0 (rows in existing pages; the draft card opens from Manage) |
| Build size | 3 pull requests after the plumbing and the allergen fix: Getting started and Inbox rows; the AVC reader with the private draft store; the review card with the remembered product list |

### Focused follow-up on the combined preview

The skeptic, the keeper and the screen designer read the combined preview (19 Nov 2026). Scores on the same scale: **screen designer 8, keeper 8, skeptic 7** (their A scores were 7, 7 and 7). Their findings, and what changed in [mix.html](mix.html) since:

| Finding | Who | Disposition |
| --- | --- | --- |
| Kind chips showed four kinds; the book has six (main, snack, side, dessert, batch, component) | skeptic | Fixed in the preview |
| "In the rows below" was wrong for Prep standards (Admin, Prep) | skeptic | Fixed |
| The same rows said "Not set yet" above and "None" below; Recipes said ✓ Set while the Inbox flagged 6 drafts | designer | Fixed: one wording ("Not set yet"); Recipes says "6 to check". The word change on the existing Overview rows is a small proposed change |
| A remembered row showed green ✓ Checked with no tap and nothing saved; "Hidden from staff" was orange | designer | Fixed: "Checked before" and "Hidden from staff" are neutral words; green only after Add is confirmed |
| Each ingredient's state sat under 11 chips | designer | Fixed: the state word is on the ingredient's name line |
| Added and Try again were not drawn; the card could move on before the write answered | skeptic, keeper | Drawn (`#states`): Adding…, then "✓ Added 14:12 … Next: Beef burger", or "Not added: no signal … Try again" in red that stays, the draft and its checks kept. The card moves on only after the book has the recipe |
| A card already in the book imported again | skeptic | Drawn: matched on the private AVC number, offered as "Update amounts", method, allergens and drawings kept |
| A corrected remembered product does not reach recipes already in the book | skeptic | Drawn as a line: changing it lists the recipes already using it, each with Open |
| About 3 new reads on every admin panel open (suppliers, cleaning, draft count) | keeper | Build rule: keep the states in `dayCache()`, never cache a failed read, add them to `tests/read-budget.test.js`, stop once `config/main` marks all six set. About 3 reads a day |
| One ingredient fills a 390 phone screen (about 300 px each); the bottom bar is 109 px | designer, skeptic | Open: remeasure in the real shell; a focused chip must not hide behind the bar (WCAG 2.4.11) |
| Saving, the phone keyboard open, screen reader names for the three-state chips, the real top bar | designer | Not evidenced; checks before release |

### Break-it findings from the follow-up

| Scenario | Expected | Evidence | Smallest check |
| --- | --- | --- | --- |
| Add while offline or after the 04:00 lock; the card had moved on | The card waits for the write; a refusal stays on that card with Try again; the draft is kept | Risk / Not evidenced (fixed in the preview) | A fake-backend test with a held write, then a refused one |
| Two devices add the same AVC card with different tidied names | One recipe; the second Add is refused | Risk | An emulator test with two admin writers: a create-once private AVC link in the same batch as the recipe |
| The remembered product list written at Save draft | A half-checked product never counts as Checked elsewhere | Risk | A client test that Save draft never writes the product list; only Add does |
| Re-import at the next menu change | Matched on the AVC number, amounts offered as changes, the rest kept | Risk (drawn) | A click test |
| A corrected allergen on a remembered product | The book lists the recipes already using it | Risk (drawn as a line) | A click test |

## Recommendation

**Recommend the mix: A's Getting started rows + B's Inbox row and one-card review (the only draft editor, with Add off and its reason beside it, then the next draft) + C's Checked words on every ingredient and its remembered product list.** All built on the common plumbing (each venue its own address, project and empty book) and after the allergen fix.

Why it beats the alternatives: it keeps A's existing frame and no new navigation (Linear), which five of six reviewers ranked first; B's card gives a chef everything a recipe needs before it reaches the line (Airbnb) and a clear next step (Duolingo) without B's page of embedded editors; C's remembered products bring 20 cards from 145 taps to about 86 without C's change-all-at-once risk (Todoist: never spread a guess). Every original reviewer recommended a version of it; the three who checked the combined preview scored it 7 to 8, the same as or higher than A.

Main downside: the owner gets numbered rows and an Inbox row, not the step-by-step wizard he asked for; and the draft card is one more editor to keep in step with Manage.

Unresolved before readiness:
- **Two admins at the second venue** (owner, 19 Nov 2026). The venue's head chef runs his own kitchen as its admin: kitchen sections, what staff see, people's roles and ticks, functions and the rest of the admin panel, for his venue only ("otherwise I am sitting here setting up all venues"). The owner keeps full admin access at every venue. Today an admin session is the owner's Google identity plus the canonical head chef's PIN (`adminSession()` in `firestore.rules` requires `headId`), so this needs a rules change: admin is either the venue owner email with the `headId` PIN, or the platform owner email with the platform owner's own profile at that venue. The platform owner's profile cannot be changed, locked out or have its PIN reset by the venue admin. At Leichhardt both are the same person, so nothing changes there. The most sensitive rule in the book: emulator rows for every role at both venues, the Lock probe after publishing, and a published-rules order worked out before the plumbing ships. (An earlier answer the same day, the owner as the only admin, is replaced by this.)
- Remeasure in the real shell at 390, 768 and 1280: the top bar with the venue name, the full draft card, the bottom bar over chips, the keyboard open.
- The checks in both Break-it tables.

## Build order (if chosen)

1. **The allergen fix** for every recipe: an ingredient is checked or not; a recipe with an unchecked ingredient says "Allergens not checked yet" and leaves Free from. A click test that fails on today's code. Leichhardt benefits first.
2. **The venue plumbing:** the second venue's own Firebase project and address; its config, security header, venue name and empty book filled in when it is published; two admins (owner and head chef); server jobs, backup (keyed by project), rules publishing, lock probe and live tests once per venue. **Built as a draft, 19 Nov 2026: [venues.md](../venues.md)** (the checklist, the owner's steps and the published-rules order). Left for a client follow-up: the book offering Admin to the platform owner at a venue, and locking his row in the venue admin's people editor.
3. **Getting started rows and the Inbox row**, read from cached config.
4. **The AVC reader** (made-up test cards: no money figure or code in any output) and the private draft store.
5. **The review card** with the remembered product list, Add through the existing recipe save, re-import as Update amounts.

## Chosen (19 November 2026)

**The owner chose the mix** ("we'd go for the mix"), with these answers the same day:

- Each venue's head chef is admin of his own venue; the owner keeps full admin at every venue (see Unresolved above: a rules change).
- No new roles for now. If roles are added later, they are global: the same for every venue.
- The owner wants a room in his admin panel to add venues and head chefs and manage them. That is a new room and a new workflow, so it gets its own council before the venue plumbing is built: adding a venue creates a Firebase project and an address, and changing a venue's head chef changes its published rules, which a server job must do, not a page.

## Built so far

- **Step 1, the allergen fix** (#763, 19 November 2026).
- **Step 4, the AVC reader only** (19 November 2026, owner: "do it here"): `js/avc-reader.js` reads the text of an AVC Live "Print Recipe" PDF into a draft (name, AVC name, group as a hint, portions, yield, each ingredient's suggested name, AVC name and amount, with flags for a house batch to link, a code taken out of a name and a unit the book does not know). It reads only the name, Recipe Group, Recipe Portions, the Product and Quantity/UOM columns, the yield line and whether a Supplier cell starts "Batch Recipes"; a last check refuses a card if anything that looks like money or a code is left. The columns come from each page's own header, so both print sizes read. Fails closed with the row's number, never its words. Nothing loads it yet. On the owner's 13 real cards (kept private in their Drive, run locally only): 13 of 13 read, 60 ingredient lines, 25 house batches to link, 14 names with a code taken out, no money or code in any draft. Tests on made-up cards: `tests/avc-reader.test.js` (48 checks, one of them through pdf.js on a made-up PDF), fixture `tests/avc-fixture.js`. Still to build for step 4: the private draft store (admin-only, after the venue plumbing's rules); then step 5, the review card.
