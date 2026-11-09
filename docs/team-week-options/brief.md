# Team sections a week ahead

9 November 2026. **A chosen by the head chef, implemented and locally verified. CI and release pending.**

Layout follow-up: the head chef subsequently chose [A, Quiet notebook, one list](../team-tidy-options/brief.md) for management. Its per-person details replace the duplicate roster without changing the week picker, independent date drafts or dated Save contracts below.

The head chef asks to let head and sous chefs allocate sections for staff a week ahead, with a day picker to move backwards and forwards. This follows the existing roster notebook, rather than replacing the kitchen's payroll roster. [Initial proposal](proposal.md).

## Round 1

**Verdict: Build smaller, 5 of 5.** Five fresh agents reviewed the proposal and the synthetic current-app screenshots at 390 and 1280 px. This is role-based analysis, not research with real staff.

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | Keep tomorrow out of today's breaks and section defaults; phone space is scarce. |
| Head chef | Build smaller | The gap is choosing another date; reuse assignment and Save. |
| Skeptic | Build smaller | No evidence yet warrants a second planner, week grid or batch actions. |
| New starter | Build smaller | Repeat the full date and clear unsaved or saved wording. |
| Keeper of the book | Build smaller | Separate selected-date state, retained drafts, failures and conflicts before expanding. |

There was no verdict disagreement. The cook suggested putting planning in the existing chef panel; the head chef, skeptic and keeper preferred extending the existing editor. Round 2 compares those locations.

## Three concepts

All concepts retain the same core: choose a day and shift, choose a section, assign people, review breaks and explicitly save that date. Previews use synthetic people and illustrative shifts. They do not connect to Firebase and do not alter the real kitchen.

- **A, Dated roster notebook.** Extend Today's team with a compact Monday to Sunday strip, previous/next week and Today. Keep section-first assignment and the current two-page notebook. The smallest change to the familiar workflow; the date controls consume some phone space.
- **B, Week overview.** Start with each day's saved or incomplete plan. A laptop uses a matrix; a phone uses dated summaries. Edit a day to use the assignment tools. Better for checking coverage across the week; it adds a step before assigning a person.
- **C, Chef-panel day planner.** Put Section planning in the existing Team room. Show one full date with previous/next day and a date picker, without seven day tiles. A focused editor uses the panel's familiar layout. Fewer date controls, but planning is less discoverable from Today's team and the whole week is hidden.

### Measured preview comparison

Browser walkthrough with synthetic data, 390 by 844, 768 by 844 and 1280 by 844. Existing app fonts were fetched with verified TLS and supplied to the browser because Chromium did not trust the environment's proxy certificate. These previews simplify the real editor and start on Tuesday 10 November, when there is no live break board. The baseline is today's production layout with test fallback fonts. Row counts therefore describe the screens shown, not a proven before/after implementation improvement.

| Measure | Existing Today’s team | A, notebook | B, week overview | C, chef panel |
| --- | --- | --- | --- | --- |
| Assign Grill to Bo on an open Lunch editor, then save | 3 taps | 3 taps | 4 from overview, including Edit day | 3 in editor |
| Change to another day | Impossible | 1 day tile tap | 1 Edit day tap, then editor scrolls into view | 1 adjacent-day arrow; distant day through picker |
| Complete assignment rows on initial 390 px screen | 1 in baseline | 3 | 0; 2 complete day summaries | 2 |
| Complete assignment rows after Edit day at 390 px | Not applicable | 3 | 3 | 2 |
| Add/tick Prep | 1 tap | 1, service screen untouched | 1, service screen untouched | 1, service screen untouched |
| New global navigation or automatic popup | None | None | None | None; existing Team room |
| Relearning | Existing | Low | Medium | Medium |
| Proposed app build size | Not applicable | 1 cohesive feature PR | 1 larger feature PR | 1 feature PR plus panel wiring |
| Planned reads | Current day only | Selected day on open/tap; week markers need one bounded query | One bounded week query | Selected day on open/tap |
| Proposed schema or rules changes | Not applicable | None established | None established | None established |
| Main risk | Today only | Wrong day or lost draft | More scrolling and overview/editor state | Planning harder to find; week hidden |

All nine initial width/concept combinations had no horizontal overflow, browser exception or form/button target under 44 px. A, B and C passed selected-day edits, date changes, retained drafts, explicit Save naming Tuesday 10 November and a return to Today. See `preview-measurements.json`. The real app needs separate end-to-end checks.

## Round 2 and recommendation

Six fresh reviewers saw all three designs, their phone and laptop screenshots, B's opened editor and the comparison table, without a preferred option. Scores are 3 for first, 2 for second and 1 for third.

| Reviewer | First | Second | Third |
| --- | --- | --- | --- |
| Cook mid-service | A | C | B |
| Head chef | A | C | B |
| Skeptic | A | C | B |
| New starter | A | C | B |
| Keeper of the book | A | C | B |
| Kitchen screen designer | A | C | B |

**A 18, C 12, B 6. A first for 6 of 6.** There was no ranking disagreement. All six preferred extending the existing notebook; all six asked for written date status rather than unexplained dots. B's week comparison was useful on a laptop, but its extra Edit day step and long phone list were not justified for the first build. C's explicit reminder that future planning leaves today alone is useful in A. The designer and new starter also flagged C's browser-locale numeric date ambiguity. Preview screenshots and target measurements are not a WCAG certification or proof of real save behaviour.

Recommendation: **A with B's written saved/incomplete status and C's clear selected-day wording.** Keep the real notebook and its today break-board order. Put the week strip inside it, retain the current section-first flow and use an explicit dated Save.

## Shared implementation contract

1. Retain the canonical head/sous chef PIN checks and existing dated `team/<day>` record shape and version protection. Selecting another date must never redirect the live `tm` record. Staff Home, Your day, section defaults, break board and top chip continue to use today only.
2. Use a planner state keyed by date, scoped to the current access epoch and person. Keep each date's draft and saved version in memory when switching dates and shifts. Deliberate handover clears private drafts; privacy locks retain the original person's protected work using the existing session contract. Refresh must confirm discarding changes.
3. Show the full selected date beside the editor, on Save and in its acknowledgement. A Save changes only that date; no silent autosave or ambiguous Save week. Disable date changes while a save is awaiting acknowledgement, and keep failure and conflict drafts recoverable.
4. On explicit date selection, read one dated record, or read a displayed week's records in one bounded query. Reuse memory in the open session, refresh explicitly, and do not add listeners, polling or persistent private plan storage. Failed or cache-only empty reads cannot become a blank editable plan. Recheck version at Save through existing rules; a stale record is never silently overwritten.
5. A current-day Save follows the existing live-team invalidation path. A future Save must not trigger current-day rereads on every staff phone. Loading and future-date summaries must not say On break now. Today is always an obvious way back.
6. Same as last weekday remains an explicit copy into an empty selected-date draft. Compute the source relative to that selected date. Filter departed staff, removed shifts and removed sections using existing helpers. Nothing is saved until Save.
7. Retain the existing multi-shift sections, meal breaks, splits, Whole day review, Use it, Spread them and conflict recovery. Do not create a second roster, availability system, recurring template, notification system or publish workflow.
8. Retain `LK_TIME` and Queensland calendar helpers. Decide past-day editing and the initial planning horizon explicitly with the chosen design; the initial request establishes future planning and back/forward navigation, not new staff access or unrestricted historical corrections.

## Feasibility checked in source

- `js/prep.js` hard-codes today in `teamLoad`, `tmFrom`, `teamPageHTML` and `teamSave`; simply replacing `dayNow()` would leak selected future state into live staff consumers. Keep live and planner records separate.
- `firestore.rules` `teamOk(day)` already validates dated records and sequential versions without a today-only condition. No new schema or permission widening is currently required. Kitchen sessions can already read other dated team documents at the database layer; keeping staff screens on today is the product contract, not a newly claimed confidentiality boundary.
- `scripts/analysis.mjs` reads team plans only through its completed-day upper bound, `to`, so future plans are excluded from training counts and usual-section history. Verify this with the selected-date feature checks.
- `scripts/nightly-backup.mjs` backs up the entire `team` collection through `all(name)`, independent of its dated operational windows. Future team documents therefore use the existing backup path. Each extra saved day also adds one document to that nightly collection read. Recovery includes `team` in `ARRAY_COLLECTIONS`.
- No package, service, shell member, payroll integration or real staff seed is required.

## Acceptance and verification for implementation

- Head and sous chefs select a future date, assign sections on Lunch and Dinner, save, reload and recover exactly that date's plan. Other roles do not acquire editing controls or authority.
- Switching between two dates preserves independent unsaved edits; Save and acknowledgement identify the affected date. Resizing and Whole day retain the same per-date draft.
- Current-day staff Home, personal sections, break status, chip and read count remain unchanged when a chef browses or saves a future date.
- Empty, loading, cache-only empty, invalid and denied reads are distinct. Failed Save retains the draft. Two chefs saving one version cannot overwrite each other; different dates can be saved independently.
- Midnight and the 04:00 session boundary follow Queensland time and current protected-work rules. An in-flight response from another day or access epoch cannot repaint or save under the wrong person/date.
- Selected-date Use it uses that date minus seven days and stays an explicit draft action. Removed staff, shifts and sections retain current filtering.
- Browser checks at 390, 768 and 1280 px cover targets, overflow, full-date readability, draft preservation and keyboard focus. Report preview and implementation measurements separately. Focused team, roles, read-budget, privacy, rollover and rule-shape checks cover the affected boundary.
- Follow repository shipping rules: node syntax checks, focused browser tests, appropriate existing emulator checks if rules change, current README and feature notes, pre-merge check, a draft PR until the head chef's design choice.

## Chosen and build

The head chef chose **A: Week strip in Today's Team (recommended)** in chat on 9 November 2026 and authorised coding. Keep the existing notebook. Add previous/next week, Monday to Sunday day choices and Today. Today and future dates are editable; past dates are browsable read-only, without introducing historical corrections into this workflow. Retain one independent draft and version for every visited date. Use written status on day choices and full selected dates on Save and acknowledgement.

Implemented in `js/prep.js` and `css/app.css`, using the existing notebook, save helpers and dated team records. The staff-facing current-day record remains separate. Dates, shifts, sections, Whole day and unsaved drafts keep their own selected-date state; the shared protected-work guard includes hidden-date drafts. Existing PIN authority, schema and sequential version checks remain unchanged.

The selected week uses one server query with an eight-document safety limit, rejecting malformed results beyond the seven valid dates. A normal complete week costs up to seven document reads, and an empty week costs one, plus existing rule-dependent reads. It is reused in memory within the session. Refresh explicitly rereads; future-date lead text says when it was last checked. There is no listener or persistent private cache. Use it reads the selected date minus seven days on the tap. A refused Save may read that named date once to identify a newer version. No rules publication or migration is needed.

Future-only saves do not send today's invalidation stamp. If a save is still waiting when its date becomes today, acknowledgement sends one bounded follow-up stamp so screens that already read the new day can refresh. Failure of that notification cannot turn a confirmed saved plan into an unsaved plan; the acknowledgement explains that other screens may need reopening.

### Actual-app density and interaction checks

Fresh browser captures compare base `72d36a0` with the implementation, using the same three fictional people, configured shifts, saved meal break and actual Barlow/Caveat fonts. Font downloads use verified TLS. The baseline runs the base commit's JS and CSS through the same stand-in. These actual-app measurements supersede the schematic preview counts for implementation claims.

| Normal text, 844 px high | Base today | Built today | Built future day |
| --- | --- | --- | --- |
| Complete assignment rows at 390 px | 1 | 0 | 1 |
| Complete assignment rows at 768 px | 1 | 0 | 1 |
| Complete assignment rows at 1280 px | 2 | 1 | 1 |

The week controls take approximately 108 px above the editor. This is an explicit planning-page space cost for selecting dates, while retaining the chosen live break-board priority and existing assignment tools. A chef scrolls to today's first complete person row on a phone. Prep's service list and one-tap Add/Tick remain unchanged. On an open shift, choose section then person is still two taps, plus one Save; changing a day within the week is one tap.

The six today/future and width combinations were also checked at largest text. None overflowed the page or produced a browser exception. Date buttons remain at least 44 px in both dimensions; the largest-text phone uses local horizontal scrolling with an edge fade. All seven fit on a normal 390 px phone. Keyboard focus and pressed states remain explicit. The largest-text fixtures show no complete initial assignment row, so no improved first-screen density is claimed. See `baseline-realfont-measurements.json`, `implemented-measurements.json` and `implemented-*.png`.

### Verification

- Changed JavaScript syntax and whitespace checks passed, including the preview script and the bounded query's emulator test file.
- `tests/team-week.test.js`: **65 checks passed**, covering dated saves/reload, independent multi-shift drafts, current-day isolation, read reuse, weekday hints, conflicts, failed/offline reads and writes, selected-date copying, past read-only, privacy-lock recovery, midnight, an older week snapshot after a newer save, a save acknowledged after midnight, exact keyboard focus and largest-text targets.
- **All 15 final focused regression files passed**: team-week, todays-team, team-notebook, team-shift-tabs, Home staff-first, Home staff roster, Home board, read budget, design patterns, roles, page roles, device work recovery, device lock handover, device prep lock and safe text. The combined run took 2.2 minutes with four workers. The two original team tests now hold/fail both valid plan-read paths and assert the intended dated acknowledgements; they retain loading/empty/error and conflict guarantees.
- After main advanced, one merge retained both sets of new project notes. **All 18 integration regression files passed** on the combined tree, adding supplier order status, module version and split-history checks to the 15 above. The run took 2.6 minutes with four workers. App, supplier and prep JavaScript syntax checks passed.
- Real Firestore/Auth emulator, `tests/rules/client-shapes.test.mjs`: **245 rows, 2205 calls across nine sign-ins passed**, including the new bounded team-week query. No rules file changed.
- Actual-font responsive screenshots and measurements passed at 390, 768 and 1280 px, normal and largest text, with the density tradeoff above recorded separately from previews.
- Independent final source review reported no blocking correctness or security defect. Browser persistence uses the existing stand-in; role evidence uses the real emulator. No production write or live deployment is claimed by these checks.

CI and live release remain pending. The normal release queue owns merging; no direct merge or release-window override is needed.

## After the tap

| Action | Immediate response | Acknowledgement and location | Drafts, failure and reversal |
| --- | --- | --- | --- |
| Pick a day or move week | Selected date and written status change in the notebook | Loaded plan says its date; loading and failed reads stay explicit | Other dates' drafts stay in memory. Go back or Today reverses navigation without a write. |
| Today | Today's date and week are selected | Today's saved plan and current break board use the live record | Future drafts remain separate. No automatic save. |
| Assign or adjust a shift | Selected day's draft changes in place | Unsaved wording and enabled dated Save identify what remains to send | Existing Clear section, membership and break controls reverse unsaved choices. No live status changes before Save. |
| Save a date | Existing button says Saving and date controls disable | After server acknowledgement, Saved and a dated message appear beside Save | Old unsaved words clear. Refusal stays visible and keeps the dated draft. A later deliberate edit and Save makes a correction; there is no new automatic Undo. |
| Refresh | Existing discard confirmation applies if the selected day is dirty | The selected week's read state and dated saved plan update | A failed read keeps drafts and explains retry. Other dates' unsaved work is not discarded. |
