# A panel for the chefs

8 November 2026. Proposal only. Requested by the owner: alongside the admin panel unlocked by the admin email, can the head chef and sous chefs have a panel?

Design history: the owner subsequently chose a dedicated panel like the real admin implementation. See [the chosen contract and verification](brief.md). The proposal below records the earlier discovery, not a pending design choice.

## Problem and proposed outcome

The two PIN chef roles already have operational tools, but reach them through the chef hat's long list. A Head chef PIN also sees Admin panel, which asks for Google. A sous chef has no named panel. The owner wants a clear place for these roles. We have no measured evidence of how often people struggle to find those tools.

Propose one Chef panel, using the current personal PIN session and canonical headId/sousIds. It says Head chef panel or Sous chef panel for the person signed in. Reuse the book's existing look and actions. Owner administration remains a separate destination. Compare a grouped desk, a shift notebook and a smaller menu-only alternative before choosing.

The first version gathers links/actions, not another reporting system: Today's team, Chef to-do, Shift pings, Manage staff, Meeting minutes and sign-off register, Recipes & drawings, Supplier order, Delivery received, Functions, Prep and Orders history. Kitchen mail follows sousMail. Function booking follows fnIds. Supplier catalogue editing is Head chef only. Add/Tick/Delete capabilities still apply. Staff role/permission changes still await admin approval; PIN resets stay admin-only.

Do not broaden access to admin analytics, training assessments, reference records, waste/transfer/delivery history, kitchen settings, guide/minutes editing, backups or security controls as part of this navigation change. No claim that the user's requested panel rules are settled until they choose.

## Current evidence

Source: latest main eedbdd7. Canonical access: docs/private-kitchen-access.md, docs/device-sessions.md, js/prep.js (canBrowse, chefMenu, chefOpen, bookEdit, supplierRead, supplierEdit, mlReader), firestore.rules. The current Head chef hat omits Kitchen mail even when shared mail is enabled; any new link must preserve the mail check and cover that case.

Mocked browser captures in previews/ use only the repository's synthetic people and test PIN. No production data or writes.

- current-sam-390-prep.png and current-ann-390-prep.png: three complete prep rows visible on a 390 x 844 phone, with part of a fourth, from a six-line fixture. Measured using row bounds, ancestor clipping and elementFromPoint at the top and bottom of each row to exclude the fixed Add bar and tab bar.
- current-sam-390-hat.png and current-ann-390-hat.png: current chef menus. From a closed hat, Today's team, Shift pings, Chef to-do and Manage staff are each two taps. No Google is needed for those actions.
- current-sam-1280-hat.png, current-ann-1280-hat.png and current-admin-1280.png: laptop menu and owner panel. Admin fixture opens Reports, its saved test destination.
- All four PIN-role captures had zero page errors and no sideways overflow. This fixture is a baseline, not a busy-service capacity claim. The first count incorrectly included rows covered by the fixed Add bar and tab bar. The cook reviewer noticed the screenshot did not support it; it was corrected before design comparison.

## Cost and safeguards

A link-based panel should add no database read, listener, schema or rules change on open. Destination pages retain their own loading and existing read costs. New summaries would need a separate read budget and permission audit. Do not read destination pages to fill badges. A page implementation would touch routing/menu, prep access/navigation, styles and focused browser tests, plus the project notes. Reuse existing editors and their drafts rather than embed second copies. Role changes, daily/shared locks and handovers must close private panel state.

Primary service tasks stay one tap from their tabs. No automatic popup or extra top/tab-bar button is proposed. Entry is through the existing chef hat. If a panel is chosen, keep the existing direct service links so routine actions do not acquire a compulsory intermediate page. Measure panel and menu at 390, 768 and 1280 px. Scope and layout are awaiting the owner's choice.
