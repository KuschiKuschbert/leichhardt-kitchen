# Function cancellation and edit access

25 Oct 2026: the head chef requested one-click cancellation from Functions for sous chefs, the head chef, function managers and the admin, plus a clear checkbox to give a person create/edit access.

- Cancel is a small action beside a confirmed function and on its sheet, including the manager's form. One tap cancels the saved booking. Nothing is deleted.
- A signed-in sous chef or head chef may cancel without gaining create/edit access or access to booking contacts. Function managers retain their existing rights. The verified admin is also allowed. Ordinary staff cannot cancel or give themselves permission.
- Undo is available to the person who cancelled for two minutes, provided nobody changed the function afterwards. Undo restores its booked quantities, rounds and preparation work. Someone with full edit access may still use the existing confirmation flow later.
- Cancellation reads the latest server version once and refuses an out-of-date screen. Undo also reads the previous history version. These are tap-only reads, never polling or per-item reads.
- The booking, immutable history, prep changes and order changes are written in one batch through the existing write helper. Failed saves do not announce success. Current form edits stay on the device and are not silently saved by Cancel.
- Existing prep and order helpers are shared by the form and quick cancellation. Completed prep ticks and order ticks are retained. A past order gets an explicit correction notice when appropriate.
- Admin People labels the existing Functions checkbox **Create/edit functions**, with the accessible name **Create and edit functions for [person]**. It works without changing the person's kitchen role. Only the verified admin saves the permission list. No permission is granted to a named staff member merely by this code change.

No new stored fields or collections are required. Function editing and contact permissions remain separate from cancellation. The rules enforce the narrow status transition and matching history snapshot.

Visual checks with made-up bookings and people: [Functions on a phone](images/function-cancel-phone.png) and [the access checkbox on desktop](images/function-access-desktop.png). Browser journeys cover 390, 768 and 1280 px layouts.

Before release: run the browser journeys and Firestore emulator checks, publish the new rules from the feature branch with the existing Publish rules workflow, verify its lock probe, then merge the app. Rollback is a revert on a fresh branch; publish the preceding rules too if cancellation access must be removed.
