# The function band and the cut-off bar on a busy day. Options

19 November 2026. Found while measuring step 1 of the consistency sweep (`docs/consistency-sweep-options/brief.md`). The head chef asked for an alternative to the minus. Then they proposed a split bar, with functions and cut-offs side by side and whichever is closer getting the wider part, "keeping their initial colour coding in accordance with our design guidelines". Nothing is built. The head chef decides.

**Chosen and built (head chef, 19 November 2026): all three steps of round 3, the strip mended, Prep keeping your place, and Prep starting with the strip.** The previous recommendation was the strip on Prep and Prep keeping your place (D + E), after the strip's repairs. All six reviewers put it first, with 48.5 points against 38.5 for keep-place alone and 30 for A. The cut-off in the strip (F) is held. Round 2's recommendation of A is superseded. See Round 3.

## The problem

On a busy day the two dark bars under the top bar fill most of the first screen. The pretend busy day has three functions tonight (rounds at 18:30, 19:00 and 19:30, the first already sent) and a supplier whose order closes at 15:00. At 14:00 on a 390 x 844 phone:
- The function band is 216 px and the cut-off bar is 94 px: 310 px in all.
- The head chef's Prep shows **1** prep line on the first screen.
- Staff, who do not get the cut-off bar, see 2.

The band shows every function from 00:00 on its day, whatever time its food goes out. The minus folds it to one 50 px line, but only for the rest of that day on that phone, and every phone starts the day open.

All numbers here are **Preview** measurements of the real book in the click tests' stand-in, at commit `35eba2a`. Each design is drawn over the bars the book drew, by `variants.js`; `shoot.js` takes the pictures. Conditions: the stand-in's fonts (the test browser has no Google Fonts), the usual text size, no celebrations. The pictures are in `previews/`, named `<design>-<who>-<width>-<moment>.png`.

## The three designs

The colours are the same in all three, as the head chef asked:
- **Charcoal** for live bands, with orange times and labels.
- The **orange pill** in a cut-off's last hour.
- **Red** for a cancelled function and **blue** for a moved one.
- The **quiet paper "Next function" line** for a function coming up but not on today (`docs/function-ahead-options/brief.md`).

No new colour.

### A. Folded until food is close (changes the least)

The book's own fold, set by the clock:
- The function band is its one folded line while the next round is more than an hour away. It opens by itself an hour before food goes out.
- The minus still works both ways.
- The cut-off bar is as it is today.

At 14:00 this is the folded band with the full cut-off bar. At 18:15 it is the full band, exactly as today.

### B. One split bar (the head chef's idea; rethinks the layout)

One charcoal bar, 52 px:
- The cut-off sits on one side and the functions on the other, with a thin divider.
- Whichever is due sooner takes 62% of the width.
- Each side is one tap: the cut-off side opens that supplier's cut-off page, the functions side opens Functions.
- Each side has its label, and the time comes first, so a long name is shortened and never the time:
  - "Order now · in 1 h / 15:00 Northside Test Foods"
  - "Functions · 3 / 19:00 Jones wedding"
- With only one of them live, that one fills the bar and adds the platters: "Functions today · 3 on / 19:00 Jones wedding · 2 × Antipasto".
- There is no minus.
- The platters list, Service view and "+1 more" move one tap away, to Functions.

### C. Tighter rows (removes the most clutter, keeps everything visible)

The two bars stay. Every function is one 44 px line: time, name, platters. Service view, "+1 more" and the minus sit beside the label. The cut-off is one line: the time, the supplier and an "Order now · in 1 h" pill. Order list is dropped, since the Orders tab is on screen.

### How they differ

| | A | B | C |
| --- | --- | --- | --- |
| Layout | Two stacked bars, as today | One bar, two halves | Two stacked bars, one line each |
| What shows before food is close | One folded line: functions named, platters hidden | The next function only | Every function and its platters |
| Disclosure | By the clock, and the minus | Tap a half to go to its page | Always open, and the minus |
| Where Service view is | In the band once it opens | On Functions, one tap more | Beside the label |
| Bars, every page | Two | One | Two |

## Measured (Preview, head chef unless staff is named)

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Bars at 390 px, 14:00 | 310 px | 144 px | **52 px** | 190 px |
| Prep lines at 390 px, 14:00 | 1 | 3 | 3 | 2 |
| Prep lines at 390 px, 18:15 (service) | 2 | 2 | 3 | 3 |
| Prep lines at 390 px, 14:00, staff | 2 | 4 | 4 | 3 |
| Prep lines at 768 px, 14:00 | 4 | 6 | 6 | 5 |
| Prep lines at 1280 px, 14:00 | 3 | 5 | 6 | 3 |
| Smallest drawn tap in the bars | 22 px (36 px band buttons) | 22 px | 52 px | 44 px |
| Taps to see tonight's platters from Prep | 0 for two, 1 for more | 1 before food is close (Show), 0 after | 1 (Functions) | 0 |
| Taps to the service view | 1 | 2 before food is close, 1 after | 2 | 1 |
| Taps to a supplier's cut-off page | 1 | 1 | 1 | 1 |
| New reads, listeners or rules | none | none | none | none |
| Build size | none | 1 small pull request | 1 medium pull request: one new bar, and many tests that name the two bars | 1 small to medium pull request |
| Relearning | none | Low | Medium | Low |

Notes:
- Step 1 (#771) gives the 22 px and 36 px taps in today's bars a 44 px tap area without changing how they look. The drawn sizes above are before #771.
- The Prep page's own head (the day controls, the section chips and the notebook cover) takes about 250 px at 390 px. That is why B's 52 px bar gives 3 lines, not more. It is outside this study.

## Contract fit (from the evidence above)

| Check | A | B | C |
| --- | --- | --- | --- |
| Surface purpose (charcoal for live, paper for coming up) | Works | Works | Works |
| State meaning (orange attention, last-hour pill, red cancelled, blue moved) | Works (unchanged) | Needs work: a cancelled or moved function must take the functions half first, or the notice can sit behind the count | Works |
| Words and no colour alone | Works | Works: each half has its label | Works |
| Tap targets | Needs work (#771 fixes the tap areas) | Works (52 px halves) | Works (44 px) |
| Contrast | Not evidenced (unchanged tokens) | Not evidenced (same tokens) | Not evidenced (same tokens) |
| States: no signal, a failed functions read, Extra large text | Unchanged | Not evidenced | Not evidenced |
| Service rules: nothing over a list, no new tab or pop-up | Works | Works (a tap goes to a page, no new sheet) | Works |

## Council (19 November 2026)

Six fresh reviewers each saw the same evidence packet and every picture. They were five council roles plus the kitchen screen designer, and their notes are in this section. Round 1 and round 2 ran in one pass, to save cost: each reviewer said first whether to change the bars at all, then ranked the designs. This is role-based analysis, not research with real staff.

**Round 1: Build smaller, 5 of 5** (the screen designer joins round 2 only). Everyone agrees the 14:00 problem is real: 1 Prep line for the head chef. Everyone also agrees it is narrow. Nobody knows how often functions and a last-hour cut-off overlap. The minus already gives A's picture for one tap. The Prep page's own head (about 250 px) costs more than either bar.

**Round 2 scores** (out of 10):

| Reviewer | A | B | C |
| --- | --- | --- | --- |
| Cook mid-service | 6 | 4 | 7 |
| Head chef | 8 | 5 | 6 |
| Skeptic | 7 | 4 | 6 |
| New starter | 5 | 4 | 7 |
| Keeper | 8 | 4 | 6 |
| Screen designer | 7 | 5 | 6 |
| **Total** | **41** | **26** | **38** |

**Structure.** Every reviewer said only B is a different layout. A changes when the band is open. C changes how dense it is.

**Why B came last with all six,** though it saves the most room:
- In service the second function, Service view and the platters move a tap away, when they matter most.
- A cancelled, moved or changed function can sit behind the count. The preview even counted the function already sent.
- There is no room for the "No signal" or "Could not load" line. For staff, who get no cut-off bar, a failed read would leave no bar at all, which looks like "no functions today".
- The halves swap width under a thumb.
- It drops the Next function, Order and Tomorrow lines kept on 10 November, and the minus kept on 22 October.
- It is a medium build: 21 test files name the two bars.

What survives from B is its rule that the time comes first and only a name is ever shortened.

**Where they split.**
- The head chef, keeper, skeptic and designer put A first: the least change, and 3 lines at 14:00.
- The cook and new starter put C first: everything in sight in service, and 3 lines at 18:15.
- Nearly everyone named A's clock fold plus C's one-line rows as the useful blend, and asked for its own preview first.

**Disagreement in one line each.**
- Cook: the band earns its height in service, so tighten it rather than fold it.
- New starter: the folded band's round "+" reads as Add in this book, so it should say Show. That changes the 22 October choice.
- Skeptic: the minus already does A's job for one tap. How often the problem happens is not evidenced.

## Mix of all three

| Part | Take or reject | Why | Principle |
| --- | --- | --- | --- |
| A: the fold set by the clock | Take, with the repairs below | 3 lines at 14:00 for the least code: no reads, rides the band's 20 s repaint | Things 3: later work tucked away until it matters |
| A: opening by itself whenever the time comes | Reject; hold it while a finger is down | Opening drops the list 166 px, and a thumb could tick the wrong line | Flighty: no distracting movement; never shift a live list |
| B: one split bar, the nearer half wider | Reject | Service loses sight of functions and notices; the halves move; no room for failure words | Linear: a stable frame |
| B: the time first, only a name shortened | Take | A time is never cut | Flighty: real times first |
| C: one 44 px line a function once the band is open | Take, once a full preview keeps every notice | Gains a service line | Airbnb: time, name and platters together |
| C: the cut-off on one labelled line, the Order list link dropped (the Orders tab is on screen) | Take | 94 px down to 48 px | Linear: work over navigation |
| C: the always-open band | Reject | 2 lines at 14:00 | Things 3 |

**The combined preview** (`mix-*.png`; Preview, same fixture):

| | Today | A | C | Mix |
| --- | --- | --- | --- | --- |
| Bars at 390 px, 14:00 | 310 px | 144 px | 190 px | **98 px** |
| Prep lines at 390 px, 14:00 | 1 | 3 | 2 | **3** |
| Prep lines at 390 px, 18:15 | 2 | 2 | 3 | **3** |
| Prep lines at 390 px, 14:00, staff | 2 | 4 | 3 | **4** |
| Prep lines at 768 px / 1280 px, 14:00 | 4 / 3 | 6 / 5 | 5 / 3 | **6 / 5** |

Review status: this mix is the lead's synthesis of parts the reviewers named. It was not scored as a whole. The service-time rows rest on C's preview, and the skeptic found that C's preview drops things today's band shows:
- round labels;
- the late "not sent yet";
- the Changed tag;
- the cut-off's delivery day.

The real rows must keep those, and they may not all fit on one line at 390 px.

## Break-it findings

All are Risk / Not evidenced: the fixture has none of these cases.

| Scenario | Designs | Impact | Smallest repair and check |
| --- | --- | --- | --- |
| A function cancelled at 13:30, or changed at 14:30, is rolled into "+2" while the band is folded. The fold never draws Changed, and Changed lasts 3 hours, so a 14:30 change expires before an 18:00 opening | A, B (and C's preview) | Platters prepped or sent for a cancelled function, or to old counts | Notices (Cancelled, Moved, Changed, a Functions person's Confirm out) always come first and never go into a count. The clock never folds while one is on. Click test at 390 px with a cancelled 19:30 and a changed function |
| The band opens by itself under a finger at food minus 60 minutes | A, mix | A tick lands on the wrong line | Open only once no finger is down (the band's existing `ahWait()`). Click test: pointer down at 17:29:45, fast forward 30 s, the row has not moved |
| A Show tapped at 14:00 folds again on the next tick, because `lk.fn.fold` records only a folded day | A, mix | The band will not stay open | Show stays open for the day. Click test |
| No signal or a failed functions read: B has no room for the words | B | Failed reads look like no functions | B rejected. A and the mix keep today's line |
| The halves swap width under a finger | B | A tap opens the wrong page | B rejected |
| The shared tablet: one cook's minus folds the band for everyone on it | A, mix | Missed functions in service | Say whether the clock or the minus wins. Proposed: inside the hour before food, the clock opens it again |

## Recommendation

**Recommend A, folded until food is close, with the repairs above. Then C's one-line cut-off line and open rows as a second, measured step: the mix.**
- **Step 1, A:** about 1 small pull request, in `js/functions.js` and its tests. Prep goes from 1 line to 3 at 14:00 on a busy day for the head chef, and staff from 2 to 4. No reads, rules or new files.
- **Step 2, the cut-off line and open rows:** only after a full preview that keeps round labels, late and Changed notices and the delivery day, measured at 390 px including Extra large text. On the pretend busy day, the mix measured 3 lines at 14:00 and 3 in service.

Why A first: four of six put it first, and the blend everyone named starts with it. It changes no layout the team has learned, and it has the smallest failure surface once the notice and finger rules are in.

Main downside: before food is close, tonight's platters and Service view are one tap away (Show).

**For the head chef.** This changes two earlier choices:
- The 22 October fold becomes clock-set, not only per phone.
- Whether the folded "+" should say Show.

Not evidenced for any design: measured contrast, Extra large text, the shared tablet in service, and no-signal states as drawn.

## Questions the designs raise

- B: should the functions half go to the service view (`#/fn/now`) once two functions are on, and to Functions before that?
- B: when the nearer side changes (the cut-off passes, or food gets closer), the halves swap widths. They should never move while a finger is down, and never animate.
- A and B: does the head chef want the platters of tonight's functions in sight on Prep all afternoon, or only near service?

## Round 3: the strip, keeping your place, and the cut-off in the strip

The head chef asked for something more practical than A, B and C, and asked the council to judge the new ideas. Same pretend busy day and fixture as before (commit 35eba2a). These are Preview measurements on the real book in the stand-in. Pictures are in docs/band-options/previews/:
- `d-*.png` and `f-*.png` show the opening screen.
- `de-*.png` and `fe-*.png` show the place you return to.

### What the lead found in the book since round 2 (measured)
- **The bars scroll with the page; they are not fixed.** Once the function band has scrolled off the top, the book already pins a slim 44 px strip at the top with the next function. It shows the most urgent first: a cancelled function shows as "Cancelled, do not send", moved ones are left out, and "+N" counts the rest. A tap opens the service view when two or more functions are on, or the function's sheet when one is on (js/functions.js strip(), built 22 Oct 2026). The strip has no "No signal" or "Could not load" line; the band has one.
- **After one flick up, Prep shows 6 lines** on a 390 px phone, for the head chef and for staff, with the strip pinned. Ticking a line does not move the page. Scrolled to the bottom, the bars stay away. They come back only at the top.
- **Opening a recipe from a Prep line and going Back keeps your place on Prep** (534 px before and after).
- **Switching Prep, then Orders, then Prep with the tab bar puts you back at the very top**, with the bars (513 px, then 0). Browser Back from Orders does the same. So in service, a cook flicks again every time they come back from Orders, Wastage or Transfers.

### The new ideas
- **D. The strip on Prep from the start.** On Prep, the function band starts as the slim strip the book already pins when you scroll (44 px instead of 216 px). The full band is one tap away: the strip opens the service view or the sheet, as it does today. The cut-off bar is unchanged. Other pages are unchanged.
- **E. Prep keeps your place.** When you come back to Prep from another tab the same day, it returns to where you were, not the top. Tapping Prep again while on Prep goes to the top, the usual phone-app convention. No visual change.
- **F. The cut-off joins the strip in its last hour.** Two fixed halves, never changing width: the functions on the left, and "ORDER 15:00 Northside… in 1 h" on the right. On Prep, during that hour, the cut-off bar is not drawn separately, so the bars become one 44 px strip. When scrolled, the pinned strip carries both. Outside the last hour, the strip carries functions only.

### Measured (Preview, head chef unless staff is named)
| | Today | A (fold by clock) | E only | D | D + E | D + E + F |
| --- | --- | --- | --- | --- | --- | --- |
| Bars when Prep opens, 390 px, 14:00 | 310 | 144 | 310 | 138 | 138 | **44** |
| Lines when Prep opens, 390 px, 14:00 | 1 | 3 | 1 | 3 | 3 | 3 |
| Lines coming back from another tab, 390 px | 1 | 3 | **6** | 3 | **6** | **6** |
| Lines when Prep opens, 390 px, 18:15 (service) | 2 | 2 | 2 | 3 | 3 | 3 |
| Lines when Prep opens, staff, 390 px | 2 | 4 | 2 | 4 | 4 | 4 |
| Lines when Prep opens, 768 px | 4 | 6 | 4 | 6 | 6 | 6 |
| Lines when Prep opens, 1280 px | 3 | 5 | 3 | 5 | 5 | 6 |
| Cut-off reminder in sight once scrolled | no | no | no | no | no | **yes** |
| Platters of the next function in sight on opening | yes (2) | no (folded) | yes | yes (next only) | yes (next only) | yes (next only) |

The 390 px opening screen is limited to about 3 lines by the Prep page's own head (the day controls, section chips and notebook cover, about 250 px). That head is outside this study. The 1280 px pictures use a spacer that stands in for a longer list, so the band can scroll away.

### Known risks the lead can see (not tested)
- D, F: the strip has no "No signal" or "Could not load" line; today the band carries it. That line would need to stay with the strip on Prep.
- F: at 390 px each half is about 195 px. In the preview the supplier's name shrinks to "N…" and the function to "All: 2 × A…". The times and "in 1 h" stay whole.
- E: coming back mid-list, a new urgent line or a newly cancelled function above your place is out of sight. The pinned strip shows a cancellation first; it has no word for a Changed function.
- E: the place is kept in memory only (navigation.md: the route trail and scroll positions live only in memory). A reload or the 04:00 refresh starts at the top.
- D changes the 22 Oct decision that the band shows on every page (it would show as the strip on Prep). F changes where the cut-off reminder sits during its last hour.

### Council, round 3

The same six reviewers, resumed with the round 3 evidence (`shoot-strip.js`, `measures-strip.json`, pictures `d-`, `de-`, `f-`, `fe-`). This is role-based analysis.

| Reviewer | A | E only | D + E | D + E + F |
| --- | --- | --- | --- | --- |
| Cook mid-service | 4 | 6 | 8 | 6 |
| Head chef | 6 | 7 | 8.5 | 6.5 |
| Skeptic | 5 | 7 | 8 | 6 |
| New starter | 5 | 6 | 8 | 5 |
| Keeper | 5 | 7 | 8 | 4 |
| Screen designer | 5 | 5.5 | 8 | 6 |
| **Total** | **30** | **38.5** | **48.5** | **33.5** |

**Round 1 on each idea.**
- **E (keep your place):** Build, 5 of 5. It is the biggest daily gain: coming back from Orders, Wastage or Transfers shows 6 lines instead of 1, for every role, with nothing new on screen.
- **D (the strip on Prep):** Build or Build smaller, 5 of 5, Prep only, once the strip is repaired.
- **F (the cut-off in the strip):** Don't build, 4 of 5. At 390 px the halves read "All: 2 × A…" and "N…", so no name shows. It gains no line over D + E, and the 10-minute cut-off push already reminds. The skeptic would put the cut-off in the pinned strip only, never at the top. The designer would try it from 768 px.

**A correction from the skeptic, checked in the source.** Round 3's evidence said the strip shows a cancellation first. It does not:
- `strip()` shows the first of `showing()`, which sorts by food time. A cancelled function comes first only when it is the earliest.
- Moved functions are left out of the strip and are not counted in "+N".
- The strip has no Changed tag, no Confirm out and no "No signal" or "Could not load" words.

This is true of today's pinned strip too, whenever someone scrolls. E and D make the strip what people see most on Prep, so these repairs come first. They also mend today's book.

### Recommendation, round 3

**Recommend D + E, in three steps:**
1. **Mend the strip.** Cancelled, moved and Changed functions come first and are never counted away. The "No signal" and "Could not load" words go with it, and a Functions person's Confirm out stays. Add the word "Functions" (new starter), and say what a tap opens. This step mends today's pinned strip as well.
2. **E, Prep keeps your place.**
   - Kept in memory per person, date and section filter, so a shared tablet hands the next person the top.
   - Anchored to a line (the top row and its offset), not to pixels, so ticks by others while you are away do not shift it.
   - Saved through the existing route-leave hook, not a second scroll system.
   - Put back once, after Prep first draws, and never while a finger is down.
   - Tapping Prep again goes to the top. A reload or the 04:00 refresh starts at the top.
3. **D, the strip on Prep from the start.** Prep only; other pages keep the band.

**Measured (Preview, head chef at 390 px):**
- Opening Prep on the busy day: 3 lines instead of 1.
- Coming back from another tab: 6 lines instead of 1.
- In service: 3 lines instead of 2.
- Staff: 4 lines on opening, 6 on return.
- No reads, rules or new files. E touches `js/app.js` and one call in `js/prep.js`. D touches `js/functions.js` and `css/app.css`, and up to 7 test files that open Prep with the band.

**Main downside.** Coming back mid-list, two things are out of sight:
- a new urgent line above your place;
- the cut-off bar in its last hour. The pinned strip carries functions only.

The cut-off push and the Orders tab still remind.

**For the head chef.** D changes the 22 October decision that the full band shows on every page: on Prep it starts as the strip. F stays on hold.

**Break-it findings, round 3** (all Risk / Not evidenced, source only):

| Scenario | Smallest check |
| --- | --- |
| A moved or changed function is out of sight when you come back mid-list | A 390 px click test, a moved and a changed function, the strip names each |
| No signal: the strip shows a morning copy as live | `offline-reads.test.js`: Prep opened offline, the strip says No signal |
| Shared tablet: the next person lands on the last person's place | A click test: hand over, open Prep, it starts at the top |
| Weak signal: Prep draws late and the restore scrolls under a finger | A click test: hold the stand-in's answer, press down, no scroll |
| A new urgent line above the kept place | Not repaired. Name it in the note, and check whether a line count in the strip helps later |

## Chosen and built (19 November 2026)

The head chef chose all three steps ("Build all three"). Built on `ux/prep-strip-place` as one pull request, one commit for each step, so the phones update once.

| Step | Built | Files |
| --- | --- | --- |
| 1. The strip mended | `stripItems()` puts a cancelled, then a rescheduled, then a changed function, then a trip waiting for this Functions person, first; the order and tomorrow lines are counted too. `stripInner()` adds the word Functions, the tags before the words, "+N", a chevron, the visually hidden "Opens the service view" and the band's stale words (`staleWords()`, shared with the band). The pinned strip now shows whenever there is something to say, not only for today's functions. | `js/functions.js`, `css/app.css` |
| 2. Prep keeps your place | `prepPlaceSave()` on scroll, `prepPlaceBack()` after Prep draws, never while a finger is down. Prep tapped on Prep goes to the top | `js/prep.js` |
| 3. Prep starts with the strip | `prepStrip()`; `.fn-band.is-strip` holds `stripInner()`. The Next function line and other pages are unchanged | `js/functions.js`, `css/app.css` |

**Measured in the stand-in**, on the implemented app with the pretend busy day at 390 px:

| | Head chef | Staff |
| --- | --- | --- |
| Opening Prep | 3 lines (1 before) | 4 lines (2 before) |
| Coming back from Orders | 6 lines, same line at the top | 6 lines, same line at the top |
| Tapping Prep on Prep | Goes to the top | Goes to the top |

**Tests.** `tests/prep-strip-place.test.js` has 15 checks; 9 failed on main, including all 8 marked old. `tests/functions.test.js` checks the full band's fold and rows on Wastage, since Prep starts with the strip, and the strip's text now starts with Functions. `tests/fn-ahead.test.js`'s day-before check accepts the strip's Tomorrow line on Prep. The design pattern names are in `tests/design-patterns.test.js`.

**Not covered yet:**
- the next person on a shared tablet starting at the top: the place is keyed by staff id, not exercised in the stand-in;
- a new urgent line above a kept place;
- Extra large text;
- measured contrast.


## Orders starts with the existing Functions fold (23 November 2026)

The remaining-space audit found the same three bookings above Orders. Round 1 was unanimously Build smaller for Orders. Round 2 split three first choices for A, the existing fold, and three for B, the named strip that opens Functions. C, a disclosure beside Orders, came third. The head chef delegated the choice for this cycle. The lead selected A to keep the existing details and return on the order list. C's desktop rail fits one extra request but adds layout and disclosure work. B recovers only 6 extra pixels over A and fits the same number of requests, with a page change to see more. Bringing B's route link or C's second disclosure into A would duplicate the way into Functions. Keep A with named alerts first and the existing controls.

| Council reference | Selected result |
| --- | --- |
| Linear | The order list gains space while the Add request, tick and supplier cut-offs stay where the team expects them. |
| Things 3 | Routine details take one tap to reveal. Service view on a routine opening takes two taps, previously one. |
| Flighty | The actual round time leads the summary. Named urgent states and old or failed results stay in words. The screen waits until the pointer lifts before the band moves. |
| Headspace and Duolingo | The disclosure says Show functions or Hide functions. When alerts need the full band, it says Function alerts are shown. Order placed, Undo, Confirm out and their named responses keep their existing actions and acknowledgement. |

The routine Orders band opens in place for a cancelled, rescheduled or recently changed booking, a kitchen comment, a trip waiting to be confirmed by this person, a short-notice order reminder, an unknown round time or a next unsent round due by an hour from Queensland time. An overdue round stays open and says it has not been sent yet. The existing paint checks the clock every 20 seconds. It also opens for the existing No signal or Could not load functions message. All named alerts are visible even if the usual row limit would have put one behind Show more. When an alert clears, the view follows the person's Show or Hide choice for this kitchen day in the current tab. Prep starts with its strip as before. The sheet, service view, access, listeners, data and written records keep their own rules.

Before a live redraw of the Orders band, the pinned strip and function-driven updates to the Orders list, the book uses the existing pointer guard. While a finger is down or has just lifted, it keeps the drawn content and the focused control. It applies the queued update after the quiet interval. An explicit Show or Hide responds to the person's tap. If a focused alert control survives a repaint, the replacement gets focus without a scroll; the disclosure or Orders heading receives focus when that control is gone.

### Measured in the app (Orders)

Chromium using the checked-in Barlow and Caveat, synthetic Firebase and the unchanged Orders shell. The chef opened the same three routine functions, including a long name, and seven outstanding requests with a stock tag and two open supplier cut-offs at 14:00 Queensland. Before means released commit `f29eb5660be4`. Complete counts stop above the fixed Add request dock where it covers the list.

| Viewport | First request before | First request with fold | Complete requests before → with fold |
| --- | ---: | ---: | ---: |
| 390 × 844 | y598 | y411 | 1 → 3 |
| 768 × 900 | y611 | y443 | 3 → 6 |
| 1280 × 800 | y498 | y330 | 4 → 6 |

On the phone the third request takes 184 px of scroll on the old opening and fits without a swipe with the fold. Extra large shows one complete request instead of none. When three simultaneous alerts all need their own rows, the longer warning band takes 34 px of scroll to uncover the first full tick. Orders still shows its one-tap Add request. The same normal text and accent colours on charcoal measured 13.53:1 and 5.77:1. The design keeps the existing 44 px effective target around the round Show and Hide control.

The new browser tests cover the first fold, inline keyboard open and close, scope on other workbooks, stable order ticks over repeated held updates and release or cancellation, exact Queensland-hour boundary, Extra large fit, the named warnings and permissions for Confirm out, offline and failed reads, real order and supplier actions and their Undo. The test stand-in uses synthetic records and does not measure physical touch hardware or production connections. See `tests/orders-functions-fold.test.js`, `tests/prep-strip-place.test.js` and `tests/service-targets.test.js`.

## The fold on five more pages (26 November 2026)

Step 2 of the device coverage plan found the full band (218 px on a busy afternoon) at the top of Wastage, Transfers, Cleaning, Today's team and the recipe card on the 1920 x 1080 section screens: with the 132 px top bar, 350 of 1008 px before the page starts ([findings](../device-coverage/step2/findings.md), section 1). Three of four reviewers led with Orders' fold. The head chef chose it: "Yes all recommendations".

What it does: those five pages follow the Orders rules above, unchanged. Routine bookings fold to one line with each time and name; a notice, a due round or a failed read opens the band and it cannot be folded away; Show lasts for this person and kitchen day in this tab, on every fold page; the band waits for a lifted finger before it moves. The Recipes list, Home and the other pages keep the full band and their per-day minus (`lk.fn.fold`); Prep keeps its strip. In code: `foldBand()` in `js/functions.js` names the fold pages; the hold on the Orders list's own updates (`ordersBand()`) stays on Orders.

Quick check: no new button, tab or pop-up; nothing new over a list; the main job of each page is still one tap. Taps for Service view on a routine day go from one to two, as on Orders. Contract fit: the 23 November Orders evidence and its tests carry over; the named warnings stay in words.

### Measured in the app (five pages)

The step 2 busy afternoon (14:00, three routine functions tonight, a supplier cut-off) on the click-test stand-in, a cook on a shared screen, Today's team as the sous chef. Complete items in view, not under a dock or a bar. Before is `main` at 7dd621a.

| Page | 390 phone | 768 tablet | 1920 section screen |
| --- | --- | --- | --- |
| Band height | 218 → 50 px | 218 → 50 px | 218 → 50 px |
| Wastage entries | 3 → 5 of 6 | 6 of 6 | 6 of 6 |
| Transfers loans | 1 → 3 of 3 | 3 of 3 | 3 of 3 |
| Cleaning jobs | 1 → 4 of 46 | 6 → 9 of 46 | 6 → 9 of 46 |
| Today's team people | 0 of 4 (first starts 757 → 590 px) | 1 → 2 of 4 | 1 → 2 of 4 |
| Recipe card, Into the pan | under the drawing (1372 → 1204 px) | under the drawing | 3 → 5 of 5 |

Checks: `tests/orders-functions-fold.test.js` (each page folded at 390 and 1920, Show carrying from Cleaning to Transfers and the recipe card, the Recipes list's own minus, a due round opening Wastage and the recipe card; 15 of these fail on the old code). The checks that needed the full band moved from Wastage to the Recipes list in `tests/functions.test.js`, `tests/service-targets.test.js`, `tests/sweep-buttons.test.js` and `tests/prep-strip-place.test.js`.

