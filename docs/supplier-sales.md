# Sales suggestions in Supplier order

Chosen 22 November 2026. Source implementation and synthetic checks complete. Leichhardt rules were staged and passed the live Lock probe before the client release.

## The Sunday job

Open **Chef hat → Supplier order** and choose **Import sales report**. The weekly input is one POS export in CSV or XLSX with **Product Name** and **Quantity** columns. Review the venue and exact seven completed trading dates, inclusive, in Queensland local time before publishing. Confirm the venue and dates when the export leaves them out. Combine repeated product rows within the report. Negative rows are shown for review. A chef can confirm their exclusion when they are adjustments outside this order, or choose a corrected report. Malformed quantities call for a corrected file.

The first trial is enabled in the Leichhardt book and uses confirmed protein links. Other venue copies use their own settings. Open the sales links editor from the workspace to link a report product to the relevant active catalogue item or items by stable supplier and item IDs. Confirm the quantity as bought per sale, allowing for cooking or trim loss, and its conversion to one catalogue order unit. Use **Ignore sales item** for an irrelevant report product. Missing, ambiguous and archived items require review. A changed pack, order unit, par unit or conversion pauses the link until the chef confirms it again.

The order sheet labels each matched quantity as a sales suggestion and shows which week it covers. Open its calculation to see the contributing sales, portions and conversions. The book sums the confirmed contributions for an item before rounding up once. Countable order units round to a whole unit and metric quantities to 0.001 of their order unit. The amount is a weekly estimate. The chef decides how to split it across deliveries and how to account for stock, demand and functions. The existing **On hand** and par suggestions keep their own controls. Confirmed links can be reused for the next report.

Publishing a report leaves every **To order** field as entered. **Use in draft** applies a single suggestion to an empty draft field and focuses that field for editing. When a field already holds a quantity, **Keep** and **Replace** show the actual draft amount alongside the suggestion with its unit and require a deliberate choice. **Review order** and **Record order placed** follow the existing flow. The chef places the order through the supplier's usual process. Only the existing recording action writes its history and linked confirmation. [Supplier workspace](supplier-workspace.md#behaviour)

## Council and choice

**Verdict: Build smaller.** Four of five reviewers voted Build smaller and one voted Build. The narrow trial tests whether one export and reusable links save Sunday ordering time compared with the workbook. All six reviewers ranked A first in round 2. These were independent role-based reviews using synthetic evidence. Timing with kitchen staff remains to be measured.

| Preview | Approach | Taps to apply one suggestion after report confirmation | Complete order rows at 390 / 768 / 1280 px |
| --- | --- | --- | --- |
| Before import | The existing manual job in the prototype | Manual entry | 2 / 4 / 2 |
| A, Inline | Amount and action beside To order | 1 for an empty field | 1 / 3 / 2 |
| B, Review first | Separate checklist followed by a batch action | 2 | 0 / 0 / 0 in checklist, then 1 / 3 / 1 on the order sheet |
| C, Sales list | Separate sales view, then focus the matching draft field | 2 | 0 / 0 / 0 in sales view, then 1 / 3 / 1 on the order sheet |

The head chef approved a small mix based on A. A keeps editable amounts visible beside the chef's work, following Todoist's quick-entry principle. B makes the amount being kept explicit. The mix carries that cue into **Keep** and **Replace** in the item row. The separate checklist and bulk apply were dropped to keep the draft in view. C contributes calculation disclosure and focus on the changed field. Things 3's principle of keeping occasional detail within reach supports using the disclosure in the item row and dropping the separate sales view. The exact mix was checked in the complete app with synthetic Firestore data.

The three original options were measured in synthetic Chromium with system fonts at 390×844, 768×1024 and 1280×844. The preview showed no sideways overflow and measured labelled buttons and non-checkbox inputs at 44 px or taller. A cost one complete row on phone and tablet and kept direct access to a visible **To order** box. In the synthetic preview, wrong-venue and duplicate samples were blocked, and Keep preserved a typed quantity. The prototype used synthetic chef access and a simplified shell. Its baseline, source revision `826aff9`, and measurements are design evidence.

In the implemented app, the import sits in the workspace heading and Sales links shares the existing item search row. The order sheet showed 0/1/0 complete rows and 1/2/0 visible order inputs at 390/768/1280 px, both before the import and after linking with the review closed. The desktop fixture had its first quantity below the fold in both states. Typing into a visible field still takes one tap. Use in draft without an existing amount takes one tap. Browser checks covered keeping or replacing a typed quantity, and returning focus to the field after applying a suggestion.

## Private data and read budget

The current report and links share one versioned document at `kitchens/<pin>/suppliersales/weekly`. It holds the latest approved seven-day period when available, normalised product names and quantities, confirmed links with their catalogue IDs and conversion details, and the current revision and writer metadata. An ignored link has no parts. The parser works in the browser. The original file, prices, sales values and margins are discarded. Real reports and product data belong in the private workspace.

A current authorised chef session can read the snapshot. A current canonical head chef or verified admin session can publish a report or edit links. The server enforces both operations in the venue's own kitchen. Shared screens use the normal lock and handover rules. A report review, pending action or response from a previous session must remain private to its original session. [Private access](private-kitchen-access.md#access-contract) and [device sessions](device-sessions.md#the-daily-boundary-and-work-in-progress)

One document is read on demand in Supplier order. Publishing or changing links checks the revision in a transaction before a single write. An identical retry leaves the existing document in place. A conflicting revision prompts a reload and fresh review. The current document is included in the existing private backups and kitchen-PIN copy. No sales data is read on startup, and there are no listeners, per-item reads, polling or persistent browser copy. [Firestore usage](firestore-usage.md#supplier-sales-suggestions-22-november-2026)

## Verification and release

- Exercise CSV and XLSX through the chooser and review. Cover wrong venue, dates other than seven completed trading days, duplicates, corrected files, failed or competing saves, and exact retry. Check the sums for several dishes contributing to an item, metric and pack conversion, and link invalidation after a catalogue change.
- Check the complete signed-in app with its reminders and review bar at 390, 768 and 1280 px, including enlarged text, long labels and reduced motion. Measure visible rows and access to **To order** before and after import. Verify 44 px controls, rendered contrast, visible keyboard focus, the Keep and Replace choices, and the one-field edit path. Use steel work edges, warm paper, named attention, explicit failure and green only for acknowledged success. [Design patterns](design-patterns.md) and [surface and state colours](surface-colours.md#selected-design)
- Verify slow and failed reads separately from a confirmed empty snapshot. Check saving, acknowledgement, failure, reconnect and explicit retry, with the form and typed quantities kept. Test lock and handover with private in-memory work and an in-flight request. [Action feedback](action-feedback.md#the-rule) and [loading and motion](loading-motion.md#behaviour)
- Run the browser and emulator role checks, including signed-out and staff refusal, sous chef read-only access and head chef/admin publication. Confirm that publishing, linking and applying suggestions do not record an order. Publish and verify the additive rules in the target venue before dependent client release. After Pages publishes, verify authenticated access and the live Lock probe separately. [Rules publication](rules-publication.md)
- Use the first authorised Sunday report to confirm the export shape, venue, protein links and conversions. Compare preparation time and the resulting orders with the workbook before extending the trial. Use actual supplier data only in the signed-in workspace.

Rollback can remove the sales controls through a compatible client revert. Keep the authorised snapshot private and keep the existing supplier catalogue, drafts and recorded orders compatible.
