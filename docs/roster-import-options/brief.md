# Fill Today's team from the Humanforce roster

14 November 2026, Queensland. Head chef request: fill Today's team from the Humanforce Weekly Department Roster Report (CSV export) while a read-only Humanforce API key is requested from Australian Venue Co IT. [Proposal](proposal.md), [evidence packet](evidence-packet.md). Role-based analysis, not research with staff.

**Status: council done. Recommendation below, waiting on the head chef's choice. Nothing built.**

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

## Round 2 scores

Six fresh agents (the five council roles and the kitchen screen designer) scored A, B and C out of 10 from the brief, the packet and the preview screenshots. All six said the designs differ structurally.

| Reviewer | A | B | C | Recommends |
| --- | --- | --- | --- | --- |
| Cook mid-service | 7 | 6 | 4 | A, with "Breaks not set" on each day |
| Head chef | 7 | 5 | 4 | A + B's unmatched-first order + C's day-row jump; measure the change rate before going further |
| Skeptic | 6 | 4 | 5 | A, built only after the week-to-week change is measured; a two-way A + C rows mix might beat it |
| New starter | 7 | 5 | 6 | A with C's rows as the way to choose each day |
| Keeper of the book | 7 | 6 | 4 | A, reusing the week list's status words and reading the file's week first |
| Kitchen screen designer | 7 | 5 | 4 | A + C's tap-a-day jump, no Save on the row |
| **Total** | **41** | **31** | **27** | |

**Agreed weaknesses.** A: the day list could not be tapped; the fold sits far below the date picker in the real page. B: the review is a rubber stamp (days come ticked) and the chef checks each day twice; the Fill tick shares a row with the fold header. C: row Saves publish days nobody opened, two Saves show at once, Save sits 8 px from Open, Open is read only, and `teamSave` has one save slot, so row Saves need a second save path.

**Faults found in all three (fixed in the combined preview):**
- The unmatched card said "pair them, then choose the file again". Pairing does not exist, and a second import only fills empty days, so it led nowhere.
- A and B kept "Filled 5 days, not saved" and the orange edge after every day was saved (`filled()` ignored saved).
- "Does not check out" is an idiom a new starter may not know.
- White on `--accent` measured 3.54:1 by token calculation (16 px bold needs 4.5:1). The book's dark Save (`.btn.dark`, `--accent-ink`) is 5.05:1. Round action buttons broke `--r-act` (8 px rectangles do something).
- The "Sam K" rule depended on who was in that week's file. Match the book's names instead: the given name, or the given name plus the family initial, exactly one.
- Next week's file needs that week read from the server before filling (up to 7 reads, one bounded query).

**Value is still open.** Breaks are not in the file. Spread them adds about 45 to 60 taps a week (estimate, not counted), so the import can cost more than Copy last weekday (about 25 plus edits, breaks included) unless the roster changes a lot from week to week. Not measured yet: no second week's file.

## Mix of A, B and C

| Source and part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- |
| A: fill into the existing dated drafts, one Save band | Take | Linear | Save stays where it is; uses `tmPlan`, `teamSave`, `svButton` | Day switching | All six reviewers |
| A: result card with counts | Take, fixed | Duolingo | Says what was filled and what was not | Must update when days are saved | New starter, Skeptic |
| B: review step with Fill ticks | Reject | Todoist, Linear | None over the worksheet | A second review; rubber stamp | Five of six |
| B: unmatched names first, with their days and roster times | Take | Todoist, Airbnb | The chef sees who is missing before checking days | Pushes the day chips down | Head chef, New starter |
| C: Save on each row | Reject | Linear, Duolingo | Fewer taps | Saves unseen days; second save path | All six |
| C: tap a day to open that date | Take | Airbnb | Replaces the date picker trip | Scrolling back to the chips | Five of six |
| Cook: "Breaks not set" | Take | Flighty | Nobody saves a day and thinks breaks are done | One line | Cook |

**All three blended** loses: B's review-first sequence is the opposite of A's and C's fill-first, and C's row Saves duplicate the band. The two-way blend, A plus C's day jump plus B's unmatched-first order, keeps one sequence and one Save.

## Combined preview

[mix.html](mix.html), lead synthesis of the reviewers' suggestions. The page follows the real Today's team order at 390 px (date picker, break board, Add staff, the day's rows, Whole day review, then the folds). Today is Friday 13 November and the file is next week, so the preview shows "Checking 16 to 22 November..." first. Book status words (Draft, Saved), the book's `.btn` and `.btn.dark` Save, round day chips for choosing a day.

**Preview** measurements (390 x 844, made-up data, file picker assumed 2 taps), scripted 14 November 2026:

| Measure | Combined | A |
| --- | --- | --- |
| Taps to fill and save the empty days | **16 for 6 days** (2 a day + 4) | 19 for 5 days (3 a day + 4) |
| Scrolling back to the day chips after each Save | 232 px the first time, then 1,191 to 1,511 px | Not measured (date picker at the top) |
| Date picker instead of chips | 22 taps for 6 days, little scrolling | n/a |
| Day chips visible at the top of the result | 2 of 7 (the unmatched card comes first) | 7 day rows (not tappable) |
| Page height after reading | 2,630 px | 2,154 px (schematic) |

After the follow-up (below) the preview's matcher and Save band were corrected and remeasured: 16 taps for 6 days; scrolling back to the chips 275 px the first time, then 1,234 to 1,553 px; no chips show at the top of the result because the two cards come first; page height 2,672 px.

### Focused follow-up on the combined preview

Review status: lead synthesis, then a focused follow-up from the four reviewers whose findings it answers. **All four prefer it to plain A**, with conditions.

| Reviewer | Verdict on the mix | Condition or remaining issue |
| --- | --- | --- |
| New starter | Better than A | Say how many days are still drafts after a Save (fixed in the preview); the import still sits in the bottom fold; a chip can say Saved with no breaks; no chip state for a failed Save |
| Kitchen screen designer | Better than A; contrast and corners fixed (5.05:1 computed, not rendered) | The chips are a second date picker. Move between days with the week list and keep the chips as status only. Two orange-edged cards compete |
| Keeper of the book | Better than A, on one condition | Chips must call the existing day selection (`tmPlanSelect`) and use the week list's words, including Checking and Retry; otherwise drop them and use the date picker |
| Skeptic | Better than A once the naming rule is back | The matcher had dropped the head chef's rule 3 (reproduced, now fixed in the preview); Manage staff can invite a nickname duplicate; still not shown to beat Copy last weekday |

**Disagreement.** The screen designer would move between days only with the existing week list (22 taps, little scrolling) and keep the chips as a status line. The New starter, Keeper and Skeptic accept the chips as a jump if they reuse the planner's own selection and words.

### Break-it findings from the follow-up

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| Two roster Sams land on the book's one "Sam" | **Reproduced** in the preview's matcher (node, made-up names) | Fixed in the preview: rule 3 restored and no two roster rows may land on one book person; checked in node with a one-Sam book. The converter needs the same test |
| Unsaved roster drafts hold the 04:00 refresh on a shared tablet for days (`tmAnyDirty` counts every date) | Risk / Not evidenced, read in source | Carry into the build: a fake-clock test past two 04:00s; a rule for old drafts may need the head chef |
| The shared idle lock or a refused week read leaves chips saying Draft | Risk / Not evidenced | Chips use the week list's Checking and Retry; click test for lock, unlock, chip and Save |
| The Manage staff detour loses the drafts or adds a nickname twice | Risk / Not evidenced (the preview button does nothing) | The card names the book name it looks for (in the preview); click test import, Manage staff, Back |
| Days saved without breaks show no break board | Risk / Not evidenced | Check Home and the break board on the stand-in for a day saved with no breaks |

## Recommendation

**Recommend the combined design: A's fill into the dated drafts and one Save band, plus C's tap-a-day chips, plus B's unmatched-first card**, with the fixes above: the head chef's naming rule against the book's names with no double landing, chips that call the planner's own day selection and words (Draft, Saved, Checking, Retry), "N days still drafts" after a Save, "Breaks are not set", and the exact name each unmatched person is looked for under.

It beats A because one tap takes the chef to the day's real rows with roster times, and the card says what is left; it beats B and C because it keeps one review (the worksheet) and one dated Save. Relevant principles: Airbnb (who, when and status together), Duolingo (Draft is never Saved, in words), Todoist (never guess a name).

**Main downside.** Breaks are still set by hand, and scrolling back to the chips after each Save costs about 1,200 to 1,550 px (Preview). Against Copy last weekday, which brings breaks, it may not save time unless the roster changes a lot week to week, which is still not measured.

**Build order.** 1: the reader and converter alone, with node tests (no screen change). Use it privately on two real weeks to measure the week-to-week change; stop if the weeks mostly match. 2: the fill, card and chips in Today's team, with the click tests above and a complete-app measurement at 390, 768 and 1280 px.

**Open for the head chef.** Choose the combined design, plain A, or stop. Whether the import may run on the shared tablet (the downloaded file keeps its wages). The file as a new data source is a change to the Team page C contract ("no new data source") and needs the head chef's OK. Chips as a jump or as status only.
