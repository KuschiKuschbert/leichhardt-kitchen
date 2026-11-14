# Fill Today's team from the Humanforce roster

14 November 2026, Queensland. Head chef request: fill Today's team from the Humanforce Weekly Department Roster Report (CSV export) while a read-only Humanforce API key is requested from Australian Venue Co IT. [Proposal](proposal.md), [evidence packet](evidence-packet.md). Role-based analysis, not research with staff.

**Status: round 2 designs drawn and measured on previews. Council scoring next. Nothing built.**

## Head chef answers after round 1 (14 November 2026)

1. Go on to designs, and measure the week-to-week change when a second week's roster is available (privately, never in the repo).
2. **Unmatched roster names are listed on a card with a link to Manage staff.** The import never adds people.
3. **Every book service a roster shift touches** is filled (the head chef's original rule stands; the Cook's leave-unticked option was declined).
4. **No wages processed.** The import takes the CSV and wipes every money cell in memory before anything else reads the file. The Excel export (no wage figures, real dates) was offered and declined. The downloaded file itself stays on the device; where the import may run was not answered and stays open.

## Round 1

**Verdict: Build smaller, 4 of 5.** Five fresh agents reviewed the proposal, the evidence packet and the stand-in screenshots at 390 and 1280 px (source commit `main` at 5d92379).

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Gains only when Home and the break board are not blank. A wrong fill that gets saved shows on every phone. Show roster times on the review and leave part-shift overlaps unticked. |
| Head chef | Build smaller | Real but modest: two or three chefs, once a week. Fill only empty future days, exact given-name matches and clear overlaps; everything else on one card. Put it inside Copy a day. |
| Skeptic | **Don't build (yet)** | Copy last weekday already fills an empty day in about 5 taps with sections and breaks. Measure how much the roster changes week to week and how many days go unsaved first. |
| New starter | Build smaller | Seven days filled, one shown, seven Saves: easy to save today and think the week is done. Keep one list of the seven days with written status on screen. |
| Keeper of the book | Build smaller | Cheap in reads (none for the file), but the day of each shift rests on an undocumented format. Fail closed: fill nothing unless every check passes. |

**Disagreement.** The Skeptic would not build until the gap is measured: how much a real roster changes between consecutive weeks and how often days go unsaved. The other four accept the need but cut the scope.

### Correction to the baseline

The packet's 130 taps a week compared the import with entering a week through Who's working?. The planner already has **Copy last <weekday>** (`tmUseLast`, `js/prep.js`): it fills an empty day with last week's shifts, sections and breaks, about 5 taps a day (read from source, not counted on the stand-in), so about 35 a week plus edits for what changed. The fair baseline is Copy last weekday plus the roster's week-to-week changes. Not measured yet: the import's own taps (export, getting the file onto the phone, file picker, review, seven Saves), the real week-to-week change rate and how many days go unsaved.

### Cuts the four Build smaller reviewers agree on

1. **Fill only empty, future days that were read from the server**, the way Copy last weekday does. A day already planned, a past day, or a day whose read failed or is still checking is not changed, and says so.
2. **Keep the seven dated Saves.** No Save week. Keep one list of the week's seven days on screen with written status: Filled, not saved; Saved; Already planned, not changed; Past, not changed. Filled is not Saved (Duolingo; colour rule: sage never means Saved).
3. **No new button.** Put Fill from roster file inside the existing "Copy a day or spread breaks" fold, beside Copy last weekday (Linear: one place for planner actions).
4. **Fail closed.** Parse quoted CSV properly. Require the seven known day columns, seven consecutive Monday to Sunday dates, Leichhardt Hotel and the Food department, and consistent shift groups on every row. Anything else fills nothing and says why, without echoing a row (rows carry wages).
5. **Never guess a name** (Todoist). Fill only exact matches; every other roster name goes on one card for the chef.
6. **Show each person's roster time** beside the services it fills, so a part-shift overlap is visible before Save (Flighty: real times from the data).
7. Keep the reader and converter separate, so the Humanforce API answer can replace the file later.

### Proposed changes to head chef decisions (for the head chef)

- **Adding people from the file.** The head chef asked to offer adding unmatched people under their given name. The Skeptic and the Keeper advise against adding people from the import in the first version: a nickname already in the book ("Dan") becomes a duplicate person, given and family name order differs between cultures, and each new person opens a first-PIN window. An access consideration was raised and needs private follow-up before this step is built. Smaller option: list unmatched names on the card and link to Manage staff.
- **Which services a shift fills.** The head chef chose every book shift a roster shift covers. The Cook advises that a shift only partly on a service (for example 11:00 to 15:30 has 30 of All day dining's 120 minutes) be shown but left unticked for the chef to decide.
- **Where it may run.** The Keeper advises offering the import only on a personal device, because the downloaded file with wages stays on the device.

## Break-it findings (round 1)

| Scenario | Role and state | Expected | Hypothesis | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- | --- |
| Shifts land a day off | Sous chef imports a file with a split shift, second location, quoted comma or changed export | Nothing filled; a card says why | Days come only from line 1's joined column names, so one unexpected group moves later shifts and still looks plausible | Risk / Not evidenced (one export matched, 47 of 47 shifts) | Converter tests on a synthetic file for each shape; each must fill nothing |
| Wrong person by given name | The book's "Sam" is a nickname or a different person; or the roster person is function-only in the book (`tmPeople` leaves out role `fnc`, read in source) | A card asks; nothing guessed | Shifts on the wrong person's Home, or a duplicate person offered | Risk / Not evidenced | Exact matches only; chef confirms anything else; no automatic adding |
| Lost or stale week | Chef imports, saves two days, then the 04:00 refresh, an update or the shared lock clears memory; or Humanforce changes midweek | Unsaved days stay recoverable or clearly unsaved; a re-import never overwrites sections or breaks set since | Drafts are memory only (`tmPlan.days`); a re-import either skips filled days or wipes later edits | Risk / Not evidenced. Checked in source: `tmPlanEditable` allows only today or later after a successful read, and the rules refuse a save whose version is not the next one | Click test: import, save two days, reload, read the week strip; fake clock across midnight |

Private follow-up: an access consideration about adding staff from a file. Kept out of this public note.

## Not evidenced yet

The import's own tap count; the week-to-week change rate; how often days go unsaved; how a split shift, a multi-location report or a different Humanforce version exports; Home for a newly added person.

## Round 2: three designs

All three keep the head chef's answers and the agreed cuts: inside the existing "Copy a day or spread breaks" fold, CSV only, money cells wiped first, fail closed with nothing filled, empty future days only, exact names only, unmatched names on a card with Manage staff, every service a shift touches, sections from usual sections (as Who's working? does), no breaks from the file, one dated Save for each date. Previews: [index.html](index.html) ([A](a.html), [B](b.html), [C](c.html)). Synthetic: ten made-up roster people, eight made-up book staff (two roster names unmatched: a second Sam and a two-word given name), today Tuesday 17 November, Monday past, Wednesday already planned, five days to fill.

| | A, Fill and go | B, Check, then fill | C, The week list |
| --- | --- | --- | --- |
| Central idea | The file fills at once; a short card says what happened; the planner stays the place to check and save | Review the whole week before anything fills; choose the days | The week list becomes the place to check and save; no switching days |
| Sequence | Choose file, filled, then per day: pick date, check, Save | Choose file, review by day, tick days, Fill, then per day: pick date, check, Save | Choose file, filled, then per row: Open (optional), Save that date |
| Where the work is | Existing worksheet per day | New review list, then existing worksheet | New week list with Open and dated Save buttons |
| Roster time shown | In the worksheet rows of the filled day | In the review list for every person | In Open under each day |
| Disclosure | Result card only | Days fold open one at a time | Days open one at a time inside the list |

**Structural difference.** A and B differ in sequence (fill first versus review first) and hierarchy (status card versus full per-person review). A and C differ in navigation and layout (save through the date picker versus save from a list row). B and C differ in sequence, layout and where Save lives. None are colour or spacing variants.

### Measured on the previews

**Preview**, not the implemented app: schematic page (no break board, reminders or real worksheet controls), 390 x 844, fallback fonts, made-up data, scripted with Playwright on 14 November 2026. Taps include the phone's file picker, assumed 2 (open Downloads, pick the file); not measured on a real phone.

| Measure | Before: Copy last weekday | Before: Who's working? | A | B | C |
| --- | --- | --- | --- | --- | --- |
| Taps to fill and save the 5 empty days | about 25 (5 a day, from source) plus edits for roster changes | about 75 to 110 for these 5 days (13 to 24 a day) | **19** | **20** | **9** |
| Brings sections | Last week's | Usual | Usual | Usual | Usual |
| Brings breaks | Last week's | No | No | No | No |
| Shows roster times | No | No | In the day's rows | In the review | Under Open |
| Rows visible at 390 after reading the file (from the result's top to the Save band) | n/a | n/a | 7 day rows with status, 1 unmatched name | Unmatched card, 4 day headers, first open day's first people | 6 day rows with Open and Save |
| Page height after reading (preview) | n/a | n/a | 2154 px | 2102 px | 2348 px |
| Navigation levels added | 0 | 0 | 0 (inside the fold) | 1 review step | 0 (inside the fold) |
| Build size (estimate) | 0 | 0 | 2 pull requests (reader and converter; fill and card) | 3 (adds the review) | 2 to 3 (adds row Saves on the existing save path) |
| Relearning | None | None | Low | Medium | Low to medium (Save in two places) |
| New reads or rules | None | None | None | None | None |

All three need breaks set afterwards (Spread them, about 3 to 4 taps for each service, not counted). Copy last weekday brings last week's breaks.

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| One dated Save per date, no Save week | Works | Works | Works: each row Save names its date. Needs work: two Save controls show at once (row and band) |
| Filled is not Saved (words, not colour) | Works: "Filled, not saved" with a dot; Saved with a tick and time | Works | Works |
| People surface sage; attention orange with words; Saved green with words | Works on preview tokens; contrast Not evidenced | Same | Same; the orange row Save buttons add strong emphasis in a people book: Needs work |
| No new tab, bar button or pop-up | Works | Works (inline review, not a sheet) | Works |
| Never guess a name | Works | Works | Works |
| Fail closed, no row echoed | Works in preview (one failure card) | Same | Same |
| Past and planned days untouched, said in words | Works | Works | Works |
| Failure and loading states | Not evidenced beyond the refused file | Same | Same; a row Save failure is Not evidenced |

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Todoist: quick entry, known defaults visible and editable, never guess | Works: defaults land in the editable worksheet | Works: everything visible before filling; slower | Works; defaults visible only under Open |
| Airbnb: who, when, service and status together | Needs work: times only inside each day | Works: the review shows all of it | Needs work: counts in the row, detail under Open |
| Things 3: this week's plan distinct from today's live board | Works | Works | Works |
| Duolingo: honest feedback, filled is not Saved | Works | Works | Works; risk of saving unseen days from a summary |
| Linear: one place for planner actions | Works: Save stays where it is | Works | Needs work: Save in two places |
| Headspace: plain words | Works | Works | Works |
| Flighty: real times from the data, no stale status as live | Works: the card says when the roster was read | Same | Same |

### Break-it scenarios for the scorers

1. **Saving unseen days (C).** A sous chef taps five row Saves without opening a day. Expected: each Save names its date; nothing hides a wrong fill. Hypothesis: a day-shifted file would be saved five times in a few seconds. Mitigated only by fail-closed parsing. Evidence: Risk / Not evidenced.
2. **Saving one day and leaving (A, B).** A chef saves today and leaves the page. Expected: the four other filled days stay as Filled, not saved, and Update or handover warns. Hypothesis: memory drafts are lost on the 04:00 refresh. Evidence: Risk / Not evidenced; the existing dirty-date guard (`tmAnyDirty`) is read in source.
3. **A second import after edits.** The chef sets sections and breaks on Thursday (not saved), then chooses the file again. Expected: a day with a draft is not empty, so it is not changed. Evidence: Risk / Not evidenced in all three.
