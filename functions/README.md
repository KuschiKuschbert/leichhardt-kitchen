# Operandio cooling backend

Implementation only. No project billing, API, queue, IAM grant, secret or live notification has been changed by adding these files. This backend needs a separately approved deployment. The recorded Firebase free-plan choice still applies until the head chef changes it.

The approved timer has one shared run: a tick starts two hours; after its deadline another tick starts a further four hours. Functions accept starts using their server clock and queue each deadline in Cloud Tasks. The browser does not have to remain open. Firebase Cloud Messaging submits notifications to eligible personal devices that explicitly opted in. Notification permission, OS settings and connectivity still govern arrival and sound.

## Code and validation

- `bundle-core.mjs` copies the authoritative browser `js/cooling-core.js` byte-for-byte into generated `shared-cooling.cjs` before checks, tests and deployment. Firebase includes that generated file in the server bundle; no install hook tries to read files outside the deployed package.
- `cooling-service.mjs` owns transactions, scheduling intent and per-device delivery receipts. Its external adapters and server clock are injected for tests.
- `index.mjs` exports `coolingStart`, `coolingSchedule` and private task handler `coolingDeadline` in `australia-southeast1`.
- `repair.mjs` reports pending scheduling jobs. `--enqueue` retries those jobs after operator review; it does not send an immediate notification itself.
- `test/cooling-service.test.mjs` exercises the contract with a transactional stand-in. `test/emulator.mjs` separately exercises real Firestore transaction contention with mocked queue and messaging adapters.

Run `npm ci`, `npm run check` and `npm test` in this directory using Node 22. The repository's existing Firestore emulator can run the integration script from `tests/rules`:

```sh
firebase emulators:exec --only firestore,auth --project demo-test "node ../../functions/test/emulator.mjs"
```

The script refuses any project other than `demo-test` and requires `FIRESTORE_EMULATOR_HOST`. The deployed adapters also disable real enqueue and messaging whenever that variable is set. Emulator runs are not proof of deployed Eventarc delivery, IAM or device notification delivery.

## Records

All paths are under the configured kitchen. Clients never write canonical runs or jobs.

| Path | Contract |
| --- | --- |
| `cooling/config` | Server-controlled `{v:1,enabled:true}` readiness gate. Set only after backend validation; absence means setup needed. |
| `cooling/current` | `{v:1,run,rev,firstAt,firstDue,firstBy,secondAt,secondDue,secondBy,schedule}`. Times are server-established numeric milliseconds. Revision increases for each accepted start, including a new run. Schedule has first/second pending, queued or failed; second starts empty. |
| `coolingRequests/{id}` | Immutable client request `{v:1,uid,by,sessionAt,stage,expectedRun,expectedRev,at}` via the existing writer. Stage is 1 or 2. `sessionAt` matches the current issued timestamp; `at` is a server timestamp. The backend adds accepted/rejected status, a fixed code, resolvedAt and accepted run/revision. |
| `coolingRuns/{run}` | Server-only retained canonical run. Its starts and deadlines never move; second-stage acceptance fills the second start. The first request ID identifies the run. |
| `coolingJobs/{run}_{stage}` | Server-only outbox created atomically with the accepted start. State pending, queued, retry, sent, expired or invalid; queue and delivery attempts/failures remain inspectable. |
| `coolingJobs/{job}/devices/{uid}` | Server-only submitted, invalid-token, skipped or retry receipt for that device. A sent receipt means FCM accepted it, not that a person saw or heard it. |
| `coolingPush/{uid}` | A personal device's unreadable subscription `{v:1,uid,by,pinAt,tok,at,mode:'personal'}`. |

Accepted requests validate current canonical membership, exclude Functions-only accounts and bind the device's current version-2 PIN session and PIN marker. This narrow staff action does not require or grant owner/admin access. Client rules also require the anonymous device UID and immutable request shape. An expired, replaced or reset session cannot start a stage. A request write acknowledgement alone is not an accepted timer.

Closed-app delivery rechecks current canonical membership, current device ownership, personal mode and PIN marker, with batched authority reads. It permits the same personal session after its daily expiry, because a daily app lock must not suppress already-accepted alerts. Shared screens receive in-app pings but cannot register for background cooling pushes. Changed ownership, PIN reset, removal or Functions-only status stops eligibility. Supplier subscriptions are separate.

## Retry and delivery limits

The start and scheduling outbox commit together. Scheduling uses a stable hashed Cloud Tasks ID, making an enqueue followed by a failed Firestore acknowledgement safe to retry. An enqueue failure leaves the outbox pending and marks the current stage's schedule failed. Event triggers retry failures, and the operator repair command can re-enqueue pending work if event retries have stopped. No minute-by-minute Firestore polling is added.

The private deadline handler rechecks the stored deadline and uses a short lease to avoid overlapping submissions. Successful device submissions are recorded per messaging chunk before moving on; a transient failure retries only unresolved devices. Invalid tokens are deleted only if that exact token is still registered. Tags generated by the service worker are stable by run/stage. A crash after FCM accepts a message but before its receipt is saved can still produce a duplicate, so delivery is not claimed to be exactly once.

Tasks have at most 100 attempts over 24 hours. Notifications older than 24 hours after their deadline expire; retained canonical timing still lets the app show missed state. Pausing backend readiness does not undo accepted times. Scheduling and delivery failures must be monitored. Closed-app push uses the OS sound, not the foreground Web Audio kitchen chime.

## Deployment, after the billing decision

1. Confirm the head chef has approved billing-enabled Firebase for this project. Verify the Firestore location and that the configured Sydney region is suitable. Set budget alerts; they are not spending caps.
2. Use a dedicated cooling runtime service account, provided through the `COOLING_SERVICE_ACCOUNT` deployment parameter. Grant only required Firestore access, FCM sending, access to the `KITCHEN_PIN` secret, Cloud Tasks enqueue access to this queue, and invocation of the private deadline handler. Cloud Tasks needs permission to mint the OIDC token for the runtime account; the caller needs permission to attach that account. Keep public invocation disabled. The deployer's temporary API/queue/IAM provisioning permissions are distinct from runtime permissions.
3. Enable the Functions, Eventarc, Cloud Run, Cloud Build, Artifact Registry, Cloud Tasks and Secret Manager services needed by Firebase deployment. FCM HTTP v1, Firebase Installations and FCM Registration must already be enabled for client opt-in. Never print or commit secret values. Set `KITCHEN_PIN` through the existing secret-management channel or Firebase's interactive secrets command.
4. Publish the additive, emulator-verified cooling rules before releasing the dependent client. Use the repository's reviewed rules-publication workflow and verify its lock probe. Do not use this functions config to republish unrelated rules.
5. Deploy with the existing authorised Firebase project selection: `firebase deploy --config firebase.cooling.json --only functions:cooling`. The config runs syntax and unit checks first. Deployment creates the task queue and applies retries/concurrency. There is no idle minimum instance; max instances is two and task dispatch concurrency is one.
6. Verify deployed event delivery, queue permissions, task failure/retry handling, revoked membership and subscriptions in a controlled test. Do not seed the readiness document until these dependencies are ready. Then set `cooling/config` to `{v:1,enabled:true}` through an authorised server/admin channel, and test the app's accepted-start acknowledgement.
7. Test foreground and closed-app alerts on supported real devices, including an installed iPhone app with permission, without changing the production two-hour/four-hour durations. Synthetic short deadlines belong only in a separate test project. Record which checks were real-device checks and which were emulator checks.

To stop new starts, set readiness false through the server channel. This also pauses dispatch; it does not erase accepted deadlines or subscriptions. Resolve pending jobs and communicate any missed alerts before re-enabling. Rollback must keep the new client/rules access boundaries and retained run records; do not replay already accepted starts.

The new server-only collections must be included in operational backup/retention planning. Kitchen-PIN migration must account for existing scheduled tasks, which remain bound to the original kitchen secret, before a new kitchen is enabled. Do not copy notification tokens or pending jobs blindly to another kitchen.
