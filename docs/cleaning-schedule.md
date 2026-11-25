# Cleaning schedule and checks

9 November 2026. Status: implemented and locally verified; the owner authorised release. [PR #637](https://github.com/KuschiKuschbert/leichhardt-kitchen/pull/637) records current CI, rules publication, deployment and live verification. The data and staff daily notebook contracts remain authoritative. Chef management now follows the chosen [M1 grouped review and responsive editor](cleaning-chef-options/implementation.md). The requested integration uses the existing application design. It introduces no page, tab, top-bar button or service-page popup.

## Outcome

Chefs can prepare the supplied 26-task cleaning schedule, its methods, responsibilities, repeat days and checks in the existing Cleaning workspace. Staff see today's work. Canonical head and sous chefs retain the existing weekly review and setup access. The admin release switch stays off until the verified owner enables it.

The owner also requested the ordered pack-down list. It adds 25 separately importable closing steps across Hot larder, Grill and Pans, using the same checks, saves and audit trail.

The schedule is unbranded. Do not add another venue's name, company branding, source labels or staff identities. The current kitchen and its shared Queensland clock remain authoritative. Imported responsibility text is guidance, never an access grant.

## Authoritative data

- `js/cleaning-schedule.js` holds exactly 26 built-in task drafts with stable generic IDs `c01` through `c26`. It is loaded only with Cleaning. Its `drafts()` returns independent copies for chef setup.
- The same file holds 25 pack-down drafts with stable IDs `pd-hot-01` through `05`, `pd-grill-01` through `10` and `pd-pans-01` through `10`. `packDownDrafts()` returns independent copies. The 26 general templates and their baseline weekday acceptance counts stay separate.
- Firestore `cleaningTasks` remains the operational source of truth after import. Do not reapply the built-in drafts over a chef's edits.
- Import is an explicit chef action. Deterministic root IDs and a bounded all-revision check avoid duplicates, including after retry, concurrent import or archival. No fuzzy title matching and no automatic production seeding.
- Immutable revisions preserve wording, methods, required checks, responsibility, timing and verification policy for earlier dates. Existing jobs and saved completions remain readable.
- Edits and archives retain the existing tomorrow-effective boundary. New jobs start today. The 04:00 authentication boundary does not change the midnight cleaning calendar.

The optional `plan` on an enhanced task contains `template`, `method`, `responsibility`, `checks`, `timing`, `verification`, `verifiers` and `review`. Optional `repeat` is `{days, anchor}`, with an interval from 2 to 30 days and a kitchen-calendar anchor date. A check's exact label is its saved identifier. Keep labels unique and bounded. Editing a required label or recurrence creates a new task revision.

## Recurrence and occurrences

Before service, prep or use expansion, the 26 templates comprise 22 everyday tasks plus:

| Task | Days |
| --- | --- |
| Canopies, filters and panelling | Sunday |
| Dry stores | Wednesday and Sunday |
| Freezers | Thursday and Sunday |
| Chemical room | Monday, Wednesday and Friday |

The Monday-start baseline counts are **23, 22, 24, 23, 23, 22, 25**, totalling **162 task-days**. These are template-day checks, not an expected number of service events or completions.

Enhanced timing distinguishes:

| Timing | Fixed checkpoints | Explicit events |
| --- | --- | --- |
| Daily | Daily | None |
| After each service | None | Service |
| After prep and each service | None | Prep and service |
| Food covering and labelling | Start of day and end of night | Prep |
| After use | None | Equipment use |
| End of day | Close | None |

Record each relevant prep, service or use event separately. Do not infer service counts or times from staff shifts, role names or the device clock. The current application has no authoritative cleaning-service timetable. Explain that event checks must be added as work occurs. A zero-event task must not show as completed, and recorded-event progress must not claim complete coverage of unknown events.

Fixed checkpoints are derived from task revisions in memory. Explicit event records have stable slot identifiers. A completion applies only to that revision, operational date and slot. New weeks do not copy previous ticks. Non-scheduled week cells are labelled and excluded from work totals.

## One reading of a day

One file decides how a cleaning day reads: `js/cleaning-core.js` (24 November 2026). It holds whether a job is due (its weekdays, its revision's dates, and its repeat from a real anchor date), each planned job's checks that day (the fixed ones its timing gives, then each one recorded, then any a phone has not saved), their counts, and how a finished day reads: Unable to complete first, then Awaiting Pass check, then Done, then an event job (never Missed), else Missed. A plain job is Done or Missed by its record.

The Cleaning page, the book's cleaning write check (`cleaningDue()` in `js/prep.js`) and the nightly Records count (`scripts/records-core.mjs`) all use it. The page keeps its own words, such as Not sent, Due and To do (`flowState()`). The core is pure: the kitchen clock comes in as an argument, `LK_TIME` on a phone and Queensland time in node. It is lazy and loads with Cleaning, before `js/cleaning.js`; without it the book refuses a cleaning write rather than guess. `firestore.rules` keeps its own check of a due day: change the two together. A change to how a finished day reads bumps `CLEAN_V` in `scripts/records-core.mjs` and the results in `tests/cleaning-core.test.js`.

## Ordered pack down

Use the existing daily view and expand checks inline. Preserve section and numeric step order: Hot larder, then Grill, then Pans. Existing general work stays available. When the pack-down list is present, show the existing after-service floor task once after the pack-down section, with a reminder to finish overhead shelves and frames before the final floor clean. Earlier after-service floor checks remain separate. Do not create a duplicate floor task or change its recurrence.

When today's staff checklist has loaded and includes a pack-down section, **Go to Pack down** beside the check time moves keyboard focus and scrolls to that day's heading. The jump stays within the checklist and leaves its checks, read status and schedule order in place.

Quick check, 22 November 2026. Build the same-page jump. It follows the book’s existing heading links and keeps the one-tap check. In the synthetic staff checklist, built from `2e18f326` with the book’s fonts, 390, 768 and 1280 px retained 5, 8 and 7 complete opening task rows respectively. The 390 px Extra large sample retained 2. One activation brought the 390 px heading from y1,985 to y8. The 44 px control uses ink on paper at 15.9:1. Browser checks cover focus, route and pack-down order. Physical-device behaviour has not been checked.

- Hot larder covers fresh containers, bottles/fridge/shelves/benches, parmie ingredients and tabletop-fridge shutdown, impingers/extensions, fryer shutdown/cleaning, back wall and cryovac.
- Grill covers nightly grill scrubbing, Sunday OZ tank/deep cleaning, two-day drip-tray changes without foil, nightly under-grill cleaning, hot-line shelf/frame before floors, service stickers, screen sanitising, sauce bain-marie pack down, heat-lamp shutdown and the pans double-check, and flat-top cleaning/drying/oiling with its separate nightly drip tray.
- Pans covers fresh containers and labelled mash/rissoles/cob mix, poaching pots, overhead shelves/rack, removing and cooling stove tops, cleaning the stove area while they cool, nightly drip-tray emptying without foil, cleaning cooled stove tops, service stickers, kick-oven shutdown, heat lamps, the area beside the oven and the back of the stove tops.

All pack-down steps use the end-of-day checkpoint. The Sunday deep clean is Sunday only. The head chef explicitly chose **9 November 2026** as the two-day grill drip-tray cycle anchor. It is due on that date, then every two calendar days, including across weeks and years. Do not restart the cycle at import or on Mondays. Client and server enforce the saved interval and anchor as well as weekdays and effective dates. An unset anchor requires setup and never counts as due or completed.

The user supplied the three-minute grill-cleaner step and the ten-minute task estimate. Preserve their distinction: ten minutes is not a cooling rule. Review notes require approved equipment/oil/chemical procedures, maintain the no-foil instructions and explicitly separate grill cleaner from vinegar. Never infer temperatures or chemical mixing instructions.

The broad general tasks and section-specific closing steps may describe related physical work. They remain distinct records unless the chef explicitly revises the programme; ticking one must not silently claim that another task, service or verification was completed.

## Section cleaning (25 November 2026)

The head chef's own weekly, monthly and extra daily jobs for each section are a third built-in list, `sectionClean` in `js/cleaning-schedule.js`, beside the 26 general tasks and the 25 Pack down steps. [The council's brief](cleaning-sections-options/brief.md) holds the designs and the choice (D, in three steps; this is step 1).

- **Only what he said.** A line is in the list only when it has a stated day and neither Pack down nor the general list already holds the job. A line with no day is left for a chef to add in Repeat tasks; never guess one. His drip tray and OZ tank lines differ from the saved Pack down steps and are not loaded: a chef changes those two jobs in Repeat tasks.
- **Explicit load.** **Load section cleaning** in Repeat tasks adds the missing jobs, as the other two lists do: deterministic ids (`clean-template-sc-...`), existing ids skipped, nothing seeded by itself, and a loaded job never rewritten by a later change to the file.
- **A section by id.** Before loading, the chef chooses the kitchen section for each of the four groups. The section with the same name is offered first and can be changed; a group left on Shared kitchen loads as shared. The job is then saved to that section's id, exactly like a job typed in Add cleaning task, so both sit in the same group. Never tie a job to a section by matching names after the load.
- **One job, one owner.** A line the list gives to two sections is one Shared kitchen job that names both in its responsible role, with a procedure note asking a chef to set one section.
- **One tap.** The jobs have no checks, so the box records the job in one tap and the same tap undoes it within the usual two minutes. The words open the method where he gave one; a job with no method shows no Method heading.
- **Monthly.** A monthly job repeats every 28 days from a first date. It loads with none, so it is never due and never counted until a chef sets it. Today and Repeat tasks name each repeat job that still needs a first date; a name opens that job's editor on the date.
- **How often, in words.** A job that is not nightly says how often at the start of its small line: "Every Monday", "Mon, Wed, Fri", "Every 4 weeks", "Every 2 days". This holds for every list, loaded or typed. Only such a line may wrap, so the state at its end is never cut off. A nightly job's line is unchanged.
- **Headings.** A section's own group is headed with its name and ": section clean". The same section's group under the Pack down title keeps its name.
- **Reads.** No new query, listener or rule. Each loaded job is one more task document on every Cleaning open or Refresh: 21 more reads per open per device with the whole list loaded (`tests/read-budget.test.js`, Cleaning).

### Your section first (26 November 2026, step 2)

For a cook, the page opens on the section they are on today: its name, then **Section clean** (its jobs that come round), then **Pack down** (its numbered steps, then its own nightly jobs), with the reminder "Overhead shelves and frames first. Floors are last." Shared kitchen follows, then **Rest of the kitchen**: every other section's clean and Pack down, all open. Floors after shelving stays last. Nothing is folded and no job is hidden.

- **Whose section.** `mySecNow()` in `js/prep.js`: the person's section today by id, from the Today's team plan or their own pick, as `mySec()` already gives by name. No read. Staff and leads only: a head or sous chef has no section and keeps the chef view.
- **Worked out when the list is read.** The page fixes the leading section at open, on Refresh and after a reload that follows a save, never on a redraw, so a list cannot reorder under a thumb. A cook moved mid-shift sees the new section after Refresh. A new person on a shared screen starts a new read.
- **When it applies.** Only when that section has work due that day. A cook with no section, or on a section with no cleaning list, keeps the usual order: section clean groups, Shared kitchen, the Pack down block, floors.
- **Which Pack down belongs to a section.** Never by name. A Pack down group is tied to the kitchen section a chef chose for that group's section cleaning jobs at Load (`packLinks()` in `js/cleaning.js`: the `sc-hot-`, `sc-grill-` and `sc-pans-` jobs), and only while every one of those jobs in force is saved to the same live section. One job moved to another section, the group left on Shared kitchen, or the section removed: no link, and that Pack down sits with the rest under its own name. A renamed section keeps its link, because the link is its id. Repeat tasks says which section each Pack down opens with, and which is not tied.
- **One place per job, whoever is looking.** Where a Pack down group is tied to a section, that section's own nightly jobs follow its numbered steps in both layouts, so the kick oven door is wiped after the oven is turned off, and "section clean" holds the jobs that come round. Where none is tied, they stay under the section's own heading.
- **Go to Pack down** moves to the leading section's Pack down.
- **Reads.** None added: the link and the section come from what the page and the phone already hold.

Step 3 (This screen's section on a shared kitchen screen) is not built.

## Completion and accountability

Legacy jobs retain their existing one-tap tick and recorder-only two-minute Undo. Enhanced jobs use inline details for instructions and saved checks. Their states are pending, blocked, awaiting Pass verification and complete.

- Required checks come from the saved task revision. Both client and server refuse performance with missing checks.
- Saving checks does not complete the occurrence. Unsaved checkbox edits remain visibly unsaved and participate in the existing work-recovery guard.
- Unable-to-complete needs a reason and remains incomplete. Optional Not applicable and additional filters are outside this unit.
- Food covering and labelling separates performance from Pass verification. Only explicitly configured eligible staff IDs can verify. Role text does not grant that authority; no configuration means verification is unavailable.
- A personal device records its own cleaner. Shared screens retain the existing worker picker and authenticated recorder.
- Reopening and correction preserve the immutable action trail. Pending writes and failed saves never appear as confirmed completion.
- Compare-and-set versions reject stale concurrent actions. Every enhanced state write and its immutable `cleaningActions` snapshot are atomic. The server stamps accepted actions.

`cleaningActions.at` is the authoritative server-recorded acceptance time for performance, verification and correction. The current-state `doneAt` and `flow.verifiedAt` retain the application's numeric, server-synchronised kitchen-clock values and its server-validated time window for compatible display and Undo. They are not separately generated Firestore timestamps.

An explicit retry after an uncertain acknowledgement checks the named occurrence before replaying anything. If a later version already exists, it also checks the exact attempted audit snapshot. Failed reconciliation keeps the attempt and unsaved checks. Normal successful actions add no client read.

Keep existing session expiry, identity-bound recovery, release gating, today-only staff reads and capability checks. No private persistent cache, listener or polling is added.

### Feedback while an action is waiting

The button pressed in a procedure reports its own pending action. **Save checks** says **Saving checks...** and **Record done** still requires every check. **Record done** says **Recording...** and the assigned checker's **Verify Pass check** says **Saving Pass check...**. The selected occurrence says **Not sent** while the other occurrences keep their own status. The task keeps its existing guard against repeat submissions. When a shared screen asks who did the work, the picker keeps its own recording feedback.

After acknowledgement, the existing confirmation names the job. A refused write keeps the checks and note, shows the error beside the occurrence and makes the existing action available for retry.

Verdict: Not needed (bug fix). The approved controls and steps remain in their existing procedure. This follows [After the tap](action-feedback.md#the-rule), with the same data, permissions and reads.

In the complete app with the kitchen fonts and synthetic checks at 390 and 1280 px, the action buttons kept their original positions and sizes while Save checks was held. The Save and Record targets were both 48 px high. `tests/cleaning-feedback.test.js` checks required-check gating, pending Save, Record and Pass feedback, a repeated dispatch during the wait, refusal and explicit retry, and preservation of the original cleaner.

## Temperature reminder

Show: **Temperature logs must be completed first thing in the morning and before dinner service.**

There is no matching morning/pre-dinner equipment-temperature log in this application. Show that the log connection is not configured. Delivery arrival temperatures and the cooling timer do not establish that these logs were filled in. Do not fabricate readings, statuses, thresholds or a destination link.

## Procedure review

Retain the supplied method and responsibility text without turning shorthand into an invented procedure. Equipment, chemicals, oil handling and food cooling use approved kitchen procedures. Review notes flag ambiguous instructions.

The chemical-room recurrence is Monday, Wednesday and Friday, but its method mentions fresh sanitiser daily. Keep that discrepancy visible until the chef resolves the daily requirement. The ordering contact is local configuration. “Senior chefs x 3” does not imply three signatures. KP, CDPS and Supper chef remain responsibility wording until the kitchen defines their local meaning.

## Council and interaction contract

**Verdict: Build smaller, five of five role-based reviewers.** The cook, head chef, skeptic, new starter and keeper independently favoured extending the existing list. They recommended inline instructions, meaningful required checks, explicit event coverage and no optional filters or Not applicable workflow. They did not constitute research with actual staff.

The existing C + A direction and the user's instruction to retain the current page settle the layout. This implementation reuses that chosen design rather than adding a new design decision. Ordinary legacy jobs retain their existing single tap. Required-check jobs necessarily add disclosure, check selection and confirmed recording; measure those steps and the phone rows before delivery.

The native-font comparison at 390 by 844 retains seven complete daily rows before and after; 1280 px retains eight. Simple personal-device recording remains one tap. A checked job takes one disclosure, its required check taps and Record done; a new repeat adds an explicit event first. Shared screens retain the existing worker choice. Fallback-font measurements are recorded separately and show six current rows against seven earlier rows on the phone. Do not compare those fallback metrics with the native-font baseline.

[Native-font measurements](cleaning-options/schedule/native-font-measurements.json), [phone pack down](cleaning-options/schedule/native-packdown-390.png), [expanded phone checks](cleaning-options/schedule/native-packdown-checks-390.png) and [desktop pack down](cleaning-options/schedule/native-packdown-1280.png) use synthetic identities and the existing Barlow, Barlow Condensed and Caveat faces. The faces were explicitly loaded only for visual verification; no application font or domain was added. Collapsed and expanded checks have no horizontal overflow, measured targets are at least 44 px and no browser errors were observed. Fallback 768 px coverage remains in the accompanying measurements. This is not a formal screen-reader certification.

Every new action answers where it occurs: import reports added/skipped counts; saved checks name the job; pending recording remains Not sent; blocked and awaiting states use words; acknowledged completion shows cleaner/time; errors remain visible and preserve the draft. The existing shared-worker picker is reused, with no additional automatic overlay.

## Reads, backups and release

Normal open/Refresh retains two bounded server queries: relevant task revisions, capped at 501, and daily or chef-week occurrence states, capped at 2001. Overflow fails visibly. Explicit import adds one bounded all-revision query, a single atomic missing-template batch, then the normal two-query reload. No per-task read loop is introduced.

Audit writes do not add audit reads to daily or week views. Manual backup includes task revisions, occurrence states and immutable actions. Nightly backup retains all revisions and the occurrence/action records within its selected day window. Recovery tests must cover the added collection. Kitchen-PIN moves keep their existing refusal when cleaning history needs a reviewed copy procedure.

Rules expand the accepted enhanced schema and add immutable action writes while retaining legacy compatibility. Publish compatible additive rules before a client writes the new shapes. Rules publication, production flag enablement and live verification are separate from local validation and must be reported accurately.

## Acceptance and verification

- Exactly 26 unique built-in drafts and the baseline weekday counts above.
- Exactly 25 ordered pack-down drafts, imported without duplicating either schedule; no duplicate floor task.
- Sunday deep cleaning remains Sunday only; the anchored two-day cycle continues across week/year boundaries and refuses intervening-day completion.
- Repeated import, concurrent attempts and archived roots do not create duplicate operational jobs or replace history.
- Distinct service, prep and use checks remain independent.
- Persisted required checks and Pass authorisation cannot be bypassed through direct writes.
- Blocked work and awaiting verification remain incomplete; unknown event coverage is explicit.
- Confirmed state survives refresh; pending and failed saves are distinguishable.
- Historical revisions and actions remain immutable.
- Release-off, canonical roles, shared attribution and device work recovery remain intact.
- No other venue's name, company branding or source label appears in the feature.
- No fabricated temperature-log integration.
- Mobile, keyboard, safe-text, bounded reads and backup recovery checks pass.

Browser verification passes: the new cleaning-schedule suite has 110 assertions, existing Cleaning 114, team release 94, navigation 26 and safe text 64. Read budget, roles, private access, context teardown, typed-work retention and device lock/recovery checks also pass. Six initial navigation load timeouts passed their single serial retry. A prior-date unsaved-check regression fails against the earlier module and passes with the fix; no past write is used to resolve it. The final schedule suite passed again after client recurrence was delegated to the shared bridge.

Database verification and production publication are recorded separately below. Local tests do not imply that the feature or its rules are live.

The complete 18-file Firestore/Auth emulator suite passed. Cleaning passed 738 real-rule checks. The actual client matrix passed 255 call shapes, 2,295 calls across nine sign-ins. The maximum supported 12-check plan with mapped verification and anchored recurrence passed create, revision and archive checks. Multiline methods/review and invalid-type rejection also passed. The synthetic backup recovery round trip preserved all 68 included documents, including an enhanced occurrence and its exact immutable action snapshot. Syntax and whitespace checks passed.

After reconciling the current team and supplier changes, all six focused Cleaning, navigation, release, read-budget and design-pattern suites passed on the combined branch. Database rules were unchanged by that integration.

Independent read-only review found no remaining material authorisation or audit bypass. Task ordering is a clear working sequence with per-task checks; it is not a global cross-task lock that could prevent an earlier after-service floor clean.

At implementation handoff, no production rules had been dispatched, no live task programme had been imported and the team release switch had not been enabled. The owner subsequently requested release. The compatible additive rules must be published before the client is released; required CI and production verification remain distinct release steps, with evidence recorded in PR #637. Schedule import, Pass-checker selection and the verified owner's team switch remain explicit setup actions.
