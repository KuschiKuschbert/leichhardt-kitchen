# Round 2: three designs for clearer suggestions in the admin panel

12 November 2026. Review-only previews drawn over the real book on the click tests' stand-in (made-up cooks Ann, Bo, Sam; made-up numbers). Nothing is in the book. Preview measurements, Chromium headless, admin role, the test stand-in's fonts. Source: `main` at 4325bc5. Preview source: `preview/designs.js`. The pictures named below were taken in the session; the ones kept are in `evidence/` (A: `1-a-team-words-first.png`, `2-a-old-counts.png`; B: `3-b-dashboard-cards.png`; C: `4-c-inbox-row.png`). Chosen and built: see `brief.md`.

## Round 1 result (five reviewers)

Verdict **Build smaller, 5 of 5**. No new "Worth a look" box with a new name. Word cross-training as time-bound activity ("No Sauce shifts in 30 days"), never "never" or skill. A failed, stale or partial read says so. Disagreement only on place: head chef, cook and new starter said at most one or two cards in the Dashboard's What changed; skeptic and keeper said move the Team page's written lines above its table (0 extra reads), the skeptic allowing one Dashboard card too.

Break-it risks carried (source review, not reproduced): (1) a renamed section reads as "nobody" because the 30-day count keeps section names; (2) the Team page counts from a stale nightly record with no warning (Today's team has a freshness guard, the Team report does not); (3) order days that failed to load count as no orders, so a standing-order candidate can drop off silently. These are faults in today's code and get their own fix whatever is chosen.

## The same task in each design

Task: the head chef, on a laptop late in the week, wants to know whom to cross-train and whether anything should be a standing order. Today: admin opens on the Inbox (first visit) or the last page; Reports (1 tap), Team (2), scroll past the table to "Sections few people worked lately" (below the first screen at 1280 x 900), further down for Standing order candidates.

### A. Words first on the Team page (changes the least)

Reports, Team. The page's own written lines move above the "Who has worked where" table, in time-bound words, with one line saying when the counts are from. Standing order candidates gets a one-line summary there with a link down to its list. The old copies further down go, so each sentence has one place. Nothing else in the panel changes.
- Pictures: `designs/A-1280-ok.png` (whole page), `A-1280-ok-first-screen.png`, `A-1280-stale.png`, `A-1280-fail.png`, `A-390-ok-first-screen.png`.
- Words: "Sauce: Only Bo worked Sauce in the last 30 days (20 shifts). No Sauce shifts in 30 days: Ann, Sam." Status line: "Counted to yesterday by the nightly run, Thu 12 Nov at 03:00. A count of shifts is activity, not a sign someone can run a section alone." Stale: "These counts are from Mon 9 Nov. The nightly run has not finished since, so the last 3 days are missing." Failed: "Could not load the shift counts. Check the signal and tap Refresh. Nothing here means nobody worked a section."

### B. Two more cards in the Dashboard's What changed (rethinks the flow)

Today, Dashboard. The existing strip of three fixed-rule headlines gains up to two cards in the same form: "Few cooks, last 30 days: Only Bo worked Sauce in the last 30 days. 20 shifts. No Sauce shifts in 30 days: Ann, Sam. A count of shifts, not of skill. Open Team" and "Standing order?, last 14 days: Milk was on the order list on 4 days in 2 weeks. Open Team". The strip goes from three columns to four, the fifth card wraps to a second row.
- Pictures: `designs/B-1280-ok.png`, `B-1280-ok-first-screen.png`, `B-1280-stale.png`, `B-1280-fail.png` (a red "Could not load, shifts" card), `B-390-ok-first-screen.png`.
- Cost: the cross-training card needs `teamsum/main` on the Dashboard (+1 read on open). The standing-order card needs order lines the Dashboard does not read today: about 60 reads on open, or a change to the nightly job to count it into `analysis/dashboard` (0 reads on the phone, a server change and its check).

### C. One quiet Inbox row a week (removes the most friction)

Today, Inbox. One row in the existing Inbox list, in its quiet grey state (not the orange "needs you" state): "This week: 2 team and order notes. Sauce had one cook in 30 days (Bo). Milk could be a standing order." with Seen and Open Team. It shows once a week until Seen or opened. Open Team opens the Team page at its written lines. The detail stays on the Team page.
- Pictures: `designs/C-1280-ok-first-screen.png`, `C-1280-stale.png`, `C-1280-fail.png`, `C-390-ok-first-screen.png`.
- Cost: `teamsum/main` on the Inbox (+1 read on open) and the order lines (about 60 reads) or the nightly change as in B; a "Seen this week" flag on the device (`lk.*`) or in an admin record (a write and a rule).

## Measured (Preview, stand-in)

| | A Team words first | B Dashboard cards | C Inbox row |
| --- | --- | --- | --- |
| Where | Reports, Team | Today, Dashboard | Today, Inbox |
| Taps from where admin opens (Inbox) to the cross-training sentence | 2 (Reports, Team), 1 if Team was the last Reports tab | 1 (Dashboard) | 0 |
| On the first screen at 1280 x 900 | heading, status line and the first sentence pair start at y about 790; partly | the cross-training card, yes; the standing-order card wraps below | yes |
| At 390 x 844 | below the first screen (Reports header, ten "On this page" chips) | the new cards below the first screen | the row on the first screen |
| Sideways scroll | none | none | none |
| New reads on open | 0 (Team already reads both) | +1, plus about 60 or a nightly change for standing orders | +1, plus about 60 or a nightly change |
| New writes or rules | none | none | a "Seen" flag: on the device, or an admin write and a rule |
| Files | `js/prep.js`, a test | `js/admin-dashboard.js`, maybe `scripts/dashboard.mjs`, tests | `js/admin-dashboard.js`, maybe the nightly job, tests |
| Pull requests | 1 | 1 or 2 | 2 |
| Relearning | none: same page, same words, moved up | small: two more cards of a known kind | small: a new row kind |

## How they differ structurally

| | A | B | C |
| --- | --- | --- | --- |
| Place | a report page | the overview page | the to-do page |
| Form | the report's own written sections, moved up | headline cards, one per finding | one summary row pointing elsewhere |
| When it shows | always, whenever the page is opened | always, while the finding holds | once a week until Seen |
| Detail | all of it in place | one finding per card, details on Team | none in place, all on Team |

## Contracts to check (excerpts in the round 1 packet, `packet.md`)

Admin blocks get `h3.a-ch-h`; lists that grow go through `lvHTML()`; Dashboard headlines are fixed rules and a failed check says so and is never counted as clear; the Inbox is "What needs you today" (orange = needs you, grey = waiting or informational); activity never sets competence; a refused read says so, never "nobody" or "0"; reads say when they run and what they cost; admin budget in `tests/read-budget.test.js`.

## Not evidenced

Real Reports usage frequency; a real month of data with long names and many sections; rendered contrast of the new lines measured (they use existing classes and tokens); keyboard focus on the new links; the renamed-section case drawn; the Seen flag in C working.
