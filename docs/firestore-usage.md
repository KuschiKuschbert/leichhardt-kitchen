# Firestore reads and writes: audit, 5 November 2026

## Records and Filled for you, 13 November 2026

Since 14 November 2026 Reports, Transfers also reads the loans still out (`transferOpen`, open) once a session and on Refresh, 1 read a loan, at least 1, to list those older than its days. Counting every suggestion (E1) adds no read and no write: the counts ride the daily record each phone already sends. The nightly job reads `cooling/current` and `cooling/recorded` (2 reads a night) to keep each day's cooling batch for Records.

[Records](smart-book-options/brief.md) (admin only): opening the page reads `analysis/dashboard` once (kept in memory until Refresh; a reload opens with no day chosen, so it reads nothing more). A finished day's Food safety part reads nothing; Everything reads that day's wastage and transfer lines, `team/<day>` and `analysisDaily/<generation>_<day>` (about 10 to 30 reads, in memory); Print this month and Export CSV read nothing. The nightly analysis job adds the cleaning count (`scripts/records-core.mjs`): the open task revisions and each not yet counted day's completions, about 35 reads a day, once per day; deliveries come from the read it already makes. Filled for you (Wastage, Transfers, Orders) reads nothing: `summary/waste`, `summary/transfers`, the order learning and today's live lines are already on the phone.

## Who has said Got it to a function, 10 November 2026

[Functions ahead of time, step 4](function-ahead-options/brief.md): each Got it on Home's function card writes one small record (`fnseen`) once its Undo has gone, one per person, function, card and booking version, with no read; marks from before the change go once at the next open of Home. Nothing is sent with no signal. A chef's tap of Check who has seen it on a function's page is one query by `fid`, billed one read per record returned (at least 1), plus the rules' own lookups; never on open, no listener, no polling, nothing kept on the phone. The admin Backup and the nightly backup read the whole list once (a few records a week). These are source-derived costs, not measured live usage.

## Operandio shared confirmation, 10 November 2026

[Operandio cooling](operandio-cooling.md#shared-confirmation-10-november-2026) retains the named `cooling/current` live timer and adds one named `cooling/recorded` subscription for the current kitchen’s recording confirmations. Each authorised app pays one additional document read on subscription and on each accepted confirmation, including Firestore’s ordinary reconnect behaviour. There is no collection scan, per-person query, deadline polling or per-tick database work. Confirmation is one write; its server rules also read the current timer to enforce the exact run, elapsed stage and current 10:00 to 21:00 Queensland window, alongside existing session/config checks. Local presentation markers contain bounded event IDs, scoped to the device, and incur no database work. Browser/nightly export reads both named documents, one extra read per export, independently of the dated backup window. The later [daily window](operandio-cooling.md#daily-window-10-november-2026) adds no query, subscription, reset write or job: 21:00 expiry and 10:00 availability derive from the existing kitchen clock and server request time, while both raw records remain stored. New first starts add the immutable integer `windowAt` so a queued old start cannot become tomorrow’s batch. Legacy records stay readable; older clients need **Update** for new starts and the new display. These are source-derived costs, not measured live usage.

## Cleaning schedule extension, 9 November 2026

The chosen [M1 chef layout](cleaning-chef-options/implementation.md) adds no query, listener, persistent private cache or schema. Groups, six-row pages and global search use the loaded tasks. Repeat tasks reuses the loaded range, including existing post-save refreshes. Explicit import results identify their today-only range so returning to Week reloads the correct bounded week. Named same-range work-return actions do not schedule an extra refresh during a pending write.

Opening or refreshing Cleaning keeps the existing two bounded queries: applicable task revisions and today's occurrence states, or at most a week for canonical chefs. Explicit schedule import adds one bounded all-revision query, one missing-task batch and a normal two-query reload; repeating it never creates duplicate tasks. Every enhanced action writes current state plus one immutable audit snapshot atomically. Daily and week views do not read the action history. No startup cleaning query, listener, polling or private persistent copy is added. The nightly backup adds one action day-range query. Existing session/config rule lookups and task/audit validation reads remain separate server-rule costs. See [the feature contract](cleaning-schedule.md).

On 5 November 2026 the database refused every read from 13:00: the free plan's 50,000 reads for the day were used up (they reset at midnight in California, 18:00 kitchen time). The head chef asked what reads and writes what, and how to get the most out of the free plan. This note is the answer: every read and write in `js/`, `sw.js`, `scripts/` and the workflows, with measured costs where they could be measured.

How it was checked. Source review of every Firestore call. The server jobs' own GitHub logs for 4 and 5 November. Page costs measured with the test stand-in, which bills reads the way Firestore does (`tests/fake`), on a month of made-up data the size of this kitchen's (50 prep lines, 20 order lines and 8 wastage lines a day). Nothing was read from the real database, and the Firebase console's usage graph was not seen: the hour-by-hour split below is an estimate. The real rules also read about 4 records (session, PIN, device grant, settings) for each query or live list they let through; the stand-in does not bill those, so real costs are a little higher than measured.

## Prep standards addition, 8 November 2026

[Section prep standards](prep-standards.md) adds no startup read, listener or polling. The admin rollout switch defaults off, so staff surfaces make no catalogue reads until enabled; its boolean uses the existing config listener and one merge write per change. On first use, Refresh, a new day or reopening after 30 minutes away, staff load the selected section’s active catalogue to completion, up to 1,000 items. Management explicitly loads 100 records per page including archives. Each query returns at most 101 records, with the extra record detecting continuation; empty queries cost at least one read. Typing and search reuse memory. Each acknowledged edit writes one record. Nightly/manual backup and kitchen-PIN copy include every current and archived standard; they are permanent configuration, not dated records eligible for backup-cache reuse. These are source-derived costs, not measured live usage.

## Supplier template and split addition, 9 November 2026

[Template sequence imports](supplier-workspace.md#template-order-updates-9-november-2026) reuse the loaded catalogue for review. Apply reads the catalogue once, then the existing current-document transaction read and two writes per changed supplier. No-op sequences save nothing. A first explicit supplier split also reads the original supplier's latest order in one query, at most two documents, to retain the visible history boundary across clock offsets. This first attachment includes an existing destination with no history source. Its paired transaction reads the two current catalogue documents and writes their two next revisions plus two audits atomically. Re-importing an attached split does not repeat the latest-original-order lookup or change its immutable `historyItems` mapping. Exact existing-supplier and item matching use the loaded catalogue, with no per-item query. A failed or partial apply refreshes the review with one further catalogue query; retry is explicit.

A split supplier's history merges its own bounded stream with original history through its immutable split timestamp, because an existing destination can already have orders in the same period. Supplier selection, Refresh and each Older orders tap return up to 20 recent orders from at most two queries of 21 documents each, including lookahead: at most 42 order reads per page. Empty queries cost at least one read. Separate last-emitted snapshot cursors and exhaustion flags advance each stream; unconsumed rows are queried again on the next explicit page request. Exhausted streams need no further query. There is no scan to find a matching item, buffered history or persistent private copy. The store caps explicitly requested pages at 50 selected rows, at most 51 documents per queried stream. The first-attachment baseline lookup remains a separate one-row query with one continuation document, at most two reads. Ordinary suppliers retain one query of at most 21 order reads using already loaded catalogue metadata. Parent lines are mapped in memory through `historyItems`, with legacy identity matching when the map is absent. Original order documents are not copied or rewritten, and there are no per-item history reads.

Orders no longer reads or caches the supplier catalogue after C was chosen on 9 November 2026. The flat request list and compact cut-off disclosure use the existing request/configuration data and today/tomorrow confirmation listener. This removes the former first-open catalogue query, at least one read and otherwise one per supplier, plus its refresh after an acknowledged catalogue change. Supplier workspace reads and transactions remain as above. No new listener, polling or persistent private cache. These are source-derived costs; synthetic browser checks are not measured production usage. [Chosen Orders contract](order-list-options/brief.md#chosen-c).

## Where 50,000 reads a day go

Supplier last-order references (9 November 2026): selecting or refreshing an ordinary supplier reads its latest 20 saved orders in one query, at most 21 order reads with lookahead, replacing the previous latest-only query of at most 2. A split supplier uses the chronological merge above, at most 42 order reads per page. Opening Order history reuses the loaded page. Each Older orders tap advances bounded history, with no automatic scan or per-item query. The individual Last order column may show an older purchase from those loaded pages even when the latest batch omits that item. Typing and recording reuse the in-memory reference; record transactions retain their existing reads and writes. No new listener or persistent private cache. The existing-destination repair's synthetic read-budget checks remain pending until recorded in the pull request. [Contract and checks](supplier-workspace.md#each-items-last-order-9-november-2026).

| Source | Reads a day now | Notes |
| --- | --- | --- |
| Phones, tablets and laptops | about 44,000 by 13:00 on 5 Nov | See the next table. |
| Nightly backup | about 2,500 to 2,800 | Reads 45 days of everything. About 4,000 once 45 days of data exist. |
| Nightly analysis | about 1,770, plus about 400 for Today's team | Reads 90 days, about 280 of them empty days before the book started. Since 7 Nov 2026 also 8 weeks of `team/<day>` plans (up to 56) and 30 days of section picks (`shifts`, about 12 a day) for `teamsum/main`. |
| Nightly learning and summaries | about 800 | Reads every learning claim ever, growing each night. |
| Publish rules | 0 to 200, 850 on 4 Nov | Only when the rules change; 6 runs by hand on 4 Nov. |
| Cut-off pushes | 5 to 15 | GitHub runs the 10-minute schedule only 3 to 7 times a day (a reliability problem, not a cost one). |
| Lock probe | about 6 | Weekly. |
| Click tests, live click tests, emulator checks | 0 | They use the stand-in or the emulator. |

The server jobs use about 6,000 a day now and will use 11,000 to 12,000 once the 45-day and 90-day windows fill with data (around 30 November and mid-January).

## What a device costs (measured)

| Event | Reads | Repeats |
| --- | --- | --- |
| A phone or tablet opens the prep list, first time today | about 1,050 (1,400 if last night's summaries are missing) | Once a day per phone, but again after every shared-tablet lock (10 minutes idle), every handover and every change to a past day: the 14 days of past prep lines (`loadPast()`, about 800) are kept on the phone only until then (`clearPrivateCache()`). |
| A chef opens the order list, first time today | about 920 | 14 past days of order lines (`loadOrdHist()`, about 420), same rules as above. |
| A reload (an update, the 04:00 refresh, reopening) | 70 to 95 | Every live list starts again from nothing: the cache is in memory only. |
| The admin panel on a report page (Insights, Team, Wastage, Transfers, Learning, a person, Proofreader) | 2,100 to 2,400 now, about 3,500 to 4,000 once 60 days of data exist | Every open and every reload: `loadStats()` reads 60 days whatever period is picked, and the Proofreader adds 30 days of order lines. The panel reopens on its last page. |
| The admin panel on Dashboard or Today | about 140 | |
| Supplier order | about 100 | |
| Functions lists | about 20 | Every reload, unlock and sign-in on every device. |

What multiplied it on 4 and 5 November: 48 new versions in a day. A screen left open reloaded for each one, up to every 10 minutes (once an hour since this audit), and every phone picked up reopened reloads too. A laptop left on a report page pays 2,000 or more each time.

## Writes, deletes and storage

About 800 writes a day (4% of the free 20,000) and 30 to 50 deletes (under 1%). A quarter of the writes happen without a tap: the visit count on every reload (`activity`, up to about 120 a day), the head chef's device grant on every load, and the view and search counts. Stored data grows about 1 MB a day, mostly index entries, so the free 1 GiB lasts about 2.5 years; only the `daily` records are cleaned up.

One real risk: **Move PIN** copies every record with one read and one write each. Once about 160 days of data exist it needs more than 20,000 writes, and a year of data is about 50,000 reads and 50,000 writes in one tap, which would stop the book for the day.

## Plan C chosen (head chef, 13 November 2026)

The head chef chose **Plan C**: Plan B's small reads stay, and the Firebase project moves to the pay as you go (Blaze) plan with a budget alert. A day past the free 50,000 reads then costs a cent or two instead of stopping the book until 18:00, as it did at 13:00 on 5 November. The server jobs alone grow from about 6,000 to 11,000 or 12,000 reads a day by mid-January (above), so the margin shrinks without it.

What the head chef does (a session cannot: it needs the billing account):
1. Firebase console, the project, Upgrade (bottom left, under the plan's name), choose Blaze, and pick or create the billing account.
2. Google Cloud console, Billing, Budgets and alerts, Create budget for this project only: US$5 a month (or the same in the account's currency), alerts at 50%, 90% and 100% to the head chef's email. A budget alert warns; it does not stop spending, so a runaway read loop shows as an email, not an outage.
3. Tell the next session it is on. Nothing in the book changes for the switch itself: the free amounts still apply each day, and the read budget test (`tests/read-budget.test.js`) keeps the reads small.

What follows, each its own pull request once the plan is on: Google's scheduler runs the cut-off push job (7.3), so pushes come on time; Firestore's own scheduled backups replace the read-heavy nightly backup, keeping a weekly encrypted copy (4.3); later, the twice-daily check of the real read count (6.1). Until 7.3 is built the cut-off push offer says a push can come late (`pushHTML()` in `js/prep.js`, 13 Nov 2026).

## The decision: Plan B now, Plan C later (head chef, 5 November 2026)

The head chef chose **Plan B, free with headroom**: stay on the free plan and read less, aiming at 12,000 to 20,000 reads on a normal day. **Plan C** (Plan B plus the pay as you go plan as a safety net) comes later, on the head chef's word. The four plans and every option, with what each saves, are on the head chef's page "Kitchen Book Read Budget"; this note keeps the same numbers so any session can carry on.

| Plan | What it is | Reads a normal day | Cost |
| --- | --- | --- | --- |
| A, free, tidied up | 1.1, 2.4 to 2.7, 4.1, 5.4, 6.2 | 35,000 to 50,000 | free, still near the limit on busy days |
| B, free with headroom (chosen 5 Nov 2026, kept in C) | A, plus 2.1 to 2.3 and 4.2 | 12,000 to 20,000 | free |
| **C, free with a safety net (chosen 13 Nov 2026)** | B, plus pay as you go with a budget alert, 4.3 and 7.3 | 12,000 to 20,000 | normally US$0; a day like 5 Nov a cent or two |
| D, just pay | pay as you go and 1.1 only | 60,000 to 100,000 | under US$0.50 a month now, growing, no cap |

## Every option

Saves: reads a day on a normal day. Head chef: changes how the book works for the team.

| # | Option | Saves | Risk | Status |
| --- | --- | --- | --- | --- |
| 1.1 | Release windows: ready pull requests merge only 15:00 to 16:30 and 22:30 to 02:30 (to midnight until 8 Nov 2026); `urgent` merges when green (`docs/auto-merge.md`) | 5,000 to 15,000 on busy days | low | done 5 Nov |
| 1.2 | A screen left open takes an update nobody asked for at most once an hour | thousands on release days | low | done 5 Nov |
| 1.3 | Screens left open update only between services and overnight | 1,000 to 5,000 | low, head chef | not chosen |
| 1.4 | Personal phones keep a copy of the data (persistent cache) | 12,000 to 15,000 | high: reverses #387 and the private-data rule, head chef | not chosen |
| 2.1 | Day digests: the 03:00 job writes one record per past day with its prep and order lines (`digest/<day>`, `scripts/analysis.mjs`, `docs/admin-intelligence.md`); a past-day fix is caught by the day-named stamp (2.4) | makes 2.2 and 2.3 possible | medium | done 5 Nov (rules published 5 Nov 18:13, Publish rules run 228) |
| 2.2 | Prep and order list hints from the day digests instead of 14 days of lines (`loadPast()`, `loadOrdHist()`, `digestRead()`); the order rollover reads the last written day only (`ordRoll()`) | 20,000 to 35,000 | medium | done 6 Nov, #565 (`tests/past-digests.test.js`) |
| 2.3 | Admin reports and Proofreader from digests plus today's live lines (`loadStats()`, `loadOrdStats()`); Refresh reads the digests again | 10,000 to 30,000 on admin days | medium | done 6 Nov, #565 (`tests/past-digests.test.js`) |
| 2.4 | A past-day fix names its day (`markPast()`, `pastCheck()`): `pastEdit.pDays`, `pPrev`, `pFor` (and `oDays`, `oPrev`, `oFor`); a reader trusts the days only when `pFor` is the current `p` and `pPrev` is no newer than its copy, otherwise it reads every day as before | about 7,000, removes a 50,000 worst case | low | built with 2.2, 5 Nov |
| 2.5 | One date-range query instead of one per day | 1,000 to 3,000 | low | not needed once past days come from digests (2.1) |
| 2.6 | After an update nobody asked for, a report page reopens on the Inbox (the Dashboard until 8 Nov 2026; the same reads) (`startTab()` in `js/prep.js`, flag `lk.upd.auto` from `js/upkeep.js`) | 2,000 to 4,000 per laptop reload | low, head chef | done 5 Nov |
| 2.7 | Live lists restart only when access changed (`accessChanged()`); sections once a day (`loadSections()`, `lk.secs`); the functions list starts one listener, not two or three (`watch()` in `js/functions.js`); its 15-day bound left out (see below) | 2,000 to 4,000 | low to medium | built 7 Nov (`tests/live-lists.test.js`) |
| 2.8 | A shared tablet keeps the past-day hints through a lock | about 13,000 today, less after 2.2 | privacy, head chef | not chosen |
| 3.1 | Order the rule checks so most requests look up fewer records | 2,000 to 5,000 | medium | later |
| 3.2 | PIN sign-in as a claim on the account (a server function), so rules read no session records | 5,000 to 10,000 | medium to high, needs pay as you go | Plan C or later |
| 4.1 | Trim the nightly jobs: delete old analysis without reading it, skip days before the book started, recent learning claims only, one range query for the summaries | about 1,200 now | low | built 7 Nov: the first three (`scripts/analysis.mjs`, `scripts/nightly-learn.mjs`, `scripts/analysis-check.mjs`); the summaries' one range query left out (it needs a collection-group query on `lines` and its index in production, for about 40 reads a night) |
| 4.2 | Analysis and backup read only changed days, full run on Sundays | 1,700 now, 8,000 by January | medium | built 7 Nov: the analysis reads the last 14 days and the days a fix names, the rest taken as published (`REUSE_DAYS`, `scripts/analysis-check.mjs`); the backup takes the same older days from last night's encrypted file (`PREV_BACKUP`, `scripts/backup-reuse-check.mjs`); every day on Sundays; past wastage fixes name their days too (`wDays`, 7 Nov 2026) |
| 4.3 | Firestore's own scheduled backups (storage, no reads) replace the read-heavy nightly backup; keep a weekly encrypted copy | 2,500 to 4,000 | medium, head chef, needs pay as you go | Plan C, chosen 13 Nov 2026: next once the plan is on |
| 5.1 | Visits counted once a day; adds and ticks counted nightly | about 300 writes | low | not chosen |
| 5.2 | Stop indexing free-text fields | stored size down 50 to 70% | medium | later |
| 5.3 | Keep 13 months of lines, older ones as monthly digests | keeps storage flat | medium, head chef | later |
| 5.4 | Move PIN refuses a copy past a day's free limit, or copies recent days only | prevents a whole-day outage | low | built 7 Nov: reads everything first, refuses past 15,000 records or 20,000 reads with nothing written, keeps the refusal 7 days (`movePin()`, `tests/move-pin-guard.test.js`); copying recent days only was not built (it would hide old wastage history, a head chef call) |
| 6.1 | A twice-daily check of the real read count warns before the limit (needs Monitoring Viewer on the service account) | warning | low | later |
| 6.2 | The read-budget test bills the rules' reads, the Proofreader and Manage functions | stops it creeping back | low | built 7 Nov (`__fake.ruleBill`, `tests/read-budget.test.js`) |
| 6.3 | The pages say when the reads are used up and when they come back | | | done 5 Nov |
| 7.1 | Cut-off push schedule off the busy minutes | some missed pushes | low | until Plan C |
| 7.2 | A free outside timer starts the push job every 10 minutes | most missed pushes | medium (a token outside GitHub) | not chosen |
| 7.3 | Google's own scheduler runs the push job | all missed pushes | low, needs pay as you go | Plan C, chosen 13 Nov 2026: next once the plan is on |

Build order for Plan B: 1.1 and 2.6 (done 5 Nov), then 2.1 with 2.4 (one rules change: the digests and day-named stamps), then 2.2 and 2.3, then 2.7, 5.4 and 6.2, then 4.1 and 4.2. 2.2 and 2.3 measured on the stand-in (`tests/read-budget.test.js`, a week of history with the nightly summaries): a staff phone's first open of the day (prep, orders, wastage, transfers) from 284 reads to 79, and the admin panel's past prep and order lines from 257 reads to 60 (the index and 59 digests). With this kitchen's real numbers (50 prep and 20 order lines a day) that is about 1,200 down to about 90 per phone per first open, and 3,600 down to about 100 per admin open. 2.7 measured on the stand-in with a 40-line day and 12 sections (`tests/live-lists.test.js`): the admin unlock read today's prep list twice (92 reads) and the sections twice (24), because the owner grant on top of the head chef's PIN started every live list again; now once each (46 and 12). A line added under a section on another phone cost every open phone a read; now none, and a reload the same day reads no sections. With this kitchen's numbers (50 lines a day, about 15 sections, the admin device reloaded 10 to 30 times a day and 3 or 4 phones open) that is about 1,500 to 3,000 reads a day. The functions list: asked for again while the Firebase files loaded (an access change and its event, a sign-in), `watch()` started a listener each time and could stop only the last, so on every open two or three listeners read every booking ahead and kept reading every change to one, on every device with the book open. Now one (`tests/live-lists.test.js`: 3 starts and 36 reads for 12 bookings before, 1 and 12 now; a booking changed on another phone 3 reads before, 1 now). Its 15-day bound is left out: the listener starts only on a reload or a new kitchen day, and the function sheet, its print copy, `#/fn/<id>` and Manage functions find a booking in it by id, so a bound needs a second read for those. It saves about 1 read per booking more than 15 days ahead per reload. Look again if the Firebase console shows `functions` among the top readers.

5.4 and 6.2 measured. Move PIN read about 2,000 records' worth of empty days before it had copied anything and wrote as it read, so a book of 20,000 records would have used the day's free writes. It now reads first and writes nothing past the caps (`tests/move-pin-guard.test.js`: 10 of 17 checks fail on the old code). With the rules' own lookups counted (6.2: about 4 records per request from a phone with a session), they are a large share of every open: 264 of 923 reads on a staff phone's first open, 612 of 1,238 on the admin's, 124 of 203 with the digests. That is what 3.1 and 3.2 would cut. Check the real read count in the Firebase console (Firestore, Usage) after each step and note it here.

Prices (US dollars, checked 5 Nov 2026): reads past the free 50,000 a day cost $0.03 per 100,000; scheduled backups are billed for storage (about $0.000041 per GiB a day), not reads; each record the security rules look up is a billed read, once per request. Budget alerts warn; they do not stop spending. Sources: cloud.google.com/firestore/pricing, firebase.google.com/docs/firestore/pricing, firebase.google.com/docs/firestore/backups.

Also found and fixed (7 Nov): Manage functions (`#/functions`, `loadList()` in `js/fnedit.js`) read every booking again, up to 400, on each functions event while it was open: a change to `config/main`, a booking changed on any phone, coming back to the app, the signal coming or going. A laptop left on it read the whole list tens of times a day. Now `changed()` lays the live list over it (`LK_FN.live()`: today and later, deleted ones included), with no reads. The whole list is read on open, on Read again, at a change once it is 30 minutes old, and when a booking from today on leaves the live list (deleted, or moved into the past). Measured with 12 bookings ahead (`tests/live-lists.test.js`): a booking changed and one added cost 4 reads of the whole list before, none now; a deletion 6, now 1; a settings change and a return to the app 3, now none.

Also found: the cut-off push schedule mostly does not run on GitHub (64 runs in 13 days instead of about 1,900), so reminder pushes are often late or missing (7.1 to 7.3).

To measure again: `tests/read-budget.test.js` and the stand-in's `__fake.bill` (each billed read with its path). The biggest call sites: `loadPast()`, `loadOrdHist()`, `loadStats()`, `loadOrdStats()`, `markPast()` and `pastCheck()`, `accessChanged()` and `clearPrivateCache()` in `js/prep.js`; the functions listener in `js/functions.js`; `scripts/nightly-backup.mjs`, `scripts/analysis.mjs` and `scripts/nightly-learn.mjs`.
