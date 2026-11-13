# Round 2: the designs

13 November 2026. Source commit: `main` at 87dc6a1. Every picture is a **Preview**: the real book on the click tests' stand-in with made-up people (Ann, Bo, Sam) and records, and the design drawn over it (`preview/records.cjs`, `preview/fill.cjs`). Fonts are the test fallback, not Barlow. Nothing here is in the book. Taps are counted from the preview's controls and the code; a preview cannot prove speed, save feedback or recovery.

Round 1 asked for two designed screens (see [brief.md](brief.md)): **Set 1, one records page** (R1 merged with R2, every part showing loaded, none or could not load) and **Set 2, how a box the book filled looks** (I1 with I4's pattern).

## Set 1: one records page for the head chef

**The task:** (T1) "Show me everything for last Saturday"; (T2) "Print this month's food safety records for an inspector". The head chef opens it from the admin panel, on the laptop mostly, sometimes the phone.

**Today (Implemented app, source-read taps from the admin panel):** T1 is about 7 places and 15 to 20 taps, and that day's cooling is gone. T2 is the delivery CSV (Delivery received is outside the admin panel: 4+ taps) plus cleaning one day at a time (3 taps, then 1 a day back, no print), and no cooling at all.

**What every design shares (round 1's conditions):** admin only (verified Google plus the head-chef PIN), read when opened, no listener, no staff reads. Every part says **Loaded**, **None** or **Could not load** with Try again ("This does not mean nothing moved"); a print or CSV marks a part that did not load. Cooling starts keeping a dated copy on the day it ships: older days say "Not kept", never blank. Temperatures are shown as recorded: "The book sets no limits until the head chef confirms them." Each line links back to its own page.

### A. Records by kind, for a period (changes the least)

A new Reports page, **Records**, beside Wastage. It reuses the Wastage report's frame: a Period choice (7 days by default, a custom range or one day), Refresh, Export CSV, **Print food safety**. Below the status row, one fold per kind: Deliveries, Cleaning, Cooling, Wastage, Transfers, Prep, Team, Supplier orders, Functions, each with a one-line count ("214 done · 5 missed · 1 not possible") and its lines when opened.

Pictures: [1280](evidence/records-a-1280.png) ([first screen](evidence/records-a-1280-first.png)), [768](evidence/records-a-768.png), [390](evidence/records-a-390.png) ([first screen](evidence/records-a-390-first.png)).

- **Pros:** one frame the head chef already uses (Wastage); covers every record; prints a range; folds keep a long period short.
- **Cons:** "one day" is a custom range (more taps); kinds are side by side, so the day's story (what happened when) is lost; nine folds on a phone is a long page (2168 px at 390).

### B. Day book, one day as a timeline (rethinks the flow)

A new Reports page, **Day book**: one day at a time with ‹ and › and Pick a day, the status row, filter chips (Everything, Food safety, Prep and orders, Team), a one-line prep summary, then every record in time order: "07:42 Delivery Bidfood · 3.1 °C chilled · Ann", "14:05 Cooling Batch started", "22:10 Cleaning Pass check by Sam · 31 done · Missed: …". Print this day.

Pictures: [1280](evidence/records-b-1280.png) ([first screen](evidence/records-b-1280-first.png)), [768](evidence/records-b-768.png), [390](evidence/records-b-390.png) ([first screen](evidence/records-b-390-first.png)).

- **Pros:** answers T1 the way a chef tells it, in order; the fewest taps for one day; one picture of a busy day for a complaint or incident.
- **Cons:** no range, so T2 (a month for an inspector) means 30 prints, about 60 taps; the status row takes most of the phone's first screen; prep lines (40+) do not fit a timeline, so only a summary line.

### C. Food safety month (removes the most friction for the inspector)

A new Reports page, **Food safety**, holding only deliveries, cleaning and cooling. A month calendar: each day says how many deliveries were recorded, cleaning done or "2 missed", and cooling stages ("Cooling 2 of 2", "Cooling not kept"). Tap a day for its three parts below. **Print this month** and Export CSV. A phone shows the month as a list of days. Everything else stays on its own Reports page.

Pictures: [1280](evidence/records-c-1280.png) ([first screen](evidence/records-c-1280-first.png)), [768](evidence/records-c-768.png), [390](evidence/records-c-390.png) ([first screen](evidence/records-c-390-first.png)).

- **Pros:** T2 in 3 taps; a missed task stands out across the month; the calendar can come from a nightly count (1 or 2 reads), the day's detail read only when tapped.
- **Cons:** T1 answers only the food safety part (wastage, prep, team, transfers stay where they are); a new calendar look the book does not use yet; equipment temperature logs are still not in the book.

### Set 1 measured and compared

| | Today | A. Records by kind | B. Day book | C. Food safety month |
| --- | --- | --- | --- | --- |
| Central idea | 7 places | one period, grouped by kind | one day, in time order | one month of food safety, by day |
| T1 taps (from admin panel open) | 15 to 20, cooling gone | about 8 (Reports, Records, Period, One day, the date) | 4 (Reports, Day book, Pick a day, the date) | 3 (Reports, Food safety, the day), food safety only |
| T2 taps | not possible (no cooling, no cleaning print) | 5 (Reports, Records, Period, This month, Print) | about 60 (Print and a day back, 30 times) | 3 (Reports, Food safety, Print this month) |
| Page height, Preview (390 / 1280 px) | | 2168 / 1895 | 2296 / 1517 | 1743 / 1846 |
| Sideways scroll | | none at 390, 768, 1280 | none | none |
| Reads when opened (estimate) | | a week about 350 (cleaning about 35 a day), a month about 1,500, unless the counts come from a nightly field | about 60 to 80 for one day | calendar 1 to 2 from a nightly field; a day about 40; Print this month about 1,100 |
| New stored data | | dated cooling copy | dated cooling copy | dated cooling copy; a nightly per-day food safety count |
| New rules | | cooling copy (admin read) | same | same, plus the nightly field (server write) |
| Pull requests | 3 (cooling copy, page, print) | 3 | 3 to 4 (adds the nightly count) | |
| Relearning | none (admin only) | low (Wastage frame) | low | medium (a calendar) |
| Main risk | | a long page; a range read over the cleaning 7-day cap | no range; misses T2 | partial answer to T1; a new look |

How they differ: A and B differ in time model (period versus one day), hierarchy (by kind versus by time) and print (range versus day). B and C differ in scope (everything versus food safety), layout (timeline versus calendar plus detail) and range (day versus month). A and C differ in scope, layout and disclosure (folds versus calendar then detail).

## Set 2: how a box the book filled looks (I1 with I4's pattern)

**The task:** Bo logs waste on a phone and types the item in full, "Chips", which was logged 3 times in the last 2 weeks (last time 2 kg, Excess production, Fryer). The same pattern then applies to Transfers and to the Orders amount fill (pictures for Orders: "Duck fat", usually 2 tubs).

**Today (Implemented app):** typing "Chips" fills nothing (reproduced, [picture](baseline/waste-exact-390.png)). The Logged often chip above the box fills all four. Measured on the Wastage sheet at 390 x 844: the reason choices start at 903 px and **Log it at 989 px, below the first screen**; the same at 768 and 1280 (926 px). So a reason or amount that changes below the fold is not seen before Log it unless something on the first screen names it.

**What every design shares:** fill only from the item's own last 14 days (`summary/waste`, already on the phone: 0 reads); fill only empty boxes, never over what the person typed; if the name changes so it no longer matches, the filled values go; one line on the first screen names what was filled, in words, so it reads without colour; the filled boxes look different from typed ones (light reference fill, italic) and the Unit and Reason labels carry a FILLED word tag; the counters from E1 count fills kept and changed.

### A. Fill in place, named (changes the least)

Typing the full name fills section, amount, unit and reason at once, like the chip does. Under the boxes: "**Filled from last time:** Fryer · 2 kg · Excess production. Change any of it before Log it." Log it says what it will save: "Log 2 kg Chips".

Pictures: [390](evidence/fill-a-390.png), [768](evidence/fill-a-768.png), [1280](evidence/fill-a-1280.png); Orders: [390](evidence/fill-a-orders-390.png) ("Filled: 2 tubs, the usual amount.").

- **Pros:** fewest taps; the same result as the chip people already use; Log it repeats the amount and item.
- **Cons:** the amount is a guess unless the cook weighs it, and the sheet's own rule says "Write the actual amount"; the reason is filled below the fold (named only in the line).

### B. Offer, one tap to use (nothing filled by itself)

Typing the full name fills nothing. Right under the boxes, one wide button: "**Use last time: Fryer · 2 kg · Excess production**. Chips was logged 3 times in the last 2 weeks." One tap fills all four and shows A's named line with **Undo fill**.

Pictures: [390](evidence/fill-b-390.png), [after the tap](evidence/fill-b-after-390.png), [768](evidence/fill-b-768.png), [1280](evidence/fill-b-1280.png); Orders: [390](evidence/fill-b-orders-390.png) ("Use the usual: 2 tubs").

- **Pros:** nothing is filled without a tap, so nothing is saved that the cook did not choose; easy to count taken and not taken; the button names every value before it is used.
- **Cons:** one tap more than A; a second, bigger copy of what the Logged often chip already does for the top items.

### C. Fill what describes it, weigh the amount (split by risk)

Typing the full name fills section, unit and reason (with the named line and FILLED tags) but **not the amount**: the amount box says "Weigh it" and is outlined, the line says "Weigh it and write the amount. Last time was 2 kg.", and Log it is off until an amount is written. Then it reads "Log 1.5 kg Chips". On Orders the usual amount is a hint in the box ("Usually 2 tubs"), not a value.

Pictures: [390](evidence/fill-c-390.png), [after typing 1.5](evidence/fill-c-after-390.png), [768](evidence/fill-c-768.png), [1280](evidence/fill-c-1280.png); Orders: [390](evidence/fill-c-orders-390.png).

- **Pros:** keeps "write the actual amount" (the sheet's rule and the skeptic's point); fills the low-risk fields that cost the most taps (reason sits below the fold); on Orders it never makes a usual amount look like this order's need.
- **Cons:** typing the amount stays; on Orders it takes away today's one-tap usual amount fill (`oqtyAuto`), which some cooks use; Log it off until the amount is in needs its own words ("Write the amount first") to pass the after-the-tap rule.

### Set 2 measured and compared

| | Today | A. Fill in place | B. Offer, one tap | C. Fill what describes it |
| --- | --- | --- | --- | --- |
| Central idea | nothing on a typed name | everything, named | nothing until a tap | the descriptive fields; the amount weighed |
| Main task (typed path): taps + typed boxes | 3 taps + 3 typed (section, amount, item) + a scroll | 2 taps + 1 typed + a scroll | 3 taps + 1 typed + a scroll | 2 taps + 2 typed (item, amount) + a scroll |
| Main task with the Logged often chip | 3 taps, 0 typed | unchanged | unchanged | unchanged (the chip still fills all four) |
| Named line on the first screen, 390 x 844 (Preview) | none | yes, 454 to 510 px | yes (the button), 454 to 531 px | yes, 454 to 530 px |
| Log it on the first screen | no, 989 px | no, 989 px | no, 998 px | no, 1009 px |
| Saved amount can be a guess the cook never looked at | no (typed) | yes, named in the line and the button | only after a tap that names it | no |
| Orders amount fill | fills 6 L, says so four rows down | fills, with the tag and line under the boxes | button "Use the usual" | hint only, no fill |
| Reads, rules, stored data | | 0, none, none | 0, none, none | 0, none, none |
| Pull requests | | 1 (Wastage and Transfers), 1 (Orders) | same | same |

How they differ: A and B differ in disclosure (silent with a named line versus an explicit offer) and task sequence (+1 tap). B and C differ in what is filled (all on a tap versus the descriptive fields by themselves) and in the amount (chosen versus weighed). A and C differ in the amount and in Log it's state (on versus off until an amount).

## Not drawn (round 1 asked for no screen or said not yet)

I2 (Orders double-up) uses Prep's existing "Already on the list" card inside the sheet; I5 (Add all) was not built (3 of 5 Don't build); I7 (staff requests on the supplier row) is Build smaller and gets its own study once E1 has numbers; R3 (docket number) and R5 (yesterday's gaps in the Inbox) wait for the head chef's word.
