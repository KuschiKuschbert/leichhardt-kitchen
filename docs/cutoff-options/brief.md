# Order cut-off patterns and reminders: options

Requested 5 November 2026. The head chef's words: "for some of my suppliers the 2 days prior or 4 days prior doesn't apply. For one supplier, if I need an order for Wednesday I have to order it before Friday 4 pm. Another supplier, if I need something for Friday it has to be in by Tuesday 4 pm. Can we consider those patterns as well on top of the normal cut-off times, and redesign the cut-off times with the reminders as well?"

**Status: chosen and built, 5 November 2026.** The head chef took the recommendation ("okay without breaking anything lets go with your recommendation"). See Chosen and Build below. `index.html` in this folder is the working comparison (open it in a browser): today's book, the shared core and the three designs, drawn with the book's colours and fonts. Every supplier and time in it is made up, except the supplier names the book already offers (PFD, Simon George). Nothing in it saves. The baseline is `main` at `64cc6b4`.

## Today

Measured on 5 November 2026 in the click-test stand-in (`tests/fake/`), Thursday 12:30, with four suppliers: PFD (Monday to Saturday, the day before, 14:00), Simon George (Monday and Thursday, the day before, 14:00), Coast Seafood (Monday the day before 14:00, and Wednesday's order by Friday 16:00) and Dry Goods Co (Tuesday the day before 14:00, and Friday's order by Tuesday 16:00).

- Each supplier is one row: delivery days, one cut-off time, one "Order closes" (the same day to 2 weeks before, the same for every delivery day) and one "Remind us" (4, 6 or 8 hours before, or all day). `js/cutoffs.js`, `config/main.cutoffs`.
- A special pattern on top of the usual one needs a second supplier row with a made-up name ("Coast Seafood Wed"). It gets its own bar line and tick, and the supplier catalogue can link only one of the two rows. Six rows for four suppliers: 2,407 px on a laptop, 3,015 px on a phone (`previews/today-settings-1280.png`, `previews/today-settings-390.png`).
- "Order closes" counts days ("5 days before"), so the head chef counts back over a weekend. The summary reads "Order by 16:00 Fri for 5 days later".
- Reminders start at most 8 hours before the cut-off, on the cut-off day only. On Thursday 12:30 the Order list shows PFD only; Coast Seafood's Friday 16:00 cut-off for Wednesday is not mentioned until Friday 12:00 (`previews/today-orders-390.png`). The bar says "for Tuesday" with no date.
- A sous chef ticks a supplier's order in 1 tap on the Order list; adding an order line is 1 tap. Neither changes in any design.

## Round 1: should we build it?

Five fresh reviewers, 5 November 2026, from the proposal and the screenshots above. Role-based analysis, not research with real staff.

**Verdict: Build smaller (3 of 5).** The head chef, the skeptic and the keeper of the book said Build smaller; the cook mid-service and the new starter said Build.

- What all five agreed: pick the order-by weekday instead of counting days; name the date in every reminder ("for Wed 11 Nov"); the sous chef's one-tap tick stays.
- Cut from the proposal: no new reminder setting (the heads-up is automatic); a short push window for the heads-up, so the push job reads little; refuse two different times on one day for one supplier (one tick covers a day); one data model, where each delivery day stores its own order-by day and time and "N days before" is only a fill.
- Added: the heads-up line can be ticked, so ordering a day early stops the next day's reminders (cook); old copies of the book keep each supplier's earliest cut-off, so they remind early, never late (keeper); a heads-up must not look like an order due now (new starter).
- Disagreement, head chef and skeptic: both of the head chef's examples fit today's rows if each supplier delivers once a week ("5 days before", "3 days before"). Per-delivery-day patterns matter only for a supplier that delivers on several days with different order days. The head chef's request says "on top of the normal cut-off times", which reads as that case.
- Disagreement, keeper: leave a full page redesign for later; setup happens a few times a year.
- Two reviewers noticed the first bar screenshot used other test suppliers than the settings screenshot. Every screenshot now uses the one set above.

## In every design (the smaller core)

1. **Each delivery day knows its own order-by day and time.** "Wednesday delivery: order by Friday 16:00." "The day before at 14:00" is a quick fill, not a second rule, so nothing hides which rule wins. Order-by days reach back up to 6 days; 1 or 2 weeks before stays a fill choice.
2. **Reminders name the date**: "for Wed 11 Nov". Two deliveries ordered at the same time on the same day are one order and one tick: "for Mon 9 and Wed 11 Nov".
3. **A heads-up the day before**, only when an order closes 2 or more days before its delivery: one line under "Tomorrow, heads-up" on the Order list's supplier list, which can be ticked (the shared ticks already cover today and tomorrow, so ticking it stops the next day's bar and pushes), and one push at [15:00, between services, to confirm]. Never on the bar over every page.
4. **Clashes are refused.** One supplier cannot close at two different times on the same day.
5. **24-hour times** on the setup page ("16:00", never "04:00 PM").

Cost, the same for all three: no rules change (`config/main` is written only by the head chef's verified Google account; the rules do not check the cut-off shape). Phones: no new reads or listeners. The push job: a heads-up window of 1 hour, about 12 reads a day more. Saved data: one optional field per supplier in `config/main.cutoffs`; the old fields (`dd`, `at`, `pre`) keep each supplier's earliest cut-off, so an old saved copy of the book reminds early, never late, and an old copy's People save (a full write of `config/main`) drops only the new field. Files: `js/cutoffs.js` (the phones and the push job both run it), the Order cut-offs page, the bar and tick list in `js/prep.js`, `scripts/cutoff-push.mjs`, the supplier pages' delivery date, and tests (`tests/cutoff-lead-days.test.js`, `tests/order-cutoffs.test.js`, `tests/cutoff-push.test.js`).

Service view, every design: `previews/core-phone.png` (a sous chef's Order list, Thursday 12:30). One more row on the supplier list, the day before a long-lead cut-off only.

## The three designs

| | A. The usual rule, then each day | B. The order week | C. One line per delivery day |
| --- | --- | --- | --- |
| Idea | Changes the least. Today's form stays; an "Each delivery day" box under it lists every day, folded when all are usual. Change one day in place: it turns orange, with Back to usual. | Rethinks the flow. One week grid for every supplier: an orange box on each order day, a Delivery mark on each delivery day. Tap a supplier to edit in a side panel (a sheet on a phone), order first: "Order by Fri 16:00, arrives Wed". Reminders set once for all. | Removes the most. A card per supplier with one line per delivery day, "Wed delivery, order by [Fri] [16:00]", and the next real dates beside it. Same for all fills every line. Order closes, Remind us and How reminders work go: one reminder plan, written once. |
| Good | Least to relearn; normal suppliers look as today; keeps Remind us | The whole week at a glance; clashes and gaps stand out; order first, as suppliers say it | What you see is what is saved; real dates catch a wrong day before Save; fewest controls and taps |
| Not so good | Two places set a time (usual and changed), even though one is saved; longest per supplier | Biggest build; seven columns cramped at 390 px; two levels; per-supplier reminder choice goes; most to relearn | A six-day supplier has six lines; the Remind us choice goes; a new look |
| Screenshots | `previews/a-lap.png`, `previews/a-ph.png` | `previews/b-lap.png`, `previews/b-ph.png` | `previews/c-lap.png`, `previews/c-ph.png` |

Measured on the previews and today's book. Taps: the head chef adding "Coast Seafood also delivers Wednesday, ordered by Friday 16:00" to a supplier that already delivers Monday, up to and including Save; a dropdown counts as 2 taps, typing a time is not counted.

| | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Set the special pattern | 7 taps, only as a second row with a made-up name | 7 taps | 8 taps | 6 taps |
| Tick a supplier's order (sous chef) | 1 tap | 1 | 1 | 1 |
| Rows on the phone's supplier list, Thu 12:30 | 1 | 2 | 2 | 2 |
| Setup page height, laptop (1000 px column) | 2,407 px | 1,693 px | 766 px | 1,482 px |
| Setup page height, phone | 3,015 px | 2,834 px | 866 px (sheet open) | 2,305 px |
| Navigation levels | 1 | 1 | 2 | 1 |
| Build size | | 2 pull requests | 3 | 2 |
| Relearning | | Little | Most | Some |
| Reminder choices | Per supplier | Per supplier | Once for all | None: one plan |
| New reads, rules | | Push job about 12 reads a day; no rules | the same | the same |
| Risk | | Lowest | Highest (new grid and sheet) | Low |

## Round 2: scores

Six fresh reviewers, the same five plus the kitchen screen designer, each shown all three designs and the measurements above. **C ranked first by 5 of 6.**

| Reviewer | Ranking | What they would take into the best one |
| --- | --- | --- |
| Cook mid-service | C, B, A | A's fold for days that are all the same; the heads-up must not look like the order tick, or a cook ticks it to mean "noted" |
| Head chef | A, C, B | Build A, with C's "Next:" dates; drop Remind us only if every supplier uses the same value |
| Skeptic | C, A, B | A's fold; Fill only inside it. The real need for different order days per delivery is the head chef's word, not shown in data |
| New starter | C, A, B | A's orange mark on a day that differs; "Set every day" instead of "Fill", asking before it overwrites a different day; the heads-up button says what it does |
| Keeper of the book | C, A, B | A's fold, one fill per supplier; check that tomorrow's tick is allowed (it is: `tests/rules/client-shapes.test.mjs` already ticks tomorrow), the read budget, one push for two deliveries closing together, and a node test that older copies remind early, never late |
| Kitchen screen designer | C, A, B | A's orange tint so the special day stands out; full-size buttons; B's week grid only as a laptop summary later, if ever |

B was last or second-last for five reviewers: two levels, three pull requests, and a grid that drops "for Wed" at 390 px. The skeptic read "an early one from the night before" in C's reminder note as new; it is today's rule for an early cut-off (since 24 Oct 2026), unchanged.

## Recommendation

**C, with A's fold and orange mark** (`previews/r-lap.png`, `previews/r-ph.png`; as built: `previews/built-settings-1280.png`, `previews/built-settings-390.png`, `previews/built-orders-390.png`):

1. One line per delivery day with its order-by weekday and time and the next real dates (C). What you see is what is saved.
2. A supplier whose days all follow one rule shows that rule once until **Change one day** (A's fold), so PFD stays one line.
3. A day that differs from the others is tinted orange and marked **Different** (A).
4. **Set every day the same** per supplier, which asks for a second tap when it would change a different day (new starter).
5. The heads-up line has an **Ordered already** button, not a tick box (cook, new starter).

Why: it holds the head chef's pattern with no made-up second row, shows the result in real dates, and keeps the familiar one-rule look for most suppliers. It needs no rules change and no new reads on the phones.

## Chosen

**5 November 2026: the recommendation.** The head chef's words: "okay without breaking anything lets go with your recommendation". Recorded at the top of `docs/head-chef-decisions.md`.

"Without breaking anything" decided three details while building:

- **Remind us stays per supplier** (one box on each supplier). Taking it away would have changed the reminders of any supplier set to 6 or 8 hours or all day. The recommendation allowed keeping it.
- **The Delivery days chips stay**, as before: ticking a day adds its line with the rule most of the other days follow, unticking removes it. One tap, nothing to relearn, instead of an "Add a delivery day" button.
- **The night-before rule for an early cut-off is unchanged.** The "[20:00] the night before" idea in the preview's reminder note was not built.

The heads-up push goes at 15:00 the day before, as the recommendation said (between services). It is one number (`HEADS` in `js/cutoffs.js`) if the head chef wants another time.

## Build

One pull request, 5 November 2026 (this folder's).

- `js/cutoffs.js` (version 2): `days`, a line per delivery day { d, pre, at }; `dd`, `at` and `pre` saved beside it at the line that closes earliest, so an older copy of the book reminds early, never late. Two lines that close on the same day are one order and one tick, at the earlier time. `forText(c, day)` names the delivery dates. `headsAt()`, `next()` and `clash()`.
- `js/prep.js`: the Order cut-offs page as recommended; Save refuses a clash and says which days; the bar, tick list, supplier pages and the Dashboard's week say "for Wed 11 Nov"; **Tomorrow, heads-up** under the supplier tick list (and under the supplier groups, and on Chef to-do to see only) with **Ordered already**, which writes tomorrow's existing tick.
- `scripts/cutoff-push.mjs`: the heads-up push at 15:00 the day before, within the hour; dated push words.
- Measured after the build, the same four suppliers, Thursday 12:30, test stand-in: the setup page is 2,405 px on a laptop and 2,836 px on a phone (today's book needed six rows, 2,407 and 3,015 px). Setting "Coast Seafood also delivers Wednesday, ordered by Friday 16:00": 7 taps plus typing the time (Delivery days 3, Change one day 1, Order by 2, Save 1); before, only a second supplier row with a made-up name. A sous chef's tick is still 1 tap; the Order list has one more row the day before a cut-off 2 or more days ahead.
- Tests: `tests/cutoff-patterns.test.js` (new), `tests/order-cutoffs.test.js`, `tests/cutoff-lead-days.test.js`, `scripts/emulator-check.mjs` (the heads-up push on the emulator).

## Files

- `index.html`: the comparison page with the live previews.
- `previews/`: the screenshots above, taken from the click-test stand-in (today) and from `index.html` (the designs).
