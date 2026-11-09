# Orders as the shared request list

9 November 2026. Design review only. The owner has asked to see the council and designs before implementation.

## The kitchen job

The owner explained the workflow: all staff add items that need ordering on the Orders page. The owner then chooses the items on the separate supplier order list and manually places the order through the external ordering system. Adding a request, preparing a supplier order and placing it are different actions.

The owner reports that Orders looks odd because requests appear beneath suppliers. They support returning it to a simple request list and also ask for a smaller supplier cut-off area. This is an everyday service page on phones, a shared tablet and a laptop. Frequency and severity have not been measured with staff.

## What happens today

Source review and synthetic browser checks show that staff get a plain list, while chefs get requests grouped under active supplier cut-offs. Matches use catalogue names or confirmed aliases. This neither assigns a supplier permanently nor copies the request into a supplier order. Supplier completion ticks stop reminders; item completion ticks mark requests ordered. Neither ticks the other.

The grouped view can say Ordered by a chef and 0 of 2 items ordered at once. It places unknown matches first, repeats delivery links, renders empty supplier groups and separates older requests below them. Matching across separate cut-offs chooses the first match. A known supplier without a currently shown cut-off cannot claim its item.

Current-runtime baseline images and measurements are in `previews/current-*` and `baseline-measurements.json`. These use made-up records and the app's actual fonts, not production kitchen data. The fixture has eight requests, two urgent items, one older request and two supplier deadlines. It is a comparison fixture, not evidence of the frequency of these states in the kitchen.

## Proposal for review

1. Keep Orders as one shared list of outstanding requests. Keep amount, urgency, age, authorship, row actions, Undo, not-sent feedback, previous-day access for chefs and Ordered today. Put urgent requests first for chefs. Older outstanding requests remain findable with their original age and attribution.
2. Remove automatic supplier nesting and No supplier yet from this page. Supplier selection and preparation remain in the existing supplier workspace. Do not add automatic purchasing, transfer, allocation or a new request status.
3. Give supplier deadlines a smaller, separate chef-only treatment on Orders. Preserve supplier names, absolute order-by times, delivery date context, all deadlines, overdue/unconfirmed states, completed state, early orders, Undo, offline/failed state and notification controls. Preserve a clear existing route to supplier order preparation. Compare how much stays visible and what requires a disclosure tap.
4. Keep item completion and supplier-order confirmation distinct in words and controls. A supplier confirmation does not tick requests. Nothing is called ordered because it was added to a draft.
5. Keep the existing Add entry one tap from Orders, use the notebook styling and readable type, and retain 44 px controls. Reduce repeated information and spacing before shrinking text or targets. A single page-level Delivery received link is sufficient.

## Costs and scope

The proposed implementation would mainly touch the Orders and cut-off renderers in `js/prep.js`, scoped styles in `css/app.css`, and the matching tests/docs. No new database collection, rule, listener, request status, private persistent cache or external service is proposed. Removing grouping should remove Orders' catalogue query and its lazy supplier-matching dependencies; supplier workspace behaviour must remain unchanged. Existing cut-off reads and writes remain. Exact savings require implementation measurement.

Risk: losing a cut-off, confusing two independent completion actions, hiding an urgent/older request, moving rows under a tap, breaking offline Undo, or inadvertently changing the cut-off display on other pages. The concepts must specify these states. Current work is docs and previews only, with no application edits or live data reads/writes.

## Service rules for every reviewer

The main job is one tap from its tab. No new tab, top-bar button, tab-bar button or pop-up is authorised by this preview request. Nothing appears over the list during service unless it prevents a mistake; the existing explicit Add sheet remains. Any added tap or lost visible request must be measured and justified at 390 px. The owner chooses the design before implementation.

## Review method

Five fresh role-based reviewers assess whether to build this proposal. If the verdict is Build or Build smaller, three distinct concepts will be drawn: least change, a different organisation of the work, and the most reduced presentation. Six fresh reviewers, including the screen designer, then rank and score the rendered concepts. This is simulated role-based analysis, not interviews or research with real staff.
