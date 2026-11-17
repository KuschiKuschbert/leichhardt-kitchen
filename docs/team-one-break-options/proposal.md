# Proposal: one break per person on Today's team, with an optional second

17 November 2026, Queensland. Source `main` at `628eb32`. Role-based analysis, not research with staff.

## The head chef's words

"On our roster/team today, can we just add a global break time, not having 3 different break times? But still have the option to add a second break time per staff member? In a smart way?"

Asked what "global" means, the head chef chose **one break per person**: each person gets one break for their whole day, not one per service, and a second break can be added for a person. Times are still set per person, with a smart default offered.

## The problem in the kitchen

Since 16 November the roster file cuts each roster time to each service's hours (the head chef's choice): a cook rostered 10:00 to 21:00 is saved as Lunch 10:00 to 15:00, All day 15:00 to 17:00 and Dinner 17:00 to 21:00. Today's team (the day on one clock, built 16 November) gives every service line its own **+ Break**, up to three breaks on each line. So:

- Mo (10:00 to 21:00) shows **three + Break buttons** and up to nine breaks. The whole sample day (9 people) shows **15 + Break buttons** (Implemented app, stand-in, `measured-baseline.txt`).
- To give Mo a break at 15:00 you must know to use the All day line: the Lunch line only offers times up to 14:30, the All day line 15:00 to 16:30. A break that crosses a service edge (14:45 to 15:15) cannot be set at all.
- Mo's long day used to start with a split (a day of 9 hours or more, `TM_LONG`). Cut into services, no one service is 9 hours long, so + Break on any line gives a 30 minute break and **the split default is lost**.
- Each service line is a separate place to look; a person's breaks read in one sentence on the bar but are set in up to three places. Mo's row is 369 px tall at 390 px (a phone shows about one and a half rows of him).

Who has it: the head chef planning the week on the laptop; the sous chefs, who since 14 November set the breaks on the day, usually on a phone. How often: every day with roster times, for every cook who works across two or three services (Gus, Dev, Sam and Mo in the sample day, which is close to a normal Leichhardt day).

## The change

1. **One break line per person**, under their day sentence and bar, not on each service line: "Break [13:30] [30 min]". Times run across their whole day (first start to last finish, inside their own hours only), so a 15:00 break or a 14:45 break needs no service.
2. **+ Second break** on the person's line adds one more. Two at most per person per day. Each break has the existing time and length pickers; "No break" in the time picker removes it.
3. **Smart defaults** (no new data, from the draft in memory):
   - the first break goes where it does least harm: inside their hours, outside any busy time where it would make Too few, and not at the same time as someone else on their service where possible; failing that, the middle of their day;
   - a day of 9 hours or more starts with its split (the 16 November rule, now over the whole day again), then + Second break offers a 30 minute meal break after it;
   - the default is shown, never saved by itself: it is a draft until Save, as now.
4. **Spread them** (the fold's tool) works on everyone on the day, not one service, and gives each person their one break.
5. **Storage does not change.** Each break is still saved as `{ id, sh, at, len }`; `sh` is worked out as the service whose hours (theirs) hold the break's start. Home, Your day, On break now, Next planned breaks, the Too few count and the saved overview keep reading it as they do. No rules change, no new field, no new read.
6. **Old saved days** with more than two breaks for one person still show every break and can each be changed or removed; + Second break shows only while a person has fewer than two.

Taken off a service: a break whose start falls in that service goes with it (as now), and Undo puts it back.

## Cost

- **Reads:** none new. **Listeners:** none. **Rules:** none. **Saved shape:** unchanged.
- **Files:** `js/prep.js` (the row, + Break handler, the break pickers' keys, Spread, the default), `css/app.css` (the person's break line), `docs/design-patterns.md`, `README.md`, `docs/head-chef-decisions.md`.
- **Tests:** about 10 test files use the per-service break keys (`tm-at:<id>:<sh>:<n>`, `tm-addbr` with `data-sh`): `team-hours`, `team-picker-context`, `team-quiet`, `team-row-service`, `team-selected-day`, `team-minimum`, `team-hidden-shifts`, `team-notebook`, `team-week`, `todays-team`. Rewritten for per-person keys.
- **Risk:** the `sh` worked out at a service edge; a break in the gap of a split day (Gus 08:00 to 15:00 and 17:00 to 21:00); old days with three breaks; held pickers after a redraw (the 15 Nov context checks).

## Measured today (Implemented app, stand-in, fallback fonts, admin session, `fixture.cjs`)

| Measure | 390 px | 1280 px |
| --- | ---: | ---: |
| + Break buttons on the page (9 people, 15 person-services) | 15 | 15 |
| Mo's + Break buttons | 3 (Lunch, All day, Dinner) | 3 |
| Mo's row height | 369 px | 213 px |
| Mo: one break at 15:00 (All day line, then the time) | 2 taps, if you pick the right line | 2 |
| Mo: break 13:00 and second break 18:30 | 4 taps, two lines | 4 |
| Mo after one + Break on the Lunch line | Break 12:15 to 12:45, 30 min (no split) | same |
| The day: 7 cooks, a section on every line and one break each, then Save | | 26 taps |
| Sideways scroll, browser errors | none | none |

Screenshots: `baseline-mo-390.png` (Mo with two breaks set, phone), `baseline-day-1280.png` (whole page).

## Design references to test

- **Linear:** one place for each job. A person's breaks set in one place, not three.
- **Todoist:** a known default, visible and editable; the extra field (a second break) shown when wanted.
- **Things 3:** the frequent action (one break) visible; the occasional one (second break) one tap away.
- **Flighty:** the default comes from what the page already knows (hours, busy times, who else is away); no new read.
- **Headspace:** plain words: "Break", "Second break", "Split".
- **Duolingo, Airbnb:** each tap says what it did ("Mo: break 15:00 to 15:30. Not saved yet."); the time, place and break together on one row.
