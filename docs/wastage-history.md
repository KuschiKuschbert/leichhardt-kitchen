# Wastage history

Implemented from the design approved 25 October 2026. Release is gated by the
required Click tests check, rules publication and the live lock probe.

## Outcome

Admin panel, Reports, Wastage opens History first, with Summary and Daily reviews
beside it. Keep the book's existing fonts, colours, controls and responsive lists.
The staff Wastage page still logs today. Private history still requires the head
chef's verified Google account and the existing shared-device chef gate.

## Contract

- Periods: last 7, 14 or 30 days; this month to date; previous calendar month;
  previous three complete calendar months; custom inclusive dates, up to 366 days.
  7, 14 and 30 days are shared with the other admin reports (5 Nov 2026); the longer
  choices stay on Wastage, and an unsaved daily review keeps Wastage's own period.
- Dates use the book's Queensland clock. Display the exact start and end dates.
- Item search, section, reason, weekday, person and unit apply to History,
  Summary and CSV. Removed records are optional in History and CSV, clearly
  marked, and never count in wastage totals. Grams combine with kg; litres,
  portions and pieces stay separate.
- History lists date/time, item, amount, reason, section and logger. Notes expand.
  Use lvHTML for sorting, pagination and phone cards.
- Summary preserves daily patterns, reasons, repeated items and logging coverage.
  Compare with the immediately preceding period of equal length.
- Daily reviews lists the period's dates, saved reviews and the existing review
  editor, including its check for a newer review before replacing one. The
  editor keeps its own draft, apart from the one typed on the wastage page
  (rvTyped(), 28 Oct 2026), so its day arrows never drop the page's review, and
  Cancel edits asks a second tap before the words go. Save the review is off
  until something in it changed, here and on the wastage page, and the save
  refuses too, so an untouched review is never saved under another name. A
  space or a new line added is no change: rvTyped() compares the words the way
  the save keeps them (29 Oct 2026).
- A failed history read shows an error and retry. It never produces a successful
  empty report, a cached empty range or an apparently complete CSV.

## Storage and reads

Keep waste/<date>/lines/<id> and waste/<date> authoritative. No migration, new
collection or outside dependency. An owner-only collection-group list rule lets
the report query existing lines by their full document paths between two dates;
orders and transfers are outside those bounds. Reviews use one document-id range
query. Staff and sous-chef PIN sessions cannot run the history query.

Past ranges are read on demand and cached for the kitchen day. Today is read
fresh on opening and on Refresh. Filters and view switches reuse loaded records.
Only a complete read is cached. Past corrections stamp config/main.pastEdit.w (since 7 Nov 2026 with the days
they changed, wDays, wPrev and wFor, like prep and order fixes, so the nightly analysis and backup read just
those days again);
other admin devices discard older copies. No polling or per-day query loops.

Publish the additive owner-only read rule before merging the app. Existing
clients continue to work. Revert the app commit to roll back; saved waste and
reviews are unchanged. The additive read rule and w stamp validation can stay in place for older
clients. To remove the group query permission later, remove only that match and
keep w accepted while config/main.pastEdit contains it. Publishing an unchanged
older template would make older sous-chef stamps that preserve w fail. Saved
wastage and reviews need no rollback; older clients ignore the added stamp.

## Verification

- Nine affected click-test files passed locally, including date boundaries, leap
  years, year changes, a different phone time zone, old records beyond 60 days,
  matching filters/totals/CSV, removal failure, restore, partial-load failure and
  retry, cache invalidation, malicious text and object-key names, review conflict
  handling and shared-device access.
- Layouts checked at 390, 768 and 1280 px with no sideways overflow. The phone
  heading stays available to screen readers. Reference screenshots use only
  synthetic data: `images/wastage-history-phone.png` and
  `images/wastage-history-desktop.png`.
- Full rules checks passed locally: 593 core checks, 31 lock probes, 145 supplier
  checks, plus the new owner-only history and path-bound checks.
- Nightly learning, transfer-index and read-only history-query checks passed on
  the emulator. `scripts/waste-range-check.mjs` also runs before rules publication
  to prove the same range query works with the production indexes, without
  printing records or changing data.
- The required PR check runs the complete 127-file click suite and emulator
  checks. Publish the tested rules before merging; live click tests run after
  the Pages deploy.
- The existing read-budget fixture fell from 732 admin reads to 616 on first
  open, and stays at 28 on the same-day reload. No budget increase.

Official query guidance checked 25 October 2026:
https://firebase.google.com/docs/firestore/security/rules-query

## History entries first (22 November 2026)

In Admin › Reports › Wastage, the full-width History list comes before the range
totals. The period, exact dates, Refresh, Export CSV, view choices and existing
report-wide filters are above the results. **Search report** affects History,
Summary, totals and CSV. **Filter displayed entries** and the list's column
filters narrow the displayed results. The existing sort choices, row actions and
Show more controls stay with the list. Summary keeps the totals with its dates.
Daily reviews covers the whole selected range and keeps its independent draft,
Save and Cancel edits.

### Council and choice

**Verdict: Build smaller (5 of 5).** The 45-entry synthetic audit fixture put
the first History row at y1209 on a 390×844 phone, y1321 at 768×900 and y1230 on a
1280×800 desktop. The opening viewport showed zero complete entries at each
size. The council asked for a shorter path to History entries with the dated
export and report scope intact. The existing Transfers report jumps were
verified separately. This was a role-based review using synthetic records.

| Design | Structure | Trade-off |
| --- | --- | --- |
| A | Keep one History report and put its totals below the entries. Tighten the gaps around the existing toolbar. | One flow and no extra tap. Totals require scrolling under the currently displayed rows. |
| B | Separate the main list from a date, filter, totals and export rail on desktop. Put totals under a disclosure on smaller screens. | The rail exposes desktop entries sooner but narrows the table. Smaller screens gain less and require a tap to see totals. |
| C | Add a focused entry view with separate report and list filter disclosures. | Compact when selected, but adds a tap and can conceal active report-wide filters behind the disclosure. |

| Reviewer | Round 2 rank |
| --- | --- |
| Cook | A, C, B |
| Head chef reviewer | A, B, C |
| Skeptic | A, B, C |
| New starter | A, C, B |
| Keeper | A, B, C |
| Screen designer | A, C, B |

The owner delegated the choice for this cycle, and all six reviewers ranked A
first. A puts everyday entries first with the existing search, table and
navigation. This applies the useful Things 3 and Linear principles of a
full-width working list and direct access. For the all-three combination, keep
A's placement and C's precise scope wording in the existing inputs. B's
context rail and C's extra mode would make controls harder to locate across
devices. Keep both out of the build. The implemented layout uses the existing paper
surface, control colours, unit tiles and action targets.

### Implementation and checks

The DOM order puts the list ahead of the named range-total section. Empty list
filter containers take no space. The list and totals use the original
`lvHTML()` and `whTotals()` paths. This change adds no reads, writes, storage,
permissions or release dependency.

Matched captures of the full app on the Firebase stand-in used the same 45
records, note text and saved review from the audit, plus a synthetic amount
correction. The positions below give the first record's top relative to the
opening viewport, before scrolling.

| Viewport | Normal first row, before → after | Extra large first row, before → after |
| --- | ---: | ---: |
| 390×844 | 1,209 → 946 px | 1,535 → 1,263 px |
| 768×900 | 1,321 → 1,131 px | 1,553 → 1,316 px |
| 1280×800 | 1,230 → 1,041 px | 1,447 → 1,210 px |

The opening view still has zero complete records at those sizes. From the same
scroll position at the report's start, normal type shows two complete entries
on the tablet and one on the desktop, up from zero on both.

**Break-it findings in the local synthetic fixture**

- **Reproduced and checked.** The shared narrow toolbar clipped the
  **Filter displayed entries** wording in the initial build. The History list
  controls now wrap on a phone, and the Reason and Section filters share a row
  when they fit. The full label is readable at all three widths in Normal and
  Extra large text, with no horizontal page or table overflow in the captures.
- **Checked in the click tests.** List search and column facets preserve the
  report totals and identical CSV bytes. Report search changes the CSV, and
  custom dates agree with the export name and contents. The expanded action
  note, changed-from quantity, unit totals, Remove and Put back, saved review
  and its draft and cancel guard keep their original scope.
- **Checked in the click tests.** A failed range read shows its error, keeps
  export disabled and stores no successful empty range. Refresh recovers it.
  Staff and a shared device without the chef PIN do not query private history.
- **Trade-off.** History totals require scrolling below the displayed entries.
  Summary keeps them near the date.

[History click checks](../tests/wastage-history.test.js) ·
[Admin tile and control checks](../tests/admin-kit.test.js)
