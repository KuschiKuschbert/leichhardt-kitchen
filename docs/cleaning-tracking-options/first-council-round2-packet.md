# Cleaning tracking and planning the days: round 2 reviewer packet

26 November 2026. Source commit `91c5bc4b`. The same packet goes to all six reviewers. It holds no recommendation.

## What you are judging

Two sets of three designs. Rank each set separately.

- **Planning the days:** P-A, P-B, P-C. How a chef gives cleaning jobs their days.
- **Tracking:** T-A, T-B, T-C. How the admin sees who did the cleaning and what was missed.

Round 1 is in `docs/cleaning-tracking-options/brief.md` and the proposals in `docs/cleaning-tracking-options/first-council-proposal.md`. Read both.

## What the head chef decided after round 1

Round 1 advised less than he asked for. He read it and decided, in his words:

- "Cleaning schedule is not on, so we can start counting as soon as we have the cleaning on."
- "I'd like to track instead who did, and who missed but in a fair way."
- "No Friday or Saturday nights stay out of clear jobs, just don't get a heavy cleaning job, maybe let the chef creating the tasks set a ranking system for jobs from light time cost to heavy time cost in 3 steps and only allow light ones on Friday and Saturday and only like 10% of the whole week's tasks compared to Sunday to Wednesday tasks."
- "I still want to be able to move other jobs that already have a day."
- "And maybe even group similar tasks across sections to be on the same day. Eg, if section a cleans shelves on day X section b should have a shelf cleaning task on day X too."

So these are fixed scope for round 2, not open questions: tracking names people and must be fair; jobs that already have a day can be moved; Friday and Saturday take light jobs only and about a tenth of the week; a job has a weight in three steps; jobs of one kind share a day across sections. The weight and the same-kind day were not in round 1: they go straight to designs at his word. Your job is to judge which design carries this scope best and what would make it safe, not whether the scope is wanted.

## Facts pinned before drawing

- **How many moves fit in one save.** A move closes one revision of a job and opens the next. On the Firestore rules emulator, 2 and 5 moves in one save are allowed for the owner, the kitchen admin and a sous chef; 10 and 20 are refused (the rules run out of lookups). So moves must be saved in steps of 5.
- **A change starts tomorrow.** The rules need a replacement revision to start exactly tomorrow (`cleanReplacement()` in `firestore.rules`). A change cannot be set to start next Monday without a rules change. A new job starts today.
- **A moved job's week is uneven.** With the book's own `due()`: a Thursday job moved to Monday on a Wednesday is not due that Thursday, so 11 days pass between cleans; a Monday job moved to Thursday on a Tuesday is due twice that week.
- **A job's fields are fixed in the rules** (`cleanTaskShape()`): a weight or a kind on the job needs a rules change, and setting it makes a new revision of the job. The other home is one small record keyed by job, read only when a chef opens the planner. Not decided.
- **A job has "Area or equipment"** today, free text with suggestions (Coldroom, Freezer, Dry store, Oven, Fryers, Behind equipment, Pass, Shelves). The loaded section jobs carry their section's name there, so no loaded job has a usable kind yet.
- **The nightly count** (`cleanDay()` in `scripts/records-core.mjs`) keeps job names only, at most 8 missed names a day, no job id, section or person, and counts record-every-time jobs as due and never done. Tracking by person needs it changed, and the 90 kept days counted again once.
- **Who did a job** is on its completion record (the worker, and who recorded it). **Who was on a section** each day is in the Today's team plan and each person's own pick; the nightly job already reads them for `teamsum/main`.
- **A missed job has no person.** Nothing records the day Cleaning was switched on.
- **Only the admin can read the nightly counts** (`analysis/{id}` in `firestore.rules`).

## The planner behind the planning previews

`docs/cleaning-tracking-options/previews/planner.js`: one pure function, the same jobs in, the same days out, checked by 12 node tests (`planner.test.js`). It was run on the book's own built-in lists. The kinds and weights are examples made up by the lead (`jobs.js`); the head chef has not set them. Result in `previews/plan.json`: of 15 jobs that have a day, 10 move and 5 stay; 2 new jobs and 3 monthly jobs get days; shelves land on Monday, fridges on Wednesday, behind-equipment jobs on Tuesday; Friday and Saturday hold 1 of at most 2; two jobs are kept off their kind's day and say why.

The order the rules win in:

1. Friday and Saturday take light jobs only. A job with no weight is never treated as light.
2. Friday and Saturday together hold at most a tenth of the week's jobs that come round.
3. A section never gets two heavy jobs on one day, and a job on several days has them at least two days apart.
4. Jobs of one kind go on the same day across sections, unless that would make a section's day too heavy. Then the kind gives way and the plan says so.
5. Each section's days are as even as they can be, then the kitchen's.
6. A job that has a day keeps it unless a rule above moves it or its kind's day is elsewhere.

Never chosen by the planner: nightly jobs, the numbered Pack down steps, the Sunday OZ tank step, the drip tray's date and the general list.

## The designs

Open the pictures: they are the evidence. All under `docs/cleaning-tracking-options/previews/`. Each has `-390.png`, `-390-full.png` and `-1280.png`, and its page as `.html`. The page the head chef sees is `docs/cleaning-tracking-options/index.html`.

**Planning the days.** The same task for each: a chef adds "Sort the meat doneness sticks" (once a week, no day) and has the week's jobs spread, including jobs that already have a day.

- **P-A, in the job** (`p-a`). The form used today, one job at a time, with three new parts: a weight (Light, Medium, Heavy), a kind, and day chips that say what that section already has each day. The book suggests a day with its reason; the chef taps another to change it. Moving a job that has a day means opening that job.
- **P-B, the week as a board** (`p-b`). A Plan the week page: every job that comes round under its day, each day's count and weight, the Friday and Saturday limit as a line that fills. Spread the days puts the proposed places on the board, dashed and marked Proposed. Save applies them 5 at a time.
- **P-C, a list of changes** (`p-c`). One tap proposes. The page is a list: new days, moves, monthly first dates, stays. Each line says the old day, the new day, the reason, and for a move the days between its last clean and its next. A line can be unticked. Confirm saves 5 at a time.

| | P-A | P-B | P-C |
| --- | --- | --- | --- |
| Unit | One job | The week | The change |
| Where | The existing form | A new page in Repeat tasks | A new page in Repeat tasks |
| Whole week visible | No | Yes | No |
| What a move does to this week | Not shown | Not shown | Shown on each line |
| Moving 10 jobs | 10 forms | One Save | One Confirm |

**Tracking.** The same question for each: over the last 4 weeks, who did the cleaning and what was missed. People and counts are made up.

- **T-A, by job** (`t-a`). In Records. The jobs that come round that were missed, with each date and who the plan had on that section that day. A total, and the Unable to complete notes. People appear only beside a miss.
- **T-B, by section** (`t-b`). In Records. Sections against weeks, done out of due, with what was missed. A week opens to show who was on.
- **T-C, by person** (`t-c`). In Reports, Team. A row per person, alphabetical: days on a section, jobs ticked, and on those days their section's jobs that come round, done out of due, with what was missed on days they were on. Under 5 days: "Not enough days yet".

All three print the same counting rules: a person counts only for days the plan had them on that section; a missed job belongs to everyone on that section that day; Shared kitchen jobs belong to nobody; Unable to complete is not a miss; Missed means not ticked by midnight; nobody is ranked.

| | T-A | T-B | T-C |
| --- | --- | --- | --- |
| Unit | The job | The section, by week | The person |
| People shown | Beside a miss | When a week is opened | Always |
| What each person did | No | No | Yes |
| Where | Records | Records | Reports, Team |

## Measured on the previews

Preview, not Implemented app: schematic static pages with the book's stylesheet, no app shell. `previews/measurements.json`.

| 390 x 844 | P-A | P-B | P-C | T-A | T-B | T-C |
| --- | --- | --- | --- | --- | --- | --- |
| Page length, phone screens | 1.0 | 2.7 | 3.3 | 1.2 | 1.5 | 1.5 |
| Sideways scroll | No | No | No | No | No (the table scrolls inside itself) | No |

Nothing was tapped, saved or timed. Taps, save states, a lost signal part way through 5-at-a-time saving, a lock with a proposal on screen, Extra large text, dark mode, focus and contrast are all Not evidenced.

## Contracts

The proposal's section "Current contracts the reviewers must respect" applies unchanged. Read it.

## The council skill, word for word

From `.claude/skills/service-council/SKILL.md`.

### The service rules

Every proposal and every design is checked against these (head chef, 5 November 2026; also in `CLAUDE.md`):

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Count, do not guess: the taps for the main task, and the list lines visible on a 390 px phone, before and after. Measure them in the click-test stand-in (`tests/`, `tests/fake/`) or a preview, and say how.

### Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references and Try to break it below. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../../../docs/surface-colours.md#selected-design), [operational colour meanings](../../../docs/colour-coding.md#shared-meanings) and [design patterns](../../../docs/design-patterns.md). Include the affected category exceptions, plus [action feedback](../../../docs/action-feedback.md#the-rule) and [loading and motion](../../../docs/loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

#### Colour and state checks

| Check | Evidence the council needs |
| --- | --- |
| Surface purpose | Work books, including Orders, use steel; people use sage; current live boards use charcoal; reading and writing stay quiet paper. Check the actual cover, header, edge and interior, not just a palette. |
| State meaning | Local state cues take priority over surface decoration. Attention/pending, confirmed success and failure follow the operational contract. Keep brand/action orange, charcoal Prep Urgent and explicit inclusion/assignment meanings. A sage people surface or green draft assignment is not Saved; neutral upcoming information is not automatically amber. |
| Words and exceptions | Status remains understandable through words, icons, ticks or pressed state without colour. Preserve affected category legends, charts, heat scales, allergen certainty, New/Moved tags, art, celebrations and print. Colour does not establish access or food safety. |
| Real contrast | Measure the rendered foreground and background, including ancestor opacity and light/dark variants: normal text 4.5:1, large text 3:1, meaningful control/state boundaries 3:1 where applicable. Check visible keyboard focus; do not infer a whole-app accessibility pass from token values or screenshots. |
| Relevant states | Show the affected ordinary, selected, disabled, saving/Not sent, Saved, empty and failure states. Distinguish confirmed empty data from a failed read. Exercise acknowledgement, retry and work recovery where affected; list states that do not apply. |
| Service continuity | Measure visible rows, tap targets and main-task tap counts before and after at the relevant 390, 768 and 1280 px widths. Justify lost rows or added taps under the service rules. Keep controls stable through state changes; useful motion respects reduced motion and cannot imply completion or move a live target. |

Round 1 identifies contract risks and the evidence the designs will need. Round 2 records **Contract fit** alongside the reference comparison: **Works**, **Needs work**, **Not evidenced**, or **Not relevant** with a reason, source and evidence for each applicable check. The quick check needs only a short contract-fit note and the relevant evidence. Untested states and contrast remain Not evidenced. Identify the check needed before calling the implementation ready; do not add a review round for missing measurements.

Label measurements as **Preview** or **Implemented app**, with the source commit, role, viewport, fixture and font conditions. A schematic that omits the app header, reminders or full form fields cannot establish delivered density or task cost. Before marking a layout change ready, remeasure the complete implemented app at the relevant widths with its actual shell, full forms, representative data and states. Record any difference from the chosen preview, including extra scrolling, fewer visible lines/groups or added taps. Material departures from the approved design return to the head chef under the existing design-choice rules; do not rerun the whole council for routine verification.

Separate a deliberate proposal to change an approved rule from an accidental violation. Name the exact proposed departure and leave it for the head chef's choice. A high preference score or similarity to another app never makes a contract violation acceptable. Recommend a repair or smaller compliant option where possible; keep unresolved failures and missing evidence visible in the recommendation and handoff.

### Design references

Use these in both rounds and small-change quick checks (head chef, 9 November 2026). They turn the [seven-app research](../../../docs/whole-app-redesign-options/brief.md#what-the-seven-apps-do-well-and-what-fits-a-kitchen) into questions about the kitchen task. Give this section to every reviewer. Select the principles that apply; briefly explain when none do. There is no reward for copying more apps.

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research and its early recommendations. Keep the book's approved colours, notebook style, handwritten line words and functionality. Use existing [design patterns](../../../docs/design-patterns.md), [action feedback](../../../docs/action-feedback.md) and [loading and motion](../../../docs/loading-motion.md). Approved celebrations, Saved/New stamps and useful motion remain; motion must respect reduced motion and never delay an action or shift a live list. Keep current access, draft recovery and read-budget rules.

For each relevant principle, record the concrete benefit, evidence and trade-off in the feature brief. Round 2 uses a small comparison table: principle, then one column per design marked **Works**, **Needs work** or **Not evidenced**, with a short reason. Explain rejected ideas or **Not relevant** together where helpful. Cite measured taps/visible lines, screenshots or exercised states; a still image cannot prove speed, save feedback or recovery. The quick check needs only a short reference-fit note, not another review round. Rank kitchen value and the evidence above resemblance to an app.

### Try to break it

The existing **Skeptic** is the adversarial reviewer in both rounds. Keep the challenge to whether the feature is worth building, then try to disprove its claims of being clear, quick and reliable. The **Keeper** checks the technical failure, recovery and verification implications. No new reviewer or full review round is added. Criticism must name a plausible failure and its consequences; do not invent faults, reject everything automatically or prescribe more prompts without evidence.

Consider the applicable families below and prioritise the most consequential realistic cases. Report up to three leading scenarios per review, with more detail in the existing brief only when needed. A quick check does this within its self-review; fixes keep their existing exemption and regression-test rules.

| Failure family | Challenge |
| --- | --- |
| Confusion and accidental action | Can a rushed person choose the wrong day, item or unit, miss the next action, or confuse Back/Cancel with saving or deleting? Try long labels and unfamiliar roles. |
| Repetition and delayed answers | What happens after double taps, repeated Save, retry or Undo while an answer is delayed? Can work be duplicated, removed twice or overwritten by a late response? |
| Failed reads and writes | With no signal, a held write or refusal, does the page preserve work and show the right pending/failure state? Can an empty cache look like confirmed empty data or a pending write look Saved? |
| Interruption and handover | What happens on Back, closing a sheet, navigation, reload/update or daily lock while work is unsent? Does same-person recovery retain the right draft, and does handover prevent the next person inheriting it or its authority? |
| Time boundaries | For time-based features, check just before, at and after the relevant Queensland midnight, deadline and recurrence boundaries, separately from the 04:00 device unlock. Do accepted work and saved anchors survive rollover, and are required records ready before actions become usable? Use the feature's current contract; do not assume every feature changes day together. |
| Access and conflicting state | Can a wrong role read or write, a stale session retain authority, or two writers silently lose each other's work? Check current role/device, draft-versus-saved and version contracts; hidden controls alone do not prove enforcement. |
| Misleading presentation | Could colour, motion, disabled controls or hidden feedback imply success, availability or food safety that is not established? Can the task and recovery still be understood without colour or a mouse? |

Round 1 records risks and the evidence needed to test them. Round 2 exercises supported interactions in isolated previews or existing test fixtures where possible, including new failure paths in a proposed mix. Use synthetic data; this review does not authorise disruptive production tests, real staff identities, operational writes or notifications. If a preview cannot exercise a case, say so and name the smallest later check. A source review or mock is not proof of live behaviour or server enforcement.

Record **Break-it findings** in the existing brief: scenario and role/state, expected result, observed result or hypothesis, impact, evidence location and environment, smallest repair or verification needed, and disposition. Label evidence **Reproduced**, **Checked in [named fixture]**, **Risk / Not evidenced**, or **Not applicable** with a reason. Checked means only the stated case and environment passed. Keep security reproduction and authority-bypass details in the existing private evidence record; the public brief contains only a non-sensitive outcome, fix and verification summary.

The lead reconciles findings before recommending: say what was fixed and checked, what still needs verification before readiness, and what is deferred with a reason. A preference score or majority vote does not resolve a demonstrated failure. Keep unresolved access, data-loss or service-blocking failures prominent; change the recommendation or name the required repair. A hypothetical concern remains a risk, not a claimed defect. If no actionable issue was found, state the reviewed scope and limits instead of claiming the design cannot break.
