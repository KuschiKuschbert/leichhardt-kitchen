# Section cleaning: round 2 reviewer packet

25 November 2026. Source commit `27ae8275`. The same packet goes to all six reviewers. It holds no recommendation.

## What you are judging

The head chef gave a written cleaning list for Grill, Pans, Fryers with salads and dessert, and Hot larder, and asked for it to go into Cleaning for each section, "nice and well designed". Round 1 said Build smaller, five of five: only the jobs not already in Pack down, one tap each, with how often a job comes round said in words, and headings that tell a section's own clean from its Pack down. The list and round 1 are in `docs/cleaning-sections-options/proposal.md` and `docs/cleaning-sections-options/brief.md`. Read both.

Round 2 asks how those jobs should read on the staff Cleaning day. Three designs, A, B and C, are below. The head chef has not yet answered the open questions in the proposal, so the previews hold only jobs whose day he gave.

## Files to open

All under `docs/cleaning-sections-options/`. Open the images: they are the evidence.

- `index.html`: the page the head chef sees, with the designs side by side.
- `previews/baseline-today-390.png` and `-full.png`: today's page, no new jobs. `previews/typed-390.png` and `-full.png`: the eight new jobs added as ordinary cleaning tasks, with no change to the page.
- `previews/a-390.png`, `b-390.png`, `c-390.png`, each with `-full.png`, and `c-rest-390.png`. Wide screen: `a-1280.png`, `b-1280.png`, `c-1280.png`.
- `previews/measurements.json` and `previews/build.cjs` (how each preview was made).

## How the previews were made, and their limits

Preview, not Implemented app. The real Cleaning page ran on the click tests' Firebase stand-in at commit `27ae8275`, as a line cook who chose Grill in the book's own Your section today sheet, on a synthetic Monday 30 November 2026 at 14:00, at 390 x 844 and 1280 x 844, with Barlow, Barlow Condensed and Caveat loaded. Both built-in lists were loaded (26 general tasks, 25 Pack down steps). Eight new jobs were seeded as ordinary cleaning tasks: three Monday jobs, four nightly jobs and one job every 28 days whose start date is an example. A script then moved the real rows into each layout and reworded the small line. The header, tab bar, rows and tick boxes are the real ones.

Not exercised in any preview: opening a closed row in C, ticking, Undo, a held or refused save, no signal, Extra large text, dark mode, keyboard focus, contrast, 768 px, a cook with no section, a day with no weekly job, and a chef's view. The folds in C use preview-only styles copied from the chef page's `.cln-fold`.

Observed while building, in the stand-in:

- Once the head chef has set kitchen sections, the book asks staff and leads Your section today once a day after the PIN, on whatever page is open (`ksCheck()` in `js/prep.js`). That is today's behaviour and does not depend on cleaning tasks. Today's Cleaning page does not use the chosen section to order or fold anything.
- Seven of the eight new jobs draw as a one-tap tick box. The 28-day job draws as a row that opens its details first, like the built-in tasks.
- On today's page four small lines are already cut off with an ellipsis at 390 px (Food labels, Mixers, Bench tops, Floors). In the previews a row that says how often is allowed to wrap, so its state is not cut off.

## The three designs

The same task for each: a Grill cook at close on Monday ticks "Clean the drawers" (Every Monday), then works through Grill pack down, then ticks a Shared kitchen job.

**A. Same page, clearer rows.** The page keeps today's order and has no folds. Each section's own clean is its own group, headed "Grill: section clean", ahead of Shared kitchen. Pack down groups are headed "Grill: pack down". A job that is not nightly says how often on its small line, before the state: "Every Monday", "Every 4 weeks", "Mon, Wed, Fri". New nightly jobs say "Every night". Build: the weekday jobs can be typed in with Add cleaning task today; the code is the wording, the headings and the monthly jobs.

**B. Today only, on top.** The page is ordered by how often, not by section. A first group, "Today only", holds every job due today that is not nightly, from every section and from the existing lists, each row naming its section and its rhythm: "Grill · Every Monday · To do today". Under an "Every night" title the nightly lists follow as today, and a section's new nightly jobs join that section's Pack down group. Fryers, salads and dessert gets a Pack down group of its own for its one nightly job.

**C. My section first.** The page is ordered by person. It opens on the section the cook chose today: a "Grill" title, then "Section clean", then "Pack down", all open. Under "Rest of the kitchen" every other section, Shared kitchen and Floors after shelving are one closed row each, with a count and Show, that opens in place. Rhythm words as in A. A cook with no section today sees everything open, as in A.

How they differ:

| | A | B | C |
| --- | --- | --- | --- |
| Ordered by | Section, as today | How often the job comes round | The cook's own section |
| A section's weekly job sits | In its own group at the top | With every section's weekly jobs, first | With that section's Pack down |
| Disclosure | Everything open | Everything open | Own section open, the rest closed rows |
| Go to Pack down link | Kept | Kept | Kept in the preview; Pack down is no longer one block |
| New structure on the page | Group names only | One new group and one new title | Closed rows on the staff page; uses the chosen section |

## Measured on the previews (390 x 844, Preview)

Corrected after the reviewers were briefed: Today's first screen holds 5 whole jobs, not 6 (the first count did not take the tab bar off), and Grill pack down is 2.9 screens down today. The reviewers saw 6 and "not measured". The sheet line above was also corrected: they were told the sheet opens because section-owned cleaning tasks are loaded. And the 28-day job's box is a one-tap box by source (`flow-quick` in `js/cleaning.js`, not exercised); only its words open the method. The line above saying it opens its details first is wrong.

| | Today | Typed in, no change | A | B | C |
| --- | --- | --- | --- | --- | --- |
| Jobs on the page | 46 | 54 | 54 | 54 | 54 (10 open) |
| Whole jobs on the first screen | 5 | 4 | 4 | 4 | 4 |
| Page length in phone screens | 4.9 | 5.7 | 5.7 | 5.7 | 2.2 |
| Screens down to "Clean the drawers" | not in the book | 0.7 | 0.7 | 0.6 | 0.6 |
| Screens down to the first Grill pack down step | 2.9 | 3.7 | 3.8 | 3.6 | 0.7 |
| Small lines cut off | 4 | 4 | 4 | 4 | 0 on the open rows |
| Sideways scroll | No | No | No | No | No |
| Buttons under 44 px in the list | 0 | 0 | 0 | 0 | 0 |

Taps, by reading the previews, not exercised: ticking one of the cook's own new jobs is 1 tap in A, B and C. Ticking a Shared kitchen job is as today in A and B, and one more tap in C to open Shared kitchen first.

## Feature contracts

The proposal's section "Current contracts the reviewers must respect" quotes `docs/cleaning-schedule.md` and `docs/cleaning-chef-options/implementation.md`. Read it. Three more lines:

- `docs/colour-coding.md`, Cleaning row: "Green means done; pending explicitly says Not sent; Missed, Due and not-due dot have distinct words. Use shared failure red for errors and retain the chosen attention treatment for missed work. Preserve the today tint, week legend, repeat schedule and release toggle."
- `docs/surface-colours.md`: "Prep, Orders, Chef to-do, Drinks run, Cleaning and general work blocks share the work family."
- `CLAUDE.md`, coding rules: "Staff pages show today."

The Cleaning notebook pattern, from `docs/design-patterns.md`:

## Cleaning notebook (8 November 2026)

The staff daily list uses `.cln-page`, `.cln-book` and `.cln-row` inside the existing `.nb-wrap` notebook. Keep the common `.nb-title`, `.nb-t`, `.nb-meta`, tick SVGs and warm-paper colour tokens. Staff section headings identify responsibility; area and confirmed worker/time share the existing metadata line, so a tick does not change row height. `.cln-form` uses normal fields, shared picker enhancement and Save / Saved / Try again states. The shared-device worker picker reuses `.sheet.pt-sheet`. The whole page is lazy and contributes no startup reads. The original `.cln-matrix` styles remain compatible with older saved copies; the chosen chef layout below replaces that matrix.

The 9 November M1 chef layout scopes its additions to `.cln-chef-page`. `.cln-fold` and `.cln-fold-toggle` show named work groups and selected-date summaries; one group opens with six ordered tasks per page. Week uses the same groups and `.cln-day-pick` at every width. The `.cln-repeat-browser` keeps global search, Add and paging before the current task list. `.cln-repeat-layout` places each `.cln-template-summary` in the first grid column and the one real `.cln-editor` in the second from 1000 px. Below that, the same form sits directly after its selected summary. An editor outside the filter/page stays visible with explicit context. This bounded Cleaning pattern preserves task order rather than using the admin table's expanding Show all behaviour. It reuses the existing notebook fields and recording paths, with no new page or backend read. [Chosen contract and verification](cleaning-chef-options/implementation.md).

The 9 November schedule extension keeps methods and required checks in inline `.cln-detail` disclosures, opened by the native `.cln-task-detail` title/metadata button, with one `.cln-occurrence` per fixed checkpoint or recorded event. `.cln-checks` uses full-height labels around checkboxes. The existing row stays compact until opened. Simple jobs retain one-tap recording; checked jobs save or record explicitly, and blocked/Pass states use words. Both `.cln-import` disclosures belong in the existing chef setup. `.cln-packdown` uses `.cln-packdown-title` and the existing section headings to preserve Hot larder, Grill and Pans order before the final-floor row. `.cln-temperature` keeps a compact reminder with expanded explanation and no fabricated status. No new overlay, page or service navigation control is introduced. See `docs/cleaning-schedule.md`.

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
