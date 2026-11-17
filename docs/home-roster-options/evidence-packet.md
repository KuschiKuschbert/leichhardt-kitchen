# Evidence packet: Home's team board and the roster hours

Source commit `547a1b3` (main, 17 November 2026). Every reviewer gets this same packet and the proposal (`docs/home-roster-options/proposal.md`). Screenshots are in `docs/home-roster-options/`: open them with your image reader.


## Screenshots (Implemented app, stand-in, fallback fonts, synthetic roster day, 14:00)

- `today-ari-390.png`: Ari (staff, Lunch, Grill) on Home at 390 px: the dark Your day board ends, then On with you (Lunch team).
- `today-fold-390.png`: Ari's View today's full team opened, 390 px (Lunch, All day, Dinner across).
- `today-mo-390.png`: Mo (rostered 10:00 to 21:00, cut into Lunch, All day and Dinner) on Home at 390 px.
- `today-gus-1280.png`: Gus (head chef, on the plan) on Home at 1280 px, whole page.

The day: Gus head chef 08:00 to 15:00 and 17:00 to 21:00; Sam sous 16:00 to 21:30; Ari 10:00 to 15:00 Grill; Bea 11:00 to 15:00 Pans; Cal 10:00 to 14:30 Fryer; Dev 12:00 to 20:00 Larder; Mo 10:00 to 21:00 Larder; Eli 17:00 to 21:00 Grill; Fen 17:00 to 21:00 Pans. Services: Lunch 10:00 to 15:00, All day 15:00 to 17:00, Dinner 17:00 to 21:00. Breaks set for most; Cal and Gus on a break at 14:00.


## Measured (Implemented app)

| Check | Result |
| --- | --- |
| On with you card, Ari, 390 px | 420 px, 0 taps |
| View today's full team (fold), Ari, 390 px | 696 px, 1 tap |
| Times repeated in the fold | Mo 3 slices, Dev 3, Gus 2, Sam 2 |
| Mo on On with you | "Mo 10:00 to 15:00" (rostered 10:00 to 21:00) |
| Dev on On with you | "Dev 12:00 to 15:00" (rostered 12:00 to 20:00) |
| Mo's Your day | "Your section: Lunch · 10:00 to 15:00, Larder" |
| Sideways scroll, browser errors (390, 1280) | none |


## Current contracts (excerpts)

### Staff-first Home (`docs/home-staff-first.md`)

Home answers the staff questions first: **what section and shift, when is my break and when do I return, who is on with me?** Kitchen work follows. Preserve Barlow, Barlow Condensed and Caveat, the pinned dark board and warm paper, current clock, logo and navigation. There is no global section/service picker.

## Contract

- `#hm-day` shows the existing personal section precedence, configured shift hours and full break window, length and return. On-break, split, completed-break, no-break, changed, unassigned, loading and failed-plan states stay distinct. Your day retains additional breaks, later shifts and save metadata.
- `#hm-with` shows scheduled coworkers by selected shift or overlapping configured shift hours, excluding the signed-in person. This is a saved plan, not a claim that somebody is physically present. Names stay visible. Without a usable personal assignment, use the full saved day and label it On today. Since 10 November 2026 both show as the section board in [On today board](#on-today-board-10-november-2026).
- The native full-team disclosure retains every saved shift, person, section and break. Since 10 November 2026 it shows only when the card holds one shift's coworkers; a card that already holds the whole day has no fold. Staff get read-only records; chef planner links retain `teamOK()`.
- Work reminders, order cut-offs, functions, pings, minutes and Prep by section follow the personal/team group. A confirmed empty work board is hidden; loading/error information is retained.
- Reuse `tm.rec`, the existing team stamp/read, `tmNow`, `tmNextBreak`, `tmSecWords` and personal section precedence. Never use the unsaved `tmf` planner draft or a stale/failed roster as current truth. Existing paint paths update times and changed plans without a new query.
- Functions-only users retain their existing Home. The signed-out Home changed on 15 Nov 2026 (the day as its heading, Kitchen sign in as its main button; `docs/signed-out-home-options/brief.md`). Clock, Cleaning rollout, Guides, prep standards and their permissions retain their shipped implementations. This change creates no independent timer, stock ledger or cleaning system.

### On today board, 10 November 2026 (`docs/home-staff-first.md`)

The owner said On today looked very loud and asked for it to be consolidated. On their real day most chefs work a double: Lunch 10:00 to 15:00, then Dinner 15:00 to 21:00, often on another section, with a two-hour break between. The card listed each person once per shift, alphabetically, with the shift name and hours on every row, so the same chefs filled a whole phone screen. **View today's full team** then listed everyone again by section.

**Quick council check: build smaller.** This changes one existing card: no new tab, bar button, pop-up or step. Three previews ran in the real app with a synthetic double-shift day and the app's fonts: A by shift (558 px), B one row per person (530 px), C a section board (446 px). The owner chose C, the recommendation. Reference fit: Flighty and Airbnb (time, place and status together in one glance); Things 3 (the whole day visible, nothing repeated behind a fold). Contract fit: the sage people surface, words, read and access contracts are unchanged; a bold break state also has its own words.

### Contract

- `homeRotaHTML()` draws a `.hm-rota` table: sections down in the kitchen's order (No section last), the day's shifts across in start order (shifts without hours last), each shift's hours once in its column head. Each saved person and shift is one `.hm-tp` in its cell, names in order; a chef on a double is in both columns. An empty cell means the plan has nobody on that section for that shift.
- A cell shows the person's breaks on that shift ("break 13:00 to 15:00", "split ..." from 150 minutes). While they are on one now it says "back 15:00" in bold instead. The minute paint updates it from the held plan.
- Up to three shifts share one board. With four or more, each shift gets its own one-column board, one under the other, so a phone never scrolls sideways.
- Head chef, or anyone not on today's plan: On today holds the whole saved day and the full-team fold is hidden, because it would repeat the card. Chefs get **Today's team** under the board.
- Staff with a shift: On with you is the board of coworkers on their shift or an overlapping one, as before. **View today's full team** opens the same board for the whole day, without a second On today heading. Its open state still survives clock paints.
- Checking, unset, failed and empty plans keep their existing words. No read, listener, field, rule or saved copy changes: the board uses the plan already held (`tm.rec`).

### Measured

Implemented app, synthetic day of 8 chefs and 13 shift rows, five breaks, at 14:00 with the real Barlow fonts:

| View | Before | After |
| --- | --- | --- |
| Head chef, 390 px | 858 px card, then the same 13 rows again in the fold | 446 px card, no fold |
| Head chef, 1280 px | 865 px | 446 px |
| Staff on Lunch, 390 px, folded | 431 px | 396 px |

Checking who is on takes no tap, before and after. The whole day is no tap for the head chef and one tap for staff, before and after. [Options as chosen](home-staff-first/on-today-board/options-390.png), [phone](home-staff-first/on-today-board/after-390.png), [tablet](home-staff-first/on-today-board/after-768.png), [laptop](home-staff-first/on-today-board/after-1280.png), [staff with the fold open](home-staff-first/on-today-board/after-staff-390.png), [four shifts](home-staff-first/on-today-board/after-four-shifts-390.png).

`tests/home-rota.test.js` checks the board at 390, 768 and 1280 px, the double, the break words, the hidden fold, the staff fold, three and four shifts and no team listener: 57 of 57 pass, and it failed 8 of 20 on the old Home (the rest need a board to run). The Home, roster, welcome, colour and pattern tests now look for `.hm-tp` in `#hm-with`. Revert the change to restore the list; no saved data changes.

### Roster hours saved with the plan, 15 November 2026 (`docs/roster-import-options/brief.md`, Step 5)

The owner said: "We seem to have somehow lost the working hours for imported rosters in Today's team". The hours had never been saved. They lived in the importing device's memory (`tmRs.times`), so a reload, the 04:00 refresh, an update or a lock lost them, and sous chefs never saw them; a split roster kept only its last shift. Asked who should see saved hours, the owner answered: "I thought we agreed that everyone on the day sees who's coming in when" (8 Nov 2026: staff see who is on today, with shift times, from Home).

**Quick check (small change to existing pages: no new tab, button, pop-up or step).**
- **Where the hours go:** each person's roster hours are saved per shift on their plan entry: `team/<day>.on[] = { id, sh, sec, from, to }`, from the import (`tmRsAdd()`).
- **Where they show:**
  - the grid's "Roster 10:00 to 21:30" line, now from the saved or draft plan (`tmHoursWords()`), with a split shown in order;
  - Whole day review;
  - the saved overview ("Lunch, roster 10:00 to 21:30");
  - Your day ("Lunch · 10:00 to 21:30", and "Lunch from 11:00" before the start);
  - each On today cell, as a quiet line under the name. Only "back 15:00" stays bold.
- **What changes nothing:** Copy last weekday never copies last week's hours. Removing a service removes its hours. A chef's later Save keeps them.
- **Contract fit:**
  - No new read, listener or rule: the rules check the list sizes only, confirmed on the emulator (`client-shapes.test.mjs`: chefs and admin allowed, staff refused, all 291 rows pass).
  - Every value is checked as whole minutes before it is drawn or saved.
  - Older code ignores the extra fields, so a revert loses nothing saved.
  - Reference fit: Flighty and Airbnb (real times with the person and place).
- **Lines:** the On today card on a 390 px phone, eight people on a double, all with hours: head chef 476 to 581 px, staff 396 to 486 px. Each cell gains one quiet line; this is the cost of "everyone sees who's coming in when". Taps are unchanged.
- **Break-it:**
  - A broken stored value (text, from after to, a fraction) is dropped, never shown or written back: checked.
  - A sous chef's Save after the import keeps every hour: checked.
  - Split shifts show each part: checked.
  - Old code: the new checks fail 8 of 8 on the code before this change.

**Checks:**
- `tests/team-roster-hours.test.js`: Home On today and its whole-day fold, Your day, the grid, the saved overview, Whole day, a Save keeping hours, removing a service, broken values, and Copy last weekday. It fails 8 times on the old code.
- `tests/roster-import-ui.test.js`: hours saved on Thursday and on all six days, seen on another phone by a sous chef, and kept through that sous chef's Save.
- 38 related files pass locally.

### Roster time cut to each service, 16 November 2026 (`docs/team-order-clear-options/brief.md`, Chosen)

16 November 2026: the head chef chose **D, the mix (Recommended)**. On the open questions:
1. **How a roster time maps to services:** the head chef pointed out that All day dining runs 15:00 to 17:00, between Lunch and Dinner, and chose **cut to each service** (Recommended): a 10:00 to 21:00 cook is saved as Lunch 10:00 to 15:00, All day dining 15:00 to 17:00 and Dinner 17:00 to 21:00, and the bar still reads as one day. This changes the 14 November rule (every service a roster time touches, saved with the whole time) to: every service it touches, saved with its own part.
2. **A service added by hand:** **their roster hours that day** (Recommended), cut to the service's hours; with no roster hours, the service's own hours.
3. The 9 November order rule gives way to time order.

Recorded in `docs/head-chef-decisions.md`.

### Rostered hours label in Today's team, 17 November 2026 (`docs/roster-import-options/brief.md`)

Under each name in the chefs' planner, a label filled with the people colour (`--surface-people-edge`): ROSTERED HOURS, then each part of the day in bold. The planner joins a person's services into one day (a bar on one clock). Home was not changed.

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

## The council skill's sections every reviewer applies

## Current design contracts

Before either round, read the current `CLAUDE.md` reading map and the affected feature's chosen design and later decisions. Prepare one short evidence packet for every reviewer: the source commit, relevant contract excerpts with file and heading references, baseline screenshots and available measurements. Include this section, Design references and Try to break it below. Fresh agents do not inherit the lead's reading: a bare link or "keep the approved colours" is not enough. Reuse the packet between rounds unless the contracts or proposal change; the quick check reads the same sources without spawning reviewers.

Every visual proposal includes the relevant parts of [shared surface colours](docs/surface-colours.md#selected-design), [operational colour meanings](docs/colour-coding.md#shared-meanings) and [design patterns](docs/design-patterns.md). Include the affected category exceptions, plus [action feedback](docs/action-feedback.md#the-rule) and [loading and motion](docs/loading-motion.md#behaviour) when states or interactions are involved. These documents own the tokens and detailed rules; do not create another palette in a feature brief.

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

Use these in both rounds and small-change quick checks (head chef, 9 November 2026). They turn the [seven-app research](docs/whole-app-redesign-options/brief.md#what-the-seven-apps-do-well-and-what-fits-a-kitchen) into questions about the kitchen task. Give this section to every reviewer. Select the principles that apply; briefly explain when none do. There is no reward for copying more apps.

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

The service rules, current feature contracts and the head chef's later choices take priority over the research and its early recommendations. Keep the book's approved colours, notebook style, handwritten line words and functionality. Use existing [design patterns](docs/design-patterns.md), [action feedback](docs/action-feedback.md) and [loading and motion](docs/loading-motion.md). Approved celebrations, Saved/New stamps and useful motion remain; motion must respect reduced motion and never delay an action or shift a live list. Keep current access, draft recovery and read-budget rules.

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
