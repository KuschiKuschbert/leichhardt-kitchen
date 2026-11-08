# Prep pars by section: three design options

Requested 8 November 2026. **Design exploration only. No design has been chosen and no application feature has been implemented.** Source baseline: main `20c9472`. The figures in previews are synthetic examples, not kitchen targets. Actual approved quantities are **To come**.

Open [the comparison](index.html). [Original proposal](proposal.md). [Current staff screen](previews/current-ann-390.png), [current chef screen](previews/current-sam-390.png), [current Add sheet](previews/current-add-390.png), [current chef panel](previews/current-chef-1280.png).

## What exists and what is new

| Existing capability | What the proposed feature adds |
| --- | --- |
| Daily prep tasks with section-name text, amount text, optional recipe link, completion, On it, urgency and attribution | A lasting catalogue of individual prep items for each section, including items not requested today |
| Stable configured section IDs, with the staff default following today's team | Targets bound to a stable section ID and prep-item ID, not a typed name or a daily task ID |
| Learned usual amounts and weekday suggestions | Explicitly approved targets and units. Learning may help find candidate items, but cannot approve a target |
| Supplier pars and optional stock counts during an order | Prepared-item pars, separate from the private supplier catalogue |
| Add, Tick and Delete capabilities, role-specific panels | An explicit target-editing policy and rules for reading the new catalogue |
| No current prep-stock ledger | Optional physical counts for the current preparation check. No inferred consumption or perpetual stock balance |

Relevant code: `js/prep.js:newItem()` at line 1964, `usualQty()` at 2460, `onList()` at 2525, `dupGroups()` at 2539 and `openTwin()` at 2608. `tickNow()` at 2253 records completion, not stock. `js/amounts.js` line 39 parses positive task amounts; a stock-count field would also need to accept explicit zero. `kitSecs()` and related helpers around `js/prep.js` line 10759 supply section identity and defaults.

Two traps matter in every design. Existing duplicates can merge across sections and store other section names in `also`. A per-section target must not silently collapse into another section's task. Existing `onList()` includes completed work, so it cannot mean an item still has enough stock. New replenishment must remain possible after an earlier task was completed.

## Council round 1

Five independent agent reviews following `.claude/skills/service-council/SKILL.md`, each with the proposal, baseline screenshots and its role brief. This is role-based analysis, not research with kitchen staff.

**Verdict: Build smaller, 4 of 5.** Pilot one section, establish confirmed items/units/targets and preserve ordinary prep work. Leave shared-batch allocation and automated replenishment out of the first version.

| Reviewer | Verdict | Main reasoning |
| --- | --- | --- |
| Cook mid-service | Build smaller | Targets help, but every extra line or count competes with service. Prefer an optional target/count view through Add |
| Head chef | Build smaller | The missing section catalogue is real; shortage frequency and time savings are unmeasured. Trial a confirmed checklist first |
| Skeptic | Don't build | No observed evidence yet that maintaining the catalogue/count flow saves more than it costs. Trial a section checklist |
| New starter | Build smaller | Complete coverage helps, but target, counted stock and already-requested work must have distinct plain labels |
| Keeper | Build smaller | Stable identities, offline handling and permissions are the main cost. Pilot one section with a read ceiling |

Disagreement is retained: the skeptic does not consider the supplied evidence sufficient to justify software yet. The design exploration requested by the user still compares the alternatives; it does not authorise implementation.

## A. Targets on the prep list

**Placement:** the existing `#/prep` list. Every linked task shows its section's target beneath its work quantity. Each section heading has **Section pars**, opening the complete section reference, including items absent from today's list. The shared target editor is reached through the existing Kitchen panel.

**Layout:** [staff phone](previews/a-ann-390.png), [tablet](previews/a-ann-768.png), [laptop](previews/a-ann-1280.png), [static screen](a.html).

```text
LARDER                           Section pars
[ ] Slice onions              Prep: [2 tubs]
    Target (par): [4 tubs]     Urgent  On it
    Added by [person] at [time]
```

**Interaction:** reading a target needs no extra tap. Section pars opens all configured items; selecting one opens the same per-item count/add form used in C. The target itself stays read only during service. Head chef/owner opens the shared editor to change target/unit, then explicitly saves. The ordinary tick, On it, urgency and Add controls remain.

**Prep workflow:** the task's quantity means work requested, not stock. A target alone never creates a suggested top-up. An optional current count in the item form provides the calculation. Existing open prep is displayed for review. Updating a target never silently changes an existing task quantity.

**Strengths:** targets are visible beside work, little navigation to learn, familiar notebook rows. **Costs:** more vertical space and attention during service, repeated targets when a task appears more than once, and a task-only list still needs a separate catalogue entry. The rendered example adds stable extra height; it must never expand automatically while a person is ticking. This is the highest service-list clutter of the options.

## B. Check the section

**Placement:** a deliberate planning view reached from **Prep > Add a line > Check section pars**. The existing prep list remains the service view. The planner has a clear **Back to prep list**, not a new global tab. Chef Kitchen can link to the same catalogue and target editor.

**Layout:** a notebook of every configured section item. Phone: stacked fields. Tablet/laptop: rows on the left, reviewed additions on the right. [Preview](preview.html?view=b).

```text
Back to prep list           CHECK THE SECTION
[Larder] [Grill] [Sauce]     All / Count first

Slice onions                 Target [6 kg]
Counted now [2] kg            To prepare [4 kg]
Already on today's list: [2 kg]  Review existing

Pick coriander              Target: To come
Count first                  No suggestion yet

                         Review additions
```

**Interaction:** enter physical counts with each item's confirmed unit fixed beside the box. Select only resolved additions, review, then add explicitly. The screen contains items absent from today's list and completed items that may need replenishing. Head chef/owner edits targets in the same shared editor, rather than changing them while counting. Unit changes invalidate incompatible draft counts and suggestions.

**Prep workflow:** `to prepare = max(target - counted amount, 0)` in the same confirmed unit. Missing count says **Count first**; missing target says **To come**. Show existing open prep separately, with Review existing before any additional quantity. Do not automatically treat an open task as stock or subtract it without a deliberate decision. Counts are local to this preparation check, timestamped and reconfirmed before adding. Completing work does not silently update them.

**Strengths:** best whole-section coverage and morning handover workflow; quick comparison across many items; prepares several tasks in one review. **Costs:** highest build and learning cost, another deliberate view, multiple count fields and extra review taps. A phone shows fewer catalogue entries than service tasks because each entry has several fields. It risks becoming a stock-control workflow unless its scope is kept small.

## C. Section pars inside Add a line

**Placement:** reuse the existing Add sheet. A **Section pars** choice sits beside the current typed/recipe/suggestion paths. It browses the complete configured section catalogue, not only today's work or the top learned suggestions. A selected item's target is shown above the amount field. The lasting catalogue and target editor live under **Kitchen > Prep pars** in the existing owner panel; a proposed head-chef entry can use the same workspace once its permission contract is approved.

**Layout:** one item at a time, with no new content on the service list. [Preview](preview.html?view=c). [Shared editor](preview.html?view=editor).

```text
ADD A LINE                              Close
[Write] [Section pars]
Section [Larder]     Search prep items...

Slice onions
Target (par) [6 kg]
Counted now [2] kg       To prepare [4 kg]
Amount to prep [4] kg          Add to Larder

Added just now: Slice onions [4 kg]      Undo
```

**Interaction:** section defaults from `mySec()`, remains easy to change, and a selection fills name, identity, section and confirmed unit. It does not copy the par into the amount-to-make field. Enter a count to calculate the gap, or deliberately enter a manual prep amount. Add names the item, amount and section and offers Undo using the existing feedback pattern. A read-only list can be opened even when Add is unavailable; Add remains disabled by capability. Target changes happen in one shared editor, with unchanged Save disabled and failures preserving the draft.

**Prep workflow:** same optional count arithmetic and duplicate checks as B, but one item at a time. No count means **Count first** for the suggestion; a clearly labelled manual amount still supports ordinary prep work. Known current target/unit may be shown next to existing learned suggestions, but usual quantity is never relabelled as target. Completed work must not hide the item from this catalogue.

**Strengths:** no reduction in service-list space, retains the familiar Add path, smallest practical first version, and separates occasional target maintenance from service tasks. **Costs:** targets are not visible until the catalogue/item is opened; reviewing a whole section needs scrolling and repeated item selection. A later B view may be useful if staff actually count whole sections each morning.

## Common interaction and data contract

- **Coverage and identity:** configure each genuine prep item, including free-text/non-recipe items. Stable section ID plus prep-item ID is the target key; optional recipe ID is a reference. Renaming does not create a new target. Archived/disabled items remain recoverable. Typed unconfigured sections need an explicit mapping before par lookup; no nearest-name match.
- **Blank and zero:** unset target is To come. Zero is an explicit no-routine-prep target. Uncounted is not zero. Zero stock is a valid measured amount. An unknown unit is not pieces. Container/batch sizes require confirmation before conversion.
- **Outstanding work:** show matching outstanding tasks, their section and On it status. A person reviews whether that work covers the gap. Do not add the full deficit blindly; do not merge by name across sections. Use stable IDs and retry-safe add intent, with pending and concurrent-device reconciliation. Existing shared batches require manual handling in the first version.
- **Dates and quantities:** target means quantity to have ready, not daily production volume. Only one standard target per item/section initially. No weekday, lunch/dinner or covers multiplier until requested. Function platter requirements stay separate. Counts do not carry through rollover; target links need explicit rollover support.
- **Freshness:** count is labelled with its time and is only for the current check. Reconfirm after relevant prep changes, an interruption, changed target/unit or a new day. Scheduled locks retain the original person's draft but require reconfirming the physical count; handover clears it. No implied live inventory.
- **Proposed authority:** existing authorised Prep users read targets. Existing Add permission is required to create work; Tick/Delete keep their own rules. Owner/head chef edit targets under explicit new rules. Sous chefs read/use by default; giving them target-editing authority is an unresolved product choice, not inherited from `#/chef`. Functions-only and signed-out users get no prep catalogue access.
- **Feedback:** follow `svButton`, `svStart`, `svDone`, `svFail` and `W`; explicit named confirmation after server acknowledgement. Show Not sent while waiting, keep failed values, stay in place and support Undo. No auto-scroll, automatic overlay or save on selection.
- **Smart help:** offer known item names and units; show where a suggestion came from; require Apply or Add. Use existing summaries rather than scanning past days on a phone. No consumption estimate, invented forecast or automatic par change. `js/smart.js` is the recipe drawing generator, not this feature's engine.

## Size, reads and release implications

All estimates below are proposals, not implemented schemas or measured production costs. A practical pilot could hold at most 100 item records in one versioned section document, keyed by stable item IDs. Larger sections need explicit paging, never silently omitted items. The cap needs validating against the real section inventory.

B/C would read one selected section catalogue document on open, retain it only in the permitted in-memory session cache, and refresh on an explicit tap or after 30 minutes away. Same-session reopen within that window costs zero new catalogue reads. No read per item, polling, history scan or new listener. Recheck the selected target revision before confirming a new par-based task. The target save uses version checks and an immutable previous version. Rules-dependent reads must be included in the emulator's measured bill; the single catalogue read is not a claim of one total billed read.

A needs the targets of all visible sections on Prep, so it adds up to one catalogue document read per displayed section, batched rather than queried in a loop. That makes its opening cost higher. Counts need no persistence for the first version. Existing work writes still pass through W(). New catalogue paths need explicit read/write rules, backup and restore support. No data belongs in public JS or recipe mirrors.

Suggested release units, only after a design choice: (1) stable catalogue, identities, roles, zero/unit validation and protected target editor; (2) chosen staff surface with duplicate-safe Add and feedback; (3) B's multi-item check/review only if selected. A is about 2 to 3 small PRs; B 3 to 4; C 2 to 3. These are engineering estimates, not commitments. Tests must cover roles, incompatible units, blank/zero, repeated and concurrent Add, completed items, cross-section names, rollover, offline/lock/handover, stale edits, read budget, 44 px controls and 390/768/1280 layouts. No new implementation tests are added in this design task.

## Evidence and applicable guidance

- `AGENTS.md` lines 3 to 7 delegates to `CLAUDE.md`; the latter's service rules are lines 54 to 60. This task uses a fresh worktree and only design documentation/previews.
- `docs/design-patterns.md` lines 11 to 16: existing tokens, notebook colours, type and 44 px targets. Lines 33 to 38: chips, searchable choices, known-field filling. Lines 54 to 55: stable list/header height. Lines 78 to 81: `panelShellHTML()` and `lvHTML()`.
- `docs/action-feedback.md` lines 7 to 19: named, in-place responses, actual server confirmation, failed-draft retention and Undo.
- `docs/whole-app-redesign-options/brief.md` line 121 rejects expanding operational rows that can move the tick under a finger. Its line 307 records a different 14-line/real-font measurement; it is not the fixture used here.
- `docs/work-pages-design-options/brief.md`: chosen notebook prep flow and existing Add sheet. `docs/adaptive-controls.md`: narrow-screen layouts, searchable lists and consistent controls.
- `docs/chef-panel-options/brief.md` lines 9, 18 and 28: current chef panel, one editor/draft, and restricted settings/reference access. `docs/private-kitchen-access.md`, `docs/device-sessions.md` and `docs/staff-capabilities.md`: personal-session and capability boundaries.
- `docs/prep-book.md` lines 450 and 469: learned prep suggestions and nightly summaries. `docs/admin-intelligence.md` lines 11 to 15: requested prep is not consumption, units/sources stay distinct, identities are explicit.
- `docs/supplier-workspace.md` lines 17 to 33: stable items, blank/zero pars, current-run counts and evidence-backed top-ups. This is a behavioural precedent, not a shared stock source.

## Open requirements

Actual section items, target quantities and units; whether stock is held separately by section or shared; who maintains targets; whether staff count a whole section at a time; how to define a tub/tray/batch; and whether targets need to vary by service or day. The proposals assume a single standard target, section-owned stock and optional current-check counts. No kitchen quantity has been invented or approved by these examples.

## Measured previews and task paths

Chromium, 390 x 844, the repository's default six-task synthetic Firebase fixture at 14:00, fallback fonts. Count a service row only when it is entirely above Add a line. Source and A use identical data, role and viewport. B/C do not alter the service screen, so their service count is the unchanged baseline, not a measurement of a new implementation.

| Measure | Current | A | B | C |
| --- | --- | --- | --- | --- |
| Staff service rows fully visible | 5 | 3 | 5, unchanged | 5, unchanged |
| Sous chef service rows fully visible | 4 | 3 | 4, unchanged | 4, unchanged |
| Open ordinary Add / tick visible task | 1 / 1 tap | 1 / 1 retained | 1 / 1 retained | 1 / 1 retained |
| Ordinary typed add, action buttons only | 2 taps | 2 retained | 2 retained | 2 retained |
| New count-to-add path, including one count-field focus | Not available | Section pars, choose, count, Add: 4 | Add, Check section, count, Review, Confirm: 5 | Add, Section pars, choose, count, Add: 5 |
| Catalogue records fully visible in dedicated preview | Not available | Reference uses C catalogue | 3 | 6 before selecting; 1 focused item afterwards |
| Additional views after Prep | None | Catalogue, item form | Add, section check, review | Add catalogue, item form |
| Build estimate / relearning | Existing | 2 to 3 PRs / low | 3 to 4 PRs / highest | 2 to 3 PRs / low |
| Main risk | No authoritative section targets | Service density and cross-section identity | Stale counts, duplicate work, greater scope | Discoverability and repeated item checks |

Tap paths are counted from the drawn controls and the exercised sample flow. The links from the live Add sheet and Kitchen panel are design specifications, not implemented or timed integrations. Keyboard entry, scrolling, changing section and conflict resolution add effort beyond these minimum paths. There is no claim of measured staff time saved.

The B/C/editor previews were rendered at 390, 768 and 1280 px. The snapshot and local interaction results are in `preview-checks.json`; current-list geometry is in `baseline.json` and A geometry in `a-measurements.json`. These checks validate mockup layout and sample behaviour only. They do not validate Firestore, live permissions, concurrency, genuine stock or application integration.

## Round 2 and recommendation

Six fresh, independent reviewers read all three options and their rendered screenshots without a preferred option. All ranked **C, B, A**. Scores are subjective fit judgements out of 5, not measured outcomes. The screen designer also gave visual/accessibility scores; the table uses their service-fit score for consistency.

| Reviewer | A | B | C | Main reservation |
| --- | --- | --- | --- | --- |
| Cook mid-service | 2 | 3 | 4 | C requires repeated selection for multiple items; A loses too much service space |
| Head chef | 2 | 3 | 4 | Whole-section counting frequency and return on maintenance time remain unobserved |
| Skeptic | 1 | 2 | 3 | Still recommends not building yet: trial an approved checklist first |
| New starter | 2 | 3 | 4 | Existing work must not make a deficit look like an additional amount to add |
| Keeper | 2 | 3 | 4 | Offline revision checks, read costs, concurrent adds and section identity remain unproven |
| Kitchen screen designer | 2 | 3 | 4 | C's heading could be smaller; B's tablet quantities sit far from the names |
| **Total / 30** | **11** | **17** | **23** | Six reviewers prefer C; that is not unanimous approval to implement |

**Recommendation: C, with one shared Kitchen target editor and B's explicit existing-work warning.**

It adds section targets at the moment staff choose what to prepare, preserves the current service list and uses the existing Add, section, unit and feedback patterns. A complete stable catalogue covers items that today's task list omits. A separate Kitchen editor keeps occasional target maintenance out of service.

Start with one section and confirmed targets/units, keeping the count optional and manual prep available. A paper/checklist trial is a sensible way to resolve the unmeasured need before implementation. Add B's whole-section check later only if repeated item selection proves too slow for the actual routine. Do not add A's targets to every service row initially: its density and opening-read cost are not justified by the current evidence.

The final preview incorporates a small review improvement: the selected-item button now says the known amount and section, such as **Add 3 L to Larder**, and the existing-work warning stays explicit. The counts, layout and ranking do not depend on this wording change. Sample additions name the item, amount and section and support Undo. The static Back destination now returns to an unchanged baseline screen. These are preview refinements only.

### Validation and limits

All nine B/C/editor viewport combinations have no sideways overflow or page errors, and every visible enabled interactive target measured at least 44 px. Eleven exercised sample paths cover unknown/zero counts, zero/unset targets, existing-job review, calculated Add, search, batch and single-item Undo, and read-only sous target editing. A and current-list images were generated from the source application with synthetic Firebase. A measurements show the density loss described above.

No production data was read or changed. No application JavaScript, application CSS, schema, rules, saved-shell files or runtime feature flags were changed. Only documentation, standalone sample previews and their evidence are added. No application regression or emulator suite was run for this design-only task; a prototype is not evidence of live permission, persistence, concurrent-write or offline correctness. Full WCAG compliance and performance need implementation-level checks with real fonts and enlarged text.

**Chosen: none.** The user requested designs and a recommendation only. No decision is recorded as approved in `docs/head-chef-decisions.md`.
