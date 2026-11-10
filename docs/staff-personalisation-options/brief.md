# Staff welcome and personalisation audit

Audit and previews: 9 November 2026, source baseline `29258e6`. **A selected, implemented and verified locally on 10 November 2026. CI, merge and deployment are separate release gates; this is not a claim that the live app has changed.** No production-data write.

## Recommendation and decision

Add one named welcome on Home, make the existing staff identity consistent everywhere, and add names where they help someone understand responsibility. Keep the app's current staff-first Home, notebook style and service controls.

**Selected direction: A, Welcome at the top.** It most directly answers the request while preserving the existing personal-day and team cards. The original A preview had a measured limitation: a 40-character name with enlarged text pushed more of the team below the first screen. The implementation uses a compact full-name treatment on phones; the [focused implementation review](implementation/visual-review.md) now supports refined A after measuring the representative long-name and enlarged-text cases. C preserved more team visibility in the original extreme; B offered only a modest space saving with an ordinary name. The [visual comparison](index.html) retains the baseline and all three historical proposals with synthetic people and shifts.

**Chosen, 10 November 2026:** the owner selected A: "okay lets do a then if the council is sure about that". The council supported a smaller personalisation change but did not unanimously prefer A: two source reviewers preferred A, two preferred B, and the visual reviewer preferred C for long-name density. The chosen implementation keeps that dissent on record and addresses the long-name condition through focused validation. It includes the Home greeting and consistent current identity, not the later mail or filter ideas.

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

## Independent council, original design review

This follows the whole-app audit's independent perspectives in section 5, not a claim of research with kitchen staff or a completed six-person implementation certification. Four source reviewers and one visual reviewer review the evidence; the lead reconciles findings and runs browser checks. The source reviewers independently returned **Build smaller**: welcome plus coherent identity and selective useful context.

Scores below are expert design judgements, not measured user outcomes. Source reviewers scored before the final visual captures and did not claim measurements.

| Perspective | A / 5 | B / 5 | C / 5 | Preference |
| --- | ---: | ---: | ---: | --- |
| Kitchen operations and product | 4 | 4.5 | 3.5 | B, conditional on phone space |
| Identity, data integrity and architecture | 4 | 4.5 | 3.5 | B, conditional on long-name checks |
| Usability and information hierarchy | 4.5 | 4 | 3.5 | A |
| Communication and quality | 4.5 | 4 | 3.5 | A |
| Visual design and accessibility, after captures | 4 | 3.5 | 4.5 | C, for long-name/enlarged-text density |

The genuine disagreement was prominence versus integration and edge-case density. Operations/identity preferred placing the name beside the shift; usability/communications preferred an explicit welcome in the current heading. The visual reviewer preferred C after measuring the longest supported name with enlarged text. The lead recommended A as the warmer direction because it satisfies the requested welcome with fewer changes to approved Home and works without depending on a personal shift card, subject to the long-name limitation above. C was the alternative if retaining all three coworkers on the first screen in that extreme case was decisive. The owner subsequently selected A with the long-name validation condition retained. The [independent visual review](design-review.md) remains the original disagreement and evidence.

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
- **Leading implementation risk identified at review:** handover or a late response briefly shows the previous person's welcome. Verify current identity and draft ownership together before release. The selected unit does not add mail sender text.
- **Space risk:** long names or enlarged text move operational details lower. Capture actual fonts and fallback behaviour; wrap rather than clip a person's name.
- **Evidence limits:** static/DOM design previews do not prove production lifecycle updates, keyboard behaviour, assistive technology, save recovery or role enforcement. Those remain implementation acceptance checks.

## Identity and copy contract

1. Source the display name from the authenticated personal staff identity through `LK_PREP.whoName()`. Compare stable IDs for You, Your and ownership.
2. Keep the complete stored display name. Use one shared Unicode-aware initial policy; no automatic first-word assumption. A new editable preferred-name field is optional future scope.
3. Show a neutral heading until identity is verified. Lock, sign-out, account switch, inactive staff and remembered Google without a live staff session must not show the previous greeting.
4. Rename propagation updates Home, hat, open menu and Settings coherently, without losing focus, scroll or typed work. Do not rewrite historical name snapshots.
5. Signed in as, prepared by, cleaned by, received by and recorded by remain separate meanings. Picking a worker on shared Prep/Cleaning must not change the greeting's identity.
6. Full names stay available in menu/Settings and accessible labels. Do not promise full visible name text at every breakpoint: the current compact hat intentionally uses an initial at some widths.
7. Personalise helpfully once: a varied Home welcome, Your day, On with you, Your usual, For you, Sending as. Keep shared page titles stable.
8. Use escaping/text rendering for all staff names. Preserve role limits, feature switches and the existing read budget.

## Implementation, 10 November 2026

The selected source change is limited to `js/app.js`, `css/app.css` and a scoped decoration rule in `css/seasonal-effects.css`. `homeHeading()` replaces Home's weekday hero with **Welcome, [full staff display name]** and places the Queensland weekday and date underneath. The existing clock stays on the staff board. Functions-only Home gets the same named heading within its existing destinations. Public and locked states keep a neutral heading. The current personal-day, break, team and work cards, their order and role boundaries stay intact.

`homeWelcomePaint()` and `whoNamePaint()` reuse the existing identity, device and configuration events. A roster rename updates the greeting, hat and open menu without replacing the menu or losing its focused control and draft warning. Settings and the hat/menu use one Unicode-aware initial helper, including accented and non-Latin names. Greeting and identity-sensitive menu wording use the complete stored display name, not a guessed first name. The compact hat retains its existing responsive space limits, with the full name in its accessible label and menu.

Long names wrap rather than clip. Below 768 px, `.hm-welcome-long` uses `1.5rem` above 12 name characters and `.hm-welcome-compact` uses `1.2rem` above 28. Relative sizing preserves the app's text-size preference. This is the focused refinement of A required by the original preview evidence; implemented-app captures cover the real shell, supported name limit, enlarged text and fallback fonts. The historical comparison above describes the original previews, not the completed implementation.

This unit changes no login routing. PR #599 remains a separate first-daily-sign-in-to-Home proposal; opening the welcome page and returning to retained work follow the current app's routes. Kitchen mail sender wording, new personal filters and the optional ideas in the audit are not included. There is no new work-list banner, popup, navigation control, Firestore read, listener, timer, cache, schema or rule. No stored staff name or historical attribution is rewritten.

The full regression exposed a seasonal interaction: Tihar's third hanging ornament overlapped **Welcome, Sam** at 390 px, while the unchanged weekday baseline passed. A medium name at 125% text also intersected the other checked ornament families. Named Home therefore omits the anchored ornaments beside the heading, retaining the celebration note and background ambience. The scoped CSS reacts to renames without a new layout handler and changes no heading or card geometry. Neutral Home keeps its ornaments. This is an explicit decorative trade-off for a complete readable name, separate from the original no-theme previews.

### Implemented-app verification

- `tests/staff-personalisation.test.js`: **63/63 checks passed**. The first 55 checks reproduced 20 failures on the unchanged application. Added unbroken 40-character name checks exposed four internal menu/Sign out overflows before the wrapping fix; all 63 pass afterwards. Coverage includes verified identity, neutral public/Google-only states, Functions-only access, live rename without lost focus or extra reads (10 before and after), Unicode initials, literal HTML-like names, daily lock/unlock and shared-device handover. Historical author snapshots remain unchanged.
- `tests/staff-welcome-layout.test.js`: **68/68 checks passed with the real fonts**, including the added seasonal coverage. Two of the first 46 checks failed before lowering the medium-name threshold and repairing the shared-phone header: the full-team control fell below the viewport at 125% text, and the shared identity pill overlapped the logo. Both now pass, along with the added 1440 px check, four seasonal ornament families, live rename during a celebration, Still and neutral Home. Prep row and Add positions are unchanged between short and long names.
- **34 actual-app scenarios and 35 screenshots**, including the opened full-team disclosure, have no browser errors, horizontal overflow or visible ornament collisions. With official fonts on an ordinary 390 × 844 Home at 125% text, the ordinary-name team card ends at 772.55 px and the representative 40-character case at 773.33 px: a 0.78 px difference. Both show three complete coworkers and the full-team control above the tab bar. The full-team action remains one tap. Fallback fonts and unusually wide repeated glyphs can still require scrolling; complete names remain readable. An existing celebration explanation takes its own space above the cards, so this ordinary-Home density result is not a claim about celebration pages.
- [Implemented-app measurements](implementation/measurements.json) record exact source hashes, synthetic fixtures and font status. The [focused visual review](implementation/visual-review.md) supports refined A while retaining the original council's disagreement. See the [ordinary phone](implementation/ordinary-390.png), [long name at enlarged text](implementation/long-large-390.png) and [shared phone](implementation/shared-long-large-390.png).
- Full application regression: **295 files, 35.2 minutes, 291 initially passed**. The four reported files were Home board, Settings, seasonal and cooling motion. Home and Settings still expected the old weekday heading and punctuation initial; updated assertions enforce the approved full-name/date and shared letter-initial contract, and both reruns passed. The reproduced seasonal overlap was repaired; all **178 seasonal checks passed** in the final isolated run. An intermediate busy parallel rerun exceeded two animation CPU limits; the isolated run passed without changing those limits. Seasonal shell and Home colour/celebration also passed after the repair. Both new personalisation files passed within the full run.
- The unchanged cooling-motion test hit four Google Fonts certificate errors in this environment, also reproduced against baseline assets. Its 128 other assertions passed. Supplying the same official font faces locally to the unchanged test, without bypassing TLS or suppressing errors, passed all **135/135**, including three additional real-font navigation checks. The unmodified retry's environmental failure is not represented as an ordinary green run.
- JavaScript syntax, the design-pattern registry, capture source hashes and `git diff --check` passed. No production session, emulator, real-device or screen-reader validation is claimed. The earlier [identity observations](identity-observations.json) remain the baseline reproduction record, separate from these implementation results.

## Baseline verification and release boundary

Fresh baseline checks on `29258e6`:

- `CHROME=/usr/bin/chromium QUIET=1 JOBS=3 npm test -- home-staff-first chef-menu settings`: all three test files passed.
- Synthetic Chromium rename probe reproduced stale hat and open-menu text after canonical name changed from Ann to Ana María; reopening the menu updated the full name, retained shortened Not Ana, and left the hat stale.
- Synthetic Chromium Settings probe reproduced `?` in the hat versus 李 in Settings for 李明; no browser error.
- Source review covers the complete personalisation matrix above. Emulator, production staff sign-in, real devices and screen readers were not exercised. No production behavioural claim is made.

The [identity observations](identity-observations.json) are historical synthetic baseline failures, not observations of the selected implementation. The visual comparison records its own screenshots, measurements, fonts and limitations.

Implementation acceptance covers current sign-in and unlock routes and retained-work recovery; staff, lead, view-only, Functions-only, chef, admin, public and locked states; two successive shared-screen users; live rename; missing/failed identity and plan data; 40-character, multiword, duplicate, accented and non-Latin names; HTML-like name escaping; long names at enlarged text; 390/768/1280 layout and fallback fonts; unchanged work-list rows, actions and read budget. Use the focused personalisation suite and existing identity, Home, menu, Settings, role, safe-text and device-recovery checks as applicable. First-daily routing changes remain separate from this presentation change.

Publish the selected change as a small reversible application PR after final verification. A greeting and coherent current-name rendering require no schema or rules migration. Reverting the application PR restores presentation without changing saved kitchen records. Keep the current identity/access/draft contracts during rollback.

The initial draft was an audit and design handoff. The selected implementation is now verified locally; CI, queue state, merge and deployed-client evidence remain separate release states. No live deployment is asserted here.

## Varied welcomes, 10 November 2026

The owner asked to add a randomiser for different welcomes, combined with celebrations. This extends the chosen A heading. Its source baseline is `7f85629`; the earlier implementation and measurements above describe the original fixed welcome.

**Verdict: Build smaller (quick check).** Vary the existing words without adding a setting, shuffle button, popup or step. This is a role-based self-review, not research with kitchen staff. Headspace's short calm labels and Linear's stable page frame apply. Decorative points, rewards and extra animations add no kitchen value. Staff context still takes zero taps; full team and Prep remain one tap away. No work-list markup changes. Full-app phone measurements are recorded below.

### Behaviour and contract fit

- Ordinary visits choose Welcome, Hello, Hi there or G’day. Celebratory days use a small authored set for the same active calendar occasion, such as Happy Tihar / Tihar wishes or Merry Christmas / Christmas wishes. No nationality, faith or parenthood is inferred. Unknown, reflective and civic occasions use ordinary wording.
- Choose once per Home visit, verified identity, Queensland day and active occasion. Returning to Home chooses a different prefix from the previous one. Repaints, clock ticks, live roster renames, six-language explanation changes, Still and reduced motion retain the choice. A date or occasion change updates it through the existing seasonal state event.
- The full name comes from the same verified identity helper and is escaped on initial render or assigned as text on repaint. Public, locked and signed-out views retain the neutral heading. Shared-screen sign-out and handover remain authoritative.
- State lives only in this tab's memory. Only the previous public phrase is retained between visits. Reload starts a fresh random choice and can repeat the previous load; no staff identity or greeting history is persisted.
- Phone sizing uses the existing relative compact classes based on the complete greeting, including the prefix, so a long occasion name cannot bypass the long-name treatment. The original Welcome thresholds are unchanged in effect (21/37 total characters, previously 12/28 name characters). Shorter prefixes retain at least the original name-based compact size. All names wrap without clipping. Colours, motion, navigation and the heading's keyboard focus contract remain the existing design.
- No new Firestore reads, writes, listeners, rules, fields, timer, dependency, shell file or private cache. Existing celebration preference and calendar behaviour are reused. No new action means no save/retry/acknowledgement frame is needed.

### Break-it checks

The review prioritised long greetings at enlarged phone text; stale identity through rename/lock/handover; corrected Queensland midnight and clock readiness; Off/reflective days; and repeated seasonal events. The seasonal bridge observes child changes, so greeting/date text is assigned only when it changes, avoiding a repaint feedback loop. Verification uses the actual app and isolated synthetic Firebase records. Mocked checks do not establish live server or real-device behaviour.

Revert this pull request to restore the fixed welcome. There is no saved-data migration or rollback.

### Varied-welcome verification

Implemented-app captures compare `7f85629` with this change using synthetic records and locally supplied official Barlow, Barlow Condensed and Caveat faces, with TLS verification retained. Eighteen Home cases cover 390, 768 and 1280 px: ordinary, calendar Tihar, and a 40-character name at 125% text with the longest authored prefix (a transient Star Wars test theme). The [measurements](random-welcomes/measurements.json) and [capture script](capture-welcomes.cjs) record the method and source hash. [Phone before](random-welcomes/before-tihar-390.png), [phone after](random-welcomes/after-tihar-390.png), [desktop](random-welcomes/after-tihar-1280.png) and [long enlarged phone](random-welcomes/after-long-large-390.png) show the actual app.

At 390 px, the ordinary and Tihar headings remain 41.59 px high; the longest enlarged name remains 52.78 px, with identical personal-card positions and visible coworker counts before and after. No case clips or scrolls sideways. At 1280 px the longest enlarged seasonal heading wraps from 60 to 120 px, moving the cards down 60 px while retaining all three coworkers; this is measured, not claimed to be identical geometry. The existing festival explanation already requires more phone scrolling than ordinary Home. At 390 px the separate Prep fixture keeps six complete rows above Add at y=716 px, with identical row positions. Staff context takes zero taps, full team one and Prep one, before and after.

Focused checks pass for personalisation, Home board, layout, read budget, seasonal behaviour, calendar, saved-shell membership and design patterns. The first layout run could not load Google Fonts because the browser rejected the environment certificate. Re-running with the same official fonts supplied locally passes all 68 layout checks; TLS verification was not disabled. This is a browser-environment limitation, not an application or font change.

The new randomiser suite passes **45/45** and covers all four ordinary choices; stable repaint/rename; nonrepeating return; zero DOM changes after 20 repeated seasonal events; no extra database reads; real Queensland Diwali-to-Tihar midnight on a foreign-timezone phone; Christmas, Off, Still, reduced motion and quiet occasions; clock fallback/recovery after authentication; and full long names at all three widths. Its Functions-only midnight greeting check failed before the day-signature repair; the date also remained on the previous day with celebrations Off. Including the kitchen day in the existing seasonal refresh signature repairs that case without another timer. The corrected-day fixture calls the existing refresh directly; it does not claim a separate wall-clock overnight run.

JavaScript syntax and whitespace checks pass. Release CI and deployment state belong to the pull request; these are synthetic local browser checks, not production-session, emulator or real-device validation.

## Shift and time of day welcomes, 10 November 2026

The owner asked to improve the varied welcome before the next personalisation step, and picked two of four offered upgrades: **time of day** and **shift-aware**. Team languages and more festival words were not chosen.

**Verdict: Build smaller (quick check).** Only the words in the existing heading change: no new control, popup, line, read or step. Taps: checking your own section, break and coworkers stays at zero, full team and Prep at one. Lines on a 390 px phone: unchanged. The longest new opener (16 characters, "Enjoy your break", "Thanks for today") is shorter than the longest already measured ("May the fourth be with you", 26), and the existing compact classes count the whole heading. References: Headspace (short, calm words that fit the moment), Flighty (time and status read at a glance). Contract fit: one greeting, the full stored name, no first-name guess, neutral when locked or public.

### Behaviour

- Order: a celebration day's wishes first, then the person's own shift moment, then the ordinary words with the time of day.
- **Time of day** (Queensland clock): 04:00 to 11:59 adds Morning and Good morning, 12:00 to 16:59 Afternoon and Good afternoon, 17:00 to 21:59 Evening and Good evening, 22:00 to 03:59 Late one and Good evening. They join Welcome, Hello, Hi there and G’day.
- **Shift-aware**, from the saved plan Home already holds (`LK_PREP.homeGreet()` in `js/prep.js`): before the first shift "Good to see you" or "Welcome in"; on a break "Enjoy your break" or "Have a good break"; up to 30 minutes after a break "Welcome back" or "Back at it"; the last hour of the last shift "Last stretch" or "Nearly there"; after it "Thanks for today" or "Good work today". In the middle of a shift, or between a double's two shifts, the ordinary words show.
- No shift words when the plan is loading, failed, stale, unset, or holds a break the book cannot check, or when the shift has no hours. Ordinary words show instead.
- The words change only when the moment or the hour changes. `homePaint()` already runs on every draw and the 30 second tick; it sends `lk-greet` only when the moment or hour moves, and only while the named heading is on screen. Repaints, renames and seasonal events keep the words.

### Try to break it

- Plan arrives after Home opens: the first words are ordinary, then the shift moment's words once. Accepted: one change, right after load.
- A break that the book cannot check (`uncheckedBr`) never claims "Welcome back".
- The minute a break starts with Home open: the welcome follows on the next 30 second tick. Tested.
- Off or reflective days, Still, reduced motion, rename, lock and handover keep the rules above (existing checks still pass).
- Untested risk: a shift that crosses midnight has no shift words (only `from < to` shifts count), so it falls back to ordinary words.

### Verification

`tests/home-welcome-randomiser.test.js`: **92 of 92** pass. The new checks cover five Queensland times on a Los Angeles phone, the hour turning on an open Home, all five shift moments, the middle of a shift, a double's gap, a celebration over the last hour, a break starting with Home open, an untrusted break, and no extra reads. On #656's code **18 of 86 failed**. Personalisation, welcome layout (68), Home board, Home rota, staff Home, read budget, design patterns and seasonal files also pass (11 files). The older checks now accept every new opener and compare layout with the same opener for every name. Synthetic local browser checks only.

Rollback: revert the pull request. No saved data or rules change.

### With the kitchen mascot (#660)

The mascot stands at the right end of the welcome row and steps aside when it would touch a word (`docs/kitchen-mascot.md`). Measured in the app at 390 px with Ann: it shows for 15 of 23 openers and steps aside for 8 (for example Good morning, Welcome back, Last stretch, Happy Tihar). With Ana María it steps aside for Hello and G’day only. It depends on where the heading's last line ends, not on one word: #656's own Hello already does it. `lk-greet` now also asks the mascot to check its place. `tests/mascot.test.js` keeps its layout checks on Welcome (Math.random 0, a shift with no moment at 14:00). The owner then chose to keep it visible: on the Your day card, then room in the heading and date (`docs/kitchen-mascot.md`, 10 November 2026).
