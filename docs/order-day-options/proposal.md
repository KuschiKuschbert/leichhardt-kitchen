# Order day nudge: proposal (round 1)

24 November 2026, Queensland. Source commit `8f0e83c` (main). Role-based analysis, not research with staff. No code.

## The request (head chef's words)

"Can we have a setting for Headchef sous chef and admin to set a favourite order day where they get a reminder to order all the supplier orders? Like a little nudge "hey it's order day today", maybe check in the uploaded roster if Headchef or sous chef are rostered that day and give a little nudge to not forget to order that day? And if head and sous chef are rostered always nudge the headchef first?"

## The problem in the kitchen

- **Who:** the head chef and the sous chefs, who place the supplier orders. Staff never order.
- **How often:** once a week on the kitchen's usual order day (the supplier sales job is already called "the Sunday job"), plus any day a chef forgets.
- **What happens today:** reminders are per supplier, tied to each supplier's cut-off: a bar and a tick list on the Order list, a line on Home's Now and next, and phone pushes for chefs who turned them on (when the reminder starts, 1 hour before the cut-off, and a heads-up at 15:00 the day before a cut-off 2 or more days ahead). Nothing says "today is the day we do the week's orders", and nothing knows who is working. Every chef whose phone has pushes on gets every cut-off push, rostered or not.
- **What goes wrong without it (head chef's concern):** the weekly order is forgotten or left to the last cut-off, or the chef who is off gets the reminder and the one who is on does not.

## The change

1. **A setting: the order day.** One weekday (and a time for the nudge, [10:00 to confirm]). Set by the head chef, a sous chef or the admin.
2. **The nudge on that day:** "It's order day. [N] supplier orders to do." with a way into Supplier order.
3. **Who gets it, from the saved roster (Today's team for that day):**
   - head chef rostered: the head chef (even when a sous chef is on too);
   - head chef not rostered, a sous chef rostered: that sous chef (each one on, if two);
   - nobody rostered, or the day's team not saved yet: [to decide: the head chef, every chef, or nobody, said plainly].
4. **Where the nudge shows:** [to decide in round 2] a phone push (the existing cut-off push job), one line on the chosen chef's Home Now and next, the top of Chef to-do, or the Order list's supplier tick list.
5. **It stops** once the orders are done: [to decide] every supplier ticked as ordered for the week, or the chef taps Done.

Open interpretation for the council and the head chef: "nudge the head chef first" could mean (a) only the head chef when both are on, or (b) the head chef first and the sous chef later in the day if the orders are still not done.

## Cost (first estimate)

| Part | Cost |
| --- | --- |
| Setting stored in `config/main` | 0 reads (already on every phone). But only the head chef's verified Google account writes `config/main`, so a sous chef could not change it without a rules change. |
| Setting in a new chef-writable record (for example `config/orderday`) | 1 read a day per chef phone (or ride the config listener), a new rules block (looser: publish rules before code), emulator checks, one more record in backups and PIN moves. |
| A line on Home or Chef to-do | 0 new reads: the day's team (`team/<day>`), roles (`config/main.headId`, `sousIds`) and supplier ticks are already held. `js/prep.js`, tests. |
| A phone push | `scripts/cutoff-push.mjs` reads `team/<day>` once on the order day (about 1 to 3 reads a week), sends only to phones whose `by` is the chosen chef (`headId` or `'owner'` for the head chef). Needs that chef to have pushes on. Emulator check in `scripts/emulator-check.mjs`, `tests/cutoff-push.test.js`. |
| Files | `js/prep.js` (setting, nudge), Settings or the admin Order cut-offs page, `scripts/cutoff-push.mjs`, maybe `firestore.rules`, tests, README, this folder. 1 to 2 pull requests. |
| Risk | Wrong person nudged from a stale or unsaved roster; a nudge shown as "nothing to order" because ticks did not load; another reminder on top of cut-off reminders (noise). |

## Design references to test

- **Things 3:** today's work distinct from upcoming; the order day is today's job, not a standing banner.
- **Flighty:** what matters now with real data the person already reads (the roster, the supplier ticks); no new polling.
- **Duolingo:** the nudge shows real progress (3 of 5 suppliers ordered), not a streak.
- **Headspace:** calm, short words; no interruption during service.
- **Linear:** one place for reminders, not a second reminder system beside cut-offs.
- Not relevant: Airbnb (no booking detail), Todoist (no quick entry; the setting is set once).

## Service rules check (first count, from source, not measured)

- Main tasks (add an order line, tick a supplier) stay 1 tap.
- A Home line or Chef to-do line adds no tap; a push adds none and opens Supplier order in 1 tap.
- A line on the Order list would take one list line on a 390 px phone on the order day only.
- No new tab, bar button or pop-up is proposed.
