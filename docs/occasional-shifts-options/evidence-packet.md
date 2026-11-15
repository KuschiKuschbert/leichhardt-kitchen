# Evidence packet: occasional shifts on Today's team

Shared by every reviewer, both rounds. Source `main` at `da18bf7`, 15 November 2026. Read it with [the proposal](proposal.md) and the screenshots in this folder.

## The service rules (head chef, 5 Nov 2026)

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Today's team is a planning page used by the head chef and sous chefs before service, not a service list. Staff see their own day on Home.

## Today's team contracts (docs/design-patterns.md, current)

- **A day grid with focused details** (Today's team, the mix chosen 15 Nov 2026, replacing the C row's Service to edit and Section pair; [brief](team-sections-options/brief.md)): `.tm-focus-page` extends the shared `.tm-notebook`. `.tm-people.tm-grid` is one set of columns, people down and the services worked that day across (Lunch and Dinner first, `tmServiceChoices()`). Each `.tm-person-row.tm-grid-row` shares those columns (CSS subgrid), so a long name widens the name column for every row and wraps only between words. `.tm-grid-head` names each service with its hours and counts, in plain ink, how many still have no section (`.tm-grid-sh`, `.tm-grid-count`; chefs read Head chef or Sous chef and are not counted); it stays in view under a bar that sticks to the top (`--tm-grid-top`, measured). `.tm-grid-who` holds the name and the worded `.tm-grid-brk` Breaks action with the break times. `.tm-grid-cell` holds one shared picker keyed `tm-sec:<id>:<sh>`, bound to its person, date and service; the usual section (or, with none, the section they worked most on that service in the 30 days, "Often", at least 3 days and no tie) and the person's section on an earlier service are offered first inside it, never filled in by themselves, and only from nightly counts made today or yesterday (`tsFresh()`); No section (or a chef's role) has a dashed edge. `.tm-grid-off` says Off where the person does not work. With three or more services below 600 px the name and Breaks take their own line. Notes span the row (`.tm-grid-note`); a full-width part of a row has `contain: inline-size` so it cannot widen the name column. One `.tm-detail-workbench` names person, service and date; its `.tm-bench-shifts` chips choose the service (a view choice; it opens on the service on now or next); it moves beside `.tm-focus-grid` from 1100 px or into its row on smaller screens, keeping the tapped row in place, the real controls, values and focus. Search finds a name or a section on any service and must retain that editor. `.tm-focus-save` is the one dated Save; its words name who still has no section. `.tm-live-strip` retains today's saved names and return times. Keep Add staff, usual defaults, Whole day, copy/Spread, dated drafts and canonical save/access/recovery helpers. [Earlier C contract](team-page-options/implementation.md).

- **An explicit group start** (Today's team, requested 9 Nov 2026): `.tm-quick-add` keeps Who's working? inline, with labelled checkbox groups `.tm-quick-people` and `.tm-quick-services`. No staff starts checked; the current configured service is visibly checked. Add selected staff adds only that group to the draft, preserving existing assignments, then the chooser can reopen for another group. Do not save automatically or assume all staff work. Keep unfinished choices private and separate by date/shift, protected through same-person lock recovery and reload guards, and cleared on handover. Retain 44 px checkbox labels and keyboard focus. [Contract and checks](team-tidy-options/brief.md#whos-working-and-independent-break-spacing).

- **Fill from roster file** (Today's team in the admin panel only, chosen 14 Nov 2026; `docs/roster-import-options/brief.md`): `.tm-roster` sits in its own grid row below the Copy a day fold (`grid-area: roster`), so it stays in view when the selected date changes. It reuses the `.tm-same` row for Choose roster file, says what was filled in words (Draft, Saved, Not changed), lists people not in the book in `.tm-roster-missing` with the name the book looks for, a Link to picker for a nickname (`.tm-roster-link`) and Manage staff, keeps the saved name links in the `.tm-roster-links` fold with Unlink, and gives one `.chip` per filled day in `.tm-roster-days` (a chip selects that date like the week list). A filled row says its roster time in `.tm-roster-time` under the name. Nothing saves by itself: Save the N filled days (the shared `svButton()`, form key `rs`) saves every filled draft in one all-or-nothing batch, or each day is opened and saved on its own.

Built departure (docs/team-sections-options/brief.md, Built, 15 Nov 2026): "A service nobody works that day has no column (a 12-service stress test made 12 columns on a phone). The details panel still offers every service."

Shifts (docs/todays-team-options/brief.md, 7 Nov 2026): set up once by the head chef in Admin, Kitchen, Shifts: add, rename and remove the kinds of shift (Lunch, Dinner, Smoker, anything else), each with optional From and To. Renaming keeps its history; a removed shift is kept and marked off, like a section. Saved with Save changes, by the verified admin only. Shifts and Lunch/Dinner order: only Lunch and Dinner sort first; other configured shifts keep their saved order.

## Access (docs/private-kitchen-access.md, firestore.rules)

- `config/main` (where `kitShifts` lives, each `{ id, name, from, to, off }`): written by the verified admin (the head chef's Google identity plus a live head-chef PIN session on that device). Sous chefs cannot change it.
- `team/<day>` (`{ day, on: [{ id, sh, sec }], br, v, at, upd, by }`): written by the head chef, the sous chefs (own PIN) and the admin, version-checked; the rules list the allowed keys, so a new field needs a rules change.
- Every signed-in kitchen session reads `team/<day>` (staff see their own day).

## Surface colours (docs/surface-colours.md)

## Selected design

Colour identifies an existing book or block through its cover, header, spine or quiet edge. Warm paper remains inside for reading and writing. Use purpose consistently across pages: steel for work, sage for people, charcoal for current live boards and bands, and quiet ivory for reference and forms. **Orders uses steel.** The amber Orders identity shown in the original B preview was not selected.

Amber belongs to named attention or pending work; green confirms the stated success; red identifies errors, invalid entries and existing destructive or adverse actions. Keep the words, icons, ticks, pressed states and confirmation timing. A sage people book never means that the whole plan is Saved.

| Role | Shared surface token or treatment |
| --- | --- |
| Work covers, headers and edges | `--surface-work: color-mix(in srgb, var(--steel) 65%, var(--paper))`; `--surface-work-edge: #A9AFB6` |
| People covers, headers and edges | `--surface-people: #EAF5EE`; `--surface-people-edge: #8AA391` |
| Reading and writing interiors | `--surface-paper: #FBF8F1` |
| Reference, form and quiet information surfaces | `--surface-reference: #F2EFE8` |

Today's team is a people book: sage cover. A sage surface or a green draft assignment is not Saved.

## Action feedback (docs/action-feedback.md)

## The rule

1. **Answer in the tap's own frame.** Something changes before the server is asked. A list line (add, tick, remove on Prep, Orders, Wastage, Transfers) shows at once with its slip, as since 4 Nov 2026; while the write waits, the line says Not sent and the floating band says Not sent yet. A form's Save button says Saving... at its own width (`svButton()`) and shows Saved, Sent or a green tick only once the write resolved: an answer from the cache, or a listener hearing this phone's own pending write, is not Saved (CLAUDE.md, Changes that went wrong before).
2. **Confirm where the eye is, in words.** Words say what changed and where: "Added Slice tomatoes to Sauce", "Saved 14:02. The sous chefs see the new cut-offs now.", "Undone: Slice tomatoes". Never "Added", "Done" or "Saved" alone when the thing has a name. A confirmation is never only a small grey line, never only at the top of a page whose button is lower down, and never behind an open sheet.
   - **A form's Save, Publish, Record or Send button** uses `svButton()` with `svStart()`, `svDone()` and `svFail()` (`js/prep.js`): Saved with a tick for 1.2 s once the write resolved, one waiting line after 4 s, Try again with a red line that stays. Lazy pages that cannot reach it keep their own button but follow the same four states, words and classes (`saveBtnHTML()` in `js/manage.js`).
   - **A button that changes while someone types** is changed in place with `btnPatch()` (`js/prep.js`, also `LK_PREP.btnPatch`), never replaced: leaving a box by tapping the button fires change between finger down and finger up, and a new element there loses the tap.
   - **An add, tick, remove or change on a list line** uses the docket slip (`toast()`), with Undo where the change can be undone.
3. **Clear the old words.** Once Saved shows, anything that belonged to the unsaved form goes or turns off: Undo unsaved changes, "Save to make the change", a Tap again still armed.

## Current design contracts (from the council skill)

## Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references and Try to break it below. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../../../docs/surface-colours.md#selected-design), [operational colour meanings](../../../docs/colour-coding.md#shared-meanings) and [design patterns](../../../docs/design-patterns.md). Include the affected category exceptions, plus [action feedback](../../../docs/action-feedback.md#the-rule) and [loading and motion](../../../docs/loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

### Colour and state checks

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

## Design references

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

## Try to break it

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
