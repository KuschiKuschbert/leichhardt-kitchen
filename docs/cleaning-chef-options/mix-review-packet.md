# Cleaning: mix review packet

9 November 2026. Neutral evidence for a fresh council follow-up. The owner asks: “any mix recommendations? run the council”. No mix is selected. This is role-based analysis, not research with real kitchen staff.

## Job and constraints

The user wants a compact Cleaning management workspace for admin, head chef and sous chefs. The existing programme has 26 general templates and 25 ordered pack-down steps. With all templates in the actual app, Monday shows 47 task rows and 45 known occurrences. A phone document is 4,241 px tall; opening Repeat tasks appends 51 templates below it and reaches 10,770 px. This was measured with synthetic Firebase and the app's native fonts. No frequency-of-use or service-speed research is available.

The previous feature-value council unanimously said Build smaller. Reuse that verdict: the problem and scope are unchanged. This review concerns composition, not adding functionality or reconsidering whether the problem exists. You may recommend plain A if mixing adds too little value.

Service rules: the work page is one tap from its tab; no extra main tab, top-bar button or service popup; nothing overlays a service list unless it prevents a mistake; extra taps or reduced task visibility must be explained and measured.

Every alternative retains the same Today / Week / Repeat tasks choices within Cleaning. Setup replaces daily content instead of stacking below it. No new main navigation item or dashboard is proposed. Preserve shared work, pack-down order, required checks, event coverage, blocked reasons, configured Pass verification, unsent drafts, worker/time records and immutable history. Do not add bulk completion, role-based verification grants, extra persistent data, background queries or polling.

## Source design evidence

Inspect all six screenshots, relative to this packet:

- `previews/a-390.png`, `previews/a-1280.png`
- `previews/b-390.png`, `previews/b-1280.png`
- `previews/c-390.png`, `previews/c-1280.png`

**A, Grouped notebook:** five named folds, one group open, at most six task rows on a page, inline checks. Shared General cleaning and exception summaries are visible. Initial phone shows five group summaries and zero task rows. A has the smallest change. Every operational task first needs a group-opening tap.

**B, Cleaning desk:** group rail, short task list and one adjacent detail/editor pane on desktop. Phone uses group selection then a task page. Initial phone shows five group summaries and one full task row. B is strongest for reading/editing methods on desktop; it has more responsive selection state.

**C, Week board:** five work-group rows by seven days, then the selected checklist. Phone uses a day strip and five group summaries. Initial phone has no complete task rows; desktop prioritises the full weekly summary. Due task counts describe workload, not unknown service/prep/use-event coverage. C is strongest for a short week overview and has the most date/scope state.

The source prototypes passed 117 local browser assertions at 390, 768 and 1280 px. These support schematic layout/reachability, not real saves, editor draft recovery, concurrency, no-signal behaviour, accessibility conformance or speed. No candidate mix has measured screenshots yet.

## Three possible mixes

These sketches describe composition. They do not promise three implementations or separate copies of the completion/editor logic.

### M1, A daily work + B setup

```
TODAY [A]          WEEK [A]             REPEAT TASKS [B layout]
Five folds        Day + five folds     Search / Add
  selected jobs     selected jobs      short task list | one editor
```

Daily work and week review stay with A. Borrow B's adjacent task list/editor only inside Repeat tasks on a laptop. On phones use the selected task's inline editor, without carrying B's group grid and task-page navigation into daily work. No duplicate form or second save route. Strength: editor becomes easier to reach without more daily navigation. Cost: setup needs responsive selection and draft retention; the long weekly task matrix is still replaced by A's day/group browsing rather than a week-at-a-glance summary.

### M2, A daily work + C week review

```
TODAY [A]          WEEK [C]             REPEAT TASKS [A]
Five folds        Five groups x days   Search / Add
  selected jobs     selected jobs      five folds + inline editor
```

Keep A for daily completion and setup; use C's group-by-day summary only after the chef chooses Week. Phone Week uses one selected day and group summaries. Strength: short weekly oversight without filling daily work with a calendar. Cost: date/group navigation and correct distinction between due, recorded, blocked, awaiting and unknown coverage. Do not infer missed tasks from unknown events.

### M3, A daily work + C week review + B setup

```
TODAY [A]          WEEK [C]             REPEAT TASKS [B layout]
Five folds        Five groups x days   Search / Add
  selected jobs     selected jobs      short task list | one editor
```

Use each model only for its existing job. Daily work stays A. Week uses C. Repeat tasks borrows B's adjacent editor on desktop and an inline editor on phones. Strength: daily operation, weekly review and setup have a layout suited to each job. Cost: all three layouts need maintenance and protected navigation while a save/draft is active. Build-size estimates are uncertain until a selected implementation is specified.

## Steps and evidence limits

All mixes intentionally keep A's daily task taps: open a group, open the task, tap its K required checks, Record. That is K+3 for a first-page task, plus one for a later six-row page. A task already visible requires K+2. For Clean impingers, K=2, so five taps from a closed Hot larder group versus four for the current visible task, excluding scrolling. Shared-tablet attribution adds the existing worker choice.

Repeat tasks then Add is two taps in every mix, excluding scrolling/typing. M2/M3 introduce no extra daily step because Week is a separate choice. There is no measured mix density, read budget, recovery test or implementation cost yet. Reuse loaded task data and the existing bounded week query when Week is requested.

## Review response

Rank M1/M2/M3, giving first 3 points, second 2 and third 1. Say whether plain A beats your best mix. Name the useful elements to keep, elements to cut/defer, and the decisive tradeoff. If evidence cannot establish value, say so. Keep under 200 words and do not claim real-staff agreement.
