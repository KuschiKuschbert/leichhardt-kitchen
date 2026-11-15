# Today's team: smarter section suggestions

15 November 2026, Queensland. Head chef request, after the day grid was built: "Can we make it that it suggests sections in a smart way from the data we already track?"

**Status: Build smaller (5 of 5); the head chef chose the smaller version on 15 November 2026; built (see Built).** Role-based analysis, not research with staff.

## The proposal

## What the book already keeps (no new data needed)

`teamsum/main`, written by the 03:00 nightly job (`scripts/analysis.mjs`, `js/analysis-core.js`), read once a kitchen day by the chefs' pages and the admin panel (1 read, `tsLoad()` in `js/prep.js`, never by staff):

- **days**: the last 30 days, one entry per person per section per service per day, from the chef's saved plans (`team/<day>`) and each cook's own picks and moves on Home (`shifts/<day>_<id>`). Sections by name. "Shifts worked are activity, never competence" (code comment).
- **usual**: each person's usual section per weekday and service from the last 8 same weekdays' plans: `{ '<weekday>|<service>': { person: [section id, times, of] } }`, only when given at least twice, ties to the more recent.
- Today's saved plan and the draft in the planner.

## What the grid does with it today (built 15 Nov 2026, PR #709)

- **Roster import** (admin panel): each filled membership takes the person's usual section for that weekday and service (`tmAddShift()` with `tmUsual()`), else their section on another service already filled that day, else No section.
- **Add staff** (quick add): the same defaults.
- **Each cell's picker** offers, first: "Usually Grill, 6 of the last 8 Tuesdays" when a usual exists and differs from the cell, then "Same as Lunch: Grill". Never applied by themselves.
- **Cross-training hint** under a row: "Not on Pans in 30 days. Ann is on Pans in this plan." (at most two a service).
- Copy last weekday fills an empty day with last week's sections and breaks.

## What is not used yet

1. A person with **no weekday usual** (new, irregular, or under 2 of the last 8 same weekdays) gets nothing suggested, although the 30 days may show they mostly work Pans at Dinner.
2. **Clashes are invisible**: two people may both be given their usual Grill at Dinner; nothing says so.
3. **Gaps are invisible**: a section staffed on almost every Tuesday Dinner (from the plans) may have nobody today, and the head only says "3 no section".
4. **No one-tap fill**: every suggestion still costs open plus choose per cell.

## Candidate ideas for round 2 (no choice made)

A. A ranked suggestion in each picker for every cell, with its reason: weekday usual, then most worked on this service in 30 days, then most worked overall; a section already given to someone else on that service is shown as taken ("Grill, Ari is on it"), not hidden.
B. Plain flags in the service heads or rows: "Two on Grill at Dinner" and "Nobody on Pass at Dinner (on 7 of the last 8 Tuesdays)", computed only from saved plans, never a rule.
C. A "Fill suggestions" action for empty cells only, each filled cell tagged USUAL or OFTEN (the existing Filled for you pattern: a word tag, one line saying what was filled and from where, a 44 px button to empty them), never over a chosen section, nothing saved until Save.
D. Any mix.

## Cost and risk

- **Reads, rules, data:** none new. teamsum is already read once a day where the planner runs. The sums are worked out on the phone from the record already held. No listener, no write, no saved field.
- **Files:** `js/prep.js` (grid helpers), `css/app.css` if a flag or tag is drawn, `tests/` (a new test file with a synthetic teamsum), the brief and notes.
- **Risk:** the council rejected an automatic fill on 15 Nov 2026 because doubles often change section and a plausible wrong section hides a gap (reproduced). Any fill here must keep a visible difference between "chosen" and "suggested", never overwrite a choice, and never claim a gap is a rule (the book does not know which sections must be staffed). Stale counts (nightly job late or failed) must not suggest from old data without saying so (`tsCount()` already says when counts stop early). Chef rows read Head chef or Sous chef and are left out.

## Measured so far

- Built grid (stand-in, made-up day, no usual sections): 29 taps to set a two-service day for 8 people, 35 with three services (`docs/team-sections-options/implemented.json`).
- How often the real usual or 30-day suggestion is right: **Not evidenced** (the real record is private and is not read here). A synthetic fixture can show the mechanics, not the accuracy.

## Relevant design references

- **Todoist:** known defaults visible and editable, usual items easy to find; never guess from ambiguous data.
- **Flighty:** real data the person already has, with its age said when it is old.
- **Airbnb:** who, where and the reason together.
- **Duolingo:** a fill says what it did; Draft is never Saved.
- **Headspace:** one plain word for a suggestion ("Usually", "Often").
- **Things 3 / Linear:** the frequent job stays visible; no second way to do the same thing without reason.

## Round 1 (15 November 2026)

**Verdict: Build smaller, 5 of 5.** Five fresh agents read the proposal, the grid study's evidence packet and brief, the Filled for you pattern, screenshots of the built grid and the source.

| Reviewer | Verdict | Decisive point |
| --- | --- | --- |
| Cook mid-service | Build smaller | A wrong fill reaches Home as truth, and saved fills feed the next usual counts. Build the 30-day fallback in the picker; a gap note belongs in the Save words, not the sticky head; hold the Fill. "Two on Grill" is noise on busy nights. |
| Head chef | Build smaller | The data is young: Today's team began on 7 Nov 2026, so no weekday has more than two saved plans. Pickers only now: "Often Pans" only with at least three shifts behind it, and who is already on each section. Count empty cells after real imports around 6 Dec, then decide on a fill. |
| Skeptic | Build smaller (close to Don't build yet) | Most of it exists (import usuals, Usually and Same as in the picker, Copy last weekday). Build only "Often Pans, 6 Dinners in 30 days" in the picker with the hints' age check. No flags, no fill. Clash flags and "taken" fight the cross-training hint, which pairs two cooks on one section on purpose. |
| New starter | Build smaller | The reason with its count in each picker makes sense on its own and nothing is applied. "Two on Grill" helps; hold Fill and the gap flag. The import's existing fills carry no tag; tag every book-filled cell before any Fill. |
| Keeper of the book | Build smaller | Gap flags need a new nightly field (days hold only 30 days and include Home picks; usual is per person). Three different rules for old data: tmUsual has none, tmLearnHints drops records older than yesterday, tsCount says the days missing. One freshness rule first. Rank from one shared count per record, never per cell. |

**Cuts all five accept:** suggestions only inside the existing picker, never applied by themselves; no Fill (C) now; the gap flag (B) held (four of five; it needs data the book does not keep).

**Disagreement:**
- Clash information: the new starter wants "Two on Grill" and the head chef wants who is on each section shown in the picker; the Skeptic, the Keeper and the cook reject flags or "taken" because the cross-training hint pairs two cooks on one section on purpose and busy nights double up.
- The cook would put a gap note in the Save words; the others hold gaps entirely.

**Break-it findings:**
- Stale record (Checked in source, Skeptic and Keeper): `tmUsual()` has no age check, while `tmLearnHints()` drops a record older than yesterday. A late nightly job lets Usually, the import and any new suggestion use old data without saying so. Repair: one freshness rule for all; a synthetic record three days old must show no suggestion, and the test must fail on the current code.
- Cross-training conflict (Checked in source): following the hint always puts two on one section, so a clash flag would contradict it.
- Renamed section (Risk): days hold section names, usual holds ids; map names through `secNow()` and offer nothing when ambiguous.
- Feedback loop (Risk): imported and filled cells become next month's "usual" with no record of where they came from.

**Why no round 2 for the cut version:** after the cut, the change is one more option inside the existing picker plus a shared age check. Three structurally different designs of one option label would be cosmetic variants (the skill: state the limitation rather than relabel cosmetic variants). The quick check applies; the head chef chooses whether to accept the cut.

## Chosen

15 November 2026: the head chef chose **the smaller version** ("Build the smaller version (Recommended)"): an Often suggestion inside the picker, never filled in by itself, plus one freshness rule. Hold the Fill button and the gap and clash flags. Count the cells the roster import leaves empty around 6 December 2026, then decide on a Fill. Recorded in `docs/head-chef-decisions.md`.

## Built

`js/prep.js`:
- `tsFresh()`, beside `tsCan()`, is one freshness rule. The nightly record counts only when it was read from the server and made today or yesterday.
- `tmUsual()` uses that rule, so the weekday usual is no longer offered, or filled in by the roster import and Add staff, from an old record.
- `tmLearnHints()` uses the same rule in place of its own copy.
- `tmOften()` works out, once per record, each person's days on each section on each service in the 30 days. It names the top section only when there is no weekday usual, the top has at least 3 days, there is no tie, and the name now (`secNow()`) matches exactly one section on the list.
- `tmGridCellHTML()` offers it first: "Often Pans, 5 of 5 Dinner shifts in 30 days". It is never applied by itself, and is gone once the cell matches.

No new read, write, field, rule or listener. The record is the one already read once a kitchen day.

**Quick check:**
- **Taps and lines:** unchanged. A cell is still open and choose; Often is one more option, at the top, in the shared picker; no row height changes. The benefit is finding the likely section without hunting, not fewer taps.
- **Contract fit:** the grid's rule "offered first inside the picker, never filled in by themselves" holds. Filled for you is not used: nothing is filled.
- **Reference fit:**
  - Todoist: the likely section is visible and editable, never guessed into the plan.
  - Flighty: old counts give no suggestion.
  - Airbnb: the reason and its count sit with the choice.
- **Disagreement carried:** "who is on each section" in the picker was not built, because the cross-training hint pairs two cooks on purpose (three reviewers). Gap words in Save were not built either.

**Checks** (`tests/team-grid.test.js`):
- Cal, with no usual, is offered Often Pans counted by days, a move counted once, and it is not filled in.
- A tie offers nothing; fewer than 3 days offers nothing.
- A weekday usual comes first, with no Often beside it.
- Choosing Often sets only that cell.
- Fresh counts still let Add staff fill a usual section.
- A record three days old offers no Usually and no Often, and Add staff fills no usual. These two checks fail on the code before this change (reproduced by putting back the old `tmUsual()`) and pass now.
- Every Today's team file, roster import, kitchen pages, design patterns, read budget, admin intelligence and insights person pass locally (23 files).

Screenshot: `often-picker-390.png` (the shared picker on a phone, Often first, the cell still No section).

**Not evidenced:** how often Often is right on real plans (the record is private); a renamed section on real data (`secNow()` covers it by name); old phones' time for the first count (once per record, then kept).

**Left for December:** count the cells the import leaves empty and how often the suggestions match what the chef saves. Decide then on a Fill or gap words.
