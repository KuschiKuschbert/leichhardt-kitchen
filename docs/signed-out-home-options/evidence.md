# Evidence packet: signed-out Home (round 1)

Source commit `bb89126` (main, 15 Nov 2026). Excerpts copied verbatim from the files named. Screenshots in `baseline/` are the implemented app in the click-test stand-in (synthetic people Sam, Ann, Bo; fake Firebase; 14:00 Queensland).

## Council skill: Current design contracts, Design references, Try to break it
From `.claude/skills/service-council/SKILL.md`.

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


## Shared surface colours (selected design)
From `docs/surface-colours.md`.

## Selected design

Colour identifies an existing book or block through its cover, header, spine or quiet edge. Warm paper remains inside for reading and writing. Use purpose consistently across pages: steel for work, sage for people, charcoal for current live boards and bands, and quiet ivory for reference and forms. **Orders uses steel.** The amber Orders identity shown in the original B preview was not selected.

Amber belongs to named attention or pending work; green confirms the stated success; red identifies errors, invalid entries and existing destructive or adverse actions. Keep the words, icons, ticks, pressed states and confirmation timing. A sage people book never means that the whole plan is Saved.

| Role | Shared surface token or treatment |
| --- | --- |
| Work covers, headers and edges | `--surface-work: color-mix(in srgb, var(--steel) 65%, var(--paper))`; `--surface-work-edge: #A9AFB6` |
| People covers, headers and edges | `--surface-people: #EAF5EE`; `--surface-people-edge: #8AA391` |
| Reading and writing interiors | `--surface-paper: #FBF8F1` |
| Reference, form and quiet information surfaces | `--surface-reference: #F2EFE8` |
| Current live boards and bands | Existing charcoal with readable light text and local state accents |
| Attention, pending, confirmed success and error | Shared operational tokens in [colour coding](colour-coding.md), with explicit state words |

Prep, Orders, Chef to-do, Drinks run, Cleaning and general work blocks share the work family. Team and people blocks share the people family. Functions retain quiet card bodies and charcoal current-service strips. Recipes, instructions and form fields retain quiet paper. Home keeps its approved staff-first layout and familiar purpose surfaces; its attention board remains distinct from the personal charcoal board.

Local state meaning takes precedence over surface decoration. Failed reads, Not sent, Saving, Saved, unset, unavailable and confirmed empty records retain their different wording. Neutral information does not acquire attention styling merely because it is upcoming. Existing explicit assignment/inclusion green retains its label and does not acknowledge a save.

Preserve the existing meanings of category palettes, chart series, heat scales, roster timeline segments, allergen certainty, function New/Moved tags, drawings, seasonal art and print. Keep the named charcoal Prep Urgent treatment. No broad surface selector may recolour those meanings or imply that food is safe.


## Design patterns: The look
From `docs/design-patterns.md`. (The Home board, staff-first Home and named heading rows apply to signed-in Home; quoted for context.)

## The look


- **Colours** are tokens in `:root` in `css/app.css`, never a new hex in a rule: `--ink` (text, rules), `--paper` and `--bg` (surfaces), `--muted` and `--faint` (quiet text), `--line` (dividers), `--accent` and `--accent-ink` (the book's orange), `--tag` (needs attention: a filled chip, a due line), `--done` and `--done-ink` (saved, ticked), `--bar` and `--bar-text` (the dark top bar and tab bar).
- **Operational colours** (whole-app council, 9 November 2026): retain orange for actions, selected notebook controls and attention, green for completion or explicit assignment, and neutral charcoal/grey for ordinary information. Use `--bad-ink` and `--bad-tint` for failed reads/writes, invalid entries, cancellation and destructive actions. On charcoal use `--bad-on-dark` and `--done-on-dark` so status text stays readable. Colour always accompanies existing words, ticks, pressed states or outlines; an assignment in a draft is not a confirmed save. Preserve the named charcoal Urgent flag. Claimed Prep work keeps full text contrast, with the claimant's neutral badge and name. Food drawings, allergen certainty, wastage reasons, chart scales, seasonal art and approved card surfaces have separate meanings. See [the inventory and council](colour-coding.md).
- **Surface colour** (owner-approved hybrid, 9 November 2026): coloured covers, headers and spines identify purpose while writing areas stay quiet. Use `--surface-work` and `--surface-work-edge` for work, including Orders; `--surface-people` and `--surface-people-edge` for people; `--surface-paper` for interiors; and `--surface-reference` for quiet reference and forms. Current live boards and bands retain charcoal. Home retains its approved purpose surfaces. These surface identities do not imply due, done or Saved. Preserve category, chart, art and print palettes. [Chosen contract, council and exceptions](surface-colours.md).
- **Attention and outcome fills** remain local: the top bar chip until today's team is saved, an attention banner, a filled tag or an acknowledged result. Amber means attention or pending, green confirms the stated success and red marks errors or existing adverse/destructive actions. Retain explicit assignment/inclusion labels on existing green controls. Groups use space and headings first; the approved purpose surfaces are a bounded exception, not a reason to box every group.
- **Type:** `--display` (Barlow Condensed) for headings and labels, `--body` (Barlow) for the rest, Caveat for the handwritten done count (`.nb-prog`).
- **Corners:** `--r-act` (8 px) on buttons that do something (Save, Add), `--r-pick` (round) on chips and filters that choose.
- **Tap targets** are at least 44 px; a quiet secondary link may be smaller when a 44 px way to the same place is on screen.
- **Icons** are inline SVG with `currentColor` and `aria-hidden="true"`, from `ICON` in `js/app.js`; an icon drawn more than once with a mask gets its own mask id each time (`tmIcon()`).

## A page

- **The card:** `section.p-card` with `h2.p-h` (id `rtitle`, so the page's Back and focus land on it), a `.hint` line for what the page is for and when it was read, then the work. Buttons sit in a `.btn-row`: `.btn` for most, `.btn.dark` for the one main action. A quiet action in a sentence is a `.p-link` (Refresh, Try again).
- **A failed read** never shows "nothing", "nobody" or "0": a `.p-err` line with role status says it could not load, a Try again, and the book tries once more after 5 minutes by itself (`retrySoon()`, `waiting()`). An answer from the phone's own copy with no signal is not "none" (`cacheOnly()`).
- **Waiting** uses the Ink helpers, never a spinner: `inkLabel()` in a line, `inkWait()` for a block (`docs/loading-motion.md`).
- **Home's board** (redesign step 2, 8 Nov 2026): a `.hm-board` with only what is still to come; Your day stays charcoal and Now and next uses the existing warm amber surface with dark text and orange labels, one `.hm-a` row each (a drawing, the words with a small second line, the time and a short note on the right, `is-hot` when it is close), every row a tap to where it is done. Under it, `.hm-paper` cards hang from a pin (Prep by section with its `.hm-sec` rows and bars, Coming up). Worked out from what the phone holds, never a read of its own; `homeSlot()` draws it and `homePaint()` keeps it right. A confirmed empty work board is hidden; loading and failed checks retain their own words.
- **Staff-first Home** (9 Nov 2026): `.hm-staff-first` groups the native Your day board (section, shift hours, full break and return) then the soft sage paper card with visible coworkers on the `.hm-rota` board (sections down, shifts across, each `.hm-tp` with its break, 10 Nov 2026), before work reminders and the cool steel Prep by section card. These two existing-palette surfaces and inset edges identify the card purpose; labels and progress states retain their meaning. Scheduled same-shift or overlapping-shift coworkers exclude self; without a personal assignment use On today. The full saved day stays in a native disclosure with `.hm-team-staff` when the card holds only one shift; a card that already holds the whole day has no fold. Its open state survives clock paints. Checking, unset and failed reads have distinct words. It uses the loaded saved team, never the planner draft. Desktop from 1100 px uses matching equal columns for the personal/team and work tiers, full-width quiet Prep and a final upcoming row; smaller views keep their existing flow. [Contract](home-staff-first.md).
- **Named Home heading** (A chosen 10 Nov 2026): the existing `.wall-h` uses `.hm-welcome` for a varied welcome with the **full roster name**, with weekday/date underneath. `homeWelcomeWords()` keeps one phrase per Home visit, current identity, Queensland day and active celebration. Celebration wishes come first, then the person's shift moment (`LK_PREP.homeGreet()`), then ordinary words with Queensland time of day; `lk-greet` re-picks only when the moment or hour changes. It avoids the previous phrase on return, keeps ordinary wording for Off/reflective/civic occasions, and never rerolls on a roster rename or routine repaint. Use the authenticated personal staff name, not the remembered Google account or a guessed first word; public/locked views keep a neutral heading. Long names wrap. Below 768 px, `.hm-welcome-long` uses `1.5rem` above 21 complete heading characters and `.hm-welcome-compact` uses `1.2rem` above 37, retaining the app's text-size preference. Shorter prefixes retain at least the original name-based compact size. Existing identity/config events repaint the greeting and open menu in place, with one Unicode-aware initial helper for the hat, menu and Settings. Named Home leaves anchored seasonal ornaments out of the heading area; the celebration note and background ambience remain. No new read, banner or service control. Validate complete-shell long-name/enlarged-text geometry rather than reusing the historical preview metrics. [Scope and evidence](staff-personalisation-options/brief.md#implementation-10-november-2026).
- **Home mascot** (owner, 9 Nov 2026): `.mascot` is a decorative button absolutely placed in `.mascot-host` (`#main.wall-main`) at the right end of the Welcome row, outside `#rtitle`, standing on the date line, 64 or 48 px wide. When the welcome words fill that corner (owner, 10 Nov 2026, B), it stands 48 x 64 or 44 x 59 px on the Your day card's header line, left of `.hm-clock`, peeking over the card top (`data-spot="card"`); nothing moves. With no Your day card (Functions-only Home), `.mascot-room` on `#rtitle` and `.wall-date` keeps 76 px for it and the words wrap (`data-spot="room"`). It is left out only when none of these clears every word of the name, date and card title, a seasonal ornament and the top bar. One play of the person's daily action, then the Welcome pose; a tap replays it. No hover tint or pressed box; keyboard focus ring only; `scale` press inside `:where()`. Home only. [Feature note](kitchen-mascot.md).
- **A search** is one pill with its magnifier inside (`.find-i`) and the word Search for screen readers only. On a phone its count line shows only while a search or filter is on.
- **Words** follow `CLAUDE.md`, Writing style: short, 24-hour times, no em dashes. A person's name comes from the staff list (`mnName()`), never typed into code.


## Loading and motion: Behaviour
From `docs/loading-motion.md`.

## Behaviour

- The initial HTML names the book and the wait before the deferred app scripts run.
- Active waits trace only a detail of the matching native icon, on a 1.8 second cycle with a rest. The base drawing stays visible. A prep checkmark never suggests an unconfirmed completion.
- First list loads use decorative handwritten placeholder rows in the existing notebook. They are hidden from assistive technology. Loaded recipes remain usable during their existing background check; its status changes without replacing the search field or results. Very short recipe checks do not flash a message.
- Lazy editors, reports, access checks and update checks name the actual work. Offline and failure messages remain actionable and static.
- Busy save buttons keep a stable minimum width and touch height. Existing pending flags prevent repeat submission. A confirmed check is shown only in existing success branches after the write resolves. Drafts and queued-write warnings keep their existing meaning.
- Guide preparation counts completed pages. Guide saving counts acknowledged page writes, any old-page cleanup and the final guide record. It cannot reach completion while the final record is still pending. Unknown totals show a named wait without a percentage.
- Landing dockets have one small entrance per page session. Reduced motion removes tracing, entrances and progress transitions. A known browser offline event immediately stops active decorative traces, without triggering reads or retries. Pending operations keep their busy markup even when drawn offline, so the same icon resumes on reconnection (4 Nov 2026, replaces #462). Settled errors and offline results remain still.


## Device sessions: what the team sees, daily boundary
From `docs/device-sessions.md`.

## What the team sees

Every browser or installed app without a version 2 device choice asks how it is used when the new version opens. Existing shared-device settings do not silently answer the new question. The same warm-paper dialog becomes a bottom sheet on a phone. Choosing a device type does not grant access or a role. Recipes remain public. **View recipes for now**, Escape or Back closes the question until the person signs in, taps **Choose device**, forgets the device in Settings or opens the book again; the kitchen settings or the clock arriving later never bring it back on its own (4 Nov 2026).

- **My own device:** remembered for this browser or installed app and bound to the first person who successfully enters their PIN. No idle logout, including personal computers. Kitchen access locks at 04:00 Queensland time. The same person's PIN unlocks the new day. Their Google identity remains remembered, so the head chef does not need to repeat Google login every morning or after an update.
- **Shared kitchen screen:** any authorised staff member may enter their own PIN. A 10-minute idle lock and the 04:00 boundary clear this device's PIN and Google login. Other devices keep their own independent sessions.

Settings shows the saved choice. An unlocked personal device's own person can change or forget it. Changing a shared screen requires the head chef. Unsent work blocks either action; actual unsaved work has an explicit discard confirmation. A handover clears the previous person's private work and Google identity. Clearing browser site data also forgets the choice. A browser and its installed app may have separate storage depending on the platform, so each storage profile asks once.

Wall board is available to every account already authorised for Prep on both device types (8 November 2026). Its saved browser view preference changes the layout. The selected device type continues to govern locking, identity and prep attribution.

[Phone setup](device-sessions/choice-phone.png) and [desktop setup](device-sessions/choice-desktop.png) show the existing book typography and responsive dialog.
The existing default-app Google session migrates away from operational authentication. No migration deletes a legacy Google UID's shared session document, because other old clients may still use it. A fresh PIN is required to open the new device session. Existing unsent writes must finish before a voluntary identity migration or update.

## The daily boundary and work in progress


## Whole-app redesign record about the signed-out view
From `docs/whole-app-redesign-options/brief.md` and `docs/home-staff-first.md`.

- Redesign step 2 (built 8 Nov 2026, #590): the board replaced the six dockets for signed-in staff. "Signed out and Functions only keep the dockets."
- Option C (not chosen) had proposed: no home page; "Recipes when signed out". Its con: "loses the dockets ... that the celebrations draw on"; "two ways in to explain (signed out and signed in)".
- `docs/home-staff-first.md`: "Signed-out and Functions-only users retain their existing Home."
- Staff personalisation (chosen A, 10 Nov 2026): "Public, locked and signed-out views retain the neutral heading."
- Seasonal celebrations hang their note before `.kb-home` (the docket wall carries that class) and draw on the dockets.
