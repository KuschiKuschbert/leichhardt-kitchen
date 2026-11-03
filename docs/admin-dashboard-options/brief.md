# Admin dashboard proposals

Requested 3 November 2026. Waiting for the head chef's choice. Nothing in the app changes until a direction is chosen.

The head chef asked for a proper dashboard in the admin panel, so the information already pulled is easier to see. Today the numbers sit across Reports, Review desk, Operations and Saved records, one page at a time. These proposals add one page that shows the important numbers, says whether they are getting better, and links into the existing reports for the detail.

Both designs keep the Chef's Desk look chosen on 1 November 2026 (`docs/admin-design-options/brief.md`): the chapter rail, Barlow and Barlow Condensed, warm paper, the charcoal bar and Leichhardt orange. All figures, items, venues and names in the mockups are examples.

## Ideas

1. **A dashboard opens first.** A new first chapter, Dashboard, before Review desk. The existing reports stay as the detail.
2. **Needs you.** One list of what is waiting: open mail, minutes not signed, item links, training gaps, loans not back, a nightly job that failed. Each row opens the exact page.
3. **Compared with what?** Every number shows the period before, in words as well as colour. More ticked is better, more waste is worse.
4. **Tap a number, see where it came from.** Tiles, bars and cells open the existing report with the same dates and section set.
5. **The week ahead.** Functions and guests, supplier cut-offs and the usually busy days on one screen.
6. **A watch list.** Pin an item, section or person from a report and follow its trend until unpinned.
7. **Written headlines.** Plain sentences from fixed rules on the numbers. No AI service; the same rules every night.
8. **Opens fast and cheap.** The nightly analysis job also writes one small private dashboard record (7, 30 and 90 days), so the page opens with about 5 reads instead of reading 60 days of lines on the device.

## The two designs

| Direction | Shape | Best fit | Tradeoff |
| --- | --- | --- | --- |
| A. The Pass board | Six tiles with trend lines, Needs you, the week ahead, then charts: prep each day, wastage by reason, load by weekday and section, most wasted items, training by section. One 7, 30 or 90 day switch for the page. | The tablet or office, a weekly look at patterns, rosters and waste. | Long on a phone; more to take in at once. |
| B. The Morning brief | "Morning, Chef." Do first dockets, three written headlines with one small chart each, the next 7 days, the watch list, and At a glance numbers at the side (at the end on a phone). | The phone before service, about two minutes. | Fewer numbers on screen; patterns outside the headlines need the reports. |

Recommendation: build A, with B's three written headlines as one strip above the tiles. If the head chef mostly checks on a phone before service, B on its own.

## Limits both keep

- Only the verified head chef admin sees it, like the reports now. A sous chef version is a separate decision.
- No prices, GP or supplier codes from AVC Live. Waste is in lines and amounts, never dollars.
- Delivery temperatures show what was recorded. No pass or fail limits are invented.
- A number that did not load says so. It never shows 0 or "nobody".
- Insights, Wastage, Transfers, Team and Item evidence keep their pages.

## If one is chosen

Small pull requests in this order, each with click tests at 390, 768 and 1280 px and the read budget check:

1. Nightly dashboard record, written by the existing nightly analysis job, verified admin only in the rules (looser for a new admin-only document: publish before the client).
2. The Dashboard chapter, tiles or brief, linked into the existing reports.
3. Needs you, from counts the admin panel already reads.
4. Week ahead and watch list (pins saved with the admin's records, in backups and PIN moves).

## Files

- `index.html`: both designs in one page, with Design and Screen switches. Phone view reflows the same mockup at 390 px. Period pills in A change every number and chart.
- `previews/`: A and B at 1440 px, A at 768 px, A and B at 390 px.

Checked: no sideways scroll at 390, 768 and 1440 px, no script errors, real Barlow, Barlow Condensed and Caveat fonts.

| A. The Pass board | B. The Morning brief |
| --- | --- |
| ![The Pass board](previews/a-desktop.png) | ![The Morning brief](previews/b-desktop.png) |
