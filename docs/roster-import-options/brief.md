# Fill Today's team from the Humanforce roster

14 November 2026, Queensland. Head chef request: fill Today's team from the Humanforce Weekly Department Roster Report (CSV export) while a read-only Humanforce API key is requested from Australian Venue Co IT. [Proposal](proposal.md), [evidence packet](evidence-packet.md). Role-based analysis, not research with staff.

**Status: round 1 done. Waiting on the head chef's answers before round 2.**

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
