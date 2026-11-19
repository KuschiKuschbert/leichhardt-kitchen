# Restyle every page for consistency? Council, 19 November 2026

The head chef asked: "Should we restyle every single page and function to get better consistency?"

**Verdict: Build smaller (3 of 5).** The other two said Don't build the restyle. All five are against a full restyle, and all five asked for the same smaller work: a consistency sweep in a few grouped pull requests. Nothing is built yet. The head chef decides.

## Why the question

The whole book was redesigned on 8 November 2026 (`docs/whole-app-redesign-options/brief.md`, Chosen and Build). `docs/design-patterns.md` became the contract that day ("maintain consistency"), and the surface colours were chosen on 9 November (`docs/surface-colours.md`). Since then about 145 commits have added features: the Today's team reworks, cleaning, cooling, the mascot, prep ahead, roster import, the chef panel, print cards, the allergen check, tutorial videos and April Fools. The question is whether those additions have pulled the book apart far enough to redraw it.

## What was measured

Nine auditors (eight page families plus the shared CSS system) compared every page with the design contracts and with the sibling pages, from source and from 85 screenshots of the app as built. The build was main `83f8ddd`, on a synthetic fixture, at 390 and 1280 px, signed in as the head chef and as staff. An independent verifier per family then tried to refute each finding and checked the head chef's decisions for deliberate choices. Later the same day 36 more screenshots at 768 px (the kitchen tablet) were checked by the lead. They show the same frames as the phone and laptop. The full register is in [findings.md](findings.md).

| | Count |
| --- | --- |
| Findings | 126 |
| Confirmed | 102 |
| Deliberate (a head chef choice, not drift) | 16 |
| Refuted | 8 |
| Confirmed, by severity | service 4, confusing 27, cosmetic 71 |
| Confirmed, by fix | tiny 54, small 48, page needs redrawing **0** |
| Confirmed, needing a head chef choice | 25 |
| Pages the verifiers said need a restyle | **none** |

Page scores (5 = matches the contracts and its sibling pages) run from 3 to 5. The lowest are the function form (`#/functions/<id>`, 3) and the admin Wastage report (3). After them come Suppliers, Deliveries, the Functions managers' list, the Team report and admin Minutes (3.5). Everything else scores 4 or more.

What is already consistent: one top bar and tab list on every page, one sheet frame, one slip with Undo, the notebook cover and rows shared by Prep, Orders, Wastage, Transfers and Cleaning, the admin shell, and the chosen surface colours.

The drift is mostly in **states and words**, not in how pages look. A failed read is drawn four different ways, and on Minutes it looks like "No minutes yet" (KITC-1). Empty states have three looks, and there are six frames for a docked Save bar. Functions shows Loading and Could not load at once (FUNC-3). Two pages are called Functions (FUNC-6). Cleaning has two names (SHEL-8). Orders puts ⋯ before Remove, while every other list puts Remove first (ORDE-3).

The four service findings:

- **SHEL-1 and SYST-1:** the function band's fold, "+N more" and "Service view" buttons are 36 px, under the 44 px rule.
- **SHEL-2:** the order cut-off bar's supplier link has no 44 px target, though the same link on Orders does.
- **ORDE-1:** Save delivery is off the first phone screen when both bands show.

The cook also noted that on the head chef's Prep at 390 px only about 2 full lines show, because the function band and the cut-off bar take about 270 px. This was read from a synthetic screenshot and not measured in the click tests.

## Round 1

Fresh reviewers, each with the same evidence packet: the proposal, the audit, the service rules, the design references, Try to break it and the contract excerpts. This is role-based analysis, not research with real staff.

| Reviewer | Verdict | Main reason | One change |
| --- | --- | --- | --- |
| Cook mid-service | Build smaller | Main jobs are already one tap; a redraw moves every target a wet thumb has learned and reloads every phone, for no saved tap | The four service fixes in one pull request, with taps and lines at 390 px before and after |
| Head chef | Don't build | The book was redrawn 11 days ago; no page needs redrawing; 8 or more merges and relearning mid-service for mostly cosmetic gain | Service fixes first, then one tidy of failed-read and Try again states, then the 25 look choices in batches |
| Skeptic | Don't build | The drift is in shared states, not layouts; a restyle would reopen 16 chosen differences | Name the missing pieces in `docs/design-patterns.md` and make its test check that pages use them |
| New starter | Build smaller | Words and states trip a new starter, not looks: a failed Minutes read looks like an empty one | One shared failed-read line, in red words, with Try again and the automatic retry, clearly different from empty |
| Keeper | Build smaller | `css/app.css` and `js/prep.js` are in the saved shell, so each merge is a reload; about 3,000 selectors across 381 test files would churn; the helpers already exist | Write a stronger static contract check first, failing on today's code, then fix until it passes |

**Disagreement.** The split between Build smaller and Don't build is a matter of name. Both sides reject the restyle and propose the same targeted work. They differ on what goes first. The cook and head chef want the service fixes first. The keeper wants the stronger contract check first. The skeptic wants the contract pieces named first.

**Contract fit.** A full restyle needs work: it redraws the designs chosen on 8 November, reopens 16 deliberate choices, and gives no tap or line counts, which service rule 4 asks for. Targeted fixes fit the contracts. One current failure: the Minutes failed read breaks "a failed read never shows nothing" (`docs/design-patterns.md`, A page).

**Reference fit.** Headspace (one name for each thing, calm short labels) and Duolingo (each tap answers truthfully, with a clear recovery) point at the real gaps, which are names and failure states. Linear (one consistent frame and action placement) is already met by the shared shell; the gaps are the Save dock and the order of Remove and ⋯. No reference argues for redrawing layouts.

## Break-it findings

All are Risk / Not evidenced. None was reproduced.

| Scenario | Impact | Smallest check |
| --- | --- | --- |
| A restyle changes control order; a cook on Orders mid-service taps Remove by habit (ORDE-3 already shows the habit risk) | A wrong removal in service | Freeze control order; Remove before ⋯ on every list in a static check |
| A shared state merges empty and failed into one look (Minutes already does, KITC-1) | Staff read "nothing there" when the read failed | A test that the failed state differs from empty on every page |
| Mark returned (WAST-4) made to answer at once, offline: the loan shows Returned and leaves Still out | A loan looks returned when it is not | A no-signal test that keeps the loan listed and marked Not sent |
| Renamed Save dock classes meet an older lazy `manage.js` or `fnedit.js` saved on a phone | Save loses its dock until the page updates | Keep the old rules for one release or bump the module version; `tests/saved-copy.test.js` |
| A shared Try again that skips `liveRetry()` | Double taps start duplicate listeners, each costing reads | Route every Try again through the existing helper; a double-tap test with the read count |

## Recommendation

**Recommend: no restyle. A consistency sweep in four grouped pull requests**, so the phones reload four times, not eight or more:

1. **Service fixes**, no choice needed except one:
   - 44 px on the function band and cut-off bar (SHEL-1, SHEL-2, SYST-1).
   - Remove before ⋯ on Orders (ORDE-3).
   - Save delivery on the first screen (ORDE-1, needs the head chef's choice of where).
   - Taps and lines at 390 px before and after, including the bands on Prep.
2. **One failed-read and empty state across the book**, on the existing `.p-err`, `retrySoon()` and `liveRetry()`, with no second helper. Pages: Minutes, Mail, Guides, pings, Functions, Cleaning, suppliers, Deliveries, Wastage, Transfers and Earlier versions; plus Refresh on Drinks (KITC-1, KITC-4, FUNC-3, FUNC-4, ORDE-4, PREP-2, RECI-2, WAST-7).
3. **The head chef's 25 choices on one page**, then the contract and a stronger check. The choices cover the selected fill, the main button, destructive actions, the Save dock, the search box, empty states, day controls and the function form's Save. Name the chosen pieces in `docs/design-patterns.md`. Make `tests/design-patterns.test.js` check that pages use them (44 px, no colour outside the tokens, every failed read with a Try again, Remove before ⋯), failing on today's code first.
4. **Names, words and the cosmetic tidy**, by family. This includes one name each for Functions and Cleaning, slips that name the job, and colours moved onto the tokens.

Why this beats a restyle: it fixes every confirmed finding, including all four service ones, without moving what staff have learned. It costs four reloads, not eight or more, and the stronger check stops the drift coming back. The main downside: the 25 choices still need the head chef's time, and the function form stays the weakest page until its Save choice is made.

## Build

| Step | State |
| --- | --- |
| 1. Service fixes | Built as a draft on hold for the head chef to test, 19 Nov 2026. Delivery received: Save docked above the tab bar on a phone (ORDE-1). Orders: Remove before the ⋯ (ORDE-3). The band's minus, "+N more", Service view and the cut-off bar's supplier name take 44 px taps and look as before, with the bands no taller (SHEL-1, SHEL-2, SYST-1). A sent round's older Undo is 44 px. Measured at 390 px, before and after: Save delivery 266 px under the tab bar, now on the first screen; the bands 310 px both times; Prep lines on the first screen unchanged. `tests/service-targets.test.js`: 14 of its 23 checks failed on the old code. |
| 2 to 4 | Not started |

**Found while measuring step 1.** On a busy function day (three functions, a cut-off due) the two bands take 310 px of an 844 px phone. That leaves the head chef's Prep with one prep line fully on the first screen. Changing how the bands look or fold is the head chef's call, so step 1 leaves them as they are.

## Limits

- Not covered: sheets as drawn on screen (they were judged from source), the sous chef and function manager roles, measured contrast, and signed-out Home.
- 768 px was checked by the lead from screenshots only, not by the auditors.
- The verifiers were asked to refute findings. Nobody was asked to argue for a restyle; the skeptic named this. The council's five reviewers saw the case for it and none made it.
