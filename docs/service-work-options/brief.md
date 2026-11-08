# Kitchen Book service work: design for approval

8 November 2026, Queensland. **Proposed, awaiting design approval.** No production features, rules, data or deployments changed by this work.

Open [the interactive comparison](index.html). It contains exactly two options, as requested, with staff, chef, admin, Functions-only and public previews. Select a screen, scenario and width. All new operational examples are illustrative. Baseline images are real browser captures of the unchanged application using synthetic Firebase data, not photos of the live kitchen.

## Reading map and evidence

This brief is the specification and progress record for this proposed unit. Existing authorities remain `CLAUDE.md`, `AGENTS.md`, `docs/private-kitchen-access.md`, `docs/device-sessions.md`, `docs/staff-capabilities.md`, `docs/design-patterns.md` and the selected whole-app design. No parallel context framework or production instruction changes are needed at design stage.

- **Verified** means inspected source or an explicitly identified test/browser result. Source evidence is not proof of deployed behaviour.
- **Proposed** means a recommended design or implementation contract, still awaiting approval.
- **Unknown** means unavailable or unverified. A historical decision, TODO, example or old implementation claim is not evidence of current working behaviour.
- **Required** marks an explicit requirement from the supplied request. Other workflow choices below are proposals.

Baseline source: `eedbdd7822ad3ecba12439ef9c0ea3c52814c77d`, fetched from `origin/main`. The original checkout on branch `work` at `0ab8ce5` was preserved. Design branch: `docs/service-work-design`, isolated under `.claude/worktrees/service-work-design`. Applicable root `AGENTS.md` directs Codex to read `CLAUDE.md`; no separate scoped instruction files were found outside dependencies. Parent instruction variants were checked and absent.

## Current application

| Finding | Status and evidence | Consequence |
| --- | --- | --- |
| Plain HTML, CSS and JavaScript, hash routing, no application build | **Verified:** `index.html`; routes in `js/app.js`; main kitchen API in `js/prep.js`; lazy feature modules | Extend the current app. No framework replacement, bundler, AI service or inventory prerequisite |
| Barlow body, Barlow Condensed headings, Caveat notebook writing; paper, charcoal and orange | **Verified:** `css/app.css:57`, `docs/design-patterns.md` | Preserve these fonts, tokens, notebook pages, pins and familiar six-tab bar |
| Firebase web SDK 10.14.1, Firestore shared records and rules, anonymous device identity plus separate Google app | **Verified:** `js/prep.js`, `js/firebase-config.js`, `firestore.rules`, access/session notes | New work must use existing authorisation, write wrapper and shared store |
| Home already has Now and next, prep section progress, Coming up and saved team | **Verified:** `js/app.js:590`, `js/prep.js:10037`, `js/prep.js:10158`, `css/app.css:3837` | Refine the shipped design. Old documents saying it is not built are stale |
| Personal session expires at 04:00 Queensland; shared idle lock is 10 minutes | **Verified:** `docs/device-sessions.md`, corresponding session code/rules | Preserve work behind the same person's lock; never replay under the next person |
| Calendar/service records change at midnight, independently of the authentication boundary | **Verified:** `js/boot.js`, `docs/device-sessions.md` | Dates and recurrence use Australia/Brisbane and configured service windows, never viewing-device timezone or an assumed 04:00 rollover |
| Sections, shifts and a versioned daily team plan already exist | **Verified:** `js/prep.js:10618`, `js/prep.js:11857`, `js/prep.js:12223`, `js/prep.js:12338` | Reuse stable IDs, archive flags, assignments and shift hours; allow a visible manual section/shift selection when no usable plan exists |
| Prep is a dated task list, not counted prepared stock | **Verified:** `js/prep.js:1962`, `js/prep.js:2244`, `js/amounts.js:39` | Existing ticks cannot prove usable stock. Preserve task list and introduce an explicit minimum-sheet view |
| Functions generate deterministic linked prep/order effects; totals count platters once across rounds | **Verified:** `js/functions.js:161`, `js/functions.js:255`, `js/functions.js:618`, `js/functions.js:642` | Extend canonical requirements instead of generating duplicate demand |
| Recipe yields and quantities are mostly text, with optional ingredient links | **Verified:** `js/data.js:8`, `js/functions.js:288` | Do not infer conversions, yields, buffers or shelf life |
| No complete cooling record, minimum-sheet, equipment inventory or cleaning scheduler was found | **Verified:** inspected runtime JS and rules. **Unknown:** private venue records not inspected | Build additive records with management setup; source example equipment is not the actual inventory |
| Guides already support Equipment, Cleaning and Food safety | **Verified:** `js/prep.js:8938` | Link approved guides/SOPs. Old default minutes are not proof of approved procedures |
| Reusable sound helper and chef cut-off pushes exist | **Verified:** `js/chime.js:25`, `js/chime.js:119`, `js/prep.js:10320`, `.github/workflows/cutoff-push.yml` | Reuse primitives, but the scheduled cut-off job is not a reliable cooling alarm |
| Saved app shell and public offline recipes; private operational cache in memory | **Verified:** `sw.js`, `js/upkeep.js`, `docs/saved-shell-generations.md`, session note | No persistent private cache or promise that an offline reload retains pending work |

### Workflow traces

| Journey | Existing screen to storage | Proposed extension |
| --- | --- | --- |
| Sign in and role switch | Name/PIN, session and optional matching owner grant, capability-gated page and Firestore rules | Same model for every new read/write; clear privileged subscriptions, DOM, memory, drafts and alerts on handover |
| Home and function reminders | `app.js` landing → `homeSlot/homePaint` and `LK_FN` → existing live records | Fixed summary slots for unresolved cooling, selected service checks and cleaning; no duplicate reminder on Home |
| Booking → prep and ordering | `fnedit.js` → `functions.js` derived effects → atomic booking revision and linked requirements | Protected procurement documents, revision-aware prep adjustment review, service information retained |
| Prep task completion | `#/prep` → capability check → `W()` → `days/<date>/items` | Minimum checks reference the same item/recipe and canonical function requirement; progress and counted availability remain distinct |
| Section and shift setup | Admin Kitchen settings → `config/main.kitSecs/kitShifts`; chef roster → `team/<date>` | Reuse these settings and plan. Keep existing authority for editing shared kitchen structure |
| Notification | User gesture → `LK_CHIME`; authorised cut-off push registration → scheduled job → service worker | Foreground cooling cues first. Any closed-app delivery is a separate opt-in service capability with device verification |
| New cleaning work | No scheduler verified; guides provide possible SOP links | Equipment → approved template revision → dated occurrence → attributed completion event |

## The two options

### A. Refine Now and next, recommended

Keep the kraft board, charcoal attention card and pinned paper sections. Give the attention area a stable reserved position for unresolved exceptions and at most two visible attention rows, with an explicit count/link for all remaining work. The chosen section, shift, service date and freshness sit directly below the heading. The next paper card is Your section: minimum checks, ordinary prep link and cleaning due. Functions follow as compact service cards. Team and Coming up stay available after current work. Keep seasonal presentation under existing settings and avoid motion while interacting.

Cooling details, minimum sheets and cleaning sheets are focused pages reachable from their Home summary and the existing chef menu. Prep keeps its familiar list as the default and gains a Minimums view inside the page. No seventh bottom tab or new top-bar icon. New actions use established 44 px controls with explicit words. Ordinary tick, On it, Urgent, Add a line and Recipe actions retain their current positions and tap counts.

Advantages: recognisable, lower relearning, quieter normal day, smallest integration with current Home and permission gates. Cost: current work needs vertical scrolling on a phone; management uses focused pages rather than seeing every section at once. New safety work consumes space on Home, not on the ordinary prep list.

### B. Structured service dashboard

Use the same tokens and six tabs, with a service workspace under a shared date/section/shift header. At wide sizes, left column Attention and cooling, centre selected-section prep and cleaning, right column Functions and Coming up. On a phone these become one ordered flow; no horizontal dashboard scrolling. Management adds a section-by-section readiness overview beside its editor.

Advantages: stronger comparison across sections on a shared tablet and laptop, more visible simultaneous cooling batches, useful for a chef coordinating a busy function day. Cost: more visual groups and ongoing empty/setup states, greater relearning, more responsive layout and focus-preservation work. It does not earn extra listeners or private data access merely because there is room for more cards.

Both options provide all five features and all affected management pages. They differ in hierarchy, grouping and wide-screen composition. Approval chooses a layout, not whether safety evidence or access control is implemented. A is recommended because the app's recent whole-book design is already familiar; B's management overview can use the same existing Chef's Desk split view without turning every staff Home into a dashboard.

## Five feature contracts

### 1. Cooling and reminders

**Required:** named concurrent batches, 2-hour and 4-hour presets, section, creator/session, process times, deadline, stage, status, persistent unresolved handover, separate acknowledgement, measurement and outcome.

**Verified external guidance:** FSANZ describes cooling 60°C to 21°C within 2 hours, then 21°C to 5°C within a further 4 hours. This is distinct from its cumulative time-out-of-refrigeration 2-hour/4-hour rule. **Unknown:** the venue's approved start method, measurement practice and exception SOP. Activation of guided outcome recording requires these management inputs; design approval does not certify a venue procedure.

**Proposed flow:** Home → Cooling → batch name or exact linked recipe/prep item, section, observed temperature and measured process start → **Start 2-hour timer**. Reuse known fields without silently claiming a worker from a shared role PIN. First deadline is `documentedCoolingStart + 2 hours`. A hotter observation may be recorded but must not invent when food crossed 60°C; the approved SOP determines the conservative/manual start method.

**Record temperature** asks for actual temperature and time measured, defaulting visibly to now. Time entered is a separate server timestamp. A first-stage reading at or below 21°C within the original stage window supports the transition. **Start 4-hour stage** links that reading to the same batch; deadline is `transitionMeasuredAt + 4 hours`. A late click or late entry creates no extra time. Show the derived deadline before confirmation. If an entered observation is already outside a deadline, immediately show the elapsed/exception state, not a fresh full-duration countdown.

The requested standalone **Start 4-hour reminder** remains available, clearly labelled Reminder only. It cannot become a successful cooling record without first-stage evidence. A final actual reading at or below 5°C can support early completion when valid first-stage and final evidence exists; an explicit **Complete cooling record** review confirms the recorded outcome. Acknowledging the alarm records an alert event only. No target reading, missing transition evidence or a late stage remains **Check required** or **Exception for review**. Never infer safe food from an expired countdown. Do not invent disposal, reheating or corrective instructions.

Late entry of a genuinely earlier measurement records both times and requires a reason; edits append an attributed correction with the superseded event reference. A later measurement cannot be backdated silently. A missing first-stage observation cannot establish compliant timing. It does not authorise moving the original deadline or automatically starting a new four hours. No pause/reset/restart removes evidence or exceptions; a replacement reminder is linked to the original unresolved record.

**Persistence and clock:** shared Firestore absolute timestamps are authoritative. Reuse `LK_TIME` and add explicit clock freshness/uncertainty because its current ready flag can mean a timeout. Store observed process times, server entry times and immutable original deadlines. On wake, visibility change and clock correction, recompute display from these timestamps. If clock check fails, show Time not checked and the last checked time, preserve entered work, and require server reconciliation before confirming safety evidence. Intervals repaint only, with zero countdown network writes. Refresh, navigation, reopen and a second device read the same batch. Two active stages never silently overwrite one another.

**Notifications:** permission is requested by an explicit Enable cooling alerts action after explanation, not at startup. User gesture unlocks sound. Foreground due state is reliable only while the app can run; background, locked or closed browsers can throttle/suspend it. Permission denied leaves persistent visible due states and a quiet settings link. No exact alarm or closed-app promise. Optional web push requires scoped subscriptions, a timely server scheduler, retries/deduplication and platform testing; the existing 10-minute GitHub cut-off job is insufficient. Never include private batch names or procurement in lock-screen payloads by default. This infrastructure is deferred unless specifically chosen.

### 2. Function service and protected ordering

**Required:** procurement data/actions only for Head Chef, Sous Chef and Admin. Staff retain permitted service details and ordinary order-list functionality. Functions-only retains its existing restricted scope.

**Proposed:** define the protected procurement boundary across every related display, export, history, cache and direct query, rather than gating one visual bar. Firestore cannot redact selected fields from a readable document. Use a minimal service projection and separate chef-only procurement records, enforced by rules and matching client gates. No staff response contains private ordering fields. Keep legacy data/history available only through its appropriate authority; migrate carefully without public security reproduction details.

**Verified reminder window:** `js/functions.js:63-72` begins at Brisbane midnight on booking date, or the earlier first-round day. End is exclusive, `max(eventStart + 2 hours, lastRound + 30 minutes)`; times TBC remain until next midnight. Preserve that visibility window. It is a reminder window, not proof that service has begun.

**Proposed labels:** Upcoming before its reminder window; Today within the window before first food round; In service from first food round until the existing exclusive end while confirmed; Finished outside that window; Cancelled explicitly when cancelled. TBC says Times to come and never infers In service. For staggered/midnight functions, use actual stored round timestamps. No new invented service-end field is required. At the exact end, remove active emphasis. A reschedule recomputes both old-window notice and new window; cancellation removes active treatment immediately and retains its permitted notice/history.

The relevant In service card/band gains a slightly brighter stationary orange frame plus the words In service. Upcoming and Today remain quieter; cancellation has words and current muted treatment. Multiple functions share compact rows with next round/time and a count, not multiple large banners. Home includes one summary; the existing function band remains on other intended pages. Prep adjustments reference the same function revision.

### 3. Calmer Home for every role

**Proposed order:** Attention now → Your section and shift → Today's functions → Team and Coming up. Staff see their own operational work; chefs see authorised coordination links; Admin has the same operational Home and a management entry, not a different design system. Public stays recipe-only. Functions-only stays on its existing permitted docket/service scope with delivery access preserved. No kitchen operations are fetched for these two groups.

Use the saved roster to suggest a section and shift. If it is missing, show Select section and Select shift with date, rather than assume Lunch or claim ready. Remember a selection per current person/device/service and clear it on handover; show when it differs from the saved plan. Overnight shifts use configured times and explicit service-date ownership. Completed lunch checks never become dinner checks.

Reserve group positions and change status text in place. Stable record keys preserve keyboard focus, input selection and pointer targets. No urgent row is inserted above a held/touched control. A new urgent item updates a reserved count/link; apply new order only on explicit refresh or safe navigation. Resolve/collapse cards after interaction, not while someone is tapping. Countdown announcements happen at meaningful transitions, never every second.

### 4. Minimum prep sheets

**Proposed:** `Prep → Minimums`, selected section/service/date. Keep the normal Prep list. Each item shows exact unit, approved target, confirmed additional function demand, last checked usable amount/time/actor, shortfall and Unchecked, Needs prep, In progress or Ready. Recipe/SOP is a one-tap link. No approved template says Setup required and identifies who can configure it.

`Prep required = max(0, approved target + confirmed additional demand - usable available)`.

An illustrative calculation is explicitly labelled, never seeded as an approved minimum. Each target states whether functions are already included and which demand allocation is covered. If included, do not add it again. Function revision, recipe/component mapping, yield and unit conversion must be verified; missing input says Needs chef check, not zero. An authorised manual override includes exact unit, reason, scope and actor. No inferred conversion between tubs, batches, portions and kilograms. On phones each row stacks Item and unit, Target, Function addition, Usable amount and checked time, Still to prepare and status with explicit labels. Count inputs have an accessible item-and-unit name. **Record usable amount** is the primary action; Ready is derived, never a tick target. **Cannot check** is available without claiming completion.

Available `null` means Unchecked; `0` is a confirmed empty count. Preserve measuredAt and enteredAt separately where needed. Approved freshness/recheck rules determine validity; absent rules mean recheck for the selected service. A stale reading is shown as Previous count, confirm required. On it records progress only. Tick-to-ready cannot add stock. After preparing, record the usable amount; only confirmed current quantities and resolved demand permit Ready.

Start with section-owned counts. Shared pools, when used, have explicit reservation IDs and quantities; atomically validate unreserved availability against pool revision. Each shared portion belongs to one allocation. Until a transfer/allocation is confirmed, both sections cannot count it. This is a small prepared-food allocation ledger, not a general inventory system. If trustworthy common units are absent, show manual chef allocation required.

One dated section/shift requirement identity prevents retries duplicating sheets or function-generated work. Dinner shows lunch's previous count but requires a fresh check. Carry unresolved tasks and references, not a copied completed flag. Function edits/cancellations create a review item with old/new demand and preserve prepared quantities/history. A chef accepts revised adjustments; until then affected readiness says Needs review and lists both values. Historical suggestions are deferred until reliable data exists and always require chef acceptance.

### 5. Cleaning

**Proposed:** Home cleaning summary → section sheet; current section/date/shift is visible. Separate equipment, approved reusable task templates, and dated task occurrences. Shared areas have a configured responsible section/person, not a disappearing Other bucket. No actual equipment or chemical/frequency instructions are invented.

One equipment item may have several templates. Each template contains description, SOP/method reference and version, frequency mode, due window, owner and effective-from date. Draft templates remain To come until mandatory setup is approved. Calendar occurrences use deterministic IDs from template + service date + shift/window. After-use requires an explicit use-cycle ID; no equipment telemetry was found. Completion-based recurrence keys the successor to predecessor ID/sequence and confirmed completion anchor. Template revision is stored in the occurrence so historical instructions remain intact.

**Complete task** is one tap when no additional observation is required, with named Saved/Pending/Failed feedback. Occurrence outcome stores time, personal session recorder and notes. A shared role is not a verified named worker. Blocked, deferred or not applicable asks for reason and stays outside completed totals; proposed chef review is required for deferral/NA and overdue closure. A block remains visible until resolved. Undo appends Reopened/correction with reason; it does not delete evidence. Two writers use the same occurrence version and idempotency key, with the second receiving Already completed by… or a conflict review.

Today plus unresolved work is shown across midnight/shift rollover. Completing today's occurrence never completes tomorrow. Archived equipment/templates stop future generation after the approved effective date; existing open tasks require review and historical snapshots stay. Managers see due/overdue by section and oldest unresolved first. Printing is deferred by default: the repository deliberately removed general Print/Share, with functions a specific exception. A later approved cleaning print sheet would be read-only and could never mark digital work complete.

## Management screens

All pages use the existing Chef's Desk frame and list/editor pattern, `lvHTML()` for growing lists, labelled controls, search for long choices, archive/restore and version conflicts. One scoped Save per editor, explicit unsaved state and existing Back/Resume protection. Never show Saved from a pending local write.

| Page | Authority and content | Validation and history |
| --- | --- | --- |
| Existing sections and shifts | **Proposed preserve:** verified Admin, current Kitchen settings; names, stable IDs, optional hours/archive | Nonblank names, valid windows, references survive archive; no broad chef security/config write |
| Prep minimums | **Proposed:** Head, Sous, Admin; section/shift/item/unit/approved target, includes-functions scope | Zero distinct from blank; effective revision; Save prep minimums; no guessed values |
| Function component mappings | **Proposed:** Head, Sous, Admin; exact recipe/component IDs, yield, source/target units and confirmed conversion | Missing inputs block calculation; show provenance and impacted pending functions |
| Prep adjustments and count review | **Proposed:** Head, Sous, Admin; revised function demand, stale/unknown counts and reasoned overrides | Preserve original target/count, reason and actor; never silently overwrite another chef |
| Equipment and shared areas | **Proposed:** Head, Sous, Admin; actual inventory, location, owner, SOP references, archive | Shared owner required; archiving previews affected open tasks |
| Cleaning templates | **Proposed:** Head, Sous, Admin; equipment, task, SOP, recurrence mode/window, effective date | No activation without method/frequency/owner; immutable version snapshots |
| Cleaning overview and exception review | **Proposed:** Head, Sous, Admin; section due/overdue, blocked/NA/deferred reasons, corrections | Completion count excludes exceptions; review attributable and auditable |
| Cooling SOP, records and alert settings | **Proposed:** Head, Sous, Admin approve procedure references/settings; personal alert permission remains a device choice | No fabricated corrective guidance; original timeline and corrections visible |
| Rollout, role grants and security | **Proposed preserve:** current Admin authority only | Existing device grant/session rules; chefs cannot self-promote |

Existing kitchen sections/shifts are admin-only. The request's Head/Sous/Admin minimums/templates access is accommodated with separate narrowly scoped chef configuration records. Any decision to let chefs change shared sections/shifts would be a separate authority expansion, not silently bundled into this design.

## Proposed permission matrix

Every cell is enforced in rules as well as routing. Admin means the existing verified owner plus live head session and matching device grant. Ordinary Google identity alone is not Admin. All roles retain their existing access outside this scope. A Head/Sous Yes below means the current role and the action's canonical capability both qualify; a sous chef's individually disabled Add/Tick is not silently restored. Chef configuration and review are separate narrow authorities, not a bypass for ordinary service actions. Selecting a section changes navigation only; assignment-based write authority must still be checked against the saved assignment or an explicit chef delegation.

| Capability | Public / locked | Functions-only | Staff / lead | View-only | Kitchen porter | Head / Sous | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public recipes | Current public access | Current access | Current access | Current access | Current access | Current access | Current access |
| Permitted function service information | No | Existing scope | Existing scope | Existing scope | Existing scope | Yes | Yes |
| Function procurement, actions, history | No | No, unless independently Head/Sous | No | No | No | Yes | Yes |
| Ordinary order list | No | No | Existing add/tick/delete capabilities | Current read-only | Existing capabilities | Existing access | Existing access |
| New operational reads | No | No | Current kitchen scope, selected section | Proposed read-only | Existing narrow scope only | Yes | Yes |
| Cooling record/temperature writes | No | No | Proposed explicit approved operational capability | No | No automatic grant | Yes | Yes |
| Minimum counts/progress | No | No | Proposed existing add/tick capability mapping, subject to confirmed responsibility | No | No automatic grant | Yes | Yes |
| Cleaning completion | No | No | Proposed existing tick capability plus assigned section | No | Only if already authorised and explicitly assigned | Yes | Yes |
| Prep/equipment/cleaning templates and adjustments | No | No | No | No | No | Yes | Yes |
| Shared sections/shifts, role/security grants | No | No | No | No | No | Current limits | Yes |
| Historical corrections/exception approval | No | No | No | No | No | Proposed new scoped records only | Yes |

**Unknown:** whether porter is a distinct configured role, actual named responsibilities and any desired new delegation. Preserve canonical role/capability lists and deny new authority by default. Functions booking permission remains separate from chef procurement authority. Selecting a role in the prototype is a preview tool, not an authentication feature.

## Proposed data and integrity

Names below are a design contract, not a deployed schema. Keep all records under the existing kitchen namespace. Exact indexes and field-shape limits are specified and emulator-tested before rollout.

| Record | Key/contents | Integrity |
| --- | --- | --- |
| `coolBatches` + immutable `events` | UUID batch; original process/deadline, stage, section, current version; operation-ID readings/acknowledgements/corrections | No mutable safety history; stable retry IDs; transition checks, server entry time and event coupling |
| Minimal function service projection + private procurement | Function ID/revision; allowlisted service details; separate chef-only order effects/history | No field-level hiding claim; deny alternate queries and legacy private paths after transition |
| `prepTemplates` and mapping revisions | Stable item/section/shift IDs, exact units, target, includes-functions scope | Approved effective revisions, archived rather than deleted |
| `prepServices` / checks and allocations | Date+section+shift+item identity, template snapshot, function revision, usable count/check time, pool reservations | Unknown versus zero; one canonical requirement; versioned count/allocation updates |
| `equipment`, `cleanTemplates` | Stable inventory IDs, owner, SOP; approved versioned recurrence/window | Effective-date archive and snapshot instructions |
| `cleanTasks` + immutable events | Deterministic occurrence ID, due times, template snapshot, state; operation-ID outcomes/corrections | Create-once generation, version-protected completion, unresolved across rollover |
| Bounded active summaries/indexes | Open cooling and due/unresolved cleaning pointers maintained with canonical write | Rules-coupled updates, no orphan summary treated as success; bounded queries with pagination/truncation words |

All new writes go through an extended, tested `W()` pathway. Do not bypass it with direct unauthorised SDK writes. Use existing compare-version batches where rules can validate atomic related records; use a wrapper-supported transaction when availability or state must be reread atomically. An uncertain acknowledgement is recovered by operation ID before retry. Each event carries authenticated recorder ID/device session and, only when verified, a separately reported worker. Corrections preserve original payload, reason and superseding reference.

**Proposed action mapping:** current Add permits batch/reminder creation and entering a new usable count in an authorised section; current Tick permits reading/observation, service progress and cleaning completion against an existing assigned record. A person needs both where an action creates a record and immediately records its outcome. Archive, correction, exception approval, target/template edits and procurement acceptance require the scoped chef authority; role/security changes keep existing Admin authority. Rules whitelist each action's fields and reject unrelated edits. Final call-shape rows for every read and write are a prerequisite to implementation, including negative cases for individually disabled capabilities.

**Proposed server invariants:** entry timestamps use server time and must equal the request timestamp on create. Measurement times cannot be after server entry time; clock uncertainty or future input needs reconciliation rather than a fabricated tolerance. The original process start and deadlines cannot be patched by an ordinary transition. A transition references an existing same-batch observation, validates temperature and measurement order, preserves prior exceptions and couples the new event, canonical version and unresolved index atomically. Repeating an operation ID with a different body is refused. An existing operation with an unknown acknowledgement is read back before retry. A correction is a new event with a reason and scoped authority, not an update to the original reading.

**Proposed reconciliation owner:** a non-chef booking editor saves only its permitted service revision and a revision-bound change notice. Head/Sous/Admin review and accept the corresponding procurement adjustment; that transaction records the accepted revision. Superseded notices remain historical, the newest unresolved revision stays visible, and cancellation invalidates future active demand while preserving prepared quantities and order evidence. Retrying the same revision is idempotent. Until reviewed, procurement and affected minimum readiness say Changes need review. Do not require a coordinator to read private procurement state, and do not quietly depend on an unprovisioned trusted worker.

Home reuses existing data. **Proposed additional cost:** one bounded active-cooling subscription and one due/unresolved-cleaning subscription only while Home or the relevant live feature is open for an authorised role. Minimum sheets load for the selected service; stable setup uses day cache and explicit revision invalidation. Safety handover justifies unresolved prior-day records in those active queries as a documented exception to today's-only listeners. No polling, per-second writes, history query per card or per-item lookup loop. Measure actual document and rules-lookup bills before setting budgets; do not claim zero reads. At a large result cap, say More open records, open full list; never silently hide unresolved work.

Calendar cleaning generation must also work when no phone is open. **Proposed:** an idempotent generator in an existing scheduled job plus on-open catch-up, anchored to stored due times, not the delayed job's execution time. A late job does not make a task newly due. Historical completion does not rely on the generator running exactly on time. After-use occurrences remain an explicit manual action because actual use is unknown. No new external service is required for these calendar records.

## Failure and accessibility contract

| Scenario | Visible behaviour |
| --- | --- |
| Normal service | Quiet attention state, selected section/shift and useful check counts; no false Ready from empty setup |
| Busy function day | Compact function rows, In service frame only when applicable; one reviewed adjustment source |
| Several batches | Independent names, stages and absolute deadlines; View all preserves every unresolved batch |
| Overdue | Check/action required; cooling never says safe, cleaning never disappears at midnight |
| Missing setup | To come, exact missing fields and permitted management link; public/Functions-only see no setup operations |
| Loading or failed read | Named checking state or persistent Could not load with Try again; never empty/zero success |
| Failed save | Preserve input, labelled failure at the action, Try again with original operation ID; no saved tick |
| Poor signal | Last checked timestamp, stale reads and pending changes named; keep tab open, no claim of confirmed persistence |
| Identity switch | Unsubscribe and clear privileged memory/DOM/actions; existing protected drafts stay with original person behind lock |
| Concurrent edit | Keep draft and show newer record/version; no last-write-wins for safety evidence or reservations |

Reuse existing `svButton`, `btnPatch`, `esc`, `sheetBusy/sheetNext`, Ink loading and named action feedback. Important actions use visible words; target sizes at least 44 px; labels and status text do not depend on colour. Keyboard and screen-reader order follows the visual order, focus returns after sheets, errors identify fields, live regions announce state transitions only. No new automatic sheet over a list, flash or per-second aria announcement. Reduced motion keeps status static. Test large text, 200% zoom and fallback fonts at 390, 768 and 1280 widths, including a long batch name and multiple simultaneous functions.

## Implementation sequence after approval

| Unit | Result and dependency | Acceptance evidence |
| --- | --- | --- |
| 1. Contracts, role shapes and migration rehearsal | Final field allowlists, clock freshness, compare-version event writes; private backup/dry-run plan | Emulator every read/write shape and role; duplicate/retry/conflict tests; no real data mutation during rehearsal |
| 2. Function procurement boundary | Prepare private projection/history and compatible clients; preserve service/ordinary orders | Staff direct reads/queries deny procurement; Head/Sous/Admin work; Admin→Staff clears caches; cancelled/rescheduled/multiple/midnight functions |
| 3. Cooling vertical slice | Configured SOP, named batches/readings/corrections, due states and foreground alerts | Controlled clocks; early/late/missing observations; late entry; refresh/reopen/second device; no alarm acknowledgement completion |
| 4. Minimum sheets and configuration | Approved targets/mappings, service checks, allocation and function review | Zero/null/stale; missing units; target already includes functions; no double allocation; Lunch→Dinner requires recheck |
| 5. Cleaning and management | Actual equipment/templates, idempotent generation and dated outcomes | Concurrent opens, retries, daily/weekly/after-use/completion anchors, overdue rollover, snapshot history and exception counts |
| 6. Home composition | Chosen layout and role-aware fixed summaries | Phone/tablet/desktop, no scroll overflow/focus jumps, stable controls, read budget, preserved routes and six tabs |
| 7. Release validation and handover | Backup/PIN-move coverage, supported-device matrix and staged activation | Existing recipes/editing/orders/suppliers/delivery/waste/transfers/messages/navigation regression; live lock probe and release checks |

Keep units small and reviewable, coalescing related documentation-only changes. No production rules publication, merge, feature activation or deployment before the requested design approval. After approval follow existing PR checks, release windows and rule publication ordering.

### Staged migration and rollback

1. Add backward-compatible schema/rules and private backfill tooling on the feature branch. Rehearse against synthetic/emulator data, count records and verify expected projections. Include new collections in backup, recovery and kitchen-PIN move contracts.
2. Prepare missing configuration as editable drafts with no invented venue values. Backfill private ordering/service projections before switching reads; preserve all existing operational records and audit history.
3. Ship a compatible gated client before enforcing stricter legacy read denial where required. New collection rules may be published first if additive. Stronger restrictions that break old requests take effect only after compatible code is available. Deliberately refuse stale incompatible privileged data paths, with a clear update state, rather than reopening private data.
4. Keep the ordering restriction active independently of Home/new-feature flags. Use existing `featOn()` pattern where suitable with new typed feature switches; only Admin controls rollout. Disabled creation still leaves authorised access to unresolved records and necessary follow-up.
5. Roll back layout by selecting the previous compatible Home renderer, retaining strict ordering rules, records, active batches and overdue cleaning. A previous raw client that requires forbidden private reads is not a compatible rollback. Use an explicitly patched compatible shell and existing generation/update safeguards.
6. Never delete new records, erase correction events or restore broad old permissions to fix a UI fault. Repair via a new branch. Verify backup restoration, unresolved-record visibility and the live lock probe.

## Unknown inputs before activation

- Approved cooling start/transition and exception SOP, measurement expectations and authorised reviewers.
- Actual configured sections/shifts, overnight service-date ownership and porter responsibilities.
- Approved service targets, exact units/yields/conversions, whether targets already include functions, count freshness/recheck policy and shared allocations.
- Actual equipment inventory, shared owners, approved cleaning methods, recurrence windows and deferral/NA review policy.
- Supported personal/shared device/browser list and notification expectations. No real locked-device, closed-browser or multi-device production check was performed in this design stage.

Recommended defaults preserve existing role boundaries, give no new Functions-only/porter authority automatically, require manual service rechecks when freshness is unspecified, keep printing deferred and promise in-app alerts only. These inputs can remain incomplete during implementation as visible setup-required states; they cannot be silently filled with demo content or activated as approved procedures.

## Review and progress

Independent council findings, measured preview density, baseline commands/results, reference observations and PR status are recorded in [verification.md](verification.md) and [references.md](references.md). The reviews are role-based analysis by agents, not research with the venue's staff. This document and the isolated prototype are the only proposed product changes at this stage. The latest source and open PRs must be reconciled again before implementation.

**Approval requested after reviewing the package:** choose A (recommended) or B. Approval covers the proposed access-preserving scope and foreground-alert limitation. Venue SOPs, quantities and procedures still require actual authorised setup; choosing a visual option does not approve illustrative operational values.
