# Cleaning: its name and its look. Council brief

26 November 2026. The head chef asked to "brainstorm name and design again" once every cleaning step was built (25 November), then chose to run the full council (26 November: "Run the council"). Every step is now on `main` (#880, #881, #884, #890, #894, #898, #901, #905, #907). The council advises; the head chef decides. Nothing in the app changes until he chooses.

Source commit `a187cd63`. Role-based analysis by fresh agents, not research with staff. Measurements are **Preview of the implemented app**: the click-test stand-in with the real page, shell, top bar and tab bar, the head chef's real lists loaded under four made-up sections, made-up people (Ann the cook, Sam the head chef), Wednesday 2 December 2026, the book's own fonts. Proposal: [proposal.md](proposal.md). Packet: [round1-packet.md](round1-packet.md). Today's page: [baseline/](baseline/) (`baseline.json`, script [designs/baseline.cjs](designs/baseline.cjs)).

## Round 1: should we change it?

Five fresh reviewers (`opus`), the same proposal, packet and pictures.

| Reviewer | (a) The name | (b) The look | Their one change |
| --- | --- | --- | --- |
| Cook mid-service | Your call, slight lean to Clean down | Build smaller | My section's Pack down heading and its count first; the frame down to one quiet line |
| Head chef | Build smaller: Clean down, on the tab and the page title only | Build smaller | Cut everything above the first tick to one line |
| Skeptic | Don't build: keep Cleaning | Build smaller: cut the header, leave the order | Drop the coverage hint for staff, fold the temperature link into the read line |
| New starter | Your call: keep Cleaning, or Clean down | Build smaller | Everything that is not a job goes below the jobs; "0 of 9 done on your section" |
| Keeper of the book | Build smaller: the words people see only, route and id stay | Build smaller: trim the frame, not the list | Make the new layout work with both the old and the new saved shell |

**Verdict, the look: Build smaller (5 of 5).** Change the cook's page only (phone, tablet, section screen). Cut the frame above the first job; keep the order chosen on 25 November (your section first, nothing hidden). Leave the chef's Week and Repeat tasks alone: they are used a few times a week, and their two notices go once setup is done (skeptic).

**Verdict, the name: Your call.** Two say build smaller (Clean down, head chef; any name, keeper), two leave it to him (cook leaning Clean down, new starter: Cleaning or Clean down), one says keep Cleaning (skeptic). The trade-off in one line: a name that sounds like the kitchen against one plain word that already appears on about 50 lines the team reads. The field narrowed to two: **Cleaning** or **Clean down**. Rejected by the reviewers who named them: Close, Closing, Reset (read like closing the app or a sheet; "Close" is on every sheet's button), Close down, Night clean, Knock off (the page also holds the morning temperature logs and jobs after each service), Wrap up (slang, and it clashes with the rows "Wrap and label..."), Shine (vague), Checklist (any list).

If he renames, the keeper and the skeptic disagree on how far: the keeper would change only the tab, the Home docket, the page title and the window title (4 to 6 strings in `js/app.js`), keeping `#/cleaning`, its id and "cleaning" as the word for the work in Records, the Inbox and Settings; the skeptic says that gives one thing two names, and asks for every string the team sees in one pull request, with a test that the tab, the title and the admin switch say the same word.

### What round 1 found that the proposal did not say

- **The cost line was wrong** (keeper, checked). Cleaning's look lives in `css/app.css`, a saved-shell file (241 `.cln-` lines), not only in the lazy `js/cleaning.js`. So any new look reaches every phone as an update, and an old saved copy can meet the new page (break-it K1).
- **A rename drops a joke on 1 April** (keeper, checked): `js/fools.js` maps the tab by its label (`Cleaning: 'Screaming'`).
- **The route must stay** `#/cleaning` (keeper): `parseRoute`, bookmarks, the launch address, tutorial storyboards and 27 test files know it.
- **Facts said twice** (cook): every row under the Grill heading says "Grill · To do" again (design miss, 10 November).
- **A Pans cook at the Grill screen** (new starter, skeptic): "This screen. You are on Pans today" is small text at the far right of the 1920 heading; the cook's own list is a small link.

### Break-it findings, round 1

| # | Scenario (role, state) | Expected | Observed or hypothesis | Evidence | Smallest repair or check | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | A cook partway through a section ticks, the tick is acknowledged, or Undo (phone, section screen) | The next box stays under the thumb | `draw()` redraws the whole list on each; a design that folds a finished group, sinks done rows or changes a heading's height would move the next box | Risk / Not evidenced (source read) | Measure the next box's y before and after a tick, its acknowledgement and Undo, on a group's last row, at 390 and 1920 | Into round 2: no design may move rows on a tick |
| S2 | Ann on Pans, signed in at the Grill section screen | She sees and does her own Pack down | The screen leads with Grill's 9 rows; "You are on Pans today" is small at x 1350; her list is a small link | Layout checked in the baseline fixture (`station-1920-pans-cook.png`); a wrong tick is Risk | The cook's own section next to the heading, readable from the bench; test with the same fixture | Into round 2 |
| S3 | A rename, phones mid-update and after | One name | The tab is in the saved shell, the page title in the lazy file: an old phone can show both names; the admin, Inbox and Records keep "Cleaning" | Risk / Not evidenced | If renamed: one pull request for every string the team sees, and a test that they agree | For the head chef with the name |
| K1 | A phone not yet updated opens the new page (or a new shell meets the old saved page in the cool room) | The page opens, styled | `js/cleaning.js` is saved under its plain address whatever its `?v=` (`sw.js`), so new JS can meet old `css/app.css` | Risk / Not evidenced (source read) | New styles in new `.cln-` rules that the old page ignores; one `tests/saved-copy.test.js` case with the old shell and the new lazy file | Into the build plan |
| K2 | A fold or reorder with unsent work (unsaved checks, Not sent, a refused tick) | Unsent work stays in sight | A closed fold could hide it; Go to Pack down and the Inbox jump would land on a hidden heading | Checked in source only | Any fold opens on unsent work and on a jump; extend `tests/cleaning-schedule.test.js` and `tests/cleaning-sections.test.js` | Into round 2: a fold is also a change to an approved rule |
| K3 | Who did this on the section screen in a new layout, a double tap while the write is held | One sheet, nothing redraws under it | Not tried | Risk / Not evidenced | `tests/cleaning-feedback.test.js` at 1920, double tap while held | Into the build plan |

### Contract fit, round 1

- **No violation in today's page.** The second tap on a section screen is the approved "each tick asks who did it" rule (shared screens). Changing it is a rule change for the head chef, not a fix (cook, head chef, skeptic).
- **Proposed changes to approved rules, for the head chef:** a rename (26 November: "keeps its name for now"); any fold on the staff page ("Nothing is folded", step 2, 26 November, and the 25 November rejection of closed rows, 5 of 6).
- **Not evidenced:** done, Not sent, refused and Undo rows; Extra large text; the Functions fold on a function night above the list; reading the section screen from the bench (only a stand-in picture).

### Reference fit, round 1

- **Linear** (the work above the frame): every reviewer's main point. About 240 px of title, read line, temperature link and coverage hint come before the first box at 390 px.
- **Headspace** (one calm name, plain words): argued both ways. For Cleaning (the skeptic, the new starter: a word every starter knows) and for Clean down (the head chef, the cook: the word cooks say). Plain words for "0/50 recorded; repeats apply" and "repeat coverage is not configured": everyone.
- **Things 3** (today against occasional): the section clean and weekly jobs against the nightly Pack down; no reviewer wanted them hidden.
- **Duolingo** (progress that is real): "0 of 9 done on your section" before "0/50" (new starter, cook).
- **Rejected:** a new layout for the chef's Week or Repeat tasks (skeptic, head chef: rare use).

## Still his to answer from the list

Carried from `docs/open-work.md` item 5. The council does not answer these; the designs do not depend on them.

1. **The 12 lines with no day** (Grill 8, 9, 11; Pans 7, 9; Fryers 2, 3, 4, 13; Hot larder 6, 12; for everyone: the outside area and the takeaway containers). Which day each, or leave them out? Until then they are not loaded.
2. **The drip tray and the OZ tank.** His list says the drip tray every night and the OZ tank twice a week; the saved Pack down steps say every 2 days from 9 November and Sunday only. Which is right? A chef changes the saved step in Repeat tasks; no second job is loaded beside it.
3. **A missed weekly or monthly job.** Does it stay due the next day, or wait for its next turn (next week, or 28 days)? Today it waits. Staying due changes the recurrence and the rules.
4. **A Fryers cook's Pack down.** Which Pack down does a cook on Fryers do, and is "Fryers, salads and dessert" one cleaning list? Today no Pack down is tied to Fryers, so a Fryers cook sees their section clean first and every Pack down under Rest of the kitchen.

## Round 2: the design frame

Written before anything was drawn by a fresh UX and interaction designer (`opus`), from the round 1 record, the packet and the baseline. Kept as given, lightly shortened.

1. **Must stay visible on a 390 px phone, no tap:** the cook's section name and its own count ("0 of 9"), the Pack down reminder "Overhead shelves and frames first. Floors are last.", and at least 5 complete job rows with their boxes (today: first box at 454 px, 5 rows). The temperature wording in some form, but not ahead of the jobs. The Functions fold stays one 50 px line on a routine day. The busiest day (a function warning open, Extra large text) is Not evidenced.
2. **Loudness budget:** one loud thing: a tick that is Not sent, refused, or has unsaved checks. Missing it, a cook leaves thinking a job is recorded when it is not. Today the loudest thing is the orange handwritten "0/50", and missing it costs nothing: it goes quiet. The temperature line is a standing reminder at close, not a deadline: quiet.
3. **Devices:** phone, the design width, one column, jobs start high. Tablet (768): more rows, nothing else, same order. Section screen (1920, touch): use the 340 px of empty space each side, or the full width, to show where the cook stands; from the bench a cook reads their own section's name and count and whose list leads ("This screen: Grill. You: Pans"), never small text at x 1350; bench reading Not evidenced. Laptop: chef views out of scope. The tick never moves between devices.
4. **Placements:**
   - Title and 0/50: (a) one line with the cook's section count first; (b) the kitchen count in the Rest of the kitchen heading, said once where it applies.
   - Read line: (a) merged into the title line (about 44 px back); (b) as it is. No fold: Go to Pack down is a jump.
   - Temperature reminder: (a) one quiet inline line, the contract words in full; (b) a link in the read line (risks "must be shown"); (c) below the cook's own section (same question).
   - Coverage hint: (a) removed for staff; (b) under Shared kitchen, beside the jobs it describes; (c) a fold (breaks "nothing folded": the head chef's call).
   - Own section and Pack down: first, inline. A section screen with a cook from another section: (a) the cook's own Pack down leads (against the order fixed at read); (b) a large two-name heading with a 44 px jump.
   - Shared kitchen, Rest, Floors: inline and open (25 November). Folding is a rule change for the head chef.
   - A row's small line: drop the section name when it repeats the heading; keep the state and how often.
   - Who did this: the approved sheet stays (not a new pop-up). Removing it is a rule change.
   - Functions fold: unchanged.
5. **Fiftieth use:** scrolling past four lines of the same notices every night; "Grill · To do" nine times; on a section screen the second tap for every job (about 10 a night); a Pans cook scrolling past Grill's 9 rows to reach their own; a temperature line at 22:00 nobody reads. No design may move the next box after a tick (S1).
