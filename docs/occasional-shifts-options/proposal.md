# Proposal: keep an occasional shift like Smoker out of Today's team until someone is on it

15 November 2026, Queensland. Round 1 of the service council. Role-based analysis, not research with staff. Source: `main` at `da18bf7`.

## The request

Head chef: "can we have the option to hide some shifts like smoker in the todays team admin part if needed and then add them when needed?"

Asked whether the existing Remove / Put back in Admin, Kitchen, Shifts was enough, the head chef said: "I would like to have the option to still have the shift in the whole system, but unless I put someone on smoker it is hidden." Asked where Smoker gets in the way, the head chef chose only **Today's team clutter** (the Smoker tick box under Add staff and the Smoker chip in a person's details). Not the roster file, not Home.

## Who has it, how often

The head chef (admin panel, Team room, Today's team) and the sous chefs (`#/team`, the same page) every time they plan a day. How many days Smoker runs: **Not evidenced** (the real plans are private and were not read).

## What the book does today (Implemented app, click-test stand-in, `main` at `da18bf7`)

Synthetic kitchen: Lunch 10:00 to 15:00, Dinner 16:00 to 22:00, Smoker 06:00 to 11:00. Eight people, six on Lunch and Dinner, nobody on Smoker. Fallback fonts.

| Place | With Smoker configured, nobody on it | Source |
| --- | --- | --- |
| The day grid's columns | No Smoker column. A service nobody on the day's draft works has no column (built 15 Nov 2026). | `tmGridShifts()` in `js/prep.js` |
| Home, On today board | No Smoker column (columns come from the saved plan's rows). | `homeRotaHTML()` |
| Add staff, Who's working?, "Services for this group" | One more tick box: Lunch, Dinner, **Smoker**. At 390 px the fieldset is **116 px with Smoker, 68 px without** (+48 px, one more row). No difference at 1280 px. | `tmQuickHTML()`, `baseline-addstaff-390.png` |
| A person's break details, service chips | **Lunch, Dinner, Smoker (off)**. One 44 px chip row either way at 390 and 1280 px with three services. More services wrap to more rows. | `tmFocusHTML()`, `baseline-details-390.png`, `baseline-details-1280.png` |
| Saved shift overview (timeline fold) | The time axis spans every configured shift with times, so a 06:00 Smoker starts the axis at 06:00 when nobody is on it. | `tmTimelineHTML()` (checked in source only) |
| Admin, Kitchen, Shifts | Each shift has **Remove**. For a saved shift it marks it `off` and the row says **Put back**; Save changes puts it live. An off shift is gone everywhere (`kitShifts()` filters it): Today's team, Home, staff Your day, the roster fill, Copy last weekday. A saved plan's entries on it stay in the record but are no longer shown. Admin only. | `shAdminHTML()`, `shAdminClick()`, `baseline-admin-shifts-1280.png` |
| Roster file import (admin only) | Fills every configured shift with both times that a roster time overlaps. | `services()` in `js/roster-import.js` |

**Taps today to put Ann (already on Lunch and Dinner) on Smoker with a section, 390 px:** Breaks (1), Smoker (off) chip (2), Add Smoker (3), then the new Smoker cell's picker: open (4), choose (5). **5 taps.** Through Add staff for someone not yet on the day: Add staff, untick Lunch, tick Smoker, tick the person, Add selected staff, then open and choose the section: **7 taps.**

## The change (open; the council judges whether and how much)

A configured shift stays set up in the whole book, but Today's team leaves it out of its choices until someone on that day's draft is on it, with a way to bring it in when it is needed. Candidate shapes, no choice made:

1. **A per-shift setting** in Admin, Kitchen, Shifts: "Show on Today's team: always" or "only when someone is on it". A hidden shift is left out of Add staff's service boxes and the details chips unless someone on that day's draft works it. One "More services" link (or "+ Smoker") in each place brings it in for that day.
2. **No setting:** Today's team shows the services someone on the draft works plus Lunch and Dinner (or the services used in recent plans), and puts the rest behind one "More services" link in both places.
3. **A Hide / Show control on Today's team itself**, kitchen-wide. Only the admin can write `config/main`, so a sous chef could not use it; a per-day hide would need a new field on `team/<day>` and a rules change.
4. **Rename only:** Remove becomes Hide and Put back becomes Show in Admin, Kitchen, Shifts. This keeps the current behaviour, which hides the shift from the whole book, so it does not meet the request.

## Cost

- **Reads, listeners:** none new in any shape.
- **Saved data and rules:** shape 1 adds one true/false to each `config/main.kitShifts` entry, written only by the verified admin with Save changes; the rules already allow the admin to change `config/main`, so **no rules change**. Old code ignores the field. Shape 2 adds nothing. Shape 3 kitchen-wide needs the same field; per-day needs a field on `team/<day>` and a rules change (`teamOk` lists the allowed keys).
- **Files:** `js/prep.js` (Today's team choices, Kitchen Shifts row), `css/app.css` if a new link or row style is needed, tests (`tests/team-quick-add.test.js`, `tests/team-shift-tabs.test.js` or a new file), `docs/prep-book.md`, `docs/design-patterns.md`, `README.md`, this brief.
- **Risk:** see the break-it list below.

## Risks the council should test

- A hidden shift that already has people on it in the draft or saved plan must always show. Data must never be hidden.
- Roster import and Copy last weekday may put someone on a hidden shift. Then someone is on it, so it shows. Is that what the head chef wants, or a surprise?
- Staff Home, Your day and the On today board already show only shifts someone is on; they should not change.
- A sous chef cannot change the setting (config is admin only). A sous chef must still be able to bring Smoker in for a day.
- Today, the details chips are the main way to add an existing person to a service. If Smoker is hidden there, the way in must stay obvious and not cost more than today's 5 taps.
- The words "(off)", "Remove" and "Put back" already mean different things on this page and in Kitchen settings.

## Relevant design references

- **Things 3:** occasional details tucked away while frequent actions stay visible.
- **Todoist:** the usual choices easy to find, extra ones shown when needed, nothing guessed.
- **Linear:** one name and one place for each control; no second way to do the same thing without reason.
- **Headspace:** plain words for a new starter: "Hide" or "Only when someone is on it" against "Remove" and "(off)".
- Airbnb, Flighty, Duolingo: little bearing; a hidden service has no time or status to show.

## Screenshots (this folder)

- `baseline-addstaff-390.png`: Add staff open at 390 px, Smoker tick box under Services for this group.
- `baseline-details-390.png`, `baseline-details-1280.png`: Ann's break details, chips Lunch, Dinner, Smoker (off).
- `baseline-admin-shifts-1280.png`: Admin, Kitchen, Shifts with Remove on each row.
