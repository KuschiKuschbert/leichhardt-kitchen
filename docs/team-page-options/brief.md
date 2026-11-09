# Today's team: service and section on each row

10 November 2026, Queensland. **Council review in progress. No new design is chosen.** The released design remains C from `docs/team-tidy-options/brief.md`; the A/B/C names below belong to this new review.

The head chef clarified that each selected person should have **service/shift and section pickers together**. The present page already has the section picker; its service context is global. [The proposal](proposal.md), [shared current-contract packet](review-packet.md) and [actual current-page baseline](baseline.md) establish the scope and evidence limits.

## Round 1 and the smaller boundary

**Verdict: Build smaller, 5 of 5.** [Actual independent reviews](council-round-1.md). The measured problem is reaching the people, especially in the chef panel, and long-label readability. No reviewer established how often cross-service corrections occur, fewer mistakes or labour savings. Keep this within the existing planner rather than redesigning the whole app shell.

Explore two plainly labelled controls beside every selected person, clearer membership actions and reduced planner overhead. Keep saved break return times visible. Preserve selected-day membership, dated drafts, configured services, sections, meal breaks, splits, overlapping Spread them, Add staff, Whole day, copy-last-weekday, one explicit dated Save and existing access/recovery/version protection.

## Three concrete options

[Interactive isolated preview](preview.html). Change A/B/C in the preview controls. Its fictional data are held only in memory; no live data, Firebase calls or production writes. The same ten eligible people, eight selected for the day, three services, saved breaks, dates and actual Barlow/Caveat fonts support every option.

**A, Open worksheet.** Keep the week strip visible and put all selected people directly under a slim saved-break strip. Each row has Service to edit and Section, then a short break summary and Edit breaks disclosure. Save follows the roster. This changes the least. It keeps the long scroll to Save and adds controls to every row.

**B, Plan in stages.** Keep the week strip and saved-break strip, then use freely jumpable Assignments, Breaks and Review stages inside the notebook. Assignments has the same two row controls; Breaks gives the group a dedicated editing surface; Review shows every service and the dated Save. This separates setup tasks and offers a complete review, at the cost of another navigation step and remembering the stage. Reaching Review does not validate the plan.

**C, Roster and focus.** Keep the date visible while revealing the full week on demand. Put people and their two controls first. Edit breaks opens a named person/service/date workbench beside the roster on a laptop, or inline on a phone. A notebook-scoped Save area stays reachable and clears the existing phone navigation. This reduces navigation overhead and isolates detailed work, at the cost of a disclosed week and a changed detail arrangement.

All three consolidate the local chef Team heading; none changes the app's global navigation. This local heading consolidation, the slimmer saved-break board, separate membership actions, B's stages and C's disclosed week/Save position are proposed departures from the currently chosen page arrangement. They require the head chef's design choice. They are isolated sketches of the same planner, not evidence that a production implementation has inherited its recovery or permission contracts.

### Structural differences

| Pair | Meaningful differences |
| --- | --- |
| A versus B | All editing in one worksheet versus separate task stages; per-person break disclosure versus group break surface; Save after roster versus Review stage. |
| A versus C | Permanently visible week versus date disclosure; per-row details versus one responsive workbench; end-of-list Save versus notebook-scoped persistent Save. |
| B versus C | Assignment/break/review navigation versus continuous roster; group break stage versus selected-person workbench; visible week versus date disclosure; Review-stage Save versus persistent Save. |

These are layout, hierarchy, task-sequence and disclosure differences. The colours, fonts, synthetic data and required capabilities are shared.

## Evidence and comparison

Current released source is frozen at `29258e6420714209616fdcd1fe3ff2c2dfec0299`. The [baseline](baseline.md) uses real application code with stand-in Firebase. At 390 px, the direct page shows one complete unobscured person, the chef panel none. Save begins at 1367/1644 px. A visible-service section correction and Save take three taps; another-service correction takes four; a break correction takes four. Native two-picker previews ordinarily require five tap-equivalent actions for another service, and this cost must be stated.

While the review ran, main reached `fdf807f`, including a fallback-font date-wrapping repair and stricter council guidance. The [Round 2 packet](round-2-packet.md) supplies the new exact guidance to every reviewer. The actual-app baseline retains its original source label; these are **Preview** counts, not delivered density. Before a later app change is ready, measure its complete current shell, full forms, fonts and states again, record differences from the selected sketch and return material departures to the owner. Midnight rollover, pending acknowledgement across midnight, next-day record readiness and the separate 04:00 unlock are Not evidenced by the fixed-clock previews.

The frozen [prototype verification](preview-verification.json), [evidence note](preview-evidence.md) and [reproducible browser script](verify-previews.cjs) cover 30 scenes, 21 tasks and 175 main checks, plus 53 focus/control checks and 16 directed label/breakpoint checks: **244 passing checks**. All five current evidence files share identical final asset hashes. Counts include explicit dated Save; native picker open and choice count as two tap-equivalent actions. They exclude scrolling, typing and OS-menu timing. Initial rows count only those fully visible above navigation and any Save area. Screenshots are prototype evidence, not implementation or live evidence.

| Task from the same starting state | Current app | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Correct section on the visible service and Save | 3 | 3 | 4 | 3 |
| Choose another service, correct section and Save | 4 | 5 | 6 | 5 |
| Add two people to two services and Save, before sections | 6 | 6 | 7 | 6 |
| Correct an existing break and Save | 4 | 4 | 5 | 4 |
| Spread 30-minute breaks with starts every 15 minutes and Save | 5 | 5 | 6 | 5 |
| Select another day in the loaded week | 1 | 1 | 1 | 2 |

B's extra tap opens Review. C's date count includes revealing the week. Row service viewing alone takes two actions in every option, versus one tap on a current global service tab. Defaulting each row to a service that person actually works can help a Dinner-only person, but does not establish a universal speed gain.

| Initial normal-text frame | Current complete rows | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Direct, 390 px | 1 | 2 | 1 | 2 |
| Direct, 768 px | 2 | 2 | 2 | 2 |
| Direct, 1280 px | 2 | 2 | 2 | 2 |
| Chef panel, all three widths | 0 | 1 | 1 | 1 |

On the direct phone the first row starts at 465/539/383 px for A/B/C, versus 654 px currently. In the embedded frame it starts at 553/627/471 px, versus 931 px. A's Save begins at 1570 px directly and 1658 px embedded, compared with 1367/1644 px currently. Its added row controls lengthen the roster. B has Save only on Review. C's Save button is visible at 722 px on the phone and 789 px on tablet/laptop; its dock is subtracted from the row count, not counted as usable people space.

**Largest text:** none of the options fits a complete initial person in either phone frame, including long-label stress. C's first row begins sooner (513 px direct, 618 px embedded without long stress; 562/667 px with stress), but its Save area consumes space too. Names wrap at words and long selected section values appear in full below the native control. This improves the current fragmented-word stress case, not the initial whole-row count. All 30 scenes contain eight unique selected people and their two controls, no horizontal overflow, visible targets below 44 px or browser errors. All actual fonts loaded. The 3,703 normal text contrast samples have a minimum 5.199:1, with no failures or unresolved sampled backgrounds.

Estimated build size for each is one focused app pull request plus existing required checks. A has the smallest layout/relearning surface; B introduces a planning stage; C changes week/detail/Save disclosure. No additional production reads, listeners, rules, schema, service or dependency is proposed. Zero network in a standalone preview does not establish an eventual implementation's read cost.

## Contract fit and verification boundary

Shared surface roles remain sage people headers, warm paper writing, charcoal saved-now information and quiet ivory details. Orange identifies choices/attention, green only the stated inclusion or confirmed result, red invalid/adverse actions. Draft, Saving, failed, conflict and acknowledged Saved use words. No colour establishes availability, successful persistence or food safety. Preserve artwork, categories and print exceptions.

Changing Service to edit changes view context only. Membership, No section and removal are separate operations. Other service assignments and breaks survive. Whole day must read actual draft memberships rather than the currently viewed row service. The charcoal board must read today's acknowledged saved plan, independently of the selected date and edits. Past dates stay read-only. A single dated Save collects the draft; a pending or failed stand-in response cannot appear Saved.

The previews can check local state, wrapping, keyboard focus, effective contrast, 44 px targets, reduced motion, overflow and task paths. They cannot prove canonical roles, daily locks, deliberate handover, same-person recovery across reload, Firestore rules, server transactions, true offline behaviour or concurrent production writers. These remain required implementation checks using the existing client and emulator suites, not new product steps.

Common prototype limits: native browser controls stand in for the app's shared picker frame, and production saved-reference folds and usual-section fallback are not reproduced in full. The prototype adds new memberships with No section; retain the app's known, editable usual-section defaults and full references with existing helpers in implementation. Copy uses an explicitly seeded fictional previous weekday, not a real read. Local status/response stand-ins do not establish equivalent production acknowledgement, cache, notification or access behaviour. No design gets credit for those untested guarantees.

| Applicable current contract | A | B | C | Source and evidence |
| --- | --- | --- | --- | --- |
| Surface purpose, local state words and effective text contrast | Works in sampled preview. | Works in sampled preview. | Works in sampled preview. | Surface/colour/action excerpts in the packet; 3,703 computed samples, minimum 5.199:1, plus pending/failed/conflict words. |
| 44 px controls, containment and actual fonts | Works in 10 scenes. | Works in 10 scenes. | Works in 10 scenes. | `preview-verification.json`; three widths, both frames and largest/long stress. |
| Visible control boundaries and keyboard focus | Works in sampled controls. | Works in sampled controls. | Works after the focused repair. | `focus-controls.json` and `new-context-controls.json`; 27 samples, boundary minimum 4.704:1 and 3 px focus outline minimum 13.531:1. C's reproduced large-text Tab occlusion was repaired with scroll padding and margin; all 34 focused checks pass afterwards. |
| View-only service choice, explicit membership and independent date drafts | Works in named fixture. | Works in named fixture. | Works in named fixture. | Exercised task and adversarial state assertions, including No section versus off, two services and two dates. |
| Saved-today board separate from drafts/future dates; truthful acknowledgement | Works in stand-in. | Works in stand-in. | Works in stand-in. | Held/repeated/failed/conflicting Save and saved-board assertions. Production acknowledgement remains Not evidenced. |
| Stable targets and reduced motion | Works in checked scope. | Works in checked scope. | Works in checked scope. | No preview animations; computed reduced-motion checks and keyboard focus retention. Full assistive-technology use is Not evidenced. |
| Canonical roles, privacy, lock/handover, reload recovery and server versions | Not evidenced. | Not evidenced. | Not evidenced. | Current access/dated-planning contracts remain mandatory; existing client and emulator checks are required for implementation. |
| Midnight, next-day readiness, pending acknowledgement across midnight and 04:00 unlock | Not evidenced. | Not evidenced. | Not evidenced. | Current guidance at `4f3edca`; preview clock is deliberately fixed. |
| Delivered density and read cost with complete current app shell/forms | Not evidenced. | Not evidenced. | Not evidenced. | Current guidance requires a fresh Implemented app comparison. Zero prototype network does not prove production costs. |
| Category, artwork and print exceptions | Not relevant to this isolated planner comparison. | Same. | Same. | No app stylesheet, category, drawing or print renderer is changed. Retain those exceptions during implementation. |

### Reference principles, before independent ranking

| Principle | A | B | C |
| --- | --- | --- | --- |
| Linear: work prominent, consistent frame | Works: two phone rows; familiar continuous worksheet. | Needs work: stage navigation leaves one phone row. | Works: two phone rows and visible dated Save; no new global navigation. |
| Things 3: today/upcoming and disclosure | Works: written date, today-only saved board, per-person details. | Works: same date separation; occasional detail is a separate stage. | Works: same date separation and named workbench; date choice costs an extra action. |
| Airbnb: complete job context | Works: person/service/section together, details name the date. | Works: full-day Review shows every membership. | Works: same row context and named detail workbench; broad review is disclosed. |
| Todoist: quick entry, editable defaults | Works: deliberate group Add; six actions including Save. | Needs work: same Add plus Review, seven actions. | Works: same group Add; actual membership chooses initial row service. |
| Flighty: truthful now/next | Works: saved-today board separate from edits. | Works: same board on every stage. | Works: same compact board above roster. |
| Duolingo: immediate truthful feedback | Works in the named stand-in: pending, failed and acknowledged states. | Works in the same stand-in; Review is not validation. | Works in the same stand-in, with reachable Save feedback. |
| Headspace: plain named controls | Works: Service to edit, Section, Edit breaks. | Needs work: more planning concepts to learn. | Works: same controls, person/service/date in details. |

These are evidence-linked lead observations, not council votes or live usability findings. Real persistence/access remain Not evidenced for every option. Reject dense keyboard-only controls, drag-only planning, decorative cards, guessed assignments, new listeners, rewards and onboarding interruptions: none helps this task or the current contract.

## Break-it findings carried forward

| Scenario and impact | Current evidence | Required disposition |
| --- | --- | --- |
| A row service or date change targets the wrong assignment or removes another service. | Risk / Not evidenced for the proposal. Current baseline preserves the other service. | Exercise two services on two dates, independent row view state and explicit membership/no-section distinction. |
| Pending/repeated/failed Save shows success early or loses a dated draft. | Risk / Not evidenced for the new layout. Baseline proves only draft versus saved-board separation. | Exercise held, failed, repeated and conflict stand-ins. Keep live/client/emulator guarantees separate. |
| Spread puts a new meal break inside a retained long split. | Reproduced in the synthetic current-app fixture, `baseline-task-paths.json`. | Show a reviewable conflict in the preview; do not imply conflict-free scheduling. A production repair would need its own focused specification/check. |
| Long names and section labels remain contained but become unreadable vertical fragments. | Reproduced current-app stress image, `baseline-inline-row-390-xlarge-long.png`. | Measure largest-text normal and long labels, allow readable wrapping, show complete selected value. |
| C's sticky Save hides the last row's keyboard focus at largest text. | Reproduced in the first focused preview run: four failed service/section visibility assertions. | Repaired with notebook-design-specific scroll padding and control scroll margin. Checked afterwards in all 34 focused assertions, including natural Tab at normal/largest/long text and deliberate pointer access. Full-app integration still needs the same check. |
| B's largest-text stage label paints outside its orange pill onto pale background. | Reproduced independently by designer and Keeper during Round 2: text extends 19.328 px beyond the button. Original page-overflow and parent-fill contrast checks did not detect this local paint issue. | Repaired by stacking largest-text phone stages. Nine directed checks and focused designer/Skeptic follow-ups retain the rankings. The Skeptic's 401 px concern reproduced a 15.656 px spill, then passed at 401/700/701 in both frames after extending the phone rule. Seven bounded checks pass; original evidence and votes remain archived. |
| Role, lock/handover or competing-version protection is weakened. | Risk / Not evidenced by the standalone preview. | Retain authoritative helpers and run relevant existing client/emulator checks before implementation readiness. No production probing. |

## Round 2 result and disagreement

[Actual independent reviews and scores](council-round-2.md). Rank points were specified in advance: first 3, second 2, third 1.

| Reviewer | A | B | C | First |
| --- | ---: | ---: | ---: | --- |
| Cook mid-service | 2 | 1 | 3 | C |
| Head chef | 3 | 1 | 2 | A |
| Skeptic | 3 | 1 | 2 | A |
| New starter | 2 | 1 | 3 | C |
| Keeper | 2 | 1 | 3 | C |
| Kitchen screen designer | 2 | 1 | 3 | C |
| Total | 14 | 6 | 16 | C |

C is first for four of six, A for two; every reviewer puts B third. The head chef and Skeptic prefer A's familiar visible week and smaller integration surface. The other four prefer C's reachable Save and named workbench. All six distinguish Preview evidence from production guarantees, and all reject compulsory planning stages. B's local largest-text paint defect was found during these original reviews, despite the earlier passing page-containment checks. Later routine repair and focused follow-up do not silently replace their original scores.

B's repaired largest-phone stages stack in one column, retaining the requested 20 px font. The [before/after text-range evidence](b-stage-containment.json) reproduces the old 19.328 px spill and passes all nine checks across four repaired direct/chef, largest/long scenes. Buttons are 50 px high. The extra vertical cost is 88 px: first rows start at 825/874 px directly and 929/978 px embedded, versus 737/786 and 841/890 before. Complete initial rows stay zero. The original sampled contrast result did not establish contrast for glyphs painted outside their parent fill; the new containment check addresses that missed condition. Final broader rerun and focused reviewer disposition are recorded in the evidence note and original-review record.

Both focused reviewers keep their original rankings. The designer separately measures the repaired selected white/orange label at 5.585:1 and other stage labels at 16.869:1, with opacity 1. The Skeptic identifies a risk just above the first repair's 400 px boundary; it is reproduced and closed by using the existing 700 px phone boundary. [Final boundary evidence](stage-boundary.json) checks 401, 700 and 701 px in both frames, all seven assertions passing. Buttons retain 20 px text and at least 50 px height, including the taller 701 px chef case. No interaction, stored state, new blend or original council score changed.

## Explicit A + B + C mix assessment

| Source and proposed part | Take or reject, and why | Useful principle and kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- |
| A's permanently visible week | Reject as C's default; keep the complete week available through C's named date control. | Things 3: retain dated context while occasional controls disclose. | Permanent week competes with the roster and Save area. An all-three layout has not been measured. | C date choice costs two actions versus A's one; original A/C normal direct phones each fit two complete people. |
| A's continuous selected-person roster and quick entry | Retain the shared capability already present in C. This is not an additional merged interaction. | Linear and Todoist: keep work prominent and deliberate group Add quick. | No extra state or duplicate control required. | C already has both row pickers and six-action two-person/two-service Add plus Save. |
| B's complete-day review content | Retain C's existing optional Whole day review, which already shows every service membership. | Airbnb: see the complete job context. | Making Review mandatory would conflict with direct Save and add a task step. | C's exercised Whole day uses actual draft membership, not each row's current service view. |
| B's Assignments/Breaks/Review navigation and Save gate | Reject. | Headspace and Linear: fewer planning concepts, clear next action. | Another remembered stage and one extra action on corrections, additions and Spread. | B tasks are consistently one action longer; one initial normal phone person versus two in C. |
| C's named responsive detail workbench and dated Save | Take as the coherent original C flow. | Things 3, Headspace and Duolingo: occasional details, full context and nearby truthful feedback. | More disclosure/layout integration than A; date choice adds one action; the Save area occupies roster space. | C previews, task paths, saved/draft checks and repaired keyboard reachability. |

**The all-three mix does not beat C on current evidence.** Permanently open dates plus mandatory stages plus a persistent Save would duplicate navigation and compete for phone space. No measurements or council endorsement are claimed for that unbuilt combination. The recommendation is **the original C flow**, with its routine keyboard repair, not a new blend. Shared Add and optional Whole day review are already exercised in that preview, so no combined preview or inherited component scores are needed.

## Choice and recommendation

**Recommend C, Roster and focus.** It meets the requested row service/section context, makes the dated Save reachable and keeps detailed break editing named and local. Linear's work emphasis, Things 3's occasional-detail disclosure, Headspace's plain labels and truthful local feedback support that task benefit. It wins four independent first choices, with real dissent favouring A's continuity.

Its main downside is reduced visibility of the week: another date takes two actions instead of one, and neighbouring dated drafts are disclosed. The Save area also costs reading space, particularly at largest text, where no option fits a complete initial person. Another-service section corrections take five actions versus four today. These costs are not hidden behind a claim of general speed or labour savings.

The owner has chosen the two row controls, not this review's A, B or C. The live page remains unchanged by this draft review. The service-council rule says, “The council advises and the head chef decides” and requires showing the designs and recommendation before building the chosen design. Application implementation and release follow the owner's concrete design choice.

After choice, reuse the authoritative team renderer, per-date draft/version/Save helpers, shared picker frame, canonical access and bounded week query. Retain production references and time-boundary/recovery guarantees. Recheck the complete implemented page at 390/768/1280, actual fonts plus relevant fallback/large/long cases, and compare it with the chosen preview. Run the focused team, acknowledgement/conflict, device/recovery and relevant emulator access/version checks. Fix or return material departures to the owner before readiness. No new full council round is required for routine implementation verification.
