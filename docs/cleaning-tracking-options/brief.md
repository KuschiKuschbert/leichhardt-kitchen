# Cleaning tracking and spreading the days: council brief

26 November 2026. Source commit `91c5bc4b`. The head chef asked for "smart tracking" of cleaning with the results in the admin panel, and for a button that spreads repeat jobs across the week so not every section's jobs fall on the same day, for any rhythm. Two proposals: [proposal.md](proposal.md). Packet: [round1-packet.md](round1-packet.md). Nothing is built and no design is chosen.

This is role-based analysis by five fresh reviewers reading the source and the notes, each given the skill's text word for word, the proposal and the baseline pictures, with no leads from the lead. It is not research with real staff. Three of them ran the nightly count's own code on synthetic days; nobody ran the app. No measurement was taken, so every tap and density claim is Not evidenced. Each reviewer answered each proposal in under 200 words.

## Round 1, proposal 1: cleaning tracking in the admin panel

**Verdict: Build smaller, five of five.**

What they cut:

- The "smart" sentences ("missed 3 Mondays running", "the lowest finish rate") and any ranking (all five). The counts hold job names only, capped at 8 a day, so a streak can be false; and Records keeps its numbers as recorded, not judged.
- People (new starter, cook, head chef). Nobody asked for names.
- Sous chefs, for now (keeper, head chef): only the admin can read the nightly counts.

What they asked for instead, and where they split:

| Reviewer | The smaller thing |
| --- | --- |
| Skeptic | One plain block: done out of due by week, whole numbers, with uncounted days shown as "Count not ready" |
| Keeper | Done out of due by week and by weekday, plus the Unable notes, admin only. Hold "most missed" until the nightly count keeps each job's id. Change the count now, while the recount is days, not 90 |
| Cook | Count out of the jobs that can be done, put the unable-to-complete notes first, no pattern sentences until the midnight question is answered |
| New starter | One list in Records: weekly and monthly jobs only, every name kept, with dates ("Clean the drawers: missed 9, 16, 23 November"), and the words "Missed means not ticked by midnight". The nightly count must change first |
| Head chef | After about four weeks of live counts. Keep id and section, uncapped, for missed jobs that are not nightly, and report only those, inside Records |

**Disagreement.** Totals now from what is already kept (skeptic, keeper) against a list of missed weekly and monthly jobs with dates, which needs the nightly count changed first (new starter, head chef; the cook's "jobs that can be done" also needs it). The head chef reviewer would wait four weeks; the keeper would change the count now because the recount is cheap while there are few days.

## Round 1, proposal 2: the spread button

**Verdict: Build smaller, four of five. The skeptic: Don't build.**

What all five cut: rebalancing jobs that already have a day. A moved job skips a week or comes twice (11 days between cleans, or two in one week), a cook's "Every Monday" changes under them, and many moves are many writes.

Also cut: proposed first dates for monthly jobs (keeper: a repeat's start date is weightier than a weekday; skeptic: undefined); the OZ tank (new starter, cook, head chef: it is the Sunday Pack down step); the "Jobs waiting for a day" list as drawn (keeper, skeptic, head chef: nowhere to save it).

Where they split:

| Reviewer | The smaller thing |
| --- | --- |
| Skeptic (Don't build) | No button. On Add or Edit, each day chip shows how many weekly jobs that section already has that day ("Mon 3"). The chef spreads them himself; nothing is guessed |
| Head chef | The same: no button, counts on the chips. Cheapest of all: send him days to confirm |
| Keeper | A first cut for the unloaded no-day lines only, kept in the built-in list and proposed in the Load panel as day chips he can change, saved as new jobs |
| New starter | Only the weekly lines, on one screen, each row "Proposed, not saved. First due Tuesday 1 December", then "Saved" |
| Cook | Suggest days for new jobs only, with keep-clear days set first, all three lists counted, first due tomorrow or later |

**Disagreement.** Two reviewers want no button, only counts on the day chips. Three want a button that proposes days for new jobs only. Nobody supports it for jobs that already have a day, or for every rhythm.

**For the head chef.** He asked for the button for every repeat job, "not just limited" to some. The council's advice is narrower than his request on three points: no rebalancing of jobs with a day, no proposed monthly start dates, and only lines that are ready (two of six today). These are his to decide.

## Break-it findings (round 1)

| Scenario | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- |
| A perfect day is read as a rate (P1) | 100% | 46 to 49 of 50 to 53: record-every-time jobs are due and never done | Checked in three reviewers' node runs of `cleanDay()` on synthetic days; not rerun by the lead | Count out of jobs that can be done | Must be designed in |
| A bad night, 9 or more missed (P1) | The weekly job is named | Only 8 names are kept, and the weekly job was the one dropped | Checked in a reviewer's node run (id order; live order Not evidenced) | Keep every missed job that is not nightly, by id | Needs the nightly count changed |
| A job is reworded, or two jobs share a name (P1) | One job, one tally | Hypothesis: the history splits, or two jobs merge | Risk / Not evidenced; name-only storage is a source read | A `cleanDay()` fixture with a rename and a duplicate; key by id | Needs the nightly count changed |
| A week with a day not counted, or before Cleaning was on (P1) | The gap is shown | Hypothesis: read as zero due, lifting the rate; jobs loaded before switch-on read as missed | Risk / Not evidenced | Fixture weeks with no count; say which days are not counted | Check before ready |
| A close finished after midnight (P1) | Counted as done | A tick is refused once the date changes, so the job reads Missed | Risk (recorded in the sections brief; closing time unknown) | Say "Missed means not ticked by midnight" | Open with the head chef |
| A sous chef opens tracking (P1) | The page | The rules let only the admin read the counts | Source read (`firestore.rules`) | Admin only, or a rule change with an emulator test | Head chef's call |
| A proposal is on screen and unconfirmed (P2) | Proposed days are never taken for saved days | Hypothesis: after a lock, a reload or a second chef's edit, proposed chips look saved, or one confirm overwrites another | Risk / Not evidenced | "Proposed, not saved" in words on each row | Must be designed in |
| Rebalancing mid-week (P2) | The week keeps its rhythm | 11 days between cleans, or two in one week, across sections at once | Checked by the lead with the book's own `due()` for one job | Never move a job that has a day | Cut by all five |
| The button is pressed again after one job is added (P2) | Confirmed days stay put | Hypothesis: a different set of jobs gives different days | Risk / Not evidenced | Only jobs with no day are proposed | Carried into the smaller version |
| A new job confirmed on a busy night (P2) | First due on a later day | New jobs start today, so it is due tonight | Source read | First due tomorrow or later | Must be designed in |
| An even spread (P2) | Quiet nights stay quiet | With all lists: Sunday 7, Monday to Thursday 4, Friday 1, Saturday 0, so it fills Friday and Saturday | A reviewer's source count | Keep-clear days chosen first | Open with the head chef |

## Contract fit (round 1)

- **Fits:** both are on admin and chef setup screens, so no service page gains a tab, button or pop-up. The base tracking adds no read for the admin.
- **Proposed changes to an approved rule, for the head chef to choose, not violations:** the book proposing a day against "never guess one" (he asked for it; every reviewer said nothing may save unconfirmed); a tracking page that judges ("lowest finish rate") against Records' numbers kept as recorded.
- **Needs work:** a sous chef audience (rules); a rate that cannot reach 100%; one state with two names ("Unable to complete" on Cleaning, "Not possible" in Records).
- **Not evidenced:** everything on screen. Density, taps, "Count not ready", an empty or failed read, proposed against confirmed without colour.

## Reference fit (round 1)

Flighty: real status from data the page already holds, and never stale status shown as fact (skeptic, keeper, cook). Todoist: a known default that is visible and can be changed, nothing guessed from unclear text (all five, for the day chips). Headspace: one name for each thing (new starter). Duolingo's streaks were rejected for cleaning (cook); its "progress shows real completed work" is what the rate fails today (head chef). Linear, Things 3 and Airbnb were not used.

## Open with the head chef

1. Is Cleaning switched on for the team, with the lists loaded? Tracking counts nothing until then.
2. Tracking with no people's names, and for the admin only at first: is that right?
3. Which nights stay clear of weekly jobs? Today Friday has one and Saturday none.
4. The button: counts on the day chips with no button, or a button that proposes days for new jobs only? And does he still want it to move jobs that already have a day, against all five reviewers?
5. Should a missed weekly or monthly job stay due until it is done? (Carried from the sections brief.)

## Round 2

Not run. Both changes are visible, so each needs its designs once the head chef has answered questions 2 to 4.
