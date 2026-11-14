# Fill Today's team from the Humanforce roster: proposal

14 November 2026, Queensland. Round 1 proposal for the service council. No code. Role-based analysis, not research with staff.

## The problem in the kitchen

The kitchen's payroll roster lives in Humanforce (Australian Venue Co's rostering system). The head chef or a sous chef then types the same week into Today's team by hand: who works which service each day, before sections and breaks can be set. Staff Home, the break board, the top chip and section defaults all depend on that plan.

- **Who:** the head chef and the sous chefs (`teamOK()`: head, sous and the head chef's admin device). Staff only read the result.
- **How often:** once a week when the roster is published, again when it changes, and on any day nobody entered.
- **Cost today:** a synthetic week shaped exactly like a real Leichhardt food roster (9 people, 47 shifts, 7 days) takes about **130 taps** to enter with Who's working? (counted from the stand-in's controls: date picker 2, then per group of people with the same services: Add staff 1, one tick per person, service ticks from the preselected Lunch, Add 1, then Save 1 per day). Sections and breaks come after and are not counted; they are the same with or without this change.
- **What people do today:** type it in, or skip it. A skipped day means staff Home has no team, no coworkers and no break board.

## The change

On the Today's team planner (direct `#/team` and the chef panel's Team), a chef chooses the roster file exported from Humanforce. The phone reads the file itself. It shows what it found, then fills the week's dated drafts. Nothing saves by itself: the chef reviews and saves as today.

The roster file is Humanforce's **Weekly Department Roster Report** exported as CSV. One week, Monday to Sunday, one location and department in its header, one row per person with each worked shift as `HH:MM-HH:MM`. Facts checked on a real export (kept private, not in the repo):

- The day of each shift is not written beside it. It is carried only by the report's internal column names in the first line, which also concatenates every row's own column names. Decoding them matched all 47 shifts of the same week's Excel export exactly.
- The CSV also carries **wage costs** (each shift, each day, each person's week) and each person's award role and weekly hours. The Excel export of the same report does not carry costs.
- No break times. Hours do not follow one break rule that can be read from one week.

## Head chef decisions already made (14 November 2026)

1. **Use the book's shift times**, set in Admin, Kitchen, Shifts: Lunch until 15:00, All day dining 15:00 to 17:00, Dinner from 17:00. Each roster shift goes on every book shift it covers (`10:00-21:30` is Lunch, All day dining and Dinner; `17:00-22:00` is Dinner).
2. **A roster person not in the book:** ask to add them, under their **given name**, not the family name.
3. **Two people with the same given name:** add the first letter of the family name ("Sam K").
4. **Ignore roles, hours and costs.** Costs are dropped on the phone while reading and never saved, shown or sent.
5. **Nothing saves by itself.** The chef reviews and presses Save.
6. Use the CSV, not the Excel file. Later, the same converter takes the Humanforce API's roster answer when Australian Venue Co IT issues a read-only key (requested, not granted).

## Cost

- **Reads:** none to read the file. Existing bounded week read for the planner. Existing staff list already loaded.
- **Writes:** existing dated `team/<day>` saves (up to 7 for a week) and, when a new person is added, the existing people-list save. No new collection or field is needed for the basic flow. Remembering a pairing between a roster name and a different book name ("Daniel K..." to an existing nickname) would need a new stored field and a rules change.
- **Files:** one new lazy file for the reader and converter, loaded only when a chef opens the import. No outside library (CSV is plain text).
- **Tests:** a synthetic CSV fixture in the same shape (made-up names, made-up costs to prove they are dropped), converter tests, a planner click path, safe text for names from the file.
- **Risk:** the report format can change without notice; the file holds pay data; names in the file are full names; a wrong import could put the wrong people on a shift on every staff phone once saved.

## Questions the designs must answer

- Where the entry lives (planner toolbar, Copy a day disclosure, chef panel, admin).
- Partial overlaps: `11:00-15:30` covers 30 of All day dining's 120 minutes; `16:00-21:30` covers 60. Any overlap, or a threshold?
- A day that already has a saved or draft plan: fill only empty days, merge, or replace with a named review?
- Seven dirty dates after one import: seven dated Saves (current contract: no ambiguous Save week), or a reviewed Save for the week?
- Name matching without a stored pairing (rule: given name, or given name plus family initial on duplicates) versus a remembered pairing (new field, rules change).
- Past days in the roster week are read-only in the planner today.

## Design references to test

Todoist (quick entry with known defaults visible and editable, never guess from ambiguous text), Airbnb (who, day, service and status together on review), Things 3 (this week's plan distinct from today's live board), Duolingo (honest feedback: filled is not Saved), Headspace (plain words a new chef understands), Linear (one consistent place for planner actions). Flighty: real times only if shown from the file, never stale status presented as live.
