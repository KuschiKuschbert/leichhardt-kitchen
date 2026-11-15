# Proposal: warn when too few people are in the kitchen, and a minimum for a time of day

15 November 2026, Queensland. Head chef request, in their words: "In the today's team admin area, can we have a visual warning when not enough people are in the kitchen, like when too many people are on breaks? And maybe have a setting where chefs can set the minimum chefs for a time frame."

Role-based analysis, not research with staff. No code yet.

## The problem in the kitchen

- **Who:** the head chef (admin panel, Team, Today's team) and the sous chefs (`#/team` and the chef panel). They plan the day's team and breaks in the same planner (`teamPageHTML()` in `js/prep.js`). Since 14 November the roster import fills who works which service; the sous chefs then set the breaks, often on the day.
- **When:** every planned day, at the moment breaks are set or moved (Spread them, or by hand in each person's Breaks details), and again during service when a break is moved.
- **What can go wrong:** breaks are set person by person. Nothing adds them up. Three or four people can be off the floor at once in the middle of service without anyone noticing until the dockets back up. Spread them spaces breaks one, two or all at a time, but it knows nothing about how many must stay on.
- **What people do today:**
  - The charcoal **On break now** board lists who is away right now, from the saved plan only. It does not say how many are left in the kitchen, and it does not look ahead.
  - **Next planned breaks today** (folded) lists the coming breaks, one line each.
  - **Whole day review** lists every person, service and break.
  - To check whether 18:00 to 20:30 is covered, a chef must open Whole day review (1 tap) and read 14 lines over 1,664 px, then count by hand who is on Dinner and who is away at each time. The planner never adds it up.
- **What the saved plan knows:** each person's services (`team/<day>.on[] = { id, sh, sec }`), each service's hours (`config/main.kitShifts { from, to }`) and each break (`br[] = { id, sh, at, len }`, minutes). It does **not** know a person's own start and finish: the roster hours are in memory on the admin session only. So "in the kitchen at 16:00" can only mean "on a service whose hours cover 16:00 and not on a break".

## Measured baseline (Implemented app, stand-in)

Source: `main` at `da18bf7`. Click-test stand-in (`tests/fake/`), fallback fonts, the kitchen clock at 18:30. Made-up day: the head chef's real shape (Lunch 10:00 to 15:00, Dinner 15:00 to 21:00, most cooks on a double), a sous chef and 8 staff. On Dinner: 8 people. Breaks: three doubles on a 2.5 hour split from 14:30 or 15:00, then four meal breaks that overlap from 18:15 (Dev 18:15 for 30 minutes, Fen 18:15 for 45, Hal and Sam K 18:30 for 30). At 18:30, 4 of the 8 are away. Script [`baseline.cjs`](baseline.cjs), raw [`baseline.json`](baseline.json).

| Measure | Admin 390 px | `#/team` 390 px (sous chef) | Admin 1280 px |
| --- | ---: | ---: | ---: |
| Is the kitchen short now? On screen | Board lists 4 names away. No count, no minimum, no warning | same | same |
| Is 18:00 to 20:30 covered? | 1 tap (Whole day review), then read **14 lines** (1,664 px tall) and count by hand | same flow | same flow |
| Warning while a break is being set | **None** | None | None |
| Board top / grid top | 554 / 772 px | 247 / 469 px | 570 / 719 px |

Screenshots: [admin 390](baseline-admin-390.png) (full page), [sous chef 390](baseline-team-390.png), [admin 1280](baseline-admin-1280.png), [Whole day review](baseline-whole-390.png).

## The change to explore

Two parts, as asked.

1. **A minimum in the kitchen for a time of day.** For example "Lunch rush 12:00 to 14:00: at least 3", "Dinner rush 17:30 to 20:30: at least 5". Set once, used every day (or per weekday: to test).
2. **A warning in Today's team** when the plan (the draft being edited, and the saved plan for today) leaves fewer people in the kitchen than the minimum, said in words: when, how many in, how many wanted, who is away. For example: "18:30 to 18:45: 4 in the kitchen, 5 wanted. Away: Dev, Fen, Hal, Sam K."

Ideas to test in round 2 (no choice made yet):

- Where the warning sits: the Save area, above the grid, in each person's Breaks details while a break is chosen, on the live On break now board, on Home for chefs.
- A day strip: how many are in the kitchen across the day, the minimum as a line, the short spells marked.
- Spread them keeps to the minimum (never stacks breaks below it), or only warns.
- Where the minimum is set: Admin, Kitchen, Shifts (beside the services, head chef's admin only, no rules change); or inside Today's team, where the sous chefs work (needs a rules change, as `config/main` is the admin's).
- Who counts: everyone on the plan; or leave out the head chef and sous chefs; or leave out people with no section.
- A warning only, never a block on Save. The chef may choose to run short.

## Cost and risk

- **Reads:** none new expected. The count comes from the plan already in memory (`tmf`, `tm.rec`) and `config/main`, which every phone already listens to.
- **Data and rules:** the minimum needs one saved setting. In `config/main` (for example `kitMin: [{ name, from, to, n }]`) the admin can write it today with no rules change; sous chefs could not. A sous-chef-editable minimum needs a rules change and a new field or document.
- **Files:** `js/prep.js` (team planner, admin Kitchen rows, the config draft `DRAFT_PARTS`), `css/app.css`, team tests (`team-grid`, `todays-team`, `team-notebook`, a new test), `tests/rules/` only if rules change, `docs/design-patterns.md` if a new pattern, `README.md`, `docs/prep-book.md`.
- **Risk:**
  - **Wrong count from service hours.** A person on Dinner 15:00 to 21:00 counts from 15:00 even if their own shift starts at 17:00. The saved plan has no personal hours.
  - **Clock edges:** a break end is exclusive, a start inclusive; a service ending at 21:00 is not in at 21:00.
  - **A warning that is always on** (a quiet Monday under a Friday minimum) teaches people to ignore it.
  - **Draft versus saved:** a warning must say whether it is about the draft or the saved plan, and never imply the plan is saved.
  - **Unknown is not fine:** loading, failed or stale reads must not show "Covered".
  - The planner has many contracts already (`docs/code-contracts.md`, Today's team): one draft, one dated Save, version protection, the break board from the saved plan only.

## Relevant design references

- **Flighty:** what matters now and next, from data already on the phone; real times; no polling for the look.
- **Airbnb:** time, who, how many and the next action together.
- **Things 3:** today's problem visible, the setting tucked away.
- **Todoist:** a known default (the minimum) visible and easy to change.
- **Headspace:** calm plain words: "4 in the kitchen, 5 wanted", not an alarm.
- **Duolingo:** honest: a draft warning is not a saved plan.
- **Linear:** one place for the warning, not three.

## Questions for round 1

Is this worth building? Who should set the minimum (head chef only, or the sous chefs too)? Should it be the whole day or set times? What is the smallest version that stops a short-staffed dinner rush?
