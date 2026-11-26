# Cleaning: its name and its look. Round 1 proposal

26 November 2026. Source commit `a187cd63` (main). No code. The council advises and the head chef decides.

## The problem in the kitchen

Cleaning grew in eight steps in November 2026: the 26 general jobs, 25 ordered Pack down steps, the head chef's 21 section jobs, your section first, this screen's section, the nightly count, Missed in the Inbox and Records, Weights and days, What each day takes, Suggest the days, and a suggested day in the Add form. Each step was judged on its own. Nobody has looked at the whole page since. On 25 November the head chef asked for "a more engaging name than Cleaning (maybe end of night checklist, but something short)", then said: "wait until all other steps are done and then we can brainstorm name and design again". All steps are now built. On 26 November he chose to run the full council.

Who has it: every cook at close (every night, about 50 jobs a night across the kitchen, 9 to 11 on their own section), the head chef and sous chefs checking the week (a few times a week) and setting up jobs (rarely, now that the lists are loaded).

## What people do today (measured, Preview of the implemented app)

Measured in the click-test stand-in at `a187cd63` with the head chef's real lists loaded under four made-up sections (Grill, Pans, "Fryers, salads and dessert", Hot larder), Wednesday 2 December 2026 14:00, the book's own fonts. Cook Ann on Grill on a personal phone and the kitchen tablet; on a section screen, a shared touch screen at 1920 x 1080 set to Grill (This screen's section), with Ann on Grill and again with Ann on Pans; head chef Sam. Pictures and numbers in `baseline/` (`baseline.json`, script `designs/baseline.cjs`).

| Main job | Taps from the tab today | What the opening screen shows |
| --- | --- | --- |
| A cook ticks tonight's jobs, own phone | 1 tap a plain job (tick box). A job with checks: open, each check, Record done | 390 px: 5 complete rows, first tick box at 454 px. 768: 9 rows (first at 504). 52 rows on the page, 5.4 phone screens long |
| A cook ticks tonight's jobs, section screen | 2 taps a plain job: the box, then their name in Who did this (3 when they are not in "Signed in on this device today" and need Others...). A job with checks adds the same name tap | 1920 x 1080: 9 complete rows, first box at 504 px, page 3.4 screens long. Headings in view: "Grill · This screen" (or "This screen. You are on Pans today"), Pack down 0/9, Shared kitchen 0/24 + repeats |
| A chef ticks a job from Today | Open the group (1), then the box (1) | Groups are folded with a count and "Open tasks" |
| A chef checks the week | Week (1), then a day chip (1 more for another day) | 390 px: no job row on the opening screen; the week arrows, day chips and "3 repeat jobs need a first date" fill it |
| A chef sets up jobs | Repeat tasks (1), then Add cleaning task or Edit (1) | 390 px: two notice boxes (first dates, 23 jobs with no weight), search, Add, then a filtered list; Weights and days is a link inside a notice |

Above a cook's first row at 390 px: the title block with "0/50 recorded; repeats apply" (99 px), "Checked 14:00 · Go to Pack down · Refresh" (44 px), "Temperature logs: morning and before dinner service" (45 px), a coverage hint "Record every required service, prep or use. The count covers known occurrences; repeat coverage is not configured." (55 px), the section's name with "Your section today", then the "PACK DOWN 0/9" heading and its reminder. The phone tab bar says CLEANING.

What a cook reads after their own section: Shared kitchen, 24 jobs and repeats (fridges, dry stores, sinks, bins and so on), then "Rest of the kitchen": every other section's clean and Pack down, all open, then Floors after shelving last.

The chef's Today shows each group folded, with a count and "Open tasks". Week is a pager and seven day chips, then that day. Repeat tasks is notices, search, Add and a list, then three folds for the built-in lists.

## The change to consider

Two questions, together, as he asked:

1. **The name on the tab bar and the page title.** Candidates that fit the phone tab bar on one line at 360 and 390 px, also at Extra large text, with every other tab still on one line (measured, `baseline.json` "tabs"; the tightest neighbour, Recipes, keeps 11 px spare at 360 px Extra large with the longest names; Cleaning is 41 px of a 65 px tab at 360 normal): Clean down (54 px), Reset (26), Close (26), Close down (53), Wrap up (37), Shine (24), Checklist (45), Knock off (45), Clean up (40), Closing (35), Night clean (54). Not Pack down: that is already a named part inside the page. Keeping Cleaning is a real option.
2. **The page's look and order**, for the three jobs above, on a phone (390), the kitchen tablet (768), the five section screens (1920 x 1080, touch, read from the bench) and the head chef's laptop (1280) and computer (1920 x 1080).

Not in scope: what is cleaned, recurrence, rules, the nightly count, the admin's Inbox and Records rows.

## Cost

Name only, counted: about 50 quoted strings people see that say Cleaning, in `js/app.js` (12), `js/prep.js` (21), `js/cleaning.js` (13), `js/admin-dashboard.js`, `js/cleaning-schedule.js` and `js/fools.js` (1 each): the tab, the page title, Opening Cleaning..., the admin's "Turn on Cleaning for the team", Records and Inbox lines ("Cleaning: count not ready", "Cleaning, last night"), Settings ("see this section first on Cleaning"). 33 test files and 21 notes mention the word. A narrower rename (the tab and the page title only, keeping "cleaning" as the word for the work in Records and the admin panel) touches 2 to 4 strings and a handful of tests. No reads, no rules. Every phone updates once. A page re-layout: `js/cleaning.js` and its CSS (lazy, not in the saved shell), click tests in `tests/cleaning-*.test.js` (about 15 files read the page), no new reads unless a design asks for one. Risk: the cook's tick and its Undo, recovery of unsent checks, the shared-screen worker picker and Go to Pack down all live on this page.

## Design references to test

- Things 3: today's work against occasional and upcoming work (section clean, weekly jobs); tuck occasional detail, keep the frequent tick visible.
- Headspace: one calm name a new starter understands; plain words for "0/50 recorded; repeats apply" and the coverage hint.
- Linear: the work more prominent than the frame (four lines of notices before the first job).
- Flighty: what matters now (tonight's close) and next.
- Duolingo: progress that shows real completed work (0/9 for my section, 0/50 kitchen).
- Airbnb: a job's place, how often and state together on its row.

## Questions still open with the head chef from the list (`docs/open-work.md` item 5)

These are not the council's to answer; the brief carries them:

1. The 12 lines with no day (Grill 8, 9, 11; Pans 7, 9; Fryers 2, 3, 4, 13; Hot larder 6, 12; everyone: the outside area and the takeaway containers): which day, or leave them out?
2. The drip tray (his list: every night; saved Pack down: every 2 days from 9 November) and the OZ tank (his list: twice a week; saved: Sunday only): which is right?
3. Does a missed weekly or monthly job stay due the next day, or wait for its next turn?
4. Which Pack down does a Fryers cook do, and is "Fryers, salads and dessert" one cleaning list?
