# Head-chef prep standards and before-service guidance

**Current design brief, clarified 8 November 2026. Design only; no app implementation.** The user has specified the management location and purpose. A staff layout has not been selected. This supersedes the earlier Kitchen-subpage/count-calculator recommendation. The [initial exploration](initial-exploration.md) remains historical evidence, not the current plan.

[Open the current previews](index.html). Source baseline: main `20c9472`. Every illustrated quantity and instruction is synthetic. Actual approved standards are **To come**.

## What the user has specified

The head chef defines each section's permanent prep list and minimum quantities in a separate **Prep** room within the head-chef, admin and sous-chef panels. Staff writing a normal prep entry see the relevant minimum when the item matches their section's standard. A complete **Before service** reference shows everything to check, including items nobody added to today's work.

The goal is explicit expectations for every staff member, including someone unfamiliar with a section. No individual staff identity, inferred competence or ranking is part of this design.

**Style requirement confirmed, 8 November 2026:** match the current app's design language, colours and controls exactly, following `AGENTS.md`, `CLAUDE.md` and the linked design patterns. This is a refinement of the previews, not approval to implement the feature or a new visual style.

First version: the management room, smart matching in the existing Add form, and the complete section reference. Counts, stock-shortfall calculators, saved readiness states, sign-offs and check history are deferred. The user did not request those extra workflows.

Interpretation stated in chat: **minimum means usable prep that should be ready before service**. It is distinct from **Amount to make**. The app never silently copies a minimum into a production quantity. A minimum batch size, if needed later, would be a different field.

## One Prep room across the panels

Use the existing `panelShellHTML()` room navigation and one shared catalogue/editor. **Prep** sits beside Today, Reports, Team and Kitchen. Do not bury it under Kitchen or create three separate editors.

| Access | Intended behaviour |
| --- | --- |
| Canonical head chef with current PIN session | Set items, minimums, confirmed units, recognised aliases, optional recipes and check instructions |
| Verified owner admin with existing matching head session and device grant | Same standards editor; existing owner-only tools stay separate |
| Sous chef | Open Prep, read standards and the section reference; panel access does not grant editing of the head chef's minimums |
| Authorised Prep staff | Read matching guidance and Before service through Prep, without management access |

Existing Add, Tick and Delete capabilities still govern daily work. No check-writing capability is needed in the first version. Signed-out and Functions-only users gain no catalogue access. These are proposed permissions for new records; current rules do not already provide them.

Each item needs stable section and prep-item IDs, a display name, nullable non-negative minimum, confirmed unit, approved aliases, optional recipe/check instructions and archive state. Renames preserve identity. Free-text items do not need a recipe. Blank minimum says To come; explicit zero remains visible. Containers or batches need a chef-confirmed definition before any conversion is possible.

The editor lets the head chef choose a section, find/add an item and edit these fields. Save stays off when unchanged, confirms the named item only after acknowledgement, and preserves failed drafts. Sous sees the same reference without edit controls. This uses the existing panel/search/save patterns, with explicit new server rules.

## Smart guidance during normal typing

```text
ADD A LINE
Section  Larder
Prep     onions

Matches: Sliced onions · Larder
Minimum ready before service: [4 tubs]
Set by the head chef

Amount to make  [                ]
                         Add to Larder
```

The amount is an example, not a real kitchen target. Staff use their usual text field; no catalogue mode is required before guidance appears.

1. Resolve the selected configured section by ID, preserving today's-team and personal-override precedence. Name it beside the match.
2. Match against that section's canonical names and head-approved aliases in memory. Trim, lowercase and collapse spaces. A unique exact complete match can reveal the minimum automatically.
3. Partial names or possible typos offer explicit choices. Selecting one links the canonical item, not a guessed minimum. Existing recipe token matching and learned plural folding are not authoritative matches.
4. Two matches means Choose the prep item. No match means No section standard linked and normal free entry stays available. A failed read says Standards unavailable, never no match or zero.
5. Re-evaluate when text or section changes. Clear the previous hint/link immediately. Never carry Larder's minimum to Grill. Keep a typed amount with its original unit; do not reinterpret it when a match changes.
6. Add uses the amount the person entered. A smaller amount to make is not automatically wrong because some usable prep may already exist. Matching does not add work, change the quantity, or mark anything ready.

Use the exact-name/approved-alias precedent from supplier matching without exposing supplier data or loading its chef-only module. Learned usual amounts remain separately labelled suggestions. No external AI call or database request per keystroke is needed.

## Before service shows the complete section

```text
LARDER · BEFORE SERVICE
The head chef's section standards

Sliced onions        Minimum ready: [4 tubs]
Check: [chef's preparation note]
Recipe                                      Add prep

Herb dressing        Minimum: To come
Instructions: To come
```

List every active configured item, minimum/unit and the head chef's short check instructions and recipe link when provided. Never hide an item because it is absent, ticked, in progress or historically uncommon. Search supports long sections; empty, unset and unreadable states are distinct.

Add prep opens the existing form with item, section and minimum visible, leaving Amount to make blank. Existing open work is shown for review before another task is created. Completed work is not stock and never removes an item from this reference. Staff without Add can still read it.

The first version shows what to check. It has no saved ready/checked badge or mandatory sign-off. Later recorded checks would need a separate date/service/version/freshness and role contract; a prep-task tick must never stand in for one.

## Three revised staff layouts

All three share the required management room and matching rules. They differ in presentation, not in whether forgotten items are covered.

| Design | Placement | Strength | Cost |
| --- | --- | --- | --- |
| A. Smart Add | Minimum under the usual typed-name field; deliberate Before service entry opens the complete reference | Least change to entry and compact work rows | Minimum is not permanently beside saved work; reference entry must be easy to find |
| B. Minimums beside work | A's typing hint/reference plus a minimum beside every linked task's production quantity | Reminder stays visible while doing the work | Most clutter and extra section reads; rows must not grow under a ticking finger |
| C. Before service view | A Work / Before service choice inside Prep under the section control; normal Add still shows matches | Clearest complete section check, including forgotten items | Extra page-level choice and fixed space above work; Work must remain the initial service view |

No new global service tab or top-bar icon. Nothing opens automatically over a list. The user requested the separate management room, but has not selected the staff layout.

## Code patterns and guidelines

| Existing source | Design implication |
| --- | --- |
| `js/prep.js:typeahead()` ~2640, `suggestHTML()` 2658, `pickSugg()` 2677 | Reuse the current typing/suggestion surface with a separate authoritative standard match |
| Text hook ~11334 and section edits ~11353 | Refresh the hint on both; current section changes do not refresh every suggestion |
| `kitSecs()` 10759, `mySec()` 10768, `tmPlanSec()` 12506 | Preserve stable configured section IDs and existing default/override precedence |
| `matchRecipe()` 3248, `learnedFor()` 2436 | Recipe subsets and learned folding must not silently assign a minimum |
| `js/supplier-core.js:normaliseName()` 162 and `matchRequests()` 168 | Unique exact name/approved alias precedent; no private supplier-data reuse |
| `onList()` 2525, `dupGroups()` 2539, `openTwin()` 2608 | Completed items remain in the reference; current cross-section name merging must not corrupt linked identities |
| `panelShellHTML()`, `lvHTML()`, `W()`, `svButton()` | One role-aware editor, searchable growing lists, acknowledged saves and retained drafts |

`AGENTS.md` delegates to `CLAUDE.md`. Its service rules keep the main job one tap away and require measured density costs. `docs/design-patterns.md` supplies notebook styling, 44 px controls, stable live-list height and panel navigation. `docs/action-feedback.md` governs named Add/Save/Undo responses. The private-access, device-session and staff-capability notes govern roles and work recovery. The chef-panel brief documents the current four rooms and shared-editor boundary. Smart-prep and admin-intelligence notes distinguish learned/requested quantities from approved minimums and consumption.

### Alignment with the existing app

The first refined previews used the app's colour tokens but generic forms and panels. The current previews reuse the application's actual CSS classes and structural markup. They load `css/app.css` directly, with the same Barlow, Barlow Condensed and Caveat font families as `index.html`. No replacement palette or shared app styling is introduced.

| Surface | Existing design reused |
| --- | --- |
| Staff frame | Dark `.wtop`, `.page`, `main.prep`, `#prep-root.is-book` and the existing six-item `.tabbar` |
| Prep notebook | Warm ruled `.nb` pages, `.nb-ph` header, `.nb-title`, handwritten `.nb-prog`, square `.nb-box` ticks and `.nb-row` hierarchy |
| Add | Orange `.btn.dark.nb-addline` in `.wk-dock`; body-mounted `.sheet-bg` and `.sheet.p-sheet`, dashed `.nb-in` fields and unit chips |
| Matching | Suggestions immediately under the typed item using `.nb-sgr` and `.nb-sg`; a short minimum line with explicit words |
| Before service | Notebook headings, neutral rules, ordinary buttons and recipe links; no new status colours or readiness ticks |
| Management | Existing `.ad-admin` / `.ad-layout` shell, dark desktop `.a-nav` rail, phone room row, `.a-pane`, list search and one editor |

Orange means headings or a selected choice; green means completed work or confirmed feedback. Minimums use labelled text, not a new warning colour. Surfaces, dividers, typography and action/picker corner radii come from the shared stylesheet. Added CSS is limited to the new content's layout, the fifth management room and the isolated preview controls.

The mock duplicates only the relevant markup, not production JavaScript helpers or access logic. The requested Prep room and Before service placement remain proposed additions. Preview navigation and sample roles are outside the simulated product frame; the Add sheet also has a clearly labelled preview-only matching demo fold. [Source staff screenshot](previews/style-source-ann-390.png), [source Add sheet](previews/style-source-add-390.png) and [source chef panel](previews/style-source-panel-1280.png) provide comparison with the existing application using synthetic fixtures and loaded app fonts.

The clarified council and recommendation still apply: the feature proposal has not changed. This pass corrects the previews' visual consistency rather than choosing a new workflow.

## Costs and future implementation

Propose one bounded versioned catalogue document per section, with explicit paging if the real list exceeds the selected bound. Read the selected section when matching/reference is first needed, reuse the permitted session cache, and refresh explicitly or after 30 minutes away. Show when standards were read. Typing/filtering adds no reads. No new polling/listener. B needs targets for every displayed section. Include rule-dependent reads in the measured budget.

With this policy, another device's minimum changes appear on explicit refresh or a later reopening after the freshness interval. This is a disclosed trade-off, not instantaneous synchronisation. Refresh preserves typed work and clears incompatible links. A failed read never erases a known catalogue or fabricates zero.

New catalogue records, aliases and task links require schema/rules, protected backups, revision checks and duplicate/rollover handling. Ordinary unmatched entry keeps working. Shared batches require deliberate handling rather than automatic name merging. No stock ledger or check-history collection is included.

Estimated implementation: 2 to 3 small PRs for the standards foundation/editor, typed matching and staff reference; B's live-list changes may add another unit. Future tests must cover roles, alias ambiguity, section switches, missing data, units, stale edits, duplicates, completed items, offline/locks/handover, read budget and responsive layouts. This task changes no application source or rules.

## Clarified council round 1

Five fresh reviewers read [the revised proposal](refined-proposal.md) and the current screenshots. Earlier scores are not reused. This is role-based agent analysis, not staff research.

**Build smaller, 4 of 5; Build, 1 of 5.** All support the specified standards, matching and full reference. Four recommend deferring recorded check statuses and stock calculations.

| Reviewer | Verdict | Main concern |
| --- | --- | --- |
| Cook | Build smaller | Preserve Add/tick; minimum and amount must be clear with the keyboard open |
| Head chef | Build smaller | Permanent standards solve omitted items; saved checks add a second workflow |
| Skeptic | Build smaller | The three requirements fill a real gap; history/counting exceeds it |
| New starter | Build | Use Minimum ready before service versus Amount to make |
| Keeper | Build smaller | Explicit refresh, aliases, section changes and head-only editing |

The first-version scope incorporates the smaller recommendation without deferring any of the user's three requirements.

## Revised measurements and recommendation

All four styled views render at 390, 768 and 1280 px without sideways overflow or page errors (`refined-checks.json`). New feature and preview controls meet 44 px targets. The existing header brand link is inherited unchanged and excluded from that target claim. Twenty sample checks cover matching, ambiguity, section changes, quantity/unit preservation, unknown/unavailable data, the complete reference, blank amount on reference Add, the separate room, unchanged Save, sous read-only editing, the panel navigation state, and sheet dismissal/focus/draft retention.

The screenshots use loaded Barlow, Barlow Condensed and Caveat fonts. Their existing Google font files were fetched through the environment proxy into a temporary test cache, then supplied to the browser; no new font or dependency is added to the application. The panel captures show the full page, including the editor. At 390 x 844, C shows one complete reference item above the fixed Add button with the external preview banner/navigation present. A deliberately opens the Add sheet, so no work rows are counted behind its backdrop.

The density probe repeats the same four Larder tasks to 12 rows, with representative existing Urgent, Recipe, On it and More controls. It compares the same mock before and after removing one added surface (`refined-density.json`).

| Work view at 390 x 844 | With preview banner/navigation | Product frame only | Product frame with the stated addition removed |
| --- | --- | --- | --- |
| A | 4 rows | 5 rows | 6 without the local Work / Before service choices |
| B | 2 rows | 4 rows | 5 without persistent minimum text |
| C, switched to Work | 4 rows | 5 rows | 6 without the local Work / Before service choices |

The extra choice row costs about 70 px and one fully visible work row on this fixture. B's permanent minimum costs another row in the product frame. This supports keeping the reminder in Add and reviewing the compact placement of Before service before implementation. Add and tick remain one tap. These are mock layout measurements, not equivalent production capacity: start-here badges, varied long task names, every role's actions and real section grouping are not all represented.

For the source baseline, `style-source-checks.json` records six staff / five sous rows with the actual fonts and the existing six-task fixture. The historical `baseline.json` recorded five/four with fallback fonts; it is retained as earlier evidence, not the current real-font baseline. Neither fixture establishes unchanged density for a future implementation, which must be checked in the actual app with the same tasks and fonts.

| Path from the Work view | Current app | Refined proposal/mock |
| --- | --- | --- |
| Open ordinary Add | 1 tap | 1 tap, fixed button in the phone mock |
| Tick a visible task | 1 tap | 1 tap; reference is unchanged by the tick |
| Reveal unique matched minimum while typing | Not available | 0 extra taps |
| Resolve a partial or ambiguous name | Existing suggestions, no minimum | 1 explicit item choice |
| Open the complete Before service reference | Not available | 1 view choice |
| Start adding a reference item from Work | Not available | Before service, Add to prep: 2 taps, then enter amount and Add |

Tap counts exclude typing, field focus, scrolling and exceptional conflict resolution. These are exercised mock paths and intended integration, not measured live staff time. Native on-screen keyboard behaviour, complete accessibility, server roles, live persistence and offline/concurrency guarantees are not established by these previews. The mock keeps quantity and unit as separate state with numeric entry and the existing unit-chip styling; future integration must preserve the current app's combined free-text quantity behaviour. Existing shell navigation and some row actions are context only, and the catalogue uses static sample list markup rather than calling live `lvHTML()`.

Six fresh reviewers compared the refined layouts without a parent preference. Four ranked A first and two ranked C first; **all six recommend combining A's normal typing guidance with C's complete Before service reference**, plus the common management Prep room. All placed B last.

| Reviewer | A | B | C | Recommendation |
| --- | --- | --- | --- | --- |
| Cook | 4 | 3 | 4 | A plus C's prominent reference |
| Head chef | 4 | 3 | 5 | C plus A's typing guidance |
| Skeptic | 4 | 2 | 4 | A plus C; repeated row reminders need stronger evidence |
| New starter | 4 | 3 | 5 | C plus A's distinct quantity labels |
| Keeper | 4 | 3 | 4 | A plus C; protect against stale/wrong-section guidance |
| Screen designer | 4 | 3 | 4 | A plus C; verify keyboard and phone editor flow |

Scores are subjective service/fit scores out of five. Where a reviewer supplied two dimensions, the service/fit score is shown. They are not measured outcomes or staff research. The different first-place rankings reflect emphasis on service entry versus complete pre-service guidance, not disagreement about the shared feature.

**Updated recommendation:** one connected feature with the dedicated Prep room, A's automatic hint during normal entry, and C's full reference one deliberate tap from Work. Keep Work as the initial view. Do not require staff to choose a catalogue mode before matching, and do not add B's permanent minimum line to every task initially.

This directly implements the user's clarified design intent: the head chef sets the standard once, staff see it while writing familiar prep, and anyone can see the complete list to check. It does not require stock counting or a second completion workflow. Short containers/batch definitions and keeping standards current remain the head chef's content responsibilities.

Open design details before implementation: real item/alias lists and quantities, container definitions, exact phone placement of Before service, native keyboard behaviour, long-name row density and mobile editor navigation. The separate management room and head-owned standards are now requirements, not unanswered location/ownership questions. No staff layout is chosen and no application implementation is authorised by this design task.
