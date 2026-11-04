# Complete saved shells

2 November 2026. The public book's saved copy uses complete immutable generations. This repairs failed cache writes and expired refresh rounds. It changes no kitchen records, roles, layouts or Firestore reads.

## Storage and ownership

`sw.js` stages every `SHELL` file except the duplicate `./` navigation alias in a separate `lk-shell-v1-<encoded public app scope>-*` CacheStorage cache. Every response body and cache write must finish before publication. The worker drains bodies as they arrive so unread large responses cannot occupy all network connection slots while later files wait. Unchanged refreshes retain the existing generation without rewriting its files.

New generations record their own required files in a public `__lk-shell-manifest` response inside the generation cache. The manifest has version 1 and the staged file list; it is written and checked before the metadata transaction publishes that generation. The `-m1-` name marker makes a missing manifest an incomplete generation, never an excuse to apply older requirements. Validation checks every recorded file and the cached index's same-origin startup scripts and stylesheets. A complete older generation therefore remains usable when a later release adds a startup file such as `js/motion.js`.

Generations from earlier immutable workers have no manifest. They must contain the first worker's frozen required-file list and every same-origin startup script and stylesheet named by their cached index. This also accepts coherent pre-manifest releases that added startup files, provided those files are actually present. An older worker that fetched a new index without its new startup dependency has not made a complete copy. Marked generations remain strict against their recorded manifest even if other files are cached. Activation preserves the last validated active or previous generation rather than blindly copying the former active pointer. External fonts, touch icons and lazy modules retain their existing separate cache contracts.

A small native IndexedDB database, `lk-shell-v1-<encoded public app scope>`, contains one `meta` store. A read/write transaction increments the refresh ticket. Publication checks that same ticket and changes the active and previous generation names in one transaction. CacheStorage alone cannot compare ownership and change the active pointer transactionally. It contains only public cache names, monotonic tickets, opaque browser client ids and housekeeping times. The public registration scope separates this app from other projects on the same GitHub Pages origin. It never stores staff identities, kitchen data, URLs or hash routes.

A refresh that expires is invalidated and its fetches and pending metadata transaction are aborted. Its staged cache is removed. If the transaction committed before its completion event was delivered, that event determines ownership before the cache is removed. A delayed response from a retired round cannot publish over a newer ticket. Background rounds retain their 30-second limit. An explicit retry replaces a background round already older than the page's eight-second wait. A navigation joins a running background round only before that round has requested its files (`round.asked`). After that, the round may hold responses from before a newer release, so the navigation queues one more round after it ends, shared by every navigation in the meantime (4 November 2026). Unchanged files revalidate as 304 and nothing is written. Joining a round already in flight let a release published between two quick openings go unseen: no `lk-new`, so the just-opened reload did not happen.

## Documents and restart

Navigation selects one complete saved generation and records the resulting browser client id. All its plain shell requests use that generation, including requests made after another update or a worker restart. A missing member returns a recoverable unavailable response rather than mixing it with an individual network response. A new navigation checks completeness and may use the complete previous generation while an online round repairs the current copy.

`js/upkeep.js` asks the worker for this document's opening index stamp with the local `opened` message. A global `caches.match` can find a different generation. Older workers do not answer that message, so the existing saved-index fallback remains. The `fresh` handshake still acknowledges `started`, then returns `ok` only after a complete publication or an unchanged complete round.

Installation stages the new shell without touching the worker currently serving the book. Activation preserves only document bindings to already immutable generations, checking both primary records and their public mirrors. A successful primary read with no binding still checks its mirror. A missing binding never attaches an existing document to the current active generation.

The previous deployed worker may still be changing `lk-book-v8`, and that bag may already contain mixed files. Its existing documents cannot be assigned an immutable release retrospectively. They receive the ordinary new-version notification and retain their existing typing/pending-write guards. A shell request with no proven immutable binding is refused and reports a recovery notice rather than using that mutable bag. Their next safe navigation uses the fully prepared new generation. This does not claim to repair scripts already loaded by a legacy document.

An initially uncontrolled page stays on its network-loaded files until its next navigation, avoiding a takeover midway through deferred scripts. Each opaque immutable binding is also mirrored as one public CacheStorage record before navigation responds, so metadata failure after worker restart can recover that exact generation. If both bindings are unavailable, the worker alerts the existing page and the update strip offers a guarded Retry update. A missing-binding warning alone never reloads the page.

`lk-book-v8` continues to hold lazy modules, Firebase files and fonts. Its legacy shell entries are not a new-protocol navigation fallback. Versioned lazy files still use one plain saved address and network-first loading. A startup file with a query or `X-LK-Fresh` is never saved individually into a generation.

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

Keep the manifest-aware validation and generation naming when rolling back the loading animations or another startup-file change. Revert the application, index and required-file list together through a new complete generation; do not remove a required file from an already published cache or validate an older generation against the newest worker's file list.

## Focused verification record

Application base `95525c6`, local Node 24.19.0 and Chromium 154.0.8037.57. The unchanged historical worker fails seven of the fourteen shared fault scenarios. The corrected worker passes all twenty-nine generation scenarios, including the additional first-load, legacy migration, namespace, retention and recovery checks. The separate recovery-notice suite passes eight checks for pending writes and unsaved drafts.

The final migration and pin source passes the saved-copy, update-confirmation, supplier-push-route, offline-open, offline-writes and recovery-notice suites: six files and 508 checks. Together with the twenty-nine native generation scenarios, all seven focused files pass 537 checks. The required final integrated gate still validates all consumers. Syntax and diff checks pass. These focused results do not replace the required final integrated Node 22 Click tests gate, deployed-file verification or real installed-device checks.

The independent missing-primary-record follow-up reproduced three failures of twenty-seven on the first implementation. Its regression forces one native client-binding write refusal, then a successful empty read after a newer generation is active. The final tests also hold an actual old-worker request through its bounded deadline during replacement and deliberately change its legacy bag after activation. The new installed generation remains complete; old documents use guarded recovery rather than guessed legacy contents.

The startup-file expansion regression adds eleven native CacheStorage/IndexedDB checks. It seeds a coherent pre-manifest copy and an older worker's incomplete refreshed copy, installs the new shell, removes its new dependency, and reopens offline across a browser restart. It also accepts a coherent pre-manifest extension, rejects missing extra scripts or stylesheets independently, and keeps marked manifests authoritative. Removing the new manifest or a required older file proves that neither incomplete generation is accepted. The focused generation result does not replace the combined release gate.
