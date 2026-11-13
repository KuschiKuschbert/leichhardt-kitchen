# Smarter book audit: the registers

13 November 2026. Source commit: `main` at 87dc6a1. Four read-only explorers mapped the book, each citing file and line; the lead checked the load-bearing claims in the code and reproduced two on the click-test stand-in (`baseline/`). Tap counts are **source-read estimates** unless marked **Implemented app**. `P` means `js/prep.js`. Role-based analysis, not research with staff.

The proposals built from these registers, and the council's verdicts, are in [brief.md](brief.md).

## 1. The smart engine today

The book already suggests a lot. Five features are measured per phone per day (`DAILY_FEATS`, P:3057: shown, taken, put away; only the order amount fill counts "edited").

| Feature | Suggests | Where, who | Data | Shows when | Taps to take | Measured |
| --- | --- | --- | --- | --- | --- | --- |
| Your usual typeahead (P:3005) | line, amount, section | Prep add | `summary/learned`, recipes | 2+ letters, not on the list | 1, +Add if section known | No |
| Usual amount chips (P:2805) | "Add 2 tubs" | Prep add | learned amounts + 14 day digests | 3+ letters, amount empty | 1 | Yes |
| Usual section (P:2328) | section | Prep add | learned sections | no section typed | 0 | No |
| Quick add: Due today, Usual for a weekday, Regulars (P:4025, P:5516) | lines | Prep add box, Handy page | 14 day digests; weekday 2+; uses 4+ | today | 1 each | Yes, as one |
| Start here (P:2849) | which line first | Prep | live list | 4+ open lines | 0 | No |
| Pace (P:4046) | behind or on pace | chefs | 14 days of ticks | 3+ past days | 0 | No |
| Closing soon (P:4066) | log waste | Prep, Orders | learned list times | an hour before the usual start | 1 | No |
| Stuck lines (P:5534) | remove | chefs | rolled 3+ times | today | 1 | No |
| Waste hints (P:5465) | smaller batch, order less | Prep and Orders add | `summary/waste` | excess/expired 2+ (prep), any expired (orders) | text | No |
| Usual order amount (P:5487) | amount | Orders | order learned + 14 days | one amount clearly wins | 0 | Yes, with edited |
| Order typeahead (P:7280) | text and amount | Orders | order learned | 2+ letters | 2 | No |
| Usually ordered (P:7391) | regulars | Orders | 14 days; weekday 3+ | today | 1 | No |
| For the functions (P:5551) | platter needs | Prep Handy | platter cards, functions | function today or tomorrow | fold, then 1 each | Yes |
| To check before the functions (`js/functions.js:1543`) | card problems | chefs | recipes, functions | problems | 1 | Yes |
| Logged often (P:7567) | item, unit, reason, section, amount | Wastage | `summary/waste` | logged 2+ | 2 | No |
| Transfer chips (P:7966) | venue, person, item, unit, amount | Transfers | `summary/transfers` | moved 2+ | 1 per field | No |
| Proofreader, section spelling, double-up merge (P:2218, P:2929) | fixes | Prep, Orders, Wastage | learned words | on add | 0, with Undo | admin count |
| Cut-off pushes (`scripts/cutoff-push.mjs`) | order now | chef phones | cut-offs | lead time | 1 | No |
| Supplier top-up, repeat last order (`js/supplier-core.js:346`) | quantity | Supplier order | par, typed stock, last order | stock typed | 1 Apply | reason saved |
| Before service minimums (`docs/prep-standards.md`) | minimum | staff, off by default | prep standards | exact name | blank amount | No |
| Planner usual section (P:13293) | section | chefs | `teamsum/main` | 2+ in 8 weeks | 0 | No |

## 2. Staff inputs (register S)

| Id | Page | Now | The book already knows | Smarter | Taps saved | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Wastage | The full name typed fills nothing; the suggestion list leaves the exact name out (P:7556 `k !== q`), typing never fills (P:12384). **Reproduced** (`baseline/waste-exact-390.png`) | last unit, reason, section, amount (`wLast`, P:7582) | Fill on an exact match, as the chip does | 2 + a pick | Low, 0 reads |
| S2 | Transfers | Same gap (P:7986, P:12246) | `xLast` (P:8006) | Same fix | 1 to 2 | Low |
| S3 | Wastage | Reason cleared after each log while unit and section stay (P:7602) | the item's last reason | Fill the item's own reason (S1), not the last log's | 1 | Wrong reason feeds the review |
| S4 | Prep | A typed line with no amount saves blank (P:2337) even when one amount clearly wins; Orders fills it (P:5493) | `usualQty` | Fill like Orders, selected | 1 or typing | May overstate today |
| S5 | Prep | Waste warning only while typing (P:5477); Quick add and one-tap adds put the usual amount on with no warning (P:3105, P:5524) | `wasteFor` | Say "wasted 3 times" on the one-tap path | 0, better amounts | Clutter |
| S6 | Orders | Usual amount still fills after expired waste; the hint is text (P:5504) | waste summary | Do not fill by itself | 0 | Low |
| S7 | Orders | No double-up check (P:7229); the typeahead offers today's open lines (P:7285). **Reproduced** (`baseline/orders-milk-390.png`) | today's live lines | "Already on the list" with Add anyway | a duplicate and a chef Remove | Low |
| S8 | Deliveries | Due chips include suppliers already received today (`js/deliveries.js:147`) | today's receipts | Not received first | fewer wrong picks | Low |
| S9 | Deliveries | Always starts on Chilled (`js/deliveries.js:14`, :219) | today's receipts only | Per-supplier default | 1 | Config field, rules |
| S10 | Before service | Add jumps to Work and opens a blank sheet (P:6113) | unit, section | Stay, fill the unit (amount blank by design) | about 2 per item | Low |
| S11 | Prep, shared screen | Every tick asks who; names by "signed in here" (P:2450) | the plan's section | Planned cook first, still a pick | searching | Misattribution if automatic |
| S12 | Cleaning, shared | Name pick on every task; pack down 25 steps | the task's section | Planned cook first | searching | Keep the pick explicit |
| S13 | Cleaning | Every group shows; no "my section" | `mySec()` | Open on your section | scrolling | Low |
| S14 | Transfers | Mark returned per item (P:8156); an "in" never matches an open "out" | open loans | All back per card | n-1 | Partial returns out of scope |
| S15 | Prep Quick add | One chip one line (P:3098); up to 10 due | Due today | Add all due, one Undo | n-1 | List bloat |
| S16 | Prep | Urgent only on the row after adding (P:5666) | | Urgent in the add sheet | 1 + finding the line | Low |
| S17 | Prep | Planned section beats the item's learned section (P:2328; on purpose, P:11806) | `bestSection` | Leave as is | | Medium |
| S18 | All lists | Unit lists differ per page (P:2831, P:7473, P:7862) | | One shared unit map | | Totals depend on units |
| S19 | Cooling | Staff enter everything again in Operandio | | Head chef decision | | High |
| S20 | Drinks | "On today" is who opened the book (P:10773), not the plan | the plan | Use the plan | 0 | Low |

## 3. The head chef's records (register H)

| Record | Stored | Seen where | Range | Export | Taps (phone, from the admin panel) |
| --- | --- | --- | --- | --- | --- |
| Wastage | `waste/<day>/lines`, review | Reports, Wastage; Dashboard; Inbox | up to 366 days | CSV | 2 |
| Delivery temperatures | `deliveries/<id>` (immutable) | `#/deliveries`, outside the panel; admin picks From and To | 92 days a query | CSV | 4+ |
| Cooling | `cooling/current`, `cooling/recorded` | the clock, current batch | today only, no history | No | 1 |
| Cleaning, Pass check | `cleaningTasks`, `cleaningDone`, `cleaningActions` | Cleaning, Week, a day | any past day | No | 3, +1 a week back |
| Transfers, returns | `transfers/<day>/lines`, `transferOpen` | Reports, Transfers; Inbox "Not back" | 7/14/30 days; open loans any age | CSV | 2 |
| Supplier orders | `suppliers/<id>/orders`, `cutdone` | Supplier order, a supplier, Order history | all, 20 a page | No | 3 to 4 |
| Functions | `functions/<id>/hist`, `fnseen` | the booking, Show every change | all versions | Print | 3 to 4 |
| Minutes sign-offs | `minutes/<id>/signs` | Inbox; Kitchen, Minutes register | 90 days | CSV | 1 to 2 |
| Team shifts | `team/<day>`, `shifts/...`, `teamsum/main` | Reports, Team; Today's team week | 30 days fixed | No shifts CSV | 2 |
| Prep activity | `days/<day>/items` (On it, ticked, who) | Insights Timing top 10; Dashboard | 7/14/30 | CSV without On it | 2 to 3 |
| Kitchen mail, Chef to-do | `mail`, `todos` | Today, Kitchen mail; `#/todo` | open + 30 days done | No | 1 to 2 |

### Common questions

| Question | Answered today? |
| --- | --- |
| Everything for last Saturday | No: about 7 places, 15 to 20 taps; no one-date Transfers view; cooling for that day is gone |
| Food safety records for an inspector, this month | Partly: delivery temperatures CSV (admin); cleaning on screen a day at a time; cooling none; equipment temperature logs not in the book |
| What did we spend time on | Partly: Insights top 10 On it times; Dashboard headline times from written to ticked |
| Which supplier was late or short | No: nothing records short or missing; no expected arrival time |
| What got wasted and why this week | Yes: Reports, Wastage, Summary (2 taps), CSV |
| Who has not signed the minutes | Yes: Inbox row, register CSV |
| Which loans are still out | Yes: Inbox |

### Gaps

- **Captured, never shown:** the cleaning action trail (`cleaningActions`); earlier cooling batches (overwritten, backups only); mail and to-dos done more than 30 days ago; minutes older than 90 days; per-person On it times and On it in the CSV; wastage amount changes in the CSV; delivery temperatures read nightly by the analysis job then dropped (`js/analysis-core.js:34`); the nightly training count nothing reads (`js/admin-dashboard.js:269`).
- **Shown in places that may disagree (from code):** a loan older than 30 days is in the Inbox but not in Reports, Transfers or its CSV; Team's table follows the 7/14/30 period while At a glance uses a fixed 30 days; wastage has four windows (staff 14 days, Inbox 7, Dashboard 7/30/90, History any); time to finish a job is written-to-ticked on the Dashboard and On-it-to-tick on Insights.
- **Not captured though the inputs nearly exist:** short, missing or substitute items on a delivery (the 3 Nov 2026 study kept this for later); temperature limits (none until the head chef confirms one); a receipt linked to its supplier order (supplier is free text); a docket or invoice number; missed cleaning in the Inbox or a report; a dated day log.
- **Invoices:** no invoice, docket or credit field anywhere in the code or rules. A docket number and Short/Missing flags are not prices; credit amounts are money and stay out.

## 4. Chef planning flows (register C)

| Id | Flow | Now | Smarter | Taps saved | Risk |
| --- | --- | --- | --- | --- | --- |
| C1 | Night list | Quick add and Due today use today's weekday when writing tomorrow's list (P:5512, P:4025); the nightly job counts a night line under the day it is stored on | After the cut, chips for tomorrow; the job counts night lines for the next day | 2 to 5 typed lines a night | Changes learning |
| C2 | Quick add and waste | One-tap adds skip the waste check | Mark the chip | 0 | Under-prep, substring matches |
| C3 | Before service | One Add per standard; no "not on the list" filter (`js/prep-standards.js:242`) | Filter, amount stays blank | scrolling | Low |
| C4 | For the functions | One item per tap (P:5608) | Add all with amounts, one Undo | n-1 | Duplicates (guarded) |
| C5 | Today's team | Use it leaves a removed section blank (P:13738) | Fill from the usual | 2 per person | Stale usual |
| C6 | Pings, drinks | Recipients all staff; drinks from who opened the book | Rostered first | 1 to 3 per ping | Staff read of the plan |
| C7 | Supplier order and requests | Record never ticks matched staff requests (`js/suppliers.js:394`, :472); chef ticks each on Orders | One "Mark n matched requests ordered" with Undo | n-1 + a page | Part orders, alias matches |
| C8 | Supplier order and requests | Staff requests chip tapped each visit; the asked amount is never offered | Show "Asked 2 boxes · Use" on the row | 1 + typing per item | 1 query per open |
| C9 | Supplier order and waste | No waste hint in the supplier files | Hint on the row, never change a par | 0 | Name matches |
| C10 | Functions and ordering | The order line lists platter counts only | Ingredient totals as hints on the supplier rows | manual sums | Units, double counting |
| C11 | Check before function | No "stock ordered" or "on the prep list" check | Add both | | A read on Home |
| C12 | Booking guests | Guests saved, unused | Suggest platters (needs confirmed ratios) | | Invented quantities |
| C13 | Delivery received | No link to the order | Chefs see the recorded lines as a checklist | | Must never claim an item arrived |
| C14 | Chef to-do | Nothing hands a job to the to-do list | Add to to-do from mail, stuck lines, checks, minutes | 2 to 3 + retyping | Two places for one job |
| C15 | Chef panel | Orders reads "Not read yet" until Orders opens (P:419); to-do tile has no due count | Add what is already in memory (cut-offs, checks, minutes, mail) | 3 to 6 page checks | Counts that cost reads |
| C16 | Mark done | No quantities, the toast offers only Undo (P:11372) | A "Record quantities" link | | One action per slip |

### Daily sequences across 3 or more pages (chef, source-read)

- **Morning:** PIN and start sheet; Today's team (about 5 taps); Prep (rollover, Quick add, Before service); Orders and each supplier (requests, Use, Review, Copy, Record, then back to Orders to tick each request); Delivery received per delivery; Home function card and checks; Chef to-do. 7 pages.
- **End of day:** Closing soon, Log waste; back to Prep for the night list and For the functions; Orders heads-up; Cleaning pack down; Today's team for tomorrow; Shift pings. 6 pages.

## 5. Signals collected but unused (register E)

- `learned.dow` and `ordlearned.dow` are all-time and never fade (`scripts/nightly-learn.mjs:84`); typeahead, usual amounts and order suggestions ignore the weekday; Regulars ignore recency though `lastUsed` is in the summary.
- No usual amount per weekday anywhere.
- On it to tick times: admin Insights only.
- Waste reasons per item: only chips and the typed hint use them; the usual amount chip still offers the same amount after a "smaller batch" warning.
- Ordered versus delivered cannot be compared (no item quantities on a receipt).
- Function guests unused. Transfer "in" items never reach Orders.
- Order need (Low, Out), cut-off done timing and autocorrect Undo are never learned.
- Computed twice: usual amounts (server and each phone), weekday regulars (three ways), standing order (admin 30 days) versus Usually ordered (staff 14 days), time to tick per section (phone and server), waste per item (four ways). Due today, Pace and badges take about 15 digest reads per phone a day.
- Not measured: typeahead and +Add, order regulars, Logged often, transfer chips, section chips, delivery chips, Make it again, and "changed after the guess" (Change amount, Move to section).

## 6. Read costs (budget context)

Phones used about 44,000 of the 50,000 free reads by 13:00 on 5 Nov 2026; the Plan B target is 12,000 to 20,000 a day (`docs/firestore-usage.md`).

- **0 new phone reads:** weekday and recency ranking; waste-aware one-tap amounts; exact-name fills; Orders double-up; platter hints from the functions listener; counting more suggestions.
- **0 new phone reads, server work:** per-weekday amounts, On it histograms, Due today cadence and pace in `summary/learned`; yesterday's record gaps in a nightly field.
- **New reads:** the Day book (on demand, admin only); staff requests on supplier rows (1 query per supplier opened); a staff usual-section default (+1 a day, privacy check).
