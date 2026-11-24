# Venues: each kitchen its own project, address and book

19 November 2026. Build step 2 of [the second venue brief](second-venue-options/brief.md) (the mix chosen that day), with no Venues room in the app ([venues room brief](venues-room-options/brief.md), agreed the same day). A venue is added, and its head chef changed, in GitHub and the Firebase console with this checklist and two hand-run workflows. Nothing here changes Leichhardt's data, its rules or what its phones load.

## The venues now

| Venue | Address | Book | Secrets | State |
| --- | --- | --- | --- | --- |
| `leichhardt` | GitHub Pages, as before | full | `leichhardt` environment since 20 Nov 2026 | Live. Moved by the owner on 20 Nov 2026: Publish rules in verify mode found the kitchen, Nightly learning and the Lock probe were green on the environment's secrets, then the five repository copies were deleted (only `AUTOMERGE_TOKEN` stays at repository level). |
| `strand` | https://strand-kitchen.web.app/ | empty | `strand` environment | Venue file and QR files added 20 Nov 2026. Still to do: `OWNER_EMAIL` (the Strand head chef's Google email), Actions **Set up a venue** (strand), **Publish rules** (strand, First publish), the first sign-in and `PLATFORM_STAFF_ID`, then App Check Enforce. |

## What a venue is

- **One file**, `venues/<id>.json`: its id, name ("Leichhardt Hotel"), short name ("Leichhardt"), web address, where it is served (`pages` for GitHub Pages, `firebase` for its own Firebase project), its book (`full` for Leichhardt, `empty` for every new venue), where its secrets are (`repository` or `environment`) and its project's public web settings. A venue can opt into the weekly sales pilot with `supplierSales: true`. Nothing in it is secret. `scripts/venues.cjs` checks it word by word: a wrong field stops every job, it never falls back to another venue.
- **Its own Firebase project.** Data, reads, sign-in, App Check, rules, backups and the free daily reads are its own.
- **Its own address.** Leichhardt stays on GitHub Pages. A new venue is served by its own project at `https://<project>.web.app/`, a separate origin, so nothing a phone keeps (drafts, PIN sessions, the saved book) crosses between kitchens, and the installed app is its own.
- **Its own copy of the book**, made by `scripts/venue-site.cjs` from the same code: its `js/firebase-config.js`, the security header in `index.html` naming its own sign-in host, its name wherever Leichhardt's is (the top bar, titles, prints, saved file names, the installed app), an empty `js/data.js` and its own QR files from `venues/<id>/`. The copy is refused if anything in it still names Leichhardt or Leichhardt's project.
- **Its own GitHub environment**, named like the venue, holding its secrets and one variable:

| Name | Kind | What |
| --- | --- | --- |
| `VENUE_PROJECT` | variable | The venue's Firebase project id. Every job compares it with the venue file and stops on a mismatch. |
| `FIREBASE_SA` | secret | The venue project's service account key (JSON). Every job checks its project is the venue's. |
| `KITCHEN_PIN` | secret | The venue's kitchen PIN, 4 to 8 digits. Its own, never Leichhardt's. |
| `OWNER_EMAIL` | secret | The venue owner: the venue's head chef's Google email. |
| `PLATFORM_EMAIL` | secret | The platform owner's Google email (the owner of every venue). At Leichhardt it may be left out: it is `OWNER_EMAIL`. |
| `PLATFORM_STAFF_ID` | secret | The platform owner's own profile id at that venue. Left out at Leichhardt. |
| `BACKUP_KEY` | secret | The venue's backup passphrase, at least 16 characters. Keep a copy in the password manager. |
| `APPCHECK_DEBUG_TOKEN` | secret | For the Lock probe once App Check is enforced. |

## What runs once per venue

Every job that holds a venue's secrets runs in that venue's environment (with no deployment record) and runs `node scripts/venues.cjs guard <id>` first. `tests/venues.test.js` fails the Click tests if a workflow job holds a venue secret without both.

| Workflow | Per venue |
| --- | --- |
| Nightly learning, Cut-off pushes | One job per venue, its own service account and kitchen PIN |
| Nightly backup | One job per venue. Its artifact is `kitchen-book-<venue>-backup-<run>`; the file names its project, and last night's file is reused only for the same venue and project ([backup-recovery.md](backup-recovery.md)) |
| Publish rules | One job per venue (input `venue`: one id or `all`), filled with that venue's secrets, published only to its project (`scripts/publish-rules.cjs` refuses any other), then that venue's Lock probe |
| Lock probe | One job per venue, against its own project and address |
| Publish site | Leichhardt on GitHub Pages as before; then each `firebase` venue's copy on its own address. Published waits for both, so no venue's rules go ahead of its code |
| Live click tests | The click tests on Leichhardt's copy as before; each venue's live copy read back by `scripts/venue-live-check.cjs` (its settings, security header, book and name) |
| Set up a venue (new, by hand) | Checks the environment, compiles the venue's filled-in rules on the emulator, publishes its copy and reads it back |
| Set up Grill and Pans minimums | Leichhardt only (its encrypted file), in Leichhardt's environment |

## Two admins at a venue

The venue's head chef is admin of his own venue: the venue owner's Google (`OWNER_EMAIL`) with the `headId` PIN, as at Leichhardt. The platform owner is admin at every venue: his Google (`PLATFORM_EMAIL`) with his own profile's PIN at that venue (`PLATFORM_STAFF_ID`). The rules template has two placeholders for this, `PLATFORM_EMAIL` and `PLATFORM_ID`.

The venue admin (and a sous chef, and the venue owner's Google alone) cannot change, lock out or reset the PIN of the platform owner's profile: not take it off the list, not make it functions only, not change its role, ticks or pings, not make it head chef, not open its PIN set-up window, not delete or replace its PIN, not end its device session, not take back its admin grant, not write a sign-in roster without it, and not delete the kitchen settings. The platform owner changes his own profile himself.

At Leichhardt the owner is the platform owner: `PLATFORM_EMAIL` is `OWNER_EMAIL` and `PLATFORM_ID` is empty, so every platform line is off and every rule is as it was. `tests/rules/venues.test.mjs` proves both shapes on the emulator for every role (signed out, kitchen PIN alone, staff, view only, functions only, sous chef, head chef PIN, venue admin, platform owner PIN, platform admin, wrong and unverified Google): 78 rows on 19 Nov 2026. On that day's `main` rules, 18 of them failed (every platform row) and the 24 Leichhardt rows passed, the same as on these rules. With `config/platform` (24 Nov 2026, below) it is 131 rows.

### In the book (24 Nov 2026)

- **The record.** `config/platform` holds the platform owner's profile id at a venue, exactly `{ id }`. Only the server writes it: `scripts/access-bootstrap.mjs` sets it from `PLATFORM_STAFF_ID` when Publish rules prepares access (and on a new venue's first publish), deletes it when that secret is empty, and stops the run in verify mode when it does not match. Leichhardt has none. The rules let his Google and a live admin (either) read it; the venue owner's Google alone, every other role and every phone write are refused. List is refused for everyone.
- **His Admin.** With each owner check (`loadAdmins()` in `js/prep.js`, after `config/admins`) the Google account reads `config/platform` once, from the server. A record with an id means this Google account is the platform owner here: the admin person on this device is that profile, not `headId`. Google stays signed in for him as it does for the head chef (`pickName()`, `resume()`), his own PIN is asked for, and the grant is written with `by` his id. The last answer is kept on the phone (`lk.platform`, his Google uid and id) only so a reload keeps his Google; access still needs the server's answer and a new grant. Not there, or refused: nobody is the platform owner and everything goes by `headId` as before. Any other failure (no signal, the reads used up) fails the owner check and tries again: nothing is granted by guess.
- **His row on the venue admin's People page.** The venue owner's Google cannot read the record, so once the venue admin's grant is in, the device reads it once through its own sign-in. His row then says "The owner's own profile. Only the owner can change it.", with no editor, Remove, Delete for good or Reset PIN, and every save from the venue admin keeps his row, his place on every list, the head chef mark and his PIN set-up window exactly as stored (`platformKeep()`). The panel's own seeding of the lists and PIN windows waits for that read. If it fails, the page says so, nothing is locked by guess, and it tries again after 5 minutes, at the next draw or once back online. The platform owner editing himself is not locked.
- **Kept for the head chef only:** the Head chef role label and panel title, the chef to-do and team writer on the Google device with nobody signed in (`tdMe()`, `tmMe()`), the first head chef's set-up, Forgot the head chef PIN (hidden for the platform owner: it resets the head chef's), section standards editing, changing a shared screen's device type, and the chef hat's "Sign in with Google" tile before Google is in.
- Tests: `tests/venue-platform-admin.test.js` (both shapes in Chrome on the stand-in; 20 of its 42 checks fail on the book before this change), `tests/rules/venues.test.mjs` and a row in `tests/rules/client-shapes.test.mjs`, `tests/access-bootstrap.test.js`.

**Not covered by the rules:** the name, role label and ticks shown for the platform owner in the people list are display; the rules protect what grants access (the lists, the PIN, the session and the grant). The venue admin can read the platform owner's PIN fingerprint, as admin reads every fingerprint for Move PIN and backups.

**Built (client), 24 Nov 2026:** the book offers Admin to the platform owner at a venue and locks his row in the venue admin's people editor (In the book, above). Before, it opened Admin only for the `headId` PIN, and a venue admin's save that touched his row failed with no reason.

## Published-rules order

- **This change (venue plumbing).** At Leichhardt the filled-in rules mean exactly what they did (neither looser nor stricter). No file the phones load changes, so Publish site publishes nothing; its Published job then runs Publish rules for Leichhardt by itself, filled from the repository secrets (`PLATFORM_EMAIL` absent becomes `OWNER_EMAIL`, `PLATFORM_STAFF_ID` absent is empty). The Lock probe runs after. The full rules suite passes with Leichhardt's fill.
- **A new venue.** Its copy of the book first (Set up a venue), then its rules (Publish rules, First publish ticked), then its first head chef in the book. Rules never go ahead of the code.
- **The platform owner's profile.** Once it exists, `PLATFORM_STAFF_ID`, then Publish rules for that venue in its release window, then the Lock probe.
- **A head chef change.** `OWNER_EMAIL` changed, then Publish rules for that venue in its release window, then the Lock probe.
- **The client follow-up (24 Nov 2026).** It adds one read rule, `config/platform`: looser. Publish rules first (that run also writes the record from `PLATFORM_STAFF_ID`, or checks there is none at Leichhardt), then the Lock probe, then merge the client. A client ahead of its rules is refused that read and treats it as "not the platform owner": the head chef is admin as before. The Strand row's steps are unchanged.

## Owner's list, step by step

Claude does none of these: they create projects, environments and secrets, or hold a PIN or an email.

### A. Before the first merge (one time)

1. GitHub, the repository, Settings, Environments, **New environment** `leichhardt`. Leave it empty and add no protection rules. (Its jobs then still use the repository secrets.)
2. Merge this change when you say go. Then Actions: **Publish rules** runs by itself after the merge; check it is green, with its Lock probe.

### B. Move Leichhardt's secrets into its environment (before any second venue)

A secret missing from one venue's environment would otherwise quietly be the repository's, which is Leichhardt's. The Click tests refuse a second venue file until this is done.

1. Settings, Environments, `leichhardt`: add the **variable** `VENUE_PROJECT` = `leichhardt-kitchen`.
2. Add the **secrets** `FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`, `BACKUP_KEY` and `APPCHECK_DEBUG_TOKEN` with the same values as the repository secrets. Keep `BACKUP_KEY` the same, or older backups need the old key. If the service account JSON is not to hand, Firebase console, Project settings, Service accounts, Generate new private key (then delete the old key in Google Cloud, IAM, Service accounts, once the new one works).
3. Actions: run **Lock probe** and **Nightly learning** by hand. Both green.
4. Settings, Secrets and variables, Actions: delete the repository secrets `FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`, `BACKUP_KEY` and `APPCHECK_DEBUG_TOKEN`. Keep the others (`AUTOMERGE_TOKEN`).
5. Ask Claude to set `"secrets": "environment"` in `venues/leichhardt.json` (a small pull request). Done for Leichhardt on 20 Nov 2026, with the Strand's venue file.

### C. Add a venue

1. **Firebase console** (your Google account): Add project, with an id you choose (it becomes the address, `https://<id>.web.app/`). No Analytics (its `measurementId` is not one of the settings a venue file takes). The free Spark plan is enough: Firestore, Hosting, Authentication, Cloud Messaging and App Check all work on it, and the free daily reads are the project's own. Then:
   - Firestore: Create database, id `(default)` (the publisher refuses any other), production mode, a location near the kitchen (`australia-southeast1`; it cannot be changed later). Its deny-all starting rules are replaced at the first Publish rules.
   - Authentication: turn on **Anonymous** and **Google**. Settings, Authorized domains: `localhost`, `<id>.firebaseapp.com` and `<id>.web.app` are there by default; add nothing.
   - Project settings, General: **Add app**, Web. Keep the settings it shows (apiKey, authDomain `<id>.firebaseapp.com`, projectId, storageBucket, messagingSenderId, appId).
   - Hosting: **Get started** and click through (skip the command steps), so the site `<id>` exists for the first publish.
   - App Check, Apps, the web app: **reCAPTCHA Enterprise**. Create a score-based website key in the reCAPTCHA console with the one domain `<id>.web.app`, paste it in and Save; that site key is public and goes into the venue file (`appCheckEnterpriseKey`). On Spark only some risk thresholds can be chosen and the free reCAPTCHA assessments per month are limited: check the monthly count after the first busy week. Manage debug tokens: add one for the Lock probe (`APPCHECK_DEBUG_TOKEN`). Do not enforce yet.
   - Google Cloud, APIs and Services, Credentials, the Browser key (auto created by Firebase): Application restrictions, Websites, `https://<id>.web.app/*`, as Leichhardt's key allows only its own address; API restrictions the same list as Leichhardt's Browser key. If Google sign-in then says the request is blocked, add `https://<id>.firebaseapp.com/*` (the sign-in page lives on the authDomain).
   - Project settings, Service accounts: **Generate new private key** and keep the file private. In Google Cloud, IAM, add **Firebase Hosting Admin** to that `firebase-adminsdk` account (it already reads and writes Firestore and publishes rules).
   - Indexes: copy Leichhardt's. In a terminal on your computer, signed in with `npx firebase-tools@13.29.1 login`: `npx firebase-tools@13.29.1 firestore:indexes --project leichhardt-kitchen > indexes.json`, then in that folder make `firebase.json` with `{ "firestore": { "indexes": "indexes.json" } }` and run `npx firebase-tools@13.29.1 deploy --only firestore:indexes --project <id>`.
2. **GitHub**, Settings, Environments, **New environment** named like the venue id (for example `strand`), with no protection rules (a reviewer or wait timer would hold the 10-minute cut-off job, and a branch limit would stop Publish rules from a branch). Making it early is safe: nothing runs for a venue until its file is merged.
   - Variable `VENUE_PROJECT` = the project id.
   - Secrets: `FIREBASE_SA` (the key file's contents), `KITCHEN_PIN` (a new PIN for that kitchen), `OWNER_EMAIL` (the venue's head chef's Google email), `PLATFORM_EMAIL` (your Google email), `BACKUP_KEY` (a new long random passphrase, saved in your password manager), `APPCHECK_DEBUG_TOKEN`. Leave `PLATFORM_STAFF_ID` for step 6.
3. **Tell Claude** the venue's name and short name and the web app settings from step 1 (they are public). Claude opens a pull request adding `venues/<id>.json` and the venue's QR files (`venues/<id>/qr.svg`, `qr.png`, `qr-sign.pdf`, for its address). The Click tests check the file. Merge it.
4. Actions, **Set up a venue**, venue `<id>`. Green means the environment has everything, the venue's rules compile, and its copy of the book is live at its address.
5. Actions, **Publish rules**, venue `<id>`, mode publish, tick **First publish** (its book has no settings yet). Its Lock probe runs after.
6. **First sign-in.** The venue's head chef opens the address, signs in with Google and sets himself up as head chef with his PIN. In the admin panel he adds you as a person. You set your PIN at the venue's address within the set-up window. Find your profile id (Firebase console, Firestore, `kitchens`, the kitchen, `config/main`, `people`, your `id`), add it as the secret `PLATFORM_STAFF_ID`, and run **Publish rules** for the venue again (it also writes `config/platform`). From then on the venue's admin cannot change, lock out or reset your profile, and his People page shows it locked. Sign in with your PIN, open the admin panel (`#/admin`) and sign in with Google: Admin opens for you.
7. Once the copy works on a phone, App Check, Firestore: **Enforce**, as at Leichhardt.

### D. Change a venue's head chef

1. The new head chef is a person at the venue with his own PIN (the venue admin or you add him).
2. In the admin panel's staff list (People), set his role to Head chef and Save (one head chef: the old one becomes a sous chef).
3. GitHub, Settings, Environments, the venue: change `OWNER_EMAIL` to the new head chef's Google email.
4. In the venue's release window: Actions, **Publish rules**, venue `<id>`, mode publish. Its Lock probe runs after.
5. Done only when the new head chef has signed in with Google at his venue and opened Admin. If the probe fails, run Publish rules again; the last good rules are the ones from before the change.

### The platform owner's own PIN at a venue

The venue admin cannot reset it. If you forget it: Firebase console, Firestore, `kitchens`, the kitchen, delete `staffpins/<your id>` and `pinset/<your id>`, and in `config/main` set `pinOpen.<your id>` to a time 30 minutes ahead (milliseconds). Then set a new PIN at the venue's address.

## Files

- `venues/<id>.json` and `venues/<id>/` (QR files): the venues. Read by the workflows and scripts, never by the phones (`scripts/site-changed.sh` leaves `venues/` out of a publish).
- `scripts/venues.cjs`: check, matrix and guard. `scripts/venue-site.cjs`: a venue's copy. `scripts/venue-deploy.sh`: publish it to its project. `scripts/venue-live-check.cjs`: read it back. `scripts/rules-compile-check.mjs`: compile filled-in rules on the emulator.
- `.github/workflows/venue-setup.yml`: Set up a venue.
- Tests: `tests/venues.test.js` (Click tests: venue files, guard, workflows, the copy in Chrome at 390, 768 and 1280 px), `tests/rules/venues.test.mjs` (emulator: every role at both venues), `tests/venue-platform-admin.test.js` (the platform owner's Admin and his locked row, 24 Nov 2026), and the venue rows in `scripts/backup-reuse-check.mjs`, `scripts/rules-publisher-check.cjs`, `tests/access-bootstrap.test.js` and `tests/site-publish.test.js`.
