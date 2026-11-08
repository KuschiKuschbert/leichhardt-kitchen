# Kitchen Book service work: design for approval

**Latest-push check, 9 November:** the owner accepted the staff-first direction. [Checked against main `5f604bd`](latest-main-check.md), including a refreshed illustration using the new clock, mobile logo and conditional Cleaning navigation. The exact Home grouping remains unshipped. The feature inventory and lower-work models below describe the earlier `eedbdd7` baseline and must be reconciled with the newer implementations described in that check.

8 November 2026, Queensland. **Revised options, awaiting review. PR #606 remains draft.** The owner rejected the first A/B presentation. No option is chosen. No production features, rules, data or deployments changed by this work.

**Staff-first correction:** both designs start with the person’s section and shift, their break window and return time, then visible coworkers. Prep, cleaning, shared timers and functions follow. The earlier previews omitted the break and folded the team too far down; that presentation is superseded.

Open [the interactive comparison](index.html). It contains exactly two revised options, **A, Familiar Home** and **B, Working notebook**, with staff, chef, admin, Functions-only and public previews. Screen, scenario and device controls sit outside the app preview. All new operational examples are illustrative. Baseline images are real browser captures of the unchanged application using synthetic Firebase data, not photos of the live kitchen.

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
| No shared 2-hour/4-hour timer, minimum-sheet, equipment inventory or cleaning scheduler was found | **Verified:** inspected runtime JS and rules. **Unknown:** private venue records not inspected | Add shared timers without a procedure setup gate; minimums and cleaning still need approved setup |
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
| Notification | User gesture → `LK_CHIME`; authorised cut-off push registration → scheduled job → service worker | Reuse the existing chime repeatedly for expired timers until staff mark Done. Any closed-app delivery is a separate capability with device verification |
| New cleaning work | No scheduler verified; guides provide possible SOP links | Equipment → approved template revision → dated occurrence → attributed completion event |

## The two options

The first presentation was rejected because the phone layouts were effectively the same apart from colour, the global section/service header added noise, and the native fonts and visual hierarchy had been lost. Those layouts and their visual recommendation are superseded. The revision uses the current Home CSS and markup, real SVG masthead and navigation, Barlow/Barlow Condensed UI and the actual Caveat 700 font. Both options use the same palette and sample data. Their difference is where the work happens.

### A. Familiar Home

Keep the handwritten day, native dark Your day board and pinned paper. The first board shows **Your section**, configured shift hours, then **Your break**, its full window, length and return time. The next paper shows **On with you** with coworker names, sections, shift hours and relevant breaks, visible without opening a fold. Only then show a compact Kitchen work paper linking prep checks, cleaning, timers and functions. A due timer is the first row within that lower work group, so it is reachable without displacing the staff information. Coming up is a quiet disclosure after current work.

The scheduled shift team is derived from the already loaded saved daily plan, not a new roster. Where shift ownership/overlap cannot be established, label the list On today rather than claiming people are working now. View today’s full team retains the original whole-day, all-shift roster including hours and breaks. No personal allocation must not hide that published roster. No published plan or failed read must not invent a section, break or coworker.

Minimums and Cleaning open focused worksheets. The saved roster supplies scope; the worksheet names section/service/date with a local Change link. Ordinary Prep stays its own familiar default. The top team chip and Your day retain additional breaks, later assignments, people scheduled on break, return times, Changed status and who saved the plan and when. Prep-header and chef-hat day lines, pings and minutes keep their established access and behaviour.

Advantages: staff can find the three essential facts immediately; fewer competing work cards; smaller change to Home. Cost: detailed work needs a worksheet-opening tap.

### B. Working notebook

**Use exactly the same staff-first block as A:** section, break with return, then visible coworkers. These facts are fixed priorities in both options, not a design choice. Below them, place the current timer/service summary and an open ruled service notebook with actual prep-count rows. On a phone, Prep and Cleaning pages have labelled counts; desktop can show facing pages. This saves a worksheet-opening tap once the person reaches their work, with more scroll and editable state on Home.

Handwritten item names use the native Caveat weight; amounts and metadata use Barlow. Section/shift controls stay inside the worksheet. The next food time and any expired-timer link remain above the notebook but below the personal/team information. Later work does not push those first three staff facts off the initial phone view. Both layouts share controllers, records, permissions and read budgets.

Advantages: direct section checks after shift context. Cost: Home has more editing state and a longer flow; phone cleaning remains one explicit page tap away. Ordinary Prep remains available from its existing tab.

| Comparison | A, Familiar Home | B, Working notebook |
| --- | --- | --- |
| First information | Section, break/return, visible coworkers | Same required staff-first block |
| Work below it | Overview linking to focused worksheets | Direct service work in a single notebook |
| Minimum count | Open worksheet, then record and save | Enter and save inline on Home |
| Cleaning from Home | Open worksheet, then complete | Open Cleaning tab, then complete |
| Wide screen | Current board and pinned papers | Facing Prep/Cleaning notebook pages |
| Ordinary Prep tab and actions | Preserved | Preserved |
| Build size and relearning | Smaller Home change; all feature slices still required | Larger Home change with row editing and responsive pages |
| Reads, rules and safety | Shared contracts below | Same contracts |

The revised paths and browser evidence are recorded in [verification.md](verification.md). Both options provide all five features and all affected management pages. Fresh review recommends A for a calmer Home; no owner choice is recorded. Selecting a layout does not approve illustrative quantities, venue procedures or new authority.

## Five feature contracts

### 1. Shared cooling timers

**Owner clarification, required:** a simple clock with **2 hours** and **4 hours** presets. Each preset starts a timer in one action; a name is optional. Several timers may run together. No temperature entry, linked stages, procedure approval or food-safety outcome is part of this feature.

Every signed-in kitchen staff member can start a timer, **Stop timer** while it is running, or tick **Done** after it expires. This is an explicit timer-only exception to ordinary Add/Tick and assignment restrictions, including staff whose Add or Tick is disabled. It grants no other capability. Public/locked devices cannot use kitchen timers. Functions-only retains its existing scope unless the person also has an authorised kitchen role.

At expiry, show the elapsed state and repeat the existing `LK_CHIME` sound until any kitchen staff member ticks Done. Done acknowledges the timer and ends its ringing for everyone once the shared change is confirmed. Stop timer ends a running timer. Keep ordinary history of who started, stopped or marked each timer Done, with times. These actions record timer use only and make no claim about food temperature or safety.

**Persistence and clock:** store a shared timer ID, allowed preset, absolute start/end timestamps and running/stopped/done state in Firestore. Use the existing `LK_TIME` clock. Refresh, navigation, wake and another device recompute remaining/elapsed time from the same saved end time; none restarts the duration. Expired timers stay open across handover until Done. Intervals only update the display and chime, with zero per-second network writes. Stable operation IDs make retries safe; another person's Stop/Done is reflected without overwriting their result. Pending/failed actions remain named and do not claim shared confirmation.

**Existing sound and platform limits:** use the existing `LK_CHIME.play('timer')` Oven timer burst and `wake()`/Test chime controls. Keep Shift pings and their `pingSound` setting unchanged; its Off option does not switch timer reminders off. Proposed repeat interval: **[15 seconds]**, coalesced into one burst while any timer is expired, with one sound leader per device across tabs. Check current shared state immediately before playing, including after asynchronous audio resume, so remote Done cannot leave a late queued burst. Stop future bursts when no expired timers remain; a short burst already sounding may finish. `play()` reports an attempt, not proof of audible sound.

After wake or visibility change, reconcile shared timers and play at most one current reminder, then continue the cadence. Hidden screens stay silent and never queue a backlog. Browser gesture restrictions, silent mode, background, locked and closed states can block or suspend audio; visible expired state remains and there is no guaranteed closed-app alarm. Notifications are not required for the existing chime. No new audio stack, push scheduler, timer-sound configuration or procedure setup is needed. The prototype begins silent; only an explicit Test chime or sound-demo action starts audio.

### 2. Function service and protected ordering

**Required:** procurement data/actions only for Head Chef, Sous Chef and Admin. Staff retain permitted service details and ordinary order-list functionality. Functions-only retains its existing restricted scope.

**Proposed:** define the protected procurement boundary across every related display, export, history, cache and direct query, rather than gating one visual bar. Firestore cannot redact selected fields from a readable document. Use a minimal service projection and separate chef-only procurement records, enforced by rules and matching client gates. No staff response contains private ordering fields. Keep legacy data/history available only through its appropriate authority; migrate carefully without public security reproduction details.

**Verified reminder window:** `js/functions.js:63-72` begins at Brisbane midnight on booking date, or the earlier first-round day. End is exclusive, `max(eventStart + 2 hours, lastRound + 30 minutes)`; times TBC remain until next midnight. Preserve that visibility window. It is a reminder window, not proof that service has begun.

**Proposed labels:** Upcoming before its reminder window; Today within the window before first food round; In service from first food round until the existing exclusive end while confirmed; Finished outside that window; Cancelled explicitly when cancelled. TBC says Times to come and never infers In service. For staggered/midnight functions, use actual stored round timestamps. No new invented service-end field is required. At the exact end, remove active emphasis. A reschedule recomputes both old-window notice and new window; cancellation removes active treatment immediately and retains its permitted notice/history.

The relevant In service card/band gains a slightly brighter stationary orange frame plus the words In service. Upcoming and Today remain quieter; cancellation has words and current muted treatment. Multiple functions share compact rows with next round/time and a count, not multiple large banners. Home includes one summary; the existing function band remains on other intended pages. Prep adjustments reference the same function revision.

### 3. Calmer Home for every role

**Required order for staff:** (1) their section and shift hours, (2) their next break window, length and return, (3) visible coworkers with sections and relevant shift/break times, then (4) kitchen work and (5) upcoming information. Neither alternative can fold the first three facts away or replace them with feature summaries.

**Shared revision contract:** preserve the native SVG shell, handwritten day, small uppercase headings, existing font weights, six tabs and quiet paper/orange palette. Review controls never appear inside the kitchen interface. A keeps the current board/paper overview; B places real service rows in an open notebook. Both keep timer/service summaries after staff context and avoid a second function banner or permanent section/service control block. Keep seasonal presentation under existing settings and avoid motion while interacting.

Staff see their permitted operational work; chefs see authorised coordination links; Admin has the same operational Home and a management entry. Public stays recipe-only. Functions-only stays on its existing permitted docket/service scope with delivery access preserved. No kitchen operations are fetched for these two groups.

**Verified source:** `js/prep.js:10044-10059` already supplies the personal break row; `homeTeamHTML():10119-10142` and `docs/todays-team-options/brief.md:238` preserve the saved whole-day roster. Reuse `tm.rec`, current section precedence, `tmNow`, `tmNextBreak`, `tmBreakWords`, `tmChanged` and the existing Your day entry. A return is derived from break start plus length; a split is 150 minutes or longer. Show On break now until the exclusive return boundary; after the last completed break say no remaining break rather than No break set. Additional breaks and later shifts stay in Your day. A failed/stale/unpublished plan is distinct from an empty successful roster.

Use the saved roster without asking for the same scope on every Home visit. Scope is a read-only line in the relevant worksheet, with Change there only. If no usable assignment exists, the worksheet explicitly asks for section and shift/date before checks; do not assume Lunch or claim ready. Remember a selection per current person/device/service and clear it on handover; show when it differs from the saved plan. Selecting scope never grants authority. Overnight shifts use configured times and explicit service-date ownership. Completed lunch checks never become dinner checks.

Reserve group positions and change status text in place. Stable record keys preserve keyboard focus, input selection and pointer targets. No urgent row is inserted above a held/touched control. A new urgent item updates a reserved count/link; apply new order only on explicit refresh or safe navigation. Resolve/collapse cards after interaction, not while someone is tapping. Countdown announcements happen at meaningful transitions, never every second.

### 4. Minimum prep sheets

**Proposed:** `Prep → Minimums`, selected section/service/date. Keep the normal Prep list. Approved section targets are configured in a new **Par levels** area integrated into each authorised Admin, Head Chef and Sous Chef panel. Staff sheets show the approved pars without target-editing controls. Each item shows exact unit, approved target, confirmed additional function demand, last checked usable amount/time/actor, shortfall and Unchecked, Needs prep, In progress or Ready. Recipe/SOP is a one-tap link. No approved template says Setup required and identifies who can configure it.

`Prep required = max(0, approved target + confirmed additional demand - usable available)`.

An illustrative calculation is explicitly labelled, never seeded as an approved minimum. Each target states whether functions are already included and which demand allocation is covered. If included, do not add it again. Function revision, recipe/component mapping, yield and unit conversion must be verified; missing input says Needs chef check, not zero. An authorised manual override includes exact unit, reason, scope and actor. No inferred conversion between tubs, batches, portions and kilograms. Phone rows retain explicit Item/unit, Target, Function addition, Usable amount/check time, Still to prepare and status labels. A uses a focused worksheet; B presents the same checks inline in Home's Prep notebook. Count inputs have an accessible item-and-unit name. **Record usable amount** is the primary action; Ready is derived, never a tick target. **Cannot check** is available without claiming completion.

Available `null` means Unchecked; `0` is a confirmed empty count. Preserve measuredAt and enteredAt separately where needed. Approved freshness/recheck rules determine validity; absent rules mean recheck for the selected service. A stale reading is shown as Previous count, confirm required. On it records progress only. Tick-to-ready cannot add stock. After preparing, record the usable amount; only confirmed current quantities and resolved demand permit Ready.

Start with section-owned counts. Shared pools, when used, have explicit reservation IDs and quantities; atomically validate unreserved availability against pool revision. Each shared portion belongs to one allocation. Until a transfer/allocation is confirmed, both sections cannot count it. This is a small prepared-food allocation ledger, not a general inventory system. If trustworthy common units are absent, show manual chef allocation required.

One dated section/shift requirement identity prevents retries duplicating sheets or function-generated work. Dinner shows lunch's previous count but requires a fresh check. Carry unresolved tasks and references, not a copied completed flag. Function edits/cancellations create a review item with old/new demand and preserve prepared quantities/history. A chef accepts revised adjustments; until then affected readiness says Needs review and lists both values. Historical suggestions are deferred until reliable data exists and always require chef acceptance.

### 5. Cleaning

**Proposed:** Home cleaning summary → section sheet; current section/date/shift is visible. Separate equipment, approved reusable task templates, and dated task occurrences. Shared areas have a configured responsible section/person, not a disappearing Other bucket. No actual equipment or chemical/frequency instructions are invented.

One equipment item may have several templates. Each template contains description, SOP/method reference and version, frequency mode, due window, owner and effective-from date. Draft templates remain To come until mandatory setup is approved. Calendar occurrences use deterministic IDs from template + service date + shift/window. After-use requires an explicit use-cycle ID; no equipment telemetry was found. Completion-based recurrence keys the successor to predecessor ID/sequence and confirmed completion anchor. Template revision is stored in the occurrence so historical instructions remain intact.

**Complete task** is one tap when no additional observation is required, with named Saved/Pending/Failed feedback. Occurrence outcome stores time, personal session recorder and notes. A shared role is not a verified named worker. Blocked, deferred or not applicable asks for reason and stays outside completed totals; proposed chef review is required for deferral/NA and overdue closure. A block remains visible until resolved. Undo appends Reopened/correction with reason; it does not delete evidence. Two writers use the same occurrence version and idempotency key, with the second receiving Already completed by… or a conflict review.

Today plus unresolved work is shown across midnight/shift rollover. Completing today's occurrence never completes tomorrow. Archived equipment/templates stop future generation after the approved effective date; existing open tasks require review and historical snapshots stay. Managers see due/overdue by section and oldest unresolved first. Printing is deferred by default: the repository deliberately removed general Print/Share, with functions a specific exception. A later approved cleaning print sheet would be read-only and could never mark digital work complete.

## Management screens

A separate [chef-panel design is in flight in PR #607](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/607). Par levels plugs into the chosen authorised panel entry and does not create a second chef-panel system or grant owner analytics/security access. The Admin/chef screenshots here illustrate the Par levels area, not approval of a broader chef panel. All pages use the existing Chef's Desk frame and list/editor pattern, `lvHTML()` for growing lists, labelled controls, search for long choices, archive/restore and version conflicts. **Par levels** is a new area in the authorised Admin, Head Chef and Sous Chef panels, with the same scoped editor in each entry point. One scoped Save per editor, explicit unsaved state and existing Back/Resume protection. Never show Saved from a pending local write.

| Page | Authority and content | Validation and history |
| --- | --- | --- |
| Existing sections and shifts | **Proposed preserve:** verified Admin, current Kitchen settings; names, stable IDs, optional hours/archive | Nonblank names, valid windows, references survive archive; no broad chef security/config write |
| Par levels | **Required:** integrated area for Head, Sous and Admin; section/shift/item/unit/approved target, includes-functions scope; staff read approved pars only | Zero distinct from blank; effective revision; Save par levels; no guessed values |
| Function component mappings | **Proposed:** Head, Sous, Admin; exact recipe/component IDs, yield, source/target units and confirmed conversion | Missing inputs block calculation; show provenance and impacted pending functions |
| Prep adjustments and count review | **Proposed:** Head, Sous, Admin; revised function demand, stale/unknown counts and reasoned overrides | Preserve original target/count, reason and actor; never silently overwrite another chef |
| Equipment and shared areas | **Proposed:** Head, Sous, Admin; actual inventory, location, owner, SOP references, archive | Shared owner required; archiving previews affected open tasks |
| Cleaning templates | **Proposed:** Head, Sous, Admin; equipment, task, SOP, recurrence mode/window, effective date | No activation without method/frequency/owner; immutable version snapshots |
| Cleaning overview and exception review | **Proposed:** Head, Sous, Admin; section due/overdue, blocked/NA/deferred reasons, corrections | Completion count excludes exceptions; review attributable and auditable |
| Timer chime | Information and Test chime using the existing Oven timer sound; timer list/history remains available to all signed-in kitchen staff | No procedure gate or new sound setting; Shift pings policy unchanged |
| Rollout, role grants and security | **Proposed preserve:** current Admin authority only | Existing device grant/session rules; chefs cannot self-promote |

Existing kitchen sections/shifts are admin-only. The request's Head/Sous/Admin minimums/templates access is accommodated with separate narrowly scoped chef configuration records. Any decision to let chefs change shared sections/shifts would be a separate authority expansion, not silently bundled into this design.

## Proposed permission matrix

Every cell is enforced in rules as well as routing. Admin means the existing verified owner plus live head session and matching device grant. Ordinary Google identity alone is not Admin. All roles retain their existing access outside this scope. Except for the owner's explicit shared-timer exception, a Head/Sous Yes below means the current role and the action's canonical capability both qualify; individually disabled Add/Tick stays disabled for ordinary work. Chef configuration and review are separate narrow authorities. Selecting a section changes navigation only; assignment-based write authority for minimums and cleaning must still be checked against the saved assignment or an explicit chef delegation.

| Capability | Public / locked | Functions-only | Staff / lead | View-only | Kitchen porter | Head / Sous | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public recipes | Current public access | Current access | Current access | Current access | Current access | Current access | Current access |
| Permitted function service information | No | Existing scope | Existing scope | Existing scope | Existing scope | Yes | Yes |
| Function procurement, actions, history | No | No, unless independently Head/Sous | No | No | No | Yes | Yes |
| Ordinary order list | No | No | Existing add/tick/delete capabilities | Current read-only | Existing capabilities | Existing access | Existing access |
| New operational reads | No | No | Current kitchen scope, selected section | Proposed read-only | Existing narrow scope only | Yes | Yes |
| Shared timers: read, start, Stop, Done | No | No, unless also kitchen staff | Yes, timer exception | Yes, timer exception | Yes, timer exception | Yes, timer exception | Yes |
| Minimum counts/progress | No | No | Proposed existing add/tick capability mapping, subject to confirmed responsibility | No | No automatic grant | Yes | Yes |
| Cleaning completion | No | No | Proposed existing tick capability plus assigned section | No | Only if already authorised and explicitly assigned | Yes | Yes |
| Par levels, equipment/cleaning templates and adjustments | No | No | No | No | No | Yes | Yes |
| Shared sections/shifts, role/security grants | No | No | No | No | No | Current limits | Yes |
| Historical corrections/exception approval | No | No | No | No | No | Proposed new scoped records only | Yes |

**Unknown:** whether porter is a distinct configured role, actual named responsibilities and any desired delegation outside timers. All signed-in kitchen staff share timer control regardless of Add/Tick or section assignment; this does not expand minimums, cleaning, procurement or configuration rights. Preserve canonical role/capability lists elsewhere. Functions booking permission remains separate from chef procurement authority. Selecting a role in the prototype is a preview tool, not authentication.

## Proposed data and integrity

Names below are a design contract, not a deployed schema. Keep all records under the existing kitchen namespace. Exact indexes and field-shape limits are specified and emulator-tested before rollout.

| Record | Key/contents | Integrity |
| --- | --- | --- |
| `coolTimers` | UUID; 2-hour/4-hour preset, optional name, absolute start/end, state/version, started/stopped/done times and actors | Shared clock state, stable retry IDs and version-aware Stop/Done; ordinary timer history, no temperature or safety records |
| Minimal function service projection + private procurement | Function ID/revision; allowlisted service details; separate chef-only order effects/history | No field-level hiding claim; deny alternate queries and legacy private paths after transition |
| `prepTemplates` and mapping revisions | Par levels: stable item/section/shift IDs, exact units, target, includes-functions scope | Approved effective revisions, archived rather than deleted; scoped Head/Sous/Admin editing |
| `prepServices` / checks and allocations | Date+section+shift+item identity, template snapshot, function revision, usable count/check time, pool reservations | Unknown versus zero; one canonical requirement; versioned count/allocation updates |
| `equipment`, `cleanTemplates` | Stable inventory IDs, owner, SOP; approved versioned recurrence/window | Effective-date archive and snapshot instructions |
| `cleanTasks` + immutable events | Deterministic occurrence ID, due times, template snapshot, state; operation-ID outcomes/corrections | Create-once generation, version-protected completion, unresolved across rollover |
| Bounded active summaries/indexes | Open timer and due/unresolved cleaning pointers maintained with canonical write | Rules-coupled updates, no orphan summary treated as success; bounded queries with pagination/truncation words |

All new writes go through an extended, tested `W()` pathway, with the explicit timer permission handled there and in rules. Do not bypass the wrapper. Use existing compare-version batches where rules can validate atomic related records; use a wrapper-supported transaction when availability or state must be reread atomically. An uncertain acknowledgement is recovered by operation ID before retry. Records carry authenticated recorder ID/device session and, only when verified, a separately reported worker. Minimum/cleaning corrections preserve original payload, reason and superseding reference; timer history records ordinary Start/Stop/Done actions.

**Action mapping:** all signed-in kitchen staff may read/start/stop/mark Done shared timers, including staff with Add/Tick disabled and without a section assignment. This explicit exception applies to timers only. For minimums, current Add permits a new usable count and current Tick permits service progress; cleaning completion keeps Tick plus responsibility checks. Archive, correction, exception approval, target/template edits and procurement acceptance require scoped chef authority; role/security changes keep existing Admin authority. Rules whitelist each action's fields and reject unrelated edits. Final call-shape rows must cover each read/write, including the positive timer exception and negative non-timer cases for disabled capabilities.

**Proposed server invariants:** timer rules accept only the two presets, consistent stored start/end values and valid running-to-stopped or expired-to-done transitions. Stop/Done preserves the original end time and attributes the action to the current kitchen session. Minimum/cleaning updates retain their version and history checks. Repeating an operation ID with a different body is refused. An existing operation with an unknown acknowledgement is read back before retry. Timer control never requires temperature evidence or an approved SOP.

**Proposed reconciliation owner:** a non-chef booking editor saves only its permitted service revision and a revision-bound change notice. Head/Sous/Admin review and accept the corresponding procurement adjustment; that transaction records the accepted revision. Superseded notices remain historical, the newest unresolved revision stays visible, and cancellation invalidates future active demand while preserving prepared quantities and order evidence. Retrying the same revision is idempotent. Until reviewed, procurement and affected minimum readiness say Changes need review. Do not require a coordinator to read private procurement state, and do not quietly depend on an unprovisioned trusted worker.

Home reuses existing data. **Proposed additional cost:** one bounded active-timer subscription and one due/unresolved-cleaning subscription while Home or the relevant live feature is open for an authorised role. Active timer updates remain available to the existing sound helper while the signed-in app is open so staff can hear expiry and another person's Done stops the chime. Reuse that subscription rather than adding one per page. Minimum sheets load for the selected service; stable setup uses day cache and explicit revision invalidation. Shared timer handover and unresolved cleaning justify prior-day open records as a documented exception to today's-only listeners. No polling, per-second writes, history query per card or per-item lookup loop. Measure actual document and rules-lookup bills before setting budgets; do not claim zero reads. At a large result cap, say More open records, open full list; never silently hide unresolved work.

Calendar cleaning generation must also work when no phone is open. **Proposed:** an idempotent generator in an existing scheduled job plus on-open catch-up, anchored to stored due times, not the delayed job's execution time. A late job does not make a task newly due. Historical completion does not rely on the generator running exactly on time. After-use occurrences remain an explicit manual action because actual use is unknown. No new external service is required for these calendar records.

## Failure and accessibility contract

| Scenario | Visible behaviour |
| --- | --- |
| Normal service | Quiet attention state, selected section/shift and useful check counts; no false Ready from empty setup |
| Busy function day | Compact function rows, In service frame only when applicable; one reviewed adjustment source |
| Several timers | Optional names, independent absolute end times and running/expired state; View all preserves every open timer |
| Overdue | Repeated enabled chime until staff mark the shared timer Done; timer state claims no food-safety outcome; cleaning never disappears at midnight |
| Missing setup | To come, exact missing fields and permitted management link; public/Functions-only see no setup operations |
| Loading or failed read | Named checking state or persistent Could not load with Try again; never empty/zero success |
| Failed save | Preserve input, labelled failure at the action, Try again with original operation ID; no saved tick |
| Poor signal | Last checked timestamp, stale reads and pending changes named; keep tab open, no claim of confirmed persistence |
| Identity switch | Unsubscribe and clear privileged memory/DOM/actions; existing protected drafts stay with original person behind lock |
| Concurrent edit | Keep draft and show newer record/version; no last-write-wins for safety evidence or reservations |

Reuse existing `svButton`, `btnPatch`, `esc`, `sheetBusy/sheetNext`, Ink loading and named action feedback. Important actions use visible words; target sizes at least 44 px; labels and status text do not depend on colour. Keyboard and screen-reader order follows the visual order, focus returns after sheets, errors identify fields, live regions announce state transitions only. No new automatic sheet over a list, flash or per-second aria announcement. Reduced motion keeps status static. Test large text, 200% zoom and fallback fonts at 390, 768 and 1280 widths, including a long optional timer name and multiple simultaneous functions.

## Implementation sequence after approval

| Unit | Result and dependency | Acceptance evidence |
| --- | --- | --- |
| 1. Contracts, role shapes and migration rehearsal | Final field allowlists, shared timer timestamps, versioned writes; private backup/dry-run plan | Emulator every read/write shape and role, including all-staff timer exception; duplicate/retry/conflict tests; no real data mutation during rehearsal |
| 2. Function procurement boundary | Prepare private projection/history and compatible clients; preserve service/ordinary orders | Staff direct reads/queries deny procurement; Head/Sous/Admin work; Admin→Staff clears caches; cancelled/rescheduled/multiple/midnight functions |
| 3. Shared timer slice | One-action 2-hour/4-hour presets, optional names, repeated existing Oven timer chime, shared Stop/Done and ordinary history | Controlled clocks; expiry repeats until Done; stop before expiry; refresh/reopen/second device; concurrency; disabled Add/Tick still permits timers; cross-tab sound leader; remote Done during audio resume; gesture/wake; Shift pings unchanged |
| 4. Minimum sheets and Par levels | Par levels area integrated in Admin/Head/Sous panels; approved targets/mappings, staff service checks, allocation and function review | Authorised panel entry/edit; staff target-edit denial; zero/null/stale; missing units; target already includes functions; no double allocation; Lunch→Dinner requires recheck |
| 5. Cleaning and management | Actual equipment/templates, idempotent generation and dated outcomes | Concurrent opens, retries, daily/weekly/after-use/completion anchors, overdue rollover, snapshot history and exception counts |
| 6. Home composition | Chosen layout and role-aware fixed summaries | Phone/tablet/desktop, no scroll overflow/focus jumps, stable controls, read budget, preserved routes and six tabs |
| 7. Release validation and handover | Backup/PIN-move coverage, supported-device matrix and staged activation | Existing recipes/editing/orders/suppliers/delivery/waste/transfers/messages/navigation regression; live lock probe and release checks |

Keep units small and reviewable, coalescing related documentation-only changes. No production rules publication, merge, feature activation or deployment before the requested design approval. After approval follow existing PR checks, release windows and rule publication ordering.

### Staged migration and rollback

1. Add backward-compatible schema/rules and private backfill tooling on the feature branch. Rehearse against synthetic/emulator data, count records and verify expected projections. Include new collections in backup, recovery and kitchen-PIN move contracts.
2. Prepare missing configuration as editable drafts with no invented venue values. Backfill private ordering/service projections before switching reads; preserve all existing operational records and audit history.
3. Ship a compatible gated client before enforcing stricter legacy read denial where required. New collection rules may be published first if additive. Stronger restrictions that break old requests take effect only after compatible code is available. Deliberately refuse stale incompatible privileged data paths, with a clear update state, rather than reopening private data.
4. Keep the ordering restriction active independently of Home/new-feature flags. Use existing `featOn()` pattern where suitable with new typed feature switches; only Admin controls rollout. Disabled creation still leaves authorised access to unresolved records and necessary follow-up.
5. Roll back layout by selecting the previous compatible Home renderer, retaining strict ordering rules, active shared timers, their Stop/Done controls and overdue cleaning. Keep the all-staff timer exception and repeated-chime acknowledgement available. A previous raw client that requires forbidden private reads is not a compatible rollback. Use an explicitly patched compatible shell and existing generation/update safeguards.
6. Never delete new records, erase correction events or restore broad old permissions to fix a UI fault. Repair via a new branch. Verify backup restoration, unresolved-record visibility and the live lock probe.

## Unknown inputs before activation

- Supported device sound/unlock behaviour for the existing Oven timer chime. Timers require no venue cooling SOP or temperature setup.
- Actual configured sections/shifts, overnight service-date ownership and porter responsibilities.
- Approved service targets, exact units/yields/conversions, whether targets already include functions, count freshness/recheck policy and shared allocations.
- Actual equipment inventory, shared owners, approved cleaning methods, recurrence windows and deferral/NA review policy.
- Supported personal/shared device/browser list and notification expectations. No real locked-device, closed-browser or multi-device production check was performed in this design stage.

Recommended defaults preserve existing role boundaries except for the owner's express timer exception for every signed-in kitchen staff member. Functions-only gains no kitchen authority. Minimums require manual service rechecks when freshness is unspecified, printing stays deferred and audible timers remain subject to browser sound/wake limits. Missing minimum/cleaning inputs stay visible as setup-required states and cannot be filled with demo content. Timer presets have no procedure-approval gate.

## Review and progress

Independent council findings, measured preview density, baseline commands/results, reference observations and PR status are recorded in [verification.md](verification.md) and [references.md](references.md). The reviews are role-based analysis by agents, not research with the venue's staff. This document and the isolated prototype are the only proposed product changes at this stage. The latest source and open PRs must be reconciled again before implementation.

**Revision awaiting review:** compare A, Familiar Home, with B, Working notebook. PR #606 stays draft. The earlier recommendation is superseded; fresh review recommends A and no option is chosen. Any later design approval covers the stated permissions, including the all-kitchen-staff timer exception, and foreground sound limits. Minimums, mappings and cleaning still require actual authorised setup; choosing a visual option does not approve illustrative operational values. Simple timers have no procedure-approval gate.
