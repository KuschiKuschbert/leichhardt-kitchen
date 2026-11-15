# Proposal, widened: plan the day on a time line

16 November 2026, Queensland. The head chef widened the first proposal ([proposal.md](proposal.md): time order and Clear this day) before round 1 closed. Same source `main` at `9697fd8`. No code yet.

## The head chef's words

"We really need to rethink this workflow, now that I can import a CSV. It's super complicated to add someone to a shift and then set their breaks without seeing when they work on that day so maybe even have a bar in line from start time to end time? Mostly this workflow will be done on a computer but it needs to also be considered for phone and tablet sizes."

## What happens today (Implemented app, stand-in, `baseline-breaks-run.cjs`)

A day as the roster file leaves it: everyone on their service with their own roster hours, no sections, no breaks. Fixture: Gus (head chef) 08:00 to 15:00 and 17:00 to 21:00; Ari 10:00 to 15:00, Bea 11:00 to 15:00, Cal 10:00 to 14:30, Dev 12:00 to 15:00 on Lunch; Sam (sous) 16:00 to 21:30, Eli and Fen 17:00 to 21:00 on Dinner; Mo 10:00 to 21:00 on All day.

- **Where the hours are.** Each grid row has "Roster 12:00 to 15:00" in small words under the name. Breaks are set in a separate details panel (the "Breaks" link), which shows the service chips, the break pickers and Remove, but **not the person's hours**. At 1280 px the panel sits to the right of the grid; Dev's roster line was 448 px below the panel's top. At 390 px the panel opens under the row.
- **Break times offered.** The whole service's hours in 15 minute steps: Dev (rostered 12:00 to 15:00) is offered 10:00 to 15:00, 21 times, 8 of them before Dev starts.
- **Taps.** One cook, a section and one break: **4** (section picker, Breaks, + Break, break time), at 390 and 1280 px. The whole day, 7 cooks, a section and one break each, then Save: **29** at 1280 px.
- **Bars already exist, but only for the saved plan.** "Saved shift overview" (a fold after the planner, `tmTimelineHTML()`, design pattern "A saved day at a glance"): rows grouped by section, the hours and breaks in words, a bar for the day with the break in orange. Read-only, drawn from the saved record, using the service's hours, not the roster hours.
- **Spread them** (in the "Copy a day or spread breaks" fold) sets one service's breaks in one go from a start time, a length and how many at once.
- Screenshots: `baseline-breaks-390.png`, `baseline-breaks-1280.png` (full pages; the sticky service heads overlap a row in a full-page capture).

## The change proposed

1. **Each person's day as a bar, while planning.** One time scale across the page with hour marks, earliest start to latest finish of the day. Each person's row: name, then a bar from their start to their finish: the roster hours when the file gave them, else the service's hours. A person on two services has two bars on the same row (Gus: 08:00 to 15:00 and 17:00 to 21:00). The section for each service stays a picker on or beside its bar.
2. **Breaks on the bar.** Breaks are drawn on the bar where they fall, with their times in words. Adding a break offers only times inside that person's hours. Not decided: whether a tap on the bar places a break there. Drag is not proposed as the only way (wet hands, keyboard, Things 3's "no drag-only").
3. **Services in time order** everywhere on the planner (from the first proposal).
4. **Clear this day** for the admin (from the first proposal; the first reviewers leaned to taking the day back to "Not set" so the roster file can fill it again).
5. **The roster file starts the flow:** fill the week, then each day's bars, sections and breaks, then Save.
6. **Laptop first, tablet and phone must work.** Most planning is at a computer. On a phone a bar across the whole day is narrow (about 300 px for 08:00 to 22:00, about 21 px an hour): the phone may need its own shape (one service at a time, or the bar as a strip with the times in words).

## What this replaces or keeps (approved designs it touches)

- The **day grid** (head chef, 15 Nov 2026, `docs/team-sections-options/brief.md`): people down, services across, one Section picker per service. A bar per service would replace the "Off" cells and could replace the columns. Changing it is a proposed departure from a design chosen yesterday.
- The **details panel** for breaks (`tmFocusHTML()`), **Whole day review** (`tmWholeHTML()`) and the **Saved shift overview** (`tmTimelineHTML()`): one or more may become redundant.
- Kept: hidden shifts ("+ Smoker"), Often/Usually suggestions in the section picker, the "Too few" line in the Save bar and "break when too few" marks, the dated Save (`v` + 1), Copy last weekday, Fill from roster file, the staff Home and Your day.

## Cost

- **Reads:** none new. Drawn from the draft in memory (`tmf.on`, `tmf.br`, `tmf.hrs`) and `config/main.kitShifts`.
- **Rules:** none, unless Clear deletes a day (the admin may already delete `team/<day>`).
- **Files:** `js/prep.js` (Today's team planner), `css/app.css`, `docs/`, `README.md`. **Tests:** the team test files (`team-grid`, `team-person`, `team-hidden-shifts`, `team-minimum`, `todays-team`, `roster-import`, `roles`) check the grid and the panel and would change. Probably two or three pull requests.
- **Risk:** a large change to a page redesigned on 15 November: the head chef and sous chefs relearn it. Precise times on a narrow phone bar. Roster hours that run past a service's hours, or no roster hours at all.

## Design references to test

Flighty (real times on one line, now and next), Things 3 (frequent actions visible, no drag-only), Airbnb (the person's time, section, break and status together, without hunting), Todoist (quick to add, defaults visible: a break offered at a sensible time inside the hours, never guessed silently), Linear (one way to do each thing; the planner's actions in one place), Duolingo (each tap answers in words; draft is not Saved), Headspace (plain words for a new sous chef).
