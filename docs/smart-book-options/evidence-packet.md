# Round 1 evidence packet: a smarter book (records, inputs, suggestions)

13 November 2026, Queensland. Source commit: `main` at 87dc6a1. Role-based analysis, not research with staff. Pictures are the real book on the click tests' stand-in (`tests/fake/`) with made-up people (Ann, Bo, Sam) and made-up records; fonts are the test fallback, not Barlow. Tap counts marked "source-read" come from reading the code, not from a run.

## What the owner asked

The owner is the head chef. Their words: "Now I want to make the whole app smarter. Run a whole audit on where and how to make the app smarter. Focus on record tracking for me, [improving] the inputs for staff and myself. Etc. Maybe some better smart suggestions with less clicks across the board. Suggest something and design when necessary."

The word "invoicing" in the request may mean "improving" (dictation) or delivery invoices. The book holds no invoice, docket or credit field today. Both readings are covered below (R3).

## How the audit was done

Four read-only explorers mapped staff inputs, the head chef's records, the existing smart engine and the chefs' planning flows, each citing file and line. The lead checked the load-bearing claims in the code and reproduced two on the stand-in (below). Full registers: [audit.md](audit.md).

## What already exists (read before judging need)

The book is already smart in many places. Do not propose these again:

- **Prep:** Your usual typeahead with +Add, usual amount chips ("Add 2 tubs"), usual section fill, Quick add (Due today, Usual for a weekday, Regulars), Start here, Pace (chefs), Closing soon, Stuck lines (chefs), waste hints while typing, the proofreader, double-up merge, Before service minimums (off by default).
- **Orders:** usual amount fills itself when one amount clearly wins, typeahead, "Usually ordered" chips, "Order a little less?" after expired waste.
- **Wastage:** Logged often chips fill unit, reason, section and amount. **Transfers:** venue, person, item and unit chips. **Deliveries:** Due today supplier chips.
- **Today's team:** usual section from the last 8 weeks; Use it copies last week. **Supplier order:** top-up to par from a typed stock count, repeat last order, Show what staff asked for (one tap, nothing is ticked off).
- **Functions:** For the functions (platter needs today and tomorrow), To check before the functions.
- **Admin:** Inbox (what needs you today), Dashboard (three written headlines, tiles, charts, watch list), Reports (Insights, Wastage, Transfers, Team with At a glance, Item evidence, Learning), Proofreader, nightly analysis.
- **Measured:** five features count shown, taken and put away per phone per day (Quick add, usual amount chips, order amount fill, For the functions, checks). Typeahead +Add, order regulars, Logged often, transfer chips, delivery chips and "changed it after the guess" are not measured.

## Reproduced on the stand-in

1. **Wastage, the full name typed fills nothing** (picture `baseline/waste-exact-390.png`). Bo types "Chips", which was logged 3 times in 14 days (2 kg, Excess production, Fryer). Amount stays empty, reason stays unpicked, section stays empty. The Logged often chip "Chips" sits above the box and would fill all four. The suggestion list leaves out the exact name (`wSuggest()` `k !== q`, `js/prep.js:7556`); typing never calls `wLast()` (`js/prep.js:12384`). The coding rules say "filling in what the book knows" (done 22 Oct 2026). Transfers has the same gap (`js/prep.js:7986`).
2. **Orders, an item already on today's list** (picture `baseline/orders-milk-390.png`). Ann types "Milk" with Milk 6 L already on today's list. The usual amount fills (6 L) and nothing says Milk is already there; Prep has a double-up check, Orders has none (`js/prep.js:7229-7258`).

## The proposals (one verdict each)

Each has: the problem, who has it and how often, the change, and the cost. "Kind" says which council path the lead thinks applies (fix: no council; small: quick check; major: both rounds).

### R. Records for the head chef

**R1. Day book (major).** *Problem:* "Show me everything for last Saturday" is spread over about 7 places and 15 to 20 taps (source-read): the chef's prep history (one date), Wastage with a one-day range, Delivery received with From = To (outside the admin panel), Cleaning Week then the day, Today's team past week, Functions; Transfers has no one-date view; that day's cooling record is gone (one current record, overwritten). *Who and how often:* the head chef, after a complaint, an incident, a busy day or for a weekly look back; not measured. *Change:* one admin page, pick a date, see that kitchen day's records together: who was on and where, prep written and ticked (with who and On it time), wastage with reasons, deliveries with temperatures, cleaning done, missed and Pass checked, cooling stages confirmed, transfers out, in and back, supplier orders recorded, functions served, mail and minutes. Each part links to its own page. Print and CSV. *Cost:* admin only, read on demand when a day opens (about 8 queries: digest, waste, deliveries, cleaning, transfers, team, functions, supplier orders; about 20 to 80 reads per day opened), no listener, no staff reads. Cooling needs a dated copy kept (a new record per day: a rules change). Lazy file. 2 to 3 pull requests.

**R2. Food safety records for a date range (major, could be part of R1).** *Problem:* for an inspector or the head chef's own weekly check: delivery temperatures have a CSV (admin), cleaning is on screen one day at a time with no export, cooling keeps no history, equipment temperature logs are not in the book ("not configured", `docs/cleaning-schedule.md`). *Change:* pick From and To, get one printable A4 and a CSV: each day's delivery temperatures, cleaning done/missed/Pass checked, cooling stages confirmed. No limits or pass/fail invented: temperatures are shown as recorded until the head chef confirms limits. *Cost:* as R1 plus a bounded range query for cleaning; cooling history as R1.

**R3. Delivery docket and anything short (major, reopens a deferred choice).** *Problem:* a receipt holds supplier (free text), temperatures and a 300-letter note. No docket or invoice number, nothing marks short or missing items, and the receipt is not linked to the order that was recorded. The 3 Nov 2026 receiving study kept B's order check "later". *Change:* an optional docket or invoice number box and an optional "Anything short or missing?" line on Delivery received, so the head chef can match a credit later. No prices, never (repo rule). Chefs could see the recorded order lines for that supplier as a checklist; staff and functions-only cannot read supplier orders. *Cost:* new optional fields on an immutable record (rules change, backup), 1 to 2 pull requests. Only worth it if invoices are tracked by the head chef (to ask).

**R4. Records that disagree or are left out (fixes).** Reports, Transfers covers 30 days of lines, so a loan older than 30 days shows in the Inbox but not in the report or its CSV. On it times and wastage amount changes are not in the CSVs. The Dashboard's "slowest section" headline times from written to ticked; Insights times from On it (the 10 Nov 2026 decision moved staff timing to On it). The nightly job still publishes a training count nothing reads. *Cost:* small, each its own pull request.

**R5. Yesterday's record gaps in the Inbox (major, reopens a council cut).** *Problem:* a missed cleaning task or a due supplier with no delivery temperature is only seen if the head chef opens that day. *Change:* one Inbox line the next morning: "Yesterday: 2 cleaning tasks missed (Fryer clean, Cool room floor). No delivery temperature for Bidfood." Computed by the nightly job, 0 new phone reads. *Note:* the 10 Nov 2026 Dashboard restyle council cut new cleaning, cooling and delivery tiles. This is a proposed change to that, for the head chef's choice.

### I. Inputs for staff and chefs (fewer taps, fewer mistakes)

**I1. Fill what the book knows when the name is typed in full (fix).** Wastage and Transfers fill unit, reason, section and usual amount on an exact typed name, the same as tapping the chip. Saves about 2 taps and a pick per log (source-read). 0 reads. Reproduced above.

**I2. Orders double-up check (fix or small).** Adding a line already open today says "Milk is already on the list (6 L, Ann)" with Add anyway, as Prep does; the typeahead stops offering today's open lines. 0 reads. Reproduced above.

**I3. Waste-aware one-tap amounts (small).** When an item was logged as excess or expired 2 or more times in 14 days, the one-tap paths (Quick add, usual amount chip, the order amount fill) say "Wasted 3 times this fortnight" and do not fill the amount by themselves; the typed form already warns. 0 reads (the waste summary is already on the phone).

**I4. Prep fills the usual amount like Orders (small).** When one amount clearly wins, the Prep add box fills it, selected so typing replaces it. Measured with the existing counter. 0 reads.

**I5. Add several at once (major: a new button on a service page).** "Add all due (5)" in Quick add and "Add all with amounts" in For the functions, with one Undo for the lot. Saves n minus 1 taps. Risk: list bloat, duplicates (the double-up check guards Prep).

**I6. Suggestions follow the weekday and recent use; tomorrow's chips at night (small to major).** Rank Usual and Regulars by this weekday and how recently the item was used (both already in `summary/learned`); after tonight's list starts, Quick add offers tomorrow's usual lines. The nightly job counts a night-list line under the day it is for. 0 new phone reads. Changes what the book learns.

**I7. Staff requests on the supplier order, ticked after Record (major: changes a service task).** Today the chef taps Show what staff asked for each visit, types the amount, records, then goes to Orders and ticks each request by hand ("Nothing is ticked off here"); an unticked request rolls over. Change: matched requests show on their supplier row ("Asked 2 boxes, Ann · Use"); after Record, one "Mark 3 matched requests ordered" with Undo. Cost: one query per supplier opened (about 1 read per open request). Risk: part orders, wrong alias matches, a request ticked that was not really ordered.

**I8. Quick wins on existing pages (small, each a quick check).**
- Delivery received: suppliers not yet received today first.
- Before service: a "Not on the list yet" filter, and stay on the page after Add, unit filled (amount stays blank by design).
- Cleaning opens on your section first.
- Shared screen tick and cleaning name pick: the cook planned on that section is listed first (still an explicit pick).
- Drinks run counts the rostered people, not only who opened the book.
- Today's team Use it fills a section left blank (removed section) with that person's usual.

**I9. Send to to-do (small, chef-only places).** "Add to to-do" on kitchen mail, stuck lines, function checks and minutes actions, carrying the text and a link back. Saves retyping. Risk: one job tracked in two places.

### E. The engine (no new screens)

**E1. Measure every suggestion (small, no screen).** Count shown and taken for the unmeasured ones, and "changed after the guess" (amount or section changed within a few minutes), in the existing daily counters; the admin's Smart features table shows them. Needed before any suggestion moves to staff. 0 reads.

**E2. The nightly job does the sums once (refactor).** Due today cadence, the pace curve and per-weekday usual amounts are worked out nightly into `summary/learned`; phones would stop about 15 day-digest reads each a day where nothing else needs them (uncertain: the rollover still reads past days). Reads saved, no screen change.

**E3. Platters from guest numbers (don't build yet).** Guests are stored but unused. A suggestion would invent quantities the head chef has not confirmed (writing rule: only confirmed quantities). Listed so it is decided, not forgotten.

## Contracts that apply (excerpts)

- **Service rules** (head chef, 5 Nov 2026): main job one tap from its tab; no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; added taps or lost lines must say why.
- **Coding rules** (`CLAUDE.md`, `docs/coding-rules.md`): "Filling in what the book knows" (done 22 Oct 2026). Every new read says when it runs and what it costs; no reads in a loop; listeners only for today's live data; a failed or cached read is never "nothing there"; "Never guess, never save nothing": no match or more than one shows a card that says so.
- **Writing:** only quantities, temperatures and times the head chef confirmed; anything else in [square brackets] as "To come".
- **Never in this repo:** prices, GP, supplier codes or anything else from AVC Live beyond ingredient names and quantities. AVC Live is read only.
- **Admin intelligence** (`docs/admin-intelligence.md`): prep is not consumption; staff order requests are not supplier orders; no prediction or percentage confidence invented; staff ranking changes only on production evidence (`comparisonOnly`); no private report in the staff-readable `summary` collection.
- **Supplier workspace:** Record supplier order, Mark order done without quantities, applying a suggestion to a draft and recording a delivery are distinct outcomes. Never send an order to a supplier.
- **Deliveries:** immutable receipt with identity, time and temperatures; negative freezer values; null versus zero; input limits never become invented food-safety acceptance rules.
- **Dashboard restyle** (10 Nov 2026): the council cut new cleaning, cooling, delivery and order tiles and any new read on open.
- **Cross-training** (10 Nov 2026): activity is never competence.
- **Shared prep attribution:** the person who did the work is chosen explicitly on a shared screen; personal devices tick in one tap.
- **Surface and operational colours:** steel for work books, sage for people, charcoal for live boards, quiet paper for reading and forms; orange is action and attention; green confirms a stated success; red failure. Words always carry the state.
- **Action feedback:** every tap answers in its own frame and says what it did by name; Saved only after acknowledgement; failures stay and keep the work.

## Design references

Linear (consistent frame, work over navigation), Things 3 (today versus later; frequent visible, occasional tucked away), Airbnb (time, place, status and next action together), Todoist (quick entry, known defaults visible and editable, never guess from ambiguous text), Flighty (now and next with real times, never stale status as live), Duolingo (truthful answers, progress from real work), Headspace (calm short labels a new starter understands).

## Try to break it (families)

Confusion and accidental action; repetition and delayed answers (double taps on Add all, a late answer); failed reads and writes (a Day book part that failed looking like "nothing that day"); interruption and handover; time boundaries (Queensland midnight, the night list after the cut, the nightly 03:00 run, the 04:00 unlock, a 30-day window); access (staff reading a chef record, functions-only on Delivery received); misleading presentation (a fill looking like the person's own entry, "no temperature" looking like "all fine").
