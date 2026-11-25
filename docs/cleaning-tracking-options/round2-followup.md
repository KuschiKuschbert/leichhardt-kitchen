# Cleaning tracking and planning the days: follow-up packet on the two mixes

**Correction by the lead, after this packet went out.** The line below, "Five of six asked for a planning blend ... P-B's week as counts", overstates it. Cook, new starter, keeper and screen designer asked for P-C's list with P-A's fields; only the cook and the screen designer asked for the week as a strip of counts; the keeper asked for one limit line, the new starter for the "Proposed" tag, and the head chef for a blend on P-B's page. The three follow-up reviewers read the packet as first written. "With same-kind days off: 7,4,4,5,4,1,1 for 1 move" was true of the planner then; it now moves none (7,5,5,4,4,1,0). The head chef's words are quoted with spelling tidied.

26 November 2026. Source commit `91c5bc4b`. A focused follow-up for the skeptic, the keeper of the book and the cook. It holds no recommendation. `round2-packet.md` still applies: its contracts, design references and Try to break it are unchanged.

## What changed since you scored the six designs

Rankings, best first, as each reviewer gave them:

| Reviewer | Planning | Tracking |
| --- | --- | --- |
| Cook | P-C, P-A, P-B | T-A, T-B, T-C |
| Head chef | P-B, P-A, P-C | T-A, T-C, T-B |
| Skeptic | P-A, P-C, P-B | T-A, T-B, T-C |
| New starter | P-C, P-A, P-B | T-C, T-A, T-B |
| Keeper | P-C, P-A, P-B | T-A, T-B, T-C |
| Screen designer | P-C, P-A, P-B | T-A, T-C, T-B |

Five of six asked for a planning blend: P-C's list as the frame, P-A's weight and kind fields and day chips, P-B's week as counts, not a board. The skeptic asked for P-A with P-C's wait line and bulk moves held back.

Then the head chef, on tracking, in his words: "just make the section jobs a section problem, not the person's problem, but track in the background that if a person was on grill for example the night before to flag if not all tasks for that section have been done in the section." So the by-person page (T-C) is out, at his word.

## Faults the six reviewers found, and what the mixes do about each

- Same-kind days make the week less even on the book's own list: weekly jobs per day, Sunday to Saturday, 7,4,4,4,4,1,0 today and 5,7,2,7,4,1,0 with the plan, for 10 moves. With same-kind days off: 7,4,4,5,4,1,1 for 1 move (`planner.test.js` prints both). The mix makes it a visible switch.
- Leaving one line out could break a rule with nothing said. `planner.js` now has `check()`, which names the rule a set of days breaks; the page runs it whenever a line is changed or left out (2 node checks).
- "The lightest day for the kitchen" was untrue on a heavy Tuesday. The reason now says "a light day for Pans (weight 2 with it)" or "a day the rules allow".
- A tick that meant "move this job" read as "done". Each line has a button with words: "Leave on Thu".
- No line said "Proposed, not saved". Each does now.
- "First due tomorrow or later" was false for a new job. The mix says "A new job starts today" and "A move starts tomorrow".
- The rules box filled the first screen. It is folded at the bottom.
- Monthly lines said "starting in week 2". They now give a date.
- "On that section that day" ignored shifts. The tracking mix says "on at close": who the plan, or their own pick, had on that section for the last service that day.
- Unable to complete lowered the total. It is now outside the totals.
- Shared kitchen jobs were left out. They are counted, with no names.
- "Counted from the day Cleaning was switched on" had no record behind it. The mix says counting starts the first night after Cleaning is switched on, which the nightly job would record.

Not fixed in a drawing, still open: a save that straddles midnight; what a page does after a lock with a proposal on screen; which home weight and kind get; a close finished after midnight read as missed; a past day counted once and never corrected; tracking keyed by a job's root id across moves; whether the day flags read by the admin only.

## The two mixes (lead's draft)

Pictures under `docs/cleaning-tracking-options/previews/`: `p-mix-390.png`, `p-mix-390-full.png`, `p-mix-1280.png`, `t-mix-390.png`, `t-mix-390-full.png`, `t-mix-1280.png`, and the pages as `.html`.

**P-mix, Plan the days.** One page in Repeat tasks. A switch, "Jobs of one kind on the same day", On or Off, each saying how many jobs move. A strip of the seven days with weekly jobs now and with this plan, and the Friday and Saturday line. Then lines: new days (one shown opened, with day chips that say what that section has each day), moves (old day, new day, the wait in days this once, the reason, a button to leave it), monthly first dates as dates. Every line says "Proposed, not saved". One Save, 5 at a time, with "0 of 15 saved". The rules are folded at the bottom. Weight and kind are set in the job's own form, as in P-A.

**T-mix, Cleaning by section.** No person has a total. A flag in the admin Inbox the next morning: "Hot larder left 1 job last night", the job, and who was on that section at close; a shared job with no names. Below, in Reports, one row per section for the last 4 weeks, done out of due, opening to each missed job with its dates and who was on at close, and each done job with who did it and when. Unable to complete is apart and outside the totals. The counting rules are folded at the bottom.

Measured, Preview (schematic, 390 x 844): P-mix 2.8 screens long, T-mix 1.4, no sideways scroll, no control under 44 px high. Nothing was tapped, saved or timed.
