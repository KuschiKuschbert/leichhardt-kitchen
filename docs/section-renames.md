# Renamed kitchen sections keep their history

Asked by the owner, 13 November 2026: "I might rename sections." Before this, a section renamed in Admin, Kitchen, Kitchen sections kept its id, so Today's team, own picks, cleaning and section minimums followed it. Prep lines, wastage, the reports and the learned usual section did not. They save the section as a name, so a rename split each of them in two: "Pans" for the old lines, "Saute" for the new. The admin hint said "Renaming a section keeps its history", which was only true for the records kept by id.

## What the book does now

- **The old name is kept.** When the owner's Save changes a section's name, `ksClean()` keeps the name it had in `config/main.kitSecs[].was`: newest first, at most 6, never the name it has now. Renaming back takes the name off the list. The sous chefs' saves never send `kitSecs`, as before.
- **The book reads an old name as the name now.** `secNow(name)` in `js/prep.js` gives the section's name now for any name a line was written under; `lineSec(x)` does it for a line's `station`, `alsoNow(x)` for its `also` list. Stored lines are never rewritten: the fold happens where the book groups, filters, counts or shows a section.
- **Never a guess.** An old name that a section has now (a removed one too), or that two sections once had, is left as written. With no renames `secNow()` gives every name back unchanged, so nothing else moves.
- **New lines get the new name.** A section typed under an old name is written under the new one: the box says "Pans is now called Saute" with Undo (Undo keeps the old name, as it keeps a typed spelling). A rolled-over line carries the name now. Suggestions offer the new name once.

## Where the fold applies

| Part | How |
| --- | --- |
| Prep list: tabs, Also, the section done card, Home's Prep by section, Move to section, wastage's day line and row | `lineSec()` and `alsoNow()` |
| Section box, suggestions, a line's learned usual section (`bestSection()` adds old and new counts), wastage suggestions and Filled for you (`wLast()`, `wOften()`, `wLastAll()`), the Records page's wastage lines | `secNow()`, `lineSec()` |
| Prep Insights, its filters, heat map, time to tick and CSV; wastage history, its filter and CSV; the history search (finds both names) | `lineSec()` |
| Reports, Team, a person's page, Who has worked where, At a glance and the planner's cross-training line | `lineSec()` and `secNow()` on the nightly `teamsum` names |
| Admin On today and today's section picks | `ksSecNow()`: by the pick's section id, else its name |
| Section minimums matching today's lines | `psOpenWork()`, `psSectionId()` |
| Dashboard and its watch list (`js/admin-dashboard.js?v=5`) | `api.secNow` folds the nightly record's section counts and minutes as they are read |
| Insights section filter (`js/admin-intelligence.js?v=8`) | `api.secNow` folds the section list and each day's entries before `aggregate()` |

The nightly jobs are unchanged. They keep writing the names lines were written under, and the book folds them when it reads them. So no job's code fingerprint changes, and there is no extra full analysis re-read. An older cached Dashboard or Insights module gets no `secNow` and shows names as written.

## Admin

The Kitchen sections row now says: "To rename a section, change its name in its box: its old lines and counts then go under the new name." Under the boxes, once saved: "Old names: Pans is now Saute. Lines written under an old name count under the new one." Only names that really move are listed. Removing a section and adding a new one is not a rename: the new one starts apart. Who has worked where's "Not counted" line now ends "Rename a section in its box to keep its count."

## Reads, writes and rules

No new read or listener: the config is already loaded. The only new stored field is `was` inside `kitSecs` entries, written by the owner's existing Save. `firestore.rules` has no check on `kitSecs` entries, so no rules change or publication. Full-document backups and the kitchen-PIN copy carry it. Old code ignores `was`: after a revert, old lines show under their old names again, as before.

## Council quick check (small change: no new tab, button, pop-up or step)

Self-review by the session, not five reviewers. Round 1: needed, because the owner may rename sections and the admin hint promised history that most of the book did not keep. Taps: unchanged (renaming is still typing in the box and Save). Lines on a 390 px phone: the prep list and wastage unchanged; the Kitchen sections row gains one hint line only after a rename. Reference fit: Linear (one name for one thing: a section has one name everywhere), Headspace (the box says plainly what it did). Contract fit: existing hint and toast patterns, no new colour, class or control.

Break-it findings:

| Scenario | Evidence | Disposition |
| --- | --- | --- |
| An old name reused by a new section, or shared by two sections | Checked in `tests/section-renames.test.js` (Wok was Pass and Larder) | Left as written, never guessed |
| A rename on another phone while a report is open | Risk | The fold follows the config listener; the Dashboard and Insights fold when they read, so their open copy updates on Refresh |
| An old name that differs only in letter case | Risk, low | The fold ignores case; a case-only rename keeps no old name, so "pans" and "Pans" lines stay apart as before |
| Typing a section and moving straight to the item box | Checked: the same in the old typo note | The test waits for the box's note before typing on; not a change in behaviour |

Not done (owner's call if wanted): a way to forget one old name; moving the nightly jobs to section ids (the B option in the audit, 13 Nov 2026).

## Verification

`tests/section-renames.test.js`: 25 checks across the prep list, wastage, the Team report, a person's page, the admin row and Save, and the Dashboard. 17 of 25 fail on the old code. Existing kitchen sections, section box, Team, At a glance, person page, Today's team, Dashboard, Insights, mascot, double-up, rollover, Home, section minimums, safe text and read budget tests pass.

## Rollback

Revert the pull request. `was` stays in the config and is ignored; nothing else was stored differently except new lines written under the new name, which is the name the owner chose.
