# Staff welcome and personalisation audit

9 November 2026. Source baseline: `29258e6`. **Audit and design proposals only. No application change or production-data write.**

## Recommendation and decision

Add one named welcome on Home, make the existing staff identity consistent everywhere, and add names where they help someone understand responsibility. Keep the app's current staff-first Home, notebook style and service controls.

**Recommended starting point: A, Welcome at the top.** It most directly answers the request while preserving the existing personal-day and team cards. This recommendation has a measured limitation: a 40-character name with enlarged text pushes more of the team below the first screen. A compact full-name treatment needs design verification before claiming unchanged density for that case. C preserves more team visibility at that extreme; B offers only a modest space saving with an ordinary name. The [visual comparison](index.html) shows the current screen and all three proposals with synthetic people and shifts.

**Chosen:** awaiting the owner's design choice. No option is implemented in the application.

Use **Welcome, [staff display name]**. This works for first and returning visits without inventing first-visit history. A time-based greeting is possible using the existing Queensland clock, but is not needed for the first version. Use the complete stored display name; do not assume the first word is the person's preferred name.

## What was audited

This is a whole-app audit of personalisation, identity presentation and suitable placements. It is not a new general security, accessibility or performance audit. The current [whole-app inventory](../whole-app-inventory.md) was used as a route checklist and reconciled with the current Cleaning and chef-panel work. All surfaces below were source reviewed. Home, menu and Settings also received fresh synthetic browser checks. No real staff records, live PINs or private kitchen data were accessed.

The application is plain HTML, CSS and JavaScript, with Firebase identity/data and hash routes. Staff already have a canonical roster name through `LK_PREP.whoName()`. A welcome needs no new profile table, preferred-name field, database read, listener or cache. The current name belongs to the personal PIN session, not the remembered Google account.

Related work checked at discovery:

- PR #599, first daily staff sign-in to Home, is open and conflicted. Its proposed 04:00 daily routing is not part of the audited main. Reconcile that change before implementing the complete post-login welcome journey. Later unlocks and retained work must stay on their existing task.
- PR #642 changes the Orders list, so any later Your requests filter must be reconciled with it.
- PR #647 concerns top-bar icon motion; this proposal adds no top-bar control or motion.
- Historical draft #606 describes the staff-first Home already implemented on main. Keep the current [Home contract](../home-staff-first.md), not an older draft layout.

These are discovery-time statuses, not a promise about their later merge state.

## Findings, in order

| ID | Finding and evidence at the baseline | Proposal | Priority and verification |
| --- | --- | --- | --- |
| P1 | Home's heading is only the weekday, although its cards already show the person's day. `js/app.js:598` | Add a single roster-derived welcome and retain weekday/date/time. Give authenticated Functions-only Home the same identity treatment within its existing destinations. | High value, small presentation change. Verify all roles and entry paths. |
| P2 | Live roster rename changes `whoName()` but leaves the hat and already-open menu on the old name. Reproduced with Ann to Ana María in a synthetic browser. `js/prep.js:419`, `js/app.js:1977`, `:1991` | Update all current identity surfaces together on the existing identity/config events. Preserve focus and drafts. | Fix with the greeting. Regression must fail on baseline; historical records must remain unchanged. |
| P3 | Hat/menu initial helper supports Latin letters/digits only; Settings uses another helper. Synthetic 李明 renders `?` in the hat and 李 in Settings. `js/app.js:392`, `:1305` | One Unicode-aware initial policy for hat, menu and Settings, with a neutral missing-name fallback. | Fix with the greeting. Cover accented, non-Latin and multi-code-point names. |
| P4 | Hat and Sign out infer a first name by splitting at a space. Ana María becomes Ana. `js/app.js:401`, `:485` | Use the stored display name for greetings and identity-sensitive wording. Compact marks can remain compact, with the full name accessible and in the menu. | Medium. Verify the 40-character staff-name limit and shared-screen widths. |
| P5 | Kitchen mail saves a sender ID and has Your mail, but the Send area does not visibly name the sender. `js/prep.js:11984`, `:12023` | Add **Sending as Ann · Not you?** within the existing compose area, reusing the established minutes identity/handover pattern. | Useful second step, especially on shared screens. Verify draft protection and actual sender. |
| P6 | Identity is extensive already: shift, break, coworkers, explicit prep claims, sign-offs, usual drinks and record authors. | Preserve and harmonise the existing personal language. Avoid adding greeting strips to work pages. | Preserve. The Writing as strip was deliberately removed to protect list space, `js/prep.js:5133`. |

## Where personalisation belongs across the app

| Surface and routes | Already personal | Recommended treatment | Evidence |
| --- | --- | --- | --- |
| Home `#/` | Section, shift, full break/return and scheduled coworkers | **Welcome, Ann** once; existing **Your day** and **On with you** continue | `js/app.js:598`; `js/prep.js:10637`, `:10674` |
| Login, daily unlock, lock and handover | Personal staff PIN; current device/session identity | Welcome only after verified sign-in. Generic locked/public heading. Coordinate first-daily Home routing with #599; preserve task recovery | `js/prep.js:1292`, `:1497`, `:1728` |
| Global chef hat and menu | Initial, accessible full name, name/role and Not you/Sign out | Keep as the identity anchor on every page. Fix rename, initials and name shortening | `js/app.js:393`, `:470` |
| Settings `#/settings` | Full name, role, section and device mode | Keep the existing identity card; no separate profile page needed | `js/app.js:1295` |
| Your day and Today's team `#/team` | Own shifts/breaks; name above Your day sheet; full saved plan | Keep **Your day**. Optional **You** marker beside own roster entry when useful. Saved schedule must not imply attendance | `js/prep.js:13401`, `:10674` |
| Prep `#/prep` and shared completion | You're on it; other claimant names; prepared worker distinct from recorder; personal section default | Preserve. **Your section** may clarify an existing label. Do not call shared section work Ann's prep | `js/prep.js:4739`, `:4771`, `:4826`, `:5179` |
| Staff Orders `#/orders` | Requester and ordered-by names | Preserve. Later **Your requests** filter may use loaded IDs, with All available; coordinate #642 | `js/prep.js:6752`, `:6816` |
| Supplier orders, catalogue, history and cut-offs `#/suppliers/...` | Staff request authors and recorded-by history | Optional **Recording as Ann** in Review, only if it fits existing space. Keep supplier, quantities and send/record distinction dominant | `js/suppliers.js:428`, `:458` |
| Deliveries `#/deliveries` | Receiver beside arrival time; Received by on saved receipt | Already the right pattern. Preserve immutable receiver attribution | `js/deliveries.js:125`, `:143`, `:242` |
| Wastage and reports `#/waste`, Reports | Current section default and named logger | Preserve. A logger is not necessarily the cause of waste; no personal waste scores or praise | `js/prep.js:7172`, `:7251` |
| Transfers and returns `#/transfers` | Other venue/person, logger and return confirmer are separate | Preserve those names and meanings. Do not replace the stock collector's name with the signed-in user | `js/prep.js:7391`, `:7543`, `:7592` |
| Cleaning `#/cleaning` | Worker/time, Pass checker and recorder | Later **Your Pass checks** only for the configured eligible checker, using already-loaded tasks. Keep release/access switches | `js/cleaning.js:117`, `:123`, `:166` |
| Functions, service, editor and print `#/fn/...`, `#/functions/...` | Named service actions, comments, cancellations and history | Keep function/event titles and times dominant. Same-person draft recovery can say **Your changes to [function] are ready to continue** | `js/functions.js:373`, `:593`, `:602`, `:605`; `js/fnedit.js:286` |
| Recipes, search and detail `#/recipes`, `#/r/...` | Shared public reference content | Keep dish names, ingredients, instructions and printouts factual. No repeated greeting on recipe cards | `js/app.js`; `js/manage.js:803`, `:902` |
| Recipe/drawing management `#/manage/...` | History/conflict authors and identity-bound drafts | **Your changes to [recipe] are ready to continue** only after the matching session is restored; no private draft detail while locked | `js/manage.js:263`, `:687`, `:803`, `:902` |
| Shift pings | Name in header, To you on direct pings, sender identity | Already good. Optional **Your shift pings**; avoid a name in every message | `js/prep.js:7945`, `:7980` |
| Minutes and sign-off `#/minutes` | Yours actions; Signing as; Sign as; Not you? | Preserve as the reference for actions where identity matters | `js/prep.js:8592`, `:8604`, `:8616` |
| Kitchen mail `#/mail` | Your mail and sender-scoped sent list | **Sending as Ann · Not you?** near Send to Chef | `js/prep.js:11966`, `:11998`, `:12023` |
| Drinks run `#/drinks` | Your usual, NAME (you), staff-ID preference | Preserve **Your usual**, or optional **Ann's usual** within that card. Shared page remains Drinks run | `js/prep.js:10193`, `:10330`, `:10367` |
| Chef to-do `#/todo` | For me filter, named assignees, added/done authors | Keep shared scope. Optional **For you** on actual assignments; no relabelling as Ann's jobs | `js/prep.js:12364`, `:12379`, `:12420` |
| Chef panel `#/chef` | Role and name in panel bar | Already an identity anchor. Optional greeting only on Today, retaining stable room names | `js/prep.js:6154` |
| Admin, reports, analysis and review `#/admin` | Kitchen administration, current access context and author/person records | Optional compact overview greeting. Keep report titles and historical names stable | `js/prep.js:5969`, `:6021`; `js/admin-dashboard.js:15` |
| Guides `#/guides/...` | Shared reference; step progress in memory | Keep generic. Do not promise saved personal training, learning streaks or Continue learning without supporting data | `js/prep.js:9729`, `:9780` |
| Cooling, seasonal content, updates and recovery | Shared operational clock, celebrations and device state | Keep shared meaning. Name only in already-authorised same-person recovery context; no greeting motion or separate timer | Current cooling, celebration and device contracts |

## Three designs

| Design | Layout and wording | Strength | Main downside |
| --- | --- | --- | --- |
| A. Welcome at the top | Replace weekday hero with **Welcome, Ann**. Put weekday, date and time beneath. Existing cards stay in order. | Immediate recognition and minimal relearning; works across staff and restricted Home variants | Long names can make the heading taller |
| B. Welcome in Your day | Remove the large outer weekday heading. Keep a quiet date line; place the welcome in the charcoal personal-day board | Name and actual working context sit together; can reclaim phone space | Board hierarchy changes; no personal-day board exists for Functions-only Home |
| C. Quiet welcome | Keep the weekday hero. Put **Welcome, Ann** with date/time metadata | Most restrained and familiar | Welcome is less noticeable and competes with date/time in a small line |

All designs reuse existing type, surfaces, navigation and data. There is one greeting, no welcome popup, new tab or work-page banner. Inspection of personal-day details remains zero taps and the full team remains one disclosure tap. Service tabs and work-list actions are unchanged. Prototype measurements, rather than estimates, are recorded with the comparison.

Build size after selection: one focused greeting/identity unit, then an optional mail-sender unit. There are no new navigation levels or data-model dependencies. Design B requires a restricted-Home counterpart before implementation; the prototype is a kitchen staff layout. Low layout relearning for A/C, moderate heading-hierarchy relearning for B.

### Measured phone comparison

Chromium, 390 × 844, genuine Barlow/Caveat fonts, synthetic saved shift and three coworkers. The fixed tab bar starts at 776 px. These are transient DOM previews, not implemented application states.

| Case | Current | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Ordinary name: team card bottom, px | 650.80 | 650.80 | 641.69 | 650.80 |
| Ordinary name: complete coworkers visible | 3 | 3 | 3 | 3 |
| 40-character name, ordinary text: complete coworkers visible | 3* | 3 | 3 | 3 |
| Ordinary name, enlarged text: complete coworkers visible | 3 | 3 | 3 | 3 |
| 40-character name, enlarged text: team card bottom, px | 772.55 | 980.55 | 937.16 | 830.55 |
| 40-character name, enlarged text: complete coworkers visible | 3 | 1 | 1 | 3 |

\* The current Home heading does not contain the name; this value is the unchanged ordinary baseline, not a separate long-name ordinary-text capture.

All three ordinary-name proposals retain the full-team disclosure above the tab bar. At 40 characters plus enlarged text, the current disclosure remains above the bar; all three proposals require scrolling to it. Names are neither clipped nor truncated, and text-size preferences are retained. All measured captures have no horizontal overflow or browser error. This is an explicit design trade-off, not an accessibility certification or a claim that all layouts have equal density. See [measurements](measurements.json) and [visual review](design-review.md).

## Independent council

This follows the whole-app audit's independent perspectives in section 5, not a claim of research with kitchen staff or a completed six-person implementation certification. Four source reviewers and one visual reviewer review the evidence; the lead reconciles findings and runs browser checks. The source reviewers independently returned **Build smaller**: welcome plus coherent identity and selective useful context.

Scores below are expert design judgements, not measured user outcomes. Source reviewers scored before the final visual captures and did not claim measurements.

| Perspective | A / 5 | B / 5 | C / 5 | Preference |
| --- | ---: | ---: | ---: | --- |
| Kitchen operations and product | 4 | 4.5 | 3.5 | B, conditional on phone space |
| Identity, data integrity and architecture | 4 | 4.5 | 3.5 | B, conditional on long-name checks |
| Usability and information hierarchy | 4.5 | 4 | 3.5 | A |
| Communication and quality | 4.5 | 4 | 3.5 | A |
| Visual design and accessibility, after captures | 4 | 3.5 | 4.5 | C, for long-name/enlarged-text density |

The genuine disagreement is prominence versus integration and edge-case density. Operations/identity prefer placing the name beside the shift; usability/communications prefer an explicit welcome in the current heading. The visual reviewer prefers C after measuring the longest supported name with enlarged text. The lead recommends A as the warmer direction because it satisfies the requested welcome with fewer changes to approved Home and works without depending on a personal shift card, subject to the long-name limitation above. If retaining all three coworkers on the first screen in that extreme case is decisive, choose C. The [independent visual review](design-review.md) retains that disagreement and its evidence.

### Considered mix of all three

Do not put a greeting in all three locations. That repeats the name without improving the job. Operations and identity proposed B's placement, A's clear Welcome wording and C's quiet date. That is the B concept as previewed, not an additional unbuilt hybrid. A retains B's adjacent personal context and C's restraint elsewhere without duplicating the greeting. The recommendation is the complete A preview, not a mix with transferred scores.

### Reference fit

This table records the source reviewers' pre-capture assessment. The visual review above and measured phone table supersede its pending geometry checks with concrete results.

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear, stable frame and action names | Works: replaces existing heading | Needs judgement: introductory hierarchy changes | Works: existing frame |
| Things 3, today distinct from upcoming | Works: existing order | Works: existing order | Works: existing order |
| Airbnb, person and task context together | Works: adjacent welcome and day | Works: strongest integration | Works: context retained, name quieter |
| Flighty, real now/next at a glance | Needs long-name geometry check | Needs board-header/clock check | Needs metadata-wrap check |
| Headspace, calm and plain words | Works: Welcome, name | Works: one short welcome | Works: quiet, but easily missed |

Todoist's known defaults already operate in Prep/Wastage and should be preserved. Duolingo's truthful feedback is relevant to mail and saved work, not a reason to add points, streaks or praise. No new add/save interaction is introduced by the Home prototypes. Existing action acknowledgement, Undo and failure wording remain authoritative.

### Contract fit and break-it review

- **Surface purpose:** preserve charcoal personal day, sage coworkers, steel work and quiet paper. The proposals add no palette. Operational state colours and their words keep their meanings.
- **Continuity:** use full staff display name from existing session state. A saved roster is a plan, not evidence of attendance or a confirmed current shift. No new query, polling, timer or private cache.
- **Failure states:** greeting depends on verified identity, not a successful team-plan read. Loading, unallocated, failed plan and no remaining breaks must remain distinct. B must not lose the greeting or Your day semantics when plan content changes.
- **Leading reproduced issues:** stale hat/open-menu name after a roster rename; non-Latin initials disagree across surfaces. These are personalisation consistency defects, not claims of an access breach.
- **Leading untested implementation risk:** handover or a late response briefly shows the previous person's welcome. Verify identity, Home, menu, mail sender and draft ownership together before release.
- **Space risk:** long names or enlarged text move operational details lower. Capture actual fonts and fallback behaviour; wrap rather than clip a person's name.
- **Evidence limits:** static/DOM design previews do not prove production lifecycle updates, keyboard behaviour, assistive technology, save recovery or role enforcement. Those remain implementation acceptance checks.

## Identity and copy contract for implementation

1. Source the display name from the authenticated personal staff identity through `LK_PREP.whoName()`. Compare stable IDs for You, Your and ownership.
2. Keep the complete stored display name. Use one shared Unicode-aware initial policy; no automatic first-word assumption. A new editable preferred-name field is optional future scope.
3. Show a neutral heading until identity is verified. Lock, sign-out, account switch, inactive staff and remembered Google without a live staff session must not show the previous greeting.
4. Rename propagation updates Home, hat, open menu and Settings coherently, without losing focus, scroll or typed work. Do not rewrite historical name snapshots.
5. Signed in as, prepared by, cleaned by, received by and recorded by remain separate meanings. Picking a worker on shared Prep/Cleaning must not change the greeting's identity.
6. Full names stay available in menu/Settings and accessible labels. Do not promise full visible name text at every breakpoint: the current compact hat intentionally uses an initial at some widths.
7. Personalise helpfully once: Welcome, Your day, On with you, Your usual, For you, Sending as. Keep shared page titles stable.
8. Use escaping/text rendering for all staff names. Preserve role limits, feature switches and the existing read budget.

## Verification and release boundary

Fresh baseline checks on `29258e6`:

- `CHROME=/usr/bin/chromium QUIET=1 JOBS=3 npm test -- home-staff-first chef-menu settings`: all three test files passed.
- Synthetic Chromium rename probe reproduced stale hat and open-menu text after canonical name changed from Ann to Ana María; reopening the menu updated the full name, retained shortened Not Ana, and left the hat stale.
- Synthetic Chromium Settings probe reproduced `?` in the hat versus 李 in Settings for 李明; no browser error.
- Source review covers the complete personalisation matrix above. Emulator, production staff sign-in, real devices and screen readers were not exercised. No production behavioural claim is made.

The [identity observations](identity-observations.json) are synthetic and safe to inspect. The visual comparison records its own screenshots, measurements, fonts and limitations.

After selection, test first daily sign-in versus later unlock and retained-work recovery; staff, lead, view-only, Functions-only, chef, admin, public and locked states; two successive shared-screen users; live rename; missing/failed identity and plan data; 40-character, multiword, duplicate, accented and non-Latin names; HTML-like name escaping; long names at enlarged text; 390/768/1280 layout and fallback fonts; unchanged work-list rows, actions and read budget. Use the existing identity, Home, menu, Settings, role, safe-text and device-recovery suites.

Publish the selected change as a small reversible application PR after the design choice. A greeting and coherent current-name rendering require no schema or rules migration. Reverting the application PR restores presentation without changing saved kitchen records. Keep the current identity/access/draft contracts during rollback.

This documentation PR is a draft design handoff. It neither deploys a welcome nor fixes the two reproduced identity issues.
