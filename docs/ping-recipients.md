# Individual shift pings

The existing Write a ping form has a Send to dropdown. Everyone is the default. Other options are active kitchen people who can see Shift pings; functions-only accounts and stopped staff are excluded. No staff names are stored in public assets. The recipient is fixed after saving. Edit changes the message and schedule; Use again copies them into a new draft with an editable recipient. A copied recipient who has become unavailable must be changed explicitly before saving, never silently replaced with Everyone.

Individual pings use the existing date, weekday, optional time, 30-minute lifetime, bell and Got it behaviour. A person's bell shows Everyone plus their own individual pings. Chefs manage all pings and see recipient labels and their read receipts, but their bells do not announce pings intended for someone else. Head chef and sous chefs may write and manage individual pings; historical pingIds permissions on other roles do not grant access.

## Private data and reads

Everyone pings remain under kitchens/<PIN>/notes. Individual pings live under kitchens/<PIN>/directnotes with the same fields plus `to`, the recipient's staff id. Their text never enters the Everyone collection. Client ids use an internal direct/ prefix so general and individual records cannot collide. Firestore checks the recipient's personal session; unauthenticated, expired, removed, functions-only and other staff sessions cannot read individual messages. The verified owner and current chefs retain management access. Recipient, author and creation time are immutable after creation. The verified owner can copy historical recipients and authors during a kitchen-PIN move.

Each individual ping has its own seen subcollection. A recipient writes only their own immutable receipt. Chefs can inspect these receipts. Verified-owner backup/PIN migration may preserve existing receipts; other staff cannot mark another person's ping read.

Loading current pings uses the existing Everyone query plus one server query for individual pings. Staff queries include `to == their staff id` and `until >= today`; chef queries include the date bound. No per-person loops, polling or extra listeners. The existing daily/30-minute refresh schedule and config stamp are reused. Individual reads need a connection and have a six-second timeout; failure is shown explicitly and never described as an empty inbox. After a failed individual read, the individual pings already read for the same person in this tab stay on screen with the warning, and the pings are read again after 5 minutes or once the phone is back online (28 Oct 2026). With neither kind read yet, the bell says the pings could not be checked, not that there are none. Personal text is held in the existing memory-only Firestore client and runtime state, never a persistent ping cache. Sign-out clears current pings, history and editor state. Access epochs discard late replies after a handover.

Past pings use two date-bounded queries when a chef asks, with the existing 30-record paging control. Manual and encrypted nightly backups include directnotes and directnotesSeen. The kitchen-PIN move copies both.

## Publish order

1. Run browser and rules tests on the feature branch. The direct-ping rules tests cover constrained queries, other-person denials, expired/removed sessions, stale pingIds, functions-only accounts, writes, immutable targeting and receipts.
2. Run the existing Publish rules workflow **from the tested feature branch before merging the UI**. Its new ping-index.mjs step first proves the exact recipient/date query with existing indexes, without index-admin permission. If an index is missing, it adds only the collection-scope `to ASC, until ASC` index and waits for READY. If index administration is refused, create that index once in Firebase Console and rerun; broader permanent credentials are unnecessary. It preserves all other indexes and writes no kitchen messages or records. Existing repository secrets are reused; no secret values belong in the repository or chat.
3. Confirm the workflow succeeds, including live lock probes, then merge and wait for Pages and live browser checks. Older app versions continue showing Everyone pings; refresh them to receive individual pings.
4. If preparation fails, keep the UI unmerged. Index or permission failures are prerequisites, never a reason to broaden message-read permissions.

Rollback the UI through a fresh PR while retaining the directnotes restrictions, data and index. Older clients do not read the separate collection. Never move individual text into Everyone pings as a rollback.

## Official sources checked 26 October 2026

- [Firestore rules and queries](https://firebase.google.com/docs/firestore/security/rules-query): rules do not filter query results; recipient queries must prove their permitted scope.
- [Create a Firestore index](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.collectionGroups.indexes/create): additive index creation returns an operation which must complete before client queries are released.
