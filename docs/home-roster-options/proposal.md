# Proposal: Home's team board uses the roster hours

Round 1 of the service council, 17 November 2026. The head chef asked: "With the new roster data and today's team should we upgrade the today's team view on home page?" No code yet. The design is for round 2, if the verdict is Build or Build smaller.

## The problem in the kitchen

Home's On today board (the section board, chosen C on 10 November 2026) was designed before roster hours existed. Since then:

- **15 November:** each person's roster hours are saved with the day's plan, and the owner decided "everyone on the day sees who's coming in when". Home shows them as a quiet line under each name.
- **16 November:** the roster file cuts each roster time into the services it touches. A cook rostered 10:00 to 21:00 is saved as Lunch 10:00 to 15:00, All day 15:00 to 17:00 and Dinner 17:00 to 21:00.
- **17 November:** Today's team (the chefs' planner) shows each person's whole day once, as a bar on one clock, with a Rostered hours label under the name.

Home still shows people service by service, so on a roster day (synthetic day, 9 people, 14:00, `today-*.png`):

1. **A long day reads as a short one.** Mo, rostered 10:00 to 21:00, shows on On with you as "Mo 10:00 to 15:00". Dev, rostered 12:00 to 20:00, shows "Dev 12:00 to 15:00". Mo's own Your day card says "Lunch · 10:00 to 15:00". A coworker can think Mo leaves at 15:00. Mo can think so too.
2. **The full day repeats people and wraps.** View today's full team on a 390 px phone has three narrow columns (Lunch, All day, Dinner). Mo and Dev appear three times each, Gus and Sam twice, each with a slice of their hours. Times wrap over two or three lines ("10:00 to / 15:00 / break / 12:00 to / 12:30"). The fold is 696 px for 9 people.
3. **Now and next are not said.** On with you lists the current service. Nothing says who is on now, who comes in later (Dinner starts 17:00: Eli, Fen) or who has finished. That is one tap away, in the fold above.

## Who has it, how often

Every cook and chef on the day. Home is the first page after the first PIN of each day, and the page people glance at for "who's on with me, and until when". Several glances a shift. The head chef sees the whole day on Home when not on the plan.

## What people do today

Read the board and work out the rest. A cook who wants to know when Mo leaves opens the fold and adds up Mo's three slices, or asks. The chefs see the real day in Today's team.

## The change (whether, not how)

Upgrade Home's team board to use the saved roster hours:

- each person's real hours once (the roster time joined across services, as Today's team does), not a slice per service;
- make now and next clear from those hours: who is on now, who comes in later and when, who has finished;
- keep what the board does now: section, break window, "back 15:00" while on a break, the head chef's whole-day view, the staff fold, plans without roster hours (the service's own hours), four or more shifts, checking, unset and failed states;
- Your day says the person's own whole roster time.

The smallest version: fix only the hours (show Mo as 10:00 to 21:00, once per cell or once per person) without changing the board's layout.

## Cost

- **Reads, rules, saved data:** none new. `tm.rec` already holds each entry's `from` and `to`. No listener, field, rule or saved copy. The minute paint already updates the board.
- **Files:** `js/prep.js` (`homeRotaHTML()`, Your day words), `css/app.css`.
- **Tests:** `tests/home-rota.test.js`, the Home parts of `tests/team-roster-hours.test.js`, `tests/roster-import-ui.test.js`, the welcome and colour tests that look for `.hm-tp`.
- **Risk:**
  - Home is everyone's first screen, and the change replaces part of a chosen design (C, 10 November).
  - Clock paints must keep the controls and the fold's open state.
  - Older plans without hours must keep working.
  - Head chef, sous chef, staff and not-on-the-plan variants.
  - Four-shift days.
- **Merge cost:** one Home change republishes the book, so every phone updates once.

## Taps and lines now (Implemented app)

Stand-in, fallback fonts, synthetic roster day, 14:00, Ari (staff, Lunch) at 390 px:

- Who is on with me: 0 taps. On with you card 420 px.
- The whole day: 1 tap for staff (the fold, 696 px); 0 for a head chef not on the plan.

## Design references to test

- **Flighty:** what matters now and next, with real times from data the phone already holds.
- **Airbnb:** the person, their time and place together.
- **Things 3:** today's people now versus later kept distinct; detail tucked away.
