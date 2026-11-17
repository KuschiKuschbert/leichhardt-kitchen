# Round 2 packet: the whole day on Home

17 November 2026, source branch `claude/gallant-keller-evpsw9` on main `547a1b3`. Every round 2 reviewer gets this same packet, the round 1 evidence packet (`evidence-packet.md`: current contracts, colour rules, design references, Try to break it) and the screenshots below. No option is the lead's favourite here.

## What is decided already

- Round 1 (5 of 5, Build smaller): Home showed a long roster day as its first slice (Mo, rostered 10:00 to 21:00, read "10:00 to 15:00"). Fixed on this branch: each person's whole roster day, a split with its gap, "Grill from 17:00" where a double moves section to a column not shown, Your day the whole stretch.
- The head chef: "always show me the whole day" on Home (On today, no fold, whether or not they are on the plan). Built.
- The head chef then asked for layout improvements to that whole day, and, after seeing A, B and C: "It still doesn't read super easy to me for an at a glance feature", asking for "just the name for people on the day and the rosters start time", then "maybe the section they're rostered on at the current time". That is D.

## The task

The head chef glances at Home (phone, tablet on the pass, laptop) to see the whole day: who is in, when, where. The same whole day is also the staff's View today's full team (one tap). Staff's own On with you card (their service) keeps the current section board whatever is chosen.

## The four options (Preview: changed copies of `js/prep.js` and `css/app.css` served to the click-test stand-in; synthetic day of 9 people, 14:00, fallback fonts)

- **A, one service at a time:** today's board split into one block per service, stacked; each name and their whole day on one line, later section and breaks under it.
- **B, the day on one clock:** one row per person in start order; their day as a bar on one scale (the approved Today's team bar: ink day, orange break block) with a small mark at the time now in each row; hours on the right; sections and breaks in words under the bar.
- **C, sections across the day:** one block per section in the kitchen's order; who works it and when, in time order; a quiet "Nobody 15:00 to 17:00" where a section has a gap between its first start and last finish.
- **D, who starts when:** names grouped by roster start time, in time order. Under each name, quietly, the section they are rostered on now (before their day, the one they start on; a chef with no section reads as their role). A line "NOW 14:00" between starts already passed and those still to come (top before anyone starts, end once everyone has). "back 14:15" in bold for anyone on a break now. A split's second start lists them again, marked "split". A part of the day already over goes grey and says "until 15:00". Sections for the rest of the day, break windows and finish times are not on the card: one tap away in Today's team (the link under it).

| Measured (Preview) | Today (hours fixed) | A | B | C | D |
| --- | ---: | ---: | ---: | ---: | ---: |
| Head chef's card, 390 px, 14:00 | 898 px | 952 px | 793 px | 583 px | 467 px |
| Head chef's card, 1280 px | 614 px | 796 px | 793 px | 426 px | 467 px |
| Staff fold opened, 390 px | 856 px | 910 px | 751 px | 541 px | 425 px |
| Entries for 9 people | 15 | 15 | 9 | 11 | 10 (split twice) |
| Taps: whole day / sections all day and break windows | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 1 |
| Sideways scroll, browser errors (390, 768, 1280) | none | none | none | none | none |

D at 07:00, 14:00 and 17:30: 482, 467 and 435 px. Not evidenced for any option: real Barlow fonts, a day without roster hours, four or more services, rendered contrast of the quiet lines, keyboard order, tablet use on the pass.

## Screenshots (in `docs/home-roster-options/`)

- `options-390.png`: today (hours fixed), A, B, C side by side, head chef, phone, 14:00.
- `options-1280.png`: the same on a laptop.
- `d-gus-390.png`, `d-gus-1280.png`: D, head chef, 14:00.
- `d-through-the-day.png`: D at 07:00, 14:00 and 17:30.
- `a-staff-fold-390.png`, `b-staff-fold-390.png`, `c-staff-fold-390.png`, `d-ari-390.png`, `now-staff-fold-390.png`: the staff's View today's full team opened, each option.

## Open questions for the reviewers

1. Which layout should the head chef's whole day on Home take?
2. Should the staff's View today's full team take the same layout, or keep the section board?
