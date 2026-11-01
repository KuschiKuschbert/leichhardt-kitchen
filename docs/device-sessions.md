# Personal devices and shared kitchen screens

Approved 2 November 2026. This replaces the earlier tab-only Google login, personal-desktop idle lock and 30-day PIN session policy.

## What the team sees

Every browser or installed app without a version 2 device choice asks how it is used when the new version opens. Existing shared-device settings do not silently answer the new question. The same warm-paper dialog becomes a bottom sheet on a phone. Choosing a device type does not grant access or a role. Recipes remain public.

- **My own device:** remembered for this browser or installed app and bound to the first person who successfully enters their PIN. No idle logout, including personal computers. Kitchen access locks at 04:00 Queensland time. The same person's PIN unlocks the new day. Their Google identity remains remembered, so the head chef does not need to repeat Google login every morning or after an update.
- **Shared kitchen screen:** any authorised staff member may enter their own PIN. A 10-minute idle lock and the 04:00 boundary clear this device's PIN and Google login. Other devices keep their own independent sessions.

Settings shows the saved choice. An unlocked personal device's own person can change or forget it. Changing a shared screen requires the head chef. Unsent work blocks either action; actual unsaved work has an explicit discard confirmation. A handover clears the previous person's private work and Google identity. Clearing browser site data also forgets the choice. A browser and its installed app may have separate storage depending on the platform, so each storage profile asks once.

[Phone setup](device-sessions/choice-phone.png) and [desktop setup](device-sessions/choice-desktop.png) show the existing book typography and responsive dialog.

## Authentication and server enforcement

The default Firebase app uses a persistent anonymous UID per device for every operational Firestore read, write and PIN session. A second named Firebase app holds Google authentication. Personal Google authentication uses local persistence; shared Google authentication uses session persistence and is explicitly signed out on the shared lock. Signing out uses the local Firebase client, never global account revocation.

`sessions/<anonymous device UID>` is version 2: `{by,pinAt,exp,at,issuedAt,mode,v}`. `at` and `issuedAt` are server timestamps. A correct, rate-limited PIN try opens the session; its expiry cannot exceed the next 04:00 after issuance. Old PIN tries cannot cross that boundary. PIN reset/removal and canonical active membership still invalidate access immediately. A device preference never substitutes for this proof.

`adminDevices/<anonymous device UID>` binds the verified owner Google identity to that device's current head-chef PIN session: `{by,pinAt,issuedAt,exp,googleUid,at,v}`. Operational admin access requires both the valid grant and that exact live session. A remembered Google identity alone grants no operational access. A new PIN session requires a new matching grant. Google accesses only the narrow owner verification, device grant and head setup/recovery paths.

The owner can select or create the first head profile when no head is configured. Forgotten head PIN recovery requires a fresh Google check and changes only the head's PIN setup window. It may recover that same head's retained device work, then waits for the replacement PIN and grant before replaying it; another person's work cannot use this exception. Moving to a new kitchen PIN first creates its config, roster and head PIN pair through that narrow fresh-owner path, then opens a destination device session and grant. Operational records are copied with the primary device identity. The source remains intact until the copy finishes.

The new read cost is bounded: a successful PIN unlock reads back its one server-issued session; a remembered owner restoring a session may read that same session once to recover the precise timestamp for its grant. The existing owner self-check remains one `config/admins` read per Google identity. There is no new operational polling or per-person query loop. Session and grant creation are writes; ordinary staff never read or list other devices' grants.

The existing default-app Google session migrates away from operational authentication. No migration deletes a legacy Google UID's shared session document, because other old clients may still use it. A fresh PIN is required to open the new device session. Existing unsent writes must finish before a voluntary identity migration or update.

## The daily boundary and work in progress

04:00 is the authentication-day boundary, separate from the prep calendar's midnight and the 03:00 nightly learning job. Locking does not depend on the learning job succeeding. The client uses the shared Queensland clock and checks expiry on wake and clock correction before private screens resume. The server enforces expiry independently.

A scheduled privacy lock must not reload over unsent work or discard the same person's drafts. Keep the tab open and re-enter the same person's PIN to finish sending. Work must never be applied under a different person after a handover. Browser shutdown, eviction or an offline reload can still lose Firestore's in-memory queue; the app must say when work has not reached the server.

Ordinary batch writes retain their original payload and recorder. They retry automatically only after an atomic permission refusal caused by expiry and the same person's new PIN session. An uncertain acknowledgement is never replayed. Supplier transactions retain their form but require a fresh user retry, preserving their stale-data checks.

## Updates

Explicit Update uses one tap when there is no destructive work. An unchanged open picker is not an unsaved draft. Actual unsaved changes show **Keep working** and **Discard and update**. Unsent writes never have a discard override: the update waits and resumes once the server acknowledges them. The atomic shell fetch, network checks, typing checks and safe automatic-refresh rules remain in place. Remembered Google authentication survives an update on personal devices.

## Rollout and rollback

Publish the additive foundation rules first, retaining the old client contract while adding version 2 sessions and device grants. Release the new client and then publish the final stricter rules, which remove raw Google operational access and reject legacy 30-day sessions. Existing cached clients must update to regain private access. Prove both phases on the real emulator and run the live lock probe after publication.

Keep version 2 sessions and grants when correcting client defects. Do not restore raw Google operational bypass or 30-day PIN sessions as a client workaround. A rollback must keep the device isolation and private-read contract.
