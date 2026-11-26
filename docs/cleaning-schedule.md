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

## What the nightly count keeps

Results by section, step 1 of 4 (head chef, 26 November 2026, [brief](cleaning-tracking-options/brief.md)). The 03:00 job counts each finished day with `cleanDay()` in `scripts/records-core.mjs` (`CLEAN_V` 2) and keeps the count on that day's row of `analysis/dashboard`, which only the admin reads.

- **When counting starts.** A day is counted from the day the nightly run first finds Cleaning switched on for the team (`config/main` `staffSee.cleaning`). That day is kept as `cleanFrom` in `analysis/current` and on the board, and cleared while Cleaning is off. The run sees the switch once, at 03:00, so the day Cleaning was switched on is not counted and the next one is. Every other day is `{ cv, nc: 1 }`: Records says "Cleaning: not counted". Jobs loaded before switch-on never read as missed. A counted day stays counted.
- **Weekly and monthly jobs, one by one.** A job that comes round weekly or monthly is the one whose row says how often: some weekdays but not all, or a repeat of whole weeks (`round()` in `js/cleaning-core.js`, checked against `rhythm()` in `js/cleaning.js`). A nightly job is not, nor is a repeat every 2 days. Weekly Pack down steps are: today that is one, the Sunday grill and OZ tank deep clean, and it is saved as a shared job, so it is kept with no section. With all three lists loaded, 23 of the 72 jobs are weekly or monthly. Each one due that day is kept in `r` under its root id, so a job that was moved keeps one history: its section id and name, done, missed, unable or awaiting, and for a done job who did it and when. At most 40 a day; `rN` and `rn` hold the whole counts. Unable to complete is apart from `rn.due`.
- **Who was on.** For a section with a missed weekly or monthly job, `ro` keeps who was on that section that day as facts with their source: the chef's plan or a cook's own pick, each with its shift, matched by section id. It says listed, nobody, or not kept (the run reads 8 weeks of plans and 30 days of picks). A pick record marked `auto` with no log is the plan's own section copied to the phone, so it is skipped and nobody is listed twice. The job does not decide who closed. A shared job has no section, so nobody is listed.
- **Nightly jobs** stay in the whole-day counts (due, done, missed, with up to 8 names), as before.
- **Size.** If the board would pass 600,000 bytes the one-by-one detail is dropped, oldest days first (`cut`, `fitClean()`), and the whole counts stay. A trimmed day is carried as counted, so its detail does not come back. With the three lists loaded, nothing ticked for 90 days and 12 people listed on every section, the detail is about 128,000 bytes (`tests/records-core.test.js`). The cleaning count never stops the rest of the nightly publish.

## Weights and days

Results by section, step 3 of 4 (head chef, 26 November 2026, [brief](cleaning-tracking-options/brief.md)). A weight says how long a weekly or monthly job takes at close: light, medium or heavy. The chef who sets up the jobs gives it ("let the chef creating the tasks set a ranking system ... from light time cost to heavy time cost in 3 steps"). Step 4 uses the weights to suggest days.

- **Which jobs.** Every weekly and monthly job, the ones whose row says how often (`round()` in `js/cleaning-core.js`, the same as the nightly count): 23 with the three built-in lists loaded. Nightly jobs and the numbered Pack down steps are not there.
- **Where.** Repeat tasks has one line in the attention look: "21 weekly and monthly jobs have no weight yet", with the link Weights and days. Once every job has one, the line says so and keeps the link. The list is one view inside Repeat tasks: each job as a row by section, Shared kitchen last, with its handwritten name, how often it comes round, three chips (Light, Medium, Heavy) and an optional kind from a short list (Shelves, Fridges, Behind equipment, Floors, Drawers, Equipment). All and No weight above the list.
- **Saving.** A chip or a kind changes nothing else on the page, so no row moves under the thumb. The Save bar (the book's docked frame, above the phone tab bar) says how many jobs are not saved, with Undo changes and Save. One Save is one merged write of only the jobs changed, so another chef's weights stay; a map is sent only when it holds a change, because an empty map in a merged save would replace the stored one. Putting a kind back to none is a change, saved as none. It answers Saved with the time, or says it was refused and nothing was saved, keeping the changes on screen. Unsaved weights are the page's work: they count as unsent and go with a lock or a handover. Back, Today, Week or Repeat tasks with unsaved weights says "Save your weight changes, or Undo changes, before leaving" and stays. Refresh keeps the list and its unsaved changes on screen while it reads the weights again.
- **Where they are kept.** One record, `cleaningPlan/main`: `w` (root id to 1, 2 or 3), `k` (root id to a kind) and, from step 4, `d` (what each weekday takes). Keyed by the job's root id, so a job moved to another day keeps its weight. Only the head chef and the sous chefs read and write it, whether or not Cleaning is switched on; staff never read it. The rules bound each map's size and check `d` whole; they cannot check every entry, so the page reads only the values it knows. Read once when a chef opens Repeat tasks, and on Refresh (1 read). A refused or failed read never shows as "no weight yet": the line says the weights could not be read, and the list offers Try again with nothing to save.
- **Backup.** In the nightly backup and the owner's backup. Moving the kitchen PIN is refused for a kitchen that has it, as for its cleaning history.

### What each day takes

Step 4a (head chef, 26 November 2026: "let the admin decide which days are heavy load days and learn then based on what days we have more staff on"). Each weekday takes jobs up to light, medium or heavy. Step 4b uses it to suggest days.

- **Where.** A fold at the top of Weights and days, What each day takes, closed until asked for, with one line under it: "Heavy: Mon, Wed, Thu, Sun. Medium: Tue. Light: Fri, Sat." Until the days are saved the fold says "(not saved yet)" and the page shows the starting days, his for Leichhardt: Sunday, Monday, Wednesday and Thursday heavy, Tuesday medium, Friday and Saturday light.
- **Who.** The chefs who set the weights, each venue its own: the head chef, the sous chefs and the admin ("admin, headchef or sous chef of that venue, they will know best when their busy days are"). Each sees a row a day, Monday first, with Light, Medium and Heavy. Friday and Saturday are fixed at light ("Light only"). Staff never see Weights and days. A save of weights leaves the days as they were, and a save of the days leaves the weights.
- **The suggestion.** Opening the fold reads the team count once (`cleaningStaffing()`: `teamsum/main`, the last 30 days of the closing plans and the cooks' own picks, written each night; no read when the page already holds today's). Each Sunday to Thursday says "About 6 on" from the distinct people each day, averaged by weekday and shown whole, and a suggestion: as many people as the middle day or more, heavy; fewer, medium. A day with fewer than three counted days says "Not enough weeks yet". A count older than yesterday says "The team count is not up to date", none says "No team count yet", a failed read says "Could not read the team": none of them suggests. Use the suggestions fills the chips; nothing is saved by it.
- **Saving.** Save the days sends all seven, Sunday first, in the same merged write as the weights, so the weights stay. It is on before the first save, so he can keep his days as they are. It answers Saved with the time, or says it was refused and keeps the change on screen. Unsaved days are the page's work like unsaved weights: Back, Today, Week or Repeat tasks says "Save the days, or Undo, before leaving" and stays.

### Suggest the days

Step 4b (head chef, 26 November 2026, the council's `m3` and `m4`). The book suggests a day for each weekly and monthly job, in bulk, only while Cleaning is off for the team (`config/main` `staffSee.cleaning` not true). After switch-on the line says the book no longer suggests days in bulk, and a job's day changes in Repeat tasks, one at a time.

- **Who.** The chefs who set the weights: the head chef, the sous chefs and the admin. Under What each day takes: "Suggest the days". It is off, with "Save the weights and the days first", while a weight or a day is not saved: it plans from the saved weights and the saved days only (his starting days when none are saved).
- **The planner.** `js/cleaning-plan.js`, lazy: loaded by `js/cleaning.js` on the press, never in the saved shell. Pure, no reads, no clock of its own. Fewest moves, as the council drew it (`m3`): a job on 1 to 3 weekdays keeps its day unless that day breaks a rule that is on, or a move makes its section's heaviest night lighter (one job at a time, each with Keep); a job on 4 to 6 weekdays only counts toward its days; a monthly job with a first date stays on that weekday, one with no first date yet gets a weekday, a week and a first date from tomorrow, and Pick a date on its row sets one by hand (from tomorrow; the picked date is his). Planning again after a save moves nothing. A job with no weight is never planned: the summary says how many and offers "Weigh them first" (the No weight list). The book never guesses a weight.
- **His rules and the lead's.** His: each day's level, Friday and Saturday light only and at most a tenth of the week, jobs of one kind across sections on one day. The lead's two, shown as chips he can drop ("Suggested rules, yours to keep or drop"): no section gets two heavy jobs on one night (moves a dated job), and a section's night over 5 points is too heavy (keeps jobs of one kind off such a night; never moves a dated job). Both start on; dropping one plans the days again. The summary names in words what the plan still breaks (`check()`): a night over 5 points, a job left on a day that does not take it.
- **The changes.** A summary in the attention look ("The book suggests 4 changes"), then the Changes chip beside All and No weight, with each change in its row: the job, its section, rhythm and weight, the new day and the old ("Wednesday, was Tuesday"), or a monthly job's first date ("Wednesday 9 December, then every 4 weeks"), and the reason, the broken rule first ("Tuesday takes up to medium jobs, ..."). Keep the old day, only where the old day breaks no day's level, and Another day (that day is not offered again for that job). Each plans the rest again. A job with no day that fits, or one kept, has its own row with Suggest again. Nothing moves until Save.
- **Saving.** "Save 4 days" in the docked Save bar. Each job is a new revision through the replace path (`cleaningMoves()` in `js/prep.js`, bridge `moveTasks`): root kept, the old revision closed tonight, the new one from tomorrow. 5 jobs (10 writes) in one batch, batches one after another. The emulator allows 8 jobs in one batch and refuses 9. A batch lands whole or not at all. Each row says Saved with the time and "Starts tomorrow", Waiting to send, Not sent (the choice is kept on this phone) or Refused (in failure ink, with what to do). A refused batch is tried one job at a time, so the others still save. A lost answer stops the batches after it; Send the rest first reads each new revision it sent from the server (at most 5 reads, on the tap) and counts one that landed as Saved, so no job is saved twice. The page re-reading the jobs between tries counts a landed move as Saved too. Cleaning switched on before Save, a lapsed PIN session or a new day stop the save in words.
- **Unsent work.** An unsaved suggestion is the page's work: Back, Today, Week or Repeat tasks says "Save the days, or Drop the suggestion, before leaving" and stays. A changed weight or day drops the suggestion in words, and so does Refresh.
- **Rules.** No change: a chef could already move a job by hand. `tests/rules/cleaning.test.mjs` runs 5 real replacements in one batch (a job with checks and a monthly first date among them), a sous chef's batch, staff refused, a batch with one job already moved elsewhere refused whole, and a second move of one job on the same day.

## What the admin sees of it

Results by section, step 2 of 4 (head chef, 26 November 2026, [brief](cleaning-tracking-options/brief.md)). Both pages read only the board they already hold (`analysis/dashboard`, admin only): no new read.

- **The Inbox** has one row for last night when a weekly or monthly job was missed (`cleanNeed()` in `js/admin-dashboard.js`): the tag Missed, the sections by their name now and their jobs, the date, "(also missed Wed 18 Nov)" when the same job was missed on an earlier counted night, and a quiet button, Open that night. It names no person: the dashboard file does not even copy who did a job or who was on (`cleanCount()`).
- **It says only what the count knows.** Nothing while Cleaning is not switched on, for a day the count does not cover, or for an older count. "Not counted yet" when the nightly run has not reached last night. A number with no sections when the jobs were not kept one by one. When nothing was missed, the all clear line adds last night's weekly and monthly cleaning.
- **Records, that night.** Under the day's own cleaning lines, which are unchanged, comes **Weekly and monthly jobs, by section** (`recCleanSecs()` in `js/prep.js`). A section with a miss is first, as an attention block; in it the miss first, "Not ticked by midnight", with when that job was missed before and when it was last done. Then the section's other jobs: done with its time, not possible with its note, awaiting Pass check. Sections that finished follow as plain lines. Shared kitchen has a line. No person's name is on the face of the page.
- **Names are behind a fold**, closed until asked for, and it stays open when the day is drawn again. On a section with a miss it is "Who was on Hot larder": who was on the plan and who picked the section themselves, each with the shift's name, or that nobody was, or that the plan or the picks were not kept for that day; then who did the section's jobs and who last did the missed one. On a section that finished it is "Who did Grill's jobs". A shift or section no longer on the list is said in words, never as an id.
- **The way in.** The Inbox button opens Records on that night and lands on the block's heading (`api.openRecords`, `recJump()`). A dashboard file newer than the saved shell finds no such method and draws no button.
- **Names stay on screen.** Print and Export CSV are unchanged: they are built from Records' own cleaning lines (`recCleanLines()`), which hold no names. Print this day is checked for it in `tests/cleaning-results.test.js`.
- **Not done here:** the Sunday grill and OZ tank deep clean is saved as a shared job, so it shows under Shared kitchen.

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

- **Whose section.** `mySecNow()` in `js/prep.js`: the person's section today by id, from the Today's team plan or their own pick, as `mySec()` already gives by name. No read. Staff and leads only: a head or sous chef has no section and keeps the grouped chef view, where section jobs stay under General cleaning. To see the cook's page, sign in as a cook with a section.
- **Worked out when the list is read.** The page fixes the leading section at open, on Refresh and after a reload that follows a save, so a list cannot reorder under a thumb. A cook moved mid-shift sees the new section after Refresh. A new person on a shared screen starts a new read. One exception: when no section was known at the read and one becomes known (the cook answers Your section today, or the Today's team plan arrives), the page takes it once, and not while a tick is sending.
- **When it applies.** Only when that section has work due that day. A cook with no section, or on a section with no cleaning list, keeps the usual order: section clean groups, Shared kitchen, the Pack down block, floors.
- **Which Pack down belongs to a section.** Never by name. A Pack down group is tied to the kitchen section a chef chose for that group's section cleaning jobs at Load (`packLinks()` in `js/cleaning.js`: the `sc-hot-`, `sc-grill-` and `sc-pans-` jobs), and only while every one of those jobs in force is saved to the same live section. One job moved to another section, the group left on Shared kitchen, or the section removed: no link, and that Pack down sits with the rest under its own name. A renamed section keeps its link, because the link is its id. Repeat tasks says which section each Pack down opens with, and which is not tied.
- **One place per job on the staff page.** Where a Pack down group is tied to a section, that section's own nightly jobs follow its numbered steps in both staff layouts, so the kick oven door is wiped after the oven is turned off, and "section clean" holds the jobs that come round. Where none is tied, they stay under the section's own heading.
- **Go to Pack down** moves to the leading section's Pack down.
- **Reads.** None added: the link and the section come from what the page and the phone already hold.

### This screen's section (26 November 2026, step 3)

A shared kitchen screen can be given one kitchen section, so the screen at a station opens Cleaning on that station's section for every cook who signs in there.

- **Where it is set.** Settings on that screen, **This screen's section**, under How this device is used. The row shows on a shared kitchen screen once someone is signed in and the kitchen has sections. Only the head chef changes it (`canChangeDevice()`, the same gate as the screen's type); everyone else reads it.
- **Where it is kept.** In the device's own record, `lk.device.v2`, as `sec`: a section id, checked by type and honoured only in shared mode (`LK_DEVICE.section()`). It goes with Forget this device and with a change of device type. No Firestore read, write or rule.
- **Not an access change.** Setting it signs nobody out, runs no owner check and leaves unsent work alone. It is announced with its own event, `lk-device-section`, not the access event, in this tab and in any other tab open on the same device (a change of the section alone never fires `lk-device`). A refused change says why: not the head chef on a shared screen now, a section no longer on the list, or the screen could not remember it.
- **Not the person's section.** It never answers Your section today, feeds `mySec()` or writes `shifts/`. Prep and wastage lines still go under each person's own section.
- **What a cook sees.** The screen's section leads, with "This screen" beside its name. When the cook signed in is on another section, the words add "You are on Pans today", and Go to Pack down names the Pack down group tied to their section ("Go to Pans pack down": the group's own fixed name, the same as its heading, not the section's name) and moves there. The rest of the kitchen stays open below. The words and the link follow the cook's section as it is now, on every draw, because they move nothing; the order stays as it was when the list was read.
- **No cleaning for that section today**, or a section taken off the kitchen's list (before the page opened or while it is open): the cook's own section leads, as on a screen with none set. A renamed section keeps leading under its name now.
- **Chefs.** A head or sous chef keeps the grouped chef view on any screen.
- **The screen's rules are unchanged.** It still needs a PIN, locks after 10 idle minutes and at 04:00, and each tick asks who did it.

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
