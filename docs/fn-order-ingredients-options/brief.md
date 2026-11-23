# Function platters: what to order, worked out from the platter cards

## Status

18 November 2026. Council round 1: **Build smaller, 5 of 5.** Round 2: A first with all six reviewers (44 of 60; B 23, C 23). **Recommended: A + B's shared-order totals (the combined preview).** **Chosen 18 Nov 2026: the head chef said "Build the mix". Built** (see Chosen and Built at the end).

[Proposal and evidence packet](proposal.md) · [Capture script](capture.cjs) · [Measurements and sums](measurements.json)

## The ask

Head chef, 18 Nov 2026: instead of the function itself on the order list, put the platter ingredients on it, in a smart way.

## Council round 1: Build smaller (5 of 5)

All five reviewers (cook, head chef, skeptic, new starter, keeper) said the value is real (today the chef opens three platter cards and multiplies by hand, about 8 taps plus arithmetic) but writing one order line per ingredient is the costly way:

- **Rows:** 6 to 30 more lines per function on a flat list that shows 2 to 3 rows on a 390 px phone; staff requests like "Brie OUT" get buried.
- **Contracts:** the Orders tag, Function sent lines off, the 03:00 job and the chef's Cancel rules all rely on the one `fn-<id>` line. The order rollover copies `root` but drops `fn` and `fnFor` (`js/prep.js`, `ordRoll`), `lineOf()` accepts only `fn-<id>` with `-<day>`, `-x<day>`, `-r<day>`, and `statusOrderLine()` allows three exact keys, so a chef's Cancel could not take ingredient lines off (keeper and skeptic, read in source, not run).
- **Data:** the cards give sauces as pots ("2ea"), ranges ("6-8"), handfuls, lemon wedges; they do not say what is bought, kept in stock or made in house beyond three linked recipes, nor packs or suppliers. "Party pies 40 pieces" next to Sam's "Party pies 1 box" is two lines in two units for one thing.

What to cut, as they agreed: keep the one function line, its ids, tags and tick; work the sum out on the phone from the functions listener with **one shared helper** (the maths of Prep's `fnNeeds()`, not a second copy); leave out house recipes; show To come for amounts the card does not give; show a matching request by name ("Also asked: 1 box (Sam)"), never add amounts in different units; no new reads, listeners, rules or line ids. Before building, the head chef marks once which platter items are bought.

Disagreement: none on the verdict. The skeptic and new starter want only bought items shown, never sauces; the cook wants the fold closed by default; the head chef reviewer wants the sum across every function on the same order day.

Leading Break-it findings (round 1, all Risk / Not evidenced, read in source):

| Scenario | Expected | Hypothesis | Repair or check |
| --- | --- | --- | --- |
| Ingredient lines roll over (written-lines designs) | They leave once the function is all sent | Rollover drops `fn`/`fnFor`; `lineOf()` and the 03:00 job never find them; they roll on and get ordered again | Do not write them, or copy `fnFor` in the rollover, read it in `lineOf()` and the job; client test plus job check |
| "Party pies 1 box (Sam)" already asked | The chef sees it was asked | The double-up check treats 1 box and 60 pieces as different, so both stay open; over-order | Show "Also asked" by name beside the item; never add across units |
| Function changes after its line is ticked | Only the change shows | The Changed line holds full new totals; a sum drawn from the live function under a ticked or rolled line would rewrite what was ordered | Draw the sum only on the open line `orderTag()` matches; Changed lines say "check what you ordered"; fixture in `tests/fn-order-tag.test.js` |

## The three designs (round 2)

All three keep the function save as it is (one `fn-<id>` line, the same ids, rules and Cancel), use the functions listener every phone already holds (no new reads or listeners), and add up the platter cards with the book's amount reader. The fixture: Smith 50th (Mon 23 Nov: 4 Aussie, 2 Vege, 3 Antipasto) and Lee 21st (Wed 25 Nov: 2 Aussie, 2 Yumcha), both ordered today; requests Brie OUT, Party pies 1 box (Sam), Sweet chilli sauce Low (Ann), and the stand-in's Milk 6 L and Brioche buns 4 packs.

**Example split used in the previews (head chef to confirm):** items with a linked house recipe are "Made here, on Prep" (Tomato sauce, Tomato relish, Tartare); 2-pot sauces and dips are "Check you have" (BBQ, Sweet chilli, Sweet soy, Caramelised onions, Basil pesto); everything else is "to order". Smith 50th: 18 to order; Lee 21st: 10; both: 23 (Party pies 60 pieces, Meatballs 120 pieces, Prosciutto 240 g, Cheese selection 900 g, Crackers 1.5 packs, Prawn crackers amount to come, and so on; full list in [measurements.json](measurements.json)).

### A: The line opens (changes the least)

The Function stock row stays one row with one tick. Its "Used in" links become **What it needs: 18 to order ▾**, closed by default. Open, inside the row: each item with its amount and the platters it is for ("Party pies 40 pieces, 4 Aussie · Also asked: 1 box (Sam)"), then one line **Check you have:** (sauces and dips in pots), one line **Made here, on Prep:**, and "Tick this line once all of these are ordered." Each function's line has its own fold. Nothing is written; the tick means the same as today.

Pictures: [closed 390](design-a/closed-390.png), [open 390](design-a/open-390.png), [open 390 full](design-a/open-390-full.png), [closed 1280](design-a/closed-1280.png), [open 1280](design-a/open-1280.png).

- **Pros:** no writes, rules or new ids; every current contract keeps working; one tick; the eye sees the list in one tap; least to learn.
- **Cons:** per function, so two functions ordered the same day show Party pies 40 and 20 in two folds, not 60; the open fold is long (18 rows) inside one list row; the tick covers 18 items, so a half-done order cannot be marked.

### B: Added to the list as requests (closest to the ask, most automatic)

The function rows are not drawn on Orders. In their place, before the requests, a **For the functions** block: one line "Smith 50th (Mon 23 Nov) and Lee 21st (Wed 25 Nov): 23 to order · Order today ▾". Open: **Add all 22 to the list**, then every item summed across both functions with **Add** and **Not needed**; an item already asked shows "Also asked: 1 box (Sam)" with **Add anyway** instead. Added items become ordinary request rows ("Sausage rolls 60 pieces · For Smith 50th, Lee 21st") ticked one by one like any request, and leave once the functions are all sent. After Add all the block folds to one sentence with Undo. Chefs only; staff see the added rows.

Pictures: [open 390](design-b/open-390.png), [open 1280](design-b/open-1280.png), [after Add all 390](design-b/after-390.png), [after Add all, whole list](design-b/after-390-full.png), [after, 1280](design-b/after-1280.png), [staff after](design-b/after-staff-390.png).

- **Pros:** what the head chef asked: the ingredients are on the list, summed across functions, each with its own tick, so a half-done order shows what is left; uses the request rows everyone knows.
- **Cons:** 22 new rows on one tap (the whole list is about 2,500 px tall at 390 px); 22 ticks to finish instead of 1; needs `fnFor` on order lines, the rollover to copy it, `lineOf()` and the 03:00 job to read it; the function line's tick changes meaning (put on the list, not ordered) or is hidden; Undo of 22 lines; amounts the card does not give become "[amount to come]" rows.

### C: In the supplier order (rethinks where it happens)

Orders keeps the function line; its "Used in" becomes "18 to order, in the supplier orders: Northside Test Foods (5), 13 not linked to a product yet". The work happens in the chef's **Supplier order** page: a line under the heading says "For the functions (Smith 50th, Lee 21st): 5 products here. 18 not linked to a product yet: Link them." and each product linked to a platter item by its existing alias shows **Functions: 60 pieces · about 2 boxes of 48 (Smith 50th, Lee 21st) · Use 2 boxes**, the same Apply-only way as the page's other suggestions. The pack sum shows only where the product's order unit and pieces per box are confirmed.

Pictures: [Orders 390](design-c/orders-390.png), [Orders 1280](design-c/orders-1280.png), [supplier 390](design-c/supplier-390.png), [supplier rows 390](design-c/supplier-rows-390.png), [supplier 1280](design-c/supplier-1280.png), [supplier rows 1280](design-c/supplier-rows-1280.png).

- **Pros:** the smartest about units: boxes, not pieces, where the catalogue knows the pack; it lands where the chef builds the real order; nothing new on the staff list; Apply keeps the chef in charge.
- **Cons:** every platter item has to be linked to a product once (aliases) before it helps, 18 of 23 not linked in the preview; chef only; the supplier page is lazy and heavy (more code and tests); the order list itself does not show the ingredients, so it is not what was asked; "pieces per box" is not set for most products today.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Where the ingredients show | Inside the function's own row | A block before the requests, then as rows | On each product in the supplier order |
| Task | Open, read, order outside, tick once | Open, Add all, order, tick each | Open supplier order, Use each, record the order |
| Sum across functions | No, per function | Yes | Yes |
| Writes | None new | 22 lines on Add all | None new (supplier draft as today) |
| Who sees it | Everyone (closed by default) | Chefs; staff see the rows | Chefs only |

### Measurements (Preview: design markup laid over the Implemented app)

Source `cd0bb25`, `tests/fake` stand-in, chef Sam unless named, the fixture above, real fonts. "Rows" are list rows wholly above the fixed Add request button.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Rows at 390 (chef) | 2 | 2 (closed) | 3 after Add all (the 22 added rows go to the end) | 2 |
| Rows at 1280 | 7 | 6 | 5 | 7 |
| Rows at 390 (staff) | 4 | 4 | 6 | 4 |
| Taps to see what a function needs | about 8 plus arithmetic | 1 | 1 | 2 (link, scroll) |
| Taps to put it on the list / order | tick 1 | tick 1 | Add all 1, then tick 22 | Use 1 per product, then record |
| Add request, tick a request | 1, 1 | 1, 1 | 1, 1 | 1, 1 |
| Navigation levels | Orders, Recipes | Orders | Orders | Orders, Supplier order |
| Build size | | 1 pull request plus the bought-items data | 2 pull requests plus data | 2 to 3 plus linking every item |
| Relearning | | Low | Medium | High for chefs |
| New reads / rules | | None / none | None / none (fnFor is not checked by rules today) | None / none |
| Risk | | Low | Medium to high | Medium |

Not measured: speed with real staff; rendered contrast of new text; keyboard focus; reduced motion; Not sent and failure states (A and C write nothing new; B's Add all would use the existing request save and Undo).

## Council round 2: scores

Six fresh reviewers (the five plus the kitchen screen designer) saw all three designs, the same evidence packet and the service rules. Scale: out of 10, 10 best for the kitchen. All six said the designs differ in structure (where the work happens, the task, the writes), not just looks.

| Reviewer | A | B | C | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | 8 | 3 | 5 | A, with B's sum across a shared order day in the closed fold |
| Head chef | 7 | 4 | 3 | A plus B's sums across functions, read only, inside each fold |
| Skeptic | 7 | 3 | 4 | A with the tick pinned to the first line, plus B's same-day total as words |
| New starter | 7 | 5 | 3 | A with the tick rule moved up |
| Keeper of the book | 8 | 4 | 5 | A, each item also showing the order-day total and Also asked, one shared helper with Prep |
| Kitchen screen designer | 7 | 4 | 3 | A, repaired, with B's Also asked wording |
| **Total (of 60)** | **44** | **23** | **23** | **A first with all six** |

Disagreement: the cook and keeper put C second (boxes, not pieces; nothing on the staff list); the head chef, new starter and designer put B second (it is what was asked; its picker is the best). Nobody wants B's written rows or the all-three blend.

### Contract fit

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose (steel work book, paper inside) | Works | Works | Works |
| State meaning (words carry status) | Needs work: "Also asked" in orange read as an action or error (fixed in the mix) | Needs work: after Add all the band still says "It is on the order list" and the count still says 0 of 7 (preview) | Needs work: "about 2 boxes" reads like a guess |
| Ids, Orders tag, lines off, rollover, Cancel | Works (read in source, not run) | Needs work: rollover drops `fnFor`, `lineOf()` matches by root only, the tick changes meaning, Undo of 22 lines | Works on Orders; real counts there would need catalogue reads (Not evidenced) |
| Service continuity (rows, taps) | Works closed (2 rows at 390, 1 tap); open, the tick drifted mid-fold (fixed in the mix) | Needs work: 22 rows, 22 ticks | Works on Orders; the supplier chip is a 32 px target in a narrow column |
| Real contrast, focus, reduced motion, dark | Not evidenced | Not evidenced | Not evidenced |
| Not sent, failure states | Not relevant (no writes) | Not evidenced | Not relevant on Orders |

### Reference fit

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3: occasional detail tucked away, frequent action visible | Works: closed fold, one tick | Needs work: 22 rows in the work list | Works: Orders unchanged |
| Airbnb: what is needed, for when, and status in one place | Works per function | Works across functions | Needs work: a second page |
| Todoist: never guess a quantity or unit | Works: To come, no adding across units | Needs work: "[amount to come]" becomes a row | Works only where pieces per box is confirmed |
| Linear: one place, one way to finish a job | Works | Needs work: a second way to add requests | Needs work: two places to finish |
| Duolingo: a tap answers truthfully | Works (nothing new written) | Needs work: band and count untrue after Add all | Works (Apply only) |
| Headspace: one name, plain words | Needs work: the tick rule sat below 18 items | Needs work: 23 in the heading, Add all 22 | Needs work: "linked to a product", "about" |

### Break-it findings (round 2)

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| A, fold open: the row's tick and Remove sat beside "Fried haloumi" at 1280; a wet thumb ticks the whole function | Checked in the preview picture (`design-a/open-1280.png`); the mis-tap itself Risk / Not evidenced | Fixed in the mix: the tick and the row's buttons pinned to the first line (measured: tick top = title top at 390, 768, 1280). Click test in the build |
| A or the mix: the function changes after its order day while its rolled line is still open; the fold draws new totals under the old words, and the Changed line repeats the full new totals, so the extra is ordered twice | Risk / Not evidenced (read in `js/functions.js`) | Build rule: draw the fold only on an open line whose text equals `orderBody(f).text` for the live booking; otherwise say "Changed since this line: check what was ordered". Ticked lines draw no fold. Fixture in `tests/fn-order-tag.test.js` |
| B: added rows not ordered by Sunday roll over without `fnFor`, never leave once all sent; two phones or a double tap give 44 rows | Read in source, not run | B not recommended. If ever built: copy `fnFor` in the rollover, read it in `lineOf()` and the 03:00 job, fixed ids |
| C: real counts on Orders need catalogue reads each time a chef opens Orders | Checked in `capture.cjs`: the preview count is hard-coded | C not recommended now |
| Shared with Prep today: a phone not yet synced after the head chef changes a platter card adds up the old amounts | Risk / Not evidenced | The same as Prep's block; note in the build |

## Mix

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A: closed fold inside the function's own row, one tick | Take | Things 3, Linear | 1 tap instead of about 8 plus arithmetic; list unchanged when closed | One tick covers all items | 2 rows at 390 closed, as today |
| A: tick rule at the bottom of the fold | Reject, move to the top | Headspace | Read before the list, next to the summary | None | New starter |
| B: the total across functions ordered the same day | Take, as words on each item ("60 pieces in all with Lee 21st") | Airbnb | The number the chef orders, without adding two folds | Another function's total inside this row: needs clear words | Five of six reviewers |
| B: "Also asked: 1 box (Sam)" | Take, in bold ink, no colour | Todoist, Duolingo | No double order across units | None | All six |
| B: Add all and written request rows | Reject | Linear, Duolingo, service rule 4 | | 22 rows, 22 ticks, rollover and lines-off gaps, untrue band | All six |
| C: pack sums ("about 2 boxes of 48") on the supplier order | Reject now; a later step once platter items are linked to products | Todoist | Boxes, not pieces | Second place to finish; linking work; reads on Orders | Keeper, skeptic, cook |

**All three:** rejected by every reviewer: A's tick, B's Add all and C's Use are three ways to say done, and C needs catalogue reads on Orders. **A plus B's words** beats A alone at no read, write or rule cost.

### The combined preview (A repaired + B's words)

Pictures: [closed 390](design-mix/closed-390.png), [open 390](design-mix/open-390.png), [open 390 full](design-mix/open-390-full.png), [Lee 21st's fold open 390](design-mix/open-lee-390.png), [closed 768](design-mix/closed-768.png), [open 768](design-mix/open-768.png), [closed 1280](design-mix/closed-1280.png), [open 1280](design-mix/open-1280.png).

Closed it is A: the function's line with "What it needs: 18 to order ▾" in place of the "Used in" links, one tick. When a second function is ordered the same day, both lines say "What both functions need: 23 to order ▾" and open to **the same one order**:

- first, the rule: "One order for Smith 50th and Lee 21st. Once all 23 are ordered, tick both lines."
- each item with the total first ("Party pies 60 pieces"), the split small under it ("40 pieces Smith 50th · 20 pieces Lee 21st (4 Aussie · 2 Aussie)"), or "Smith 50th only";
- a request already on the list on its own bold line: "Also on the list: 1 box (Sam). Not counted in the 60 pieces.";
- then Check you have, and Made here, on Prep.

The tick and the row's own buttons (⋯ and Remove, as the row has them today) stay on the first line. Nothing is written.

| Measured (Preview) | Today | Mix |
| --- | --- | --- |
| Rows at 390 / 768 / 1280 (chef, closed) | 2 / not measured / 7 | 2 / 6 / 6 |
| Taps to see what a function needs | about 8 plus arithmetic | 1 |
| Add request, tick a request, tick the function | 1, 1, 1 | 1, 1, 1 (2 when two functions share the order) |
| Tick top against the title top, open | | 0 px at 390, 768 and 1280 |
| "What it needs" target height | | 44 px (the book's `.fnn-sum`) |
| Fold height open, two functions | | 1,494 px at 390, 1,225 px at 768 and 1280 |
| New reads, writes, rules, ids | | None |

At 1280 one fewer row shows closed (the summary is a 44 px line where "Used in" was a small one).

### Focused follow-up on the combined preview

Review status: a lead synthesis of the reviewers' own suggestions, then checked by the two reviewers who raised its risk.

- **New starter:** beats A, "only just": the tick now stays where it can be found and the totals save adding two folds. Found a real misread in the first version ("60 pieces in all with Lee 21st"): order 60, tick only Smith 50th, and Lee 21st's 20 gets ordered again; "in all with" is hard English; "Also asked" no longer stood out and did not say whether Sam's box counts.
- **Screen designer:** one coherent layout that beats A: one tick and one set of row buttons pinned at every width, no duplicated control. Same finding: both folds said "60 in all", which reads as 120, and neither tick said which line covers it; the eye lands on the function's own amount, not the total. Suggested the total first, the split small under it, and saying one order covers both lines.
- **Repaired in the pictures above:** the shared-order wording, total first with the split under it, "Not counted in the 60 pieces", and "tick both lines". Not re-reviewed after the repair.
- **Still open:** at 390 the tick is off screen once the fold is scrolled (the rule sits at the top, the fold closes with the same tap); contrast of the small grey split and the Order today chip; keyboard focus on the toggle; 768 with both folds open; the real app.

## Recommendation

**Recommend A's main flow + B's shared-order totals and "Also on the list" words (the combined preview), and nothing from C for now.** Keep the one function line and its tick; replace its "Used in" links with a closed **What it needs** fold worked out on the phone; when other functions are ordered the same day, show one order across them, total first. It beats each single design: A alone leaves the chef adding two folds; B floods the list with 22 rows, 22 ticks and rollover gaps; C helps with 5 of 23 items today and needs product linking and a second place to finish. Principles: Things 3 (detail tucked away, one tap), Airbnb (the whole order in one place), Todoist (no guessed amounts, no adding across units), Linear (one way to finish). Main downside: one tick covers the whole order, so a half-done order cannot be marked, and with two functions on one order the chef ticks two lines.

It is not exactly what was asked: the ingredients are **inside** the function's line, not separate lines on the list. Separate lines (B) is the head chef's call if the half-done tracking is worth 22 rows and the rollover work.

### Before building: the head chef's answers

1. **Which platter items does the kitchen buy for a function?** The previews used an example: house recipes (Tomato sauce, Tomato relish, Tartare) go to Prep; 2-pot sauces and dips (BBQ, Sweet chilli, Sweet soy, Caramelised onions, Basil pesto) are "Check you have"; everything else is to order. Which of Meatballs, Quiche, Garlic bread, Pizza slabs, Sourdough, Lemon wedges, Sweet potato chips are made here or kept in stock?
2. **Amounts the cards do not give:** Prawn crackers (handful), Sweet potato chips (large handful), Scallops and King prawns (6-8 each: show "36 to 48"?), Lemon wedges (8 wedges: how many lemons?). Until confirmed they show "amount to come".

### Build plan (after the choice)

One pull request: move the platter sum out of Prep's `fnNeeds()` into one shared helper in `js/functions.js` (Prep and Orders both use it; Prep's behaviour unchanged), the item kinds in the platter data, the fold on Orders (`ordRow()` / `fnOrdTag()` in `js/prep.js`), CSS, `docs/design-patterns.md` and `tests/design-patterns.test.js`. Rules: draw the fold only on an open line `orderTag()` matches whose text equals `orderBody(f).text` for the live booking; a line that no longer matches says "Changed since this line: check what was ordered"; a ticked line draws no fold. Tests that fail on the old code: the fold and its sums, the shared order, Also on the list, the changed-booking case, the tick pinned at 390/768/1280, Prep's block unchanged, `tests/read-budget.test.js` unchanged. No rules, reads or writes change.

## Chosen

18 November 2026: the head chef said "Build the mix". The two data questions above were not answered; the build uses the previews' split, which the head chef can change without code: `fnStock` in `js/data.js` names the kept sauces and dips (Check you have), a platter item linked to a house recipe is Made here, on Prep, every other item is to order, and an amount the card does not give says amount to come (a range like "6-8" says both ends, "36 to 48 pieces").

## Built

- **The sum, once** (`M.platterNeeds()` in `js/functions.js`, node runs it): Prep's What the platters need (`fnNeeds()` in `js/prep.js`) now calls it with Prep's own key and hidden items, so Prep shows what it showed before; Orders calls it with the kept list. It also adds up both ends of a range and names a platter with no card (never left out quietly).
- **The fold** (`fnoFn()`, `fnoGroup()`, `fnoNeeds()`, `fnoAmt()`, `fnoAsked()`, `fnoHTML()` in `js/prep.js`, drawn by `ordRow()`): only on an open function stock line that has the Orders tag and whose words are still the booking's own (`orderBody()`); a ticked line, a line written before the booking changed, and the Changed and Cancelled lines keep their Used in links. Every open function stock line on the list is one order. `S.fnoOpen` keeps one fold open, in memory; the tap keeps the focus on its button. `fnOrdSig()` now also says what the folds would show, so a booking's platters changing redraws the list; a booking edit that changes nothing on it still draws nothing.
- **A tick moves no row** (`fnoHeld()`): a ticked line that had the fold keeps it: closed, its button's room stays, hidden and silent (`.fno-held`), like the Orders tag; open, it stays open until its own button closes it. Found by `tests/fn-order-tag.test.js` (the row went from 208 to 180 px when the fold gave way to Used in) and fixed before the pull request.
- **Look** (`css/app.css`): `.fno-row` keeps the tick and the row's buttons on the first line (phones centred the tick before: measured 815 px below the title with the fold open until fixed), `.fno-sum` (the book's 44 px `.fnn-sum`), `.fno-box`, `.fno-rule`, `.fno-note`, `.fno-ask` in ink, no attention colour.
- **Data** (`js/data.js`): `fnStock` and its note at the top.
- **Tests:** `tests/fn-order-needs.test.js`, 44 checks (the sum, closed and open, one order for two functions, one function, a ticked line keeping its room, a tick moving no row closed or open, a changed booking, staff, a booby-trapped name, a range, the tick and no sideways scroll at 390, 768 and 1280). Against the old code 15 of 24 fail (the old code has no sum, so its later checks stop early). Also run and passing: `fn-order-tag`, `fn-prep-feed` (Prep's block unchanged), `fn-sent-tidy`, the other `fn-` files, `order-*`, `orders-a`, `read-budget`, `design-patterns`, `safe-text`, `roles`.
- **Implemented app** (stand-in, the fixture above, chef Sam): [closed 390](built/closed-390.png), [open 390](built/open-390.png), [open 768](built/open-768.png), [open 1280](built/open-1280.png). Rows above Add request closed: 2 at 390, 6 at 768, 6 at 1280, as the combined preview. The tick 0 px from the title's top and the button 44 px at all three widths. At 390 the closed label wraps to two lines ("What both functions need: 23 / to order").
- **Reads, writes, rules:** none.
- **Differences from the combined preview:** Check you have and Made here say the count with no unit ("BBQ sauce 16"): the card says "2ea" and the pins say pots, so the book does not print "pieces" for a sauce. The rule line names every function on the list ("One order for Smith 50th and Lee 21st"), for three or more "tick all 3 lines".
- **Not evidenced yet:** rendered contrast of the small grey split on paper, keyboard focus ring on the fold button in the real app, reduced motion (none used), the live site.
