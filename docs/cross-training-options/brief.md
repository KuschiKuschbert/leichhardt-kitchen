# Cross-training without written assessments

Requested by the head chef, 10 November 2026: improve staff cross-training and remove the assessments as they work now ("I don't need to write manual assessments just yet").

**Status: council finished, waiting for the head chef's choice. Nothing in the app has changed.**

Source: `main` at `fbbc5dd`. Proposal: [proposal.md](proposal.md). Previews: [index.html](index.html) (`?d=A|B|C|M|R&p=plan|reports`, `&err=1` for a failed count). This is role-based analysis by council agents, not research with real staff. All names and counts in the previews are made up.

## Recommendation

**Recommend R: retire the assessment screens, B's single Reports page, and A's planner line only where someone can act on it.**

1. **Retire assessments from the screens, keep the data.** The Training tab, the Inbox "training reviews" row, the Assessments page, the person's Assessments block and "In training" on the planner go. `training/*` records, rules, history, backup and the PIN move stay, so it comes back with a code revert. A saved admin page of `training` or `training-records` opens the Inbox.
2. **One Reports page, "Who has worked where"** (Reports, Team): shift counts per person and section for 7, 14 or 30 days from `teamsum/main`, with a legend and a People total row, then in words "Sections few people worked lately" and "Mostly on one section". It replaces the ticks matrix, Cross-training chances, Section habits and Shifts on each section; the ticks table stays behind a fold on the same page.
3. **A planner line only where it can be acted on.** On the chef's Today's team planner, a person gets one plain line, "Not on Pans in 30 days. Alex is on Pans in this plan.", only when they have no shifts there in 30 days and someone with 5 or more shifts there is on it in this plan. At most two a shift, one per mentor, never taking a section's only experienced cook off it; sections the fewest people have worked first, then the newest cooks. It follows the draft. No line when the counts did not load, with one head line saying so.

Why it beats the others: it puts a nudge where the roster is decided (Things 3: the frequent decision stays visible, the detail is tucked away) without adding a line to every row, and it turns four overlapping Reports parts into one answer (Linear and Headspace: one name, one place). Main downside: the planner hint shows rarely, so most cross-training thinking still happens on the Reports page.

Taps: putting a person on a section stays the same (open the picker, choose). Planner at 390 px (Preview, 5 people): 950 px without hints, 977 px with R's one hint, against 1042 for A and 1128 for M.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).**

| Reviewer | Verdict | Main point |
| --- | --- | --- |
| Cook mid-service | Build smaller | No service page changes. Keep planner rows one short line; no staff view |
| Head chef | Build smaller | Removal is the real ask. The roster is decided in the planner, once a week. No new board, no staff view |
| Skeptic | Build smaller | Reports Team already holds most of it; a board would be a fifth answer. "Thin cover" is a verdict on activity |
| New starter | Build smaller | "Thin cover" reads as a quiet night (covers are guests). Removing "In training" hides a learner; a count that did not load must never read 0 |
| Keeper | Build smaller | Reads go down. A staff view needs a rules change and a privacy decision. Saved tab ids need a fallback |

Cut by the council: the staff-facing view, a new cover board page, the word "thin cover".

## Round 2: three designs

| | A. One line in the planner | B. One page in Reports | C. Counts in the section picker |
| --- | --- | --- | --- |
| Central idea | A passive hint on every planner row | One analysis page replaces four parts | A hint at the moment of choice, in the picker |
| Where | Chef's Today's team planner | Admin and chef Reports, Team | Planner head line and section picker |
| Taps to set a section | Same | Same | Same, longer picker |
| Planner height 390 (Preview) | 1042 | 950 | 1440 with the picker open |
| New reads, rules | 0, none | 0, none | 0, none |
| Build | 1 PR | 1 PR | 1 PR, touches a shared control |

Screenshots: [A planner 390](a-plan-390.png), [B Reports 1280](b-reports-1280.png), [C planner 390](c-plan-390.png), [M planner 390](m-plan-390.png), [R planner 390](r-plan-390.png), [R Reports 1280](r-reports-1280.png), [R failed count](r-plan-390-err.png). Today's Training tab: [today-training-1280.png](today-training-1280.png).

### Scores (out of 10, six reviewers)

| Reviewer | A | B | C | M (lead mix) | First pick |
| --- | --- | --- | --- | --- | --- |
| Cook | 7 | 6 | 4 | 7 | A |
| Head chef | 7 | 6 | 4 | 6 | A |
| Skeptic | 5 | 7 | 4 | 6 | B |
| New starter | 6 | 7 | 4 | 6.5 | B |
| Keeper | 7 | 6 | 4 | 6.5 | A |
| Screen designer | 6 | 8 | 5 | 6 | B |
| **Total** | **38** | **40** | **25** | **38** | A 3, B 3 |

Disagreement: A or B first split three each. Everyone wanted A's line plus B's page, with the line limited. The same-shift clause split: the skeptic, the new starter and the cook would keep it only when it is actionable; the head chef and the screen designer would drop it. R keeps it only as the gate for showing a line at all, in plain weight.

### Mix of all three

| Source and part | Take or reject | Principle | Kitchen benefit or cost |
| --- | --- | --- | --- |
| A, planner line | Take, gated to at most 2 a shift | Things 3 | A nudge where the roster is made, without noise on every row |
| A, wording "New to X ... Dee has 6" | Reject | Headspace | Read as a rookie label and a ranking. Now "Not on X in 30 days" |
| A, line for a new person | Take the idea: no count until counts exist | Duolingo (truthful) | Never shows a false 0 |
| B, one Reports page | Take | Linear | Four parts become one answer |
| B, designer note "Replaces four parts" | Reject | Headspace | Noise for the reader |
| C, grouped picker | Reject | Todoist | More reading at the moment of the tap; 1440 px |
| C, head line "Few people worked lately" | Reject | Linear | Repeats B's list; reads as staff absent |
| C, "X is on Y this shift" | Take as the gate only, "in this plan" | Flighty (real status) | The hint only appears when a pairing is possible tonight |

The all-three blend as first drawn (M) scored 38: a line on every row, a bold second clause, and pickers that could move as the draft changed. R is the repaired blend. Its review status is in Follow-up below.

## Break-it findings

| Scenario | Evidence | Repair or check |
| --- | --- | --- |
| A device whose last admin page was `training` or `training-records` opens a blank pane after the change (`adminStartTab()` returns the saved id unchecked) | Checked in source (`js/prep.js`) | Check the id against the page list, fall back to Inbox; click test seeding `lk.prep.atab` |
| Old cached Inbox or person page still opens `training` (`a-person-assess`, the Inbox open list) | Risk | Remove all paths in one change, keep `admin-intelligence.js` API 3 with its entry points |
| `teamsum` failed, not yet run or older than yesterday: "0 shifts" is false | Risk | No line; one head line "Shift counts did not load"; Reports shows `.p-err`. Preview R `&err=1` shows both |
| A section renamed: counts are stored by name (`teamSecName`), the planner uses ids, so everyone shows "Not on X" | Checked in source | Match by name as stored, and hide hints for a section renamed in the last 30 days; test |
| A section taken off the list still counted | Risk | Filter by the kitchen's current sections, as `tmUsual()` does |
| The mentor moves in the draft; the hint goes stale, or rows reflow under the thumb | Risk | Hints follow the draft and update when the picker closes; measure targets do not move mid-tap |
| "Dee has 6" or a total reads as a ranking or a skill verdict | Reviewed wording | Counts only, the page says "a count is activity, not a sign someone can run a section alone" |

## Contract fit

Reads: 0 new; `teamsum/main` is already read once a kitchen day by chefs and admin (Works). Access: chefs and admin only, no staff view (Works). Counts, never a verdict (Works after rewording). Surfaces: the planner keeps the sage people book and "Draft, not saved yet." (Works). Heat scale: ink text on every step (5.27:1 on the darkest), as the current Reports heat already does. Failed and unloaded states, keyboard focus and dark mode: Not evidenced until built.

## Follow-up on R

Focused follow-up on the first R preview by the skeptic (6/10, now prefers R to A and B with two fixes) and the screen designer (6/10, recommends R with one fix). Both measured the preview in Chromium at 390 and 1280 px: no sideways scroll, every link 44 px or more.

| Finding | Evidence | Disposition |
| --- | --- | --- |
| Two hints sent two learners to one mentor, and one took Bo, Grill's only cook with 5 or more shifts, off Grill | Reproduced in the preview | Fixed: one hint per mentor, and never a hint that would take a section's only experienced cook off it |
| Ties went by name, so the same people always got the hints and the newest cook never did | Reproduced in the preview | Fixed: fewest-people sections first, then the person with the fewest shifts overall. The preview now shows one hint, for the newest cook |
| White text on the darkest heat step, 3.2:1 | Measured | Fixed: ink text, 5.27:1, as the current app already does (`.sk-c` sets no white) |
| "Usually Pans" lines stayed when the counts failed, though they come from the same record | Checked in source | Fixed in the preview: with the counts failed, neither shows |
| Hints recompute from the draft, so a pick can add or remove lines and move pickers below | Risk / Not evidenced | Build check: change a pick and measure that no picker under the thumb moves mid-tap; update hints when the picker closes |
| Stale counts (older than yesterday) and removed sections | Not evidenced (source comment only) | Build tests listed above |
| `teamsum` stores section names, not ids | Checked in source | The build matches by name and hides hints for a renamed section; the brief no longer claims id matching |
| The planner notice is neutral while the Reports failure is red | Reviewed | Kept: the plan still works, so the planner notice is information; Reports cannot show its page |

Status: the lead synthesis R, repaired after this follow-up. Not re-scored after the last repairs.

## If chosen: build steps

1. Retire the assessment screens (one PR, client only): Training tab, Inbox row, Assessments page, person block, planner "In training"; saved tab fallback; the nightly job stops counting `needs.training` and `learn` after the client merges. Tests: `admin-intelligence`, `admin-learning-clarity`, `admin-chefs-desk`, `team-person`, `todays-team`, `admin-dashboard`, `read-budget`.
2. Reports, Team: "Who has worked where" (one PR).
3. Planner line (one PR), with the failed, stale, renamed and removed-section tests above.

Rollback: revert each PR. `training/*` data is untouched throughout.
