# Public recipes and private kitchen access

Approved by Kuschi, 25 October 2026. This policy replaces the earlier kitchen-PIN-only reading model.

## Access contract

- Signed out: current recipes and their plating drawings only. The kitchen PIN opens the minimal name picker; a personal PIN opens operational data. Anonymous Firebase authentication is not a personal login.
- Staff: existing prep, orders, wastage, transfer, guide, published minute, ping-reading and kitchen-mail permissions after login. Existing restrictions on historical records remain.
- Functions coordinator (`fnc`, canonical `fnOnlyIds`): public recipes and function management/service information only. No operational lists, staff administration, supplier data or kitchen mail. The separate Functions tick (`fnIds`) still controls booking writes.
- Head chef and sous chef: recipe and drawing management. Supplier catalogue editing remains head-chef/admin only.
- Admin: verified owner Google account. A staff identity never inherits it. Selecting a person signs Google out before checking that person's PIN; a restored non-head staff identity on an old Google session is locked and must enter its own PIN again.
- Sign out/idle lock: private screens, overlays and drafts close. Other tabs receive the lock. Sign out also ends Google authentication, not just the personal PIN session.

## Data boundaries

`login/roster` is the minimal sign-in bootstrap document: names, role/permission ids and active membership, with no kitchen settings, contact details, PIN hashes or operational records. It is readable by an authenticated Firebase client that knows the kitchen path. Only the admin, or a sous chef's matching staff-list batch with unchanged canonical permission ids, may update it.

All operational reads require a valid personal session (or admin). `fnOnlyIds` is admin-controlled and excludes functions-only accounts from kitchen reads and writes. Function-generated prep/order updates remain possible only for their own function in the same booking revision batch; the coordinator cannot read or edit unrelated lists. History subcollections are explicitly protected.

`publicBook/index`, `publicBook/matches`, `publicRecipes` and `publicDrawings` mirror current public recipe assets. Saves mirror the canonical kitchen documents in the same batch; rules require equality with those canonical documents. Histories and kitchen settings are never mirrored. The fixed public address lets a fresh visitor see edited/new recipes without knowing the kitchen PIN.

Delete function is a two-tap soft deletion: cancelled, `removed: true`, `kq: 0`, immutable previous version and generated prep/order reconciliation. Normal function lists and service views omit it. Database history remains available to authorised function managers and admin for audit/recovery; nothing is physically erased.

## Browser storage and offline behaviour

Google authentication uses tab-session persistence. The anonymous device identity remains persistent so existing personal PIN sessions keep working on staff phones. Operational Firestore records use an in-memory cache. Application caches used by a signed-in person are cleared on sign-out, expiry or account selection; all routes and readers require the current verified session. Public recipe/drawing assets retain their offline cache. A signed-in tab can continue using loaded information during a signal loss; reloading offline may require reconnection for private data. Public recipes remain available offline. Old Firestore IndexedDB copies from earlier releases are no longer used; clearing old site data removes those legacy copies from a shared device.

## Rollout

1. Run all browser and emulator checks on the feature branch.
2. Run `scripts/access-bootstrap.mjs` with the existing admin service account and kitchen PIN. It idempotently adds `fnOnlyIds`, builds the minimal roster and mirrors current recipe assets. No existing records are deleted, and no secrets or document contents are logged.
3. Release the client, then publish the stricter rules with **Publish rules**. The workflow automatically runs after a successful main-branch Pages deployment when access rules or preparation code changed; it is also available manually. The workflow repeats the preparation safely and runs the updated signed-out lock probe. Stale clients may be refused until refreshed, which is preferable to leaving private data open.
4. Verify the Pages release, live lock probe, and live browser tests. Do not call source-only changes a live security fix.

The browser's **Shared device** option no longer grants guest access. An explicit Google admin session counts as logged in on either device type. Sign out of Google before handing over a shared device.

## Rollback

Keep the stricter read restrictions. Revert client defects on a new branch, patching that client to use `login/roster` and the same permission contract. Do not republish the old public-read rules. Added roster/mirror/soft-deletion data is additive and should be preserved. Restore a deleted function through a reviewed admin correction and matching history, not by deleting its audit records.
