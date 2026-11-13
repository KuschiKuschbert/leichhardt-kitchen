# A smarter book: records, inputs and suggestions

**Chosen 13 November 2026: both recommended mixes ("For one and 2 I'll take your recommendations, build please"); no invoice tracking.** Built in pull request #691: see [Chosen and built](#chosen-and-built) at the end. Role-based analysis, not research with staff. Every picture is the real book on the click tests' stand-in with made-up people (Ann, Bo, Sam) and made-up records. Source: `main` at 87dc6a1.

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

## Round 2: two screens, three designs each

[designs.md](designs.md) holds both sets: the central idea of each design, the same task, pictures at 390, 768 and 1280 px, measurements and costs. Six fresh reviewers (the five plus the kitchen screen designer) ranked them; all six agreed the designs differ structurally, except the screen designer, who called Set 2's A and C one layout with a different fill rule. No numeric scores were asked for. Answers as given: [round-2-reviews.md](round-2-reviews.md).

### Set 1: one records page (T1 "everything for last Saturday", T2 "this month's food safety records for an inspector")

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook | A | C | B |
| Head chef | C | A | B |
| Skeptic | C | A | B |
| New starter | C | B | A |
| Keeper | C | B | A |
| Screen designer | A | C | B |

**C (Food safety month) first, 4 of 6**; A first for 2; B never first. C does T2 in 3 taps and can draw the month from one nightly count (1 to 2 reads); A's nine folds run to 2168 px on a phone and a week costs about 350 reads; B is "the one I would open after a complaint" (head chef) but needs about 60 taps for a month.

### Set 2: a box the book filled (Bo types "Chips" in full on Wastage)

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook | C | A | B |
| Head chef | C | A | B |
| Skeptic | C | B | A |
| New starter | C | B | A |
| Keeper | C | B | A |
| Screen designer | C | B | A |

**C (fill what describes it, the cook writes the amount) first, 6 of 6.** It never saves an amount nobody looked at (the sheet's own rule is "Write the actual amount"), and it fills the reason, which sits below the first screen. A logs a guess; B adds a tap and repeats the Logged often chip, and on Orders sits beside "Add 2 tubs".

### Reference fit

| Principle | Set 1 A | Set 1 B | Set 1 C | Set 2 A | Set 2 B | Set 2 C |
| --- | --- | --- | --- | --- | --- | --- |
| Linear: one frame, one name | Works (Wastage frame) | Works | Needs work (a new calendar look) | Works | Needs work (a second control for the chip's job) | Works |
| Things 3: frequent visible, occasional tucked away | Needs work (nine folds, mostly repeats of existing tabs) | Works | Works | Works | Works | Works |
| Airbnb: time, place, status and next action together | Needs work (a day's order lost) | Works | Works for food safety | Needs work (reason filled below the fold) | Works | Works |
| Todoist: known defaults visible, never guess | Not relevant | Not relevant | Not relevant | Needs work (a guessed amount) | Works | Works |
| Flighty: never stale status as live | Works (status row) | Works | Needs work ("Not yet" for a count not ready) | Not relevant | Not relevant | Not relevant |
| Duolingo: truthful answers | Needs work (status contradicted rows in the preview) | Needs work (same) | Works | Needs work (a fill reads as typed) | Works | Works |
| Headspace: calm words a new starter understands | Needs work ("Loaded", "Kept from") | Needs work (nine stamps on a phone) | Works | Needs work ("FILLED" can read as done) | Works | Works |

### Mix considered (A + B + C, for each set)

**Set 1:**

| Part | Take or reject | Why, and who said so | Principle |
| --- | --- | --- | --- |
| C, the month and Print this month | Take | T2 in 3 taps; misses stand out (head chef, new starter, keeper, skeptic) | Flighty, Things 3 |
| C, the nightly per-day count | Take | 1 to 2 reads for the month (keeper); "Count not ready", never "Not yet" or "0 deliveries" | Flighty |
| C, the calendar grid | Reject | A new look; 12 px text in cells; use its list of days at every width (head chef, skeptic, screen designer) | Linear |
| B, a tapped day in time order | Take | Tells the day the way service went (head chef, new starter, keeper, screen designer) | Airbnb |
| B, team plan rows as timed events | Reject | Shows a plan as if it happened (skeptic): one line, "Team (the plan)" | Flighty |
| B, orange kind labels and nine status stamps | Reject | Orange is action, not a kind; stamps fill the phone (screen designer, head chef): one status line, muted labels | Headspace |
| Everything one tap away | Take | Answers a complaint (who was on, the function) for about 30 more reads (head chef, keeper) | Things 3 |
| A, nine folds by kind | Reject | Repeat existing Reports tabs (skeptic, new starter, head chef) | Things 3 |
| A, the period frame | Reject as the body; its Print and CSV places kept | | Linear |
| Laptop list beside the day | Take (lead) | The Review desk pattern the admin panel already uses from 1100 px | Linear |

**Set 2:**

| Part | Take or reject | Why, and who said so | Principle |
| --- | --- | --- | --- |
| C's rule: section, reason and unit filled; the amount never | Take | 6 of 6 | Todoist, Duolingo |
| A's Log it words, "Log 1.5 kg Chips" | Take | The button names what it saves (cook, skeptic, screen designer, new starter) | Airbnb |
| B's Undo fill, as a 44 px button | Take | Undoes a wrong fill (skeptic, screen designer, head chef); worded "Empty these boxes" (new starter) | Duolingo |
| B's source sentence, "logged 3 times in the last 2 weeks" | Take | Says where the guess came from (new starter) | Duolingo |
| B's offer button | Reject | Repeats the Logged often chip; cannot sit beside C's fill (all six) | Linear |
| A's silent amount on Wastage and Transfers | Reject | A guess saved as a weight | Todoist |
| A's amount fill on Orders (today's fill, named) | Take | An order is a request a chef checks; cooks use the fill (keeper, skeptic, head chef) | Todoist |
| C's hint-only on Orders | Reject | Takes away a fill cooks use; an empty box looks full (head chef, new starter, skeptic) | Todoist |

No reviewer wanted all three in either set: three time models on one records page, and B's offer clashes with C's quiet fill.

### The combined previews (lead synthesis, then a focused follow-up)

The two mixes were drawn as one coherent preview each ([mix.cjs](preview/mix.cjs)) and shown to five of the same reviewers (head chef, skeptic, new starter, keeper, screen designer) with [mix-brief.md](mix-brief.md). **All five said each mix beats their first choice** (the screen designer: Wastage yes, Orders not until the duplicate went). They found six faults, all fixed in the pictures below:
- "Nothing missing" sat above "2 missed" (Reproduced, Preview): now "All three shown".
- Two identical ‹ › pairs on the laptop: now "‹ October" and "Sun 8 ›".
- Sat 7's row said 2 deliveries while the day showed 3 (head chef): they agree, and a row that cannot agree will say "Count differs. Open the day."
- "Count not ready" was red, as if failed: now muted, and only on the latest day (the nightly job catches up missed days, keeper).
- A day was opened on every laptop reload (40 to 70 reads each, 10 to 30 reloads a day, keeper): the page now opens with no day chosen.
- Orders showed "usual" three times and two Add buttons: the old "Add 2 tubs" row hides when the box already holds the usual amount.

Earlier preview faults fixed here too: wrong weekdays (8 Nov 2026 is a Sunday; the day is Saturday 7 November) and cooling rows under "Kept from 14 Nov" (skeptic, keeper, screen designer).

**Set 1 mix, Records** ([1280, no day chosen](evidence/mix-records-month-two-none-1280.png), [1280, Saturday](evidence/mix-records-month-two-fs-1280.png), [1280, Everything](evidence/mix-records-month-two-all-1280.png), [768 list](evidence/mix-records-month-list-768.png), [768 day](evidence/mix-records-day-fs-768.png), [390 list](evidence/mix-records-month-list-390.png), [390 day](evidence/mix-records-day-fs-390.png), [390 Everything](evidence/mix-records-day-all-390.png)): a Reports page. The month is a list of finished days: "Sat 7 · 3 deliveries · Cleaning: 2 missed, 1 not possible · Cooling: 2 of 2 stages recorded"; a day with no Pass check says so; days before the cooling copy say "no record before 3 Nov" in muted words. Tap a day: its records in time order, Food safety first, Everything one tap away. Print this month, Export CSV, Print this day.

**Set 2 mix, a box the book filled** ([390](evidence/mix-fill-start-390.png), [390 at Log it](evidence/mix-fill-start-390-log.png), [after typing 1.5](evidence/mix-fill-typed-390.png), [at Log it](evidence/mix-fill-typed-390-log.png), [768](evidence/mix-fill-start-768.png), [1280](evidence/mix-fill-start-1280.png), [Orders](evidence/mix-fill-orders-390.png)): typing the item's full name, when the cook leaves the name box (not on each letter, so nothing jumps mid-word), fills section, reason and unit from the item's last 2 weeks plus today's own lines; a LAST TIME tag sits inside the filled box and on Reason (Unit only when it differs from the default); one line names it, with "Empty these boxes"; the amount box is outlined; Log it is off with "Write the amount first." beside it, then reads "Log 1.5 kg Chips". Orders keeps today's usual amount fill, now named under the box with a USUAL tag.

| Mix, measured (Preview) | Today | Set 1 mix |
| --- | --- | --- |
| T1, everything for last Saturday | 15 to 20 taps, 7 places, cooling gone | 4 taps (Reports, Records, Sat 7, Everything); food safety only 3 |
| T2, this month for an inspector | not possible | 3 taps (Reports, Records, Print this month) |
| Reads on open | | 1 to 2 (the nightly count); a day about 40, Everything about 70; Print this month about 1,100, only on tap |
| First screen | | 1280: list beside "Pick a day"; with Saturday open, 7 rows. 390: first day row at 695 px |
| Sideways scroll | | none at 390, 768, 1280 |

| Mix, measured (Preview, 390 x 844) | Today | Set 2 mix |
| --- | --- | --- |
| Wastage, typed path | 3 taps + 3 typed + a scroll | 2 taps + 2 typed (item, amount) + a scroll |
| With the Logged often chip | 3 taps, 0 typed | unchanged (until the counts say otherwise) |
| The named line | none | 454 px, on the first screen |
| Log it | 989 px | 1126 px before the amount, 1054 after (137 px lower: the line and its button) |
| Reads, rules, stored data | | 0, none, none |

**Review status:** a lead synthesis checked by a focused follow-up from five of the six reviewers, not a new council round. Their findings are recorded as given; the fixes above are the lead's, drawn after the follow-up and not shown to them again.

## Recommendation

**Set 2 first: recommend the mix, C's rule with A's Log it words and B's Empty these boxes, and Orders keeping today's fill, named.** It beats each single design: C alone left the reason and amount unexplained and no undo; A logs a guess; B adds a tap and a second control. Main downside: the cook types the amount every time on Wastage and Transfers, and the Logged often chip still fills an amount (two rules on one sheet) until the E1 counts show whether filled amounts get changed. The cook dissents: the chip should follow C now.

**Set 1: recommend the mix, C's month as a list of days with a tapped day in B's time order (Food safety first, Everything one tap away).** It does both tasks in 3 to 4 taps for 1 to 2 reads on open, which no single design does. Main downside: it needs a new nightly per-day count (a server write and a dependency on the 03:00 job) and a dated cooling copy (a new record and rules), and a printed month costs about 1,100 reads. **Ship the dated cooling copy first, on its own** (head chef, skeptic): every day without it is lost for good.

**Unresolved, to check in the complete app before ready:** printing and a part that did not load on the printout; Try again; a late answer after ‹ or › landing under the right day; the 03:00 job across Queensland midnight and a missed run caught up; a Pass check after midnight on the right day; the month list on a phone with 30 rows; the named line above an open keyboard; editing the name after a fill clears only the filled boxes; Empty these boxes keeps what was typed; Transfers (not drawn); real read counts against `tests/read-budget.test.js`; Barlow fonts; rendered contrast, keyboard focus and reduced motion; sous chef and staff refused, on the emulator. "2 tubs" matches no unit chip on Orders (today's behaviour, unchanged).

## What to build, in order

Small pull requests, each its own branch, test and rollback, grouped by page so phones reload as few times as possible.

1. **Now, no design needed (fixes and counting):** I2, the Orders double-up check (exact name or a confirmed link; a near name like "Full cream milk" is not caught, said in the pull request); E1, count every suggestion and, per box, filled-and-kept versus filled-and-changed (on the existing daily record: the rules loosen, so publish first, with a `client-shapes` row); R4's fixes one at a time (loans older than 30 days in Reports, Transfers and its CSV; On it and amount changes in the CSVs; the Dashboard's "slowest section" says it times from written to ticked; the unused training count dropped).
2. **On the head chef's word, the dated cooling copy:** written with each Start, stage and confirmation, keyed by the Queensland day of the batch; create only; admin read; backup, Export and Move PIN; rules published first; the Lock probe after.
3. **After the head chef picks Set 2:** the filled pattern on Wastage and Transfers, then the Orders words; added to `docs/design-patterns.md` and `tests/design-patterns.test.js`.
4. **After the head chef picks Set 1:** the nightly per-day food safety count (server only), then the Records page (lazy, admin only), then its print.
5. **With two weeks of E1 numbers:** I3 (waste warning words on one-tap amounts), I6 (weekday ranking only), I7 (staff requests on the supplier row, no bulk tick, its own study), I8's quick wins grouped by page (deliveries not yet received first, Before service "Not on the list yet", Cleaning opens on your section, drinks from the plan), E2 (nightly sums, only if `tests/read-budget.test.js` proves the saving), and whether the Logged often chip follows C.
6. **Not built:** I5 (Add all), I9 (Send to to-do), E3 (platters from guest numbers). **The head chef's call:** R3 (a docket or invoice number and "anything short?" on Delivery received, never prices) and R5 (yesterday's gaps as one Inbox line, which reopens the 10 Nov cut; the head chef reviewer said no).

## Questions for the head chef

1. Set 2, how a filled box looks: the recommended mix (fill section, reason and unit, you write the amount; Orders keeps its fill)?
2. Set 1, the records page: the recommended mix (a month of days, tap a day for its records in time order)?
3. Start keeping a dated cooling record now, on its own (a new record and a rules change)?
4. "Invoicing" in your message: did you mean delivery invoices or dockets (R3), or improving the inputs?
5. Build step 1 now (Orders double-up, counting suggestions, the report fixes)? They need no design choice.

## Chosen and built

The owner, 13 November 2026: "No invoice tracking in the app, what do you mean with dated cooling record? The operandio timer thing? For one and 2 I'll take your recommendations, build please." So R3 is not built. Question 3 (keeping the book's own cooling stage confirmations per day) waits: the Records page says "Cooling is recorded in Operandio. The book keeps only today's batch." Question 5 (the fixes and counting with no design) waits for the owner's word.

**1. Filled for you** (`js/prep.js`, `css/app.css`, `docs/design-patterns.md`). Wastage: leaving the name box with an item's full name fills its section (only when the box is empty and no section is planned), reason and unit (only before an amount is written) from its last 2 weeks and today's lines (`wLastAll()`); never the amount. A LAST TIME tag sits in the section box and on the Unit and Reason labels; one line under the boxes says "Last time (logged 2 times in the last 2 weeks): Pans, Expired stock, in portions. Weigh or count it and write today's amount." with Empty these boxes; the amount box is outlined, Log it is off with "Write the amount first." beside it, then says what it saves ("Log 3 portions Rice"). A new name takes the filled values away (keeping a unit an amount was written in); Empty these boxes takes them all; a filled section or unit is not kept for the next line. The fill waits for the finger to come up (`fillAfterTap()`) and patches in place, so the tap that left the box lands. Transfers fills the unit the same way. Orders keeps today's usual amount fill, now named under the box with a USUAL tag, and draws the usual amount chips after the fill, so there is no second Add for the same amount (the duplicate the reviewers found was in today's book). The Logged often chip is unchanged (head chef reviewer: until the counts show whether filled amounts get changed). 0 reads, no rules, no stored data. Pictures (Implemented app, stand-in): [390](built/waste-filled-390.png), [390 at Log it](built/waste-filled-390-log.png), [768](built/waste-filled-768.png), [1280](built/waste-filled-1280.png). `tests/filled-for-you.test.js` (19 checks; fails on the old code).

**2. Records** (`js/prep.js`, `css/app.css`, `scripts/records-core.mjs`, `scripts/analysis.mjs`). A Reports tab after Insights. The nightly analysis job puts each finished day's food safety summary on its row of `analysis/dashboard` (`fs`: the deliveries as recorded, and the cleaning count worked out like the Cleaning page for a past day). Cleaning is counted once per day and carried after that (its records cannot change after the day): the first night reads the window's completions once; a normal night none for days already counted. The page opens with 1 read and no day chosen; a finished day's Food safety needs no read; Everything reads that day's wastage, transfers, team plan and day record (about 10 to 30 reads, in memory); a part that could not load says so with Try again and never retries by itself; a day the nightly run has not counted says "Count not ready". Print this month (no reads) and Print this day print what the page holds; Export CSV. Pictures: [month 1280](built/records-month-1280.png), [day 1280](built/records-day-1280.png), [Everything 1280](built/records-everything-1280.png), [month 768](built/records-month-768.png), [day 768](built/records-day-768.png), [month 390](built/records-month-390.png), [day 390](built/records-day-390.png), [Everything 390](built/records-everything-390.png). `tests/records.test.js` (29 checks), `tests/records-core.test.js`, `scripts/analysis-check.mjs` (the count on the emulator).

**Differences from the combined preview:** no cooling rows (they need the dated cooling copy, question 3); the Pass check is counted per task (awaiting Pass check), not as one evening event; supplier orders and functions show as one line each from the nightly day record (they carry no time); "Count not ready" days are the ones after the last nightly count, and their day view points to Delivery received and the Cleaning page instead of reading them.

**Checked:** the Implemented app on the click-test stand-in at 390, 768 and 1280 px (no sideways scroll, no page errors), the read counts in `tests/records.test.js`, the nightly job on the Firestore emulator. **Not evidenced:** a real print on the kitchen's printer, Barlow fonts, rendered contrast and keyboard focus beyond the existing patterns, the first real nightly run's read count (expected about 35 a day of cleaning completions, once).

## The fixes, built 14 November 2026

The owner said "Yes yes" to building the fixes that need no design and to keeping the cooling confirmations per day (that one in its own pull request, with its rules).

- **I2, Orders double-up.** An open request for the same item (`dupKey()`, as on Prep) with the same amount or none is not added again: the slip says "Milk is already on the list (6 L, Ann)." with Add anyway. A different amount, or a different item ("Milk bun"), is added as before. Only a list that loaded is checked. The typeahead still offers the item (the skeptic: staff cannot take a line off).
- **E1, count every suggestion.** Seven more features in the phones' daily counts (`DAILY_FEATS`, 12 in all: the rules allow 12): Wastage filled from last time (shown, taken when logged with it, edited when a filled value is changed, put away with Empty these boxes), Transfers unit filled, Wastage chips (Logged often and suggestions; edited when the amount a chip filled is changed), Transfers chips, Orders suggestions while typing, Usually ordered, Prep suggestions while typing. The admin's Smart features table names them. No reads, no rules change.
- **R4, records that agree.** Reports, Transfers lists the loans still out from before its days (the Inbox's Not back had them) and its CSV has them, marked still out: 1 read a loan when the report opens, once a session. The Insights CSV has On it by, On it at and minutes from On it to tick; the wastage CSV the amount before a change and who changed it. The nightly job no longer publishes `needs.training` and `needs.inTraining` (nothing read them since 10 Nov 2026). The Dashboard's "slowest section" headline already says it times from writing a line to ticking it, so it is unchanged.
- **Tests:** `tests/smart-fixes.test.js` (12 checks; 6 fail on the old code), `scripts/analysis-check.mjs` (the needs).
