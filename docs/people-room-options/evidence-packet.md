<!-- Kept as given to the reviewers. -->
# Evidence packet: restyling the admin panel's Team › People page

19 November 2026, Queensland. Source: `main` at c5612d6 plus pull request 765 at 9d8e4e8 (Delete for good on each People row, ready to merge). Role-based analysis on the click tests' stand-in with made-up people, not research with staff. Pictures and numbers are the **Implemented app** on the stand-in (Chrome, the book's own fonts), not a preview.

## What the owner asked

The owner is the head chef. Right after adding Delete to the People rows, they asked: "should we restyle the peoples room in the admin panel?" The lead answered: probably yes, but through this council first. The owner then said to run it.

## Who uses the page, and how often

- **Only the owner**: the admin panel needs their verified Google account plus their own head chef PIN on that device. Sous chefs never see this page; they have their own Staff page in the Chef panel (a short list of rows, add and Stopped working here only, picture `now-sous-staff-390-first.png`). Staff never see either.
- **Not a service page.** Used when someone starts, leaves or changes role, when a PIN is forgotten, and to check who may do what. How often is not measured; by its jobs, a few times a month, on a laptop or a phone.
- **What the owner does today**: Admin › Team room › People tab, scroll or search to the person, change the row, then Save changes in the sticky Save bar that appears once something changed.

## The page today (what it holds, in order)

1. Room heading "Team", tabs People and Today's team.
2. Block "People": a fold "How roles and ticks work", a hint "Tick Create/edit functions beside a person, then save. Their kitchen role stays the same.", a warning when nobody is Head chef.
3. List tools from the shared `lvHTML()`: Search names, Sort (Order added, Name A to Z, Role), a filter chip menu "Everyone 15" (Everyone, On the list, Sous chefs, Staff, View only, Functions, Off the list) **and** a second "Role: All" picker.
4. A table, one row per person, **every row an open form**: a name box, a Role select (Head chef, Lead, Sous chef, Staff, Functions coordinator, View only), four tick boxes (Write, Tick, Remove, Create/edit functions; the head chef's three are fixed on), then links: Open page (the person's own page with their role, what they may do and their last N days), Reset PIN (two taps, writes at once), Stopped working here (two taps, waits for Save; becomes Put back on a row that is off the list, the row faded), and **Delete** (two taps, red, waits for Save; Undo on the slip; never on the head chef's row; admin only, added by pull request 765).
5. Add a person (a new blank row, starts as Staff), Add several names (a text box, one name per line, Add these names as Staff).
6. The sticky Save bar once anything changed: Save changes, Undo unsaved changes (two taps), "2 unsaved changes", the line "The staff list changed on another phone while you were here. Only what you changed is saved on top of it." when another phone saved meanwhile.
7. When a sous chef changed roles or ticks on their own page, the owner sees those changes with **Keep these changes** and **Undo them** (only the owner's save updates the real permission lists).

## Measurements (Implemented app, stand-in, 15 people: 2 sous chefs, 1 lead, 8 staff, 1 view only, 1 functions coordinator, 1 off the list, 1 long name "Wiremu Te Rangi-Harrison", the head chef)

| Width | Page height | Table starts at | One person's row | People fully on the first screen | Sideways scroll |
| --- | --- | --- | --- | --- | --- |
| 390 × 844 (phone) | 6,761 px | 831 px | 375 px (324 px off the list) | **0** | none |
| 768 × 900 (tablet) | 6,139 px | 968 px | 324 px | **0** | none |
| 1280 × 900 (laptop) | 2,954 px | 914 px | 111 px | **0** | none |

- At 390 px one person is a card of name box, role, four ticks with headings and four links on three lines: about 2.2 people per screen once scrolled. With the 1280 table, the links wrap onto two lines (Open page, Reset PIN / Stopped working here, Delete).
- The long name is cut inside its box at 1280 ("Wiremu Te Rangi-H...") with no way to read it without clicking in.
- The sous chef's Staff page rows are 116 px each at 390 px (initial, name, "Staff · Add, tick" line, one button).
- The admin pages audit (4 Nov 2026, `docs/admin-pages-options/brief.md`, finding 5) already said: "People is 2,480 px because every person is an open form." Nothing since has changed the People list itself; the person page (Open page, 5 Nov) was added beside it.

### Taps for the main jobs today (1280 and 390 the same, scrolling not counted)

| Job | Taps today | Notes |
| --- | --- | --- |
| Add a new starter | 2 + typing (Add a person, type the name, Save changes) | Add a person is at the bottom of the page, under every person |
| Change one person's role | 3 (role select, option, Save changes) | find the row by scrolling or Search names |
| Change one tick | 2 (tick, Save changes) | |
| Someone left | 3 (Stopped working here twice, Save changes) | |
| Delete for good | 3 (Delete twice, Save changes) | |
| Reset a PIN | 2 (Reset PIN twice) | writes at once, no Save |
| See one person's page | 1 (Open page) | |
| Read who may do what | 0 taps, but 0 people on the first screen; a table of ticks, not words | |

## Cost and risk of a restyle

- Code: `peopleListHTML()` and maybe `personPageHTML()` in `js/prep.js`, `css/app.css`. No new reads, listeners, writes, rules or saved data needed; the draft and Save stay as they are.
- Tests: about 40 click-test files open People or use its controls (`a-remove-person`, `a-reset-pin`, role and tick boxes, `.a-name`, `a-add-person`). Every selector that moves must move in those tests in the same pull request. One or two pull requests.
- Relearning: one person (the owner).

## What must stay (current contracts)

- **One draft, one Save** for the team list (`startDraft()`, `mergeDraft()`, `adminSave()`, `saveConfig()`). The owner's save is the only path that updates the canonical permission lists (`addIds`, `tickIds`, `delIds`, `staffIds`, `sousIds`, `headId`, `fnIds`, `fnOnlyIds`; `docs/staff-capabilities.md`). Sous chef requested changes keep Keep these changes / Undo them.
- **Leaving** (decision D6, 20 Oct 2026): Stopped working here keeps the person, faded, with Put back. **Delete for good** (19 Nov 2026): admin only, two taps, Undo, Save wipes the person and their PIN together; never the head chef's row.
- Reset PIN (two taps, at once, names the person), Open page (the person page), Add a person, Add several names, search, filter and sort through `lvHTML()`.
- The head chef row: role and the three ticks fixed while the owner is not the one changing it; a warning when nobody is Head chef.
- Text: every name through `esc()`; Australian English, no em dashes, plain short words.
- Screens: 390, 768 and 1280 px with no sideways scroll; tap targets 44 px; build from `docs/design-patterns.md` or add the new pattern there.

## Proposal for round 1 (no design yet)

Restyle People so the page reads first and edits second: the people near the top, one compact line each saying their name, role, what they may do in words and whether they are on the list; changing a person happens for one person at a time; the rare actions (Reset PIN, Stopped working here, Delete) move off the always-visible row; Add a person moves up. Keep the one draft and Save. Fix the cut long name, the double filter and the stray hint. Possible directions only; round 2 would draw them.

## Current design contracts (excerpts)

### Shared surface colours (`docs/surface-colours.md`, Selected design)
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

### Operational colour meanings (`docs/colour-coding.md`, Shared meanings)
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

### After the tap (`docs/action-feedback.md`, The rule)
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

### Admin patterns (`docs/design-patterns.md`, Admin)
- **A role panel** uses panelShellHTML() for the owner's and chefs' same ad-admin/ad-layout shell, rail, heading, tabs and a-pane. Each supplies a separate permitted page list and state. The chef panel at #/chef uses the same responsive room navigation and Find, with working existing editors inside it; owner page descriptors and privileged loaders are never its source of access. [Chosen contract](chef-panel-options/brief.md).

- **A block** is a `.set-block` with a `.label` or an `h3.a-ch-h` heading (the page's chips read them).
- **A row that opens another page** (the chef panel's Kitchen tools, 15 Nov 2026, [brief](chef-kitchen-options/brief.md)) is an `a.c-tool` in a `.set-block.c-tools`: the page's name, one sentence on what this role can do there, and "Open ›" in words (`.c-tool-go`). The whole row is the link, at least 56 px tall, one layout at every width. Never a tab or a tile that only leads to one Open button.
- **A list that grows** goes through `lvHTML()`: search, filters, sort, Show more and phone cards come with it.
- **A table** sits in `.a-tablewrap` (a region that scrolls sideways and fades at its edge) as `.a-table.a-plain`. A colour scale (the skills matrix, shifts on each section) uses cells `.sk-c` with an `.a-legend` key, and counts, never a verdict.
- **The Inbox** (redesign step 8, 8 Nov 2026) is Today's first page (`.dsh-inbox`): today's numbers as tiles (`.dsh-dtile`, each a tap into its report, a record not read says so in words, never 0), then what needs the head chef. A new thing that needs the head chef is a row there, not a new page.
- **Admin Today** (head chef, 10 Nov 2026, [brief](admin-dashboard-restyle-options/brief.md)): the Inbox and the Dashboard are titled by their own names under Today. The Inbox puts what needs you first, each row with its state word and a button to where it is done (no picked-row pane), then today's numbers as one line each. The Dashboard keeps its period chips on top, headlines tagged with their period, the week ahead with only the days that have something on, one comparison table (`.dsh-cmp`, measure names open their reports, change in words by `delta()`), the watch list, then the charts behind one button (`.dsh-charts-btn`, open or shut kept in memory). Blocks keep their heading band without a frame. Today's team not set is attention (`.dsh-tag-att`), not failure.
- **A cross-training hint** (head chef, 10 Nov 2026, [brief](cross-training-options/brief.md)): `.tm-learn`, plain muted words under a person's planner row, only where a pairing is possible in this plan, at most two a service.
- **Find** (`.a-find`, the `/` key on a laptop) opens a sheet (`.fd-sheet`) with a type-to-find box over every page, the open page's parts (the On this page headings) and the people. It reads nothing. A new admin page is found by its tab name, a new block by its heading.
- **At a glance** (head chef, 12 Nov 2026, Look 1, [brief](team-glance-options/brief.md)): a report page's findings first, as cards in the Dashboard's headline form (`.dsh-head-list`, `.dsh-head`, `.dsh-tag`, `.dsh-more`), in a `.tm-glance` list under an `h3.a-ch-h` named At a glance, with one status line saying when the counts run to or that they are old. Each card's link jumps to its detail on the same page (`data-p="jump"`). Used on Reports, Team; no reads of its own.
- **The laptop rail** is dark: Find, the Inbox with its count and the Dashboard (`.a-quick`), then the four rooms. On a phone Find sits in the page heading and the rooms stay one row.

### Loading and motion (`docs/loading-motion.md`, Behaviour)
- The initial HTML names the book and the wait before the deferred app scripts run.
- Active waits trace only a detail of the matching native icon, on a 1.8 second cycle with a rest. The base drawing stays visible. A prep checkmark never suggests an unconfirmed completion.
- First list loads use decorative handwritten placeholder rows in the existing notebook. They are hidden from assistive technology. Loaded recipes remain usable during their existing background check; its status changes without replacing the search field or results. Very short recipe checks do not flash a message.
- Lazy editors, reports, access checks and update checks name the actual work. Offline and failure messages remain actionable and static.
- Busy save buttons keep a stable minimum width and touch height. Existing pending flags prevent repeat submission. A confirmed check is shown only in existing success branches after the write resolves. Drafts and queued-write warnings keep their existing meaning.
- Guide preparation counts completed pages. Guide saving counts acknowledged page writes, any old-page cleanup and the final guide record. It cannot reach completion while the final record is still pending. Unknown totals show a named wait without a percentage.
- Landing dockets have one small entrance per page session. Reduced motion removes tracing, entrances and progress transitions. A known browser offline event immediately stops active decorative traces, without triggering reads or retries. Pending operations keep their busy markup even when drawn offline, so the same icon resumes on reconnection (4 Nov 2026, replaces #462). Settled errors and offline results remain still.

### Current design contracts (from the council skill)
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

### Design references (from the council skill)
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

### Try to break it (from the council skill)
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


## Pictures (in `evidence/`)

- `now-1280-first.png`, `now-1280-full.png`: the laptop, first screen and the whole page.
- `now-768-first.png`: the tablet, first screen.
- `now-390-first.png`, `now-390-full.png`: the phone, first screen and the whole page.
- `now-sous-staff-390-first.png`: the sous chef's own Staff page (rows), for comparison.
