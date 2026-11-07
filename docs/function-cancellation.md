# Function cancellation and edit access

25 Oct 2026: the head chef requested one-click cancellation from Functions for sous chefs, the head chef, function managers and the admin, plus a clear checkbox to give a person create/edit access.

- Cancel is a small action beside a confirmed function and on its sheet, including the manager's form. One tap cancels the saved booking. Nothing is deleted. Since 8 Nov 2026 (redesign step 5, head chef) it sits at the end of each card on Functions and alone in the last row of the function sheet, away from Print, with one line on what it does; the button, the people and Undo are the same.
- A signed-in sous chef or head chef may cancel without gaining create/edit access or access to booking contacts. Function managers retain their existing rights. The verified admin is also allowed. Ordinary staff cannot cancel or give themselves permission.
- Undo is available to the person who cancelled for two minutes, provided nobody changed the function afterwards. Undo restores its booked quantities, rounds and preparation work. Someone with full edit access may still use the existing confirmation flow later.
- Cancellation reads the latest server version once and refuses an out-of-date screen. Undo also reads the previous history version. These are tap-only reads, never polling or per-item reads.
- The booking, immutable history, prep changes and order changes are written in one batch through the existing write helper. Failed saves do not announce success. Current form edits stay on the device and are not silently saved by Cancel.
- Existing prep and order helpers are shared by the form and quick cancellation. Completed prep ticks and order ticks are retained. A past order gets an explicit correction notice when appropriate.
- Admin People labels the existing Functions checkbox **Create/edit functions**, with the accessible name **Create and edit functions for [person]**. It works without changing the person's kitchen role. Only the verified admin saves the permission list. No permission is granted to a named staff member merely by this code change.

No new stored fields or collections are required. Function editing and contact permissions remain separate from cancellation. The rules enforce the narrow status transition and matching history snapshot.

## Card actions and recovery (26 Oct 2026)

The managers' list puts a small Delete function action below each draft and cancelled card. Confirmed bookings must be cancelled first. Delete needs a second tap on that same function within four seconds. It sets the existing `removed` flag from the private-access update, leaves the booking cancelled and outside the kitchen queue, and keeps the exact previous version in immutable history. Contacts and unsaved form fields are never written by this action. Other bookings and their drafts stay unchanged.

Deleted records are excluded from Coming up, Drafts, Past, Cancelled and All. The separate Deleted filter offers Restore function to existing function editors and the verified admin. Restore keeps a new history version and returns the booking to Cancelled. It never confirms a booking or restarts prep/order work. Open a restored booking, review it and confirm it to put it back into service. A deleted booking opened by its old link shows recovery and history instead of an editable form.

Delete and Restore each read the latest function once, only on the action. They refuse stale versions and changed access, write the next version and matching history atomically, and show success only after acknowledgement. They never read booking contacts or fetch history per card. These actions reuse the existing function-edit rules and the `removed` field from the private-access release; no additional rules or collections are introduced here. The app/editor API is 7.

Visual checks with made-up bookings and people: [Functions on a phone](images/function-cancel-phone.png) and [the access checkbox on desktop](images/function-access-desktop.png). Browser journeys cover 390, 768 and 1280 px layouts.

Before release: run the browser journeys and Firestore emulator checks, publish the new rules from the feature branch with the existing Publish rules workflow, verify its lock probe, then merge the app. Rollback is a revert on a fresh branch; publish the preceding rules too if cancellation access must be removed.

## Saved staff capabilities

The approved [staff capability contract](staff-capabilities.md) adds booking-owned canonical generated bodies for cancellation and Undo by chefs without ordinary Add/Delete. Function editors publish them on each save; preparation adds them to existing bookings without changing versions or history. Status changes retain the matching bodies, identities, dates, completed ticks and correction notices. Functions editor API 10 requires a compatible app and model; an older cached editor keeps its draft and asks for a refresh before saving. Follow the preparation and publication order in that contract.

## Working rules (moved from CLAUDE.md, 3 Nov 2026)

Sous chefs, headId, function managers and the verified admin may cancel. Other editing and contact permissions still use fnIds. Cancel and the same person's two-minute Undo read the server, use version guards, keep matching immutable history and batch prep/order effects. Keep the shared helpers in `js/functions.js`; the form uses them too. Rules must pass the largest 12-line, 8-round batch and be published before this UI. The editor and app use API 10, loaded as `fnedit.js?v=7` with the compatible Ink in motion presentation. List/form deletion uses `setRemoved()` in `js/fnedit.js`, only for drafts/cancelled bookings. Deleted has explicit recovery that leaves the booking cancelled. The People checkbox grants create/edit access without changing a kitchen role; do not hardcode real staff names or grant a named person access as part of code authoring.
