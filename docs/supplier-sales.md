# Sales suggestions in Supplier order

Chosen 22 November 2026 and built. Checked with made-up data. Leichhardt's rules were published first and passed the live Lock probe before the book changed.

## The Sunday job

1. Open **Chef hat → Supplier order** and choose **Import sales report**.
2. Choose one POS export, CSV or XLSX, with **Product Name** and **Quantity** columns.
3. Check the venue and the seven trading days it covers (finished days, Queensland time, first and last day included). If the export does not say, confirm them.

Repeated product rows are added together. A negative row is shown for review: confirm it is an adjustment outside this order, or choose a corrected report. A quantity the book cannot read needs a corrected file.

### Sales links

The trial is on in the Leichhardt book, for confirmed protein links. Other venues use their own settings.

Open **Sales links** in the workspace. Link a report product to one or more active catalogue items (by their supplier and item IDs, which do not change). For each link, confirm:

- how much is bought per sale, with cooking or trim loss;
- how that converts to one catalogue order unit.

**Ignore sales item** hides a product that does not matter. A missing, ambiguous or archived item needs review. A changed pack, order unit, par unit or conversion pauses the link until a chef confirms it again. Confirmed links are used again for the next report.

### On the order sheet

Each matched amount says it is a sales suggestion and which week it covers. Open it to see the sales, portions and conversions behind it.

- The book adds up every confirmed part for an item, then rounds up once.
- Countable units round to a whole unit. Metric amounts round to 0.001 of their order unit.
- It is a weekly estimate. The chef decides how to split it across deliveries, and allows for stock, demand and functions.
- **On hand** and the par suggestions keep their own controls.

Publishing a report changes no **To order** field.

- **Use in draft** puts one suggestion into an empty field and puts the cursor there.
- When the field already has an amount, **Keep** and **Replace** show both amounts with their unit. The chef must choose.
- **Review order** and **Record order placed** work as before. The chef still places the order the supplier's usual way. Only Record order placed writes the history. [Supplier workspace](supplier-workspace.md#behaviour)

## Council and choice

**Verdict: Build smaller.** Four of five reviewers said Build smaller, one said Build. The trial tests one thing: do one export and reusable links save Sunday ordering time against the workbook? All six reviewers ranked A first in round 2. The reviews used made-up evidence. Time with the kitchen team is still to be measured.

| Preview | Approach | Taps to use one suggestion, after the report is confirmed | Whole order rows at 390 / 768 / 1280 px |
| --- | --- | --- | --- |
| Before import | The manual job today | Typed by hand | 2 / 4 / 2 |
| A, Inline | Amount and action beside To order | 1 for an empty field | 1 / 3 / 2 |
| B, Review first | A checklist, then one action for all | 2 | 0 / 0 / 0 in the checklist, then 1 / 3 / 1 on the order sheet |
| C, Sales list | A sales view, then the cursor in the matching field | 2 | 0 / 0 / 0 in the sales view, then 1 / 3 / 1 on the order sheet |

The head chef chose a small mix based on A:

- From A: the amount and its action beside the chef's own field (Todoist: quick entry where you work).
- From B: the amount being kept is shown, as **Keep** and **Replace** in the item row. The separate checklist and the one action for all were dropped, so the draft stays in view.
- From C: the calculation opens in the row, and the cursor goes to the changed field (Things 3: occasional detail within reach). The separate sales view was dropped.

The mix was checked in the whole app with made-up Firestore data.

### Measured

The three previews were measured in Chromium with system fonts at 390×844, 768×1024 and 1280×844. Nothing scrolled sideways. Every labelled button and input (not tick boxes) was 44 px or taller. A cost one whole row on phone and tablet and kept a **To order** box in view. A wrong-venue file and a duplicate were blocked, and Keep kept a typed amount. The previews used a simple shell and made-up chef access, from main at `826aff9`.

In the built book, Import sits in the workspace heading and Sales links shares the item search row. The order sheet showed 0 / 1 / 0 whole rows and 1 / 2 / 0 order fields in view at 390 / 768 / 1280 px, the same before the import and after linking with the review closed. On the desktop fixture the first amount sat below the fold both times. Typing into a field in view is still one tap. Use in draft on an empty field is one tap. Browser checks cover Keep and Replace on a typed amount and the cursor coming back to the field.

## Private data and read budget

The report and the links share one document with a revision number: `kitchens/<pin>/suppliersales/weekly`. It holds:

- the latest approved seven days, when there is one;
- product names and quantities, tidied;
- confirmed links with their catalogue IDs and conversions (an ignored link has no parts);
- the revision and who wrote it.

The file is read in the browser. The original file, prices, sales values and margins are thrown away. Real reports and product data stay in the signed-in workspace, never in this repo.

Who can do what, checked by the server in the venue's own kitchen:

- A signed-in authorised chef can read it.
- The head chef (canonical PIN) or a verified admin can publish a report or change links.

Shared screens use the normal lock and handover. A report under review, a pending action or an answer from an earlier session stays with that session. [Private access](private-kitchen-access.md#access-contract), [device sessions](device-sessions.md#the-daily-boundary-and-work-in-progress)

Reads: one document, read only when Supplier order asks for it. Nothing at startup, no listeners, no per-item reads, no polling, no copy kept in the browser. A publish or link change checks the revision in a transaction, then writes once. The same retry twice changes nothing. A clash with a newer revision asks for a reload and a fresh review. The document is in the private backups and the kitchen PIN copy. [Firestore usage](firestore-usage.md#supplier-sales-suggestions-22-november-2026)

## Verification and release

- CSV and XLSX through the chooser and the review: wrong venue, days other than seven finished trading days, duplicates, a corrected file, a failed or clashing save, the same retry. Sums for several dishes into one item, metric and pack conversion, a link paused after a catalogue change.
- The whole signed-in app with its reminders and review bar at 390, 768 and 1280 px, with large text, long labels and reduced motion. Rows and **To order** in view before and after import. 44 px controls, contrast, keyboard focus, Keep and Replace, the one-field edit. Steel work edges, warm paper, named attention, a failure that says so, green only for success the server confirmed. [Design patterns](design-patterns.md), [surface and state colours](surface-colours.md#selected-design)
- A slow or failed read is never shown as "nothing there". Saving, confirmed, failed, back online and Try again all keep the form and typed amounts. Lock and handover with private work and a request still in flight. [Action feedback](action-feedback.md#the-rule), [loading and motion](loading-motion.md#behaviour)
- Browser and emulator role checks: signed out and staff refused, sous chef read only, head chef and admin publish. Publishing, linking and using a suggestion never record an order. Publish the added rules at the venue before the book that needs them, then check signed-in access and the live Lock probe after Pages publishes. [Rules publication](rules-publication.md)
- The first real Sunday report: check the export shape, the venue, the protein links and conversions. Compare the time and the orders with the workbook before the trial grows. Real supplier data only in the signed-in workspace.

Rollback: revert the client change to take the sales controls off. Keep the snapshot private, and keep the supplier catalogue, drafts and recorded orders working.
