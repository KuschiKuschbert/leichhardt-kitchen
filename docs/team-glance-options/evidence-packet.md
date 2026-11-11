<!-- Kept as given to the reviewers. Correction: Insights' stand-in line read "about 1 line", not "about 5 lines". Pictures named today/... were taken in the session and not kept. -->
# Round 1 evidence packet: "Worth a look" in the admin panel

12 November 2026, Queensland. Source commit: `main` at 4325bc5 (plus wording fix PR #681, not yet merged). Role-based analysis, not research with staff. Pictures are the real book on the click tests' stand-in data with made-up people (Ann, Bo, Sam) and made-up numbers.

## What the owner asked

The owner is the head chef. After hearing what the book records about who works where, they asked: "Does the admin panel deliver all that in clear easy language for me?" The lead read every admin Reports page and answered: partly. The facts are there; nothing turns them into "what to do". The lead offered, and the owner said "Yes" to running this council on it:

> A short "Worth a look" box at the top of Reports: three to five plain sentences built from what is already counted, for example "Sauce has only one cook lately. Ann has never done it." or "Milk was ordered 4 times in 2 weeks: a standing order?". No new tracking, only clearer words.

## Who has the problem, how often

- Only the head chef (verified Google admin plus their PIN) reads Reports. Sous chefs have their own Chef panel, not Reports. Staff never see either.
- Reports is not a service page. It is read on a laptop or tablet, probably weekly when doing the roster or orders. How often the owner opens Reports today is not measured.
- What the owner does today: opens Reports, picks one of six tabs (Insights, Wastage, Transfers, Team, Item evidence, Learning), scrolls. Team alone has ten parts; Insights seven parts of charts and tables.

## What already exists (read this before judging need)

1. **Today, Inbox** (`js/admin-dashboard.js`, the first admin page): "What needs you today": a Not set Today's team row with a button, kitchen mail, transfers, the nightly run; then Today's numbers (prep ticked yesterday, waste last 7 days against the 7 before, functions today). Picture: `today/inbox-1280-first-screen.png`.
2. **Today, Dashboard**: "How the kitchen is going, and where to look next." Its top strip **What changed** has three written headlines by fixed rules, each with an Open link (picture `today/dashboard-1280-first-screen.png`):
   - "90% of Wednesday's prep list was ticked off. A usual Wednesday: the middle of the last 8 was 85%."
   - "Waste is up: 21 lines in the last 7 days, 7 the 7 before. The most common reason was Excess production (14 of 21). Larder logged the most (21)."
   - "Sauce was the slowest section to tick: typical 3 h 30 min. About the same as the week before. Grill was quickest at 45 min."
   Then tiles, the week ahead, a watch list (pin up to 12 sections, items or people), charts. Chosen 3 Nov 2026 by the head chef: "A, The Pass board, with B's three written headlines as one strip above the tiles". Reads on open: 2 (`analysis/dashboard`, `analysis/health`).
3. **Reports, Team** (picture `today/team-1280-first-screen.png`, 390 px `today/team-390-first-screen.png`): "Who has worked where" table, then in words "Sections few people worked lately" ("Sauce: 1 person in 30 days (Bo, 20 shifts).") and "Mostly on one section" ("Ann: 30 of 30 shifts on Larder."). Chosen 10 Nov 2026 (`docs/cross-training-options/brief.md`, design R): one Reports page for cross-training, plus a planner line on Today's team ("Not on Pans in 30 days. Alex is on Pans in this plan.") shown only where someone can act on it. Further down: "Standing order candidates": "On the order list on 3 or more different days in the last 14 days. A standing order with the supplier saves writing them every time."
4. **Reports, Insights**: starts with "What stands out" (one line, e.g. "Thu is the heaviest day: about 5 lines on the list."), then seven parts.
5. **Retired on 10 Nov 2026 by the head chef**: written training assessments (Training tab, Assessments page, "In training"). The head chef chose removal over more cross-training screens. "Activity never sets competence" is a standing rule: a count of shifts is activity, not proof someone can run a section.

## What the box could say (data already counted, no new tracking)

| Sentence kind | Source, already read where | Extra reads if shown elsewhere |
| --- | --- | --- |
| A section few people worked lately, and who has not | `teamsum/main` (nightly), read by Team report and Today's team, 1 read | 1 if the page does not read it yet |
| An item ordered often: standing order? | order lines for 14 days, read by the Team report (digests, about 60 reads, kept for the page) | about 60 if read on a page that does not today |
| An item wasted often, or waste up | `analysis/dashboard` (nightly), Dashboard, 2 reads | 0 on the Dashboard |
| Lines rolling over a lot, a slow section | `analysis/dashboard`, Dashboard | 0 on the Dashboard |

Cost: client-side words from records already loaded where the box sits; no new writes, rules, listeners or saved data. Reads: 0 extra if it sits where the data is already read; up to about 60 if Reports' first page had to read the order lines it does not read now. Files: `js/prep.js` or `js/admin-dashboard.js` (lazy), `css/app.css`, a test. Risk: wrong or stale suggestions (a renamed section, a failed read shown as "nobody"), the head chef acting on activity as if it were skill.

## Places it could go (the lead has not chosen)

- A new box at the top of Reports, above the six tabs (as offered).
- As more headlines in the Dashboard's existing "What changed" strip (now three), or a second strip "Worth a look" under it.
- A row or two in the Inbox's "What needs you today".
- Nowhere new: make the existing words clearer only.

## Measured today (Implemented app, stand-in, Chromium headless, 1280 x 900, admin, fonts as the test stand-in)

- Reports first screen at 1280: page title, six tabs, the "On this page" chips (ten on Team), the period and Refresh, then the first table header. The first written suggestion on Team ("Sections few people worked lately") is below the first screen. 
- Dashboard first screen at 1280: the three What changed headlines are fully on the first screen.
- Taps from Today (where the admin panel opens) to a cross-training sentence: Reports (1), Team (2), scroll. To standing order candidates: Reports (1), Team (2), then the Order list chip or scroll (3).
- This is not a service page: the service rules about taps and visible lines on a 390 px work page do not apply directly, but rule 4's spirit (say why an addition is worth it) does.

## Contracts that apply (excerpts)

- Design patterns (`docs/design-patterns.md`): "Admin panel. A new block gets a `.label` or `h3.a-ch-h` (the nav chips read them). Lists that grow go through `lvHTML()`. No hand-built long tables, no second sticky bar."
- Admin pages (`docs/admin-pages-options/brief.md`, chosen B, 4 Nov 2026): four rooms: Today (Inbox, Dashboard, Item links, Proofreader, Kitchen mail), Reports (Insights, Wastage, Transfers, Team, Item evidence, Learning), Team (People), Kitchen.
- Admin Dashboard (`docs/admin-dashboard-options/brief.md`): headlines are "fixed rules, the same every night"; a failed check says so and is never counted as clear.
- Cross-training (`docs/cross-training-options/brief.md`, chosen R, 10 Nov 2026): assessments retired; a count is activity, not a sign someone can run a section alone; the planner line shows only where it can be acted on.
- Coding rules (`CLAUDE.md`): a refused or failed read must say so, never show "nobody" or "0"; reads say when they run and what they cost; past-day reports from digests; no new listeners.
- Surface colours (`docs/surface-colours.md`): admin uses the Chef's Desk look: warm paper, charcoal rail, Leichhardt orange for action; reading pages stay quiet paper. Operational colours: green means confirmed success; amber attention or pending; red failure. A "Worse" tag on the Dashboard is red text, "Better" green.
- Action feedback (`docs/action-feedback.md`): every action answers where the person looks and says what it did.

## Design references (from the council skill)

Linear (consistent frame, work over navigation), Things 3 (today versus later, frequent visible and details tucked away), Airbnb (time, place, status and next action together), Todoist (quick entry, known defaults), Flighty (what matters now and next, real times, no stale status as live), Duolingo (truthful answers, progress from real work), Headspace (calm short labels a new starter understands, one name for each thing).

## Try to break it (the families to consider)

Confusion and accidental action; repetition and delayed answers; failed reads and writes (an empty or failed read looking like "nobody"); interruption; time boundaries (the nightly run at 03:00, a 30 day window, a renamed section); access (who may read it); misleading presentation (colour or wording implying a fact the data does not establish, for example activity read as skill).
