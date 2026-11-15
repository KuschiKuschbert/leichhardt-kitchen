# Proposal: a simpler way to give staff their sections in Today's team

15 November 2026, Queensland. Head chef request, in their words: "In the today's team in the admin/Headchef/sous chef panel, can we have a simpler way of applying sections to staff. At this point I have to physically tap the picker for lunch then assign lunch shift. Tap the picker go to dinner assign shift there. There must be a more user friendly way especially now with the uploaded roster that we know the times someone is working."

Role-based analysis, not research with staff. No code yet.

## The problem in the kitchen

- **Who:** the head chef (admin panel, Team, Today's team, after Fill from roster file) and the sous chefs (`#/team` and the chef panel). The same planner (`teamPageHTML()` in `js/prep.js`) draws all three.
- **When:** each day that is planned. Since 14 November 2026 the roster import fills a week of memberships at once (who works which service), so the remaining hand work per day is sections and breaks.
- **What people do today:** each person row has two pickers, **Service to edit** (Lunch, All day dining, Dinner: a view choice only) and **Section** (for the service the row is showing). To give a person a section on each service they work: open Section, choose; open Service to edit, choose Dinner; open Section, choose; and again for a third service. Each picker is the shared picker frame (a bottom sheet on a phone): open plus choose, two taps.
- **What the row does not show:** which services the person works. Only opening Service to edit reveals it. The roster time ("Roster 10:00 to 21:30") shows only on the head chef's admin session, only while the import is in memory.
- **Known defaults today:** a new membership takes the person's usual section for that weekday and service (`tmUsual()`, from the nightly `teamsum` counts) or, failing that, their section on another service that day (`tmAddShift()`). Copy last weekday copies last week's sections. Nothing is guessed.

## Measured baseline (Implemented app, stand-in)

Source: `main` at `d865d9e`. Click-test stand-in (`tests/fake/`), fallback fonts, made-up kitchen: 8 staff plus a head and a sous chef, three services (Lunch 10:00 to 15:00, All day dining 15:00 to 17:00, Dinner 17:00 to 22:00), six sections. A saved day as the roster import leaves it: 17 person-service memberships, no sections. Script: [`baseline.cjs`](baseline.cjs), raw: [`baseline.json`](baseline.json).

| Measure | Admin panel 390 px | `#/team` 390 px | Admin panel 1280 px |
| --- | ---: | ---: | ---: |
| Tap-equivalents to give 8 people a section on all 17 services they work, then Save | **53** (measured, admin 390) | same flow | same flow |
| Complete person rows visible above Save on opening | **0** | 2 | 1 |
| Row height | 135 px | 135 px | 135 px |
| First row starts at | 612 px | 309 px | 628 px |

53 = 17 section choices (34) + 9 service switches (18) + Save (1). Screenshots: [admin 390](baseline-admin-390.png), [team 390](baseline-team-390.png), [admin 1280](baseline-admin-1280.png), [after the task](baseline-admin-390-after.png).

## The change to explore

Make giving sections a direct job: every service a person works is visible on their row with its own section, the common case (one section all day) takes one choice, and the roster's times are used to show who works when. Ideas to test in round 2 (no choice made yet):

1. One Section picker per worked service on each row, labelled with the service, no Service to edit switch for sections.
2. "Same all day": one choice fills every service the person works that is still No section, said in words and changeable per service.
3. A section-first board: for each service, the kitchen's sections as slots and the people on that service placed into them (who is on Pans tonight), with uncovered sections visible.
4. One-tap section chips instead of the picker sheet where the list is short.
5. "Copy Lunch sections to Dinner" for everyone who works both.
6. Roster hours (or the saved services' hours) on each row.

## Cost and risk

- **Reads, rules, data:** none new expected. Sections are already stored per person and service (`team/<day>.on[] = { id, sh, sec }`). The roster times are in memory on the admin session only; showing them to sous chefs would need a saved field and a rules change (not proposed).
- **Files:** `js/prep.js` (team renderer and its click handler), `css/app.css`, the team test files (14 files today, 550 team/date assertions), `docs/design-patterns.md` and `tests/design-patterns.test.js` if a pattern changes, `README.md` and `docs/prep-book.md`.
- **Risk:** the chosen C contract (10 Nov 2026) says the row's service is view-only, No section is different from not working the service, other services' sections and breaks survive, picker choices are bound to their date and service (`tests/team-picker-context.test.js` found a wrong-service write once), one dated Save, version protection, recovery after a lock. Any redesign must keep those. Breaks stay in the named Edit breaks workbench.

## Relevant design references

- **Todoist:** known defaults visible and editable (usual section, same as the other service); never guess.
- **Airbnb:** who, when (hours), which service and which section together on one row.
- **Linear:** the work (people and sections) more prominent than the controls around it.
- **Things 3:** occasional details (breaks, membership changes) tucked away; the frequent job visible.
- **Headspace:** one plain name per thing ("Section", "Lunch", "Dinner").
- **Duolingo:** a choice says what it did; Draft is never Saved.
- **Flighty:** real times from data already on the phone (roster hours, service hours).

## Questions for round 1

Is this worth changing again four days after C was built? Is the cost real (53 tap-equivalents for one day; up to seven days a week)? What is the smallest change that removes most of it?
