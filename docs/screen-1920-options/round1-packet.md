# Round 1 packet: the council on the 1920 screens (26 Nov 2026)

Pasted from `.claude/skills/service-council/SKILL.md`, `reviewers.md` and `docs/design-patterns.md` at the commit this file was written. Read with [the proposal](proposal.md), the [step 2 packet](../device-coverage/step2/packet.md) (screens, decisions already made, metrics) and the [step 2 findings](../device-coverage/step2/findings.md), and [taps.json](taps.json).

## The service rules

Every proposal and every design is checked against these (head chef, 5 November 2026; also in `CLAUDE.md`):

1. The main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab.
2. No new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK.
3. Nothing appears over a list during service unless it stops a mistake.
4. A change that adds taps or takes away visible lines says why it is worth it.

Count, do not guess: the taps for the main task, and the list lines visible on a 390 px phone, before and after. Measure them in the click-test stand-in (`tests/`, `tests/fake/`) or a preview, and say how.

## Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references, Try to break it and Where it goes below, and paste the [Where it goes rule](../../../docs/design-patterns.md#where-it-goes-and-how-loud-it-is) and the [design misses](../../../docs/design-misses.md) as excerpts for any change people will see. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](../../../docs/surface-colours.md#selected-design), [operational colour meanings](../../../docs/colour-coding.md#shared-meanings) and [design patterns](../../../docs/design-patterns.md). Include the affected category exceptions, plus [action feedback](../../../docs/action-feedback.md#the-rule) and [loading and motion](../../../docs/loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

### Colour and state checks

| Check | Evidence the council needs |
| --- | --- |
| Surface purpose | Work books, including Orders, use steel; people use sage; current live boards use charcoal; reading and writing stay quiet paper. Check the actual cover, header, edge and interior, not just a palette. |
| State meaning | Local state cues take priority over surface decoration. Attention/pending, confirmed success and failure follow the operational contract. Keep brand/action orange, charcoal Prep Urgent and explicit inclusion/assignment meanings. A sage people surface or green draft assignment is not Saved; neutral upcoming information is not automatically amber. |
| Words and exceptions | Status remains understandable through words, icons, ticks or pressed state without colour. Preserve affected category legends, charts, heat scales, allergen certainty, New/Moved tags, art, celebrations and print. Colour does not establish access or food safety. |
| Real contrast | Measure the rendered foreground and background, including ancestor opacity and light/dark variants: normal text 4.5:1, large text 3:1, meaningful control/state boundaries 3:1 where applicable. Check visible keyboard focus; do not infer a whole-app accessibility pass from token values or screenshots. |
| Relevant states | Show the affected ordinary, selected, disabled, saving/Not sent, Saved, empty and failure states. Distinguish confirmed empty data from a failed read. Exercise acknowledgement, retry and work recovery where affected; list states that do not apply. |
| Service continuity | Measure visible rows, tap targets and main-task tap counts before and after at the relevant widths: 390 px, 768 px and 1920 x 1080 with touch for service pages (a phone, the kitchen tablet, a section screen; confirmed 26 Nov 2026, [device coverage](../../../docs/device-coverage.md)), 1920 x 1080 for Functions (the front of house screen), 1280 px and 1920 x 1080 for admin pages and anything else used on a laptop; say why a width is skipped. Justify lost rows or added taps under the service rules. Keep controls stable through state changes; useful motion respects reduced motion and cannot imply completion or move a live target. |

Round 1 identifies contract risks and the evidence the designs will need. Round 2 records **Contract fit** alongside the reference comparison: **Works**, **Needs work**, **Not evidenced**, or **Not relevant** with a reason, source and evidence for each applicable check. The quick check needs only a short contract-fit note and the relevant evidence. Untested states and contrast remain Not evidenced. Identify the check needed before calling the implementation ready; do not add a review round for missing measurements.

Label measurements as **Preview** or **Implemented app**, with the source commit, role, viewport, fixture and font conditions. A schematic that omits the app header, reminders or full form fields cannot establish delivered density or task cost. Before marking a layout change ready, remeasure the complete implemented app at the relevant widths with its actual shell, full forms, representative data and states. Record any difference from the chosen preview, including extra scrolling, fewer visible lines/groups or added taps. Also walk the flow in the implemented app at those widths with a busy-day fixture and answer the Where it goes questions: a layout can measure well and still be too loud, too crowded or in the wrong place, and this is the one point that sees the real app. Material departures from the approved design return to the head chef under the existing design-choice rules; do not rerun the whole council for routine verification.

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

## Where it goes, and how loud

Head chef, 26 November 2026 (`docs/head-chef-decisions.md`). Changes were being reworked after a bit of use: too loud, too crowded, or in the wrong place (a line where a sheet was needed, a sheet where a line would do). The council now has a UX and interaction designer for this, and every change people will see answers these questions. The rule is [Where it goes, and how loud it is](../../../docs/design-patterns.md#where-it-goes-and-how-loud-it-is); the real cases it comes from are in [design misses](../../../docs/design-misses.md). A quick check answers them itself; round 2 gets them from the design frame and the UX designer.

| Question | What the council checks |
| --- | --- |
| Placement | For each new piece: inline, fold, sheet or modal, or its own page? Why that one, and not the one above or below it? A sheet or pop-up on a service page is a request for the head chef's OK (service rule 2): say so in the recommendation. |
| Loudness | What is the loudest thing on the screen, and what does missing it cost: a mistake, a deadline, or nothing? Loud has to earn its place by that cost. Too quiet is a miss as much as too loud. |
| Crowding | Is any fact shown twice? Does an empty or rarely used piece take room on the everyday path? What does the opening screen of a 390 px phone show on the busiest day (a long list, a band, a due cut-off)? |
| Devices | A phone (390 px, personal), the kitchen tablet (768 px), the five section screens (21 to 24 inch, touch, one in every section, everyone's main work screen all shift, read from the bench; 1920 x 1080 at 100 %, touch and a mouse, read 26 Nov 2026), the front of house screen for Functions (1920 x 1080), and for admin the head chef's computer (1920 x 1080, mouse) and a laptop (1280 px), as in [device coverage](../../../docs/device-coverage.md): is it the same flow, with the room used to show more, not to move a main job? Can the section screen be read from where the cook stands? Which widths were measured, as Preview or Implemented app? |
| Fiftieth use | The first use is not the test. After a week of service, what gets in the way: an extra tap, a prompt, a band that never clears, a loud thing that is usually nothing? |

Judge from the evidence. This is role-based analysis, not research with staff: say so, and do not claim a feel the council did not see in the implemented app.

## Shared opening (every reviewer)

> You are one reviewer on the Leichhardt Hotel kitchen's council. The Kitchen Book is the kitchen's web app on phones, the kitchen tablet, five 21 to 24 inch touch section screens (one in every section, everyone's main work screen all shift, read from the bench), a front of house screen for Functions and a laptop: recipes, the prep list, orders, wastage, transfers and the head chef's admin panel. Staff use it during a busy service. Be critical: your job is to find what is wrong, unneeded or slow, not to agree. Judge only from the evidence given. Where it is not enough to judge, say so instead of guessing.
>
> The service rules: (1) the main job of each work page (add a line, tick a line, find a recipe) is one tap from its tab; (2) no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; (3) nothing appears over a list during service unless it stops a mistake; (4) a change that adds taps or takes away visible lines must say why it is worth it.
>
> Apply the supplied design references where they help this task. Challenge the proposal's selection if a useful principle is missing. Judge the kitchen benefit and evidence, not resemblance or the number of apps copied. Current contracts and the head chef's chosen designs win. Name a useful or rejected principle in your reasons, or say why none applies. Treat untested interactions as Not evidenced, never as a pass from a screenshot.
>
> Check the supplied current contracts from your perspective, including surface purpose, status meaning and non-colour cues. Flag missing source excerpts or evidence. Distinguish a proposed change to an approved rule from a violation. Your preference score cannot excuse either. Include a short Contract fit result and its strongest evidence or unresolved issue in your answer.
>
> Distinguish Preview measurements from Implemented app measurements. A schematic may omit the real shell or full form. Flag the complete-app checks needed before release instead of carrying preview density or tap claims into the implementation unverified.
>
> Answer in plain Australian English with no em dashes: under 200 words for round 1, under 300 for round 2.
> - Round 1: Verdict (Build, Build smaller, Don't build or Your call), your three main reasons, and the one change that would most improve it.
> - Round 2: first say whether the designs differ structurally, not just cosmetically. Rank them best first with a strength and weakness each. For every supplied option (normally A, B and C), name a part to take or reject with a reason and the relevant app principle. Explicitly assess whether blending all supplied options could beat your preferred single design, including conflicts or added cost. Finish with one clear recommendation and its main downside. Use the supplied evidence and contract fit, not app resemblance or an assumed consensus.

## Where it goes, and how loud it is

**Head chef, 26 November 2026.** Several changes were reworked after a bit of use: too loud, too crowded, or in the wrong place ([the cases](design-misses.md)). This adds no class and no colour. It says which existing piece to reach for, and the service council answers it for every change people will see (`.claude/skills/service-council/SKILL.md`, Where it goes).

- **Inline is the start.** The main job of a work page is on the page, one tap from its tab (service rule 1). A new piece goes inline first and moves only for a reason below.
- **A fold** (`.tm-fold`, `.o-cut-fold`): detail a cook wants sometimes, not at every glance. The closed line still says what is inside and anything that needs action. Never fold what stops a mistake. A card that already holds the whole thing has no second copy behind a fold (On today, 10 Nov 2026).
- **A bottom sheet, a centred modal from 768 px** (`.nt-wrap`, `ModalFrame()`, `.ux-picker`): a side task with its own choices, or a form, that the cook finishes or cancels and then lands on the same list; or a long list of choices. On a service page a new sheet or pop-up needs the head chef's OK (service rule 2) and does not open over a list unless it stops a mistake (rule 3). A council recommendation for one is that request.
- **Its own page** (a route in CLAUDE.md, Routes): a task with more state than one screen holds, that a person leaves and comes back to, that needs Back and a link, or that is admin work.
- **Loud is for a consequence.** The loudest thing on a screen is what costs a mistake or a missed deadline if it is missed (the amber Too few band, a due cut-off). Everything else is quiet paper and words, while approved celebrations, the mascot, Saved and New stamps, brand orange and the colour contracts keep their own rules. Red stays for a failed Save. Too quiet is a miss as well: the Too few warning was made louder on 16 Nov 2026. Colour meanings stay in [colour-coding.md](colour-coding.md) and [surface-colours.md](surface-colours.md).
- **Say it once.** A fact appears once on a card. A board with nothing on it hides (the empty current-break board). A choice most days never need is off the everyday path (a hidden shift).
- **Check the opening screen on the busiest day** at 390 px: a long list, the functions strip, a due cut-off. If the work is pushed down to one line, slim the band, not the work (Prep, 19 Nov 2026).
- **Devices.** A phone (390 px, personal), the kitchen tablet (768 px), the five section screens (21 to 24 inch, touch, one in every section, everyone's main work screen all shift, read from the bench; owner 11 Nov and head chef 26 Nov 2026), a front of house screen for Functions (1920 x 1080), and for admin the head chef's computer (1920 x 1080, mouse) and a laptop (1280 px). The phone is the design width, but the section screens are where most service work is read. They are 1920 x 1080 at 100 % with touch and a mouse (read 26 Nov 2026), and the page stops at 1240 px, so about 340 px each side is empty there ([device coverage](device-coverage.md)). From 768 px a sheet is a centred modal, and a wider screen uses its room to show more at once (the Search and Show chips share a row from 1100 px), never to move a main job. A wide screen is not a mouse: mouse-only behaviour stays behind `(hover: hover) and (pointer: fine)`. Measure service pages at 390 px, 768 px and 1920 x 1080 with touch, Functions at 1920 x 1080, and admin pages at 1280 px and 1920 x 1080.
