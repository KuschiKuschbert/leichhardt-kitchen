# Firestore reads and writes: audit, 5 November 2026

On 5 November 2026 the database refused every read from 13:00: the free plan's 50,000 reads for the day were used up (they reset at midnight in California, 18:00 kitchen time). The head chef asked what reads and writes what, and how to get the most out of the free plan. This note is the answer: every read and write in `js/`, `sw.js`, `scripts/` and the workflows, with measured costs where they could be measured.

How it was checked. Source review of every Firestore call. The server jobs' own GitHub logs for 4 and 5 November. Page costs measured with the test stand-in, which bills reads the way Firestore does (`tests/fake`), on a month of made-up data the size of this kitchen's (50 prep lines, 20 order lines and 8 wastage lines a day). Nothing was read from the real database, and the Firebase console's usage graph was not seen: the hour-by-hour split below is an estimate. The real rules also read about 4 records (session, PIN, device grant, settings) for each query or live list they let through; the stand-in does not bill those, so real costs are a little higher than measured.

## Where 50,000 reads a day go

| Source | Reads a day now | Notes |
| --- | --- | --- |
| Phones, tablets and laptops | about 44,000 by 13:00 on 5 Nov | See the next table. |
| Nightly backup | about 2,500 to 2,800 | Reads 45 days of everything. About 4,000 once 45 days of data exist. |
| Nightly analysis | about 1,770 | Reads 90 days, about 280 of them empty days before the book started. |
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

## How to get the most out of the free plan, biggest first

| # | Change | Saves a day | Risk | Needs |
| --- | --- | --- | --- | --- |
| 1 | Done (5 Nov): the pages say when the reads are used up; a screen left open takes an update nobody asked for at most once an hour. | thousands on busy release days | low | |
| 2 | Fewer releases: group small changes, a handful a day instead of 48. | thousands | none | how the sessions work, not code |
| 3 | The past-day hints on the prep and order lists come from the nightly summary instead of 14 days of lines on every device (the coding rules already ask for this). | 20,000 to 35,000 | medium: the hints must stay the same | a nightly job change and the client |
| 4 | The admin reports and Proofreader use the nightly analysis plus today's live lines; raw days only for a CSV or a tap. Until then, read the days the chosen period needs, and do not reopen a report page after an update nobody asked for. | 10,000 to 30,000 on admin days | medium: the numbers must match | |
| 5 | A change to a past day names the day, so other devices read that one day again, not 14 or 60. | about 7,000, and removes a 50,000 worst case | low | |
| 6 | Do not restart every live list when nothing about the person changed; keep the functions list to the 15 days the views show. | 3,000 to 5,000 | low to medium | the device-session checks |
| 7 | Server jobs: delete the old analysis without reading it, skip days before the book started, read only recent learning claims, analysis and backup of changed days only with a weekly full run. | 1,200 now, about 8,000 later | low to medium | backup recovery check |
| 8 | Keep the shared tablet's past-day hints across a lock while the kitchen and day are the same. | about 13,000 | changes the privacy contract | head chef's call |
| 9 | A saved copy on personal phones (IndexedDB) so a reload pays only for changes. | 12,000 to 15,000 | high: reverses #387 and the private-data rule | head chef's call |
| 10 | Move PIN refuses above a safe size, or copies recent days only. | prevents a whole-day outage | low | |

With 1 to 7 the kitchen should sit well under 50,000 even on a busy day. The safety net is the pay as you go plan (Blaze): the free 50,000 reads, 20,000 writes and 1 GiB stay free, and reads past that cost a few cents per 100,000, so even a day like 5 November costs cents. A budget alert of a few dollars guards it. That is the head chef's call.

Also found: the cut-off push schedule mostly does not run on GitHub (64 runs in 13 days instead of about 1,900), so reminder pushes are often late or missing. It needs a different trigger; it is not a read problem.

To measure again: `tests/read-budget.test.js` and the stand-in's `__fake.bill` (each billed read with its path). The biggest call sites: `loadPast()`, `loadOrdHist()`, `loadStats()`, `loadOrdStats()`, `markPast()` and `pastCheck()`, `accessChanged()` and `clearPrivateCache()` in `js/prep.js`; the functions listener in `js/functions.js`; `scripts/nightly-backup.mjs`, `scripts/analysis.mjs` and `scripts/nightly-learn.mjs`.
