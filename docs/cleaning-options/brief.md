# Kitchen cleaning: three designs

8 November 2026. Source baseline `c2fae37`.

**Chosen: C daily list + A chef week review (8 November 2026).** After reviewing the three designs and council recommendation, the head chef approved the recommendation and required an exact match to the existing app’s design, style and fonts. The original interactive previews remain design evidence; implementation uses the existing app shell and notebook components. See [the implementation record](implementation.md).

**Current extension, 9 November 2026:** the owner supplied the unbranded 26-task schedule and requested methods, required checks, separate service/prep/use records and food-labelling Pass verification within this chosen layout. [The current contract](../cleaning-schedule.md) supersedes the original single-daily-occurrence and no-second-sign-off scope below. The original previews remain historical design evidence.

[Compare the designs](index.html) · [Original proposal](proposal.md)

## Confirmed by the head chef

The follow-up [admin release switch](release-toggle.md) starts Cleaning off for the team while chefs prepare the schedule. It keeps the approved layout.

- Move the Guides navigation chip into the chef-hat menu.
- Explore a cleaning page with section-specific recurring work throughout the week.
- Include coldroom, freezer, dry store, oven, fryers, behind equipment, pass and shelves, alongside the kitchen's existing sections.
- Tick done, recording who and when. No second chef sign-off was requested.

Cleaning areas and equipment are separate from staff sections. A coldroom task may belong to a section or be shared; adding it must not silently change the roster's configured sections. The preview jobs, owners, weekdays, people and completion times are examples. They are not an approved cleaning programme. Exact methods, frequency, time of day and allocation remain to be decided together.

## Round 1: should we build it?

**Verdict: Build smaller (5 of 5).** Five independent agents reviewed the same written proposal and current phone screenshots using the repository's reviewer briefs. This is role-based analysis, not research with real kitchen staff.

| Reviewer | Verdict | Main concern |
| --- | --- | --- |
| Cook mid-service | Build smaller | Daily ticks need large targets. Keep shared jobs in view and link directly to instructions. A matrix must earn its place on a phone. |
| Head chef | Build smaller | The areas and tick record are confirmed, but actual jobs, frequencies and the existing paper process are unknown. Test one real week before adding complexity. |
| Skeptic | Build smaller | Guides already holds the procedures. This feature's value is scheduling and completion. Avoid maintaining a second set of instructions or duplicate records. |
| New starter | Build smaller | A cleaning area is not always a roster section. Filtering must not quietly hide shared work. Show the action, area, owner and save state clearly. |
| Keeper of the book | Build smaller | Bound reads and define concurrent ticks, Undo and pending writes across rollover before implementing. No new startup history reads or polling. |

There was no verdict disagreement. The keeper preferred deferring the weekly completion matrix, while the cook and head chef wanted to compare a chef-only weekly view against the smaller daily workflow. All three previews retain the smaller daily core, and the matrix is explored as a chef tool.

## Navigation proposal shared by the designs

Guides moves to **chef hat → More → Guides**, retaining its current visibility and access checks. Links from recipes and search stay. Individual cleaning jobs can link to their relevant guide when one exists and the person may see it.

The vacated sixth navigation position becomes **Cleaning**. The total remains six destinations: Recipes, Prep, Orders, Wastage, Transfers, Cleaning. The head chef approved this replacement; no extra top-bar icon is added. The preview's small design/role controls are demonstration tools, not part of the planned product.

Guides costs two taps from a work page instead of one. Cleaning opens in one tap and an immediately visible task takes one further tap to mark done. The chef hat has an additional Cleaning entry under Every day for discoverability.

## A. Week sheet

The least change from a familiar paper cleaning sheet: tasks down the left, weekdays across the chef's wide screen. On a phone, a chef chooses a day and sees full-width task rows. Staff see today's work only.

**Strengths:** easiest week-at-a-glance check; clear distribution of recurring jobs; familiar paper-sheet model.

**Costs:** more information and date context for chefs; needs a careful distinction between not due, not yet done and missed; a phone cannot show seven 44 px columns plus readable task names, so it uses a day list.

## B. My section

Rethinks the page around the cook: their section's jobs today, then shared kitchen jobs that remain visible. A chef can switch to the week's sheet. Jobs have one identity and one completion record across views.

**Strengths:** relevant work first; shared areas are not lost; daily operation and weekly oversight can use the view that suits each.

**Costs:** depends on clear section ownership; two views to maintain; changing the section must not change the person's roster assignment or hide an unsent tick.

## C. Daily cleaning list

Removes the most navigation: one ruled list, all today's due jobs under Cooking line and Shared areas, with the area on each row, with no separate weekly completion view. A chef can expand a simple repeat-day schedule below the list.

**Strengths:** simplest mental model; all shared jobs visible; smallest first implementation.

**Costs:** longer scroll for a large kitchen; no quick weekly completion matrix; finding another section's work relies on headings and scrolling.

## Completion behaviour to carry into the chosen design

These requirements informed the approved implementation. The original previews remain synthetic, and implementation checks are recorded separately.

- A tick belongs to a stable task ID and a dated occurrence. Repeating weekdays generate separate occurrences; a repeat task is never reset by deleting its past completion.
- A personal phone attributes to its current signed-in person. Shared tablets must use the book's existing explicit attribution pattern so the recorded cleaner is not silently the person who last unlocked the screen.
- Show who and when after server confirmation. While waiting, show Not sent; refusal must keep the task unresolved and offer a retry. A read failure must say Could not load, not zero jobs.
- Undo applies to the completion the person just made and must not erase a newer completion from another phone. Concurrent tick and Undo behaviour needs a version/transaction design and two-device checks.
- Changing weekdays or archiving a template affects future occurrences; retain past record labels and owner context. A section rename uses its stable ID. Orphaned areas/jobs need a visible reassignment path.
- A missed occurrence remains missed on its original date for chef review. No automatic done, carry-over, backdating or clearing at midnight. The kitchen clock is authoritative; late-night ownership of a service day needs confirmation.
- Staff keep today's completion data. Chefs can review past dates. Cleaning does not expose existing chef-only to-do or operational records to other roles.

## Build cost and data budget

This exploration reads and writes no kitchen records. Its interactions are in-memory examples. It does not register a service worker or save private data on the device.

Estimated implementation size, not a commitment: A and B need about three grouped PRs (navigation/foundation, daily work, weekly chef planning/review). C needs about two (navigation/foundation, daily work with simple repeat setup). All require new validated task/completion records and server rules; none is just a CSS change. Before implementation, confirm how task administration fits head/sous permissions and the staff Tick capability.

A proposed bounded model reads enabled task templates on opening Cleaning, plus that day's completion records; reuse while the page stays open, and Refresh explicitly. A chef's week loads a bounded date-range query on demand, never seven queries in a loop and never at staff startup. Budget in documents, not queries: for T templates and D completions, a cold daily open costs approximately T + D returned documents, plus existing rule lookups and minimum empty-query charges. A weekly review adds the returned week records only when requested. Exact bounds, template refresh policy and accounting must be proved with the selected schema. No new listener, timer polling, badges requiring extra reads or nightly job is assumed.

## Measurements and validation

Current phone screenshots use `tests/lib.js`, synthetic Firebase, a staff identity and the real Barlow/Caveat fonts at 390 × 844. Six complete Prep rows fit above the fixed Add a line bar. The first fallback-font capture showed five and was replaced; the final measurement excludes rows covered by that fixed bar. A before-count for cleaning is not available because no cleaning checklist exists today.

Preview counts and round 2 scores are recorded below. Browser checks have completed. Count complete rows above any fixed footer, not the number of records or partially visible rows. Preview toolbar space is included so the counts are conservative for these exact previews. Count targets and fit separately from font legibility; automated checks are not full accessibility certification.

## Schedule details still to decide together

1. Which exact jobs repeat on which days, and which section owns each shared-area job?
2. Is a job due once per day, per close, or separately for lunch and dinner? The current preview assumes one occurrence per day only.
3. What existing paper or chat record should this replace?

The layout is approved. The app starts with no operational jobs: chefs add the actual jobs, responsibilities and weekdays. The eight confirmed areas are suggestions, not a seeded cleaning programme. The first implementation uses one occurrence per calendar day in Queensland; multiple services would need a separate decision.


## Measured comparison

| At 390 × 844, preview toolbar included | A, Week sheet | B, My section | C, Daily cleaning list |
| --- | --- | --- | --- |
| Staff complete task rows | 5 of 6 due | 3 of 4 relevant | 5 of 6 due |
| Chef complete task rows on Wednesday | 4 | 4 in Week | 5 |
| Open Cleaning then tick a visible job | 2 taps | 2 taps | 2 taps |
| Tick once the page is open | 1 tap | 1 tap | 1 tap |
| Open Guides from a work page | 2 taps, previously 1 | Same | Same |
| Extra navigation within Cleaning | Chef day choice | Section choice; chef Today/Week | Chef repeat-schedule fold |
| Relearning | Familiar sheet, different phone view | Section scope plus shared jobs | One grouped list |
| Estimated implementation size | 3 PRs | 3 PRs | 2 PRs |
| Main risk | Dense date states | Hidden scope and more view state | Long list and no week completion overview |

The baseline Prep page remains unchanged: six complete rows. Cleaning has no before row count. B shows fewer relevant tasks, not the same full six-job list. Changing its section does not remove shared tasks. A and C show all six example Wednesday jobs; freezer and kitchen shelves are scheduled on other example days and appear in all three chef schedules.

Verified in Chromium at 390, 768 and 1280 px for Staff and Chef, 18 combinations: no horizontal page overflow, no JavaScript errors, every measured button/select at least 44 × 44 px. Forty-one interaction assertions passed, including tick, visible who/when, stable row heights, Undo, menu-to-Guides, keyboard trapping and focus return, staff today-only presentation, disabled future ticks, all eight areas in the chef schedules and shared tasks retained after a section change.

Evidence: [measurements](previews/measurements.json), [interaction checks](previews/interaction-checks.json), [baseline](previews/baseline.json), [comparison](previews/comparison.png), [chef weekly matrix](previews/a-chef-1280.png), [moved Guides](previews/hat-390.png), [completed task](previews/done-390.png).

Checks are against the in-memory prototypes and synthetic baseline. No Firestore emulator, real data, production backend save, concurrent phones or live deployment was tested, because none is changed here. No formal screen-reader or full large-text accessibility audit is claimed. Font files were fetched from the same Google Fonts families already used by the book and supplied to the screenshot browser for reproducibility; no font dependency was added to the app. Temporary browser verification scripts are not an application regression suite.

## Round 2: six independent reviewers

Each reviewer saw all three phone designs, wide chef views and the same measurements. First place scores 3, second 2, third 1. No preferred design was supplied. Six fresh agents used the five council roles plus the kitchen screen designer.

| Reviewer | A | B | C | Main reason |
| --- | --- | --- | --- | --- |
| Cook mid-service | 2 | 1 | 3 | C keeps daily work together. B spends too much phone space before shared jobs. Borrow A's chef review. |
| Head chef | 3 | 1 | 2 | A makes recurring distribution and missed work visible, potentially replacing a second record. Use C's daily grouping. |
| Skeptic | 2 | 1 | 3 | Start with C and add a matrix only if one real week shows its value. Avoid duplicate paper and digital ticking. |
| New starter | 1 | 2 | 3 | C's groups and next action are clearer. Borrow B's section guidance; explain who can help with shared jobs. |
| Keeper of the book | 2 | 1 | 3 | C has fewer view states. All options still need the same reliable completion foundation. |
| Kitchen screen designer | 2 | 1 | 3 | C gives the clearest phone hierarchy. A's weekly symbols need clearer labels and a nearby legend. |
| **Total** | **12** | **7** | **17** | **C first for 5 of 6; A first for the head-chef reviewer.** |

Disagreement is substantive: the head-chef reviewer values a weekly completion review from the start; the skeptic and keeper would defer it until a real week's jobs establish its value. The new starter ranks B above A because the section context is easier to understand. Do not record unanimous support for a hybrid.

## Recommendation accepted by the head chef

Start with **C's grouped daily list**, clear section ownership, one-tap completion, who/when and Undo. It is the strongest phone design and the council's first choice.

Keep **A's chef-only weekly matrix** as the proposed companion for weekly oversight, with plain labelled states and its legend beside the grid. The head chef accepted the companion week view for this implementation. Do not adopt B's full section-first page unless a larger real workload justifies the extra controls.

Actual task procedures and repeat days are entered by chefs, with no example schedule promoted to production. The implementation uses readable owner text and How to links. On a shared tablet, the completion identity must be explicit. The selected implementation still needs actual role, offline, conflict and read-budget tests.

## Delivery

The three previews and both council rounds are complete. The head chef chose the recommendation and authorised implementation with the app’s existing typography, colours and controls. The branch now implements that choice; [implementation evidence and release status](implementation.md) distinguish code verification from production rollout.

The implementation is based on the current chef-panel navigation from #607, with its existing role checks. The previews remain anchored to c2fae37 and show a labelled menu excerpt.
