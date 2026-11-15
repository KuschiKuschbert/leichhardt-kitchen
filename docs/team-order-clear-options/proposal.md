# Proposal: Today's team runs in time order, and the head chef can clear a day

16 November 2026, Queensland. Round 1 proposal for the service council. No code yet. Source `main` at `9697fd8`.

## The problem in the kitchen

At 00:49 on Monday 16 November the head chef opened Monday's plan in the admin panel (Team, Today's team) and saw a Smoker column with "4 no section". The roster file, filled before the hidden-shift change went live (22:01 on 15 November), put every cook rostered for Lunch on Smoker too, because Smoker (06:00 to 15:00) overlaps all of Lunch (10:00 to 15:00). A hidden shift shows as soon as anyone is on it, so the hide did not hide it. Taking the cooks off meant three taps a person.

The head chef's words: "it's super confusing how this is handled, it's not really self explaining or easy for someone new. When I add shifts like lunch, all day etc. I'd like them to show up in order when their service times are so. I can assign staff to sections during that shift. And I'd like a remove all shifts for the shown day in the today's team for the admin."

**Who:** the head chef planning days ahead in the admin panel; the sous chefs plan in the chef panel (same page) and should be considered. **How often:** the order is read every time a day is planned. Clearing a day is rare: a wrong fill (the roster before the hide, a copy from the wrong week), a closed or changed day. How many days this week carry the roster's Smoker cooks: Not evidenced (any day filled from the roster before 22:01 on 15 November).

## What happens today (Implemented app, stand-in, `baseline-run.cjs`)

- **Order.** Service columns, Add staff boxes and a person's service chips run Lunch, Dinner, then the saved order (head chef, 9 November 2026: "only the shift tabs should show Lunch first, then Dinner; keep other configured shifts in their saved order"). Admin, Kitchen, Shifts has no way to move a shift: the saved order is the order they were added. With Lunch 10:00 to 15:00, Dinner 17:00 to 21:00, Smoker 06:00 to 15:00 and All day 10:00 to 21:00 (added in that order), the grid reads **Lunch, Dinner, Smoker, All day**, at 390 and 1280 px.
- **Clearing a day.** There is no clear. Per person: Breaks, then for each service they are on its chip and "Remove Lunch and its breaks". The fixture (9 people on 15 person-services) took **30 taps, then Save** at 390 px. Refresh only brings the saved plan back. Copy last weekday is offered only "when nobody is on this day's draft". Fill from roster file fills only days with no saved plan and no draft.
- Screenshots: `baseline-plan-390.png` (full page), `baseline-plan-1280.png`, `baseline-cleared-390.png`.

## The change proposed

1. **Services in time order on Today's team.** Earliest start first; the same start, the earlier finish first; a shift with no times after the timed ones, in its saved order. With the fixture: Smoker, Lunch, All day, Dinner. Applies to the grid columns, Add staff's boxes, a person's service chips, the break tools' service picker and Save's "Still no section" list. **Open:** also Home, Your day, the staff break board, the Saved shift overview and the Admin, Kitchen, Shifts list? This changes the 9 November rule; the head chef asked for it.
2. **Clear this day, for the admin.** On the head chef's verified admin session, in the admin panel's Today's team: one action that takes everyone off every service on the shown date's draft, with their breaks. A second tap in place ("Tap again to clear Monday 16 November"), no pop-up. Nothing is saved until Save; Refresh brings the saved plan back. After it, Copy last weekday is offered. **Open:** whether Save then stores an empty plan (the rules allow it today) or the day goes back to "Not set" so Fill from roster file can fill it again (the rules already let only the admin delete a day's plan).
3. **Make it explain itself.** Open for the designs: for example, a hidden shift's column saying why it shows ("Hidden when nobody is on it"), or the Kitchen, Shifts hint saying how order is set.

## Cost

- **Reads:** none new, no listener. Order is worked out from `config/main.kitShifts`, already on every phone. Clear works on the draft in memory.
- **Writes and rules:** Save is the existing dated `team/<day>` write (`v` + 1). An empty `on` list is allowed now. Going back to "Not set" would use the admin-only delete that the rules already have; no rules change either way.
- **Files:** `js/prep.js` (`tmServiceChoices()` or `kitShifts()`, the Today's team page and its click handler), `css/app.css` if a new piece is needed, `docs/`, `README.md`. **Tests:** `tests/team-grid.test.js` checks "Lunch and Dinner first, then the configured order" and changes; new click checks for clear.
- **Risk:** ordering inside `kitShifts()` reaches Home, Your day and the 03:00 summaries; some code may assume the saved order. Clear is destructive if saved on the wrong date.

## Design references to test

- **Flighty:** real times in order, what is first and next is clear.
- **Things 3:** the frequent task (sections) stays visible; a rare clear stays tucked away.
- **Linear:** one place for planner actions (the existing "Copy a day or spread breaks" fold holds Copy last weekday and Fill from roster file).
- **Headspace:** plain words a new sous chef understands; one name per thing.
- **Duolingo:** a cleared draft is not Saved; the words say what happened and how to undo it.
- **Todoist:** nothing guessed: clear never refills by itself.
- Airbnb: not relevant (no job card).
