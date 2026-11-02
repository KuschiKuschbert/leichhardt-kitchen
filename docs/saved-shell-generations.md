# Complete saved shells

2 November 2026. The public book's saved copy uses complete immutable generations. This repairs failed cache writes and expired refresh rounds. It changes no kitchen records, roles, layouts or Firestore reads.

## Storage and ownership

`sw.js` stages every `SHELL` file except the duplicate `./` navigation alias in a separate `lk-shell-v1-<encoded public app scope>-*` CacheStorage cache. Every response body and cache write must finish before publication. The worker drains bodies as they arrive so unread large responses cannot occupy all network connection slots while later files wait. Unchanged refreshes retain the existing generation without rewriting its files.

A small native IndexedDB database, `lk-shell-v1-<encoded public app scope>`, contains one `meta` store. A read/write transaction increments the refresh ticket. Publication checks that same ticket and changes the active and previous generation names in one transaction. CacheStorage alone cannot compare ownership and change the active pointer transactionally. It contains only public cache names, monotonic tickets, opaque browser client ids and housekeeping times. The public registration scope separates this app from other projects on the same GitHub Pages origin. It never stores staff identities, kitchen data, URLs or hash routes.

A refresh that expires is invalidated and its fetches and pending metadata transaction are aborted. Its staged cache is removed. If the transaction committed before its completion event was delivered, that event determines ownership before the cache is removed. A delayed response from a retired round cannot publish over a newer ticket. Background rounds retain their 30-second limit. An explicit retry replaces a background round already older than the page's eight-second wait.

## Documents and restart

Navigation selects one complete saved generation and records the resulting browser client id. All its plain shell requests use that generation, including requests made after another update or a worker restart. A missing member returns a recoverable unavailable response rather than mixing it with an individual network response. A new navigation checks completeness and may use the complete previous generation while an online round repairs the current copy.

`js/upkeep.js` asks the worker for this document's opening index stamp with the local `opened` message. A global `caches.match` can find a different generation. Older workers do not answer that message, so the existing saved-index fallback remains. The `fresh` handshake still acknowledges `started`, then returns `ok` only after a complete publication or an unchanged complete round.

Installation stages the new shell without touching the worker currently serving the book. Activation pins already open documents to their previous complete copy, publishes the prepared installation in a transaction, then existing controlled tabs adopt the activated worker. An initially uncontrolled page stays on its network-loaded files until its next navigation, avoiding a takeover midway through its deferred scripts. Each opaque document binding is also mirrored as one public CacheStorage record before the navigation response, so a metadata outage after worker restart can recover that exact generation. If both bindings are unavailable, the worker alerts the existing page and the update strip offers a guarded Retry update. It never reloads merely because the copy is unavailable. The retained `lk-book-v8` cache supplies older saved shell files during this migration and continues to hold lazy modules, Firebase files and fonts. Versioned lazy files still use one plain saved address and network-first loading. A startup file with a query or `X-LK-Fresh` is never saved individually into a generation.

A best-effort public metadata mirror in `lk-book-v8` lets a worker launch a complete last-good copy if IndexedDB later becomes blocked. It can be older than the authoritative transaction. It cannot authorise publication. Refreshes fail safely while metadata cannot be written. If a shell request has neither a known document pin nor readable metadata, it fails rather than guessing individual files.

## Bounded retention

Cleanup retains the active and previous complete copies, generations pinned by open clients, and a prepared installation. Closed-client metadata is removed; at most 32 recent navigation ids receive a one-minute grace while new clients become visible. Unreferenced generation caches older than one minute are collected after refresh or activation. Live clients keep their generation until navigation or closure. Cleanup does not erase unrelated origin caches or the retained lazy/font/Firebase cache.

## Verification and release

`tests/shell-generation.test.js` runs the actual worker and native CacheStorage/IndexedDB in a generated synthetic browser profile. It injects a cache refusal, closes and reopens the browser offline, holds a response beyond an update timeout, completes a newer round and releases the older response. It checks the scripts returned to an existing document and a new navigation. The test's controlled responses and clocks are outside production code.

`tests/saved-copy.test.js` continues to exercise the real book, public offline launch, lazy pages, saved SDKs, weak signal, Update now, 04:00 and older workers. Its assertions read the authoritative active shell and the retained lazy cache. `tests/fake/sw-legacy.js` preserves the previous worker as the historical compatibility fixture; removing a handler from the new protocol would no longer represent that older worker.

There is no rule publication, migration of kitchen data or additional network service. Release through the normal static-client PR gate and verify the deployed worker, update and public offline reopening. Root's final combined browser/CI gate remains required after integration.

## Recovery and rollback

A failed preparation leaves the previously selected complete copy available. Reopen with signal and retry the normal Update action. Keep a tab with unsent kitchen work open under the existing work-preservation contract. Do not clear private drafts or Firestore state to repair the public shell.

Correct this worker through a compatible follow-up PR that reads the existing generation metadata and retains a complete last-good copy. Do not blindly restore the historical worker: its activation deletes generation caches and does not understand their pointer. Reverting application changes does not require reverting the storage protocol. Never restore an older client or ruleset that violates the current private-access/device contract. A code revert cannot undo kitchen writes.

## Focused verification record

Application base `95525c6`, local Node 24.19.0 and Chromium 154.0.8037.57. The unchanged historical worker fails seven of the fourteen shared fault scenarios. The corrected worker passes all twenty-four generation scenarios, including the additional first-load, legacy migration, namespace, retention and recovery checks. The separate recovery-notice suite passes eight checks for pending writes and unsaved drafts.

The existing saved-copy, update-confirmation, supplier-push-route, offline-open and offline-writes suites pass all five files, 500 checks. Syntax and diff checks pass. These focused results do not replace the required final integrated Node 22 Click tests gate, deployed-file verification or real installed-device checks.
