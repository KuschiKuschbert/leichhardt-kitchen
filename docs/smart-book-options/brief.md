# A smarter book: records, inputs and suggestions

**Status, 13 November 2026: audit and both council rounds done; waiting for the head chef's choice.** Nothing in the book has changed. Role-based analysis, not research with staff. Every picture is the real book on the click tests' stand-in with made-up people (Ann, Bo, Sam) and made-up records. Source: `main` at 87dc6a1.

## What was asked

The head chef: "Now I want to make the whole app smarter. Run a whole audit on where and how to make the app smarter. Focus on record tracking for me, [improving] the inputs for staff and myself. Etc. Maybe some better smart suggestions with less clicks across the board. Suggest something and design when necessary."

"Invoicing" in the request may be dictation for "improving", or mean delivery invoices. The book has no invoice, docket or credit field. The second reading is proposal R3, left as the head chef's call.

## How it was done

1. **Discovery.** Four read-only explorers mapped staff inputs, the head chef's records, the smart engine and the chefs' planning flows, each with file and line. The lead checked the load-bearing claims and reproduced two on the stand-in. Registers: [audit.md](audit.md). Today's screens: [baseline/](baseline/), taken with [capture-baseline.cjs](capture-baseline.cjs).
2. **Round 1** on 18 proposals: five fresh reviewers (cook, head chef, skeptic, new starter, keeper) with one [evidence packet](evidence-packet.md). Their answers as given: [round-1-reviews.md](round-1-reviews.md).
3. **Round 2** on the two screens round 1 asked for: three designs each ([designs.md](designs.md), [evidence/](evidence/), [preview/](preview/)), scored by the same five plus the kitchen screen designer: [round-2-reviews.md](round-2-reviews.md).

## The book is already smart in many places

Prep has the usual typeahead, usual amount chips, Quick add (Due today, Usual for a weekday, Regulars), Start here, Pace, Closing soon, Stuck lines and waste hints; Orders fills the usual amount and offers Usually ordered; Wastage has Logged often; Transfers its chips; Deliveries its Due today chips; Today's team the usual section; the supplier order tops up to par; Functions work out platter needs. Five of them are measured. The audit's finding is not "add more guesses" but: **two guesses are missing where they should work, most guesses are not measured, and the head chef's records are scattered and partly lost.**

## Reproduced

1. **Wastage: the full name typed fills nothing.** "Chips", logged 3 times in 14 days, typed in full: amount, reason and section stay empty, while the Logged often chip above fills all four ([picture](baseline/waste-exact-390.png); `wSuggest()` leaves out the exact name, `js/prep.js:7556`; typing never calls `wLast()`, `js/prep.js:12384`). Transfers has the same gap (`js/prep.js:7986`). This breaks the coding rule "filling in what the book knows".
2. **Orders: no double-up check.** "Milk" with Milk 6 L already on today's list: the usual amount fills and nothing says it is already there ([picture](baseline/orders-milk-390.png); `addOrder()`). Prep has one. That a second Milk line is then saved is read in the code, not yet run.
3. **Measured on the Wastage sheet:** Log it sits below the first screen at 390, 768 and 1280 px (989 px at 390 x 844), and so do the reason choices. Anything filled below the fold needs naming above it.

## Round 1: should we build it?

| Id | Proposal | Verdict | Votes (cook, head chef, skeptic, new starter, keeper) |
| --- | --- | --- | --- |
| R1 | Day book: one day's records together | **Build smaller**: merged with R2 into one records page | NMC, Smaller, Smaller, NMC, Smaller |
| R2 | Food safety records for a date range, print and CSV | **Build smaller**: R1's page and print | NMC, Build, Smaller, NMC, Smaller |
| R3 | Docket or invoice number, "anything short?" on Delivery received | **Your call**: only if invoices are tracked | Your call, 5 of 5 |
| R4 | Records that disagree or are left out | **Build** (fixes) | NMC, Build, Build, NMC, Build |
| R5 | Yesterday's record gaps as one Inbox line | **Your call** (reopens the 10 Nov cut) | NMC, Smaller, Your call, NMC, Your call |
| I1 | Fill what the book knows on a typed name (Wastage, Transfers) | **Build**, shown as filled in words | Build, Build, Smaller, Smaller, Build |
| I2 | Orders double-up check | **Build** | Build, 5 of 5 |
| I3 | Waste-aware one-tap amounts | **Build smaller**: warning words only, the tap does the same | Smaller, Smaller, Don't, Smaller, Smaller |
| I4 | Prep fills the usual amount like Orders | **Build**, with the same filled pattern (split) | Build, Don't, Don't, Build, Build |
| I5 | Add all due, Add all for the functions | **Don't build** | Your call, Don't, Don't, Smaller, Don't yet |
| I6 | Weekday and recency ranking; tomorrow's chips at night | **Build smaller**: weekday ranking only, after E1; no change to learning | Smaller, 5 of 5 |
| I7 | Staff requests on the supplier row, ticked after Record | **Build smaller**: show them on the row, no bulk tick | NMC, Smaller, Smaller, Your call, Smaller |
| I8 | Quick wins (deliveries order, Before service filter, cleaning section, drinks from the plan, planned cook first) | **Build smaller**: drop the planned-cook-first pick and the Use it guess; keep orders fixed all day | Build, Smaller, Smaller, Smaller, Build |
| I9 | Send to to-do | **Don't build** | NMC, Don't, Don't, NMC, Your call |
| E1 | Count every suggestion, and "changed after the guess" | **Build first** | Build, 5 of 5 |
| E2 | The nightly job does the sums once | **Build smaller** (a 2 to 2 tie; the head chef's Build was also "only if the read budget test proves the saving"): prove the reads saved; nothing private in the staff summary | Build, Build, Smaller, NMC, Smaller |
| E3 | Platters from guest numbers | **Don't build**: it would invent quantities | Don't, 5 of 5 |

NMC: not my concern (the reviewer's role does not use it). The verdict is the majority of those who voted.

**What the council agreed on:** fix what is broken before adding anything smart (I1, I2, R4); count before guessing more (E1 first, 5 of 5); lost records come before new tricks (cooling is overwritten every day); a box the book filled must say so in words, and never fill below the fold silently (cook, new starter, keeper); things that stay put beat clever (cook, new starter: chips and lists keep their order through the day).

**Disagreement, one line each:**
- I1: the skeptic and new starter would fill unit and section only and offer amount and reason; the other three would fill all, named. Taken to round 2 (Set 2).
- I4: the head chef and skeptic say the usual amount chip already does it and a fill looks typed; cook, new starter and keeper say build with Orders' filled words. Follows Set 2's choice.
- R1/R2: the keeper would leave the cooling copy out of the first build (new record, rules, backup, Move PIN); the head chef and skeptic would start the cooling copy first, as every day waited is a day lost.
- I5: the new starter would allow it for chefs only; the others say no.

**Break-it findings carried (all Risk / Not evidenced; each has its check in the build plan):**
1. A records part that fails to load, printed as "none" for an inspector (skeptic, keeper). Repair: every part says Loaded, None or Could not load, and a print marks a part that did not load. Check: a click test where the stand-in fails one query.
2. A fill that stays on the wrong item: "Chips" filled, then the cook types on to "Chips salt" (skeptic). Repair: fill only empty boxes, name the fill, clear it when the name stops matching. Check: a click test with the longer name.
3. Yesterday's gaps line (R5): a pack-down ticked at 00:20 or a nightly run that did not happen reads as "all fine" (keeper). Repair: the line says when the check did not run. Check: a node fixture for the nightly script.
4. A bulk tick of staff requests catching "Milk bun" for "Milk" (skeptic). Repair: no bulk tick (I7 smaller).
5. Add all double tapped on a weak signal: 2n lines or half a batch (keeper). I5 not built.

## Round 2

[Filled in when the reviews are back.]
