# Public recipes and private kitchen access

Approved by Kuschi, 25 October 2026. This policy replaces the earlier kitchen-PIN-only reading model.

## Access contract

- Signed out: current recipes and their plating drawings only. The kitchen PIN opens the minimal name picker; a personal PIN opens operational data. Anonymous Firebase authentication is not a personal login.
- Staff: existing prep, orders, wastage, transfer, guide, published minute, ping-reading and kitchen-mail permissions after login. Existing restrictions on historical records remain.
- Functions coordinator (`fnc`, canonical `fnOnlyIds`): public recipes, function management/service information and today's delivery temperature records. No operational lists, staff administration, supplier data or kitchen mail. The separate Functions tick (`fnIds`) still controls booking writes.
- Head chef and sous chef: recipe and drawing management. Supplier catalogue editing remains head-chef/admin only.
- Admin: verified owner Google identity plus that device's current head-chef PIN session and matching device grant. Remembered Google alone never opens private operations. See [device sessions](device-sessions.md).
- Personal devices keep Google remembered, have no idle logout and lock kitchen access at 04:00 Queensland time for a daily PIN unlock. Shared screens clear this device's Google and PIN on the 10-minute idle lock and at 04:00. Voluntary handover clears private work, waits for unsent writes and never transfers the previous person's authority. Scheduled locks preserve the same person's unfinished work behind the PIN screen.

## Data boundaries

`login/roster` is the minimal sign-in bootstrap document: names, role/permission ids and active membership, with no kitchen settings, contact details, PIN hashes or operational records. It is readable by an authenticated Firebase client that knows the kitchen path. Only the admin, or a sous chef's matching staff-list batch with unchanged canonical permission ids, may update it.

All operational reads require a valid personal session (or admin). `fnOnlyIds` is admin-controlled and excludes functions-only accounts from other kitchen reads and writes. Delivery receipts are the explicit all-login exception; they do not grant access to config, orders or supplier catalogues. Function-generated prep/order updates remain possible only for their own function in the same booking revision batch; the coordinator cannot read or edit unrelated lists. History subcollections are explicitly protected.

`publicBook/index`, `publicBook/matches`, `publicRecipes` and `publicDrawings` mirror current public recipe assets. Saves mirror the canonical kitchen documents in the same batch; rules require equality with those canonical documents. Histories and kitchen settings are never mirrored. The fixed public address lets a fresh visitor see edited/new recipes without knowing the kitchen PIN.

Delete function is a two-tap soft deletion: cancelled, `removed: true`, `kq: 0`, immutable previous version and generated prep/order reconciliation. Normal function lists and service views omit it. Database history remains available to authorised function managers and admin for audit/recovery; nothing is physically erased.

## Browser storage and offline behaviour

Google authentication is held in a separate named Firebase app: local persistence on personal devices, session persistence on shared screens. Operational Firebase authentication always uses a stable anonymous device UID. Personal PIN sessions expire at the next 04:00, and admin grants are bound to that exact session. See [device sessions](device-sessions.md) for device choice, server expiry, migration and recovery.

Operational Firestore records use an in-memory cache. Private screens are gated by the current valid PIN session. Public recipe and drawing assets retain their offline cache. Keep a tab open while changes are not sent; closing or reloading offline can lose its in-memory queue. The daily privacy lock does not force a reload over that work.

## Rollout

1. Run all browser and emulator checks on the feature branch.
2. Run `scripts/access-bootstrap.mjs` with the existing admin service account and kitchen PIN. It idempotently adds `fnOnlyIds`, builds the minimal roster and mirrors current recipe assets. No existing records are deleted, and no secrets or document contents are logged.
3. Release the client, then publish the stricter rules with **Publish rules**. The workflow automatically runs after a successful main-branch Pages deployment when access rules or preparation code changed; it is also available manually. The workflow repeats the preparation safely and runs the updated signed-out lock probe. Stale clients may be refused until refreshed, which is preferable to leaving private data open.
4. Verify the Pages release, live lock probe, and live browser tests. Do not call source-only changes a live security fix.

The browser's **Shared device** option no longer grants guest access. Google alone is not an operational login. The matching head-chef PIN and device grant are required. Shared-device locks clear Google locally without revoking other devices.

## Rollback

Keep the stricter read restrictions. Revert client defects on a new branch, patching that client to use `login/roster` and the same permission contract. Do not republish the old public-read rules. Added roster/mirror/soft-deletion data is additive and should be preserved. Restore a deleted function through a reviewed admin correction and matching history, not by deleting its audit records.
