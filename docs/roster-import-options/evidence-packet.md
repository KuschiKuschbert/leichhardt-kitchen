# Round 1 evidence packet: fill Today's team from the Humanforce roster

14 November 2026, Queensland. Source commit: `main` at 5d92379. Role-based analysis, not research with staff. Pictures are the real book on the click tests' stand-in (`tests/fake/`) with made-up people (Sam, Ann, Bo, Cal, Dev, Eli, Fran, Gus, Hana, Ivo) and the proposed shifts (Lunch 10:00 to 15:00, All day dining 15:00 to 17:00, Dinner 17:00 to 22:00). Fonts are the test fallback. Signed in as Sam, a sous chef. No saved plan for the day.

Read in full: [proposal.md](proposal.md), this packet, and `.claude/skills/service-council/SKILL.md` sections **The service rules**, **Current design contracts**, **Design references** and **Try to break it**.

## Screenshots (Implemented app, stand-in, 14 Nov 2026)

- `docs/roster-import-options/baseline-390.png`: Today's team at 390 x 844, as it opens.
- `docs/roster-import-options/baseline-390-whos-working.png`: full page at 390 after tapping Add staff (Who's working?: services, people, Add selected staff). The full-page capture shows the fixed Save band and tab bar part way down; on the phone they sit at the bottom of the screen.
- `docs/roster-import-options/baseline-1280.png`: the same page at 1280 x 900.

## Measurements

| Measure | Value | How |
| --- | --- | --- |
| Taps to enter a 47-shift week by hand | about 130 | Counted from the stand-in controls for the synthetic week (date picker 2 per day; per service group Add staff 1, one tick per person, service ticks from preselected Lunch, Add 1; Save 1 per day). Not timed. |
| Taps per day | 13 to 24 | Same count. Days with mixed services cost most. |
| Service groups per day | 1 to 4 | Most people work all three services; one or two do Dinner only, Lunch only or Lunch and All day dining. |
| Page height at 390 | 1488 px with Who's working? open | Stand-in, empty plan. |
| Partial overlaps in the week | `11:00-15:30` 30 of 120 min of All day dining; `10:00-16:00` and `16:00-21:30` 60 of 120 | Converter dry run on the real export (private), matched to the synthetic shift hours. |

## Current contracts (excerpts)

**Today's team record** (`js/prep.js`, Today's team header): head and sous chefs (and the head chef's admin device) put the people working on the kitchen's shifts (`config/main.kitShifts { id, name, from, to, off }`, set in Admin, Kitchen, Shifts), with a section on each shift and their breaks: `team/<day> { day, on: [{ id, sh, sec }], br: [{ id, sh, at, len }], v, at, upd, by }`. `v` counts saves; the rules refuse a save that is not the next one. Today's record "says who works when, so it is never kept in the phone's own storage." Rules (`teamOk`) allow only those keys, at most 120 `on` and 120 `br`, sequential `v`.

**Week planning, chosen A** (`docs/team-week-options/brief.md`, Shared implementation contract): planner state keyed by date; each date keeps its own draft and saved version in memory. "Show the full selected date beside the editor, on Save and in its acknowledgement. A Save changes only that date; no silent autosave or ambiguous Save week." Past dates read-only. One bounded week query (up to 7 reads, 1 when empty), memory only, no listener. "Do not create a second roster, availability system, recurring template, notification system or publish workflow." Same as last weekday copies into an empty draft; nothing saved until Save.

**Team page, chosen C** (`docs/team-page-options/implementation.md`, Changed contract): one selected-day roster; each person a Service to edit and Section pair. Adding or removing a service is an explicit named draft action. Keep usual-section defaults. "Retain Add staff for every eligible person, deliberate multi-service group selection, unfinished selections protected with their date..." "No new data source, listener, poll, saved field, schema, role, rule, read loop, persistent private cache or application dependency." (That line was the contract for the C layout change; a new data source here is a proposed change for the head chef, not an accident.)

**Who's working? quick add** (`docs/code-contracts.md`, Today's team roster notebook): staff checkboxes and configured-service checkboxes; Add selected staff adds only checked people on checked services to the selected date's draft, without overwriting existing sections, breaks or other memberships. New memberships reuse `tmAddShift()`: an available usual section, then a valid other-service section, then none. "All are reviewable draft suggestions."

**After the tap** (`docs/team-week-options/brief.md`): assign changes the draft in place with Unsaved wording; Save a date says Saving, date controls disable, Saved and a dated message after server acknowledgement; refusal keeps the dated draft. Refresh confirms discarding a dirty day.

**Staff list** (`js/prep.js`, Manage staff; `firestore.rules`): "Add a person or remove one, then save. New people start as Staff. Roles and PINs are looked after by the head chef." A sous chef may change the people list and `staffIds`. A new person may set their first PIN within 7 days. Manage staff sits in the chef panel's Team area. Staff names live only in Firestore, never in the public repo.

**Never in the repo:** prices, GP, supplier codes, staff names, PINs. Wage costs from the roster are pay data and fall under the same rule: never saved, shown or sent.

**Coding rules (short):** every write through `W()`; anything typed or read from a file goes through `esc()`; never guess a match: "No match, or more than one: show a card that says so"; "A Save with nothing to save is off"; an answer from the cache is not "nothing there".

**Colour and state** (`docs/surface-colours.md`, Selected design; `docs/colour-coding.md`, Shared meanings): Team and people blocks use sage (`--surface-people: #EAF5EE`, edge `#8AA391`); current live boards charcoal; forms and reading quiet paper. "A sage people book never means that the whole plan is Saved." "Assigned in a Team draft does not mean Saved." Amber or orange is attention or pending with words; green confirms the stated success; red is failure with words that stay. Roster timeline segments keep their own meaning.

**Action feedback** (`docs/action-feedback.md`, The rule): answer in the tap's own frame; confirm where the eye is, in words that name the thing; Save uses Saving, Saved with a tick after the write resolves, Try again in red that stays; a failure keeps the work; a tap that cannot act says why.

## The roster file (facts, no real data)

Humanforce Weekly Department Roster Report, CSV export. Line 1 is column names only (`titleTextBox`, `textBox61` and so on). Each later line is one person: report title, Locations, Departments, the date range, the location and department, seven day labels (`Mon 16/11/2026` to `Sun 22/11/2026`), daily hours and daily cost totals, then the person's full name, weekly hours, weekly cost, then four cells for each shift they work (cost, a blank cell, `HH:MM-HH:MM`, award role). Days off have no cells, so rows have different lengths. The day of each group is only in its column name in line 1 (seven fixed names, Monday to Sunday), and line 1 lists every row's names one after another. CRLF line ends, ASCII, quoted money values with commas. Not known yet: how a split shift in one day appears, how a multi-location report looks, how the export changes between Humanforce versions.
