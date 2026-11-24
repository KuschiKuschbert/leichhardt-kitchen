# Order day nudge: options

Requested 24 November 2026 by the head chef: "Can we have a setting for Headchef sous chef and admin to set a favourite order day where they get a reminder to order all the supplier orders? Like a little nudge "hey it's order day today", maybe check in the uploaded roster if Headchef or sous chef are rostered that day and give a little nudge to not forget to order that day? And if head and sous chef are rostered always nudge the headchef first?"

**Status: the recommendation chosen 24 November 2026 and built (see Chosen and Build).** Round 1 Build smaller, 5 of 5; round 2 A first, 6 of 6; the mix endorsed by the skeptic and the keeper. [Proposal](proposal.md), [evidence packet](evidence-packet.md). Source commit `8f0e83c`. Role-based analysis, not research with staff. Every person and time in the previews is made up, and every supplier except the two names the book already offers (PFD, Simon George).

## Today

- Reminders are per supplier and come from its cut-off: the bar, **Supplier orders today** on the Order list and Chef to-do, a line on Home's **Now and next**, **Coming up** on Home for the next 7 days, and phone pushes (reminder start, 1 hour before, a 15:00 heads-up the day before a long-lead cut-off) to every chef phone that turned pushes on.
- Nothing says "today is the day we do the week's orders", and nothing looks at who is working.
- Recording an order in Supplier order ticks that supplier's next window, even days ahead (17 Nov 2026); the phones hold 8 days of ticks on the existing listener. So "how many of this week's orders are in" can be counted on the phone with no new read.
- Baseline (stand-in, Tue 10:00): [sous chef Home](previews/today-home-sous-390.png), [head chef Home](previews/today-home-head-390.png), [Order list](previews/today-orders-sous-390.png), [Chef to-do](previews/today-todo-sous-390.png), [sous chef Settings](previews/today-settings-sous-390.png), [head chef Settings](previews/today-settings-head-390.png).

## Round 1: should we build it?

Five fresh reviewers, 24 November 2026, from the proposal and the evidence packet.

**Verdict: Build smaller (5 of 5).**

What all five agreed:

- **Keep it off the Order list**, off staff phones and away from service. It stops no mistake mid-service (cook, new starter).
- **Count from the existing ticks**, in the tick list's own words: "Order day: 1 of 4 ordered", naming the next one. "Checking..." until the ticks are in, never "0 to do" (new starter, skeptic, keeper).
- **No Done button, no new write, no new listener.** It ends when every supplier's next order is ticked, or at midnight (keeper).
- **Say plainly who it is for** and what happens when the day's team is not saved (all five).

Cut from the proposal:

- **The setting lives in `config/main`, beside the cut-offs, set by the head chef (admin) on the Order cut-offs page.** 0 reads and no rules change (head chef, skeptic, keeper). The keeper found that a new chef-writable record would cost one more read on every 10-minute run of the push job (about 144 reads a day).
- **Sous chefs changing the day is a proposed departure**, not part of the smaller core: it needs a looser rule on `config/main`, published before the code. Three reviewers said a setting changed about once a year does not justify it. The head chef asked for it, so it stays a separate question.

Disagreement, one line each:

- **Push or not.** Head chef and skeptic: a line in the book first, no new push. Cook: one morning push, nothing after 15:00. Keeper: if there is a push, make it one more stage of the existing push job.
- **Escalation.** Skeptic: if the head chef is rostered but off sick, only a later nudge to the sous chef catches it. Cook: no pushes during service. Head chef reviewer: no escalation.
- **Is targeting needed for a line in the book?** Skeptic: a line is already "roster-aware" because only the chef at work opens the book; targeting matters only for pushes.

## Break-it findings (round 1)

| Scenario | Expected | Hypothesis | Impact | Evidence | Smallest repair or check |
| --- | --- | --- | --- | --- | --- |
| Head chef rostered but off sick, sous chef working (skeptic) | The chef at work is nudged | A nudge only to the head chef waits for the 1-hour cut-off pushes | The miss the head chef wants to stop | Risk / Not evidenced | A later nudge to the sous chef on, only if nothing more is ticked; or the line shows to every chef on |
| Team saved late, or never (keeper, skeptic) | The head chef, said in words | Sous chef or nobody nudged; a sent push cannot be taken back | Wrong chef nudged | Risk / Not evidenced | Decide at send time; with no saved team, the head chef; emulator test with no team record, then a team saved after the send |
| Order day with no cut-off push due (keeper) | One order-day push | The job's "Nothing due." exit runs before any order-day branch | Nudge silently missed | Checked in source (`scripts/cutoff-push.mjs`, the early exit) | Order-day check before the exit; dry run with `PUSH_NOW` on an order day with no cut-off due |
| The chosen chef has no push phone (skeptic) | Someone still gets it | Zero pushes go, nobody knows | Missed nudge | Checked in source (the job filters phones by `by`; the head chef's Google device is `'owner'`) | Head chef = `headId` or `'owner'`; with no phone for them, every chef phone with pushes on |
| Ticks not in, offline, or ordered days ahead (keeper) | The line says the ticks are not in | "0 to do", or a count that never finishes | False all clear, or a nudge that never stops | Partly checked in source: Supplier order ticks a later window, the listener holds 8 days | Click test with ticks loading, offline, and ticked ahead |

## Round 2: three designs

Every design keeps the round 1 core: the count from existing ticks, "Checking..." first, no Done button, no write, no listener, nothing on the Order list or staff phones, and the same pick: **the head chef if on today's saved team, else each sous chef on it, else (team not saved, or no chef on it) the head chef, with the reason in words.** Ends when every supplier's next order is ticked, or at midnight.

The setting for A and B: one **Order day** block at the top of the admin Order cut-offs page: weekday chips (with None), a typed "Nudge from" time, the next date, and Save ([laptop](previews/core-setting-1280.png), [phone](previews/core-setting-390.png)). Head chef (admin) only.

| | A. A line in Your day | B. A morning push and the week's list | C. Head chef first, then the sous chef |
| --- | --- | --- | --- |
| Idea | Changes the least. On the order day, the chef the roster picks sees one line at the top of their own **Your day** card on Home: "Order day: 1 of 4 ordered. Next: PFD Dry Goods by 14:00." Tap: Supplier order. No push. Nobody else sees it. | Rethinks the flow. One push at the set time to the chef the roster picks. It opens Chef to-do, where **Supplier orders today** becomes **Order day: this week's orders**: every supplier's next order with its cut-off, ordered marks, who was nudged. Every chef sees the list; ticks stay on the Order list and in Supplier order. | Removes the most risk of a miss. A push at the set time to the chef the roster picks; if nothing more is ticked by [13:00], a second push to the sous chef on. Nothing after [15:00]. A line on **Now and next** for both chefs: "Max has it. You get a nudge at 13:00 if nothing more is ticked." The day is set in Settings, Notifications, by **any chef** (the head chef's request). |
| Previews | [Head chef Home](previews/a-home-head-390.png); [sous chef Home, unchanged](previews/a-home-sous-390.png) | [Push](previews/b-push-390.png); [Chef to-do](previews/b-todo-sous-390.png) | [Two pushes](previews/c-push-390.png); [sous chef Home](previews/c-home-sous-390.png); [Settings](previews/c-settings-sous-390.png) |
| Good | Above the fold for the chef it is for; 0 reads; no rules; no push noise; smallest build | Reaches a chef who has not opened the book; the whole week in one list; the other chef can see who was nudged | Catches the sick head chef; both chefs know who has it; sous chefs can change the day as asked |
| Not so good | A chef who never opens the book is not nudged; a sick head chef means nobody is; pushes Now and next down 80 px | A second list of suppliers beside Supplier orders today; 2 taps to a supplier; push may land mid-prep | Two pushes and a rules change; the line takes room on both chefs' Now and next; the most to build and test |

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Where it shows | Your day (personal, top of Home) | Phone push, then Chef to-do | Phone pushes, then Now and next (shared) |
| Who sees it | The picked chef only | Push: picked chef. List: every chef | Pushes: picked chef, then sous chef on. Line: both |
| Sequence | Open book, see line, 1 tap | Push, Chef to-do list, supplier | Push, Supplier order; later push to the sous chef |
| Who sets the day | Head chef (admin page) | Head chef (admin page) | Any chef (Settings) |
| Second chance | None | None | 13:00 to the sous chef on |

### Measured on the previews

Preview: the real book in the click-test stand-in (`tests/fake/`), Tuesday 10:05, 390 × 844, Max head chef (admin session) and Sam sous chef, four made-up suppliers, one ticked. Taps to set the day are counted from source, not measured. The 692 and 655 px "Today" figures are the same fixture before anything is drawn in: [head chef](previews/base-home-head-390.png), [sous chef](previews/base-home-sous-390.png). (Three scorers noticed the first baseline screenshots above have no saved team, so their Now and next sits higher, at about 527 px; those two were added after round 2.)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Taps from the nudge to Supplier order | | 1 (from Home) | 2 (push, then supplier) | 1 (push or Home line) |
| Taps to tick a supplier on the Order list | 1 | 1 | 1 | 1 |
| Order list lines at 390 px | | unchanged | unchanged | unchanged |
| Home, head chef: Now and next heading | 692 px | 772 px (line in Your day, 80 px) | 692 px | 692 px; its first cut-off row moves down 76 px |
| Home, sous chef: Now and next heading | 655 px | 655 px (sees nothing) | 655 px | 655 px; first row down 76 px |
| Chef to-do: Supplier orders block | 3 rows | unchanged | 4 rows, Chef to-do card starts about 180 px lower | unchanged |
| Set the order day | | about 5 taps and a typed time, head chef | the same | about 5 taps, any chef |
| New reads | | 0 | 0 on phones; push job about 3 reads plus 1 per chef phone, once a week | the same as B, twice a week |
| Rules | | none | none | looser rule on `config/main` for sous chefs, published first |
| Departures from approved rules | | none | roster-targeted push beside "every chef gets every push" (24 Oct 2026) | the same, plus sous chefs writing a kitchen setting |
| Build size | | 1 pull request | 2 | 2 or 3 |
| Risk | | lowest | low | highest |

### Contract fit (lead's reading, for the scorers to test)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose | Works: Your day is the person's own charcoal card; a personal job belongs there | Works: Chef to-do is the chefs' shared work surface | Needs work: Now and next is the shared amber board; a line about another chef's job takes room there |
| State meaning | Works: counts in words ("1 of 4 ordered"); ordered shows with a tick and words | Works: the tick list's own green "✓ Ordered by Sam, 09:40" | Works, as A |
| Words | One name, "Order day", plus the tick list's words | the same | the same |
| Contrast, focus | Not evidenced (existing row classes; not measured) | Not evidenced | Not evidenced |
| States | Checking, offline, all done, team not saved: Not evidenced (not drawn) | the same, plus push failed | the same as B, plus the second push skipped |
| Service continuity | Works: no Order list line, no pop-up, nothing after midnight | Needs work: the push time must avoid service | Needs work: the 13:00 push lands near lunch service |

### Reference comparison

| Principle | A | B | C |
| --- | --- | --- | --- |
| Things 3: today's job distinct from the week | Works: today only, in your own day | Works: today's push, the week's list | Works |
| Flighty: now and next from data already held | Works: 0 reads | Works on phones; the push job reads the team | Works, as B |
| Duolingo: real progress, clear next step | Works: "1 of 4", next supplier named | Works | Works |
| Headspace: calm, no interruption in service | Works: no push | Needs work: push timing | Needs work: two pushes |
| Linear: one reminder system | Works: rides Home's existing rows | Needs work: a second supplier list | Needs work: a third kind of push beside cut-off pushes |
| Airbnb: the job and its next action together | Works | Works: the whole week in one place | Works |
| Todoist | Not relevant: nothing is added quickly; the setting is set once | | |

## Round 2 scores

Six fresh reviewers, 24 November 2026: the same five plus the kitchen screen designer, each shown all three designs, the previews and the tables above. No numeric scores; rankings as given. All six said the designs differ structurally (the screen designer: "partly", since A and C use the same row on different boards).

**A ranked first by 6 of 6.**

| Reviewer | Ranking | Take into the best one | Main concern |
| --- | --- | --- | --- |
| Cook mid-service | A, B, C | C's second chance as a quiet line in the sous chef's own Your day, no push | B's typed time allows a 19:00 buzz; C's 13:00 push lands with the 14:00 cut-off's "Order now" push |
| Head chef | A, B, C | A now, then B's one push alone in a second pull request, no week list | No second chance for a sick head chef; sous chefs cannot set the day, as asked. The real head chef decides both |
| Skeptic | A, B, C | A with the count's set of orders fixed at the start of the day; pick by who is on now, from saved hours | The nudge prevents no missed order (each cut-off still reminds); extra pushes risk chefs turning pushes off, losing cut-off pushes too (hypothesis) |
| New starter | A, B, C | B's row words ("by Thu 15:00", not "(Thu)"); C's "Saved by Max" on the setting | C promises Sam a 13:00 push while his own Settings show pushes Off |
| Keeper of the book | A, B, C | A plus a later line for every chef on if nothing is ticked since the reminder time; no push | B's "the nudge went to Max" cannot be known on a phone (`pushsent` has no client rule); a push stage costs more reads than the brief said |
| Kitchen screen designer | A, B, C | A, B's "who has it" words, C's second chance as a later Your day line; keep "4 of 4 ordered ✓" until reload | On the head chef's phone the live 14:00 countdown leaves the first screen (Now and next heading at 772 px, tab bar at 776 px) |

Contract fit from the scorers: A **Works** on surface (the person's own charcoal card) and words; sampled contrast on the preview, light theme only: title 13.5:1, subline 8.2:1, B's "✓ Ordered by Sam, 09:40" 5.6:1 (screen designer). B and C **Need work**: push timing near service, a second supplier list, and C's kitchen setting under "What this phone does". The head chef reviewer flagged that Your day holds roster facts with no chevrons today, so a tappable job there is a new use of the card. **Not evidenced** in every design: dark mode, keyboard focus, the Checking, offline, all done and team not saved states, long supplier names, 768 and 1280 px.

### Break-it findings (round 2)

| Scenario | Design | Evidence | Repair or check |
| --- | --- | --- | --- |
| The head chef's shift ends with orders still open; the sous chef stays on (skeptic) | A | Risk / Not evidenced | Pick by who is on now from the saved hours (0 reads); click test at 15:01 |
| Sam is promised a 13:00 push while his phone has pushes off; 13:00 is also the 14:00 cut-off's "Order now" push (skeptic, new starter, cook) | C | Seen in the C previews; push times checked in source | Promise nothing the phone cannot do; no 13:00 push |
| A supplier delivering twice a week, or an order ticked ahead, moves "next order" so the count never finishes or changes its total (skeptic, keeper) | All | Risk / Not evidenced | Fix the day's set of orders at the reminder time; a passed cut-off unticked says closed, not ordered; click test with a twice-weekly supplier |
| The team is saved after the push (keeper) | B, C | Rule checked in source: `pushsent` has no client rule | Never say "the nudge went to"; take words from today's team only |
| A push stage open from 10:00 reads the ticks and phones on every run until sent (keeper) | B, C | "Nothing due." exit checked in source (`scripts/cutoff-push.mjs` line 69); cost Not evidenced | An hour-long window like `HEADS_FOR`; dry runs at 09:59, 10:00, 11:05, and on a day with no cut-off due |
| A sous chef offline in the cool room has a failed team read (keeper) | All | Risk / Not evidenced | A failed or unknown team shows the line, never "not you" |

## Mix of A, B and C

Every reviewer said a blend of all three is worse than A: one nudge on three surfaces with three ways to say the count, two homes for the setting, two new pushes, a rules publication and 3 to 5 pull requests. Four of six (cook, keeper, screen designer, skeptic through "pick by who is on now") independently proposed A plus a quiet second chance on the phone.

| From | Part | Take or reject | Principle | Kitchen benefit | Conflict or cost | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A | One line in the picked chef's Your day, 1 tap to Supplier order | Take | Things 3, Flighty | Today's job in your own day, 0 reads | Head chef's Now and next drops 80 px | Preview, 6 of 6 |
| A | Setting on the admin Order cut-offs page, `config/main` | Take, with None and "Saved by" | Duolingo | 0 reads, no rules | Sous chefs cannot set it | Preview; rules checked in source by the keeper |
| B | Row words: "by Thu 15:00", ticked "✓ Ordered by Sam, 09:40" | Take into A's line | Headspace | One name per thing, readable without colour | None | Preview |
| B | "Who has it" | Take, from today's team only, never "the nudge went to" | Duolingo | The other chef knows | Must stay true | Keeper's source check |
| B | Week list on Chef to-do | Reject | Linear | | A second supplier list; Chef to-do drops 180 px | Preview |
| B | One morning push | Reject for now; a later step only if the head chef wants it (head chef reviewer) | Headspace | Reaches a chef who has not opened the book | A server stage, departure from "every chef gets every push" | 5 of 6 rejected |
| C | Second chance for the sous chef | Take as a line in the sous chef's Your day, no push | Things 3 | Catches a sick or finished head chef | More states to test | Cook, keeper, designer |
| C | 13:00 push, shared Now and next line, Settings placement, sous chef write | Reject | Headspace, Linear | | Lunch-time buzz, rules change, kitchen setting under "this phone" | 6 of 6 rejected |

## Combined preview

**Status: the lead's synthesis, built from the scorers' own suggestions. Focused follow-up from the skeptic and the keeper below.**

Preview, the same stand-in and fixture, 390 × 844:

- [Max, head chef, 10:05](previews/mix-home-head-1005-390.png): "Order day: 1 of 4 ordered. Next: PFD Dry Goods by 14:00. Then Coast Seafood by Thu 15:00, Fresh Meats by Fri 14:00." in his Your day. Row 98 px (three-line subline; two lines would be about 80 px).
- [Sam, sous chef, 13:05](previews/mix-home-sous-1305-390.png): nothing ticked since 10:00, so the line comes to Sam too: "Nothing ticked since 10:00. Max is on until 15:00."
- [Sam, 15:05](previews/mix-home-sous-1505-390.png): Max has finished (PFD ticked by Max at 11:30): "Order day: 2 of 4 ordered. Max finished at 15:00."
- [States](previews/mix-states-390.png), stacked for comparison (only one shows at a time): checking the orders, 4 of 4 ordered ✓, team not saved (every chef sees it).
- [Setting](previews/mix-setting-390.png): Order day chips with None, "Reminder from", "Today, Tue 24 Nov, from 10:00. Then Tue 1 Dec.", Save, "Saved by Max, Sun 22 Nov."

How the mix works:

1. **The head chef first**: from the reminder time, in their Your day, while on today's saved team.
2. **The sous chef on gets it too**, with no push, when the head chef is not on today, once the head chef's saved shift has ended, or from [13:00] if no supplier has been ticked since the reminder time.
3. **With the team not saved or unreadable, every chef sees it**, and the line says why.
4. **The day's set of orders is fixed at the reminder time**: each supplier's next order then. A cut-off that passes unticked says closed, not ordered.
5. **It ends** at 4 of 4 (kept on screen until the page is left) or at midnight.
6. Never on the Order list, never on staff phones, no push, no new read, no write, no rules change.

| | Today | Mix |
| --- | --- | --- |
| Taps from the line to Supplier order | | 1 |
| Taps to tick a supplier on the Order list | 1 | 1 |
| Order list lines at 390 px | | unchanged |
| Home, head chef: Now and next heading | 692 px | about 772 to 790 px on the order day only |
| New reads, listeners, writes, rules | | none (one `config/main` field written by the admin's Save) |
| Build | | 1 pull request |

### Focused follow-up on the combined preview

The skeptic and the keeper, 24 November 2026, from the five mix previews. **Both endorse the mix over pure A**, each with conditions.

- **Skeptic.** Fixes the shift-ends case when the saved team has hours, the false push promise (no push), and the never-finishing count on paper (Not evidenced in code). "Ticked since" must count only ticks that are on, so a tick taken off again does not stop the handover. Downside: four rules and five states, all for batching, not for preventing a missed order.
- **Keeper.** No new reads, listeners, writes or rules. A team save already stamps `config/main` and phones read the team again (`teamStamp()`), so a stale team uses an existing path. Endorses if the setting survives a People save.

### Break-it findings from the follow-up

| Scenario | Evidence | Repair | Disposition |
| --- | --- | --- | --- |
| **The People save wipes the order day.** The admin's People save writes `config/main` with a fixed list of fields, no merge (`saveConfig()` in `js/prep.js`) (keeper) | Checked in source | Keep `orderDay` as stored, the way `cutoffs` is; test Save order day, then a People save | Must fix before ready |
| **Double order after "finished".** "Max finished at 15:00" comes from the plan, not from Max; if he stays late ordering on a supplier's site before ticking, Sam may order the same supplier (skeptic) | Risk / Not evidenced | Say "Max's shift ended at 15:00" and show the last tick, by whom and when | Wording fixed in the build |
| **Hours missing, or a split shift.** Saved hours are optional; one person can hold lunch and dinner, so "finished at 15:00" is wrong if he comes back (keeper) | Checked in source (`teamClean()`) | Use the latest end across all his shifts, or the shift's own hours when none are saved; with neither, only the 13:00 rule | Click test |
| **Home left open past 13:00 or 15:00.** The pick is worked out when Home draws; Sam may see nothing until Home redraws (skeptic) | Risk / Not evidenced | Redraw on the existing minute tick of Home's clock; click test with Home open 12:59 to 13:01 and 14:59 to 15:01, and a team changed on another phone | Click test |
| **A failed team read says "not saved"** (skeptic, keeper) | Not drawn | Its own words: "Could not check today's team, so every chef sees this." | Click test offline |
| **"Last: 16:40" at 10:05 needs its day** (keeper) | Seen in the states preview | Name the day when it is not today | Wording |
| **Set of orders on a phone first opened at 15:05** (keeper) | Risk / Not evidenced | Work it out as at the reminder time, from the cut-offs and ticks already held | Click test |

## Recommendation

**Recommend A's line in Your day + C's second chance as a quiet line for the sous chef + B's words.** No push, no rules change, 1 pull request.

1. On the order day, from the reminder time, the head chef sees "Order day: 1 of 4 ordered" in their own Your day while on today's saved team, naming the next order ("Next: PFD Dry Goods by 14:00. Then Coast Seafood by Thu 15:00"). 1 tap opens Supplier order.
2. The sous chef on sees it too, in their own Your day, when the head chef is not on today, once the head chef's saved shift has ended, or from [13:00] if nothing has been ticked since the reminder time. That is "head chef first" without a second push.
3. With the team not saved or unreadable, every chef sees it, and the line says which.
4. The day's set of orders is fixed at the reminder time; it ends at 4 of 4 or at midnight.
5. The head chef (admin) sets the day and the reminder time on the admin Order cut-offs page, with None and "Saved by".

Why it beats the alternatives: all six scorers ranked A first; it adds no push on top of the cut-off pushes the chefs already get (Headspace, Linear), counts real progress from ticks the phone already holds (Duolingo, Flighty), and still catches a head chef who is off sick or has gone home, which pure A cannot (Things 3: the job lands in the day of the chef who is on). The skeptic and the keeper endorse it over pure A.

Main downside: **a chef who does not open the book that day gets nothing**, and on the head chef's phone the live countdown in Now and next drops below the first screen on the order day (the line names the same next cut-off). The skeptic's point stands: this helps batch the orders; the cut-off pushes still guard each deadline.

### What the head chef was asked

1. **The design:** the recommendation, or A, B or C as drawn.
2. **A phone push as well?** The council says not now (5 of 6). The head chef reviewer suggested one morning push to the picked chef as a later, separate step if the line alone is not enough. It would also change "every chef gets every push" (24 Oct 2026).
3. **Sous chefs setting the day?** You asked for it. The council says it is not worth a looser rule on `config/main` (the record with the head chef and sous chef lists) for a setting changed about once a year. Your call.
4. **The times:** the reminder time (preview 10:00) and the sous chef's second chance (preview 13:00).

### Verification plan for the build

- Fake-clock click tests at 09:59, 10:00, 12:59, 13:01, 14:59, 15:01, 23:59 and 00:00; ticks loading, offline, ticked ahead, a tick taken off again; a twice-weekly supplier; a shift with no hours and a lunch plus dinner shift; Home left open across 13:00 and 15:00; a team saved on another phone; a phone first opened at 15:05; a handover on a shared device.
- Save order day, then a People save: the order day is kept. An unsaved cut-off draft on the same page survives Save order day. Save button states as `svButton()`.
- `tests/read-budget.test.js` unchanged; `tests/roles.test.js` for staff (never sees it).
- Remeasure the implemented app at 390, 768 and 1280 px on one fixture with long supplier names, light and dark, keyboard focus.

## Chosen

**24 November 2026: the recommendation.** The head chef's words: "go with your recommendation, i will set the order day in the apps manually, there can be different order days when i actually do the orders unrelated to the order cut-offs". Recorded at the top of `docs/head-chef-decisions.md`.

What the answer settled:

- **One or more order days.** "There can be different order days" and "unrelated to the order cut-offs": the setting ticks weekdays (any number, or none), and no day is worked out from a supplier's cut-off. The preview's single choice became chips that each turn on and off.
- **Set by the head chef**, in the app, on the admin Order cut-offs page. Sous chefs do not set it, so no rules change.
- **No push.** The council's advice; the head chef did not ask for one.
- **The times** stay as drawn: the reminder from 10:00 (changeable on the setting), the sous chef's second chance from 13:00.

## Build

One pull request, 24 November 2026 (this folder's, after the council's docs).

- **`js/prep.js`.** `config/main.orderDay { days, from, upd, by }`: `odClean()`, `odSet()`. The line: `odRow()` picks who sees it from today's saved team (`homePlanData()`, already held) and counts the day's orders (`odOrders()`, each supplier's first cut-off after the reminder time, in the 8 days the shared ticks cover) from `cutTickFor()`; `odRowHTML()` puts it first in Your day (`homeDayHTML()`), redrawn on the existing 30 second cut-off tick and when a tick changes. The setting: `odAdminHTML()` above the cut-offs on the admin Order cut-offs page, its own draft and `svButton()` Save (`od`), `odSave()` one merged write of `orderDay`. `saveConfig()` keeps `orderDay` as stored, so a People save never drops it.
- **Words.** "Order day: 1 of 4 ordered"; "Next: PFD Dry Goods by 14:00. Then Coast Seafood by Thu 15:00, Fresh Meats by Fri 14:00."; for the sous chef first "Max is not on today.", "Max's shift ended at 15:00." (and "Last ticked: PFD Dry Goods, Max, 11:30."), or "Nothing ticked since 10:00. Max is on until 15:00."; "Today's team is not saved, so every chef sees this." or "Could not check today's team, so every chef sees this."; "Closed, not ordered: ..."; "Order day: checking the orders..."; "No signal: ticks from other phones are not in yet."; "Order day: 4 of 4 ordered ✓ ... Last: Fresh Meats, Sam, 11:00." for 30 minutes after the last tick.
- **While today's team is still being checked** nothing shows, so the line never goes to the wrong chef for a moment.
- **No push, no read, no listener, no write on the phones, no rules change.** The admin's merged write of one `config/main` field is allowed by the existing admin rule (checked in source by the keeper). `tests/read-budget.test.js` unchanged and passing.

### Implemented app measurements

Stand-in, Tuesday 10:05, Max (head chef, admin session), the same four suppliers and team as the previews, with the order day set.

| Width | The line in Your day | Now and next heading |
| --- | --- | --- |
| 390 × 844 | top 210 px, 98 px tall (three-line subline) | 791 px (692 px without the line), just under the tab bar at about 776 px |
| 768 × 1024 | 117 px tall (the narrower column wraps to four lines) | 671 px |
| 1280 × 900 | 79 px tall | 602 px |

No sideways scroll at any width. As the screen designer warned, on the head chef's phone the live cut-off countdown in Now and next moves below the first screen on an order day; the line names the same next cut-off. Taps: 1 from the line to Supplier order; the Order list's tick and add stay 1 tap; no Order list line. The setting block is 573 px tall at 390 px. Screenshots: [head chef 390](previews/built-home-head-390.png), [768](previews/built-home-head-768.png), [1280](previews/built-home-head-1280.png), [setting](previews/built-setting-390.png).

Not evidenced yet: dark mode and keyboard focus were not checked on the new line (it uses the existing Your day row classes); the live site.

### Checks

`tests/order-day.test.js`, 33 checks: the head chef's line, its words and its tap; nothing before the reminder time, on another day or with no days set; the sous chef nothing while the head chef is on, the line at 13:05 with nothing ticked since 10:00, nothing after a tick at 11:30, the line after the head chef's shift with the last tick; lunch and dinner with no hours use the shifts' own end; the head chef not on; no team saved (both chefs, and staff never); 4 of 4 and the line going 30 minutes later; Home left open across 13:00; no signal for the ticks; the setting (no days, Save off, a typed 930, the next date, the saved record, an unsaved cut-off change kept, who saved it); a People save keeping the order days. Proved first: without the `saveConfig()` line the People save check fails (1 of 33). Also passing: 32 related files (Home, cut-offs, roles, read budget, design patterns, safe text, after the tap, admin nav, mascot and others).
