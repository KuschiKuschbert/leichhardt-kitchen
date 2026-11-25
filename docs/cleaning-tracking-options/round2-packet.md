# Cleaning: results by section and planning the days. Round 2 reviewer packet

26 November 2026. Source commit `0acdaf72` (`main`). The same packet goes to all six reviewers. It holds no recommendation and no favourite.

## What to read

1. This packet, in full.
2. `docs/cleaning-tracking-options/proposal.md`: the head chef's words, what he has decided (D1 to D8), the lead's readings, what exists today, the current contracts. Its planner table is replaced by the one below.
3. The pictures under `docs/cleaning-tracking-options/designs/`, listed below. Each scene has `-390.png` (the first phone screen), `-390-full.png` (the whole page) and `-1280.png`. Start with the `-390-full.png` of each scene, then the `-1280.png` where your seat needs it. `designs/measurements.json` holds every count.
4. Today's pages, for before and after: `docs/cleaning-tracking-options/baseline/` and its `counts.json`.
5. Source, to check a claim: the application at the packet's commit is in the main checkout, the main checkout of this repository on the lead's computer (read only). You may run node on `previews/planner.js`, `previews/planner.test.js`, `previews/jobs.js` and `previews/many.js`.

Do not read `first-council*` files or the pictures in `previews/`: an earlier council, set aside at the head chef's word. You may read the Round 1 part of `brief.md`. Change no file.

## Round 1, in short

Six reviewers, all Build smaller. They kept what the head chef decided and cut how it is done. Asked for, by seat: no new room and nothing new on a cook's page (screen designer, cook); weigh jobs in a list, not one form at a time (screen designer); the section's night before same-kind days (all six); move as few dated jobs as the rules need (head chef); never plan a job with no weight (skeptic, new starter); once a plan is saved, plan only the new job (skeptic); part 1, the nightly count, first (keeper, head chef, skeptic); every counted job can be marked Unable to complete (new starter). Nobody accepted the book's present rule for "who was on a section" as good enough for a record with names: the designs say "rostered", and keep names one tap behind.

The head chef's first ask was a button that plans days, and he asked for it to be "nice and well designed". So every design carries D1 to D8. The skeptic's "no Plan button until real weights exist" is treated as build order, not as a design without one.

Still open with the head chef, and drawn as words or settings he can change: whether the flag covers nightly Pack down (drawn: jobs that come round only), whether Sunday, Monday and Wednesday take heavy jobs (drawn: yes), who sets the day levels (drawn: the admin).

## The planner, with his day levels

`previews/planner.js`, a preview engine, 37 node checks. 2,000 seeded random weightings of the book's own lists (`previews/many.js`), each order compared with the plan that keeps every day:

| Order | A section's heaviest night heavier than with days kept | None heavier, some lighter | Heaviest section night, average | Dated jobs moved, of 15 | Kinds with a shared day | One job added after a save, planned again: a saved job moves | The same, planning only the new job |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Days kept | 0% | 0% | 4.8 | 1.8 | 60% | 0% | 0% |
| Kind first | 75% | 11% | 5.0 | 9.5 | 99% | 41% | 0% |
| Section first | 3% | 92% | 3.5 | 8.3 | 90% | 52% | 0% |
| Fewest moves | 0% | 89% | 3.8 | 2.8 | 82% | 11% | 0% |

Weights at random, kinds as one made-up example. A job fits no day in 105 of 2,000 runs. Fewest moves: a job that has a day keeps it unless its day does not take it; jobs with no day are placed section first; then one dated job at a time moves, only when its section's heaviest night gets lighter.

The pictures use one made-up set of weights and kinds (`previews/jobs.js`). On it, fewest moves moves 3 of 15 dated jobs and section first moves 10.

## The three designs

All three are drawn inside the book's real pages: the click-test stand-in opens the real page at `0acdaf72` (its top bar, tab bar, the chef's Cleaning page, the real Add and Edit forms, the admin panel's rail and Inbox), and the design's parts, built from the book's own classes, are put into it. Those parts do nothing when tapped. So the frame, the fonts, the form length and the colours are the Implemented app's; the new parts are Preview. Nothing was tapped, saved or timed. The people, counts, weights and kinds are made up.

**The same in all three**

- Nothing changes on a cook's page: `designs/cook-unchanged-390.png` and `-1280.png` (5 whole rows on the first phone screen, 52 rows, as today).
- A weight is Light, Medium or Heavy, in words. A job with no weight says "No weight yet" and is never planned.
- What each day takes is words: heavy, medium or light. Friday and Saturday together take at most a tenth of the week's jobs.
- A proposal says "Proposed, not saved". Nothing is saved until Save.
- The morning flag is one row in the admin's Inbox with a quiet button, "Not ticked", the section, the job and the date: `designs/ab-inbox-*.png`. It names no person.
- Results count jobs that come round. Names sit behind a button worded "Who was rostered". Unable to complete is apart and outside the counts. Shared kitchen has a line and no names.
- What a results page says when it cannot know: "Count not ready", "Not counted: Cleaning was switched off", "nobody was set on the plan".

### A. On the job (changes the least)

**Idea:** everything happens in the forms that exist. The book checks and suggests, one job at a time. It never moves a job.

- **Weigh:** in the job's own Edit form, under Repeat on: How long it takes, three chips. The kind is the existing Area or equipment box, retyped (the 21 section jobs hold a section name there today). `designs/a1-job-form-*.png`.
- **Plan:** the form's day chips say what that section already has each night, or what the day takes. A box says "Suggested: Wednesday" with the reason; the chef presses the day and saves as today. Repeat tasks gains a box "What each day takes" and a list "To look at": jobs with no weight, a heavy job on a medium day, jobs with no day. `designs/a2-repeat-tasks-*.png`.
- **Results:** the Inbox row opens that night in Reports, Records, which gains the jobs that come round by section. `designs/a3-records-day-*.png`.

### B. One list (rethinks the flow)

**Idea:** one view inside Repeat tasks, Weigh and plan. Every job that comes round is a row, by section; the plan lands in the same list as "now, was".

- **Weigh:** three chips and a kind picker (a short fixed list) on each row, one Save. `designs/b1-weigh-*.png`.
- **Plan:** Plan the days proposes with fewest moves. The page opens on a count ("8 changes: 3 jobs move, 2 new jobs get a day, 3 monthly jobs get a first date, 12 keep their day"), then only the rows that change, each with its new day, its old day, the reason, its state and a button to keep the old day. One Save, 5 at a time. `designs/b2-plan-*.png`. Part saved, with Saved, Not sent, Refused, Waiting and No day fits: `designs/b2s-saving-390*.png`.
- **Results:** the Inbox row opens a new Reports page, Cleaning (an eighth tab there): one row per section for the last 4 weeks, opening to each job with its dates and who did it. `designs/b3-report-*.png`.

### C. Set up once (removes the most friction)

**Idea:** a short run of steps on Repeat tasks while Cleaning is switched off. Once it is on, the steps go, and the job form suggests a day for each new job.

- **Weigh:** step 1, one section at a time, three chips and a kind picker on each row, Save and go to the next section. `designs/c1-setup-weigh-*.png`.
- **Plan:** step 2 says what each day takes. Step 3 shows the whole week by section: each night's weight points, was and now, and each job by day. Cleaning is off, so the book plans the whole week (section first, 10 of 15 jobs change day) and nobody waits. One Save, then step 4 switches Cleaning on and counting starts that night. `designs/c2-setup-week-*.png`. After that, Add cleaning task suggests a day and warns that today means tonight: `designs/c3-new-job-*.png`.
- **Results:** the Inbox row, and one line in the Inbox's Today's numbers ("Cleaning, Wednesday: 5 of 6 jobs that came round. Hot larder: 1 not ticked"). Both open that night in Records, as in A. No new report page. `designs/c-inbox-*.png`.

### How they differ

| | A. On the job | B. One list | C. Set up once |
| --- | --- | --- | --- |
| Where a job is weighed | Its own Edit form | A row in one list | A row in a setup step, one section at a time |
| The plan's unit | One job | The list of changes | The whole week, once |
| Who moves a dated job | Only the chef, by hand | The book proposes the fewest moves, any time | The book replans the week before switch-on; after that only the chef |
| Where results are read | Records, that night | A new Reports page, 4 weeks | The Inbox, then Records |
| New places | None | One view in Repeat tasks; an eighth Reports tab | A block on Repeat tasks that goes away |
| After Cleaning is on | The same forms | The same view | The job form only |

### Counts

390 x 844 and 1280 x 900. "Screens long" is the whole page against one screen. Frame: Implemented app. New parts: Preview. Taps are counted from the pictures, not exercised.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Weigh the 20 jobs that come round: taps | cannot | 60 (Edit, chip, Save each), plus finding each job 6 to a page | 22 (open, a chip each, Save) | 25 (a chip each, Save per section) |
| Set the kind on 20 jobs | cannot | retype Area in each form | 40 (picker, choice) | 40 |
| Get every job a day that fits, from weighed jobs | by hand in each form | 3 per job that needs one (Edit, the day, Save) | 2 (Plan the days, Save) | 2 (open step 3, Save) |
| Read why a section was flagged | cannot | 1 (the Inbox button), names 1 more | 1, names 1 more | 1, names 1 more |
| Whole job rows on the first phone screen while weighing | 0 | 0 (one job, in its form) | 1 | 1 |
| Screens long at 390: weighing | Edit page 3.3 | 3.8 | 4.7 | 3.5 |
| Screens long at 390: the plan | none | Repeat tasks 3.1 (today 2.5) | 3.2 (part saved 3.4) | 4.3 |
| Screens long at 390: results | Records day 1.3 | 2.0 | 1.8 | Records day 2.0; Inbox 1.4 (today 1.2) |
| Screens long at 1280: weighing, plan, results | | 2.9, 2.3, 2.5 | 2.7, 2.4, 1.5 | 2.5, 3.2, 2.5 |
| Controls under 44 px | | 0 | 0 | 0 |
| Lowest text contrast, rendered | | 4.86:1 | 4.76:1 | 5.05:1 |
| Lowest control edge against its surround | | 15.9:1 | 4.84:1 | 4.84:1 |
| Keyboard focus, reached with Tab | | 3 px ring, 3.33:1 | 3 px ring, 3.33:1 | 3 px ring, 3.33:1 |
| Navigation levels to the plan | | Cleaning, Repeat tasks, Edit | Cleaning, Repeat tasks, Weigh and plan | Cleaning, Repeat tasks |
| Build size, pull requests | | 3 | 4 | 4 |
| Relearning | | Least: the same forms | A new view | A one-off run of steps |
| New reads or rules | | Rules: weight and kind on a job, one day-levels record | The same, and a plan saved in steps | The same, and a plan saved in steps |
| Main risk | | Slow: 60 taps, and no bulk plan | A part-saved plan; the longest list | The whole week replanned on made-up weights; nothing plans in bulk after switch-on |

Contrast is the lowest of the text a design added, measured on the rendered page with ancestor opacity. Dark mode: the book has none. Reduced motion: the designs add no motion. 768 px was not taken.

### What is not drawn, in any design

- Part 1, the nightly count: it has no screen.
- Changing what a day takes (the seven rows of chips behind "Change").
- The kind picker open; a monthly job's date picker.
- A lock or a reload with a proposal on screen; the page after the day changes under a proposal.
- A cook's Cleaning row in the week a job moved.
- The Records day's Print and CSV with the new lines.
- An empty list and a failed read on the Weigh and plan view (B) and the setup steps (C).

## What to answer

As the skill asks for round 2, under 300 words (the skeptic's and keeper's tables and the designer's notes may run over):

1. Do the three designs differ structurally, not just cosmetically?
2. Rank them best first, with a strength and a weakness each.
3. For each of A, B and C, name a part to take or reject, with a reason and the app principle it serves.
4. Could a blend of all three beat your preferred single design? Name conflicts and added cost.
5. One clear recommendation and its main downside.
6. Contract fit: Works, Needs work, Not evidenced or Not relevant, with your strongest evidence or unresolved issue.
7. Skeptic and keeper: up to three Break-it scenarios as a table, with the evidence label.

Say what you opened, what you ran, and what is Not evidenced. Plain Australian English, no em dashes.

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

### Compare a mix

For three options, assess **A + B + C** explicitly even if the final recommendation is one design or a two-way mix. With another requested count, consider contributions from every option. Record a compact table: source design and part, take or reject with reason, useful app principle, kitchen benefit, interaction conflict or extra cost, and evidence. Do not force a contribution from every design if it creates clutter, duplicate controls, incompatible save steps or extra taps. Explain why a pure or two-way option beats the all-three blend when that is the conclusion.

A recommended mix needs **one coherent combined preview** before the head chef chooses. Keep the original designs and their rankings beside it. Measure the mix's own taps, visible lines and affected states; apply the same contract and reference checks, including colour rules. Do not average or copy component scores, claim inherited agreement, or call a montage a tested workflow. Mark missing evidence Not evidenced.

Label the combined proposal's review status. A lead synthesis is not automatically a council-endorsed design. If the blend introduces a flow or risk not covered by the original reviews, get a focused follow-up from the relevant existing reviewers on the combined preview and evidence. Record their actual findings and remaining disagreement. This completes round 2; it does not add a new full council round or rerun round 1.
