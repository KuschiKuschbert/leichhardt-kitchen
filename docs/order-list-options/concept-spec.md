# Order list: three design previews

9 November 2026. Review only. Fictional examples. Nothing saves. No design is selected here.

Open `index.html` for the reviewer controls. Choose a design, chef or staff, a deadline state and a full viewport or three-phone comparison. A clean capture uses `index.html?design=a&shot=1&role=chef&state=normal`. All three use the same fonts, request fixture, steel workbook cover, warm paper, charcoal navigation, local orange Add and green completed state.

## A: Compact rows

Remove the global Orders cut-off band and all supplier nesting. A slim chef-only block puts every supplier deadline above the flat requests. Each deadline has its supplier link, absolute order-by time, delivery context and a distinct Order placed button. No supplier checkbox or supplier item counter remains.

- Advantage: all current deadlines and direct confirmation remain visible without opening anything. Confirmation is one tap once the row is in view.
- Cost: every additional deadline takes space before the requests. The six-deadline example deliberately exposes this tradeoff.
- Change size: the least rearrangement, but the Orders-specific global band and grouping still need removal.

## B: Requests first

A compact strip above requests names the nearest outstanding deadline and states the total due, other due and overdue counts. View scrolls to and focuses the full deadline block. On a phone the block follows the requests; from 1100 px it sits in a right column. No sheet or modal is used for deadlines.

- Advantage: more requests occupy the first phone screen. On a laptop both jobs remain visible.
- Cost: phone confirmation typically takes View, then Order placed. The user can also scroll there directly. A longer request list puts the full deadline block farther down the page.
- Change size: a responsive two-part layout and an explicit in-page jump. Every deadline remains available, including placed and tomorrow occurrences.

## C: One-line fold

One native disclosure near the page heading replaces the deadline block. The closed summary retains the nearest supplier, absolute time, total due and overdue count. It uses two readable lines on a narrow phone instead of shrinking the text. Opening it reveals all deadline rows and their explicit Order placed actions. It never opens itself during service.

- Advantage: the smallest persistent deadline presentation. Every deadline remains on the same page.
- Cost: closed-state confirmation takes two taps. The summary cannot show all supplier names and delivery dates at once. Checking the whole set requires opening it.
- Change size: a disclosure state around the same full deadline list, with a truthful derived summary.

## Shared preservation

All concepts keep the eight exact baseline requests: Milk 6 L, Brioche buns 4 packs, Coriander 2 bunches, Eggs 2 trays Out, Plain flour 5 kg, Cream 2 L Out, Tomatoes 3 kg and Butter 2 kg Low. Butter retains Since Sun 8 Nov and its original time. Synthetic Ann attribution and times match the baseline. Chef order puts Out first, then the older remaining request, then current requests by creation time. Staff retain the shared list without chef-only ticks or deadlines. No request displays a supplier label.

Used in recipe links remain for Eggs (Skillet Cookie Dough Prep and Cornbread), Cream (Creamy Garlic Sauce), Plain flour (Cornbread) and Butter (Cowboy Butter). These take real row space in the comparison. None of the row counts should be interpreted as a guarantee for different content, text sizes or devices.

Add request remains one tap from the page and uses the existing explicit form pattern. Submission is a second tap, excluding typing; amount stays optional. The form stays open after adding, as the current app does. Closing, Escape and backdrop dismissal work with a native modal dialog, and focus returns to its opener. There is no second Add control.

Chef item completion stays in place, shows a green tick and retains Undo on the tick and in its row menu. It does not reorder or automatically collapse the row. Ordered today becomes a separate optional summary after simulated completion. Item menus demonstrate amount changes and chef removal with a second tap and Undo. The synthetic staff role represents a staff member with Add; it has no Remove or completion controls.

Order placed confirms an order placed elsewhere, never a draft or a request allocation. Supplier confirmations and item completion have independent state in the preview. Supplier links, Delivery received, notification settings, recipe links, previous-day access and other navigation show simulation guidance; they do not navigate to or operate the live app. One chef-only page-level Delivery received control remains. Low and Out are chosen in Add, as in the current workflow.

## State examples

| Example | What it demonstrates |
| --- | --- |
| Two deadlines | At 14:00 Queensland on Mon 9 Nov, Northside Test Foods is due at 15:00 and West Bay Test Supply at 16:00, both for Tue 10 Nov. |
| Overdue | Both supplier occurrences remain unconfirmed and explicitly overdue. The B/C summary retains an overdue count. |
| Offline | The last known requests and supplier rows stay visible. Supplier confirmations are disabled. Simulated request edits/additions say Not sent and cannot imply a successful save. |
| Could not check | Failed checking is explicit. Known rows remain; a read failure never becomes an empty state. |
| No deadlines | Confirmed absence of today's supplier deadlines. All eight independent requests remain. |
| All supplier orders placed | Both supplier occurrences are confirmed with Undo. All eight requests remain pending, illustrating independence. |
| Six deadlines | Additional fictional suppliers make A grow; B/C retain total and overdue counts. No supplier is dropped from the full list. |
| Tomorrow / early order | Today's Northside occurrence is placed. West Bay's next occurrence is explicitly Tomorrow, Tue 10 Nov, for delivery Wed 11 Nov. Its button states For tomorrow and supports early confirmation and Undo. |

## Prototype limits and implementation boundary

This is plain local HTML, CSS and JavaScript with bundled fonts. It imports no application code and makes no API call, database read or write, storage access, notification subscription or live supplier connection. Reload or Reset discards every interaction. Preview confirmation feedback describes local examples, not server acknowledgement. The API `window.ORDER_PREVIEW.getState()` exposes a copy of the synthetic state for review; `reset()` clears it.

The request list scrolls with the page. Mobile Add stays above the existing six-tab bar; desktop uses the normal shell and an Add button in the workbook heading. Principal controls are at least 44 px. Inline recipe links preserve the current compact link treatment. The prototype does not emulate a phone virtual keyboard, safe areas or physical touch hardware. Keyboard close and focus return were checked in desktop Chromium.

This sketch does not validate real permissions, concurrent edits, reconnect behaviour, notification delivery, stored history or Firestore rules. Existing capability checks, source-day corrections, acknowledgement and Undo contracts must be preserved during any separately approved implementation. No new request status, data model, collection, listener, read, write or persistent private cache is proposed.

Measured screenshot counts, tap comparisons and council scores belong in the parent review brief. This file deliberately does not invent counts or choose a favourite.

## Copy refinement after the council

The council reviewed the initial Add to the order wording and a chevron-only C disclosure. The final previews use Add request across all three and a visible View/Hide cue on C. These apply reviewer suggestions without changing the layout options or adding a step. The original phone screenshots remain as previews/council-a-390.png, council-b-390.png and council-c-390.png. Scores were not rerun or presented as new ratings.
