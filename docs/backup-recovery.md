# Protected backup and recovery checks

The nightly job reads the existing included-data export, encrypts it, decrypts it again into a private temporary file and compares the bytes before upload. It keeps only the encrypted artifact for 90 days. New archives use format version 1 with authenticated encryption. The artifact name, `kitchen-book-<UTC date>.json.enc` filename and schedule stay the same. The backup key stays in the existing `BACKUP_KEY` repository secret and the owner's password manager. No new service or package is needed.

This is an included-data backup, not a complete disaster-recovery image. The source export uses several reads, not one transactional database snapshot. Authentication and the runner's round trip confirm the exact included JSON bytes and format parameters, not freshness or cross-document consistency. Check the run, source revision and decrypted `exportedAt`, and reconcile relevant records before a real repair.

## Read a new archive

Use Node 22 or later and a trusted checkout containing `scripts/backup-crypto.mjs`. Download the artifact from the intended successful Nightly backup run, unzip it into a private folder outside this public repository, and select a new output filename. Do not put the key in a command, source file or shell history.

In bash, enter the key without displaying it:

```sh
read -r -s -p "Backup key: " BACKUP_KEY
printf '\n'
export BACKUP_KEY
node scripts/backup-crypto.mjs decrypt "/private/folder/kitchen-book-YYYY-MM-DD.json.enc" "/private/folder/verified-kitchen-book.json"
unset BACKUP_KEY
```

Replace the example paths with the downloaded archive and a new private destination. The command reads the key only from the environment. It never prints the key or JSON. It refuses an existing destination, including a symlink. It authenticates and validates UTF-8 object-shaped JSON in memory before staging private output. The final file appears atomically with mode `0600`; wrong keys, modified/truncated input and invalid JSON leave no output or staging file. A caught file-write failure removes its staging file. Use a local filesystem that supports same-directory hard links.

The technical input limit is 256 MiB of JSON, checked before allocating the file buffer. A larger archive fails as a whole rather than being truncated or uploaded as a partial backup. Review capacity and this limit if backup sizes approach it. Keep the key available independently of the GitHub secret: losing the key makes those archives unreadable.

## Read a trusted older archive

Older archives have OpenSSL's `Salted__` AES-256-CBC format, using PBKDF2-SHA256 with 200,000 iterations. Only when provenance has been checked, use the explicit mode:

```sh
node scripts/backup-crypto.mjs decrypt-legacy "/private/folder/older-kitchen-book.json.enc" "/private/folder/verified-legacy-kitchen-book.json"
```

Set and unset `BACKUP_KEY` as above. Readers accept historical nonempty passphrases, including shorter legacy keys; the new writer requires at least 16 characters. The reader supports the historical 8-byte salt and the documented 16-byte salt variant, determined from CBC block alignment. This mode checks padding, UTF-8 and JSON, but cannot verify legacy authenticity. It says so on success. New-format failure never falls back to legacy, and legacy mode never accepts the new envelope. Keep old archives and keys; existing archives are not rewritten.

## Format version 1

The binary prefix is fixed and authenticated. All sizes below are bytes.

| Offset | Size | Meaning |
| --- | --- | --- |
| 0 | 8 | ASCII `LKBACKUP` |
| 8 | 1 | Format version, `1` |
| 9 | 1 | Cipher id, `1` for AES-256-GCM |
| 10 | 1 | KDF id, `1` for PBKDF2-SHA256 |
| 11 | 4 | Big-endian iteration count, `200000` |
| 15 | 1 | Salt length, `16` |
| 16 | 1 | Nonce length, `12` |
| 17 | 1 | Tag length, `16` |
| 18 | 16 | Random salt |
| 34 | 12 | Random nonce |
| 46 | Variable | Ciphertext |
| End minus 16 | 16 | GCM authentication tag |

PBKDF2 derives the 32-byte key from the UTF-8 passphrase and random salt. The complete 46-byte prefix is GCM additional authenticated data. A fresh salt and nonce are generated for every encryption. The reader accepts only these exact version-1 parameters before deriving a key. No untrusted iteration count controls its work. No plaintext is released before `decipher.final()` accepts the tag. JSON validation is an additional check, not a replacement for authentication.

## Included data and omissions

The exporter remains `scripts/nightly-backup.mjs`; its JSON shape is unchanged.

| Included section | Scope |
| --- | --- |
| `config` | `config/main`, including people, canonical permission ids and settings. |
| `days`, `orders`, `waste`, `wasteReviews`, `transfers`, `deliveries` | The selected window, normally 45 Queensland calendar days, with original document ids, values and attribution. |
| `activity`, `sections`, `learned`, `ordlearned`, `learnlog`, `summary`, `analysis`, `analysisDaily`, `references`, `training`, `proofHistory`, `dashwatch`, `misses`, `views` | Included activity, analysis, source links, assessment and correction records, and the admin Dashboard's watch list. |
| `guides`, `mail`, `mailstat`, `drinks`, `shifts`, `daily`, `todos`, `team`, `cutdone`, `transferOpen` | Included team records, guide words/small pictures and outstanding-transfer index. |
| `notes`, `directnotes`, `minutes`, `book`, `recipes`, `drawings`, `drawtpl`, `drawlib`, `suppliers`, `supplierlinks`, `functions`, `fncontact`, `fnsent` | Current included documents. Booking contacts remain private inside the encrypted archive. |
| `referencesHist`, `trainingHist`, `notesSeen`, `directnotesSeen`, `minutesHist`, `minutesSigns`, `recipesHist`, `drawingsHist`, `supplierOrders`, `supplierAudit`, `functionsHist` | Included history, acknowledgements, sign-offs, catalogue audit and order subcollections, retaining parent and record ids. |
| `pins` | Inventory only: exported id, name and set time when present. It is not a usable PIN proof. |
| `exportedAt`, `by` | Export metadata. |

Intentionally absent: PIN fingerprints and the live PIN timestamp, uploaded guide page pictures, device PIN sessions and admin grants, Google/Firebase authentication state, the minimal login roster, `config/admins`, push addresses and sent-push state. Credentials, App Check/provider settings, IAM, published rules, indexes, jobs and application source are separate operational dependencies. Public recipe mirrors are not a substitute for the included canonical recipes/drawings.

A recovery needs fresh personal PIN enrolment and device authority under the current access/device contracts. Do not copy old sessions, bypass private rules or revive Google-only operational access. Rebuild the minimal roster and public mirrors through the existing reviewed bootstrap procedure where required. Keep original guide files separately; the small pictures cannot recreate full page images.

Older dated records outside the selected window need earlier archives or a scoped authorised source read. An old open loan's index can be included while its authoritative dated source is outside that window. Preserve and reconcile both before enabling returns after a real repair. No general production restore command is supplied here.

## Isolated recovery assurance

`scripts/backup-crypto-check.mjs` tests the actual workflow encryption/decryption/comparison command, fresh salts/nonces, correct and wrong keys, version/parameter changes, ciphertext/tag changes, truncation, invalid JSON, no-overwrite/private outputs, key/log handling, explicit legacy interoperability including short keys, forced round-trip mismatch and cleanup after failure.

`scripts/backup-recovery-check.mjs` accepts no input archive or destination arguments. It requires a literal `127.0.0.1` or `[::1]` Firestore emulator address and an explicit `demo-` project. It generates only synthetic data under isolated source and target kitchen paths. It runs the actual exporter, encrypts/decrypts it, validates every current included section, restores those included records in one atomic synthetic batch, compares every document and re-exports for equality. It checks zero/null/negative temperatures, recorder versus preparer, original quantities, canonical action-id arrays, current and historical booking effects, history and version fields, and confirms omitted authority/pages remain absent. Both test paths and local files are cleaned afterwards. This proves the stated included-data path, not production restore readiness.

Run the local checks after installing the existing `scripts` and `tests/rules` tooling:

```sh
cd scripts
node backup-crypto-check.mjs
../tests/rules/node_modules/.bin/firebase emulators:exec --only firestore --project demo-test "node backup-recovery-check.mjs"
```

The required PR processing gate retains all five previous checks and adds both new checks. The nightly job makes its plaintext export and verified copy private, and removes both in an `always()` cleanup step, including after a read/encryption/verification failure. Only `out/*.json.enc` is uploaded after the authenticated byte comparison succeeds.

## Rollout and rollback

Release the compatible reader, verification and writer together. Keep the new reader available for new archives and its explicit trusted legacy path for old ones. Reverting application code does not convert backup formats or restore data. Correct a writer problem through a normal PR while preserving the ability to read already-created version-1 archives; keep known-good encrypted artifacts and keys. No data migration, rules publication or production record write is part of this unit. Verify a subsequent scheduled backup's format and successful job before calling the new writer live.

Official sources checked 2 November 2026: [Node 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html) for GCM AAD/tag/final and random IV handling; [OpenSSL 3.5 enc](https://docs.openssl.org/3.5/man1/openssl-enc/) for legacy PBKDF2/SHA256/salt compatibility and the command's lack of AEAD support. Local OpenSSL is 3.5.7. Local Node verification and CI's Node 22 result are recorded separately in the release evidence.
