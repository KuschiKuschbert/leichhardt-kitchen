# Round 1 reviews, as given

Five fresh reviewers, 13 November 2026, each given only [evidence-packet.md](evidence-packet.md) and the baseline pictures. Kept as written (tables trimmed of formatting only). Role-based analysis, not research with staff.

## The cook mid-service

| Id | Verdict | Reason |
|---|---|---|
| R1 | Not my concern | Desk job. Fine if cooling confirm stays one tap. |
| R2 | Not my concern | Desk job. Fold it into R1. |
| R3 | Your call | Only if invoices are tracked. Fold it away, never required. |
| R4 | Not my concern | Report fixes, no cost during service. |
| R5 | Not my concern | Nightly, 0 phone reads. Reopening the cut is your call. |
| I1 | Build | Reproduced: typing "Chips" fills nothing. Saves taps on every log. |
| I2 | Build | Reproduced: Milk added twice with no warning. Note in the sheet stops it. |
| I3 | Build smaller | Show the warning, but the tap keeps doing the same thing. |
| I4 | Build | Same as Orders. The fill is selected, so typing replaces it. |
| I5 | Your call | New button on a service page: needs your OK, a double-tap guard and Undo. |
| I6 | Build smaller | Chips that move by weekday break muscle memory. Keep tomorrow's for nights. |
| I7 | Not my concern | Chef task. Never mark my request ordered on a guess. |
| I8 | Build | Your section first saves scrolling. Keep each list's order fixed all day. |
| I9 | Not my concern | Only in chef places. |
| E1 | Build | Without "changed after the guess" counts, no fill is proven. |
| E2 | Build | Fewer reads keeps the book under 50,000. |
| E3 | Don't build | It would invent quantities you have not confirmed. |

Three main reasons:
1. Only I1 and I2 were reproduced, and they hit staff on every log. In the waste picture at 390 px, Reason is below the fold ("Excess production" is cut off). So today it goes: type the name, pick a section, type the amount, scroll, pick a reason. I1 removes most of that.
2. A fill I cannot see is a fill I did not make. Orders already says "Usual amount filled in: 6 L." I1, I3 and I4 need the same line by the name box, naming everything filled. A reason filled below the fold is invisible otherwise, so a guessed "2 kg, Excess production" saves as my entry. Not evidenced: no run shows what I1's fill looks like.
3. Things that stay put beat clever at arm's length. I3 (a chip that sometimes does not fill), I6 (chips that move) and I8 (lists in a new order) all shift things under a wet thumb. Sort once a day, then hold it.

Contract fit: I1 and I2 fit "filling in what the book knows" and "stops a mistake", if I2's note sits inside the sheet, not in a pop-up. I5 needs your OK (service rule 2). I3 and I6 would change what Quick add does in one tap; that is a change to agreed behaviour, not a breach. R5 is a change to a decision the council made on 10 Nov. Every fill must say what it did in words, not only by a chip turning dark.

One change: ship I1, I2 and E1 first, on their own. I1's fill says one line: "Filled from last time: 2 kg, Excess production, Fryer." Hold I3, I4 and I6 until E1 shows how often cooks change a guess.

Round 2 screens: I5 (where "Add all due (5)" sits in Quick add at 390 px, a double tap, the list after 5 lines land, the one Undo); I3 (what the chip and the order fill show when they hold back, fitting next to "Dice onions 1 tub 9x" at 390 px). I1's fill line still needs a quick drawing at 390 px.

Lead's note: the packet showed no warning when Milk is typed again; it did not show the second Milk being saved. That is Not evidenced until a click test adds it.

## The head chef

| Id | Verdict | Reason |
|---|---|---|
| R1 | Build smaller | Merge it with R2. How often I need it is not measured, and eight sources is heavy. |
| R2 | Build | An inspector needs it, and cooling history is lost every day. |
| R3 | Your call | Only worth it if credits are chased. The packet cannot say. |
| R4 | Build | Reports that disagree make every number untrustworthy. |
| R5 | Build smaller | Missed cleaning only. "No temperature" may just mean no delivery came. |
| I1 | Build | Reproduced, 0 reads, and a coding rule we already decided. |
| I2 | Build | Reproduced. Stops a double order, inside the sheet, not a pop-up. |
| I3 | Build smaller | Show the warning but keep the fill until E1 shows harm. |
| I4 | Don't build | The usual amount chip already does it, and a fill looks self-typed. |
| I5 | Don't build | A new service button, list bloat, saves a few taps once a day. |
| I6 | Build smaller | Weekday ranking yes. Tomorrow's night chips wait for E1 data. |
| I7 | Build smaller | Show matched requests on the supplier row. Chefs still tick by hand. |
| I8 | Build smaller | Six untested tweaks. Start with Deliveries order and Cleaning section. |
| I9 | Don't build | One job in two places, and retyping one line is cheap. |
| E1 | Build | Do it first. Without counts every suggestion is a guess. |
| E2 | Build | Only if the read budget test proves the saving. |
| E3 | Don't build | Invents quantities I never confirmed, which breaks the writing rule. |

Main reasons: fix what is broken before adding anything smart (I1, I2, R4: cheap, 0 reads, every log and order); lost records come before new tricks (cooling is overwritten every day; how often "show me Saturday" is needed is not measured); not measured means not trusted (build I3, I4, I5 or night chips only after E1).

One change: an ordered queue. First E1, I1, I2, R4, and start keeping a dated cooling record now as its own small change. Then one records page that merges R1 and R2, designed once, following the Wastage report's period picker and Export CSV. Drop I4, I5, I9 and E3.

Round 2 screens: R1 + R2 merged (eight sources; a part that failed must never read as "nothing that day"; print; 390 and 1280 px). I7 (a part order or a wrong match obvious before anything is ticked; Record stays a separate step).

Contract fit: I1 fits; I2 allowed as it stops a mistake; I5 needs the owner's OK (declined here); R5 reopens the 10 Nov cut, fits only as one line of words and only if a missing temperature is never shown as all fine; I3 has no before and after tap count; E3 breaks the writing rule; I7 could blur "staff requests are not supplier orders"; I4 could break action feedback (a fill looks self-typed). Not evidenced: how often R1, R3 and I7 come up.

## The keeper of the book

| Id | Verdict | Main cost or risk |
|---|---|---|
| R1 | Build smaller | About 8 queries plus rule lookups; mixed day keys. Leave cooling history out of the first build |
| R2 | Build smaller | Make it R1's print. Cap the cleaning range read |
| R3 | Your call | New fields on an immutable receipt: rules, backup check, old phones |
| R4 | Build | Reuse the Inbox loan read. Do not widen the 30-day query |
| R5 | Your call | 0 reads only if it rides an existing doc. A skipped run looks "all fine" |
| I1 | Build | 0 reads. Fill empty fields only, shown as filled |
| I2 | Build | 0 reads. A list not loaded yet must not count as "not there" |
| I3 | Build smaller | Warning words only. Holding back the fill adds an unmeasured tap |
| I4 | Build | Reuse the Orders auto-fill (`oqtyAuto`) and its counter |
| I5 | Don't build yet | Double taps, partial writes, Undo over half a batch |
| I6 | Build smaller | Rank by weekday, yes. Re-dating night lines mixes old and new counts |
| I7 | Build smaller | Match from today's live order list. No bulk tick |
| I8 | Build | Group by page: each republish reloads every phone |
| I9 | Your call | One write. One job tracked in two places |
| E1 | Build first | `sg()` counts on the phone and `dailyFlush()` sends once a day: about 0 extra writes |
| E2 | Build smaller | Saving not proven. Pace is chef data in the staff-readable summary |
| E3 | Don't build | Invents quantities the head chef has not confirmed |

Main reasons: (1) the reproduced 0-read fixes (I1, I2, I4, R4) and E1 cost almost nothing; checked `wSuggest()` `k !== q` and `addOrder()`, which has no double-up check; ship them together, as each merge that changes the book makes every phone reload. (2) R1, R2 and R5 join records from up to 8 places that file days differently (date keys, timestamps, the midnight cleaning calendar, separate from the 04:00 unlock) and depend on a nightly job GitHub can skip; the main risk is "couldn't load" showing as "nothing that day"; cooling history is a new collection plus rules, backup and Move PIN work, against a contract that keeps no run history. (3) Several "0 reads" claims are not proven: R5 adds an admin read unless it rides the analysis doc; I3 needs the waste summary already loaded (not evidenced); E2's saving is uncertain and a bigger `summary/learned` is read on every phone's first open.

Break-it scenarios (all Risk / Not evidenced):
1. R1, admin, signal drops during the cleaning query. Expected "Cleaning: couldn't load, Retry" and print/CSV marked incomplete; possible failure "No cleaning recorded" on an inspector's printout (a false food safety record). Check: a click test where the stand-in fails one of the 8 queries.
2. R5, pack down ticked at 00:20 under the midnight cleaning calendar, or the 03:00 run skipped. Possible failures: a done task shows as missed, or no line at all, which reads as fine. Check: a node fixture for the nightly script with a 00:20 tick and an old stamp; the Inbox says "Yesterday's check did not run".
3. I5, shared tablet, Add all double tapped on weak signal. Expected n lines and one Undo; possible 2n lines or a half-saved batch. Check: a click test with a slow stand-in write and a double tap; one batch through `W()` with fixed ids.

Contract fit: mostly fits. R5 and R1's cooling history change approved decisions (the 10 Nov tile cut, no cooling run history), not breaches. E2 putting pace in `summary` would break the rule that no private report goes in the staff-readable `summary` collection. I5 needs the head chef's OK.

One change: before R1, R2 or R5, define one kitchen day and give every part three states: loaded, failed (with Retry), none recorded. Reuse `lkServerUp()` and a staleness stamp.

Build order: E1 with I1, I2 and I4 in one `js/prep.js` release; R4 one fix at a time; I8 grouped by page; R1 without cooling, then R2 as its print; I3, I6, I7 smaller, once E1 has data; E2 checked with `tests/read-budget.test.js`; R3, R5, I9 on the head chef's word; I5 last, if at all.

## The skeptic

| Id | Verdict | Reason |
|---|---|---|
| R1 | Build smaller | Merge it with R2. How often it is used is not measured. The real gap is a dated cooling copy. |
| R2 | Build smaller | One food-safety page for a date range. Missing parts are marked, never left blank. |
| R3 | Your call | Only worth it if you track invoices. Needs a rules change. |
| R4 | Build | These are bugs. Drop the training count nothing reads. |
| R5 | Your call | Reverses the 10 Nov cut. False alarms on days with no delivery. |
| I1 | Build smaller | Fill unit and section only. The sheet says "Write the actual amount". |
| I2 | Build | Staff cannot remove a duplicate line. Keep the typeahead offering it. |
| I3 | Don't build | Repeats warnings we already have. Adds a tap to staples. |
| I4 | Don't build | Amount chips already do this. Wait for E1. |
| I5 | Don't build | A new button on a service page. Bulk adds skip judgement. |
| I6 | Build smaller | Weekday ranking only, after E1. No change to what the book learns. |
| I7 | Build smaller | Show matched requests. Keep ticking by hand. |
| I8 | Build smaller | Drop the shared-screen preselect and the Use it guess. |
| I9 | Don't build | One job tracked in two places. |
| E1 | Build | Every suggestion needs it. Do it first. |
| E2 | Build smaller | Prove the reads are saved. Stale if the 03:00 run fails. |
| E3 | Don't build | Would invent quantities you have not confirmed. |

Main reasons: (1) the book already guesses almost everywhere and most guesses are not measured; build E1 before more guesses; the Chips chip is one tap above the box. (2) The real gaps are records and mistakes: cooling history overwritten, Orders allows duplicates, an exact typed name fills nothing; fix those and skip the convenience extras. (3) Too much is reopened or blurred: R5 reverses the 10 Nov cut, I5 adds a service button, I7 treats requests as orders, I8 preselects a cook; eighteen merges also mean every phone reloads again and again.

Contract fit: I2, R1 and R2 fit (I2 stops a mistake; R1/R2 admin only, read only when opened). R5 and I5 are proposed changes to approved rules, not violations. I7 strains "requests are not supplier orders". I8 strains "the person is chosen explicitly". I3 strains "prep is not consumption".

Break it (all Risk / Not evidenced unless said):
- A. A failed read printed as "none". Head chef, R1/R2, poor signal; one of the eight queries fails or answers from the cache. Feared: "None recorded" printed for an inspector; cooling from before dated copies began also blank. Repair: each part shows loaded, none or failed; the print marks failed parts. Stand-in test where one query fails.
- B. A fill that stays on the wrong item. Bo types "Chips" on the way to "Chips salt" and I1 fills at "Chips". Feared: 2 kg, Excess production and Fryer stay on Chips salt; a wrong record feeds "Order a little less?". The gap itself is Reproduced. Repair: fill only empty fields, name what was filled, clear it when the name changes. Click test for the partial-name case.
- C. The wrong request ticked. Sous chef, I7, records milk; a loose match catches Ann's "Milk bun" (the Orders picture offers Milk bun for "Milk"); bulk "Mark matched ordered". Feared: the bun request is ticked, stops rolling over, buns run out. Repair: no bulk tick, or tick only the exact item when the amount ordered is at least the amount asked. Milk / Milk bun test case.

One change: split the bundle. Ship I1 (smaller), I2, R4, E1 and the dated cooling copy now. Hold every other suggestion until E1 has two weeks of numbers. Round 2 needs one designed screen: R1 merged with R2, with failure states shown.

## The new starter

| Id | Verdict | Reason |
|---|---|---|
| R1 | Not my concern | Admin only. |
| R2 | Not my concern | Admin only. |
| R3 | Your call | Staff can't see the order; blank must not mean "nothing short". |
| R4 | Not my concern | No staff screen. |
| R5 | Not my concern | Admin only. |
| I1 | Build smaller | Fill unit and section; offer amount and reason in words, not silently. |
| I2 | Build | Stops a real double-up; the list is hidden behind the sheet. |
| I3 | Build smaller | Warn in words ("in 2 weeks", not "fortnight"); still show an amount. |
| I4 | Build | Only with Orders' "Usual amount filled in" line, next to Add. |
| I5 | Build smaller | Chefs only; I could not see which five lines I added. |
| I6 | Build smaller | Moving chips confuse me; tomorrow's chips must say "Tomorrow". |
| I7 | Your call | A false "ordered" tells me my request is coming. |
| I8 | Build smaller | Drop planned-cook-first on shared screens: I'd tap the top name. |
| I9 | Not my concern | Chefs only. |
| E1 | Build | Only evidence of trust; cannot catch a wrong fill nobody changed. |
| E2 | Not my concern | No screen. |
| E3 | Don't build | I would trust invented amounts as the head chef's. |

Main reasons: (1) a filled box looks like my typing: in orders-milk-390 "6 L" is in the same font as typed text, Add sits beside it, and the only cue is orange text four rows down; in waste-exact-390 the reason grid runs off the screen, so a filled reason would be hidden at Save; a wrong amount or reason becomes a false record nobody notices. (2) Things that move: I6 reorders chips and adds tomorrow's at night; I8 lists the planned cook first on a shared screen, which I would read as the default (untested). (3) Words and states: "fortnight", "9x", "Amount to" (cut off), "Add anyway" and the help sentence are hard in a second language; name chips with no label (Fish and Chips) sit under SECTION, so I read them as sections; I5 and I7 show no pending, part-saved or failed state (Not evidenced).

Contract fit: I2 fits rule 3 (stops a mistake, inside the sheet), but only catches the exact name, so it misses "Full cream milk" offered right under Milk. I1 does not meet Todoist's "defaults visible". I5 needs the head chef's OK (a proposed change, not a broken rule).

One change: one "filled for you" pattern in `docs/design-patterns.md`, used for every fill: the box carries a word tag that goes away when I type; a line beside Add names each filled value; amount and reason are never filled unless that line shows at Save. Test it with colour turned off.

Round 2: I1, sharing the pattern with I4 (how a filled box is shown is a design choice). I5: each added line, saved or failed, and the one Undo.
