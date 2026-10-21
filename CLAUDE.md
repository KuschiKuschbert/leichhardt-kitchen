# Working on the Leichhardt Kitchen Book

The Kitchen Book is the Leichhardt Hotel kitchen's web app: the recipe book, the prep list, the order list, the wastage log, the team's how-to guides and the head chef's admin panel. Plain HTML, CSS and JavaScript on GitHub Pages, no build step. Live at https://kuschikuschbert.github.io/leichhardt-kitchen/.

## Never in this repo (it is public)
- The kitchen PIN and the owner's email. `firestore.rules` is a template with `KITCHEN_PIN` and `OWNER_EMAIL`; the real values only live in the published rules in the Firebase console.
- Prices, GP, supplier codes or anything else from AVC Live beyond ingredient names and quantities. AVC Live itself is read only: never change it.
- Staff names or PINs (they live in Firestore).

## Writing style (everything the team sees, and the code comments)
- No em dashes anywhere. Australian English, metric units, 24-hour time, Celsius, Australian kitchen terms.
- Plain, short sentences. Staff read this on the line.
- Only recipes, quantities, temperatures and times the head chef confirmed. Anything else goes in `[square brackets]` and shows as "To come".

## Files
| File | What it is |
| --- | --- |
| `index.html` | The page and its security header (which outside services may load) |
| `js/boot.js` | Runs first in `<head>`: the install offer, the saved text size, the book's clock (`LK_TIME`) |
| `js/upkeep.js` | Runs at the end of `<body>`: the daily 04:00 self-refresh, automatic updates, the service worker registration |
| `js/data.js` | Every recipe (the only file staff edit). Field guide at the top |
| `js/art.js` | Plates, pans, side views, build views, technique diagrams |
| `js/app.js` | Routing, top bar, recipe views (Pass, Tiles), recipe cards, settings, install, QR |
| `js/prep.js` | Prep list, orders, wastage, guides, admin panel, staff lock, insights, learning, suggestions |
| `js/firebase-config.js` | Public Firebase web config |
| `css/app.css` | The Leichhardt look |
| `firestore.rules` | Rules template (see above) |
| `.claude/settings.json`, `scripts/guard-main.mjs` | The main-branch guard: a Claude Code hook that refuses edits and commits on `main` |
| `scripts/pre-merge.sh` | Run from the worktree before merging: open pull requests, worktrees, and whether `main` moved |
| `scripts/publish-rules.sh` | Publishes the rules from your own computer: asks for the PIN and email, deploys a filled-in copy from a temporary folder |
| `.github/workflows/pr-tests.yml` | Runs the click tests on every pull request to `main` (the **Click tests** check that branch protection requires) |
| `.github/workflows/publish-rules.yml`, `.github/workflows/live-tests.yml`, `.github/workflows/lock-probe.yml` | Publish the rules from GitHub (secrets `FIREBASE_SA`, `KITCHEN_PIN`, `OWNER_EMAIL`) and prove the lock on the live book straight after (`tests/rules/probe.mjs`, also weekly), and run the click tests against the live site after each Pages deploy |
| `manifest.webmanifest`, `sw.js`, `icons/`, `icon.svg` | Installable app: manifest, service worker (network first), rope KB logo |
| `qr.svg`, `qr.png`, `qr-sign.pdf` | QR code to open the book, and the A4 sign |
| `README.md` | Everything the app does, for people and for the next session |
| `tests/` | Click tests (Playwright with a stand-in for Firebase): `cd tests && npm install && npm test` |
| `scripts/nightly-learn.mjs`, `.github/workflows/nightly-learning.yml` | Nightly learning on the server (03:00 kitchen time): counts each finished day into `learned` and `ordlearned`. Secrets `FIREBASE_SA` and `KITCHEN_PIN` live in GitHub only. The phones never write learning counts |
| `scripts/nightly-backup.mjs`, `.github/workflows/nightly-backup.yml` | Nightly backup (03:30 kitchen time): reads the book like the admin Backup button, encrypts it with the `BACKUP_KEY` secret (openssl, AES-256) and keeps it as a GitHub artifact for 90 days. Reads only |

## Routes
`#/` landing (five dockets), `#/recipes` (Pass or Tiles), `#/r/<id>[/<id>...]` a recipe and the trail to it, `#/prep`, `#/orders`, `#/waste`, `#/guides`, `#/guides/<id>`, `#/minutes`, `#/mail`, `#/drinks`, `#/admin`, `#/settings`.

## Ground rules (no exceptions)
These hold for every session, every message and every change, however small. A hook in `.claude/settings.json` (`scripts/guard-main.mjs`) refuses edits and commits on `main`, so a session that skips them is stopped.

1. **Every interaction starts on a new branch.** Before touching a file, make a worktree on a fresh branch from the latest `main`:
   `git fetch origin main && git worktree add -b <type>/<short-name> .claude/worktrees/<short-name> origin/main`
   and work only in that folder. Never edit in the main checkout, never commit to `main`, never push `main`. One theme per worktree, branch and pull request: unrelated changes get their own worktree. A session that already has a worktree keeps it for that theme only.
2. **Check what else is in flight before merging.** Run `scripts/pre-merge.sh` from the worktree. It lists the open pull requests with their state, every worktree with its branch and uncommitted changes, and whether `main` moved since the branch started. Only one merge at a time: if another branch is ready or merging, wait for it, pull the new `main` into your branch, run the tests again, then merge. Never remove or reset a worktree that is not yours.
3. **Clean handoffs.** A branch is handed over only when it is pushed, has a pull request that says what was done and what is left, the tests pass, and `README.md` is in step. After a squash merge: `git -C "<main checkout>" pull --ff-only origin main`, remove the worktree and delete the branch. Nothing is left half done on `main`, and nothing lives only in a worktree.

## How changes ship
1. Start as above: a worktree on its own branch from the latest `main`.
2. Test before merging: `node --check` on changed JS, then `cd tests && npm install && npm test`. It serves the repo locally and runs every file in `tests/` in Chrome: each page at 390, 768 and 1280 px (no sideways scroll, no JS errors) and the click paths for the prep pages, orders, wastage, minutes, admin and recipe search. Firebase is replaced by the stand-in in `tests/fake/`, so no real PIN or data is needed and nothing is written to the real book. Add checks for the click paths you change to the matching `*.test.js` file (or a new one). The same tests run on GitHub on every pull request to `main` (the **Click tests** check, `.github/workflows/pr-tests.yml`); a pull request does not merge until it is green. After merging, `BASE=https://kuschikuschbert.github.io/leichhardt-kitchen/ npm test` runs the same tests on the live site.
3. If `firestore.rules` changes: test it on the Firestore emulator first (`cd tests/rules && npm install && npm test`, and add a check for every new rule), publish it with the **Publish rules** workflow in the Actions tab (Run workflow; it fills the `KITCHEN_PIN` and `OWNER_EMAIL` secrets into a copy and deploys it with the service account), or from your own computer with `scripts/publish-rules.sh`, then merge the code that needs it. Publish rules before code that writes new fields or collections; publish after code when the rules get stricter about something old code does not send.
4. After merging, wait for GitHub Pages (about a minute), then check the live site. The **Live click tests** workflow runs the click tests against the live site by itself after each Pages deploy (and from the Actions tab); read its result.
5. Keep `README.md` in step with every change.
6. Before merging, run `scripts/pre-merge.sh` and follow the ground rules above.

## Things that are easy to break
- `.rail` is the steel shelf rail on the Pass; the landing and top bar use `.wtop`. Do not reuse class names across features (check `css/app.css` first).
- Every write goes through `W()` in `js/prep.js`, which adds the writer's id (`by`) and the PIN proof with a server timestamp. Direct `setDoc` calls bypass the staff lock and are refused.
- The prep pages read Firestore; keep reads small (the free plan has a daily read limit). Past days are cached once a day per phone with `dayCache()` / `lk.past` (prep, order history, recent waste, the waste review note); Everything to order is patched on the phone after a tick, not read again. Do not add polling.
- The shift pings popup (called notes in the code and the data) is appended to `document.body`, not `#app`, so page redraws do not remove it. Its clicks use `data-note` (the bell and the popup), the editor inside the prep root uses `data-p`, and the recipe pages use `data-act`; keep them apart. Pings are read with one small query when the book opens each day, and again only after 30 minutes away or at 10:30 if the book was already open: do not add a listener or polling. Only the head chef and sous chefs write them (20 Oct 2026, no Pings tick for other staff): the rules check `sousIds` or `pingIds` in `config/main`, both the same people now (kept in step by the admin panel, `seedIds()`, which asks the head chef first when a sous chef changed a role); a sous chef's save sends only `people` and `staffIds` (who may set a PIN).
- Meeting minutes follow the same pattern (one small query, refreshed after 30 minutes away), clicks via `data-p` / `data-k` with `mn-` names. Minutes to sign show as the "Minutes not signed yet" card on the landing page (`.wall-mn`, an empty slot drawn by `js/app.js` and filled in by `minCard()` in `js/prep.js`) and on the prep list, not in the top bar. The chef mark's menu (`whoMenuOpen()` in `js/app.js`, `chefMenu()` / `chefOpen()` / `signOutPerson()` in `js/prep.js`) holds Meeting minutes, the drinks run, the Chef group (Admin panel, Shift pings, Minutes register, Manage staff), Settings and Sign out; Admin moved there from the top bar's key button on 21 Oct 2026, and the open mail count sits on the chef hat; Handy has no Tools and nothing prints or shares (20 Oct 2026). Keep the top bar to Pings and the chef hat: one more button there pushes "Kitchen Book" onto two lines on a laptop. The chef mark (`.wtop-who`, a ring shown while a person is signed in) shows its name from 1400 px only; with the name at 1280 px "Kitchen Book" wraps. Sign-offs and `hist` copies are immutable in the rules; a change after publishing is a new version, never an edit of the old one.
- Kitchen mail (`#/mail`, admin Mail tab): only the head chef's Google account reads `mail`; the sender's phone sees only `mailstat/<id>` (seen, done) by id. The open mail is read once when the book opens on the head chef's device and again after 30 minutes away, like Pings: no listener, no polling. Its popup is appended to `document.body` with `data-ml` clicks; the chef mark's menu (`js/app.js`) uses `data-who`; the page uses `data-p` with `ml-` names. Staff-facing words say "Chef".
- Drinks run (`#/drinks`): each person writes only `drinks/<their id>`. The first PIN goes to "One more thing" (`S.drinkAsk = 'first'`); people who signed up before get the card once (`dkCheck()`, `lk.drink.<id>`). The team's drinks are one query when the page opens, again after 30 minutes: no listener. Clicks use `data-p` with `dk-` names; its classes are `dr-` (`dk-` classes are the landing dockets). The click tests seed a usual drink for Sam, Ann and Bo so the card stays off other pages.
- Kitchen sections (21 Oct 2026): the head chef sets them in the admin People tab (`config/main.kitSecs`, part of the staff draft; the owner's full save keeps them, a sous chef's save never sends them). Staff and leads pick one after their PIN, once a day (`ksCheck()` / `ksOpen()` in `js/prep.js`, `lk.sec.<id>`, one read of `shifts/<today>_<id>`); the head chef and sous chefs get their role by themselves. `mySec()` is the default section for prep lines, Quick add and wastage when the box is left alone; a typed section still wins. A pick holds for that kitchen day only (`ksGet()` checks the date), so everyone is off their section at midnight with nothing to clear. The picker is a bottom sheet appended to `document.body` with `data-ks` clicks and `ks-` classes; the admin block uses `a-ks-` and `ks-` click names. No sections set up means nobody is asked, which keeps the other click tests free of the popup.
- Admin lists that can grow go through `lvHTML()` in `js/prep.js` (search, filter chips, sort, Show more, phone cards). Give each list its own `key`, keep `data-k` names unique (`lv-q:<key>`, `lv-s:<key>`), and use `lvReveal(key)` when a row is added so it is on screen. Do not hand-build a long `<table>` in the admin area.
- Guides keep each PDF page or photo as a picture in its own Firestore record (`guides/<id>/pages/<n>`, under 950 kB, made on the head chef's device), because the free plan has no file storage and a record holds at most 1 MB. The list is read once a day per phone and kept in `lk.guides`; pages are read once per version and then come from Firestore's offline copy. Do not add a listener. A page opened big is appended to `document.body` and its clicks use `data-gz`. pdf.js is loaded from jsDelivr only when a PDF is chosen; the tests serve it from `tests/node_modules/pdfjs-dist`.
- Guides, Shift pings and Meeting minutes can be held back from staff (New pages in the admin People tab, `staffSee` in `config/main`). Any new link, card or read for those pages checks `featOn('guides' | 'pings' | 'minutes')` in `js/prep.js` (`LK_PREP.featOn` in `js/app.js`). It is worked out from the staff list and the person on the phone, kept in `lk.feat`, and `lk-feat` tells `js/app.js` to redraw the menus.
- Double ups on the prep list merge by themselves (`mergeDups()` in `js/prep.js`). It reads the lines from the server first (`getDocFromServer`) and tries each group once per page load: keep both, or a phone with an old copy of the list can remove a line ticked elsewhere, or read again on every redraw. A line with `dupOk` is never merged.
- The service worker caches the app shell. Bump `CACHE` in `sw.js` when icons or the manifest change.
- The security header in `index.html` lists every outside service the book may load. A new one (a script, a font, an API, a frame) has to be added there or the browser blocks it. Keep scripts in files: inline `<script>` blocks and `onclick=` attributes do not run. In tests use `L.waitFor`, not `page.waitForFunction`.
- One clock: anything saved, or compared with a saved time, uses `now()` in `js/prep.js` (`LK_TIME.now()` elsewhere), and today's date, hours and weekdays use `dayNow()` and `T.day`, `T.hour`, `T.mins`, `T.dow`, `T.clock`, `T.at` (kitchen time, Queensland). Never `new Date()` or `Date.now()` for those: the phone's clock and zone can be wrong. `Date.now()` is only for time passing on the phone (timers, the PIN lock, the idle sign-out). Do not name a local variable `now` or `dayNow`, it hides the helper.

## Open items
README, "Open items" under Prep book and admin panel, lists what is still to do with the head chef (App Check debug token and Enforce, the Browser key restriction). Read it when the head chef asks what is left, keep it in step, and remove items as they are done.
