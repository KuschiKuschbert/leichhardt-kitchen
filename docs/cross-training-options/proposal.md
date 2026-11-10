# Cross-training without written assessments: round 1 proposal

Requested by the head chef, 10 November 2026: "I'd love to improve the staff cross training and remove the assessments as we're doing them now. I don't need to write manual assessments just yet."

Source: `main` at `fbbc5dd`. No code written for this proposal.

## The problem in the kitchen

The head chef wants more people able to run more sections, so a sick call or a busy Friday does not leave one section with nobody who has worked it. Today the book treats training as **written assessments**: the head chef picks a person and section, records an assessor, a date and an outcome (Not assessed, In training, Confirmed). Nobody is writing them, and the head chef does not want to for now. So every place built on them shows an unfinished queue:

| Where | What it shows now | Depends on assessments |
| --- | --- | --- |
| Admin, Today, **Training** tab | "Ready for an assessment": every person and section with no confirmed assessment, Add assessment, Saved assessments | Entirely |
| Admin **Inbox** | "9 training reviews. People and sections without a confirmed assessment." Every active person times every section, so it never empties | Entirely |
| Admin, Team, **Assessments** page | Saved assessment library with revision history | Entirely |
| Admin, Team, a person's page | "Assessments" block, "No saved assessments yet" | Entirely |
| Chef's Today's team planner | "In training: Pans" on a person's row (from `teamsum/main.learn`) | Entirely |
| Admin, Reports, **Team** | Ticks per section matrix, **Cross-training chances** (people with no ticks on a busy section, pair with someone who has), **Section habits** with "Consider rotating to X", **Shifts on each section** | No (activity only) |
| Admin, Kitchen, Kitchen sections | Who worked where, last 14 days (shifts) | No |
| Chef's planner | "Usually Grill, 6 of the last 8 Saturdays" and a usual-section default | No |

Screenshot of today's Training tab at 1280 px: [today-training-1280.png](today-training-1280.png). Inbox: [../admin-dashboard-restyle-options/today-inbox-1280.png](../admin-dashboard-restyle-options/today-inbox-1280.png).

## What the book already knows (no new data)

- `teamsum/main`, written each night: every shift each person worked on each section in the last 30 days (the chef's plan, each cook's own moves, their pick), and each person's usual section per weekday and shift from 8 weeks of plans. Read by the head chef, sous chefs and verified admin only; staff are refused by the rules. 1 read once a kitchen day when a page needs it.
- `analysis` ranges: lines each person ticked per section (7, 30, 90 days).
- Today's team plans ahead by week (`team/<day>`), which is where the chef actually decides who goes where.

Shifts worked are activity, never competence. That boundary stays: nothing here claims someone "can" run a section.

## The change

1. **Retire assessments from the screens, keep the data.** Remove the Training tab, the Inbox training row, the Assessments page, the person's Assessments block and "In training" in the planner. Keep `training/*` records, their rules, history and backup, so turning it back on later is a code revert, not a data rebuild. The nightly job stops counting the training queue (`needs.training`).
2. **Replace it with cover, built from shifts worked.** One honest question: *for each section, how many people have worked it lately, and who has not had a go?* Exact shape is round 2. Candidate directions:
   - **Cover board** (admin and chef panel): sections down, people across (or the reverse), shifts in the last 30 days; a section worked by only one or two people is marked **Thin cover** in words; a person on one section for most shifts is marked.
   - **Rotation hints where the roster is made**: in the Today's team planner, beside a person, "Not on Pans in 30 days" and a pairing ("Alex has 12 shifts there").
   - **Staff see their own sections**: on their own Home or Settings, "Sections you've worked lately".
   - Fold the existing Reports Team cross-training lists into the same place so there is one answer, not four.

## Cost

- Reads: none new for 1 and the cover board (reuses `teamsum/main`, already read once a day by chefs and admin). Staff-side counts would need a new staff-readable record or rule change (the rules refuse staff `teamsum` today): a real cost and privacy question.
- Rules: none for 1 and the admin/chef views. Nightly job: drop `needs.training`, `learn` optional.
- Files: `js/admin-intelligence.js`, `js/analysis-core.js`, `js/admin-dashboard.js`, `js/prep.js` (planner row, person page, Reports Team), `scripts/analysis.mjs`. Tests: `tests/admin-intelligence.test.js`, `tests/admin-learning-clarity.test.js`, `tests/admin-chefs-desk.test.js`, `tests/team-person.test.js`, `tests/todays-team.test.js`, `tests/admin-dashboard.test.js`, `tests/read-budget.test.js`.
- Risk: medium. Removing a page touches the admin nav, Find, saved last-page ids (`training`, `training-records` must still open something sensible) and the read budget.

## Design references that apply

- **Flighty**: what matters now and next. Cover is about the coming week's roster, not history.
- **Things 3**: keep the frequent decision (who goes where this week) visible; tuck the 30-day detail away.
- **Duolingo**: progress shows real completed work (shifts actually worked), with a clear next step (put them on Pans Thursday). No streaks or points.
- **Headspace**: one name for one thing. Today the book says ticks, completed jobs, shifts worked, recorded station activity, training reviews and assessments.

## Questions for the council

Is it worth replacing, or just removing? Where does the decision really happen? Does a staff-facing view help or hurt?
