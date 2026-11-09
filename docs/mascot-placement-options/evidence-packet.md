# Shared evidence packet: mascot placement

Source 69589ff6590d20d4ec5a4ed7f1dfcbf201007b5a. Application matches origin/main 7f85629. Review is advisory role-based analysis. All app evidence uses tests/lib.js synthetic Firebase, staff Ann, Brisbane 14:00, local copies of actual app fonts. No production data.

Read proposal.md and baseline/baseline.json. Inspect baseline/home-390.png and baseline/smash-390.png (or actual names in baseline.json). Baseline is Implemented app; upcoming options are Preview. Unchecked interactions remain Not evidenced.


## Source: .claude/skills/service-council/reviewers.md

## Shared opening (every reviewer)

> You are one reviewer on the Leichhardt Hotel kitchen's council. The Kitchen Book is the kitchen's web app on phones, a shared tablet and a laptop: recipes, the prep list, orders, wastage, transfers and the head chef's admin panel. Staff use it during a busy service. Be critical: your job is to find what is wrong, unneeded or slow, not to agree. Judge only from the evidence given. Where it is not enough to judge, say so instead of guessing.
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

## Source: .claude/skills/service-council/SKILL.md

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

## Source: docs/surface-colours.md

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

## Source: docs/colour-coding.md

## Shared meanings

| Meaning | Tokens and treatment | Boundaries |
| --- | --- | --- |
| Ordinary content and neutral context | `--ink`, `--muted`, `--faint`, paper and divider tokens | Quiet text still needs contrast. A disabled control is a separate state from an unreadable row. |
| Action, active choice and attention | Existing orange: `--accent`, `--accent-ink`, `--small-ink`, `--tag`, `--hit`; `--bar-accent` on charcoal | Orange is also the book's brand and heading colour. Do not interpret every orange word as overdue. Keep the more readable small-text variant. |
| Urgent Prep work | Existing charcoal Urgent badge, selected control and row edge | Preserve the established word and treatment. Charcoal selection elsewhere is also valid when pressed/current state is explicit. |
| Complete, saved, included or assigned | `--done`, `--done-ink`, `--done-tint`; `--done-on-dark: #9FE0B7` on charcoal | Use `--done-ink` for small text and filled labels, with `--done` retained for appropriate decorative frames. Assigned in a Team draft does not mean Saved. A new unsent line must not look completed. |
| Failure, invalid input, destructive action or an explicitly adverse state | `--bad-ink: #9B2716`, `--bad-tint: #FBE9E5`; `--bad-on-dark: #FF9C8A` on charcoal | Reuse the existing dashboard red as the shared source. Preserve Error, Try again, Cancel function, Delete and other outcome words. Red does not replace the second-tap or existing confirmation behaviour. |
| Waiting or not sent | Existing neutral/orange pending treatment plus explicit words | Pending is not a confirmed failure or success. Preserve acknowledgement timing and retry rules. |
| Categories, quantities, art and surface identity | Existing local palettes and legends | Wastage reasons, chart series, heat scales, allergens, drawing colours, festivals and approved Home surfaces are not generic state colours. |

The same meaning may need a different foreground on warm paper and charcoal. Sharing a semantic token is preferable to repeating its hex. Do not replace every local colour with one universal swatch.

Quiet secondary actions can stay neutral. The shared `.p-x` class includes Remove, Put back and other ordinary actions, so it is not globally red. Use the failure family where an existing dedicated destructive or adverse-state style supplies a colour cue.


## Source: docs/loading-motion.md

## Behaviour

- The initial HTML names the book and the wait before the deferred app scripts run.
- Active waits trace only a detail of the matching native icon, on a 1.8 second cycle with a rest. The base drawing stays visible. A prep checkmark never suggests an unconfirmed completion.
- First list loads use decorative handwritten placeholder rows in the existing notebook. They are hidden from assistive technology. Loaded recipes remain usable during their existing background check; its status changes without replacing the search field or results. Very short recipe checks do not flash a message.
- Lazy editors, reports, access checks and update checks name the actual work. Offline and failure messages remain actionable and static.
- Busy save buttons keep a stable minimum width and touch height. Existing pending flags prevent repeat submission. A confirmed check is shown only in existing success branches after the write resolves. Drafts and queued-write warnings keep their existing meaning.
- Guide preparation counts completed pages. Guide saving counts acknowledged page writes, any old-page cleanup and the final guide record. It cannot reach completion while the final record is still pending. Unknown totals show a named wait without a percentage.
- Landing dockets have one small entrance per page session. Reduced motion removes tracing, entrances and progress transitions. A known browser offline event immediately stops active decorative traces, without triggering reads or retries. Pending operations keep their busy markup even when drawn offline, so the same icon resumes on reconnection (4 Nov 2026, replaces #462). Settled errors and offline results remain still.

## Source: docs/action-feedback.md

## The rule

1. **Answer in the tap's own frame.** Something changes before the server is asked. A list line (add, tick, remove on Prep, Orders, Wastage, Transfers) shows at once with its slip, as since 4 Nov 2026; while the write waits, the line says Not sent and the floating band says Not sent yet. A form's Save button says Saving... at its own width (`svButton()`) and shows Saved, Sent or a green tick only once the write resolved: an answer from the cache, or a listener hearing this phone's own pending write, is not Saved (CLAUDE.md, Changes that went wrong before).
2. **Confirm where the eye is, in words.** Words say what changed and where: "Added Slice tomatoes to Sauce", "Saved 14:02. The sous chefs see the new cut-offs now.", "Undone: Slice tomatoes". Never "Added", "Done" or "Saved" alone when the thing has a name. A confirmation is never only a small grey line, never only at the top of a page whose button is lower down, and never behind an open sheet.
   - **A form's Save, Publish, Record or Send button** uses `svButton()` with `svStart()`, `svDone()` and `svFail()` (`js/prep.js`): Saved with a tick for 1.2 s once the write resolved, one waiting line after 4 s, Try again with a red line that stays. Lazy pages that cannot reach it keep their own button but follow the same four states, words and classes (`saveBtnHTML()` in `js/manage.js`).
   - **A button that changes while someone types** is changed in place with `btnPatch()` (`js/prep.js`, also `LK_PREP.btnPatch`), never replaced: leaving a box by tapping the button fires change between finger down and finger up, and a new element there loses the tap.
   - **An add, tick, remove or change on a list line** uses the docket slip (`toast()`), with Undo where the change can be undone.
3. **Clear the old words.** Once Saved shows, anything that belonged to the unsaved form goes or turns off: Undo unsaved changes, "Save to make the change", a Tap again still armed.
4. **Then leave the person where they are, with a stamp on what changed.** Chosen by the head chef on 5 November 2026 (the mix of A and C in [the options brief](action-feedback-options/brief.md)). Nothing scrolls by itself. What was saved wears a small green stamp, "Saved 14:02" (`.lk-stamp` in `css/app.css`), on the card or bar that changed and beside the Save button, until the page is left or it changes again. An add sheet stays ready for the next line and lists what it added ("Added just now", the last two, each with Undo); after Close the slip names the last line. Lines this phone just added wear "New 14:02" for 2 minutes.
5. **A failure stays and keeps the work.** Red, read out at once (`errMsg()`, `toast(..., 'bad')`, `role="alert"`), until the next try, an edit or OK. Never on a timer. Typed text goes back in its box (`failed(e, restore)`). A failed save takes its Undo with it (`dropUndo()`).
6. **Undo says Undone.** An Undo on the slip says "Undone: ..." with what it undid, unless what it ran says so itself ("Put back Milk on the order list", "Unticked Laksa. It is open again."). Untick, un-order and Put back name the line. A slip names the line through `slipName()` (cut after 40 letters, so the section always shows).
7. **A tap that cannot act says why.** An empty Add puts the cursor in the box and says what is missing; Refresh says when it last read ("Up to date, read 14:02") or why it could not.
8. **Colour carries meaning, never alone.** Orange is the accent, urgent, rolled and the counts; green (`--done-ink`) is saved and done; red is a failure. A switched-off button looks off (faint words, light edge), so it is never mistaken for one still waiting. Stamps are words in a box, never a fill. Reduce motion removes fades and slides, never the words.

## Further affected contracts (excerpts)


### docs/home-staff-first.md

Home answers the staff questions first: **what section and shift, when is my break and when do I return, who is on with me?** Kitchen work follows. Preserve Barlow, Barlow Condensed and Caveat, the pinned dark board and warm paper, current clock, logo and navigation. There is no global section/service picker.

- `#hm-day` shows the existing personal section precedence, configured shift hours and full break window, length and return. On-break, split, completed-break, no-break, changed, unassigned, loading and failed-plan states stay distinct. Your day retains additional breaks, later shifts and save metadata.

- The native full-team disclosure retains every saved shift, person, section and break. Staff get read-only records; chef planner links retain `teamOK()`.

- Work reminders, order cut-offs, functions, pings, minutes and Prep by section follow the personal/team group. A confirmed empty work board is hidden; loading/error information is retained.

- Reuse `tm.rec`, the existing team stamp/read, `tmNow`, `tmNextBreak`, `tmSecWords` and personal section precedence. Never use the unsaved `tmf` planner draft or a stale/failed roster as current truth. Existing paint paths update times and changed plans without a new query.

### docs/staff-personalisation-options/brief.md

**Chosen, 10 November 2026:** the owner selected A: "okay lets do a then if the council is sure about that". The council supported a smaller personalisation change but did not unanimously prefer A: two source reviewers preferred A, two preferred B, and the visual reviewer preferred C for long-name density. The chosen implementation keeps that dissent on record and addresses the long-name condition through focused validation. It includes the Home greeting and consistent current identity, not the later mail or filter ideas.

| P4 | Hat and Sign out infer a first name by splitting at a space. Ana María becomes Ana. `js/app.js:401`, `:485` | Use the stored display name for greetings and identity-sensitive wording. Compact marks can remain compact, with the full name accessible and in the menu. | Medium. Verify the 40-character staff-name limit and shared-screen widths. |

| Global chef hat and menu | Initial, accessible full name, name/role and Not you/Sign out | Keep as the identity anchor on every page. Fix rename, initials and name shortening | `js/app.js:393`, `:470` |

| Settings `#/settings` | Full name, role, section and device mode | Keep the existing identity card; no separate profile page needed | `js/app.js:1295` |

6. Full names stay available in menu/Settings and accessible labels. Do not promise full visible name text at every breakpoint: the current compact hat intentionally uses an initial at some widths.

### docs/seasonal-celebrations.md

The explanation cycles English, Filipino, Balinese, Nepali, Hindi and German. There is no language picker or separate language-pause button. The current-language badge shares the festival heading; redundant occasion and cycling-status rows are omitted. Each sentence names the participating country or countries and the celebration's meaning. Body copy remains 16 px at the normal text setting, without truncation. Dwell time follows sentence length, between 8 and 16 seconds, with a 520 ms crossfade. Six inert sizing copies reserve space; only one sentence is exposed to screen readers. The ticker owns and removes its heading badge when cleared or remounted. Still, reduced motion and the existing ambience pause also stop the language sequence. Closing the work explanation releases its timer.

Home motion arrives, then settles (3 November 2026). The first Home view of the kitchen day for a celebration, and Replay, play the full arrival for about 4 seconds. Then Home rests with at most 4 slow pieces (2 on Subtle), counting the hanging ornaments and the horizon; the board drawing holds still. Returning to Home the same day opens at rest. A hidden tab skips the rest of the arrival. `lk.seasonal.arrival` keeps the kitchen day and celebration of the last arrival on this device; it is out of date on the next kitchen day or for another celebration, and Replay clears it so the next Home view arrives.

Nobody picks a celebration (head chef, 4 November 2026): the kitchen calendar gives every device the same one, from confirmed dates. Settings, reached through the chef hat, has a Seasonal celebrations row under This phone; it says On or Off and opens in place to On and Off, Animated and Still, Subtle and Full, Replay, and the next five celebrations with their dates and stamps. These work on this device only. A celebration chosen by hand on an older book is not kept, so that device goes back to the calendar. The book keeps only the 39 designs the calendar can show: the other 165 were removed on 4 November 2026. `KB_SEASONAL.configure({ selection: id })` still shows one of the 39 in the current tab for the click tests and design checks, never saved and offered nowhere in the book. Reduced motion disables decoration movement and automatic language transitions; hidden documents pause animation. Off restores the original app branding.

`tests/seasonal.test.js` exercises the real app with fake Firebase: main festival header effects, mobile ornaments, Home/work handoff, all six languages, no picker, focus and typing, Settings, Still, Off and reduced motion. `tests/seasonal-calendar.test.js` checks dates, overlaps, boundaries, finite annual coverage, and that the catalogue holds exactly the designs the calendar can show. `tests/seasonal-shell.test.js` checks atomic asset membership and nested script syntax. Existing saved-copy and shell-generation browser checks cover the expanded shell. The full click suite and required PR gate precede release; the live click suite follows Pages publication.

### docs/saved-shell-generations.md

New generations record their own required files in a public `__lk-shell-manifest` response inside the generation cache. The manifest has version 1 and the staged file list; it is written and checked before the metadata transaction publishes that generation. The `-m1-` name marker makes a missing manifest an incomplete generation, never an excuse to apply older requirements. Validation checks every recorded file and the cached index's same-origin startup scripts and stylesheets. A complete older generation therefore remains usable when a later release adds a startup file such as `js/motion.js`.

Generations from earlier immutable workers have no manifest. They must contain the first worker's frozen required-file list and every same-origin startup script and stylesheet named by their cached index. This also accepts coherent pre-manifest releases that added startup files, provided those files are actually present. An older worker that fetched a new index without its new startup dependency has not made a complete copy. Marked generations remain strict against their recorded manifest even if other files are cached. Activation preserves the last validated active or previous generation rather than blindly copying the former active pointer. External fonts, touch icons and lazy modules retain their existing separate cache contracts.

## Recipe artwork and limits

Keep existing ingredients, method, yield, allergens and plating drawings. docs/smoker-batches.md: no missing cooking methods, quantities or yields may be invented by illustration. Static canonical data can be superseded by saved recipe overlays. House BBQ is not assumed to be double-smoked BBQ. All food animations here are artwork, not instructional authority or verified food safety.

## Evidence still needed

Render every candidate with the complete app at 390x844, 768x1024 and 1280x900. Count real taps and visible rows, measure long-name and seasonal coexistence. Measure rendered contrast and target sizes if controls are added. Exercise supported preview playback/failure cases; explicitly defer production lifecycle, saved-shell integration and device testing. Existing save/state behaviour is unchanged in a docs-only preview and is not re-certified by screenshots.


## Source: docs/design-patterns.md (packet completion after round-1 readers flagged the omission)

## The look

- **Current break board** (Today's team, 9 November 2026): reuse `.hm-board` on `.tm-away`, with the existing charcoal surface, light text, orange return times, edge and pin. Label it On break now, with Until beside each return time. Keep the notebook position and the saved all-shift names, meal breaks, splits and return times in `.tm-away-slot`. `tmAwayHidden()` hides the entire board only for a checked current saved plan with no active break or split and no invalid times. Keep its DOM for clock paints to show it again, and keep unknown/error warnings visible. The existing status renderer and clock paints remain authoritative. [Contract and checks](team-notebook-options/brief.md#hide-a-confirmed-empty-board-9-november-2026).

- **Colours** are tokens in `:root` in `css/app.css`, never a new hex in a rule: `--ink` (text, rules), `--paper` and `--bg` (surfaces), `--muted` and `--faint` (quiet text), `--line` (dividers), `--accent` and `--accent-ink` (the book's orange), `--tag` (needs attention: a filled chip, a due line), `--done` and `--done-ink` (saved, ticked), `--bar` and `--bar-text` (the dark top bar and tab bar).
- **Operational colours** (whole-app council, 9 November 2026): retain orange for actions, selected notebook controls and attention, green for completion or explicit assignment, and neutral charcoal/grey for ordinary information. Use `--bad-ink` and `--bad-tint` for failed reads/writes, invalid entries, cancellation and destructive actions. On charcoal use `--bad-on-dark` and `--done-on-dark` so status text stays readable. Colour always accompanies existing words, ticks, pressed states or outlines; an assignment in a draft is not a confirmed save. Preserve the named charcoal Urgent flag. Claimed Prep work keeps full text contrast, with the claimant's neutral badge and name. Food drawings, allergen certainty, wastage reasons, chart scales, seasonal art and approved card surfaces have separate meanings. See [the inventory and council](colour-coding.md).
- **Surface colour** (owner-approved hybrid, 9 November 2026): coloured covers, headers and spines identify purpose while writing areas stay quiet. Use `--surface-work` and `--surface-work-edge` for work, including Orders; `--surface-people` and `--surface-people-edge` for people; `--surface-paper` for interiors; and `--surface-reference` for quiet reference and forms. Current live boards and bands retain charcoal. Home retains its approved purpose surfaces. These surface identities do not imply due, done or Saved. Preserve category, chart, art and print palettes. [Chosen contract, council and exceptions](surface-colours.md).
- **Attention and outcome fills** remain local: the top bar chip until today's team is saved, an attention banner, a filled tag or an acknowledged result. Amber means attention or pending, green confirms the stated success and red marks errors or existing adverse/destructive actions. Retain explicit assignment/inclusion labels on existing green controls. Groups use space and headings first; the approved purpose surfaces are a bounded exception, not a reason to box every group.
- **Notebook colour** (Chef to-do and Today's team, updated 9 November 2026): keep the approved work or people cover and spine, warm writing paper, orange active choices, green ticks and explicitly completed or assigned states, and quiet neutral dividers. Use `--small-ink` for small orange text and selected fills with `--bar-text`; `--done-ink` for completion; `--faint` for readable control outlines. Local attention and scheduled-away cues retain their words. Colour reinforces checkmarks, pressed states and strikethrough. Preserve the approved spacing, target sizes and acknowledgement timing.
- **Type:** `--display` (Barlow Condensed) for headings and labels, `--body` (Barlow) for the rest, Caveat for the handwritten done count (`.nb-prog`).
- **Corners:** `--r-act` (8 px) on buttons that do something (Save, Add), `--r-pick` (round) on chips and filters that choose.
- **Tap targets** are at least 44 px; a quiet secondary link may be smaller when a 44 px way to the same place is on screen.
- **Icons** are inline SVG with `currentColor` and `aria-hidden="true"`, from `ICON` in `js/app.js`; an icon drawn more than once with a mask gets its own mask id each time (`tmIcon()`).

## A page

- **The card:** `section.p-card` with `h2.p-h` (id `rtitle`, so the page's Back and focus land on it), a `.hint` line for what the page is for and when it was read, then the work. Buttons sit in a `.btn-row`: `.btn` for most, `.btn.dark` for the one main action. A quiet action in a sentence is a `.p-link` (Refresh, Try again).
- **A failed read** never shows "nothing", "nobody" or "0": a `.p-err` line with role status says it could not load, a Try again, and the book tries once more after 5 minutes by itself (`retrySoon()`, `waiting()`). An answer from the phone's own copy with no signal is not "none" (`cacheOnly()`).
- **Waiting** uses the Ink helpers, never a spinner: `inkLabel()` in a line, `inkWait()` for a block (`docs/loading-motion.md`).
- **Home's board** (redesign step 2, 8 Nov 2026): a `.hm-board` with only what is still to come; Your day stays charcoal and Now and next uses the existing warm amber surface with dark text and orange labels, one `.hm-a` row each (a drawing, the words with a small second line, the time and a short note on the right, `is-hot` when it is close), every row a tap to where it is done. Under it, `.hm-paper` cards hang from a pin (Prep by section with its `.hm-sec` rows and bars, Coming up). Worked out from what the phone holds, never a read of its own; `homeSlot()` draws it and `homePaint()` keeps it right. A confirmed empty work board is hidden; loading and failed checks retain their own words.
- **Staff-first Home** (9 Nov 2026): `.hm-staff-first` groups the native Your day board (section, shift hours, full break and return) then the soft sage paper card with visible `.hm-coworkers`, before work reminders and the cool steel Prep by section card. These two existing-palette surfaces and inset edges identify the card purpose; labels and progress states retain their meaning. Scheduled same-shift or overlapping-shift coworkers exclude self; without a personal assignment use On today. The full saved day stays in a native disclosure with `.hm-team-staff`; its open state survives clock paints. Checking, unset and failed reads have distinct words. It uses the loaded saved team, never the planner draft. Desktop from 1100 px uses matching equal columns for the personal/team and work tiers, full-width quiet Prep and a final upcoming row; smaller views keep their existing flow. [Contract](home-staff-first.md).
- **Named Home heading** (A chosen 10 Nov 2026): the existing `.wall-h` uses `.hm-welcome` for **Welcome, [full roster name]**, with weekday/date underneath. Use the authenticated personal staff name, not the remembered Google account or a guessed first word; public/locked views keep a neutral heading. Long names wrap. Below 768 px, `.hm-welcome-long` uses `1.5rem` above 12 name characters and `.hm-welcome-compact` uses `1.2rem` above 28, retaining the app's text-size preference. Existing identity/config events repaint the greeting and open menu in place, with one Unicode-aware initial helper for the hat, menu and Settings. Named Home leaves anchored seasonal ornaments out of the heading area; the celebration note and background ambience remain. No new read, banner or service control. Validate complete-shell long-name/enlarged-text geometry rather than reusing the historical preview metrics. [Scope and evidence](staff-personalisation-options/brief.md#implementation-10-november-2026).
- **A long card on a phone** (the recipe card, redesign step 6, 8 Nov 2026) keeps its row of jump chips under the top bar while it scrolls (`.jumps`, sticky below 900 px, scrolling sideways with a faded edge when the parts do not fit). The main parts come first, so they show on a 390 px phone (Allergens, Ingredients, Method), then the drawings (Plate or Pan, Side view). A jump lands just under the row, never behind it.
- **A card's head** puts the name and its number on one line and the descriptive line across the whole card under them (`.card-head.ch-grid`, `.ch-line`), so the line never wraps to a narrow column beside a big number.
- **A search** is one pill with its magnifier inside (`.find-i`) and the word Search for screen readers only. On a phone its count line shows only while a search or filter is on.
- **Words** follow `CLAUDE.md`, Writing style: short, 24-hour times, no em dashes. A person's name comes from the staff list (`mnName()`), never typed into code.
