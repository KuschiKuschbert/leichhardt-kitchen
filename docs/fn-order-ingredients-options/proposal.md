# Function platters: their ingredients on the order list (proposal and evidence packet)

Round 1 of the service council, 18 November 2026. Source: `origin/main` at `cd0bb25`. No code written.

## The ask

Head chef, 18 Nov 2026: "based on our ingredients we have for all function platter items, instead of putting the function itself on the order list, can we add those ingredients? but somehow in a smart way to the orderlist?"

## The problem in the kitchen

On a confirmed function's order day, Orders gets one line for the whole function:

> Function stock: Smith 50th, Mon 23 Nov: 4 Aussie, 2 Vege, 3 Antipasto · 9 platters

To order from it, the chef has to know or look up what each platter holds, multiply by the platter count, add the same item across platters and across other functions that week, check what is already requested on the list, then order and tick the one line. The book already holds every platter's items and amounts per platter (the six platter cards in `js/data.js`), so the book could do that sum.

- **Who:** the chef who orders (head chef and sous chefs; staff can also tick order lines). Function managers create bookings; they do not order.
- **How often:** every confirmed function, on its order day. The number of functions a week is not measured here.
- **What people do today:** read the one line, open the platter cards (Recipes, Functions), work the maths in their head or on paper, order, tick the line. Not measured with real staff.

## How it works today (contracts)

- **Order day** (`js/functions.js`, `orderDay()`): the latest Sunday 4 or more days before the function, or today when booked later. One line `orders/<order day>/lines/fn-<function id>`, text `Function stock: <name>, <day>: <qty> <platter>, ...`, qty `<n> platters`, `recipes` the platter ids, `fn` the function id. It rolls over until ticked ordered. A change after the order day adds `Function stock changed: ...` today (`fn-<id>-<yyyymmdd>`); a cancel after it adds `Function cancelled, check the order` (`-x`), a restore `-r`.
- **Orders tag** (10 Nov 2026, [brief](../function-ahead-options/brief.md)): that line says Order today on its order day, then Not ordered yet with "For Sat 14 Nov · order day was Sun 8 Nov" (chefs). It matches the line by its id `fn-<function id>` and its words naming the day (`orderTag()`). The Functions band on every page says "Order today ... It is on the order list."
- **Function sent, lines off** (14 Nov 2026, [brief](../fn-sent-tidy-options/brief.md)): once every round is sent, a function's open order line leaves the list (the phones and the 03:00 job `scripts/fn-sent-tidy.mjs`), matched by id `fn-<id>` with `-<day>`, `-x<day>`, `-r<day>`. Lines added for a function from Prep carry `fnFor` (function ids) and leave with it.
- **Rules** (`firestore.rules`, `functionLine()`, `statusOrderLine()`): a function manager writes lines whose key starts `fn-<id>` with only the listed fields, and the rules read the function document (`getAfter`, `get`) for each such line. A chef's Cancel / Undo may write only the exact bodies stored in the function's `effects` map (`effects.order`, `.cancel`, `.restore`). Firestore rules stop at about 1000 steps per save; a cancellation of the largest booking (12 lines, 8 rounds) is already tested close to that, and one more check on every prep line pushed it past ([brief](../fn-sent-tidy-options/brief.md), Chosen and built).
- **Prep already does the sum for prep** ("What the platters need", `fnNeeds()` in `js/prep.js`): a folded block on today's Prep list, "What the platters need: 18 today, 12 tomorrow ▾". Open, it lists each platter item added up across today's and tomorrow's platters ("Party pies 40 pieces, Smith 50th: 4 platters"), with Add (a normal prep line, linked by `fnFor`) and Not needed (hidden on this phone for that day). An amount the card does not give for sure shows "amount to come". No reads: functions listener plus the prep list.
- **Orders** (chosen C, 9 Nov 2026, [brief](../order-list-options/brief.md)): one flat request list. Staff see one list in entry order; chefs also see urgency/age. Item completion means actually ordered. A compact supplier cut-off fold sits before the list (`.o-cut-fold`, View / Hide, never opens by itself). Orders does not load the supplier catalogue. Add request is one tap. The double-up check (13 Nov 2026): an open request for the same item (`dupKey()`) with the same amount or none is not added again; the slip offers Add anyway.
- **Supplier order** (chef only, `#/suppliers/<id>`, [notes](../supplier-workspace.md)): the private catalogue with packs, pars, order units and verified conversions. Suggestions show their evidence and need Apply; "flag staff requests through explicit aliases/matches"; units are never inferred from a name or pack; no automatic orders.
- **Writing rules:** only quantities the head chef confirmed; anything else in [square brackets] and "To come".

## The platter data the sum would use

Per platter, from `js/data.js` (the head chef's overlay may have changed some). How the book's amount reader (`LK_AMT.parse`) reads each amount today:

| Platter | Items (amount per platter → read as) |
| --- | --- |
| Pizza | Margherita pizza ½ slab → 0.5 slabs; Pepperoni pizza ½ slab → 0.5 slabs; Garlic bread 1 whole → 1 whole |
| Aussie | Party pies 10, Sausage rolls 10, Duck spring rolls 8, Meatballs 20, Quiche 8 → pieces; Tomato sauce 2 (house recipe, linked); BBQ sauce 2, Sweet chilli sauce 2 → "2 pieces" (they are pots) |
| Vege | Vege spring rolls 10, Vege quiche 8, Mozzarella sticks 10, Pumpkin arancini 10, Fried haloumi 8, Garlic bread 1 whole; Tomato sauce (house), BBQ, Sweet chilli 2 pots each |
| Yumcha | Dim sims 10, Cocktail spring rolls 10, Wontons 10, Karage chicken 10 → pieces; Prawn crackers "handful" → not read; Sweet soy 2, Sweet chilli 2 pots |
| Antipasto | Prosciutto 80 g, Leg ham 100 g, Salami 100 g, Cheese selection 300 g (Cracker Barrel, blue, brie), Crackers ½ pkt, Sourdough 1 cob, Dried fruit salad 120 g; Tomato relish (house, linked), Caramelised onions 2, Basil pesto 2 pots |
| Seafood | Scallops "6-8" → not read; B.B. whiting 7; Fried squid 100 g; King prawns "6-8" → not read; Oysters 10; Sweet potato chips "Large handful" → not read; Lemon wedges 8 (you buy lemons); Tartare (house, linked), Sweet chilli 2 pots |

What the cards do not say: which items are bought for each function and which are kept stock (sauces, cheese) or made in house beyond the three linked recipes (meatballs? quiche? caramelised onions? pizza slabs? garlic bread?); what pack or unit each is ordered in; which supplier; whether seafood should be ordered closer to the day than the Sunday before.

## The change proposed (not a design)

Instead of one "Function stock" line, the order list shows the platters' ingredients, worked out by the book from the platter cards, in a smart way. Ideas for "smart" to weigh (not all need building):

1. Multiply by the platter count and add the same item across platters and across functions with the same order day ("Party pies 60 pieces: Smith 50th 4 Aussie, Lee 21st 2 Aussie").
2. Leave out what the kitchen makes (linked house recipes go to Prep's "What the platters need", not Orders).
3. Match requests already on the list (the double-up check): "Party pies 1 box (Sam)" already requested is not added twice.
4. Keep the link to the function, so a change, a cancellation and All sent still take lines off or say what changed, only the difference after ordering.
5. Say an amount the card does not give for sure as To come, never a guess.
6. Remember which items are never ordered for functions (kept stock), so the list does not fill with sauces every week.

## Cost and risk (to be checked by the council)

- **Reads:** none new if worked out on the phone from the functions listener (already on every phone) and today's order list. A design that reads the supplier catalogue on Orders adds reads and is chef only.
- **Writes and rules:** writing one order line per ingredient from the function save would turn 1 line into about 6 to 30 per function, each checked by `functionLine()` (two document reads of the function each, and the Cancel path checks stored `effects` bodies). Risk: the 1000-step limit on the largest booking's cancel; new rules and emulator checks. A design that keeps the one line and draws the sum on the phone needs no rules change.
- **Contracts touched:** the Orders tag, Function sent lines off (ids), the band's "It is on the order list", the order rollover (copies `root`, not `fn`), `tests/fn-order-tag.test.js`, `tests/fn-sent-tidy*`, rules emulator tests, `docs/code-contracts.md` (Functions).
- **Data gaps:** sauces in pots, ranges, handfuls, lemon wedges, pizza slabs; which items are bought. The head chef would have to confirm some of this, or the list shows To come.
- **Files:** `js/functions.js`, `js/prep.js` (order list), `css/app.css`; maybe `firestore.rules`; tests. Each merge that changes the book costs a reload on every phone.

## Measurements now (Implemented app, stand-in)

Source `cd0bb25`, `tests/fake/` stand-in, synthetic data (one function "Smith 50th": 4 Aussie, 2 Vege, 3 Antipasto; five requests: Brie Out, Milk 6 L, Party pies 1 box, Sweet chilli sauce Low, Lemons 2 kg; the stand-in's own seed in `tests/lib.js` adds Milk 6 L and Brioche buns 4 packs, so the page says 0 of 8 ordered and Milk shows twice: a fixture artefact, not a book fault), real fonts, 390 x 844.

- Chef (sous) on Orders at 390 px: the Functions band ("Order today · Short notice · Stock for Smith 50th ... It is on the order list") takes the top, then the date row; **3 rows** show above the Add request button: Brie, the Function stock line (4 lines of handwriting tall, with Order today and "Used in" three platter links), Milk. Pictures: [chef 390](baseline/orders-sam-390.png), [staff 390](baseline/orders-ann-390.png), [chef 1280](baseline/orders-sam-1280.png).
- Taps to know what to order for the function today: open Orders (1), then for each platter tap its "Used in" link and come back (2 per platter: 6 for three platters), plus the maths by hand; tick the line (1). About 8 taps and mental arithmetic. Not measured with real staff.
- Taps for the main Orders jobs (Add request, tick a request): 1 each. Must stay 1.

## Design references to test

- **Todoist:** known defaults visible and editable; never guess a quantity from ambiguous text ("handful", "6-8").
- **Things 3:** today's order work apart from upcoming; occasional detail tucked away.
- **Airbnb:** what the function needs, for when, and its status in one place.
- **Flighty:** the order day as a real deadline, from data the phone already has.
- **Duolingo:** every tap answers truthfully; nothing says Ordered that was not.
- **Headspace:** one name for each thing ("Function stock" vs "For the functions").
- **Linear:** consistent row actions; no second way of adding a request.

## Shared contracts each reviewer must apply

- **Service rules** (head chef, 5 Nov 2026): main job one tap from its tab; no new tab, bar button or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; a change that adds taps or takes away visible lines says why.
- **Surfaces** ([surface colours](../surface-colours.md#selected-design)): Orders is a steel work book with warm paper inside. Amber is named attention or pending; green confirms the stated success; red is errors and adverse states. Words, ticks and pressed states carry status, not colour alone.
- **Operational colours** ([colour coding](../colour-coding.md#shared-meanings)): orange is action and brand, not "overdue"; Not sent / pending is neutral or orange with words; a new unsent line must not look completed.
- **Patterns** ([design patterns](../design-patterns.md), Inside a list): a function's stock line on Orders (`.o-fn-tag`, Order today / Not ordered yet, a ticked line keeps its room); a line that leaves because its job is done elsewhere (`.is-leaving`, "Not needed: Smith 60th all sent"); a long run of rows that are not the point folds into one line that names them and says Show; compact supplier cut-offs fold (`.o-cut-fold`, never opens by itself).
- **After the tap** ([action feedback](../action-feedback.md)): every action answers in its own frame and says what it did, by name; Saved only after the server has it.
- **Reads** (`CLAUDE.md`, coding rules): 50,000 reads a day on the free plan; no new listeners or polling; every new read says when it runs and what it costs.
- **Never guess, never save nothing** (`CLAUDE.md`, Changes that went wrong before): no match or more than one shows a card that says so.
