# Back actions

Accepted 24 Oct 2026. Keep the current layouts, fonts, buttons and permissions. Make it clear how to return from a
task without losing work. A back action never submits a form or records an order.

## Page return

The top of each main page has a 48 px Back button that names its destination. It returns through the pages opened
in this run of the book. Opening or reloading a direct link starts a fresh trail: a nested recipe returns to its
parent, a guide to Guides, a function to Functions, a supplier to Supplier order and a primary page to Kitchen Book.
Settings Done follows the same rule. Existing All recipes, All guides, breadcrumbs and navigation tabs still work.
The recipe Back sits in its existing trail. On the prep list, a compact Back fits beside Writing as, with the full
destination in its accessible label and title. These keep recipe headings and the first prep line high on a phone.

The route trail and scroll positions live only in memory. Browser history holds an opaque entry key, alongside
the existing sheet marker. It holds no form values, catalogue items or staff details. A contextual page return
skips a stale same-address sheet entry left by a link, so one press reaches the destination on its label. Ordinary
phone Back and Forward keep their normal history behaviour. The existing recipe shelf return still positions the
opened plate and keeps the recipe search and filters.

## Task return

| Task | Back behaviour | Unfinished work |
| --- | --- | --- |
| Supplier review or history | Return to its draft | Quantities stay in memory |
| Supplier catalogue, item, settings or import | Step to the containing catalogue, then order | Edited forms and imports ask for a second press before discard; typing disarms it |
| Supplier pending save or uncertain recording | Keep the current step | Back stays unavailable until the outcome is known |
| Recipe or drawing editor | Return to recipe list or parent recipe | Flush the latest edit into the existing device draft before navigation |
| Function editor or review | Return to all functions or form | Keep the existing device draft, including a focused date or time entry |
| Chef staff, pings or minutes panel | Close the nearest editor or preview before its panel | Existing discard checks apply; an unfinished ping or minutes draft can be reopened |
| Guide editor | Return to Guides | Existing discard check applies |
| Open sheet | Phone Back closes the sheet first | Closing does not save or mark a ping read |

Native close-first sheet handling covers guide zoom, shift pings, section selection, line actions, admin section
jumps, function details, wastage reasons and kitchen mail nudges. Close, Cancel, Escape and backdrops remove the
sheet's temporary history step. Admin jumps wait for that step to settle before scrolling, so native scroll
restoration cannot undo the jump.

Supplier drafts and catalogue forms remain private memory state. They clear on identity change and do not survive
a reload. A retained supplier form belongs to its original supplier; visiting another supplier cannot display or
save that form under the new supplier.

## Boundaries and evidence

No schema, rule, role, query, listener or persistent cache is added. Existing read budgets and save paths apply.
Date selection, search, filters and admin tabs remain local controls without extra browser history entries.
Lazy editors use revised script addresses and API checks so an older delivered module asks for an update.

`back-navigation`, `local-back-navigation`, `editor-navigation` and `supplier-navigation` cover contextual returns,
direct links, Back and Forward, draft recovery, discard checks, blocked saves and native sheet closing. Existing
admin navigation, supplier save, permissions, offline, read-budget and full click suites remain release gates.
