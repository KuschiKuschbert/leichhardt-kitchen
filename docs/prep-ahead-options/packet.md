# Prep lines for a later day: council evidence packet

Source commit: `70ce8f4` (main, 17 Nov 2026). Facts below are from source review unless marked **Implemented app** (measured in the click-test stand-in, synthetic data, 390 x 844 unless said, the stand-in clock at 14:00 Queensland). This is role-based analysis, not research with real staff.

## The head chef's request (17 Nov 2026, in their words)

"I'd like to add the possibility to put items on the preplists for days in the future."

Nothing more was said about who writes them, how far ahead, or how they show. Those are open for the council.

## What happens today

**Where lines live.** Each kitchen day's prep lines are `days/<YYYY-MM-DD>/items/<id>` { text, station (section), qty, recipe, addedBy, addedById, addedAt, done, deleted, urgent, ... }. `newItem(extra, date)` in `js/prep.js` already takes a date, but every Add on the page writes to the day on screen.

**Who sees which day.** Staff only see today in `#/prep`: no back, forward or date picker. The head chef and sous chefs (`canBrowse()`) get a day row above the list: `‹`, **Today**, a date field and `›` (Implemented app, `baseline/chef-today.png`). On any day other than today the add form is not drawn: the foot of the page says "You are looking at Saturday. Lines are added on Today only." (`baseline/chef-ahead-3.png`). The reason recorded in `docs/prep-book.md` (Roles, rollover...): "lines are added on today only, because a line written onto a past day would never roll over". Future days were never considered.

**What the server allows already.** `firestore.rules`, `nearDay()` and `lineWho()`: staff write yesterday's, today's and tomorrow's lists only; the head chef, sous chefs and function managers write any day (a function's platter lines already go on the function's own day, `js/fnedit.js`). So a chef writing a line on a later day needs **no rules change**. Staff writing further than tomorrow would need looser rules.

**How tomorrow is written today.** Every night the team writes the next day's list in one batch on today's page. Since 22 Oct 2026 the book clocks when that batch started (`listStart()` in `js/learn.js`: from 15:00, lines 15 minutes apart or less, the biggest batch of 6 or more). Open lines written after that start sit last on today's All list under **Tonight, for tomorrow**, and since 17 Nov 2026 they leave today's counts ("· 6 for tomorrow" in the header). A line written for tomorrow at 10:00 in the morning has no such cut: it is today's work.

**Rollover.** The first phone to open the new kitchen day copies every open line from the **last written day** (up to 7 days back) onto today, marked Rolled (`maybeRoll()`, `rollSource()` in `js/prep.js`). A day counts as written if it holds any line that is not removed and not a function's platter line. Rollover never looks forward.

**Double ups.** The same item open twice on today's list merges into one line by itself (`mergeDups()`), so a line written ahead and the same line rolled in would merge on the day.

**The line's byline.** A line not rolled shows its writer and the clock time it was written: "Sam 13:02" (`rowHTML()`, `clock(x.addedAt)`, time only, no day).

**What chefs use today for later work (alternatives).**
- **Chef to-do** (`#/todo`, chefs only): a job with an optional Due by day. Staff never see it; it is not a prep line, has no section, amount or tick on the prep list.
- **Shift pings** (chefs write, everyone reads): can be scheduled for a later day and pop up for 30 minutes. A message, not a line to tick.
- **Write it on the night**: wait until the evening before and write it on tonight's list.
- **Functions**: a confirmed function puts its platter lines on its own day by itself; What the platters need offers ingredients for today's and tomorrow's functions.
- Or remember it.

## Baseline (Implemented app, main `70ce8f4`, stand-in, synthetic data)

| View | File | Rows in view | Notes |
| --- | --- | --- | --- |
| Staff (Ann), today, 390 x 844 | `baseline/staff-today.png` | 6 of 6 | No day row. Sticky **Add a line** above the tab bar |
| Staff, Add a line sheet open | `baseline/staff-add-sheet.png` | (sheet) | "Add to prep": line, Section, Amount, Add; section and unit chips; Add from the recipes |
| Sous chef (Sam), today, 390 x 844 | `baseline/chef-today.png` | 6 of 6 | Day row `‹ Today [date] ›` above the section tabs |
| Sous chef, 3 days ahead (Saturday) | `baseline/chef-ahead-3.png` | 0 | "Nothing written for saturday yet." and "Lines are added on Today only." No Add |
| Sous chef, today, 1280 x 800 | `baseline/chef-today-1280.png` | 5 of 6 | Two-page notebook |

The fixture list is short (6 lines), so every line fits at 390 px; a real dinner list does not. `baseline/measurements.json` has the numbers.

**Taps today (Implemented app, counted on the stand-in):**
- Add a line for today: from the Prep tab, **Add a line** (1), type, **Add** (2). Typing two letters also offers your usual lines with their own **Add**.
- Add a line for a day 3 days ahead: **not possible**. A chef can open that day (`›` three times, or the date field) but cannot write on it.

## The proposal (round 1, no code)

**The problem.** A chef knows today that a job belongs to a later day: dough for Friday's function, brine on Wednesday for Thursday's special, thaw the brisket two days before. The book has no place for it on the prep list until that day's list is written, so it lives in a head, a to-do the cooks never see, or a ping that is gone after 30 minutes.

**Who has it, how often.** The head chef and sous chefs, while planning (orders, functions, specials). How often is **Not evidenced**: the nightly learning counts lines but not "written for a later day". The functions calendar and the Function stock order lines (ordered at least 4 days ahead) suggest weekly at least.

**The change.** A chef can put a prep line on a chosen later day. On that day it is on the list like any other line, in its section, for everyone. Before that day it does not touch today's list or counts.

**Open choices for the designs (not decided):**
1. Who: chefs only (no rules change), or staff too (staff only for tomorrow under today's rules).
2. Where the day is chosen: in the Add sheet ("For: Today / Tomorrow / pick a day"), or by opening that day with the existing day row and adding there, or from a separate place (a "Later" page or fold).
3. How far ahead: tomorrow only, a week, or any day.
4. Whether today's page shows anything of what is waiting on later days, and what that costs in reads.
5. How the line reads on its day: today it would show "Sam 13:02", the clock time it was written days earlier.

**Cost (estimate, source review).**
- Files: `js/prep.js` (add form, toast, rollover, byline), `css/app.css`, `tests/` (new click test), `README.md`, `docs/prep-book.md`, `docs/head-chef-decisions.md`. No new outside service. No rules change for chefs only.
- Reads: opening a later day already costs its lines (a listener while that day is on screen, 1 read for an empty day). A list of everything waiting ahead would cost about one read per day looked at (7 for a week, once a day with `dayCache()`), or a new collection with one query.
- Risk: rollover, the night list and double ups are the parts that bite (see below).

## Break-it findings so far (lead, before the council)

1. **Reproduced (stand-in, `break-rollover.cjs`, `baseline/break-rollover.json`).** Two days ago "Brine pork" was left open. Yesterday nobody opened the book (a closed day), but a line for yesterday, "Thaw brisket", had been written ahead. Today's rollover took only "Thaw brisket" (shown "Rolled from Sam, Fri") and **left "Brine pork" behind for good**. Control without the line ahead: "Brine pork" rolls as it should. Cause: a line written ahead makes its day a "written day" (`rollSource()`), so rollover stops there. The same class of bug was fixed for function platter days on 22 Oct 2026. Any design must repair it before release.
2. **Risk / Not evidenced.** The byline shows only the clock time: a line written Monday 16:05 shows "Sam 16:05" on Thursday morning, a time that has not come yet that day.
3. **Risk / Not evidenced.** Wrong day: a rushed chef picks Friday for Saturday's job, or leaves the day row on a later day and adds what was meant for today. Nobody sees the line until that day.
4. **Checked in source.** The night list clock (`listStart()`) only counts lines written on their own day, so lines written days ahead do not fake a night batch. `writtenLate()` likewise.
5. **Risk / Not evidenced.** Learning, Insights, Records and the CSV count lines by their day and writer; a line written ahead counts on its day. Whether any report reads `addedAt` as "written that day" is not checked.

## Current design contracts (excerpts for every reviewer)

- **Service rules** (`CLAUDE.md`, head chef 5 Nov 2026): the main job of each work page is one tap from its tab; no new tab, top bar or tab bar button, or pop-up on a service page without the head chef's OK; nothing appears over a list during service unless it stops a mistake; a change that adds taps or takes away visible lines says why.
- **Add a line** (`docs/prep-book.md`, 3 and 8 Nov 2026): the add form is a bottom sheet opened by the sticky **Add a line**; typing two letters shows at most four usual lines with their own Add; the slip says "Added Dice onions to Larder" with Undo; proofreading, double ups and the cleared box are the same for every way in.
- **After the tap** (`docs/action-feedback.md`): every action answers in its own frame and says what it did, by name. Pending, Not sent, Saved and failed states are said in words.
- **Who sees what** (`docs/private-kitchen-access.md`, `docs/coding-rules.md`): staff pages show today. Anything staff must not do is locked in the rules, not only hidden.
- **Today finishes today** (17 Nov 2026, `docs/mascot-presence-options/brief.md`): tomorrow's lines written tonight do not count against today; the header says "· 6 for tomorrow".
- **Reads** (`docs/coding-rules.md`): the free plan stops the book for the day at 50,000 reads. No new listeners except for today's live data; anything else is read once a day with `dayCache()`; `tests/read-budget.test.js` holds the budget.
- **Colours** (`docs/surface-colours.md`, `docs/colour-coding.md`): Prep is a steel work book on quiet paper. Orange is attention and the book's action colour; charcoal is Urgent on Prep; green is done or saved. Upcoming, neutral information is not automatically amber. Status must read without colour.
- **One clock** (`docs/easy-to-break.md`): days and weekdays come from `dayNow()` and `T.*` (Queensland); never `new Date()` for those.
- **Patterns** (`docs/design-patterns.md`): a line in a list's header keeps the header's height (`.nb-pw`); bottom sheets go on `document.body`, one at a time; date choices elsewhere use chips (Today, Tomorrow) and a date field (pings), or a week picker (Today's team).

## Design references (from `.claude/skills/service-council/SKILL.md`)

| Reference | What the council checks | What to avoid |
| --- | --- | --- |
| Linear | Are the page frame, action placement and names consistent, with the work more prominent than navigation? | Tiny dense controls, keyboard-only paths or a second navigation system |
| Things 3 | Are today's work and upcoming work distinct? Are occasional details tucked away while frequent actions stay visible? | Drag-only actions or hiding the chosen one-tap Urgent, Recipe and On it controls |
| Airbnb | Can the person see a job's time, place, requirements, status and next action together, without hunting through screens? | Decorative cards, photos or duplicated information that displaces useful lines |
| Todoist | Is adding quick, with known defaults visible and editable, usual items easy to find, and extra fields shown when needed? | Guessing a section, unit or quantity from ambiguous text, or hiding required inputs |
| Flighty | Is what matters now and next clear, with real times, deadlines and status from data the person may already read? | New listeners or polling just for the look, distracting movement or stale status presented as live |
| Duolingo | Does each tap answer immediately and truthfully? Does progress show real completed work, with a clear next step and recovery? | Points, streaks or decorative rewards without a kitchen job; showing Saved before acknowledgement |
| Headspace | Are labels calm, short and understandable to a new starter, with one name for each thing and words on actions? | Vague reassurance, unexplained icons or onboarding interruptions during service |

Relevant here, by the lead's reading: **Things 3** (today and upcoming kept apart), **Todoist** (a due day as an optional field in quick add, with a visible default), **Duolingo** (the slip names the day it went to). Reviewers may challenge this choice.

## Try to break it (from the skill)

Consider: confusion and accidental action (wrong day, wrong item); repetition and delayed answers (double taps, Undo while a write is held); failed reads and writes (no signal, a held write to a later day); interruption and handover (the sheet closed with words in it, a lock); time boundaries (just before and after Queensland midnight, the night list cut, the 04:00 unlock, a closed day nobody opens); access and conflicting state (a staff member trying to write further ahead, two chefs writing the same line); misleading presentation (a byline time that has not happened yet, a count that hides lines). Label each finding **Reproduced**, **Checked in [fixture]**, **Risk / Not evidenced** or **Not applicable**.
