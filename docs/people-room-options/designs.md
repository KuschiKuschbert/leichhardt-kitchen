<!-- Kept as given to the round 2 reviewers. -->
# Round 2 designs: the admin panel's Team › People page

19 November 2026, Queensland. Read with the round 1 evidence packet (`evidence-packet.md`, same folder): it holds today's page, its measurements, the contracts and the design references. Pictures are in `evidence/`. Every design was drawn over the real admin panel on the click tests' stand-in (the real header, rail, room heading and tabs, the book's own styles and fonts) with the same 15 made-up people. Only the People block was replaced. **These are previews**: nothing was tapped, saved or read; states are drawn, not exercised.

## Round 1 result

**Build smaller, 4 of 5** (cook, head chef, skeptic, keeper). The new starter said **Build**. What round 1 asked for:

- The cheap fixes first: one filter (the "Role: All" picker repeats the Everyone chip), the stray hint folded, Add a person above the list, long names shown in full.
- The phone is the real pain (375 px a person). The sous chef's Staff row (116 px, words) is the pattern to reuse; one name for each permission (today Write, Tick, Remove here but "add, tick, remove" on the sous page).
- A short line must show the **draft**, built from the person's real ticks, never from the role (Tom is Staff but can Remove).
- State in words, not only fade or colour: Off the list, "Not saved: Staff to Lead", "Deleted when you save".
- Reset PIN writes at once while the rest waits for Save: keep it apart and named; keep it one tap from the person once found (the cook).
- Do not hide Delete beside Stopped working here in one menu; never a second save step; Close must never read as Saved.
- Skeptic: at 1280 the tick table is the best scan (one column shows Tom can Remove).
- Keeper: keep the test hooks (`.a-name`, `a-remove-person`, `a-reset-pin`, `a-add-person`) on the controls that move; one click test that edits two people, deletes one, undoes, saves once and compares the save with today's.

## In all three designs (the cheap fixes)

Search names, one Everyone filter, and **Add a person** on one line at the top; "How roles and ticks work" and "Add several names" become two folds under it; the stray hint goes; names show in full; the four permissions are called **Add, Tick, Remove, Functions** everywhere; a person's state is said in words on their line (Off the list in grey, Not saved in the pending orange, Deleted when you save in red with Undo); the sticky Save bar names whose changes wait ("2 unsaved changes: Tom, Ann"). One draft and one Save as today. Reset PIN still writes at once.

## A. Tidy table (changes the least)

**Central idea:** keep every person an open form, as today, and fix what makes the form slow.
- Laptop: the same table, tighter: name box, role, four tick boxes headed Add, Tick, Remove, Functions, then Open page, Reset PIN, Stopped working here, Delete on one line. State words under the name.
- Phone and tablet: the same form as a tighter card: name box, role, the four ticks in one row with their words, then the links.
- Main task, Tom from Staff to Lead: find Tom, role select, Lead, Save changes.
- Pros: no new step, the tick table stays the laptop's scan, least test churn, least relearning.
- Cons: the phone still shows boxes for everything (263 px a person, no person on the first screen); every name box and tick is live, so a stray tap edits; Delete still sits beside Stopped working here on every row.
- Pictures: `a-390.png`, `a-768.png`, `a-1280.png`, `a-390-working.png`, `a-1280-working.png`.

## B. Rows that open in place (rethinks the flow)

**Central idea:** a list you read, with one person open to change at a time, on the same page.
- Every width: one row a person like the sous chef's Staff row: their initial (dark for chefs), the full name, "Sous chef · Add, Tick, Remove" built from the ticks, the state in words; on the right **Reset PIN** (or Put back when off the list) and **Change ▾**. On a phone the two buttons sit under the words.
- Change ▾ opens that person in place (one at a time, the button becomes Close ▴, the row turns the people sage with an edge): Role, "What Tom may do" with four labelled ticks (Add lines, Tick lines, Remove lines, Create and edit functions), then a small heading **Wait for Save** over Stopped working here and Delete for good (red), then Open Tom's page ›. Closing keeps the change in the draft; the row then says Not saved.
- Main task: Change ▾ on Tom, role select, Lead, Save changes.
- Pros: words first, a person in 119 px on a phone and 64 px on a laptop, nothing editable by accident, leaving and deleting sit under one plain heading away from the row, Reset PIN stays one tap from the row.
- Cons: one more tap for every change (open the row); the laptop loses the one-glance tick table (words per row instead); a pending change is only visible in words on a closed row.
- Pictures: `b-390.png`, `b-768.png`, `b-1280.png`, `b-390-open.png`, `b-1280-open.png`.

## C. Each person's page holds the changes (removes the most friction from reading)

**Central idea:** the list only reads, grouped by role; everything about one person, including the changes, is on their own page (the page Open page already shows today).
- The list: groups Chefs, Staff, Functions and view only, Off the list, each with its count; one row a person in the chef panel's row-that-opens style (`c-tool`: name, "Open ›", the role and ticks in words, state in words), three columns on a laptop.
- The person page: ‹ All people, the name, "Lead. Can: Add, Tick, Remove.", Not saved in words, then blocks **Role and what Tom may do** (role and four labelled ticks), **PIN** ("Resets at once"), **Leaving** ("Waits for Save": Stopped working here, Delete for good), then their last 14 days as today. The Save bar works on the page, in the same draft.
- Main task: Open › on Tom, role select, Lead, Save changes (then ‹ All people to go back).
- Pros: the shortest list (57 px a person, 4 people on a laptop's first screen, the whole team in 1,362 px), grouped so a chef or a functions person stands out, each person's rights, PIN, leaving and activity in one place.
- Cons: a page change for every edit and back again; Reset PIN is 3 taps; comparing two people's ticks needs two pages; groups move a person when their role changes in the draft.
- Pictures: `c-390.png`, `c-768.png`, `c-1280.png`, `c-390-working.png`, `c-1280-working.png`, `c-390-page.png`, `c-1280-page.png`.

## How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | table / form cards | one list of rows | grouped rows, columns on a laptop |
| Disclosure | everything open | one person open in place | a page per person |
| Where you change | in the row | in the opened row | on the person page |
| Order | as added (sortable) | as added (sortable) | by role group |
| Reset PIN | on the row | on the row | on the person page |

## Measurements (Preview, stand-in, 15 people, Chrome, the book's fonts; the room heading above is the same real shell in all)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| One person, 390 px | 375 px | 263 px | 119 px | 57 px |
| One person, 1280 px | 111 px | 61 px | 64 px | 57 px |
| People fully on the first screen, 390 / 768 / 1280 | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 3 / 3 | 2 / 4 / 4 |
| Page height, 390 / 768 / 1280 | 6,761 / 6,139 / 2,954 | 4,808 / 4,187 / 1,901 | 2,570 / 1,757 / 1,702 | 1,840 / 1,474 / 1,362 |
| First person starts at, 390 / 1280 | 831 / 914 px | 754 / 854 px | 614 / 649 px | 662 / 696 px |
| Sideways scroll | none | none | none | none |

The shared room heading (Team, its line, People and Today's team tabs) takes about 450 px at 1280 and 600 px at 390 before any design starts; no design changes it.

## Taps for the main jobs (scrolling and typing not counted)

| Job | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Add a new starter | 2 | 2 (button at the top) | 2 | 2 |
| Change one person's role | 3 | 3 | 4 | 4 (+1 back) |
| Change one tick | 2 | 2 | 3 | 3 (+1 back) |
| Someone left | 3 | 3 | 4 | 4 |
| Delete for good | 3 | 3 | 4 | 4 |
| Reset a PIN | 2 | 2 | 2 | 3 |
| See one person's page | 1 | 1 | 2 | 1 |
| Read who may do what | a table of ticks below the first screen | the same, nearer the top | words on each row | words on each row, grouped |

## Not evidenced in any design

Rendered contrast (the orange Not saved and red Deleted on paper and on the sage open row; light and dark), keyboard focus, reduced motion, the real Saving / Saved / failed states, the line about another phone saving, Keep these changes / Undo them for a sous chef's requested changes, the head chef's own row (shown, ticks fixed, no Delete), a new unsaved row, 44 px for the text links (Reset PIN, Stopped working here, Delete are `.p-x` links as today). All need the implemented app at 390, 768 and 1280.
