# Evidence packet: one break per person on Today's team

Source `main` at `628eb32` (17 Nov 2026). Every reviewer gets this packet, `proposal.md`, and the service council's Current design contracts, Design references and Try to break it sections (`.claude/skills/service-council/SKILL.md`).

## Current contracts (excerpts)

**Service rules (head chef, 5 Nov 2026):** the main job of each work page is one tap from its tab; no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; nothing over a list during service unless it stops a mistake; a change that adds taps or takes away visible lines says why.

**The day on one clock (chosen D, 16 Nov 2026, `docs/team-order-clear-options/brief.md`, `docs/design-patterns.md` "The day on one clock"):** one row per person: the name (and Head chef or Sous chef), a read-only bar on the day's scale (a break is a taller orange block edged in paper), one sentence ("Roster 12:00 to 15:00 · Break 13:30 to 14:00", "No break yet"), then one line per service: the service name with "Take off Lunch" (second tap in place, then Undo puts back the service, section, breaks and roster hours), the Section picker, the break pickers ("Break 13:30", "Length 30 min") and **+ Break**, and on the last line "Add a service". Below 1100 px the breaks take their own line. Break times are offered only inside a person's hours on that service. One structure at every width.

**Breaks today (`js/prep.js`):** saved as `br: [{ id, sh, at, len }]` on `team/<day>`; `at` minutes after midnight, `len` one of 30, 45, 60, 90, 120, 150, 180, 210, 240; 150 minutes or more is a **split**. Up to three per person per service (`TM_BREAKS = 3`). + Break's default: a person's own day of 9 hours or more on that service starts with a split 4.5 hours after their start; otherwise the first break sits in the middle of their hours on that service, the next one after the last. Overlapping breaks of one person show "Review overlapping meal breaks or splits for Mo on Lunch, Dinner. Nothing has been changed automatically."

**Roster cut (head chef, 16 Nov 2026, `docs/head-chef-decisions.md`):** the roster file cuts each roster time to each service's own hours: a 10:00 to 21:00 cook is saved as Lunch 10:00 to 15:00, All day 15:00 to 17:00 and Dinner 17:00 to 21:00. A service added by hand takes their roster hours that day. The roster file is the source of truth: a person on a service the roster does not give them is flagged in words, never blocked.

**Who sets breaks:** the head chef (admin panel, usually the laptop) and the sous chefs (chef panel and `#/team`, own PIN); since 14 Nov 2026 the sous chefs "set the breaks on the day", often on a phone. Staff read their own breaks on Home (break, back from break), Your day and On today.

**Who reads breaks (all from the saved `br` list, by `sh`):** Home's welcome (`homeGreet()`: only breaks whose `sh` is a service the person is on), On break now (the charcoal live strip), Next planned breaks today, the Saved shift overview, the Too few count (`tmShortOf()`: a person is away when any of their breaks on that busy time's service covers the minute; it uses `f.on[x.id][x.sh]`), the "break when too few" mark (matches `x.sh === s.sh`), Copy last weekday (copies a break when its `sh` is still on), Take off (drops that service's breaks; Undo puts them back), Clear this day.

**Too few (15 and 16 Nov 2026):** each service may have a busy time and people needed then (Admin, Kitchen, Shifts). The Save dock's amber band says "Too few now until 19:00: 4 on, 6 needed", with "Go to <name>'s break" and "Accept 4 on". A warning only, never stops Save.

**Spread them (fold "Copy, clear or spread breaks"):** for one service at a time: from, one at a time / two at a time / all together, length, start the next group every. Splits replace the service's splits, shorter breaks its shorter breaks; inside each person's hours; names who it moved.

**Draft and Save:** the dated draft lives in memory until Save; Save writes the whole day with `v` one more than stored. Words: "Unsaved changes", "Saving...", "Not saved. Changes kept.", "Saved 13:00 · Gus". Every change says what it did and "Not saved yet."

**Held pickers (15 Nov 2026, `tests/team-picker-context.test.js`):** each break picker's key carries person, service and number (`tm-at:<id>:<sh>:<n>`) and the date, so a picker held open through a redraw can never write to another person, service, break or date.

**Action feedback (`docs/action-feedback.md`):** answer in the tap's own frame; confirm in words where the eye is, by name; Saved only after the write resolved; Undo says Undone; colour never alone.

**Colours (`docs/surface-colours.md`, `docs/colour-coding.md`):** Team and people use sage (`--surface-people: #EAF5EE`, edge `#8AA391`); orange is action, selected and attention (the break block on the bar); green confirms a stated success; amber the Too few band; red failures and destructive actions. Colour always with words.

**Writing (`CLAUDE.md`):** no em dashes, Australian English, 24-hour time, plain short sentences. Only times the head chef confirmed; a default break length of 30 minutes and a split of 150 minutes are already in the book.

## Measurements

See `proposal.md`, "Measured today", and `measured-baseline.txt`. Screenshots: `baseline-mo-390.png`, `baseline-day-1280.png`; the day on one clock as built: `../team-order-clear-options/built-plan-390.png`, `built-day-1280.png`.

Fixture (`fixture.cjs`, made-up staff): Lunch 10:00 to 15:00 (busy 12:00 to 14:00, 3 needed), All day 15:00 to 17:00, Dinner 17:00 to 21:00 (busy 18:00 to 20:00, 3 needed), Smoker hidden. Gus (head chef) Lunch 08:00 to 15:00 and Dinner 17:00 to 21:00; Sam (sous chef) All day 16:00 to 17:00 and Dinner 17:00 to 21:30; Ari, Bea, Cal on Lunch; Dev Lunch 12:00 to 15:00, All day, Dinner to 20:00; Eli and Fen on Dinner; Mo 10:00 to 21:00 cut into Lunch, All day and Dinner.

**Not evidenced:** real fonts on a real phone; how many breaks a cook really takes in a long day (the head chef said "the option to add a second", so two at most is assumed); whether any saved day already holds three breaks for one person on one service.
