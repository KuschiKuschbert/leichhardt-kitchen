# Round 2 shared current-contract packet

Historical review packet: the hashes below describe the original six independent rankings. A later routine B largest-text stage-label repair is recorded in the brief and focused follow-up. Final asset hashes are in the final verification JSON; the [unaltered original packet](round-2-original-round-2-packet.md) and original JSON are retained separately. No original vote is relabelled as a vote on a changed blend or implementation.

10 November 2026, Queensland. Source frozen at `29258e6420714209616fdcd1fe3ff2c2dfec0299`. This is role-based analysis, not kitchen-staff research. Round 2 reviewers receive this same current-contract packet, all three previews, the brief and the frozen verification evidence, with no preferred design or ranking.

## Shared opening and service rules

You are one reviewer on the Leichhardt Hotel kitchen council. The Kitchen Book is used on phones, a shared tablet and a laptop for recipes, prep, orders, wastage, transfers and chef management. Be critical. Judge the evidence supplied; where it is not enough, say so. Current contracts and owner choices win over app inspiration.

The service rules: (1) the main job of each work page is one tap from its tab; (2) no new tab, top-bar or bottom-bar button or service popup without the owner's choice; (3) nothing appears over a live service list unless it stops a mistake; (4) justify added taps or lost visible rows with measured evidence.

The clarified request is a service/shift picker AND a section picker together beside EACH selected person, plus asking whether a wider Today's team improvement is worthwhile. The present released C already has a row section picker, but its service is chosen globally. Do not describe the entire row-picker capability as absent today. Do not assume this request proves a full redesign or a row dropdown is faster.

## Baseline and evidence to inspect

Read `proposal.md` and `baseline.md` in this folder. Baseline source, actual synthetic fixture, real fonts, precise geometry, tap counts, widths, exceptional states and evidence limits are recorded there and in `baseline-measurements.json` and `baseline-task-paths.json`. At minimum inspect baseline-team-390.png, baseline-chef-390.png, baseline-team-1280.png and baseline-chef-1280.png. Tablet, full-page and largest-text images are available for a relevant challenge. The ten people and all example shifts/times are fictional. These browser fixtures replace Firebase and make no private production writes.

Current direct and embedded routes share the team editor. Canonical chef PIN roles and permitted owner-admin entry points keep existing access. Staff's Home/Your day use today's saved record; the planner's future date or draft cannot become live status. One memory-only draft/version per visited date, explicit dated Save, past-date read-only, conflicts, recovery and handover remain. A week is read by one bounded server query and reused in memory; no listener, polling, per-person query loop or permanent private copy is proposed. A new per-person service VIEW selection must remain separate from stored multi-service membership.

The proposed prototypes cannot prove actual server access or persistence. Existing tests and later implementation checks remain necessary. Baseline measurements are not implementation results for a new design.

## Verbatim current feature excerpts

Source: `docs/team-tidy-options/brief.md`, Current choice and selected-day refinement.

On 9 November 2026 the head chef changed the management tidy-up from **A, Quiet notebook, one list**, to **C, Person worksheet** from the same review. This is the C in this brief, not the older shared team-board concept or the weekly planner's chef-panel concept. Reuse the existing council and previews; no new design selection is pending.

The shared direct and management-panel renderer shows one row per person selected for that date on an active configured service, with their name, their own section picker and a readable meal-break/split summary together. On a laptop the rows form a worksheet; on a phone each row uses the available width. A labelled **Edit breaks** disclosure keeps the existing membership and detailed shift/break controls with that person. Do not show another full roster or a second section picker inside the disclosure.

Picking a section for a person off the selected shift adds that shift membership deliberately. A clearly labelled **Not on [shift]** choice removes only that shift and its breaks. Keep an on-shift person with no section distinct from an off-shift person, and preserve other shifts and dates. Row sections and break summaries describe the current draft. The saved current-break board still describes `tm.rec`, never unsaved worksheet changes.

Keep Monday to Sunday, previous/next week and Today, full selected dates and written status, configured shifts with Whole day review, search and per-person details state, one version-protected dated Save, selected-weekday copy, Spread them and folded saved references. Retain same-person work recovery, deliberate handover privacy, read-only past dates, current-day staff Home, Your day and manual section choices. No new schema, role, backend, listener, persistent private copy or database read is part of C.

The production C implementation uses `.tm-worksheet`, `.tm-worksheet-head`, `.tm-person-head` and `.tm-person-section` with the existing `.tm-person-row` and `.tm-person-details`. Each section picker reuses the existing `tm-sec:<id>` change path. The existing shared picker frame, explicit Save and selected-date draft helpers remain authoritative.

### Only the selected day's people

On 9 November the head chef asked the worksheet to show only staff selected for that date. Membership on at least one active configured service is enough: a Dinner-only person stays visible on Lunch as **Not on Lunch**, ready to add that service. Clearing a section retains membership and the row; removing the final service removes the row. The existing **Add staff to this day** chooser retains all eligible staff. Search cannot reveal an unselected person, and dates retain their own independent membership drafts. Removed-service-only assignments do not make a person part of the current worksheet.

**Verdict: Build smaller (quick check).** Filter the existing shared list without another control, data read, colour or state. Linear and Things 3 support keeping the current work prominent and occasional additions in the existing named fold. Existing sage people surfaces, paper, saved/draft wording and saved-break authority remain unchanged. A section correction plus Save stays three taps; a break correction plus Save stays four. Adding an unselected person later takes six taps through the existing fold, staff tick, Add, two section-picker taps and Save, plus any service choices, compared with the earlier three-tap inline picker. The owner requested this quieter list; empty-day bulk setup is unchanged.

Paired direct-page measurements used three selected and two unselected fictional people, the same test fallback fonts, 844 px-high viewports and HEAD JavaScript as the baseline against unchanged CSS. At 390 px the worksheet has three rows instead of five, and Save moves from 1075 to 920 px; the first row stays at 594 px and two complete rows remain above the fixed navigation at 776 px. At 768 and 1280 px Save is 154 px higher. All six before/after captures have three team/training reads, no browser error and no sideways overflow. These are stand-in, fallback-font measurements, not original-font or live-record evidence. The earlier C evidence below remains its own baseline.

Try-to-break-it self-check, browser stand-in: **Reproduced before the change**: the unselected name appears in the worksheet/search and dates include people from the full roster, five of the first six new assertions failing. **Checked after the change**: clear section retains the row and break; removing the final service removes the row while removing one of several keeps it; late Add staff restores a row without changing saved data before Save. `tests/team-selected-day.test.js` passes all 16 checks, including search through its existing visible Clear action, date isolation and the embedded chef panel. The six existing team suites also pass all 430 checks, for 446 across seven files. Existing `colour-semantics` and `surface-colours` checks pass on the filtered worksheet, retaining the approved surfaces and explicit local states. JavaScript syntax and whitespace checks pass. Hosted checks and release for this refinement are recorded in its pull request.

## Dated planning and read contract

Source: `docs/team-week-options/brief.md`, Chosen and build.

The head chef chose **A: Week strip in Today's Team (recommended)** in chat on 9 November 2026 and authorised coding. Keep the existing notebook. Add previous/next week, Monday to Sunday day choices and Today. Today and future dates are editable; past dates are browsable read-only, without introducing historical corrections into this workflow. Retain one independent draft and version for every visited date. Use written status on day choices and full selected dates on Save and acknowledgement.

Implemented in `js/prep.js` and `css/app.css`, using the existing notebook, save helpers and dated team records. The staff-facing current-day record remains separate. Dates, shifts, sections, Whole day and unsaved drafts keep their own selected-date state; the shared protected-work guard includes hidden-date drafts. Existing PIN authority, schema and sequential version checks remain unchanged.

The selected week uses one server query with an eight-document safety limit, rejecting malformed results beyond the seven valid dates. A normal complete week costs up to seven document reads, and an empty week costs one, plus existing rule-dependent reads. It is reused in memory within the session. Refresh explicitly rereads; future-date lead text says when it was last checked. There is no listener or persistent private cache. Use it reads the selected date minus seven days on the tap. A refused Save may read that named date once to identify a newer version. No rules publication or migration is needed.

Future-only saves do not send today's invalidation stamp. If a save is still waiting when its date becomes today, acknowledgement sends one bounded follow-up stamp so screens that already read the new day can refresh. Failure of that notification cannot turn a confirmed saved plan into an unsaved plan; the acknowledgement explains that other screens may need reopening.

## Verbatim shared surface contract

Source: `docs/surface-colours.md`, Selected design.

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

## Verbatim operational colour meanings

Source: `docs/colour-coding.md`, Shared meanings.

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

## Verbatim action and acknowledgement contract

Source: `docs/action-feedback.md`, The rule.

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

## Verbatim loading and motion contract

Source: `docs/loading-motion.md`, Behaviour.

- The initial HTML names the book and the wait before the deferred app scripts run.
- Active waits trace only a detail of the matching native icon, on a 1.8 second cycle with a rest. The base drawing stays visible. A prep checkmark never suggests an unconfirmed completion.
- First list loads use decorative handwritten placeholder rows in the existing notebook. They are hidden from assistive technology. Loaded recipes remain usable during their existing background check; its status changes without replacing the search field or results. Very short recipe checks do not flash a message.
- Lazy editors, reports, access checks and update checks name the actual work. Offline and failure messages remain actionable and static.
- Busy save buttons keep a stable minimum width and touch height. Existing pending flags prevent repeat submission. A confirmed check is shown only in existing success branches after the write resolves. Drafts and queued-write warnings keep their existing meaning.
- Guide preparation counts completed pages. Guide saving counts acknowledged page writes, any old-page cleanup and the final guide record. It cannot reach completion while the final record is still pending. Unknown totals show a named wait without a percentage.
- Landing dockets have one small entrance per page session. Reduced motion removes tracing, entrances and progress transitions. A known browser offline event immediately stops active decorative traces, without triggering reads or retries. Pending operations keep their busy markup even when drawn offline, so the same icon resumes on reconnection (4 Nov 2026, replaces #462). Settled errors and offline results remain still.

## Council current-contract, reference and adversarial criteria

The following is copied from `.claude/skills/service-council/SKILL.md` between Current design contracts and Round 1. It supplies the same seven-app principles and failure families to every reviewer.

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
| Access and conflicting state | Can a wrong role read or write, a stale session retain authority, or two writers silently lose each other's work? Check current role/device, draft-versus-saved and version contracts; hidden controls alone do not prove enforcement. |
| Misleading presentation | Could colour, motion, disabled controls or hidden feedback imply success, availability or food safety that is not established? Can the task and recovery still be understood without colour or a mouse? |

Round 1 records risks and the evidence needed to test them. Round 2 exercises supported interactions in isolated previews or existing test fixtures where possible, including new failure paths in a proposed mix. Use synthetic data; this review does not authorise disruptive production tests, real staff identities, operational writes or notifications. If a preview cannot exercise a case, say so and name the smallest later check. A source review or mock is not proof of live behaviour or server enforcement.

Record **Break-it findings** in the existing brief: scenario and role/state, expected result, observed result or hypothesis, impact, evidence location and environment, smallest repair or verification needed, and disposition. Label evidence **Reproduced**, **Checked in [named fixture]**, **Risk / Not evidenced**, or **Not applicable** with a reason. Checked means only the stated case and environment passed. Keep security reproduction and authority-bypass details in the existing private evidence record; the public brief contains only a non-sensitive outcome, fix and verification summary.

The lead reconciles findings before recommending: say what was fixed and checked, what still needs verification before readiness, and what is deferred with a reason. A preference score or majority vote does not resolve a demonstrated failure. Keep unresolved access, data-loss or service-blocking failures prominent; change the recommendation or name the required repair. A hypothetical concern remains a risk, not a claimed defect. If no actionable issue was found, state the reviewed scope and limits instead of claiming the design cannot break.

## Guidance landed while this review was running

Current main reached `fdf807f` after the baseline freeze. Commit `4f3edca` extends the council contract with these exact excerpts. They apply to Round 2; the original Round 1 packet remains an honest record of its earlier source.

> Label measurements as **Preview** or **Implemented app**, with the source commit, role, viewport, fixture and font conditions. A schematic that omits the app header, reminders or full form fields cannot establish delivered density or task cost. Before marking a layout change ready, remeasure the complete implemented app at the relevant widths with its actual shell, full forms, representative data and states. Record any difference from the chosen preview, including extra scrolling, fewer visible lines/groups or added taps. Material departures from the approved design return to the head chef under the existing design-choice rules; do not rerun the whole council for routine verification.

> Time boundaries: For time-based features, check just before, at and after the relevant Queensland midnight, deadline and recurrence boundaries, separately from the 04:00 device unlock. Do accepted work and saved anchors survive rollover, and are required records ready before actions become usable? Use the feature's current contract; do not assume every feature changes day together.

The reviewer opening now explicitly says to distinguish Preview from Implemented app and flag complete-app checks before release. The Keeper brief additionally says an updated clock does not prove next-day records are ready. This preview has a fixed fictional 14:00 clock. Midnight/04:00, acknowledgement crossing midnight and real next-day data readiness are **Not evidenced** here; name the existing client time-boundary checks needed for implementation. No new council round is required.

`fdf807f` also repairs fallback-font date wrapping in the actual app. The measured app baseline remains explicitly `29258e6`; do not silently relabel it current-main evidence. The preview bundle is unchanged. The live implementation will need a fresh complete-app comparison.

## Round 2 evidence and response

Round 1 was Build smaller, 5 of 5. Read `brief.md`, `preview-evidence.md`, `preview-verification.json` and any supplemental `focus-controls.json` and `new-context-controls.json` evidence in this folder. The brief contains the three central ideas, meaningful pairwise differences, measured tasks, trade-offs and proposed departures. These are new A/B/C labels; the current released C is the baseline, not option C in this review.

Inspect every option at phone and laptop: `preview-{a,b,c}-team-390.png` and `preview-{a,b,c}-team-1280.png`. Also inspect the embedded chef frame and largest/long-text evidence relevant to your role; no complete person initially fits at largest text, which must not be hidden by normal-size metrics. `preview-{a,b,c}-draft-break-390.png` exercises details. The shared interactive page is `preview.html?design=A|B|C&frame=team|chef`; `index.html` compares the phone views. All records are fictional and all responses simulated. Source hashes below freeze the preview bundle. Do not edit it.

Use your supplied reviewer role. Under 300 words, plain Australian English, no em dashes. First judge whether the options differ structurally. Rank all three best first, and explicitly give rank points: 3 for best, 2 for second and 1 for third. Include a strength and weakness for each. For EVERY option identify one contribution to take or reject with a reason and a relevant seven-app principle. Explicitly assess A+B+C: could blending all three beat your preferred single option, and what conflicts or cost would it add? Do not assume a blend's agreement or inherit its component scores. Finish with one clear recommendation and main downside. Include Contract fit with strongest measured evidence and limits. Skeptic/ Keeper prioritise up to three leading concrete failure paths and distinguish Checked in the named prototype fixture from Risk / Not evidenced. No production probing, staff contact, shared edits or implementation.

### Frozen preview files (SHA-256)

- `preview.html`: `be9cdbb0fe8c741c7715926f3bed8c78c0fc0acb197c796c3411e2b32074fc59`
- `preview.css`: `b7ea5d5473721f1cd6d97e72d2c86c8f38d601e9927a750b4f2a86f450cfff03`
- `preview.js`: `3787bb9bf36a49e24fc67a6835d0b6e6856275ee65c6157d3eebbf20ea398690`
