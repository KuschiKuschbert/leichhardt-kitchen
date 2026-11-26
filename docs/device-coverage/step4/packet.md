# Step 4 evidence packet: the admin panel and the chef panel (27 Nov 2026)

Label for everything here: **Implemented app on the click-test stand-in, synthetic data, role-based review.** Nobody has watched the head chef use these pages at these sizes. Pictures and numbers come from [`shots.cjs`](shots.cjs) at commit `98349bd` of `main`.

## The screens and who uses them

- **The head chef's own computer:** 1920 x 1080 with a mouse (read 26 Nov 2026); its book window taken as 1920 x 1008. Pictures `*-1920.png`.
- **A laptop:** 1280 x 800 with a mouse (the device plan checks admin and anything used on a laptop at 1280). Pictures `*-1280.png`.
- **A phone** (390 x 844, touch), for the two landing pages only, to compare: `inbox-390.png`, `chef-dashboard-390.png`.
- **The admin panel** (`#/admin`) needs the head chef's Google account and his head chef PIN on that device: Inbox (Today), Reports, Team, Kitchen and Prep. **The chef panel** (`#/chef`) is the head chef's or a sous chef's by PIN: Dashboard (Today), Chef to-do, Shift pings, Reports, Team, Kitchen, Prep.
- **Only if sous chefs use the chef panel on the section screens** (not known; a question for the head chef): `chef-dashboard-1920-touch-sous.png`, Sam the sous chef on a shared 1920 screen with touch.

## Read these sections of the step 2 packet

`docs/device-coverage/step2/packet.md`: **The service rules**, **Where it goes, and how loud it is**, and **Design misses** (the record). They hold for this pass too.

## The day in the pictures

Friday 27 Nov 2026, 14:00. Today's prep (6 lines, none ticked yet), two orders and a wastage line from the usual fixture; 30 finished days of prep lines (7 a day, 10 at weekends, most ticked, a few rolled over) and some wastage; 90 nights of the nightly record (for the Dashboard, Inbox, Reports and Records, one cleaning job missed every fifth night); the item analysis for yesterday; three open kitchen mails; guides; five people (Ann the head chef, Sam a sous chef, Bo, Cy and Di); four sections and two shifts (Lunch, Dinner); no team saved for today yet. **No function today**, so the band is not over these pages, except `inbox-1280-busy.png`: a functions afternoon with a round due within the hour (the band ends at 212 px on the laptop). The chef Dashboard's Orders tile says "Not read yet" because it counts from this device's own lists and Orders has not been opened on it today: that is how it works, not a gap in the test data.

## Decisions already made (do not re-propose what they rejected)

Collected from `docs/head-chef-decisions.md` and the admin and chef panel briefs; newest first. Where a source said a choice was later replaced, the later one is given.

- **26 Nov 2026:** admin pages are checked at 1280 and 1920 x 1080 (the head chef's computer and every shared screen read 1920 x 1080). The Screens row came out again the same day: do not propose a per-device size line or list.
- **26 Nov 2026, Cleaning results:** one Inbox row the next morning opens that night in Records, miss first; weights live in one list inside Repeat tasks. Rejected: a new room, a new Reports tab, anything new on a cook's page. A miss is the section's, not a person's.
- **20 Nov 2026, the Save bar:** the admin and chef panels' `.a-savebar` wears `.sv-dock`: what is not saved first on the left, the main button last on the right.
- **19 Nov 2026, People:** one row a person with role and rights in words; Change opens one person in place; Delete for good and leaving wait for Save; a deleted row is struck through with Undo delete. Rejected: always-live boxes, a laptop tick table beside phone rows, role groups. Delete for good is admin panel only, never the head chef's own row; sous chefs keep Stopped working here only.
- **15 Nov 2026, the chef panel's Kitchen room:** one page of rows, each with "Open ›" in words; the five tabs and the Overview tiles went. Rejected: no Kitchen room, tools on the Dashboard, a line pointing to the chef hat. The chef hat's links stay.
- **12 Nov 2026, Reports, Team, At a glance:** the Dashboard's headline cards (look 1). Counts are activity, never skill. Rejected: a "Worth a look" box, a Seen flag, a red stale line; "Team landing on the written lines" rejected for now.
- **10 Nov 2026, cross-training:** written assessments retired from the screens (the Training tab, the Inbox training row, Assessments and "In training" went; the records stay). The planner shows at most two plain lines a shift and never takes a section's only experienced cook off it.
- **10 Nov 2026, admin Today restyle:** the Inbox shows what needs you first. The Dashboard keeps its period pills on top, one always-visible table, and only the charts folded. The laptop picked-row pane was removed. Rejected: folding the numbers, a list-and-detail pane.
- **8 Nov 2026:** the chef panel uses the real admin shell at `#/chef`, with working editors and no wider owner access. The admin's Today is the Inbox, with the Dashboard beside it.
- **4 Nov 2026:** four rooms on a shared page kit, Today, Reports, Team and Kitchen (Prep added later). Rejected: a workbench layout.
- **3 Nov 2026:** the Dashboard is for the verified head chef only (a sous chef version is a separate decision); no prices or GP; a number that did not load never shows 0.

## The pictures (`docs/device-coverage/step4/`, what shows without scrolling)

- **Admin:** `inbox`, `insights` (Reports), `records`, `reports-team`, `people` (Team), `plan` (Today's team), `kitchen` (Kitchen, Overview), `cutoffs`, `suppliers` (Suppliers & pars), `prep-standards`, each `-1920.png` and `-1280.png`; `inbox-390.png`; `inbox-1280-busy.png`.
- **Chef panel (Ann, head chef by PIN):** `chef-dashboard`, `chef-kitchen`, `chef-todo`, each `-1920.png` and `-1280.png`; `chef-dashboard-390.png`; `chef-dashboard-1920-touch-sous.png`.

## The numbers ([`metrics.json`](metrics.json))

Both panels share one frame: at 1920 the dark chapter rail sits at x 228 to 416 and the page at x 452 to 1692 (the frame is 1464 px wide, centred, 228 px empty either side); at 1280 the rail is at x 20 to 208 and the page runs to 1260. The top bar ends at 132 px at 1920 and 96 px at 1280. Page errors 0 and no sideways scroll in every picture. Controls under 44 px are counted on the touch pictures only (`inbox-390`: Skip to content and the Inbox tab; the others: Skip to content).

| Page | 1920: screens tall | 1280: screens tall | 1920: controls in view | 1280: controls in view |
| --- | --- | --- | --- | --- |
| Inbox | 1.28 | 1.56 | 33 | 31 |
| Insights | 6.23 | 7.59 | 46 | 46 |
| Records | 2.27 | 2.81 | 38 | 35 |
| Reports, Team | 3.73 | 4.65 | 41 | 41 |
| People | 1.13 | 1.37 | 33 | 32 |
| Today's team | 1.45 | 1.78 | 37 | 30 |
| Kitchen, Overview | 1.90 | 2.35 | 39 | 37 |
| Order cut-offs | 1.55 | 1.92 | 42 | 41 |
| Suppliers & pars | 1.00 | 1.00 | 32 | 32 |
| Prep standards | 1.21 | 1.48 | 26 | 24 |
| Chef Dashboard | 1.00 | 1.18 | 30 | 27 |
| Chef Kitchen | 1.00 | 1.00 | 25 | 25 |
| Chef to-do | 1.00 | 1.15 | 29 | 28 |
