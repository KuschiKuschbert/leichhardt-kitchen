# When an item's last purchase was an earlier order

9 November 2026. **A, Label the reference, selected by the head chef** ("okay lets go a"). The council and comparison below record the decision. Implementation is now authorised.

## Proposal for round 1

The supplier sheet already shows each product's most recent recorded quantity and Queensland date. That reference can come from an earlier supplier order when the newest order omitted the product. Both cases currently look alike. The head chef asks for a clearer indication that the displayed purchase was not in the latest recorded supplier order.

The users are authorised chefs preparing the next order. They should be able to distinguish a purchase in the latest supplier order, a known earlier purchase, no recorded purchase in fully checked history, and history not yet checked. Today they compare the item's date with the supplier-level latest-order date or open history. Two separate orders may share a date, so dates alone cannot establish which order supplied the reference.

Explore a visible indication, wording or a focused review view. Preserve the actual previous quantity and date, empty draft fields, catalogue sequence, current filters and record/retry behaviour. A neutral historical fact must not imply that someone forgot an item, that stock is low, or that it should be ordered automatically. Treat the user's wording as an indication on screen; voice announcements are not assumed.

## Known data and cost

The loaded history has immutable order IDs, recording timestamps and stable product IDs. `hist().byItem[itemId]` already contains the order and line used by each row; `latest()` identifies the supplier's newest recorded order. Comparing the two order IDs can identify a known earlier purchase with no extra database query, stored field, listener or polling. A count of intervening orders could also be derived only within the contiguous loaded history, but its usefulness needs review.

Supplier selection reads up to 20 orders plus one lookahead. Unseen items while more history remains are unknown, not never ordered. The earliest page is reused and further pages load only through Older orders. Failed reads and retry gaps must remain unknown. Reminder-only completion ticks contain no quantities and do not become supplier orders.

Likely application scope after a choice: `js/suppliers.js`, scoped CSS if needed, the lazy URL, focused supplier browser checks and the existing feature note. No new service, permission, schema, migration, public purchasing data or dependency is proposed. This design-only record changes none of those files.

## Service rules for reviewers

1. The main work remains one tap from its page entry. Recording a prepared draft currently uses Review order then Record order placed.
2. No new tab, top bar or tab bar button, or automatic pop-up.
3. Nothing covers a working list unless it prevents a mistake.
4. Added taps or lost visible rows must be measured and justified on a 390 px phone.

Synthetic baseline screenshots and fresh measurements accompany this proposal. They contain no real suppliers, purchasing records or staff.

## Council and design status

**Round 1: Build smaller, 5 of 5.** These are independent role-based agent reviews, not research with real kitchen staff. All five support a small clarification of existing references. They reject extra ordering taps, greater row height and unsupported suggestions that a product needs buying. Counts of intervening orders and a separate review route have not earned their complexity. No reviewer chose Don't build or Your call.

| Reviewer | Main concern | Improvement requested |
| --- | --- | --- |
| Cook mid-service | Comparing dates cannot be read in two seconds and may fail for same-day orders | Meaning beside the reference with zero extra taps and no added row height |
| Head chef | There is no evidence of error frequency or stock loss | Cheapest clarification of existing purchase references |
| Skeptic | The current reference already covers most needs | Keep four states clear; leave counts and another view out |
| New starter | Last order can be read as the supplier's newest order | Plain words without date comparison or an icon to decode |
| Keeper of the book | False certainty, cache gaps and saved-app delivery | Explicit state and retry checks; reuse loaded order IDs |

Baseline measurements at 390 by 844 using the project click-test stand-ins: first row starts at 488.30 px, is 234.97 px tall, and the Review bar starts at 708.63 px. There are zero complete item rows and one complete item heading in that initial viewport. Some reviewers called this one working row; the measured full-row count is retained here. No browser errors. `baseline-measurements.json` records the measurements; the screenshots show the initial view and the earlier item while reading the list.

## Round 2: three directions

All concepts use synthetic data and the existing supplier row, catalogue order, quantity controls and record flow. These are browser-only visual prototypes. Application files and saved data are unchanged. None adds an ordering recommendation or automatic speech.

[Three phone previews together](comparison.png). [Full gallery](index.html).

### A. Label the existing reference

The reference itself is labelled **Latest order** or **Earlier order**, followed by the quantity and date. Replace the existing phone label rather than add a warning. Show the status in the desktop cell too. No history or extra ordering tap is needed to interpret it. Strength: direct meaning with very little to relearn. Cost: the short status must fit beside the existing data at every text size. Earlier is a neutral fact, without a red warning.

### B. Compare latest and previous

Lead with **Latest order: Not ordered** for an omitted item, then show **Previous: 2 bags, Sat 31 Oct** underneath. An item in the newest order shows its quantity and date there. Strength: directly answers both what was in the latest order and the earlier amount. Cost: more words and a weaker visual emphasis on the quantity used as a reference. Empty history and failed or incomplete history retain distinct copy.

### C. Latest first, older details on demand

The main cell describes only the latest supplier order: its quantity/date or **Not ordered**. A known earlier purchase is available under the item's existing **Details** control. Strength: fewer facts on the order row, and no new control. Cost: one extra tap to see the older quantity/date and reduced usefulness for the original last-purchase request. The row must still indicate an earlier purchase exists, so it cannot silently hide that fact.

## Measured comparison for round 2

Measurements use visual DOM prototypes of the same local app and six synthetic products, with the project's click-test font stand-ins. They are not production tests or staff trials. Normal and Extra large text at 390 px and normal text at 768/1280 px show no sideways overflow or browser errors. `preview-measurements.json` holds the values.

| Measure | Current | A | B | C |
| --- | --- | --- | --- | --- |
| Extra taps to read previous quantity/date | 0 | 0 | 0 | 1, existing Details |
| Taps to record a prepared draft | 2 | 2 | 2 | 2 |
| Navigation levels within supplier workspace | 1 | 1 | 1 | 1, inline disclosure |
| Earlier item row, 390 px normal | 234.97 px | 234.97 px | 234.97 px | 234.97 px |
| Earlier item row, 390 px Extra large | 388.94 px | 388.94 px | 388.94 px | 388.94 px |
| Fully visible initial item rows, 390 px | 0, one complete heading | 0, one complete heading | 0, one complete heading | 0, one complete heading |
| Earlier item row, 768 px | 150.30 px | 150.30 px | 214.83 px | 214.83 px |
| Fully visible initial item rows, 768 px | 1 | 1 | 0 | 0 |
| Earlier item row, 1280 px | 150.59 px | 150.59 px | 178.89 px | 178.89 px |
| Added reads, listeners or rules | 0 | 0 | 0 | 0 |
| Estimated build | Existing | 1 small PR | 1 PR | 1 PR |
| Relearning | Existing | New label only | Latest-first interpretation | Previous reference moves into Details |
| Main risk | Ambiguous order membership | Small label must remain readable | Longer comparison and more row space at tablet width | Extra tap without measured row-height saving |

A uses the current phone label position for Latest order/Earlier order. On tablet/desktop it preserves the existing two lines and uses e.g. Earlier · 31 Oct on the date line, with the full recording time retained in the title. B and C both wrap more at 768 px. C's older quantity is also removed from the To order placeholder in this prototype, so a hidden value cannot look like a new order amount.

Round 2 asks the five council roles plus the screen designer to rank all three. Ranked points are 3 for first, 2 for second, 1 for third, maximum 18 per design. No preferred design is supplied to reviewers. The existing app already distinguishes unchecked/failed history from confirmed absence; the four-state rule is a guardrail to preserve, not evidence of a newly found data bug.

## Round 2 result and recommendation

Six fresh reviewers independently ranked **A, then B, then C**. There was no disagreement on ranking.

| Reviewer | A | B | C | Main caution |
| --- | --- | --- | --- | --- |
| Cook mid-service | 3 | 2 | 1 | Small muted status still needs a real glance check |
| Head chef | 3 | 2 | 1 | Keep a small clarification; no measured error frequency supports more |
| Skeptic | 3 | 2 | 1 | B adds words and C adds a tap without demonstrated benefit |
| New starter | 3 | 2 | 1 | Earlier should clearly mean absent from the latest recorded order |
| Keeper of the book | 3 | 2 | 1 | Preserve unknown states, consistent snapshot IDs and the saved module update |
| Screen designer | 3 | 2 | 1 | Screenshots do not establish contrast compliance or physical target sizes |
| Ranked points | **18** | **12** | **6** | Maximum 18 per design |

**Recommend A, with B's explicit meaning in the copy.** Keep the quantity prominent and label the reference Latest order or Earlier order. Earlier means Not in the latest recorded supplier order, even when both orders share a date. Use words as well as any visual emphasis. Keep quantity and date visible and keep the existing catalogue sequence and ordering controls.

The new starter and cook also questioned whether the existing quantity placeholder could look filled. The cook proposed C's neutral placeholder. That is an untested concern about an already approved hint, so it is recorded separately rather than bundled into this clarification. Keeper and designer suggested No previous record for confirmed absence; the existing four-state distinction must survive any wording change.

These are role-based judgements. No claim is made about actual staff speed, ordering mistakes or WCAG conformance. Before implementation is released, check small-status readability and contrast, long quantities and units, older-year dates, 320/390 px normal/enlarged text, same-day orders and the stated retry/paging boundaries. A's zero-height finding applies to the measured synthetic fixture.

## Chosen

The head chef selected **A** on 9 November 2026: "okay lets go a". Implement it in the existing reference cell. Keep quantity/date visible, preserve the current draft hint and ordering flow, and retain the existing unknown-history wording.

The phone uses Latest order / Earlier order in the current label position. Tablet and desktop use Latest / Earlier beside the compact date under the quantity, with the full date, time and membership meaning in the title. Dark ink makes the known status readable without warning colours. Compare immutable IDs from the current supplier's loaded history, including inherited split history; no added query, rule or stored field.

The lazy supplier UI advances from revision 22 to 23 while retaining its current API and the split-aware core/store. The implementation, verification and release are recorded in the pull request.

## Implementation evidence

The actual implementation was measured against the previous source with identical synthetic supplier records and the project test fonts. Every fixture row retains its height at 320 px Extra large, 390 px normal/Extra large, 768 px and 1280 px. At 390 px the earlier row remains 234.97 px (388.94 px with Extra large); at 768 px it remains 150.30 px, and the initial complete-row count remains one. No horizontal overflow or browser errors. [Measurements](implementation-measurements.json), [implemented phone](implemented-390.png), [implemented desktop](implemented-1280.png).

Computed known-status text contrast is 16.87:1 against the white paper token; date text is 7.13:1. Both exceed the AA text-contrast threshold. This is a contrast check, not a claim that screenshots establish full WCAG compliance.

The focused status file passes 43 checks, including same-day order IDs, old-year dates, long units, normal/enlarged widths, history selection, acknowledgement transitions and old-order replay after a failed newest-page read. All 22 supplier, design-pattern and read-budget files pass. Split-history coverage explicitly checks Earlier when a latest inherited batch omits the item. All records are synthetic; production purchasing records were not read or changed. CI and deployment remain recorded in the release pull request.

## Acceptance boundaries for any implementation

- Compare immutable order IDs, never date equality. An earlier purchase can be a second order recorded on the same day.
- Keep in-latest, known-earlier, confirmed-no-record and unchecked/failed history distinct. Never infer that an item was forgotten, unused or short of stock.
- Keep the previous quantity and date attached to the same stable product ID, including after catalogue reordering and additional orders.
- Keep number-only and explicit-unit snapshots unchanged. No automatic draft values, new records, listeners, history scans or new permissions.
- Check pending reads, retry gaps, acknowledgement races and the saved lazy-module update. Measure normal and enlarged text at 390 px and the tablet/desktop equivalents.
- Design A is selected. B and C remain alternatives for the decision record.
